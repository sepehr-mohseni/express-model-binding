import { isNumeric, isUUID, isObjectId } from './validators';

/**
 * Transform a string value to a number if it's numeric
 */
export function toNumber(value: string): number | string {
  if (isNumeric(value)) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      return num;
    }
  }
  return value;
}

/**
 * Transform a string value to a float if it's a valid decimal
 */
export function toFloat(value: string): number | string {
  const num = parseFloat(value);
  if (!isNaN(num) && isFinite(num)) {
    return num;
  }
  return value;
}

/**
 * Transform a string value to a boolean
 */
export function toBoolean(value: string): boolean {
  const lowered = value.toLowerCase();
  return lowered === 'true' || lowered === '1' || lowered === 'yes';
}

/**
 * Transform a string to lowercase
 */
export function toLowerCase(value: string): string {
  return value.toLowerCase();
}

/**
 * Transform a string to uppercase
 */
export function toUpperCase(value: string): string {
  return value.toUpperCase();
}

/**
 * Trim whitespace from a string
 */
export function trim(value: string): string {
  return value.trim();
}

/**
 * Transform a slug to underscore format
 */
export function slugToUnderscore(value: string): string {
  return value.replace(/-/g, '_');
}

/**
 * Transform underscores to dashes (slug format)
 */
export function underscoreToSlug(value: string): string {
  return value.replace(/_/g, '-');
}

/**
 * Auto-detect and transform value based on format
 */
export function autoTransform(value: string): unknown {
  // Check if it's a UUID - keep as string
  if (isUUID(value)) {
    return value;
  }

  // Check if it's a MongoDB ObjectId - keep as string
  if (isObjectId(value)) {
    return value;
  }

  // Check if it's a pure integer
  if (/^\d+$/.test(value)) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      return num;
    }
  }

  // Check if it's a negative integer
  if (/^-\d+$/.test(value)) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      return num;
    }
  }

  return value;
}

/**
 * Create a composed transformer from multiple transform functions
 */
export function compose(
  ...transformers: Array<(value: string) => unknown>
): (value: string) => unknown {
  return (value: string): unknown => {
    let result: unknown = value;
    for (const transformer of transformers) {
      result = transformer(String(result));
    }
    return result;
  };
}

/**
 * Identity transformer - returns the value unchanged
 */
export function identity<T>(value: T): T {
  return value;
}
