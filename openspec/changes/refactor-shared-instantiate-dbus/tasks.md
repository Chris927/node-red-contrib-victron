## 1. Shared Function Implementation

- [x] 1.1 Create `instantiateDbus()` function in `victron-virtual-dbus-helpers.js` with options parameter
- [x] 1.2 Add JSDoc documentation for the new function
- [x] 1.3 Export the new function from the module

## 2. Update victron-virtual-switch.js

- [x] 2.1 Import `instantiateDbus` from helpers module
- [x] 2.2 Create service name generator function for switch (`com.victronenergy.switch.virtual_${dbusId}`)
- [x] 2.3 Create callback handlers (onConnect, onEnd, onError) matching current behavior
- [x] 2.4 Replace inline `instantiateDbus()` function with call to shared function
- [x] 2.5 Verify the file still works (syntax check)

## 3. Update victron-virtual-indicator.js

- [x] 3.1 Import `instantiateDbus` from helpers module
- [x] 3.2 Create service name generator function for indicator (`com.victronenergy.switch.vindic_${dbusId}`)
- [x] 3.3 Create callback handlers matching current behavior (including error event handler)
- [x] 3.4 Replace inline `instantiateDbus()` function with call to shared function
- [x] 3.5 Remove the module-level `createClientCallback` if no longer needed
- [x] 3.6 Verify the file still works (syntax check)

## 4. Update victron-virtual/index.js

- [x] 4.1 Import `instantiateDbus` from helpers module
- [x] 4.2 Create service name generator function using dynamic device type
- [x] 4.3 Create callback handlers matching current behavior
- [x] 4.4 Replace inline `instantiateDbus()` function with call to shared function
- [x] 4.5 Remove the inline `callAddSettingsWithRetry` if it's a duplicate of the helper
- [x] 4.6 Verify the file still works (syntax check)

## 5. Testing and Validation

- [x] 5.1 Run existing tests to ensure no regressions
- [x] 5.2 Manually verify each node type can still connect to DBus
- [x] 5.3 Check debug logging output matches previous behavior
- [x] 5.4 Verify error handling works correctly in all three cases

## 6. Cleanup

- [x] 6.1 Review all changes for consistency
- [x] 6.2 Remove any dead code or unused imports
- [x] 6.3 Ensure code style matches project conventions
