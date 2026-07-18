import type { SegmentalValues } from './types'
import { toNum } from './metrics'

export type SegmentKey = 'leftArm' | 'rightArm' | 'trunk' | 'leftLeg' | 'rightLeg'
export type SegmentStatus = 'normal' | 'low' | 'high'

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  trunk: 'Trunk',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
}

/**
 * Color rules relative to mean segmental lean / fat:
 * - lean significantly below mean → low (yellow)
 * - fat significantly above mean → high (red)
 * - otherwise normal (green)
 */
export function segmentStatuses(
  lean: SegmentalValues | null | undefined,
  fat: SegmentalValues | null | undefined
): Record<SegmentKey, { status: SegmentStatus; lean: number | null; fat: number | null; label: string }> {
  const keys: SegmentKey[] = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg']
  const leanVals = keys.map((k) => toNum(lean?.[k])).filter((n): n is number => n != null)
  const fatVals = keys.map((k) => toNum(fat?.[k])).filter((n): n is number => n != null)
  const leanMean = leanVals.length ? leanVals.reduce((a, b) => a + b, 0) / leanVals.length : null
  const fatMean = fatVals.length ? fatVals.reduce((a, b) => a + b, 0) / fatVals.length : null

  const out = {} as Record<
    SegmentKey,
    { status: SegmentStatus; lean: number | null; fat: number | null; label: string }
  >

  for (const key of keys) {
    const l = toNum(lean?.[key])
    const f = toNum(fat?.[key])
    let status: SegmentStatus = 'normal'
    if (f != null && fatMean != null && f > fatMean * 1.15) status = 'high'
    else if (l != null && leanMean != null && l < leanMean * 0.85) status = 'low'
    out[key] = { status, lean: l, fat: f, label: SEGMENT_LABELS[key] }
  }
  return out
}

export const STATUS_COLOR: Record<SegmentStatus, string> = {
  normal: '#22c55e',
  low: '#eab308',
  high: '#ef4444',
}
