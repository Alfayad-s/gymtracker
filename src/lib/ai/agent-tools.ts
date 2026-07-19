import { AGENT_ACTION_NAMES } from '@/lib/ai/agent-types'

/** Keep tool schema minimal — large enums cause Groq llama tool_use_failed errors. */
export const PROPOSE_ACTIONS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'propose_gymtrack_actions',
    description:
      'Propose GymTrack data changes (create/update/delete) for user confirmation. Do not use for read-only questions — answer those in normal text.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Short summary of the change. Optional.',
        },
        actions: {
          type: 'array',
          description:
            'Ordered actions (up to 40). Each item: { action: string, params: object }. For bulk creates, one create_custom_exercise per exercise.',
          maxItems: 40,
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: `One of: ${AGENT_ACTION_NAMES.join(', ')}`,
              },
              params: {
                type: 'object',
                description: 'Action parameters. Use {} if none.',
              },
            },
            required: ['action'],
          },
        },
      },
      required: ['actions'],
    },
  },
}

export const AGENT_SYSTEM_PROMPT = `You are GymTrack AI with CRUD over the user's gym data.

READ questions → answer in normal text only (no tools).
CREATE / UPDATE / DELETE → call propose_gymtrack_actions once.

Bulk: one create_custom_exercise per listed exercise (max 40). Skip names already in exerciseCatalog or customExercises.
Prefer catalog exercises for plans/workouts; only create customs for missing names.

Plan days for a specific day ("tomorrow", "Monday", "create a workout for …"):
- Use calendar.todayWeekday / calendar.tomorrowWeekday (1=Mon … 7=Sun). Never invent dates.
- Use activePlanId (or plans[].id where isActive). Always pass planId and a non-empty name.
- If that weekday already has a day on the active plan, reuse its dayId and add_exercise_to_day — do not add_plan_day again.
- If no day exists: add_plan_day with name, muscleFocus, dayOfWeek, then add 4–8 catalog exercises via add_exercise_to_day with dayId "$last_day".
- Build from CURRENT data: recovery (prefer recovered groups), recentHistory, profile.experienceLevel, and exerciseCatalog ids (never fake exerciseIds).
- Default sets/reps: intermediate 3–4×8–12; beginner 3×10–12; advanced 4×6–10.

Examples:
{"summary":"Create Cable Fly","actions":[{"action":"create_custom_exercise","params":{"name":"Cable Fly","instructions":["Set cables","Bring handles together"]}}]}
{"summary":"Update Cable Fly","actions":[{"action":"update_custom_exercise","params":{"name":"Cable Fly","instructions":["…"]}}]}
{"summary":"Delete Cable Fly","actions":[{"action":"delete_custom_exercise","params":{"name":"Cable Fly"}}]}
{"summary":"Add Push day for tomorrow","actions":[{"action":"add_plan_day","params":{"planId":"PLAN_ID","name":"Push — Tuesday","muscleFocus":"Chest Shoulders Triceps","dayOfWeek":2}},{"action":"add_exercise_to_day","params":{"planId":"PLAN_ID","dayId":"$last_day","exerciseId":"bench-press","targetSets":4,"targetReps":8}},{"action":"add_exercise_to_day","params":{"planId":"PLAN_ID","dayId":"$last_day","exerciseId":"overhead-press","targetSets":3,"targetReps":10}}]}

Rules: never claim data changed until the user confirms; use IDs from context; "that/this/it" exercise = customExercises[0]; catalog is read-only; keep replies short; no medical diagnosis.

Formatting for READ answers (not tool calls):
- Use ## Section Title headings for multi-part answers (e.g. ## Workout, ## Tips, ## Nutrition)
- Use - bullet lists for steps and options
- Bold key numbers/names with **like this** inside sentences only — never wrap section titles in **asterisks**
- Short one-liner answers can stay as plain prose`

export const JSON_FALLBACK_PROMPT = `Tool call failed. For create/update/delete reply with ONLY JSON:
{"summary":"...","actions":[{"action":"add_plan_day","params":{"planId":"…","name":"Push — Tuesday","dayOfWeek":2}},{"action":"add_exercise_to_day","params":{"planId":"…","dayId":"$last_day","exerciseId":"bench-press","targetSets":4,"targetReps":8}}]}
Or create_custom_exercise per name; skip library duplicates. For questions, reply in plain text.`
