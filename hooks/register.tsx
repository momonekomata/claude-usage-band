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

// The mascot: the little orange pixel Claude at a laptop, seen three-quarter, more rattled as usage climbs.
export type Mood = 'cheerful' | 'focused' | 'worried' | 'panicking'

export const mood = (percentUsed: number): Mood =>
  percentUsed >= 85 ? 'panicking' : percentUsed >= 60 ? 'worried' : percentUsed >= 30 ? 'focused' : 'cheerful'

export const MASCOT_W = 84
export const MASCOT_H = 66

const ORANGE = '#D97757'
const EYE = '#2B211C'
const SWEAT = '#79C0FF'
const SMOKE = '#9AA0A6'

// Three-quarter view: an oblique projection. A point at depth z (away from us)
// lands up and to the right, so the front, top and right faces of a shape show.
const KX = 0.8
const KY = 0.45
const r1 = (n: number): number => Math.round(n * 10) / 10

type Shades = { front: string; side: string; top: string }
type Pt = [number, number]

const FUR: Shades = { front: ORANGE, side: '#B85F42', top: '#E8906F' }
const LID: Shades = { front: '#8B9099', side: '#6E737B', top: '#B3B8C0' }
const KEYS: Shades = { front: '#6E737B', side: '#565A61', top: '#B3B8C0' }
const BLUSH = '#F48FB1'
const TEAR = '#BEE9FF'

const poly = (pts: Pt[], fill: string): string =>
  `<polygon points="${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="${fill}" shape-rendering="geometricPrecision"/>`

// A flat outline (clockwise from the top-left) pushed `d` deep, its front at depth z0.
const prism = (outline: Pt[], z0: number, d: number, c: Shades): string => {
  const front = outline.map(([x, y]): Pt => [x + z0 * KX, y - z0 * KY])
  const back = front.map(([x, y]): Pt => [x + d * KX, y - d * KY])
  let out = poly(back, c.side)
  for (let i = 0; i < front.length; i++) {
    const [ax, ay] = front[i]!
    const [bx, by] = front[(i + 1) % front.length]!
    // clockwise on screen: an edge running rightward has its outward normal up
    const isTop = bx > ax
    out += poly([[ax, ay], [bx, by], [bx + d * KX, by - d * KY], [ax + d * KX, ay - d * KY]], isTop ? c.top : c.side)
  }
  return out + poly(front, c.front)
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]

// The same with its corners cut, so it reads soft.
const soft = (x: number, y: number, w: number, h: number, c: number): Pt[] => [
  [x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c],
  [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c],
]

const box = (x: number, y: number, w: number, h: number, z0: number, d: number, c: Shades): string =>
  prism(rect(x, y, w, h), z0, d, c)

const TYPING: Record<Mood, string> = {
  cheerful: '0.9s',
  focused: '0.55s',
  worried: '0.35s',
  panicking: '0.16s',
}

export const MASCOT_ALT: Record<Mood, string> = {
  cheerful: 'Claude, the cute orange pixel mascot, typing happily on a laptop',
  focused: 'Claude, the cute orange pixel mascot, typing on a laptop, focused',
  worried: 'Claude, the cute orange pixel mascot, typing on a laptop and sweating',
  panicking: 'Claude, the cute orange pixel mascot, teary and panicking over a smoking laptop',
}

// A short arm block on one side of the body, tapping the keys.
const arm = (x: number, begin: string, dur: string): string =>
  `<g>${prism(soft(x, 26, 7, 8, 1.5), 0, 6, FUR)}` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `</g>`

const drop = (x: number, begin: string, dur: string): string =>
  `<path d="M${x} 4 q3 5 0 7 q-3 -2 0 -7z" fill="${SWEAT}">` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 8" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="1;0" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `</path>`

const puff = (begin: string): string =>
  `<circle cx="40" cy="10" r="2" fill="${SMOKE}" opacity="0">` +
  `<animate attributeName="cy" values="10;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="r" values="2;5" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="0.7;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  `</circle>`

// Anime-style: eyes set low on the face and wide apart.
const EYE_L = 26
const EYE_R = 54

const blush = (): string =>
  `<ellipse cx="${EYE_L - 6}" cy="42" rx="3" ry="1.6" fill="${BLUSH}" fill-opacity="0.6"/>` +
  `<ellipse cx="${EYE_R + 6}" cy="42" rx="3" ry="1.6" fill="${BLUSH}" fill-opacity="0.6"/>`

const tear = (x: number): string => `<path d="M${x} 41 q2 3 0 4.5 q-2 -1.5 0 -4.5z" fill="${TEAR}"/>`

const eyes = (m: Mood): string => {
  const stroke = `fill="none" stroke="${EYE}" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"`
  if (m === 'cheerful') {
    return (
      blush() +
      `<path d="M${EYE_L - 4} 38 L${EYE_L} 33 L${EYE_L + 4} 38" ${stroke}/>` +
      `<path d="M${EYE_R - 4} 38 L${EYE_R} 33 L${EYE_R + 4} 38" ${stroke}/>`
    )
  }
  if (m === 'panicking') {
    return (
      `<path d="M${EYE_L - 4} 32 L${EYE_L + 1} 36 L${EYE_L - 4} 40" ${stroke}/>` +
      `<path d="M${EYE_R + 4} 32 L${EYE_R - 1} 36 L${EYE_R + 4} 40" ${stroke}/>` +
      tear(EYE_L - 3) +
      tear(EYE_R + 3)
    )
  }
  const blink =
    `<animate attributeName="height" values="8;8;1;8" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>` +
    `<animate attributeName="y" values="32;32;36;32" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>`
  const open =
    blush() +
    `<rect x="${EYE_L - 2}" y="32" width="4" height="8" fill="${EYE}">${blink}</rect>` +
    `<rect x="${EYE_R - 2}" y="32" width="4" height="8" fill="${EYE}">${blink}</rect>`
  if (m === 'worried') {
    const brow = `fill="none" stroke="${EYE}" stroke-width="2" stroke-linecap="square"`
    return open + `<path d="M${EYE_L - 6} 30 L${EYE_L + 1} 28" ${brow}/><path d="M${EYE_R + 6} 30 L${EYE_R - 1} 28" ${brow}/>`
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
    `<g stroke="${color}" stroke-width="1.2" stroke-linecap="round">${pulse}` +
    `<path d="M35.2 45.1 V50.3 M32.6 47.7 H37.8 M33.3 45.8 L37.1 49.6 M37.1 45.8 L33.3 49.6"/>` +
    `</g>`
  )
}

export const mascot = (m: Mood): string => {
  const dur = TYPING[m]
  const half = `-${parseFloat(dur) / 2}s`
  const shake =
    m === 'panicking'
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;-1 0;1 0;0 0" dur="0.18s" repeatCount="indefinite"/>`
      : ''
  const extras =
    m === 'cheerful'
      ? `<text x="76" y="16" font-size="10" fill="${ORANGE}" font-family="sans-serif">♪<animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite"/></text>`
      : m === 'worried'
        ? drop(74, '0s', '1.6s')
        : m === 'panicking'
          ? drop(74, '0s', '0.9s') + drop(8, '0.45s', '0.9s') + puff('0s') + puff('0.8s')
          : ''
  // back row of legs first, then the body, then the front row
  const legs = (z0: number): string =>
    [18, 24, 54, 60].map(x => box(x, 46, 4, 12, z0, 4, FUR)).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MASCOT_W}" height="${MASCOT_H}" viewBox="6 0 ${MASCOT_W} ${MASCOT_H}">` +
    `<g>${shake}` +
    `<ellipse cx="42" cy="62" rx="34" ry="3" fill="#000" fill-opacity="0.14"/>` +
    legs(4) +
    arm(8, half, dur) +
    // a wide, shallow body with its corners cut
    prism(soft(15, 16, 50, 30, 3), 0, 8, FUR) +
    arm(65, '0s', dur) +
    legs(0) +
    eyes(m) +
    // laptop in front: keyboard base running back toward Claude, lid facing us
    box(27, 50, 26, 3, -6, 10, KEYS) +
    box(30, 40, 20, 10, -6, 2, LID) +
    logo(m) +
    `<g>${extras}</g>` +
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
