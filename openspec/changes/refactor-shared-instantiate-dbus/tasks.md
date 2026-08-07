## 1. Shared Function Implementation

- [ ] 1.1 Create `instantiateDbus()` function in `victron-virtual-dbus-helpers.js` with options parameter
- [ ] 1.2 Add JSDoc documentation for the new function
- [ ] 1.3 Export the new function from the module

## 2. Update victron-virtual-switch.js

- [ ] 2.1 Import `instantiateDbus` from helpers module
- [ ] 2.2 Create service name generator function for switch (`com.victronenergy.switch.virtual_${dbusId}`)
- [ ] 2.3 Create callback handlers (onConnect, onEnd, onError) matching current behavior
- [ ] 2.4 Replace inline `instantiateDbus()` function with call to shared function
- [ ] 2.5 Verify the file still works (syntax check)

## 3. Update victron-virtual-indicator.js

- [ ] 3.1 Import `instantiateDbus` from helpers module
- [ ] 3.2 Create service name generator function for indicator (`com.victronenergy.switch.vindic_${dbusId}`)
- [ ] 3.3 Create callback handlers matching current behavior (including error event handler)
- [ ] 3.4 Replace inline `instantiateDbus()` function with call to shared function
- [ ] 3.5 Remove the module-level `createClientCallback` if no longer needed
- [ ] 3.6 Verify the file still works (syntax check)

## 4. Update victron-virtual/index.js

- [ ] 4.1 Import `instantiateDbus` from helpers module
- [ ] 4.2 Create service name generator function using dynamic device type
- [ ] 4.3 Create callback handlers matching current behavior
- [ ] 4.4 Replace inline `instantiateDbus()` function with call to shared function
- [ ] 4.5 Remove the inline `callAddSettingsWithRetry` if it's a duplicate of the helper
- [ ] 4.6 Verify the file still works (syntax check)

## 5. Testing and Validation

- [ ] 5.1 Run existing tests to ensure no regressions
- [ ] 5.2 Manually verify each node type can still connect to DBus
- [ ] 5.3 Check debug logging output matches previous behavior
- [ ] 5.4 Verify error handling works correctly in all three cases

## 6. Cleanup

- [ ] 6.1 Review all changes for consistency
- [ ] 6.2 Remove any dead code or unused imports
- [ ] 6.3 Ensure code style matches project conventions
