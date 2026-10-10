import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const snapshot = atom({ plugin: 'usage-band', key: 'snapshot' } as const, null)
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const NAMES: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'spend',
}

export const countdown = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return 'reset unknown'
  const ms = Date.parse(resetsAt) - now
  if (Number.isNaN(ms)) return 'reset unknown'
  if (ms <= 0) return 'resetting now'
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const span = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return `resets in ${span}`
}

export const describe = (l: Limit, now: number): string => {
  const left = Math.max(0, Math.round((100 - l.percentUsed) * 10) / 10)
  const name = NAMES[l.kind] ?? l.kind
  return `${name}: ${l.percentUsed}% used, ${left}% left, ${countdown(l.resetsAt, now)}`
}

export const toSnapshot = (
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[],
  cost: { usd: number } | undefined,
): Snapshot => ({
  limits: rateLimits.map(r => ({
    kind: r.kind,
    percentUsed: r.percentUsed,
    ...(r.resetsAt ? { resetsAt: r.resetsAt } : {}),
  })),
  usd: cost ? cost.usd : null,
})

export const summary = (snap: Snapshot, now: number): string => {
  const parts = snap.limits.map(l => describe(l, now))
  if (snap.usd !== null) parts.push(`session $${snap.usd.toFixed(2)}`)
  return parts.length > 0 ? parts.join('  ·  ') : 'No usage limits reported yet'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    const snap = toSnapshot(u.rateLimits, u.cost)
    await update($, snapshot, () => snap)
    $.ui.status(summary(snap, await $.clock.now()))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const snap = toSnapshot(e.rateLimits, e.cost)
    await update($, snapshot, () => snap)
    $.ui.status(summary(snap, await $.clock.now()))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || snap === null || (await read($, isHidden))) {
      return next(e)
    }

    const now = await $.clock.now()
    const { Box, Text, Button } = $.ui.resolve(e)
    const line = summary(snap, now)

    return (
      <Box>
        <Text dimColor>{line} </Text>
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
