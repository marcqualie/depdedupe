import { readFile, readFileSync } from 'node:fs'
import { parseYarnLockContent } from './yarn/parse'

console.log('Hello from depdedupe CLI!')

const pathToYarnLock = process.argv[2]
if (!pathToYarnLock) {
  console.error('Usage: depdedupe <path-to-yarn-lock>')
  process.exit(1)
}

const content = readFileSync(pathToYarnLock, 'utf-8')
const optimized = parseYarnLockContent(content, { optimise: true })

let dependenciesCount = 0
let optimizedCount = 0

for (const [name, info] of Object.entries(optimized.dependencies)) {
  dependenciesCount += Object.keys(info.versions).length
  optimizedCount += Object.keys(info.optimisedVersions || {}).length
}

if (dependenciesCount === optimizedCount) {
  console.log('No optimization possible')
  process.exit(0)
} else {
  console.log(`Can be optimized from ${dependenciesCount} to ${optimizedCount} dependencies`)
  process.exit(1)
}
