const { mapCacheToJsonResponse } = require('../src/services/utils');

describe('utils', () => {

  describe('mapCacheToJsonResponse', () => {

    it('should map a simple cache correctly', () => {
      const cache = {
        'com.some.device': {
          '/DeviceInstance': 123,
          '/ProductName': 'Victron Device',
        }
      };

      const expected = JSON.stringify({
        'com.some.device': {
          '/DeviceInstance': 123,
          '/ProductName': 'Victron Device',
        }
      });

      const result = mapCacheToJsonResponse(cache);
      expect(result).toEqual(expected);
    });

  })

})
