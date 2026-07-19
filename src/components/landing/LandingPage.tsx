'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Outfit, DM_Sans } from 'next/font/google'

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-landing-display',
})

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-landing-body',
})

export const LANDING_FEATURES = [
  {
    src: '/screens/dashboard.png',
    title: 'Home dashboard',
    description:
      'Your day starts here. The home screen pulls together training, habits, and nutrition so you always know what to do next — without digging through menus.',
    points: [
      'Today’s workout status with Quick Start',
      'Streak tracking to stay consistent',
      'Daily challenges with XP and coins',
      'Meals summary and active plan at a glance',
    ],
  },
  {
    src: '/screens/daily-workout-plan.png',
    title: 'Training plans',
    description:
      'Build a real weekly program instead of guessing each session. Name your plan, add days, set focus, and mark rest days when your body needs them.',
    points: [
      'Day-by-day schedule with muscle focus',
      'Add or remove days as your split evolves',
      'Mark rest days without breaking the plan',
      'One active plan driving today’s workout',
    ],
  },
  {
    src: '/screens/excercise-library.png',
    title: 'Exercise library',
    description:
      'Find the right lift fast. Filter by muscle and equipment, open cues when you need a refresher, then drop movements into a plan or live session.',
    points: [
      'Browse by target muscle and equipment',
      'Form notes and exercise details',
      'Add to plans or start logging immediately',
      'Custom exercises when the library isn’t enough',
    ],
  },
  {
    src: '/screens/personal-records.png',
    title: 'Personal records',
    description:
      'Progress shouldn’t hide in old sessions. PRs and best sets surface clearly so you can see what improved — and what still needs work.',
    points: [
      'Best sets and volume highlights',
      'History that stays easy to skim',
      'Spot plateaus before they stick',
      'Celebrate wins without spreadsheet hunting',
    ],
  },
  {
    src: '/screens/muscle-recovery.png',
    title: 'Muscle recovery',
    description:
      'Train hard without guessing. Recovery maps show which groups are ready so you can push, pull, or rest with intent.',
    points: [
      'Per-muscle recovery status',
      'Smarter session choices after hard days',
      'Avoid overtraining the same group',
      'Plan rest around real fatigue, not vibes',
    ],
  },
  {
    src: '/screens/segmental-analysis.png',
    title: 'Body composition',
    description:
      'Go beyond the scale. Segmental analysis and scan-to-scan comparisons show lean mass, fat distribution, BMI, and whether you’re actually improving.',
    points: [
      'Color-coded segmental body map',
      'Lean vs fat by region',
      'Progress vs previous scan',
      'Clear improved / declined signals',
    ],
  },
  {
    src: '/screens/meals.png',
    title: 'Meals & nutrition',
    description:
      'Fueling belongs next to training. Log meals by photo or text, hit protein and calorie targets, and track water in the same daily flow.',
    points: [
      'Photo or text meal logging',
      'Calories and protein targets',
      'Water intake in the meals view',
      'Daily totals without leaving the app',
    ],
  },
  {
    src: '/screens/chat.png',
    title: 'AI workout coach',
    description:
      'Ask like you’d ask a coach. GymTrack AI answers with context from your plan and recent history — not generic internet advice.',
    points: [
      '“What should I train today?” with plan context',
      'Structured tips from your recent sessions',
      'Quick suggestion chips for common asks',
      'Coaching that respects your active program',
    ],
  },
  {
    src: '/screens/asking-ai-to-change-theme.png',
    title: 'Agentic AI changes',
    description:
      'Don’t hunt settings menus. Tell GymTrack what to change in plain language — the AI proposes the action, you confirm, and it applies.',
    points: [
      'Natural language app control',
      'Proposed changes before anything applies',
      'Theme, goals, plans, and more',
      'Confirm once — then it’s done',
    ],
  },
] as const

const ABOUT_POINTS = [
  {
    title: 'Built for the gym floor',
    description:
      'Fast set logging, skip and reorder, rest timers, and a phone-first layout so you never fight the UI between sets.',
  },
  {
    title: 'Progress you can trust',
    description:
      'History, PRs, recovery maps, and body composition sit next to your training — not in a separate spreadsheet.',
  },
  {
    title: 'AI that knows your plan',
    description:
      'Ask what to train, get tips from your history, or tell GymTrack to change settings — confirm, then it applies.',
  },
] as const

const PRICING_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start logging and staying consistent.',
    highlighted: false,
    cta: 'Get started',
    href: '/login',
    features: [
      'Workout logging & plans',
      'Exercise library',
      'History & personal records',
      'Meal & water tracking',
      'Muscle recovery view',
      'Daily challenges',
    ],
  },
  {
    name: 'Pro',
    price: '$6',
    period: '/ month',
    description: 'Deeper insights and full AI coaching when you want more.',
    highlighted: true,
    cta: 'Start Pro',
    href: '/login',
    features: [
      'Everything in Free',
      'AI workout coach',
      'Agentic app changes',
      'Body composition analysis',
      'Advanced progress insights',
      'Priority feature updates',
    ],
  },
] as const

function displayFont() {
  return { fontFamily: 'var(--font-landing-display), sans-serif' } as const
}

function ScreenShot({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
}) {
  return (
    <div
      className={`relative h-[300px] w-[134px] shrink-0 overflow-hidden rounded-[20px] border border-border bg-card shadow-lg shadow-black/15 sm:h-[320px] sm:w-[143px] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover object-top"
        sizes="143px"
      />
    </div>
  )
}

function LandingAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 55%), radial-gradient(80% 50% at 100% 40%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 50%), linear-gradient(180deg, var(--background) 0%, var(--background) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black 0%, transparent 70%)',
        }}
      />
    </>
  )
}

function FeatureBlock({
  src,
  title,
  description,
  points,
  reverse = false,
  priority = false,
}: {
  src: string
  title: string
  description: string
  points: readonly string[]
  reverse?: boolean
  priority?: boolean
}) {
  return (
    <article
      className={`flex flex-col gap-5 md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-10 lg:gap-12 ${
        reverse ? 'md:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div className="min-w-0">
        <h3
          className="text-xl font-bold tracking-tight md:text-2xl"
          style={displayFont()}
        >
          {title}
        </h3>
        <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground md:mt-3 md:text-[15px]">
          {description}
        </p>
        <ul className="mt-4 space-y-2 md:mt-5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
              <span className="leading-snug">{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto shrink-0 md:mx-0">
        <ScreenShot src={src} alt={title} priority={priority} />
      </div>
    </article>
  )
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-6 border-t border-border bg-muted/20 md:scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Features</p>
        <h2
          className="mt-2 max-w-[16ch] text-3xl font-bold tracking-tight md:mt-3 md:max-w-[18ch] md:text-4xl lg:text-5xl"
          style={displayFont()}
        >
          See GymTrack in action
        </h2>
        <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-base">
          Every screen below is from the real app — here&apos;s what each part does and why it
          matters for your training.
        </p>

        <div className="mt-12 space-y-12 md:mt-16 md:space-y-16">
          {LANDING_FEATURES.map((feature, i) => (
            <FeatureBlock
              key={feature.src}
              {...feature}
              reverse={i % 2 === 1}
              priority={i < 2}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="scroll-mt-6 border-t border-border md:scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">About</p>
        <h2
          className="mt-2 max-w-[18ch] text-3xl font-extrabold tracking-tight md:mt-3 md:text-4xl lg:text-5xl"
          style={displayFont()}
        >
          Fitness tracking that stays out of your way
        </h2>
        <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground md:text-base">
          GymTrack is a mobile-first PWA for people who train seriously. We built it to make logging
          effortless between sets, keep nutrition and recovery in the same place, and add AI only
          where it actually helps — not as noise.
        </p>

        <ul className="mt-12 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8">
          {ABOUT_POINTS.map((point) => (
            <li key={point.title}>
              <h3 className="text-lg font-extrabold tracking-tight md:text-xl" style={displayFont()}>
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-6 border-t border-border bg-muted/20 md:scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="text-center md:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Pricing</p>
          <h2
            className="mt-2 text-3xl font-extrabold tracking-tight md:mt-3 md:text-4xl lg:text-5xl"
            style={displayFont()}
          >
            Simple plans. Start free.
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-muted-foreground md:mx-0 md:mt-4 md:text-base">
            Train on Free for as long as you want. Upgrade to Pro when you want AI coaching and
            deeper body insights.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:mt-14 md:grid-cols-2 md:gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-[24px] border p-6 md:p-7 ${
                plan.highlighted
                  ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border bg-card/80'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold tracking-tight" style={displayFont()}>
                  {plan.name}
                </h3>
                {plan.highlighted && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight" style={displayFont()}>
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 inline-flex h-12 items-center justify-center rounded-[16px] text-sm font-bold transition-transform active:scale-[0.98] ${
                  plan.highlighted
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="relative border-t border-border px-6 pb-20 pt-10 md:px-8 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent md:h-48"
      />
      <div className="relative mx-auto max-w-6xl text-center">
        <h2
          className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl"
          style={displayFont()}
        >
          Ready when you are
        </h2>
        <p className="mx-auto mt-3 max-w-[30ch] text-sm text-muted-foreground md:mt-4 md:max-w-[36ch] md:text-base">
          Create an account and start your first session in under a minute.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-[52px] w-full max-w-sm items-center justify-center rounded-[18px] bg-primary px-6 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] md:mt-10 md:h-12 md:w-auto md:rounded-[16px] md:px-10"
        >
          Get started free
        </Link>
        <p className="mt-14 text-[11px] text-muted-foreground md:mt-20">
          © {new Date().getFullYear()} GymTrack
        </p>
      </div>
    </section>
  )
}

export function LandingPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-[100dvh] overflow-x-hidden text-foreground`}
      style={{ fontFamily: 'var(--font-landing-body), system-ui, sans-serif' }}
    >
      <LandingAtmosphere />

      {/* Mobile hero */}
      <section className="relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-8 md:hidden">
        <header className="flex items-center justify-between">
          <p className="text-xl font-extrabold tracking-tight" style={displayFont()}>
            Gym<span className="text-primary">Track</span>
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center pt-10">
          <h1
            className="max-w-[16ch] text-[2.65rem] font-extrabold leading-[0.95] tracking-tight animate-[landing-fade-up_0.7s_ease-out_both]"
            style={displayFont()}
          >
            Train with clarity.
          </h1>
          <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground animate-[landing-fade-up_0.7s_ease-out_0.12s_both]">
            Log sessions, see progress, and stay consistent — workouts, meals, recovery, and AI in
            one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 animate-[landing-fade-up_0.7s_ease-out_0.22s_both]">
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center justify-center rounded-[18px] bg-primary px-6 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
            >
              Get started
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center justify-center rounded-[16px] text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              See features
            </a>
          </div>

          <div className="relative mx-auto mt-12 animate-[landing-fade-up_0.8s_ease-out_0.32s_both]">
            <div className="absolute -inset-3 rounded-[24px] bg-primary/15 blur-xl" />
            <ScreenShot src="/screens/dashboard.png" alt="GymTrack dashboard" priority />
          </div>
        </div>
      </section>

      {/* Desktop hero */}
      <div className="hidden md:block">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
            <p className="text-2xl font-extrabold tracking-tight" style={displayFont()}>
              Gym<span className="text-primary">Track</span>
            </p>
            <nav className="flex items-center gap-6 lg:gap-8">
              <a
                href="#features"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#about"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </a>
              <a
                href="#pricing"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98]"
              >
                Sign in
              </Link>
            </nav>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-12 px-8 pb-20 pt-16 lg:gap-16 lg:pt-20">
          <div className="animate-[landing-fade-up_0.7s_ease-out_both]">
            <h1
              className="max-w-[12ch] text-5xl font-extrabold leading-[0.95] tracking-tight lg:text-6xl xl:text-7xl"
              style={displayFont()}
            >
              Train with clarity.
            </h1>
            <p className="mt-6 max-w-[40ch] text-base leading-relaxed text-muted-foreground lg:text-lg">
              Log sessions, see progress, and stay consistent — workouts, meals, recovery, and AI in
              one place. Built as a mobile PWA, ready on any screen.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-primary px-8 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:bg-primary/90 active:scale-[0.98]"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-[16px] px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                See features
              </a>
            </div>
          </div>

          <div className="relative flex justify-center animate-[landing-fade-up_0.8s_ease-out_0.15s_both]">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[32px] bg-primary/10 blur-2xl" />
              <ScreenShot src="/screens/dashboard.png" alt="GymTrack dashboard" priority />
            </div>
          </div>
        </section>
      </div>

      <FeaturesSection />
      <AboutSection />
      <PricingSection />
      <ClosingCta />
    </div>
  )
}
