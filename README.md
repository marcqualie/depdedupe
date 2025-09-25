# depdedupe - Dependency Deduplication Tool

A tool to optimize package manager lock files by combining compatible dependencies.


## Usage

The CLI supports flexible argument patterns:

```bash
# Use check command with ./yarn.lock (default)
depdedupe

# Use check command with specified path
depdedupe /path/to/yarn.lock

# Use specified command with ./yarn.lock
depdedupe check
depdedupe optimise

# Use specified command with specified path
depdedupe check /path/to/yarn.lock
depdedupe optimise /path/to/yarn.lock
```
