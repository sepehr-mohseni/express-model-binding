import { logger } from '../../../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.reset();
    jest.clearAllMocks();
  });

  describe('enable and disable', () => {
    it('should be disabled by default', () => {
      expect(logger.isEnabled()).toBe(false);
    });

    it('should enable logging', () => {
      logger.enable();
      expect(logger.isEnabled()).toBe(true);
    });

    it('should disable logging', () => {
      logger.enable();
      logger.disable();
      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('log levels', () => {
    it('should have default log level of info', () => {
      expect(logger.getLevel()).toBe('info');
    });

    it('should set log level', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
      
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });
  });

  describe('setPrefix', () => {
    it('should change the prefix', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.enable();
      logger.setPrefix('[custom-prefix]');
      logger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[custom-prefix]'),
        ''
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('debug', () => {
    it('should not log when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.debug('Test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log when level is higher than debug', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.enable();
      logger.setLevel('info');
      logger.debug('Test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log when enabled and level is debug', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.enable();
      logger.setLevel('debug');
      logger.debug('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log with context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const context = { key: 'value' };
      
      logger.enable();
      logger.setLevel('debug');
      logger.debug('Test message', context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        context
      );
      consoleSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('should not log when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.info('Test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log when enabled and level is info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.enable();
      logger.setLevel('info');
      logger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log when level is debug (lower)', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.enable();
      logger.setLevel('debug');
      logger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should not log when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      logger.warn('Test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log when enabled', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      logger.enable();
      logger.warn('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('error', () => {
    it('should not log when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.error('Test error');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log when enabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.enable();
      logger.error('Test error');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log with error object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test');
      
      logger.enable();
      logger.error('Test error', error);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
        error
      );
      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('should reset to default configuration', () => {
      logger.enable();
      logger.setLevel('debug');
      logger.setPrefix('[custom]');
      
      logger.reset();
      
      expect(logger.isEnabled()).toBe(false);
      expect(logger.getLevel()).toBe('info');
      
      const config = logger.getConfig();
      expect(config.prefix).toBe('[express-model-binding]');
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      logger.enable();
      logger.setLevel('warn');
      
      const config = logger.getConfig();
      
      expect(config).toEqual({
        enabled: true,
        level: 'warn',
        prefix: '[express-model-binding]',
      });
    });

    it('should return a copy of the config', () => {
      const config = logger.getConfig();
      config.enabled = true;
      
      expect(logger.isEnabled()).toBe(false);
    });
  });
});
