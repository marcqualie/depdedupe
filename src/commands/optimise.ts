import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { prepareRemovals } from '../yarn/prepare-removals'

import type { CommandOptions } from '../types/command'

export const optimiseCommand = async (options: CommandOptions) => {
  const { yarnLockPath, yarnLockContent, parsed } = options

  const removals: Record<string, string[]> = {}
  for (const [name, info] of Object.entries(parsed.dependencies)) {
    const versions = Object.keys(info.versions)
    const optimisedVersions = Object.keys(info.optimisedVersions || {})
    if (versions.length !== optimisedVersions.length) {
      const toRemove = versions.filter((v) => !optimisedVersions.includes(v))
      removals[name] = toRemove
    }
  }

  if (Object.keys(removals).length === 0) {
    console.log('No optimization possible')
    process.exit(0)
  }

  console.log(`Removing ${Object.values(removals).flat().length} dependencies`)

  const newYarnLockContent = prepareRemovals(yarnLockContent, removals)

  await writeFile(yarnLockPath, newYarnLockContent, 'utf-8')

  // run 'yarn install' in the base directory of the yarn.lock file
  await new Promise<void>((resolve, reject) => {
    const yarnInstall = spawn('yarn', ['install'], {
      cwd: dirname(yarnLockPath),
      stdio: 'inherit',
      shell: true,
    })

    yarnInstall.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`yarn install failed with code ${code}`))
      }
    })
  })
}
