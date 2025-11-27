import { parse as parseYAML, stringify as stringifyYAML } from 'yaml'

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
 */
export const prepareRemovals = (
  source: string,
  removals: Record<string, string[]>,
  optimisedVersions?: Record<string, Record<string, string[]>>,
): string => {
  const lockfile = parseYAML(source) as PnpmLockfile

  if (!lockfile.packages) {
    return source
  }

  // Create a new packages object without the removed entries
  const newPackages: Record<string, unknown> = {}
  for (const [packageKey, packageValue] of Object.entries(lockfile.packages)) {
    // Parse package key: "packageName@version" or "@scope/package@version"
    const { name, version } = parsePackageKey(packageKey)

    const shouldRemove =
      name && version && removals[name]?.includes(version)

    if (!shouldRemove) {
      newPackages[packageKey] = packageValue
    }
  }

  lockfile.packages = newPackages

  // Also remove from snapshots if present
  if (lockfile.snapshots) {
    const newSnapshots: Record<string, unknown> = {}
    for (const [snapshotKey, snapshotValue] of Object.entries(
      lockfile.snapshots,
    )) {
      const { name, version } = parsePackageKey(snapshotKey)

      const shouldRemove =
        name && version && removals[name]?.includes(version)

      if (!shouldRemove) {
        newSnapshots[snapshotKey] = snapshotValue
      }
    }
    lockfile.snapshots = newSnapshots
  }

  // Update importers to point to optimised versions
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
            // Find the optimised version for this specifier
            const optimised = optimisedVersions[packageName]
            if (optimised) {
              const newVersion = findOptimisedVersion(specifier, optimised)
              if (newVersion) {
                // Preserve peer dependency notation if present
                if (currentVersion.includes('(')) {
                  const peerPart = currentVersion.match(/(\(.+\))$/)?.[1]
                  depEntry.version = peerPart
                    ? `${newVersion}${peerPart}`
                    : newVersion
                } else {
                  depEntry.version = newVersion
                }
              }
            }
          }
        }
      }
    }
  }

  return stringifyYAML(lockfile)
}

/**
 * Parse a pnpm package key into name and version
 * Examples:
 * - "semver@7.7.3" -> { name: "semver", version: "7.7.3" }
 * - "@types/react@18.2.79" -> { name: "@types/react", version: "18.2.79" }
 * - "react@18.2.0(react-dom@18.2.0)" -> { name: "react", version: "18.2.0" }
 */
const parsePackageKey = (
  packageKey: string,
): { name: string | null; version: string | null } => {
  // Handle scoped packages
  if (packageKey.startsWith('@')) {
    // Match @scope/package@version or @scope/package@version(...)
    const match = packageKey.match(/^(@[^/]+\/[^@]+)@([^(]+)/)
    if (match) {
      return { name: match[1], version: match[2] }
    }
  } else {
    // Match package@version or package@version(...)
    const match = packageKey.match(/^([^@]+)@([^(]+)/)
    if (match) {
      return { name: match[1], version: match[2] }
    }
  }

  return { name: null, version: null }
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
