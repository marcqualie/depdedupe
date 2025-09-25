import { satisfies } from 'semver'

export const optimiseVersions = (
  originalVersionMap: Record<string, string[]>,
): Record<string, string[]> => {
  // const originalVersionMap = dependencies[dependency].versions
  const versionKeys = Object.keys(originalVersionMap)
  const targetKeys = Object.values(originalVersionMap).flat()
  const versions = {} as typeof originalVersionMap

  for (const target of targetKeys) {
    const highestVersion = highestVersionCompatible(target, versionKeys)
    if (!versions[highestVersion]) {
      versions[highestVersion] = []
    }
    versions[highestVersion].push(target)
  }

  return versions
}

export const highestVersionCompatible = (
  target: string,
  versions: string[],
) => {
  const [_targetMajor, _targetMinor, _targetPatch] = target
    .replace('^', '')
    .split('.')
    .map(Number)
  let highestVersion = '0.0.0'

  for (const version of versions) {
    const [_major, _minor, _patch] = version.split('.').map(Number)
    const compatible = satisfies(version, target)
    // const compatible = areVersionsCompatible(version, target)
    if (compatible) {
      highestVersion = version
    }
  }

  // Fallback for when checks fail
  if (highestVersion === '0.0.0') {
    return versions[versions.length - 1]
  }

  return highestVersion
}

/**
 *
 * @param version The installed version of the package
 * @param target The version (or range) that aims to match the version
 * @returns boolean
 */
export const areVersionsCompatible = (
  version: string,
  target: string,
): boolean => {
  // If versions are fixed and do not match, abort
  if (target.indexOf('^') === -1 && version === target) return true
  if (target === '*') return true

  const [versionMajor, versionMinor, _versionPatch] = version
    .replace('^', '')
    .split('.')
    .map(Number)

  const [targetMajor, targetMinor, _targetPatch] = target
    .replace('^', '')
    .split('.')
    .map(Number)

  if (target.indexOf('^') === 0) {
    if (versionMajor === 0) {
      return versionMinor === targetMinor
    }
    return versionMajor === targetMajor && versionMinor >= targetMinor
  }

  return false
}
