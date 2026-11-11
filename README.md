# usage-band

A mod for Claude Code and the Claude desktop app. It adds a colored, multi-line band above the input box:

```
5h  ━━━━━─────────────── 23.5% used · 76.5% left · resets in 1h 0m
7d  ━━━━━━━━──────────── 40% used · 60% left · resets in 2d 5h
session $1.23  [Hide]                                  (•_•)⌨
```

Bars turn green, yellow (60%+) and red (85%+) as a window fills. Remaining is shown as percent left per window; the API gives no dollar balance. The same text goes to the status line.

In the desktop app and VS Code the bars are rounded pills, and the little orange pixel Claude, drawn three-quarter, a wide and soft little thing with anime eyes, at a laptop, sits in the right corner. It gets more rattled as the fullest window fills: cheerful under 30%, focused to 60%, sweating to 85%, then panicking over a smoking laptop. The terminal draws thin line bars and a text face instead.

## Hide and show

Press **Hide** to remove the band. Run `/usage-band` to bring it back (and to hide it again). The choice lasts for the session.

## Install

```
/plugin install usage-band --marketplace momonekomata/claude-usage-band
```
