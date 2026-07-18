'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { Camera, Loader2, Scan, SwitchCamera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ArHeightMeasureProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEstimate: (heightCm: number) => void
}

type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => {
    landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>
    worldLandmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>
  }
  close: () => void
  setOptions: (opts: { runningMode: 'VIDEO' | 'IMAGE' }) => Promise<void>
}

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

/** MediaPipe Pose indices */
const NOSE = 0
const LEFT_EAR = 7
const RIGHT_EAR = 8
const LEFT_HEEL = 29
const RIGHT_HEEL = 30

function estimateHeightCm(
  world: Array<{ x: number; y: number; z: number; visibility?: number }>
): number | null {
  if (!world?.length || world.length < 33) return null

  const headPts = [world[NOSE], world[LEFT_EAR], world[RIGHT_EAR]].filter(
    (p) => p && (p.visibility == null || p.visibility > 0.4)
  )
  const heels = [world[LEFT_HEEL], world[RIGHT_HEEL]].filter(
    (p) => p && (p.visibility == null || p.visibility > 0.4)
  )
  if (headPts.length === 0 || heels.length === 0) return null

  // World coords: Y points up from mid-hip. Head is above heels.
  const topY = Math.max(...headPts.map((p) => p.y))
  const bottomY = Math.min(...heels.map((p) => p.y))
  const spanM = topY - bottomY
  // Nose/ears sit below the crown — add ~10 cm for top of head.
  const heightCm = Math.round((spanM + 0.1) * 100)

  if (heightCm < 120 || heightCm > 230) return null
  return heightCm
}

function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  width: number,
  height: number,
  mirrored: boolean
) {
  const connections: [number, number][] = [
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24],
    [23, 25],
    [25, 27],
    [27, 29],
    [24, 26],
    [26, 28],
    [28, 30],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [0, 7],
    [0, 8],
  ]

  const pt = (i: number) => {
    const l = landmarks[i]
    if (!l || (l.visibility != null && l.visibility < 0.35)) return null
    const x = mirrored ? (1 - l.x) * width : l.x * width
    return { x, y: l.y * height }
  }

  ctx.strokeStyle = 'rgba(163, 230, 53, 0.85)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const [a, b] of connections) {
    const pa = pt(a)
    const pb = pt(b)
    if (!pa || !pb) continue
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(163, 230, 53, 1)'
  for (let i = 0; i < landmarks.length; i++) {
    const p = pt(i)
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function ArHeightMeasure({ open, onOpenChange, onEstimate }: ArHeightMeasureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const samplesRef = useRef<number[]>([])
  const lastTsRef = useRef(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [liveCm, setLiveCm] = useState<number | null>(null)
  const [poseReady, setPoseReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
    setPoseReady(false)
    setLiveCm(null)
    samplesRef.current = []
  }, [])

  const closeLandmarker = useCallback(() => {
    try {
      landmarkerRef.current?.close()
    } catch {
      // ignore
    }
    landmarkerRef.current = null
  }, [])

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopCamera()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setCameraReady(true)
    } catch {
      setError('Camera permission is required for AR height estimate.')
      setCameraReady(false)
    }
  }, [stopCamera])

  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    const vision = await import('@mediapipe/tasks-vision')
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT)
    const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    landmarkerRef.current = landmarker as unknown as PoseLandmarkerInstance
    return landmarkerRef.current
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
      closeLandmarker()
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        await ensureLandmarker()
        if (cancelled) return
        await startCamera(facing)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not start pose detection. Try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // Only re-init when sheet opens; facing changes handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !cameraReady) return

    let cancelled = false

    const loop = () => {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !canvas || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const w = video.videoWidth
      const h = video.videoHeight
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }

      const now = performance.now()
      if (now - lastTsRef.current > 33) {
        lastTsRef.current = now
        try {
          const result = landmarker.detectForVideo(video, now)
          const landmarks = result.landmarks?.[0]
          const world = result.worldLandmarks?.[0]
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (landmarks) {
              drawPose(ctx, landmarks, canvas.width, canvas.height, facing === 'user')
            }
          }

          const cm = world ? estimateHeightCm(world) : null
          if (cm != null) {
            samplesRef.current = [...samplesRef.current.slice(-14), cm]
            const avg = Math.round(
              samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length
            )
            setLiveCm(avg)
            setPoseReady(samplesRef.current.length >= 8)
          } else {
            setPoseReady(false)
          }
        } catch {
          // skip frame
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [open, cameraReady, facing])

  const flipCamera = async () => {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    samplesRef.current = []
    setLiveCm(null)
    setPoseReady(false)
    setLoading(true)
    await startCamera(next)
    setLoading(false)
  }

  const handleUseEstimate = () => {
    if (liveCm == null) return
    onEstimate(liveCm)
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stopCamera()
      closeLandmarker()
    }
    onOpenChange(next)
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-border bg-background outline-none sm:max-w-[430px]">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-bold text-foreground tracking-tight">
                AR height estimate
              </Drawer.Title>
              <Drawer.Description className="text-[11px] text-muted-foreground mt-0.5">
                Experimental · MediaPipe pose · not a precision measurement
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="p-2 rounded-xl bg-muted border border-border text-muted-foreground cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-3 overflow-y-auto">
            <div className="relative aspect-[3/4] rounded-[20px] overflow-hidden bg-black border border-border">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  facing === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {(loading || !cameraReady) && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-xs text-white/90">Starting camera & pose model…</p>
                </div>
              )}

              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                <div className="rounded-full bg-black/55 border border-white/10 px-3 py-1.5 text-[10px] font-bold text-white">
                  {poseReady && liveCm != null
                    ? `Locked · ~${liveCm} cm`
                    : liveCm != null
                      ? `Tracking · ~${liveCm} cm`
                      : 'Stand fully in frame'}
                </div>
                <button
                  type="button"
                  onClick={() => void flipCamera()}
                  disabled={loading}
                  className="h-9 w-9 rounded-full bg-black/55 border border-white/10 text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
                  aria-label="Flip camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-3 left-3 right-3 rounded-[14px] bg-black/55 border border-white/10 px-3 py-2 text-[10px] text-white/90 leading-relaxed">
                Prop the phone upright · stand 2–3 m away · full body visible (head to feet) · keep still
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive px-0.5">{error}</p>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
              Uses pose landmarks (world scale). Accuracy varies with distance, angle, and lighting —
              review the number before saving.
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="flex-1 h-11 rounded-[14px] bg-muted text-foreground border-0"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!poseReady || liveCm == null}
                onClick={handleUseEstimate}
                className="flex-1 h-11 rounded-[14px] bg-primary text-primary-foreground font-bold border-0 flex items-center justify-center gap-1.5"
              >
                <Scan className="w-4 h-4" />
                Use {liveCm != null ? `${liveCm} cm` : 'estimate'}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function ArHeightMeasureButton({
  onEstimate,
}: {
  onEstimate: (heightCm: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
      >
        <Camera className="w-3.5 h-3.5" />
        Measure with AR camera
        <span className="text-[9px] font-semibold opacity-70 uppercase tracking-wider">
          Beta
        </span>
      </button>
      <ArHeightMeasure open={open} onOpenChange={setOpen} onEstimate={onEstimate} />
    </>
  )
}
