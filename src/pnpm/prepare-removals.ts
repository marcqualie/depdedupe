import { parse as parseYAML } from 'yaml'

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
  settings?: Record<string, unknown>
  importers?: Record<string, PnpmImporter>
  packages?: Record<string, unknown>
  snapshots?: Record<string, unknown>
}

/**
 * Remove the dependencies from the pnpm-lock.yaml source code and return the new copy.
 * This involves:
 * 1. Removing entries from the packages section
 * 2. Removing entries from the snapshots section
 * 3. Updating importers to point to the optimised versions
 *
 * This implementation uses string manipulation to preserve exact formatting.
 */
export const prepareRemovals = (
  source: string,
  removals: Record<string, string[]>,
  optimisedVersions?: Record<string, Record<string, string[]>>,
): string => {
  // Parse YAML only to understand what needs to be changed
  const lockfile = parseYAML(source) as PnpmLockfile

  let result = source

  // Step 1: Build a map of version updates for importers
  const versionUpdates: Record<string, string> = {}
  if (lockfile.importers && optimisedVersions) {
    for (const importer of Object.values(lockfile.importers)) {
      const depTypes = [
        importer.dependencies,
        importer.devDependencies,
        importer.optionalDependencies,
      ]

      for (const deps of depTypes) {
        if (!deps) continue

        for (const [packageName, depEntry] of Object.entries(deps)) {
          const currentVersion = depEntry.version
          const { specifier } = depEntry

          // Skip workspace dependencies
          if (currentVersion.startsWith('link:')) continue

          // Extract version (handle peer deps like "18.2.0(react@18.2.0)")
          const extractedVersion = extractResolvedVersion(currentVersion)

          // Check if this version is being removed
          if (removals[packageName]?.includes(extractedVersion)) {
            const optimised = optimisedVersions[packageName]
            if (optimised) {
              const newVersion = findOptimisedVersion(specifier, optimised)
              if (newVersion && newVersion !== extractedVersion) {
                // Store the update: key is current version, value is new version
                versionUpdates[currentVersion] = currentVersion.includes('(')
                  ? currentVersion.replace(/^[^(]+/, newVersion)
                  : newVersion
              }
            }
          }
        }
      }
    }
  }

  // Step 2: Update version references in importers section
  for (const [oldVersion, newVersion] of Object.entries(versionUpdates)) {
    // Find and replace version lines in importers
    // Match pattern: "        version: 7.7.2" -> "        version: 7.7.3"
    const versionLineRegex = new RegExp(
      `^(\\s+version: )${escapeRegex(oldVersion)}$`,
      'gm',
    )
    result = result.replace(versionLineRegex, `$1${newVersion}`)
  }

  // Step 3: Remove package entries from packages and snapshots sections
  for (const [packageName, versions] of Object.entries(removals)) {
    for (const version of versions) {
      // Build the package key (e.g., "semver@7.7.2" or "@types/node@22.18.6")
      const packageKey = `${packageName}@${version}`

      // Remove from packages section
      result = removePackageBlock(result, packageKey)

      // Remove from snapshots section
      result = removePackageBlock(result, packageKey)
    }
  }

  return result
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

/**
 * Find the optimised version for a given specifier
 * @param specifier The version specifier (e.g., "^7.7.2")
 * @param optimised The optimised version map (e.g., { "7.7.3": ["^7.7.2", "^7.7.3"] })
 * @returns The optimised version that contains this specifier
 */
const findOptimisedVersion = (
  specifier: string,
  optimised: Record<string, string[]>,
): string | null => {
  for (const [version, specifiers] of Object.entries(optimised)) {
    if (specifiers.includes(specifier)) {
      return version
    }
  }
  return null
}

/**
 * Escape special regex characters in a string
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Remove a package block from the pnpm-lock.yaml source
 * A package block starts with "  packageKey:" and continues until the next package or end of section
 *
 * @param source The pnpm-lock.yaml source
 * @param packageKey The package key to remove (e.g., "semver@7.7.2" or "@types/react@18.2.70")
 * @returns The source with the package block removed
 */
const removePackageBlock = (source: string, packageKey: string): string => {
  // Escape special characters in package key for regex (including @ and /)
  const escapedKey = escapeRegex(packageKey)

  // Match the package block:
  // - Starts with "  packageKey:" (2 spaces + escaped key + colon)
  // - Captures all following lines that start with 4+ spaces (package properties)
  // - Captures ONE trailing blank line to avoid leaving double blank lines
  // - Stops at the next line that starts with 2 spaces (next package) or 0-1 spaces (new section)

  const blockRegex = new RegExp(
    `^  '?${escapedKey}'?:.*\\n(?:    .*\\n)*\\n?`,
    'gm',
  )

  return source.replace(blockRegex, '')
}
