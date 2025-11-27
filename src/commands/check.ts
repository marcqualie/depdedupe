import type { CommandOptions } from '../types/command'

export const checkCommand = async (options: CommandOptions) => {
  const { parsed, lockfileType } = options

  let dependenciesCount = 0
  let optimizedCount = 0

  for (const [_name, info] of Object.entries(parsed.dependencies)) {
    dependenciesCount += Object.keys(info.versions).length
    optimizedCount += Object.keys(info.optimisedVersions || {}).length
  }

  if (dependenciesCount === optimizedCount) {
    console.log('No optimization possible')
    process.exit(0)
  } else {
    const lockfileTypeName = lockfileType === 'pnpm' ? 'pnpm-lock.yaml' : 'yarn.lock'
    console.log(
      `Can be optimized from ${dependenciesCount} to ${optimizedCount} dependencies (${lockfileTypeName})`,
    )
    // list all dependencies that can be optimized
    for (const [name, info] of Object.entries(parsed.dependencies)) {
      const versions = Object.keys(info.versions)
      const optimisedVersions = Object.keys(info.optimisedVersions || {})
      if (versions.length !== optimisedVersions.length) {
        const colored = versions.map(
          (v) =>
            optimisedVersions.includes(v)
              ? `\x1b[32m${v}\x1b[0m` // green
              : `\x1b[31m${v}\x1b[0m`, // red
        )
        console.log(`${name}: ${colored.join(', ')}`)
      }
    }
    process.exit(1)
  }
}
