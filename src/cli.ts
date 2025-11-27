#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

import { checkCommand } from './commands/check'
import { optimiseCommand } from './commands/optimise'
import { parseYarnLockContent } from './yarn/parse'
import { parsePnpmLockContent } from './pnpm/parse'
import type { LockfileType } from './types/command'

const commands = {
  check: checkCommand,
  optimise: optimiseCommand,
}

// Parse arguments: can be either depdedupe <command> [path] or depdedupe [path]
const firstArg = process.argv[2]
const secondArg = process.argv[3]

let commandName: string
let providedPath: string | undefined

if (firstArg && firstArg in commands) {
  // Format: depdedupe <command> [path]
  commandName = firstArg
  providedPath = secondArg
} else if (firstArg) {
  // Format: depdedupe [path] - default to check command
  commandName = 'check'
  providedPath = firstArg
} else {
  // Format: depdedupe - default command and path
  commandName = 'check'
  providedPath = undefined
}

const command = commands[commandName as keyof typeof commands]

// Detect lockfile type
let lockfilePath: string
let lockfileType: LockfileType

if (providedPath) {
  lockfilePath = providedPath
  // Detect type based on file name
  if (lockfilePath.endsWith('pnpm-lock.yaml')) {
    lockfileType = 'pnpm'
  } else {
    lockfileType = 'yarn'
  }
} else {
  // Auto-detect by checking which file exists
  if (existsSync('./pnpm-lock.yaml')) {
    lockfilePath = './pnpm-lock.yaml'
    lockfileType = 'pnpm'
  } else if (existsSync('./yarn.lock')) {
    lockfilePath = './yarn.lock'
    lockfileType = 'yarn'
  } else {
    console.error(
      'Error: No lockfile found. Looking for yarn.lock or pnpm-lock.yaml',
    )
    console.error('Please check the path and try again.')
    process.exit(1)
  }
}

let lockfileContent: string
try {
  lockfileContent = readFileSync(lockfilePath, 'utf-8')
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    console.error(`Error: lockfile not found at path: ${lockfilePath}`)
    console.error('Please check the path and try again.')
    process.exit(1)
  } else {
    console.error(`Error reading lockfile: ${error}`)
    process.exit(1)
  }
}

const parsed =
  lockfileType === 'pnpm'
    ? parsePnpmLockContent(lockfileContent, { optimise: true })
    : parseYarnLockContent(lockfileContent, { optimise: true })

command({
  lockfileType,
  lockfilePath,
  lockfileContent,
  parsed,
})
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
