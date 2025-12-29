// Test setup file
import 'reflect-metadata';

// Increase test timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests unless in debug mode
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
