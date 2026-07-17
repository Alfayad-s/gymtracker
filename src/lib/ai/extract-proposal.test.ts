import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractProposalPayload, looksLikeMutationIntent } from './extract-proposal'

describe('extractProposalPayload', () => {
  it('parses plain proposal JSON', () => {
    const raw = JSON.stringify({
      summary: 'Update Cable Fly',
      actions: [{ action: 'update_custom_exercise', params: { name: 'Cable Fly' } }],
    })
    const result = extractProposalPayload(raw)
    assert.ok(result)
    assert.equal(result?.actions?.length, 1)
  })

  it('parses fenced JSON', () => {
    const raw = 'Sure.\n```json\n{"actions":[{"action":"delete_custom_exercise","params":{"name":"Cable Fly"}}]}\n```'
    const result = extractProposalPayload(raw)
    assert.ok(result?.actions)
  })

  it('parses Groq-style failed_generation function dump', () => {
    const raw =
      '<function=propose_gymtrack_actions{"summary":"Update","actions":[{"action":"update_custom_exercise","params":{"name":"Cable Fly","instructions":["A","B"]}}]}'
    const result = extractProposalPayload(raw)
    assert.ok(result)
    assert.equal(result?.summary, 'Update')
    assert.equal((result?.actions?.[0] as { action: string }).action, 'update_custom_exercise')
  })

  it('parses single-action shorthand', () => {
    const result = extractProposalPayload(
      '{"action":"create_custom_exercise","params":{"name":"Cable Fly"}}'
    )
    assert.equal(result?.actions?.length, 1)
  })
})

describe('looksLikeMutationIntent', () => {
  it('detects update requests', () => {
    assert.equal(looksLikeMutationIntent('Update that exercise'), true)
    assert.equal(looksLikeMutationIntent('what muscles does cable fly work'), false)
  })
})
