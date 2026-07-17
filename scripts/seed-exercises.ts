/**
 * Seed exercise categories + exercise library into Supabase Postgres.
 *
 * Usage: npm run db:seed
 */
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { exerciseCategories, exercises } from '../src/db/schema'
import { EXERCISE_CATALOG, EXERCISE_CATEGORIES } from '../src/data/exercises'

config({ path: '.env.local', override: true })
config({ path: '.env', override: true })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client)

  console.log('Seeding exercise categories…')
  const categoryIds = new Map<string, string>()

  for (const name of EXERCISE_CATEGORIES) {
    const existing = await db
      .select()
      .from(exerciseCategories)
      .where(eq(exerciseCategories.name, name))
      .limit(1)

    if (existing[0]) {
      categoryIds.set(name, existing[0].id)
      continue
    }

    const [row] = await db
      .insert(exerciseCategories)
      .values({ name, icon: name.toLowerCase() })
      .returning()
    categoryIds.set(name, row.id)
  }

  console.log(`Categories ready: ${categoryIds.size}`)
  console.log(`Seeding ${EXERCISE_CATALOG.length} exercises…`)

  let upserted = 0
  for (const ex of EXERCISE_CATALOG) {
    const categoryId = categoryIds.get(ex.muscleGroup)
    const payload = {
      slug: ex.id,
      name: ex.name,
      description: `${ex.target} focused ${ex.equipment.toLowerCase()} exercise`,
      instructions: JSON.stringify(ex.instructions),
      categoryId,
      muscleGroup: ex.muscleGroup,
      targetMuscle: ex.target,
      secondaryMuscles: JSON.stringify(ex.secondary),
      anatomyView: ex.anatomy.view,
      anatomyPrimary: JSON.stringify(ex.anatomy.primary),
      anatomySecondary: JSON.stringify(ex.anatomy.secondary),
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      imageUrl: ex.imageUrl,
    }

    const existing = await db.select().from(exercises).where(eq(exercises.slug, ex.id)).limit(1)

    if (existing[0]) {
      await db.update(exercises).set(payload).where(eq(exercises.slug, ex.id))
    } else {
      await db.insert(exercises).values(payload)
    }
    upserted += 1
  }

  console.log(`Done. Upserted ${upserted} exercises.`)
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
