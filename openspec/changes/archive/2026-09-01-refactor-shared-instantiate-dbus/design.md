## Context

See proposal.md for motivation. The three files with duplicate `instantiateDbus()` functions are:
- `src/nodes/victron-virtual-switch.js` (line 127)
- `src/nodes/victron-virtual-indicator.js` (line 106)
- `src/nodes/victron-virtual/index.js` (line 376)

All three files already import from `victron-virtual-dbus-helpers.js`, making it the natural location for the shared function.

## Goals / Non-Goals

**Goals:**
- Eliminate code duplication across the three files
- Maintain identical behavior in all three use cases
- Make future changes to DBus connection logic in one place
- Keep the refactoring safe and testable

**Non-Goals:**
- Change any external behavior or APIs
- Modify the DBus connection logic itself
- Add new features or functionality

## Decisions

### 1. Location of Shared Function
**Decision:** Add `instantiateDbus()` to `victron-virtual-dbus-helpers.js`
**Rationale:** All three files already import from this module, so no new dependencies are needed. This module is specifically designed for DBus helper functions.
**Alternatives considered:**
- Create a new module - would add unnecessary complexity
- Add to one of the existing files and import from there - would create circular dependencies

### 2. Function Signature
**Decision:** Use a parameterized approach with options object:
```javascript
function instantiateDbus(self, options)
```
Where `options` includes:
- `getServiceName`: Function that returns the D-Bus service name (string)
- `onConnect`: Callback for connection established
- `onEnd`: Callback for connection ended
- `onError`: Callback for connection error
- `debug`: Debug function for logging
- `node`: Node reference for status/warn calls

**Rationale:** This approach allows each caller to customize the behavior without modifying the core logic. The service name generation differs across files (switch uses `virtual_`, indicator uses `vindic_`, index uses dynamic device type).

**Alternatives considered:**
- Pass all parameters individually - would result in too many parameters
- Use a class-based approach - overkill for this use case
- Clone one implementation and adapt others - would still leave duplication

### 3. Handling Callbacks
**Decision:** Accept callbacks as options that default to no-op functions
**Rationale:** The existing implementations have different logging and status update patterns. By accepting callbacks, each file can provide its own handlers while the shared function manages the core DBus connection logic.

### 4. Error Handling Strategy
**Decision:** Preserve existing error handling behavior per-file
**Rationale:** While the error handling is similar, there are subtle differences in logging messages and status updates. The shared function will handle the core DBus connection errors, but each caller can provide custom callbacks for their specific needs.

## Risks / Trade-offs

**[Risk] Breaking existing functionality** → Mitigation: This is a pure refactor. The shared function will be tested to ensure it produces identical behavior to the three existing implementations. Each file's specific behavior (service names, callbacks) will be preserved through the options parameter.

**[Risk] Callbacks may diverge over time** → Mitigation: The shared function will be well-documented, and any future changes to callback behavior should be made in the shared location first.

**[Risk] Debugging complexity** → Mitigation: The shared function will include comprehensive debug logging, and each caller can pass their own debug function to maintain existing logging patterns.

## Open Questions

None - the approach is clear and all decisions have been made.
