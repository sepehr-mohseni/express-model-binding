import { Request, Response } from 'express';

/**
 * Create a mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  const req = {
    params: {},
    query: {},
    body: {},
    headers: {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
    range: jest.fn(),
    is: jest.fn(),
    ...overrides,
  } as unknown as Request;
  
  return req;
}

/**
 * Create a mock Express response object
 */
export function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    removeHeader: jest.fn(),
    type: jest.fn().mockReturnThis(),
    contentType: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    links: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    locals: {},
    headersSent: false,
  } as unknown as Response;
  
  return res;
}

/**
 * Create a mock next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}
