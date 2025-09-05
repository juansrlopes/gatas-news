import logger from './logger';

describe('Logger Utility', () => {
  it('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('should be able to call info without throwing', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });
});
