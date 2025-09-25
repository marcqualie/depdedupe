import { readFileSync } from 'node:fs'

import { checkCommand } from './commands/check'
import { optimiseCommand } from './commands/optimise'
import { parseYarnLockContent } from './yarn/parse'

const commands = {
  check: checkCommand,
  optimise: optimiseCommand,
}

const commandName = process.argv[2]
if (!commandName || !(commandName in commands)) {
  console.error('Usage: depdedupe <command> <path-to-yarn-lock>')
  console.error(`Available commands: ${Object.keys(commands).join(', ')}`)
  process.exit(1)
}
const command = commands[commandName as keyof typeof commands]

const yarnLockPath = process.argv[3]
if (!yarnLockPath) {
  console.error(`Usage: depdedupe ${commandName} <path-to-yarn-lock>`)
  process.exit(1)
}

const yarnLockContent = readFileSync(yarnLockPath, 'utf-8')
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
