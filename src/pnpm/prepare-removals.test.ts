import assert from 'node:assert'
import { describe, it } from 'node:test'
import { parse as parseYAML } from 'yaml'

import { prepareRemovals } from './prepare-removals'

describe('prepareRemovals', () => {
  it('it removes the specified dependencies from the pnpm-lock.yaml source code', () => {
    const pnpmLockSource = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:
  .:
    dependencies:
      react:
        specifier: ^18.2.0
        version: 18.2.0
      react-legacy:
        specifier: ^7.1.2
        version: 7.1.3
      react-old:
        specifier: ^18.1.0
        version: 18.1.3
    devDependencies:
      '@types/react':
        specifier: ^18.2.15
        version: 18.2.79

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

snapshots:
  '@types/react@18.2.79': {}
  react@7.1.3: {}
  react@18.1.3: {}
  react@18.2.0: {}
`

    const removals = {
      react: ['18.2.0'],
    }

    const newSource = prepareRemovals(pnpmLockSource, removals)
    const parsed = parseYAML(newSource) as any

    // Check that react@18.2.0 was removed from packages
    assert.equal(parsed.packages['react@18.2.0'], undefined)
    assert.notEqual(parsed.packages['react@18.1.3'], undefined)
    assert.notEqual(parsed.packages['react@7.1.3'], undefined)
    assert.notEqual(parsed.packages['@types/react@18.2.79'], undefined)

    // Check that react@18.2.0 was removed from snapshots
    assert.equal(parsed.snapshots['react@18.2.0'], undefined)
    assert.notEqual(parsed.snapshots['react@18.1.3'], undefined)
    assert.notEqual(parsed.snapshots['react@7.1.3'], undefined)
    assert.notEqual(parsed.snapshots['@types/react@18.2.79'], undefined)

    // Check that importers remain unchanged
    assert.notEqual(parsed.importers['.'].dependencies.react, undefined)
    assert.notEqual(
      parsed.importers['.'].devDependencies['@types/react'],
      undefined,
    )
  })

  it('it removes multiple versions of a dependency', () => {
    const pnpmLockSource = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      react:
        specifier: ^18.2.0
        version: 18.2.0

packages:
  react@7.1.3:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fG7==}

  react@18.1.3:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGV==}

  react@18.2.0:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==}

snapshots:
  react@7.1.3: {}
  react@18.1.3: {}
  react@18.2.0: {}
`

    const removals = {
      react: ['18.2.0', '7.1.3'],
    }

    const newSource = prepareRemovals(pnpmLockSource, removals)
    const parsed = parseYAML(newSource) as any

    // Check that both versions were removed
    assert.equal(parsed.packages['react@18.2.0'], undefined)
    assert.equal(parsed.packages['react@7.1.3'], undefined)
    assert.notEqual(parsed.packages['react@18.1.3'], undefined)

    // Check snapshots
    assert.equal(parsed.snapshots['react@18.2.0'], undefined)
    assert.equal(parsed.snapshots['react@7.1.3'], undefined)
    assert.notEqual(parsed.snapshots['react@18.1.3'], undefined)
  })

  it('it handles scoped packages correctly', () => {
    const pnpmLockSource = `lockfileVersion: '9.0'

importers:
  .:
    devDependencies:
      '@types/react':
        specifier: ^18.2.15
        version: 18.2.79

packages:
  '@types/react@18.2.70':
    resolution: {integrity: sha512-old==}

  '@types/react@18.2.79':
    resolution: {integrity: sha512-RwGAGXPl9kSXwdNTafkOEuFrTBD5SA2B3iEB96xi8+xu5ddUa/cpvyVCSNn+asgLCTHkb5ZxN8gbuibYJi4s1w==}

snapshots:
  '@types/react@18.2.70': {}
  '@types/react@18.2.79': {}
`

    const removals = {
      '@types/react': ['18.2.70'],
    }

    const newSource = prepareRemovals(pnpmLockSource, removals)
    const parsed = parseYAML(newSource) as any

    // Check that old version was removed
    assert.equal(parsed.packages['@types/react@18.2.70'], undefined)
    assert.notEqual(parsed.packages['@types/react@18.2.79'], undefined)

    // Check snapshots
    assert.equal(parsed.snapshots['@types/react@18.2.70'], undefined)
    assert.notEqual(parsed.snapshots['@types/react@18.2.79'], undefined)
  })

  it('it handles semver example from this project', () => {
    const pnpmLockSource = `lockfileVersion: '9.0'

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

snapshots:
  semver@7.7.2: {}
  semver@7.7.3: {}
`

    const removals = {
      semver: ['7.7.2'],
    }

    const newSource = prepareRemovals(pnpmLockSource, removals)
    const parsed = parseYAML(newSource) as any

    // Check that 7.7.2 was removed
    assert.equal(parsed.packages['semver@7.7.2'], undefined)
    assert.notEqual(parsed.packages['semver@7.7.3'], undefined)

    // Check snapshots
    assert.equal(parsed.snapshots['semver@7.7.2'], undefined)
    assert.notEqual(parsed.snapshots['semver@7.7.3'], undefined)
  })

  it('it handles typescript versions from real world example', () => {
    const pnpmLockSource = `lockfileVersion: '9.0'

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
      typescript:
        specifier: ^5.9
        version: 5.9.2

packages:
  semver@7.7.2:
    resolution: {integrity: sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==}

  semver@7.7.3:
    resolution: {integrity: sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==}

  typescript@5.9.2:
    resolution: {integrity: sha512-CWBzXQrc/qOkhidw1OzBTQuYRbfyxDXJMVJ1XNwUHGROVmuaeiEm3OslpZ1RV96d7SKKjZKrSJu3+t/xlw3R9A==}
    engines: {node: '>=14.17'}
    hasBin: true

  typescript@5.9.3:
    resolution: {integrity: sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==}
    engines: {node: '>=14.17'}
    hasBin: true

snapshots:
  semver@7.7.2: {}

  semver@7.7.3: {}

  typescript@5.9.2: {}

  typescript@5.9.3: {}
`

    const removals = {
      semver: ['7.7.2'],
      typescript: ['5.9.2'],
    }

    const optimisedVersions = {
      semver: {
        '7.7.3': ['^7.7.2', '^7.7.3'],
      },
      typescript: {
        '5.9.3': ['^5.9'],
      },
    }

    const newSource = prepareRemovals(
      pnpmLockSource,
      removals,
      optimisedVersions,
    )
    const parsed = parseYAML(newSource) as any

    // Check that 7.7.2 was removed
    assert.equal(parsed.packages['semver@7.7.2'], undefined)
    assert.notEqual(parsed.packages['semver@7.7.3'], undefined)

    // Check that typescript 5.9.2 was removed
    assert.equal(parsed.packages['typescript@5.9.2'], undefined)
    assert.notEqual(parsed.packages['typescript@5.9.3'], undefined)

    // Check snapshots
    assert.equal(parsed.snapshots['semver@7.7.2'], undefined)
    assert.notEqual(parsed.snapshots['semver@7.7.3'], undefined)
    assert.equal(parsed.snapshots['typescript@5.9.2'], undefined)
    assert.notEqual(parsed.snapshots['typescript@5.9.3'], undefined)

    // Verify the original pointers were updated
    assert.equal(parsed.importers['.'].dependencies.semver.version, '7.7.3')
    assert.equal(
      parsed.importers['packages/yarn'].dependencies.semver.version,
      '7.7.3',
    )
    assert.equal(
      parsed.importers['packages/yarn'].dependencies.typescript.version,
      '5.9.3',
    )
  })
})
