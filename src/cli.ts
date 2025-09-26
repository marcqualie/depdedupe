#!/usr/bin/env node

import { readFileSync } from 'node:fs'

import { checkCommand } from './commands/check'
import { optimiseCommand } from './commands/optimise'
import { parseYarnLockContent } from './yarn/parse'

const commands = {
  check: checkCommand,
  optimise: optimiseCommand,
}

// Parse arguments: can be either depdedupe <command> [path] or depdedupe [path]
const firstArg = process.argv[2]
const secondArg = process.argv[3]

let commandName: string
let yarnLockPath: string

if (firstArg && firstArg in commands) {
  // Format: depdedupe <command> [path]
  commandName = firstArg
  yarnLockPath = secondArg || './yarn.lock'
} else if (firstArg) {
  // Format: depdedupe [path] - default to check command
  commandName = 'check'
  yarnLockPath = firstArg
} else {
  // Format: depdedupe - default command and path
  commandName = 'check'
  yarnLockPath = './yarn.lock'
}

const command = commands[commandName as keyof typeof commands]

let yarnLockContent: string
try {
  yarnLockContent = readFileSync(yarnLockPath, 'utf-8')
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    console.error(`Error: yarn.lock file not found at path: ${yarnLockPath}`)
    console.error('Please check the path and try again.')
    process.exit(1)
  } else {
    console.error(`Error reading yarn.lock file: ${error}`)
    process.exit(1)
  }
}

const parsed = parseYarnLockContent(yarnLockContent, { optimise: true })

command({
  yarnLockPath,
  yarnLockContent,
  parsed,
})
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
