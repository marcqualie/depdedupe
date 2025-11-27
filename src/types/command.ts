import type { ParsedYarnLock } from '../yarn'
import type { ParsedPnpmLock } from '../pnpm'

export type LockfileType = 'yarn' | 'pnpm'

export type CommandOptions = {
  lockfileType: LockfileType
  lockfilePath: string
  lockfileContent: string
  parsed: ParsedYarnLock | ParsedPnpmLock
}
