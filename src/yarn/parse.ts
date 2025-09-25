import { optimiseVersions } from './optimise'

/** Resolved version - 1.2.3 */
type Version = string

/** Version or range to be resolved - ^1.2.3 */
type TargetVersion = string

/**
 * A map of versions where the resolved version is the key and the values
 * are all target versions that are compatible
 */
export type VersionMap = Record<Version, TargetVersion[]>

interface Dependency {
  versions: VersionMap
  optimisedVersions?: VersionMap
}

/**
 * Dependencies grouped by name and version
 *
 * @example
 * ```
 * {
 *   dependencies: {
 *     react: {
 *       versions: {
 *        '16.13.1': ['^16.13.1', '^16.1.0'],
 *        '18.2.0': ['18.2.0'],
 *        '18.2.1': ['^18.2.1'],
 *       },
 *       optimisedVersions: {
 *        '16.13.1': ['^16.1.0', '^16.13.1'],
 *        '18.2.1': ['^18.2.0', '^18.2.1'],
 *       }
 *     }
 *   }
 * ```
 */
export interface ParsedYarnLock {
  dependencies: Record<string, Dependency>
}

interface ParsedNativeDependency {
  version: string
  resolved: string
  integrity?: string
  dependencies?: { [dependencyName: string]: string }
}

/**
 * Native format used by Yarn parser.
 * https://github.com/yarnpkg/yarn/tree/master/packages/lockfile
 */
interface ParsedNativeLockfile {
  type: string
  object: { [dependencyName: string]: ParsedNativeDependency }
}

/**
 * Mimic the native parsing of the yarn.lock file.
 * The official library has not been updated in 6+ years and requires Buffer which is not available.
 */
export const nativeParse = (content: string): ParsedNativeLockfile => {
  const blocks = content.split('\n\n')
  const dependencies: { [name: string]: ParsedNativeDependency } = {}
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue
    const definitions = lines[0]
      .split(',')
      .map((definition) => definition.trim().replace(/"|:/g, ''))
    const version = lines[1]?.match(/version "(.+)"/)?.[1]
    const resolved = lines[2]?.match(/resolved "(.+)"/)?.[1]
    if (!version || !resolved) continue

    for (const definition of definitions) {
      if (!definition) continue
      dependencies[definition] = {
        version,
        resolved,
      }
    }
  }
  return {
    type: 'success',
    object: dependencies,
  }
}

/**
 * Parse yarn.lock file to get all dependency versions and group them.
 */
export const parseYarnLockContent = (
  content: string,
  options: { optimise: boolean } = { optimise: false },
): ParsedYarnLock => {
  const dependencies: { [name: string]: Dependency } = {}
  const nativeParsed = nativeParse(content)

  for (const [dependencyDefinition, dependencyConfig] of Object.entries(
    nativeParsed['object'],
  )) {
    const pattern = /^(@?.+)@(.+)$/

    const [, dependencyName, targetVersion] =
      dependencyDefinition.match(pattern) || []

    if (!dependencies[dependencyName]) {
      dependencies[dependencyName] = { versions: {} }
    }
    if (!dependencies[dependencyName].versions[dependencyConfig.version]) {
      dependencies[dependencyName].versions[dependencyConfig.version] = []
    }

    // Ensure version definitions are sorted
    dependencies[dependencyName].versions[dependencyConfig.version] = [
      ...dependencies[dependencyName].versions[dependencyConfig.version],
      targetVersion,
    ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    // Ensure resolved version keys are sorted
    dependencies[dependencyName].versions = Object.fromEntries(
      Object.entries(dependencies[dependencyName].versions).sort((a, b) =>
        a[0].localeCompare(b[0], undefined, { numeric: true }),
      ),
    )
  }

  if (options.optimise) {
    for (const [dependency, config] of Object.entries(dependencies)) {
      dependencies[dependency].optimisedVersions = optimiseVersions(
        config.versions,
      )
    }
  }

  return {
    dependencies,
  }
}
