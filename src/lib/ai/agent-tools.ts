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

Examples:
{"summary":"Create Cable Fly","actions":[{"action":"create_custom_exercise","params":{"name":"Cable Fly","instructions":["Set cables","Bring handles together"]}}]}
{"summary":"Update Cable Fly","actions":[{"action":"update_custom_exercise","params":{"name":"Cable Fly","instructions":["…"]}}]}
{"summary":"Delete Cable Fly","actions":[{"action":"delete_custom_exercise","params":{"name":"Cable Fly"}}]}

Rules: never claim data changed until the user confirms; use IDs from context; "that/this/it" exercise = customExercises[0]; catalog is read-only; keep replies short; no medical diagnosis.

Formatting for READ answers (not tool calls):
- Use ## Section Title headings for multi-part answers (e.g. ## Workout, ## Tips, ## Nutrition)
- Use - bullet lists for steps and options
- Bold key numbers/names with **like this** inside sentences only — never wrap section titles in **asterisks**
- Short one-liner answers can stay as plain prose`

export const JSON_FALLBACK_PROMPT = `Tool call failed. For create/update/delete reply with ONLY JSON:
{"summary":"...","actions":[{"action":"create_custom_exercise","params":{"name":"Cable Fly","instructions":["step 1"]}}]}
One create_custom_exercise per name; skip library duplicates. For questions, reply in plain text.`
