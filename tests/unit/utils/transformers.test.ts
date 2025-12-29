import {
  toNumber,
  toFloat,
  toBoolean,
  toLowerCase,
  toUpperCase,
  trim,
  slugToUnderscore,
  underscoreToSlug,
  autoTransform,
  compose,
  identity,
} from '../../../src/utils/transformers';

describe('Transformers', () => {
  describe('toNumber', () => {
    it('should convert numeric strings to numbers', () => {
      expect(toNumber('123')).toBe(123);
      expect(toNumber('0')).toBe(0);
      expect(toNumber('-456')).toBe(-456);
    });

    it('should return original string for non-numeric values', () => {
      expect(toNumber('abc')).toBe('abc');
      expect(toNumber('12.34')).toBe('12.34');
      expect(toNumber('12a')).toBe('12a');
      expect(toNumber('')).toBe('');
    });

    it('should handle large numbers', () => {
      expect(toNumber('9007199254740991')).toBe(9007199254740991); // MAX_SAFE_INTEGER
    });

    it('should return string for numbers exceeding safe integer', () => {
      // Numbers larger than MAX_SAFE_INTEGER should be kept as strings to prevent precision loss
      expect(typeof toNumber('9007199254740992')).toBe('string');
    });
  });

  describe('toFloat', () => {
    it('should convert float strings to numbers', () => {
      expect(toFloat('12.34')).toBe(12.34);
      expect(toFloat('0.5')).toBe(0.5);
      expect(toFloat('-3.14')).toBe(-3.14);
    });

    it('should convert integer strings to numbers', () => {
      expect(toFloat('123')).toBe(123);
    });

    it('should return original string for non-numeric values', () => {
      expect(toFloat('abc')).toBe('abc');
      expect(toFloat('')).toBe('');
    });
  });

  describe('toBoolean', () => {
    it('should return true for truthy values', () => {
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('True')).toBe(true);
      expect(toBoolean('1')).toBe(true);
      expect(toBoolean('yes')).toBe(true);
      expect(toBoolean('YES')).toBe(true);
    });

    it('should return false for other values', () => {
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('0')).toBe(false);
      expect(toBoolean('no')).toBe(false);
      expect(toBoolean('abc')).toBe(false);
      expect(toBoolean('')).toBe(false);
    });
  });

  describe('toLowerCase', () => {
    it('should convert string to lowercase', () => {
      expect(toLowerCase('HELLO')).toBe('hello');
      expect(toLowerCase('Hello World')).toBe('hello world');
      expect(toLowerCase('hello')).toBe('hello');
    });
  });

  describe('toUpperCase', () => {
    it('should convert string to uppercase', () => {
      expect(toUpperCase('hello')).toBe('HELLO');
      expect(toUpperCase('Hello World')).toBe('HELLO WORLD');
      expect(toUpperCase('HELLO')).toBe('HELLO');
    });
  });

  describe('trim', () => {
    it('should trim whitespace from both ends', () => {
      expect(trim('  hello  ')).toBe('hello');
      expect(trim('\thello\n')).toBe('hello');
      expect(trim('hello')).toBe('hello');
    });
  });

  describe('slugToUnderscore', () => {
    it('should convert hyphens to underscores', () => {
      expect(slugToUnderscore('hello-world')).toBe('hello_world');
      expect(slugToUnderscore('my-post-title')).toBe('my_post_title');
      expect(slugToUnderscore('hello')).toBe('hello');
    });
  });

  describe('underscoreToSlug', () => {
    it('should convert underscores to hyphens', () => {
      expect(underscoreToSlug('hello_world')).toBe('hello-world');
      expect(underscoreToSlug('my_post_title')).toBe('my-post-title');
      expect(underscoreToSlug('hello')).toBe('hello');
    });
  });

  describe('autoTransform', () => {
    it('should keep UUIDs as strings', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(autoTransform(uuid)).toBe(uuid);
    });

    it('should keep MongoDB ObjectIds as strings', () => {
      const objectId = '507f1f77bcf86cd799439011';
      expect(autoTransform(objectId)).toBe(objectId);
    });

    it('should convert pure integers to numbers', () => {
      expect(autoTransform('123')).toBe(123);
      expect(autoTransform('0')).toBe(0);
    });

    it('should convert negative integers to numbers', () => {
      expect(autoTransform('-123')).toBe(-123);
    });

    it('should keep other strings as strings', () => {
      expect(autoTransform('hello')).toBe('hello');
      expect(autoTransform('hello-world')).toBe('hello-world');
      expect(autoTransform('12.34')).toBe('12.34');
    });
  });

  describe('compose', () => {
    it('should compose multiple transformers', () => {
      const composed = compose(trim, toLowerCase);
      expect(composed('  HELLO  ')).toBe('hello');
    });

    it('should apply transformers in order', () => {
      const composed = compose(toLowerCase, (s) => s + '!');
      expect(composed('HELLO')).toBe('hello!');
    });

    it('should handle single transformer', () => {
      const composed = compose(trim);
      expect(composed('  hello  ')).toBe('hello');
    });

    it('should handle empty compose', () => {
      const composed = compose();
      expect(composed('hello')).toBe('hello');
    });
  });

  describe('identity', () => {
    it('should return the same value', () => {
      expect(identity('hello')).toBe('hello');
      expect(identity(123)).toBe(123);
      expect(identity(null)).toBe(null);
      
      const obj = { key: 'value' };
      expect(identity(obj)).toBe(obj);
    });
  });
});
