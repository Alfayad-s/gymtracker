import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { completeGroqTextChat } from '@/lib/groq'
import {
  getReportForUser,
  listReportsForUser,
  updateReportAnalysis,
} from '@/lib/body-composition/db'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reportId?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const reports = await listReportsForUser(user.id)
  const current =
    (body.reportId ? await getReportForUser(user.id, body.reportId) : null) ??
    reports[0] ??
    null
  if (!current) {
    return NextResponse.json({ error: 'No report found' }, { status: 404 })
  }
  const previous = reports.find((r) => r.id !== current.id) ?? null

  try {
    const analysis = await completeGroqTextChat([
      {
        role: 'system',
        content: `You are GymTrack's body composition coach. Write a personalized analysis with short sections:
Overall health score narrative, Muscle balance, Fat distribution, Body composition summary, Training recommendations, Recovery suggestions, Nutrition suggestions, Risk factors, Improvement priority.
Use markdown headings. Be specific to the numbers. Keep under 700 words.`,
      },
      {
        role: 'user',
        content: `Current report:\n${JSON.stringify(current, null, 2)}\n\nPrevious report:\n${
          previous ? JSON.stringify(previous, null, 2) : 'none'
        }`,
      },
    ])

    await updateReportAnalysis(user.id, current.id, analysis)
    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Body composition analysis failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 503 }
    )
  }
}
