import { test, expect } from 'claude-code/testing'
import {
  bar,
  countdown,
  describe,
  mascot,
  MASCOT_ALT,
  mood,
  pill,
  toggleText,
  tone,
} from './register'

test('toggleText says how to bring the band back', async () => {
  expect(toggleText(true)).toContain('/usage-band')
  expect(toggleText(false)).toBe('Usage band shown.')
})

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

test('terminal bar fills in proportion and clamps', async () => {
  expect(bar(0)).toBe('─'.repeat(20))
  expect(bar(50)).toBe('━'.repeat(10) + '─'.repeat(10))
  expect(bar(130)).toBe('━'.repeat(20))
})

test('tone shifts from green to red', async () => {
  expect(tone(10)).toBe('success')
  expect(tone(60)).toBe('warning')
  expect(tone(90)).toBe('error')
})

test('pill is rounded and colored by tone', async () => {
  const low = pill(20)
  expect(low).toContain('rx="5"')
  expect(low).toContain('#2ea043')
  expect(pill(70)).toContain('#d29922')
  expect(pill(95)).toContain('#e5534b')
  expect(pill(0)).toContain('width="10"')
})

test('mood gets more rattled as usage climbs', async () => {
  expect(mood(10)).toBe('cheerful')
  expect(mood(45)).toBe('focused')
  expect(mood(70)).toBe('worried')
  expect(mood(99)).toBe('panicking')
})

test('mascot draws each mood as one svg', async () => {
  for (const m of ['cheerful', 'focused', 'worried', 'panicking'] as const) {
    const s = mascot(m)
    expect(s.startsWith('<svg')).toBe(true)
    expect(s.endsWith('</svg>')).toBe(true)
    expect(s.length).toBeLessThan(131072)
    expect(MASCOT_ALT[m].length).toBeGreaterThan(0)
  }
  expect(mascot('panicking')).toContain('#79C0FF')
  expect(mascot('cheerful')).not.toContain('#79C0FF')
})

test('worried is teary squints, panicking is crying streams', async () => {
  const w = mascot('worried')
  const p = mascot('panicking')
  expect(p).toContain('stroke-dashoffset')
  expect(w).not.toContain('stroke-dashoffset')
  expect(w).toContain('#BEE9FF')
  expect(p).toContain('#BEE9FF')
})
