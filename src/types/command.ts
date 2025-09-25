import type { ParsedYarnLock } from '../yarn'

export type CommandOptions = {
  yarnLockPath: string
  yarnLockContent: string
  parsed: ParsedYarnLock
}
