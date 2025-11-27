# PNPM Test Examples

This document contains test data examples for pnpm-lock.yaml parsing and optimization tests.
These mirror the yarn test cases using the same packages: react, @types/react, and semver.

## Test 1: Simple Dependencies with No Duplicates

**Scenario**: Single version of each package, no optimization needed

```yaml
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
    dependencies:
      '@types/prop-types': 15.7.12
      csstype: 3.1.3

  '@types/prop-types@15.7.12':
    resolution: {integrity: sha512-5zvhXYtRNRluoE/jAp4GVsSduVUzNWKkOZrCDBWYtE7biZywwdC2AcEzg+cSMLFRfVgeAFqpfNabiPjxFddV1Q==}

  csstype@3.1.3:
    resolution: {integrity: sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==}

  react@18.2.0:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==}
    engines: {node: '>=0.10.0'}
    dependencies:
      loose-envify: 1.4.0

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko7Fu4ySY3TB4fGI/a2nzO+ACt3YL8EZhfTQZA==}
    hasBin: true
    dependencies:
      js-tokens: 4.0.0

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

snapshots:
  '@types/prop-types@15.7.12': {}
  '@types/react@18.2.79':
    dependencies:
      '@types/prop-types': 15.7.12
      csstype: 3.1.3
  csstype@3.1.3: {}
  js-tokens@4.0.0: {}
  loose-envify@1.4.0:
    dependencies:
      js-tokens: 4.0.0
  react@18.2.0:
    dependencies:
      loose-envify: 1.4.0
```

**Expected Parsed Output**:
```typescript
{
  dependencies: {
    '@types/react': {
      versions: {
        '18.2.79': ['^18.2.15']
      }
    },
    react: {
      versions: {
        '18.2.0': ['^18.2.0']
      }
    }
  }
}
```

**Optimization Result**: No changes (already optimal)

---

## Test 2: Multiple Versions of Same Dependency

**Scenario**: Multiple versions of react that can be consolidated

```yaml
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
      react-dom:
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
    dependencies:
      loose-envify: 1.4.0

  react@18.2.0:
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==}
    engines: {node: '>=0.10.0'}
    dependencies:
      loose-envify: 1.4.0

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko7Fu4ySY3TB4fGI/a2nzO+ACt3YL8EZhfTQZA==}
    hasBin: true

snapshots:
  '@types/react@18.2.79': {}
  loose-envify@1.4.0: {}
  react@7.1.3: {}
  react@18.1.3:
    dependencies:
      loose-envify: 1.4.0
  react@18.2.0:
    dependencies:
      loose-envify: 1.4.0
```

**Expected Parsed Output**:
```typescript
{
  dependencies: {
    '@types/react': {
      versions: {
        '18.2.79': ['^18.2.15']
      }
    },
    react: {
      versions: {
        '7.1.3': ['^7.1.2'],
        '18.1.3': ['^18.1.0'],
        '18.2.0': ['^18.2.0']
      }
    }
  }
}
```

**Optimization Result**:
```typescript
{
  dependencies: {
    '@types/react': {
      versions: {
        '18.2.79': ['^18.2.15']
      },
      optimisedVersions: {
        '18.2.79': ['^18.2.15']
      }
    },
    react: {
      versions: {
        '7.1.3': ['^7.1.2'],
        '18.1.3': ['^18.1.0'],
        '18.2.0': ['^18.2.0']
      },
      optimisedVersions: {
        '7.1.3': ['^7.1.2'],
        '18.2.0': ['^18.1.0', '^18.2.0']  // 18.1.3 can be removed, ^18.1.0 can use 18.2.0
      }
    }
  }
}
```

**Versions to Remove**: `react@18.1.3`

---

## Test 3: Real-world Semver Example (From This Project)

**Scenario**: Two semver versions where ^7.7.2 can use 7.7.3

```yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

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

snapshots:
  semver@7.7.2: {}
  semver@7.7.3: {}
```

**Expected Parsed Output**:
```typescript
{
  dependencies: {
    semver: {
      versions: {
        '7.7.2': ['^7.7.2'],
        '7.7.3': ['^7.7.3']
      }
    }
  }
}
```

**Optimization Result**:
```typescript
{
  dependencies: {
    semver: {
      versions: {
        '7.7.2': ['^7.7.2'],
        '7.7.3': ['^7.7.3']
      },
      optimisedVersions: {
        '7.7.3': ['^7.7.2', '^7.7.3']  // Both can use 7.7.3
      }
    }
  }
}
```

**Versions to Remove**: `semver@7.7.2`

**Updated importers after optimization**:
```yaml
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
        version: 7.7.3  # Updated from 7.7.2
```

---

## Test 4: Workspace Dependencies (Should be Ignored)

**Scenario**: Workspace links should not be optimized

```yaml
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

snapshots:
  semver@7.7.3: {}
```

**Expected Parsed Output**:
```typescript
{
  dependencies: {
    semver: {
      versions: {
        '7.7.3': ['^7.7.3']
      }
    }
    // Workspace dependencies are not included
  }
}
```

---

## Test 5: Exact Versions (Should Not Be Optimized)

**Scenario**: Exact version specifiers should not be combined with caret ranges

```yaml
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      react:
        specifier: 18.2.0
        version: 18.2.0
      react-exact:
        specifier: 18.1.3
        version: 18.1.3

packages:
  react@18.1.3:
    resolution: {integrity: sha512-...}

  react@18.2.0:
    resolution: {integrity: sha512-...}

snapshots:
  react@18.1.3: {}
  react@18.2.0: {}
```

**Expected Parsed Output**:
```typescript
{
  dependencies: {
    react: {
      versions: {
        '18.1.3': ['18.1.3'],
        '18.2.0': ['18.2.0']
      }
    }
  }
}
```

**Optimization Result**: No changes (exact versions should remain separate)

---

## Implementation Notes

### Parsing Strategy

1. **Parse importers section**:
   - Iterate through all importers (`.`, workspace packages)
   - For each dependency, extract `specifier` and `version`
   - Skip `link:` versions (workspace dependencies)
   - Build mapping: `packageName → { resolvedVersion: [specifiers] }`

2. **Validate against packages section**:
   - Ensure referenced versions exist in packages section
   - Extract package metadata if needed

3. **Build VersionMap**:
   - Group by package name
   - Create version → specifiers mapping
   - Sort versions and specifiers for consistency

### Removal Strategy

1. **Parse YAML**
2. **Update importers**:
   - Change version references from old to new
   - Example: `semver@7.7.2` → `semver@7.7.3`
3. **Remove from packages section**:
   - Delete entries like `semver@7.7.2`
4. **Remove from snapshots section**:
   - Delete corresponding snapshot entries
5. **Serialize back to YAML**

### Edge Cases to Handle

- Peer dependencies encoded in package keys (e.g., `package@1.0.0(peer@2.0.0)`)
- Optional dependencies
- Bundled dependencies
- Different lockfile versions (9.0, 6.0, etc.)
- Monorepo with multiple importers
- Transitive dependencies only in packages (not in importers)
