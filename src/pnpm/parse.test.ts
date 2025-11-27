import assert from 'node:assert'
import { it } from 'node:test'

import { parsePnpmLockContent } from './parse'

it('it handles simple dependencies with no duplicates', () => {
  const result = parsePnpmLockContent(`
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:
  .:
    dependencies:
      react:
        specifier: ^18.2.0
        version: 18.2.0
    devDependencies:
      '@types/react':
        specifier: ^18.2.15
        version: 18.2.79

packages:
  '@types/react@18.2.79':
    resolution: {integrity: sha512-RwGAGXPl9kSXwdNTafkOEuFrTBD5SA2B3iEB96xi8+xu5ddUa/cpvyVCSNn+asgLCTHkb5ZxN8gbuibYJi4s1w==}

  react@18.2.0:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==}
    engines: {node: '>=0.10.0'}
`)

  assert.equal(Object.keys(result.dependencies).length, 2)
  assert.deepEqual(result.dependencies['@types/react'], {
    versions: {
      '18.2.79': ['^18.2.15'],
    },
  })
  assert.deepEqual(result.dependencies.react, {
    versions: {
      '18.2.0': ['^18.2.0'],
    },
  })
})

it('it handles multiple versions of the same dependency', () => {
  const result = parsePnpmLockContent(`
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:
  .:
    dependencies:
      react:
        specifier: ^18.2.0
        version: 18.2.0
    devDependencies:
      '@types/react':
        specifier: ^18.2.15
        version: 18.2.79

  packages/legacy:
    dependencies:
      react:
        specifier: ^7.1.2
        version: 7.1.3

  packages/old:
    dependencies:
      react:
        specifier: ^18.1.0
        version: 18.1.3

  packages/old2:
    dependencies:
      react:
        specifier: ^18.1.2
        version: 18.1.3

  packages/old3:
    dependencies:
      react:
        specifier: ^18.1.3
        version: 18.1.3

packages:
  '@types/react@18.2.79':
    resolution: {integrity: sha512-RwGAGXPl9kSXwdNTafkOEuFrTBD5SA2B3iEB96xi8+xu5ddUa/cpvyVCSNn+asgLCTHkb5ZxN8gbuibYJi4s1w==}

  react@7.1.3:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fG7==}
    engines: {node: '>=0.10.0'}

  react@18.1.3:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGV==}
    engines: {node: '>=0.10.0'}

  react@18.2.0:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==}
    engines: {node: '>=0.10.0'}
`)

  assert.equal(Object.keys(result.dependencies).length, 2)
  assert.deepEqual(result.dependencies['@types/react'], {
    versions: {
      '18.2.79': ['^18.2.15'],
    },
  })
  assert.deepEqual(Object.keys(result.dependencies.react.versions), [
    '7.1.3',
    '18.1.3',
    '18.2.0',
  ])
  assert.deepEqual(result.dependencies.react, {
    versions: {
      '7.1.3': ['^7.1.2'],
      '18.1.3': ['^18.1.0', '^18.1.2', '^18.1.3'],
      '18.2.0': ['^18.2.0'],
    },
  })
})

it('it handles workspace dependencies (skips link: versions)', () => {
  const result = parsePnpmLockContent(`
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      '@depdedupe/cli':
        specifier: workspace:*
        version: link:packages/cli
      '@depdedupe/yarn':
        specifier: workspace:*
        version: link:packages/yarn

  packages/cli:
    dependencies:
      semver:
        specifier: ^7.7.3
        version: 7.7.3

packages:
  semver@7.7.3:
    resolution: {integrity: sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==}
    engines: {node: '>=10'}
    hasBin: true
`)

  assert.equal(Object.keys(result.dependencies).length, 1)
  assert.deepEqual(result.dependencies.semver, {
    versions: {
      '7.7.3': ['^7.7.3'],
    },
  })
  // Workspace dependencies should not be included
  assert.equal(result.dependencies['@depdedupe/cli'], undefined)
  assert.equal(result.dependencies['@depdedupe/yarn'], undefined)
})

it('it handles multiple importers (monorepo)', () => {
  const result = parsePnpmLockContent(`
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      semver:
        specifier: ^7.7.3
        version: 7.7.3

  packages/yarn:
    dependencies:
      semver:
        specifier: ^7.7.2
        version: 7.7.2

packages:
  semver@7.7.2:
    resolution: {integrity: sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==}
    engines: {node: '>=10'}
    hasBin: true

  semver@7.7.3:
    resolution: {integrity: sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==}
    engines: {node: '>=10'}
    hasBin: true
`)

  assert.equal(Object.keys(result.dependencies).length, 1)
  assert.deepEqual(result.dependencies.semver, {
    versions: {
      '7.7.2': ['^7.7.2'],
      '7.7.3': ['^7.7.3'],
    },
  })
})

it('it applies optimization when requested', () => {
  const result = parsePnpmLockContent(
    `
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      semver:
        specifier: ^7.7.3
        version: 7.7.3

  packages/yarn:
    dependencies:
      semver:
        specifier: ^7.7.2
        version: 7.7.2

packages:
  semver@7.7.2:
    resolution: {integrity: sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==}

  semver@7.7.3:
    resolution: {integrity: sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==}
`,
    { optimise: true },
  )

  assert.equal(Object.keys(result.dependencies).length, 1)
  assert.deepEqual(result.dependencies.semver, {
    versions: {
      '7.7.2': ['^7.7.2'],
      '7.7.3': ['^7.7.3'],
    },
    optimisedVersions: {
      '7.7.3': ['^7.7.2', '^7.7.3'],
    },
  })
})
