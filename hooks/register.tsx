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

const clamp = (percentUsed: number): number => Math.max(0, Math.min(100, percentUsed))

export const tone = (percentUsed: number): 'success' | 'warning' | 'error' =>
  percentUsed >= 85 ? 'error' : percentUsed >= 60 ? 'warning' : 'success'

// Terminal bar: a thin line, filled part in the tone's color, the rest dim.
export const BAR = 20

export const barParts = (percentUsed: number): { filled: string; empty: string } => {
  const n = Math.round((clamp(percentUsed) / 100) * BAR)
  return { filled: '━'.repeat(n), empty: '─'.repeat(BAR - n) }
}

export const bar = (percentUsed: number): string => {
  const { filled, empty } = barParts(percentUsed)
  return filled + empty
}

// Graphical bar: a rounded pill with a gradient fill and a soft highlight.
// Neutral track and highlight read on both light and dark themes.
export const PILL_W = 180
export const PILL_H = 10

const HEX = {
  success: { base: '#2ea043', light: '#56d364' },
  warning: { base: '#d29922', light: '#f2cc60' },
  error: { base: '#e5534b', light: '#ff8b84' },
} as const

export const pill = (percentUsed: number): string => {
  const c = HEX[tone(percentUsed)]
  const r = PILL_H / 2
  const w = Math.round((clamp(percentUsed) / 100) * PILL_W * 10) / 10
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PILL_W}" height="${PILL_H}" viewBox="0 0 ${PILL_W} ${PILL_H}">` +
    `<defs>` +
    `<linearGradient id="g" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${c.light}"/><stop offset="1" stop-color="${c.base}"/>` +
    `</linearGradient>` +
    `<clipPath id="c"><rect width="${PILL_W}" height="${PILL_H}" rx="${r}"/></clipPath>` +
    `</defs>` +
    `<rect width="${PILL_W}" height="${PILL_H}" rx="${r}" fill="#8b949e" fill-opacity="0.22"/>` +
    `<g clip-path="url(#c)">` +
    `<rect x="${-PILL_H}" width="${w + PILL_H}" height="${PILL_H}" rx="${r}" fill="url(#g)"/>` +
    `<rect x="${r / 2}" y="1.5" width="${Math.max(0, w - r)}" height="2.5" rx="1.25" fill="#ffffff" fill-opacity="0.28"/>` +
    `</g>` +
    `</svg>`
  )
}

// The mascot: a little pixel Claude at a laptop, more rattled as usage climbs.
export type Mood = 'cheerful' | 'focused' | 'worried' | 'panicking'

export const mood = (percentUsed: number): Mood =>
  percentUsed >= 85 ? 'panicking' : percentUsed >= 60 ? 'worried' : percentUsed >= 30 ? 'focused' : 'cheerful'

export const MASCOT_W = 72
export const MASCOT_H = 56

const ORANGE = '#D97757'
const EYE = '#2B211C'
const LID = '#8B9099'
const LID_EDGE = '#B3B8C0'
const BASE = '#6E737B'
const SWEAT = '#79C0FF'
const SMOKE = '#9AA0A6'

const TYPING: Record<Mood, string> = {
  cheerful: '0.9s',
  focused: '0.55s',
  worried: '0.35s',
  panicking: '0.16s',
}

export const MASCOT_ALT: Record<Mood, string> = {
  cheerful: 'Claude typing happily on a laptop',
  focused: 'Claude typing on a laptop, focused',
  worried: 'Claude typing on a laptop, sweating',
  panicking: 'Claude panicking at a smoking laptop',
}

const arm = (x: number, delay: string, dur: string): string =>
  `<rect x="${x}" y="36" width="8" height="6" fill="${ORANGE}">` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="${dur}" begin="${delay}" repeatCount="indefinite"/>` +
  `</rect>`

const drop = (x: number, begin: string, dur: string): string =>
  `<path d="M${x} 4 q3 5 0 7 q-3 -2 0 -7z" fill="${SWEAT}">` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 8" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="1;0" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `</path>`

const puff = (begin: string): string =>
  `<circle cx="52" cy="22" r="2" fill="${SMOKE}" opacity="0">` +
  `<animate attributeName="cy" values="22;2" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="r" values="2;5" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="0.7;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `</circle>`

const eyes = (m: Mood): string => {
  const stroke = `fill="none" stroke="${EYE}" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"`
  if (m === 'cheerful') {
    return `<path d="M25 19 L28 15 L31 19" ${stroke}/><path d="M41 19 L44 15 L47 19" ${stroke}/>`
  }
  if (m === 'panicking') {
    return `<path d="M25 13 L30 17 L25 21" ${stroke}/><path d="M47 13 L42 17 L47 21" ${stroke}/>`
  }
  const blink =
    `<animate attributeName="height" values="8;8;1;8" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>` +
    `<animate attributeName="y" values="13;13;17;13" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>`
  const open = `<rect x="26" y="13" width="4" height="8" fill="${EYE}">${blink}</rect><rect x="42" y="13" width="4" height="8" fill="${EYE}">${blink}</rect>`
  if (m === 'worried') {
    const brow = `fill="none" stroke="${EYE}" stroke-width="2" stroke-linecap="square"`
    return open + `<path d="M24 11 L30 9" ${brow}/><path d="M48 11 L42 9" ${brow}/>`
  }
  return open
}

const logo = (m: Mood): string => {
  const color = m === 'panicking' ? '#e5534b' : ORANGE
  const pulse =
    m === 'panicking'
      ? `<animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite"/>`
      : ''
  return (
    `<g stroke="${color}" stroke-width="1.3" stroke-linecap="round">${pulse}` +
    `<path d="M36 30.5 V37.5 M32.5 34 H39.5 M33.5 31.5 L38.5 36.5 M38.5 31.5 L33.5 36.5"/>` +
    `</g>`
  )
}

export const mascot = (m: Mood): string => {
  const dur = TYPING[m]
  const shake =
    m === 'panicking'
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;-1 0;1 0;0 0" dur="0.18s" repeatCount="indefinite"/>`
      : ''
  const extras =
    m === 'cheerful'
      ? `<text x="60" y="12" font-size="10" fill="${ORANGE}" font-family="sans-serif">♪<animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite"/></text>`
      : m === 'worried'
        ? drop(60, '0s', '1.6s')
        : m === 'panicking'
          ? drop(60, '0s', '0.9s') + drop(10, '0.45s', '0.9s') + puff('0s') + puff('0.8s')
          : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MASCOT_W}" height="${MASCOT_H}" viewBox="0 0 ${MASCOT_W} ${MASCOT_H}" shape-rendering="crispEdges">` +
    `<g>${shake}` +
    // legs, peeking out under the laptop
    `<g fill="${ORANGE}"><rect x="20" y="40" width="4" height="14"/><rect x="28" y="40" width="4" height="14"/>` +
    `<rect x="40" y="40" width="4" height="14"/><rect x="48" y="40" width="4" height="14"/></g>` +
    // body and face
    `<rect x="16" y="8" width="40" height="32" fill="${ORANGE}"/>` +
    eyes(m) +
    // laptop, seen from behind the lid
    `<rect x="20" y="24" width="32" height="20" rx="2" fill="${LID}"/>` +
    `<rect x="20" y="24" width="32" height="2" fill="${LID_EDGE}"/>` +
    `<g shape-rendering="geometricPrecision">${logo(m)}</g>` +
    `<rect x="12" y="44" width="48" height="4" rx="1.5" fill="${BASE}"/>` +
    // arms tapping the keys
    arm(8, '0s', dur) +
    arm(56, `-${parseFloat(dur) / 2}s`, dur) +
    `<g shape-rendering="geometricPrecision">${extras}</g>` +
    `</g>` +
    `</svg>`
  )
}

// The same moods as text, for the terminal.
export const FACE: Record<Mood, string> = {
  cheerful: '(^‿^)⌨',
  focused: '(•_•)⌨',
  worried: '(°□°;)⌨',
  panicking: '(>_<;)⌨',
}

export const summary = (snap: Snapshot, now: number): string => {
  const parts = snap.limits.map(l => describe(l, now))
  if (snap.usd !== null) parts.push(`session $${snap.usd.toFixed(2)}`)
  return parts.length > 0 ? parts.join('  ·  ') : 'No usage limits reported yet'
}

export const toggleText = (nowHidden: boolean): string =>
  nowHidden ? 'Usage band hidden. Run /usage-band to show it again.' : 'Usage band shown.'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage-band',
      description: 'Show or hide the usage band above the prompt',
    })
    const u = await $.session.usage()
    const snap = toSnapshot(u.rateLimits, u.cost)
    await update($, snapshot, () => snap)
    $.ui.status(summary(snap, await $.clock.now()))
    return next(e)
  })

  on('command.run', { command: 'usage-band' }, async $ => {
    const nowHidden = !(await read($, isHidden))
    await update($, isHidden, () => nowHidden)
    return { text: toggleText(nowHidden) }
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
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const Svg = 'Svg' in table ? table.Svg : undefined
    const width = Math.max(0, ...snap.limits.map(l => (NAMES[l.kind] ?? l.kind).length))
    const m = mood(Math.max(0, ...snap.limits.map(l => l.percentUsed)))

    return (
      <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between">
        <Box flexDirection="column" flexGrow={1}>
          {snap.limits.map(l => {
            const name = (NAMES[l.kind] ?? l.kind).padEnd(width)
            const left = Math.max(0, Math.round((100 - l.percentUsed) * 10) / 10)
            const t = tone(l.percentUsed)
            const parts = barParts(l.percentUsed)
            return (
              <Box key={l.kind} alignItems="center">
                <Text bold>{name} </Text>
                {Svg ? (
                  <Svg
                    source={pill(l.percentUsed)}
                    alt={`${l.percentUsed}% used`}
                    width={PILL_W}
                    height={PILL_H}
                  />
                ) : (
                  <Text color={t}>{parts.filled}</Text>
                )}
                {Svg ? null : <Text dimColor>{parts.empty}</Text>}
                <Text color={t} bold> {l.percentUsed}% used</Text>
                <Text dimColor> · </Text>
                <Text color={t}>{left}% left</Text>
                <Text dimColor> · {countdown(l.resetsAt, now)}</Text>
              </Box>
            )
          })}
          {snap.limits.length === 0 ? <Text dimColor>No usage limits reported yet</Text> : null}
          <Box alignItems="center">
            {snap.usd !== null ? <Text dimColor>session </Text> : null}
            {snap.usd !== null ? <Text color="claude" bold>${snap.usd.toFixed(2)} </Text> : null}
            <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
          </Box>
        </Box>
        {Svg ? (
          <Svg source={mascot(m)} alt={MASCOT_ALT[m]} width={MASCOT_W} height={MASCOT_H} />
        ) : (
          <Text color="claude">{FACE[m]}</Text>
        )}
      </Box>
    )
  })
}
