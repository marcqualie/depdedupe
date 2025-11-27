import type { ParsedPnpmLock } from '../pnpm'
import type { ParsedYarnLock } from '../yarn'

export type LockfileType = 'yarn' | 'pnpm'

export type CommandOptions = {
  lockfileType: LockfileType
  lockfilePath: string
  lockfileContent: string
  parsed: ParsedYarnLock | ParsedPnpmLock
}
