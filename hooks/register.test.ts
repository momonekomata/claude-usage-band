import { test, expect } from 'claude-code/testing'
import { countdown, describe } from './register'

test('countdown formats spans', async () => {
  const now = Date.parse('2026-10-10T00:00:00Z')
  expect(countdown('2026-10-10T02:14:00Z', now)).toBe('resets in 2h 14m')
  expect(countdown('2026-10-12T05:00:00Z', now)).toBe('resets in 2d 5h')
  expect(countdown(undefined, now)).toBe('reset unknown')
})

test('describe shows used, left and reset', async () => {
  const now = Date.parse('2026-10-10T00:00:00Z')
  const s = describe({ kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-10T01:00:00Z' }, now)
  expect(s).toBe('5h: 23.5% used, 76.5% left, resets in 1h 0m')
})
