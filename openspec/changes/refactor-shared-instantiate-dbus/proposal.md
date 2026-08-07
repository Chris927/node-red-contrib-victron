## Why

There are three duplicate `instantiateDbus()` functions across three files (victron-virtual-switch.js, victron-virtual-indicator.js, victron-virtual/index.js) that perform similar work but have diverged over time. This code duplication makes maintenance harder and increases the risk of inconsistencies.

## What Changes

- Create a shared `instantiateDbus()` function in `victron-virtual-dbus-helpers.js`
- Remove the three duplicate implementations from the respective files
- Update all three files to import and use the shared function
- The shared function will accept parameters for:
  - The node instance (`self`)
  - The service name generator (function that returns the D-Bus service name)
  - Custom callbacks for connection events
- Preserve all existing behavior - this is a pure refactor with no functional changes

## Capabilities

### New Capabilities

- `dbus-helpers/instantiate-dbus`: Shared DBus connection instantiation function

### Modified Capabilities

None - this is a pure refactor, no behavioral changes.

## Impact

- Files modified: `src/nodes/victron-virtual-dbus-helpers.js`, `src/nodes/victron-virtual-switch.js`, `src/nodes/victron-virtual-indicator.js`, `src/nodes/victron-virtual/index.js`
- No API changes
- No breaking changes
- All existing tests should continue to pass
