export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snapshot = { limits: Limit[]; usd: number | null }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { snapshot: Snapshot | null; isHidden: boolean }
  }
}
