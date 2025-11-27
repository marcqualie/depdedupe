import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { prepareRemovals as pnpmPrepareRemovals } from '../pnpm/prepare-removals'
import { prepareRemovals as yarnPrepareRemovals } from '../yarn/prepare-removals'

import type { CommandOptions } from '../types/command'

export const optimiseCommand = async (options: CommandOptions) => {
  const { lockfilePath, lockfileContent, lockfileType, parsed } = options

  const removals: Record<string, string[]> = {}
  const optimisedVersionsMap: Record<string, Record<string, string[]>> = {}

  for (const [name, info] of Object.entries(parsed.dependencies)) {
    const versions = Object.keys(info.versions)
    const optimisedVersions = Object.keys(info.optimisedVersions || {})
    if (versions.length !== optimisedVersions.length) {
      const toRemove = versions.filter((v) => !optimisedVersions.includes(v))
      removals[name] = toRemove
      optimisedVersionsMap[name] = info.optimisedVersions || {}
    }
  }

  if (Object.keys(removals).length === 0) {
    console.log('No optimization possible')
    process.exit(0)
  }

  console.log(`Removing ${Object.values(removals).flat().length} dependencies`)

  const newLockfileContent =
    lockfileType === 'pnpm'
      ? pnpmPrepareRemovals(lockfileContent, removals, optimisedVersionsMap)
      : yarnPrepareRemovals(lockfileContent, removals)

  await writeFile(lockfilePath, newLockfileContent, 'utf-8')

  // run package manager install in the base directory of the lockfile
  const packageManager = lockfileType === 'pnpm' ? 'pnpm' : 'yarn'
  await new Promise<void>((resolve, reject) => {
    const install = spawn(packageManager, ['install'], {
      cwd: dirname(lockfilePath),
      stdio: 'inherit',
      shell: true,
    })

    install.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${packageManager} install failed with code ${code}`))
      }
    })
  })
}
