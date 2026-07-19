import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'GymTrack — Train with clarity',
  description:
    'Log workouts, track progress, meals, recovery, and AI coaching — all in one mobile-first fitness app.',
}

export default function Home() {
  return <LandingPage />
}
