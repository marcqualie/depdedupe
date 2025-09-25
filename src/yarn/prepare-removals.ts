/**
 * Remove the dependencies from the yarn.lock source code and return the new copy.
 */
export const prepareRemovals = (
  source: string,
  removals: Record<string, string[]>,
) => {
  const newBlocks = [] as string[]

  const blocks = source.split('\n\n')
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) {
      newBlocks.push(block)
      continue
    }
    const definitions = lines[0]
      .split(',')
      .map((definition) => definition.trim().replace(/"|:/g, ''))
    const version = lines[1]?.match(/version "(.+)"/)?.[1]
    const resolved = lines[2]?.match(/resolved "(.+)"/)?.[1]
    const pattern = /^(@?.+)@(.+)$/
    if (!version || !resolved || definitions.length === 0) {
      newBlocks.push(block)
      continue
    }

    const [, dependencyName, _targetVersion] =
      definitions[0].match(pattern) || []
    const shouldBeRemoved = removals[dependencyName]?.includes(version)

    if (!shouldBeRemoved) {
      newBlocks.push(block)
    }
  }

  return newBlocks.join('\n\n')
}
