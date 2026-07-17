# GymTrack 🏋️‍♂️

GymTrack is a modern, mobile-first Progressive Web App (PWA) designed for lightning-fast workout logging with minimal taps. Heavily inspired by the clean, visual aesthetics of Apple Fitness.

---

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Scaffolding/UI**: shadcn/ui & Framer Motion (for smooth animations)
- **Database**: PostgreSQL (Supabase) via Drizzle ORM
- **Authentication**: Supabase Auth (Cookie-based session updates)
- **State Management**: Zustand (Auth, workout logs, rest timers, preferences)
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide Icons
- **Charts**: Recharts

---

## 🛠️ Project Setup

### 1. Install Dependencies
Run npm install to retrieve the packages:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` (Next.js automatically loads `.env.local` locally, and it is excluded from git):
```bash
cp .env.example .env.local
```
Fill in your Supabase connection strings:
- `DATABASE_URL`: Postgres pool string from Supabase (e.g. port 5432 or transaction pooler)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project public anon key

### 3. Generate and Apply Database Schema
Generate sql migrations from the Drizzle schemas:
```bash
npx drizzle-kit generate
```
Push the schemas directly to the Supabase database:
```bash
npx drizzle-kit push
```

### 4. Run Locally
Launch the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on a mobile device emulator (target size: 390px - 430px wide).

---

## 📂 Folder Structure

```
src/
  ├── app/                  # Route layouts, pages, API routes, middleware
  ├── components/           # React Components
  │   ├── ui/               # Raw shadcn/ui components (buttons, dialogs, inputs)
  │   ├── layout/           # Mobile frame wrappers and bottom sticky navigation bar
  │   ├── workout/          # Log steppers (WeightPicker, RepPicker, RestTimer)
  │   └── charts/           # Visual data graphs
  ├── db/                   # Database schemas and Drizzle clients
  ├── stores/               # Zustand global state (auth, timers, active logging sessions)
  └── utils/                # Supabase SSR cookie wrappers and route guards
```
