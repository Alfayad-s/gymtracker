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

type Landmark = { x: number; y: number; z: number; visibility?: number }

type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => {
    landmarks: Array<Array<Landmark>>
    worldLandmarks: Array<Array<Landmark>>
  }
  close: () => void
  setOptions: (opts: { runningMode: 'VIDEO' | 'IMAGE' }) => Promise<void>
}

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
/** Full model is more accurate for body metrics than lite. */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

/** MediaPipe Pose landmark indices */
const NOSE = 0
const LEFT_EYE = 2
const RIGHT_EYE = 5
const LEFT_EAR = 7
const RIGHT_EAR = 8
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_HIP = 23
const RIGHT_HIP = 24
const LEFT_KNEE = 25
const RIGHT_KNEE = 26
const LEFT_ANKLE = 27
const RIGHT_ANKLE = 28
const LEFT_HEEL = 29
const RIGHT_HEEL = 30
const LEFT_FOOT = 31
const RIGHT_FOOT = 32

/** Average adult distance from eye/nose plane to crown of head (meters). */
const CROWN_OFFSET_M = 0.125
/** Soft floor offset — heels sit slightly above true ground contact. */
const FOOT_OFFSET_M = 0.015

function visible(p: Landmark | undefined, min = 0.55): p is Landmark {
  return Boolean(p && (p.visibility == null || p.visibility >= min))
}

function dist3(a: Landmark, b: Landmark) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function mid(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  }
}

function chainLength(points: Landmark[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += dist3(points[i - 1], points[i])
  return sum
}

type HeightEstimate = {
  cm: number
  quality: number // 0–1
  upright: boolean
  fullBody: boolean
}

/**
 * Estimate standing height from MediaPipe world landmarks (meters).
 * Uses left/right skeleton path length + crown/foot offsets, with
 * upright + visibility quality gates for better stability.
 */
function estimateHeightCm(
  world: Landmark[],
  image: Landmark[] | null
): HeightEstimate | null {
  if (!world?.length || world.length < 33) return null

  const req = [
    LEFT_SHOULDER,
    RIGHT_SHOULDER,
    LEFT_HIP,
    RIGHT_HIP,
    LEFT_KNEE,
    RIGHT_KNEE,
    LEFT_ANKLE,
    RIGHT_ANKLE,
  ]
  if (!req.every((i) => visible(world[i], 0.35))) return null

  const headCandidates = [world[NOSE], world[LEFT_EAR], world[RIGHT_EAR], world[LEFT_EYE], world[RIGHT_EYE]].filter(
    (p) => visible(p, 0.3)
  )
  if (headCandidates.length === 0) return null

  // Highest point of detected head landmarks (Y up in world space)
  const headTop = headCandidates.reduce((best, p) => (p.y > best.y ? p : best))

  const leftFootPts = [world[LEFT_HEEL], world[LEFT_FOOT], world[LEFT_ANKLE]].filter((p) =>
    visible(p, 0.3)
  )
  const rightFootPts = [world[RIGHT_HEEL], world[RIGHT_FOOT], world[RIGHT_ANKLE]].filter((p) =>
    visible(p, 0.3)
  )
  if (leftFootPts.length === 0 || rightFootPts.length === 0) return null

  const leftFoot = leftFootPts.reduce((best, p) => (p.y < best.y ? p : best))
  const rightFoot = rightFootPts.reduce((best, p) => (p.y < best.y ? p : best))

  const lShoulder = world[LEFT_SHOULDER]
  const rShoulder = world[RIGHT_SHOULDER]
  const lHip = world[LEFT_HIP]
  const rHip = world[RIGHT_HIP]
  const midShoulder = mid(lShoulder, rShoulder)
  const midHip = mid(lHip, rHip)

  // Path length (handles slight lean better than pure vertical span)
  const leftChain = chainLength([
    leftFoot,
    world[LEFT_ANKLE],
    world[LEFT_KNEE],
    lHip,
    midHip,
    midShoulder,
    headTop,
  ])
  const rightChain = chainLength([
    rightFoot,
    world[RIGHT_ANKLE],
    world[RIGHT_KNEE],
    rHip,
    midHip,
    midShoulder,
    headTop,
  ])
  const pathM = (leftChain + rightChain) / 2 + CROWN_OFFSET_M + FOOT_OFFSET_M

  // Vertical span fallback / blend — robust when pose is upright
  const topY = headTop.y + CROWN_OFFSET_M
  const bottomY = Math.min(leftFoot.y, rightFoot.y) - FOOT_OFFSET_M
  const spanM = topY - bottomY

  // Prefer path when upright; blend when slightly angled
  const shoulderTilt = Math.abs(lShoulder.y - rShoulder.y)
  const hipTilt = Math.abs(lHip.y - rHip.y)
  const torsoLean = Math.abs(midShoulder.x - midHip.x)
  const upright = shoulderTilt < 0.08 && hipTilt < 0.08 && torsoLean < 0.12

  const heightM = upright ? spanM * 0.55 + pathM * 0.45 : pathM * 0.7 + spanM * 0.3
  const heightCm = Math.round(heightM * 100)

  // Full-body framing in image space (advisory — don't block lock when close)
  let fullBody = true
  let frameSpan = 1
  if (image && image.length >= 33) {
    const imgHead = [image[NOSE], image[LEFT_EAR], image[RIGHT_EAR]].filter((p) =>
      visible(p, 0.3)
    )
    const imgFeet = [image[LEFT_HEEL], image[RIGHT_HEEL], image[LEFT_FOOT], image[RIGHT_FOOT]].filter(
      (p) => visible(p, 0.3)
    )
    if (imgHead.length && imgFeet.length) {
      const minY = Math.min(...imgHead.map((p) => p.y))
      const maxY = Math.max(...imgFeet.map((p) => p.y))
      frameSpan = maxY - minY
      // Soft guide: head in upper third, feet in lower third
      fullBody = minY < 0.32 && maxY > 0.68 && frameSpan > 0.4
      // Only reject when clearly cropped (missing head or feet in frame)
      if (frameSpan < 0.32) return null
    }
  }

  if (heightCm < 120 || heightCm > 230) return null

  // Visibility quality score
  const keyIdx = [
    NOSE,
    LEFT_SHOULDER,
    RIGHT_SHOULDER,
    LEFT_HIP,
    RIGHT_HIP,
    LEFT_KNEE,
    RIGHT_KNEE,
    LEFT_ANKLE,
    RIGHT_ANKLE,
    LEFT_HEEL,
    RIGHT_HEEL,
  ]
  const visAvg =
    keyIdx.reduce((s, i) => s + (world[i]?.visibility ?? 0), 0) / keyIdx.length
  let quality = visAvg
  if (upright) quality += 0.12
  if (fullBody) quality += 0.12
  if (frameSpan > 0.45) quality += 0.08
  quality = Math.min(1, quality)

  // Accept usable poses — framing is a hint, not a hard block
  if (quality < 0.4) return null

  return { cm: heightCm, quality, upright, fullBody }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

/** Trimmed mean — drop outliers beyond ±10 cm of median. */
function stableAverage(values: number[]): number | null {
  if (values.length < 4) return null
  const med = median(values)
  const trimmed = values.filter((v) => Math.abs(v - med) <= 10)
  if (trimmed.length < 3) return null
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 999
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(v)
}

function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
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
    [27, 31],
    [24, 26],
    [26, 28],
    [28, 30],
    [28, 32],
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

  // Framing guide — stand inside this silhouette band
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  const gx = width * 0.18
  const gy = height * 0.06
  const gw = width * 0.64
  const gh = height * 0.88
  ctx.strokeRect(gx, gy, gw, gh)
  ctx.setLineDash([])
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
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [liveCm, setLiveCm] = useState<number | null>(null)
  const [poseReady, setPoseReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [hint, setHint] = useState('Stand fully inside the frame')
  const [stability, setStability] = useState(0) // 0–100

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
    setPoseReady(false)
    setLiveCm(null)
    setStability(0)
    setHint('Stand fully inside the frame')
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

  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
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
    },
    [stopCamera]
  )

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
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
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
      if (now - lastTsRef.current > 40) {
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

          const estimate = world ? estimateHeightCm(world, landmarks ?? null) : null
          if (estimate) {
            samplesRef.current = [...samplesRef.current.slice(-20), estimate.cm]
            const avg = stableAverage(samplesRef.current)
            const std = sampleStdDev(samplesRef.current.slice(-10))
            // Ready to use sooner; "locked" when very stable
            const ready = avg != null && samplesRef.current.length >= 6 && std < 6
            const locked = avg != null && samplesRef.current.length >= 10 && std < 4

            if (avg != null) setLiveCm(avg)
            setPoseReady(ready)
            setStability(
              Math.min(
                100,
                Math.round((samplesRef.current.length / 10) * 100 * (locked ? 1 : ready ? 0.85 : 0.6))
              )
            )

            if (!estimate.upright) setHint('Stand straight — shoulders level')
            else if (!estimate.fullBody) setHint('Almost — step back a bit if you can, or hold still')
            else if (!locked) setHint('Hold still… locking measurement')
            else setHint('Locked — tap Use estimate')
          } else {
            setPoseReady(false)
            // Keep last liveCm briefly if we had samples; clear only when tracking lost
            if (samplesRef.current.length === 0) setLiveCm(null)
            setStability(Math.max(0, Math.round((samplesRef.current.length / 10) * 40)))
            if (landmarks) setHint('Keep head and feet visible — hold still')
            else setHint('Stand fully inside the frame')
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
    setStability(0)
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
                AR height measure
              </Drawer.Title>
              <Drawer.Description className="text-[11px] text-muted-foreground mt-0.5">
                MediaPipe full pose · stand still for a stable lock
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
                    ? `Ready · ${liveCm} cm`
                    : liveCm != null
                      ? `Tracking · ~${liveCm} cm`
                      : 'Align with guide'}
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

              {/* Stability bar */}
              <div className="absolute left-3 right-3 top-14 h-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    poseReady ? 'bg-primary' : 'bg-white/60'
                  }`}
                  style={{ width: `${stability}%` }}
                />
              </div>

              <div className="absolute bottom-3 left-3 right-3 rounded-[14px] bg-black/55 border border-white/10 px-3 py-2 text-[10px] text-white/90 leading-relaxed space-y-1">
                <p className="font-semibold text-white">{hint}</p>
                <p>
                  Prop phone upright · stand 2–3 m away · rear camera preferred · head to feet in
                  the guide · keep still until locked
                </p>
              </div>
            </div>

            {error && <p className="text-xs text-destructive px-0.5">{error}</p>}

            <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
              Uses full-body pose + skeleton path length (not just head-to-heel). Best results with
              good light, flat floor, and arms at your sides. Always confirm before saving.
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
