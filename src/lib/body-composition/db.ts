import 'server-only'

import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/db'
import { bodyCompositionReports } from '@/db/schema'
import type { BodyCompositionExtract, BodyCompositionReport } from './types'
import { emptySegmental } from './metrics'
import { parseInBodyDateTime } from './parse-date'

function numStr(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null
  return String(value)
}

function parseJsonField<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function rowToReport(
  row: typeof bodyCompositionReports.$inferSelect
): BodyCompositionReport {
  return {
    id: row.id,
    userId: row.userId,
    reportDate: (row.reportDate ?? new Date()).toISOString(),
    date: row.reportDate ? row.reportDate.toISOString().slice(0, 10) : null,
    height: row.height != null ? Number(row.height) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    bodyScore: row.bodyScore != null ? Number(row.bodyScore) : null,
    bmi: row.bmi != null ? Number(row.bmi) : null,
    bodyFatPercent: row.bodyFatPercent != null ? Number(row.bodyFatPercent) : null,
    bodyFatMass: row.bodyFatMass != null ? Number(row.bodyFatMass) : null,
    skeletalMuscleMass:
      row.skeletalMuscleMass != null ? Number(row.skeletalMuscleMass) : null,
    leanBodyMass: row.leanBodyMass != null ? Number(row.leanBodyMass) : null,
    protein: row.protein != null ? Number(row.protein) : null,
    minerals: row.minerals != null ? Number(row.minerals) : null,
    totalBodyWater: row.totalBodyWater != null ? Number(row.totalBodyWater) : null,
    visceralFat: row.visceralFat != null ? Number(row.visceralFat) : null,
    waistHipRatio: row.waistHipRatio != null ? Number(row.waistHipRatio) : null,
    bmr: row.bmr != null ? Number(row.bmr) : null,
    recommendedCalories:
      row.recommendedCalories != null ? Number(row.recommendedCalories) : null,
    targetWeight: row.targetWeight != null ? Number(row.targetWeight) : null,
    weightControl: row.weightControl != null ? Number(row.weightControl) : null,
    fatControl: row.fatControl != null ? Number(row.fatControl) : null,
    muscleControl: row.muscleControl != null ? Number(row.muscleControl) : null,
    segmentalLean: parseJsonField(row.segmentalLean) ?? emptySegmental(),
    segmentalFat: parseJsonField(row.segmentalFat) ?? emptySegmental(),
    pdfUrl: row.pdfUrl,
    imageUrl: row.imageUrl,
    rawText: row.rawText,
    aiAnalysis: row.aiAnalysis,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listReportsForUser(userId: string) {
  const rows = await db
    .select()
    .from(bodyCompositionReports)
    .where(eq(bodyCompositionReports.userId, userId))
    .orderBy(desc(bodyCompositionReports.reportDate))
  return rows.map(rowToReport)
}

export async function getReportForUser(userId: string, id: string) {
  const rows = await db
    .select()
    .from(bodyCompositionReports)
    .where(
      and(eq(bodyCompositionReports.id, id), eq(bodyCompositionReports.userId, userId))
    )
    .limit(1)
  return rows[0] ? rowToReport(rows[0]) : null
}

export async function insertReport(params: {
  userId: string
  extract: BodyCompositionExtract
  pdfUrl?: string | null
  imageUrl?: string | null
  rawText?: string | null
}) {
  const { extract } = params
  // Prefer the test date/time printed on the InBody report — drives history & charts
  const reportDate = parseInBodyDateTime(extract.date) ?? new Date()
  const safeDate = Number.isNaN(reportDate.getTime()) ? new Date() : reportDate

  const [row] = await db
    .insert(bodyCompositionReports)
    .values({
      userId: params.userId,
      reportDate: safeDate,
      height: numStr(extract.height),
      weight: numStr(extract.weight),
      bodyScore: numStr(extract.bodyScore),
      bmi: numStr(extract.bmi),
      bodyFatPercent: numStr(extract.bodyFatPercent),
      bodyFatMass: numStr(extract.bodyFatMass),
      skeletalMuscleMass: numStr(extract.skeletalMuscleMass),
      leanBodyMass: numStr(extract.leanBodyMass),
      protein: numStr(extract.protein),
      minerals: numStr(extract.minerals),
      totalBodyWater: numStr(extract.totalBodyWater),
      visceralFat: numStr(extract.visceralFat),
      waistHipRatio: numStr(extract.waistHipRatio),
      bmr: numStr(extract.bmr),
      recommendedCalories: numStr(extract.recommendedCalories),
      targetWeight: numStr(extract.targetWeight),
      weightControl: numStr(extract.weightControl),
      fatControl: numStr(extract.fatControl),
      muscleControl: numStr(extract.muscleControl),
      segmentalLean: JSON.stringify(extract.segmentalLean ?? emptySegmental()),
      segmentalFat: JSON.stringify(extract.segmentalFat ?? emptySegmental()),
      pdfUrl: params.pdfUrl ?? null,
      imageUrl: params.imageUrl ?? null,
      rawText: params.rawText ?? null,
    })
    .returning()

  return rowToReport(row)
}

export async function updateReportAnalysis(
  userId: string,
  id: string,
  aiAnalysis: string
) {
  const [row] = await db
    .update(bodyCompositionReports)
    .set({ aiAnalysis })
    .where(
      and(eq(bodyCompositionReports.id, id), eq(bodyCompositionReports.userId, userId))
    )
    .returning()
  return row ? rowToReport(row) : null
}

export async function deleteReportForUser(userId: string, id: string) {
  await db
    .delete(bodyCompositionReports)
    .where(
      and(eq(bodyCompositionReports.id, id), eq(bodyCompositionReports.userId, userId))
    )
}
