/**
 * UUID regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * MongoDB ObjectId regex pattern (24 hex characters)
 */
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;

/**
 * Maximum input length for validation functions to prevent ReDoS
 */
const MAX_INPUT_LENGTH = 1024;

/**
 * Check if a value is a valid UUID
 */
export function isUUID(value: string): boolean {
  if (value.length !== 36) return false;
  return UUID_REGEX.test(value);
}

/**
 * Check if a value is a valid MongoDB ObjectId
 */
export function isObjectId(value: string): boolean {
  if (value.length !== 24) return false;
  return OBJECT_ID_REGEX.test(value);
}

/**
 * Check if a value is a numeric string
 */
export function isNumeric(value: string): boolean {
  if (value.length > 20) return false;
  return /^-?\d+$/.test(value);
}

/**
 * Check if a value is a valid positive integer
 */
export function isPositiveInteger(value: string): boolean {
  if (value.length > 19) return false;
  return /^\d+$/.test(value) && parseInt(value, 10) > 0;
}

/**
 * Check if a value is a valid slug (lowercase alphanumeric with hyphens)
 */
export function isSlug(value: string): boolean {
  if (value.length > MAX_INPUT_LENGTH) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Check if a value is a valid email
 */
export function isEmail(value: string): boolean {
  if (value.length > 254) return false; // RFC 5321 limit
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validate that a value is not empty
 */
export function isNotEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Validate that a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate that a value is a function
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Reserved JavaScript property names that should not be used
 */
const RESERVED_NAMES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Validate route parameter name
 * Security: limits length, ensures safe property names, and blocks reserved names
 */
export function isValidParamName(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  if (RESERVED_NAMES.has(value)) return false;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}
