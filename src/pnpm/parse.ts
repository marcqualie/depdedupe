import { parse as parseYAML } from 'yaml'
import { optimiseVersions } from '../yarn/optimise'

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
export interface ParsedPnpmLock {
  dependencies: Record<string, Dependency>
}

interface PnpmDependencyEntry {
  specifier: string
  version: string
}

interface PnpmImporter {
  dependencies?: Record<string, PnpmDependencyEntry>
  devDependencies?: Record<string, PnpmDependencyEntry>
  optionalDependencies?: Record<string, PnpmDependencyEntry>
}

interface PnpmLockfile {
  lockfileVersion?: string
  importers?: Record<string, PnpmImporter>
  packages?: Record<string, unknown>
}

/**
 * Parse pnpm-lock.yaml file to get all dependency versions and group them.
 */
export const parsePnpmLockContent = (
  content: string,
  options: { optimise: boolean } = { optimise: false },
): ParsedPnpmLock => {
  const dependencies: { [name: string]: Dependency } = {}
  const lockfile = parseYAML(content) as PnpmLockfile

  if (!lockfile.importers) {
    return { dependencies }
  }

  // Iterate through all importers (workspace packages)
  for (const [_importerPath, importer] of Object.entries(lockfile.importers)) {
    // Process all dependency types
    const depTypes = [
      importer.dependencies,
      importer.devDependencies,
      importer.optionalDependencies,
    ]

    for (const deps of depTypes) {
      if (!deps) continue

      for (const [packageName, depEntry] of Object.entries(deps)) {
        const { specifier, version } = depEntry

        // Skip workspace dependencies (link:...)
        if (version.startsWith('link:')) {
          continue
        }

        // Extract the actual resolved version from the version field
        // In pnpm, version can be:
        // - Simple version: "7.7.3"
        // - Version with peer deps: "18.2.0(react@18.2.0)"
        // - Patched version: "7.7.3(patch_hash)"
        const resolvedVersion = extractResolvedVersion(version)

        if (!dependencies[packageName]) {
          dependencies[packageName] = { versions: {} }
        }
        if (!dependencies[packageName].versions[resolvedVersion]) {
          dependencies[packageName].versions[resolvedVersion] = []
        }

        // Add the specifier if not already present
        if (
          !dependencies[packageName].versions[resolvedVersion].includes(
            specifier,
          )
        ) {
          dependencies[packageName].versions[resolvedVersion].push(specifier)
        }

        // Ensure version definitions are sorted
        dependencies[packageName].versions[resolvedVersion] = dependencies[
          packageName
        ].versions[resolvedVersion].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        )

        // Ensure resolved version keys are sorted
        dependencies[packageName].versions = Object.fromEntries(
          Object.entries(dependencies[packageName].versions).sort((a, b) =>
            a[0].localeCompare(b[0], undefined, { numeric: true }),
          ),
        )
      }
    }
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

/**
 * Extract the resolved version from pnpm's version field
 * Examples:
 * - "7.7.3" -> "7.7.3"
 * - "18.2.0(react@18.2.0)" -> "18.2.0"
 * - "7.7.3(patch_hash)" -> "7.7.3"
 */
const extractResolvedVersion = (version: string): string => {
  const match = version.match(/^([^(]+)/)
  return match ? match[1] : version
}
