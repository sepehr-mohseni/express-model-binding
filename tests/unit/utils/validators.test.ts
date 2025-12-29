import {
  isUUID,
  isObjectId,
  isNumeric,
  isPositiveInteger,
  isSlug,
  isEmail,
  isNotEmpty,
  isNonEmptyString,
  isPlainObject,
  isFunction,
  isValidParamName,
} from '../../../src/utils/validators';

describe('Validators', () => {
  describe('isUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('should return true for uppercase UUIDs', () => {
      expect(isUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUUID('123e4567')).toBe(false);
      expect(isUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false);
    });
  });

  describe('isObjectId', () => {
    it('should return true for valid MongoDB ObjectIds', () => {
      expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isObjectId('507f1f77bcf86cd799439012')).toBe(true);
      expect(isObjectId('000000000000000000000000')).toBe(true);
    });

    it('should return true for uppercase ObjectIds', () => {
      expect(isObjectId('507F1F77BCF86CD799439011')).toBe(true);
    });

    it('should return false for invalid ObjectIds', () => {
      expect(isObjectId('507f1f77')).toBe(false);
      expect(isObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
      expect(isObjectId('507f1f77bcf86cd7994390111')).toBe(false); // 25 chars
      expect(isObjectId('not-an-objectid')).toBe(false);
      expect(isObjectId('')).toBe(false);
      expect(isObjectId('507f1f77bcf86cd79943901g')).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should return true for numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('-123')).toBe(true);
      expect(isNumeric('1234567890')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNumeric('12.34')).toBe(false);
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('12a')).toBe(false);
      expect(isNumeric('')).toBe(false);
      expect(isNumeric('1.0')).toBe(false);
      expect(isNumeric('1e5')).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('should return true for positive integers', () => {
      expect(isPositiveInteger('1')).toBe(true);
      expect(isPositiveInteger('123')).toBe(true);
      expect(isPositiveInteger('1234567890')).toBe(true);
    });

    it('should return false for zero, negative, or non-integers', () => {
      expect(isPositiveInteger('0')).toBe(false);
      expect(isPositiveInteger('-1')).toBe(false);
      expect(isPositiveInteger('abc')).toBe(false);
      expect(isPositiveInteger('1.5')).toBe(false);
      expect(isPositiveInteger('')).toBe(false);
    });
  });

  describe('isSlug', () => {
    it('should return true for valid slugs', () => {
      expect(isSlug('hello-world')).toBe(true);
      expect(isSlug('my-post')).toBe(true);
      expect(isSlug('test123')).toBe(true);
      expect(isSlug('a')).toBe(true);
      expect(isSlug('abc-def-ghi')).toBe(true);
    });

    it('should return false for invalid slugs', () => {
      expect(isSlug('Hello-World')).toBe(false); // uppercase
      expect(isSlug('hello--world')).toBe(false); // double hyphen
      expect(isSlug('-hello')).toBe(false); // starts with hyphen
      expect(isSlug('hello-')).toBe(false); // ends with hyphen
      expect(isSlug('hello_world')).toBe(false); // underscore
      expect(isSlug('')).toBe(false);
      expect(isSlug('hello world')).toBe(false); // space
    });
  });

  describe('isEmail', () => {
    it('should return true for valid emails', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@domain.co')).toBe(true);
      expect(isEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isEmail('test')).toBe(false);
      expect(isEmail('test@')).toBe(false);
      expect(isEmail('@example.com')).toBe(false);
      expect(isEmail('test @example.com')).toBe(false);
      expect(isEmail('')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('should return true for non-empty values', () => {
      expect(isNotEmpty('hello')).toBe(true);
      expect(isNotEmpty(' hello ')).toBe(true);
      expect(isNotEmpty(123)).toBe(true);
      expect(isNotEmpty(0)).toBe(true);
      expect(isNotEmpty(false)).toBe(true);
      expect(isNotEmpty({})).toBe(true);
      expect(isNotEmpty([])).toBe(true);
    });

    it('should return false for empty values', () => {
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' hello ')).toBe(true);
    });

    it('should return false for empty strings or non-strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(123 as unknown as string)).toBe(false);
      expect(isNonEmptyString(null as unknown as string)).toBe(false);
      expect(isNonEmptyString(undefined as unknown as string)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
      expect(isPlainObject({ nested: { key: 'value' } })).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(() => {})).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(class Test {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction('string')).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
    });
  });

  describe('isValidParamName', () => {
    it('should return true for valid parameter names', () => {
      expect(isValidParamName('user')).toBe(true);
      expect(isValidParamName('userId')).toBe(true);
      expect(isValidParamName('_id')).toBe(true);
      expect(isValidParamName('user123')).toBe(true);
      expect(isValidParamName('user_id')).toBe(true);
    });

    it('should return false for invalid parameter names', () => {
      expect(isValidParamName('123user')).toBe(false);
      expect(isValidParamName('user-id')).toBe(false);
      expect(isValidParamName('user.id')).toBe(false);
      expect(isValidParamName('')).toBe(false);
      expect(isValidParamName('user id')).toBe(false);
    });
  });
});
