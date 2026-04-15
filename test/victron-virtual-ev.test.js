// test/victron-virtual-ev.test.js
/* eslint-env jest */
const ev = require('../src/nodes/victron-virtual/device-type/ev')

describe('ev device module', () => {
  test('exports required contract', () => {
    expect(typeof ev.properties).toBe('object')
    expect(typeof ev.initialize).toBe('function')
    expect(typeof ev.onPropertyChanged).toBe('function')
  })

  describe('onPropertyChanged', () => {
    test('returns setValues with LastEvContact timestamp when a property changes', () => {
      const before = Math.floor(Date.now() / 1000)
      const result = ev.onPropertyChanged('Soc', 75, {}, {})
      const after = Math.floor(Date.now() / 1000)
      expect(result).toHaveProperty('setValues.LastEvContact')
      expect(result.setValues.LastEvContact).toBeGreaterThanOrEqual(before)
      expect(result.setValues.LastEvContact).toBeLessThanOrEqual(after)
    })

    test('returns undefined when LastEvContact itself changes', () => {
      const result = ev.onPropertyChanged('LastEvContact', 1736942400, {}, {})
      expect(result).toBeUndefined()
    })

    test('updates LastEvContact for any non-LastEvContact property', () => {
      const props = ['Soc', 'TargetSoc', 'ChargingState', 'Ac/Power', 'BatteryCapacity', 'AtSite', 'Connected']
      for (const prop of props) {
        const result = ev.onPropertyChanged(prop, 1, {}, {})
        expect(result).toHaveProperty('setValues.LastEvContact')
        expect(typeof result.setValues.LastEvContact).toBe('number')
      }
    })

    test('does not include msg in result', () => {
      const result = ev.onPropertyChanged('Soc', 50, {}, {})
      expect(result).not.toHaveProperty('msg')
    })
  })
})
