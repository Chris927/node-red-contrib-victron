const { throttle } = require('../src/services/utils');

describe('throttle', () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the function immediately, if not throttling', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled(1); // first call at t + 0ms
    jest.advanceTimersByTime(900);
    expect(func).toHaveBeenCalledTimes(0);

    throttled(2);
    expect(func).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(50); // t + 950ms
    expect(func).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(50); // t + 1000ms
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith(2);

    throttled(3);
    jest.advanceTimersByTime(1000); // t + 2000ms
    expect(func).toHaveBeenCalledTimes(2);
    expect(func).toHaveBeenCalledWith(3);

  });
});


