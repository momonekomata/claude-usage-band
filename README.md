# usage-band

A mod for Claude Code and the Claude desktop app. It adds a colored, multi-line band above the input box:

```
5h  ████░░░░░░░░░░░░░░░░ 23.5% used · 76.5% left · resets in 1h 0m
7d  ████████░░░░░░░░░░░░ 40% used · 60% left · resets in 2d 5h
session $1.23  [Hide]
```

Bars turn green, yellow (60%+) and red (85%+) as a window fills. Remaining is shown as percent left per window; the API gives no dollar balance. The same text goes to the status line.

## Install

```
/plugin install usage-band --marketplace momonekomata/claude-usage-band
```
