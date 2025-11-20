# Migration Guide: Try-Catch to Errors-as-Values

This guide explains how to migrate from try-catch blocks to the errors-as-values pattern using `@safe-std/error`.

## Overview

We're replacing try-catch blocks with a lightweight errors-as-values API that provides:
- **Type safety**: Errors are part of the return type
- **Low overhead**: No wrapping for successful operations
- **Better control flow**: Explicit error handling without exceptions

## Core Library

All error types and utilities are in `/src/lib/errors/safe-errors.ts`

## Migration Patterns

### Pattern 1: Basic Try-Catch Replacement

**Before:**
```typescript
async function fetchData(url: string): Promise<Data> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
}
```

**After:**
```typescript
import { isErr, HttpErr } from '@/lib/errors/safe-errors';
import { httpClient } from '@/lib/api/http-client';

async function fetchData(url: string): Promise<Data | HttpErr> {
  const result = await httpClient.fetchJson<Data>(url);

  if (isErr(result)) {
    return new HttpErr({
      status: result.payload.status,
      message: `Failed to fetch: ${result.payload.message}`,
    });
  }

  return result;
}
```

### Pattern 2: Validation Errors

**Before:**
```typescript
function validateInput(input: string): void {
  if (!input || !input.trim()) {
    throw new Error('Input is required');
  }
}
```

**After:**
```typescript
import { ValidationErr } from '@/lib/errors/safe-errors';

function validateInput(input: string): void | ValidationErr {
  if (!input || !input.trim()) {
    return new ValidationErr({
      message: 'Input is required',
      field: 'input',
    });
  }
}
```

### Pattern 3: Silent Failures with Fallback

**Before:**
```typescript
async function loadData(): Promise<Data> {
  try {
    return await fetchData();
  } catch (error) {
    console.warn('Failed to load data:', error);
    return defaultData;
  }
}
```

**After:**
```typescript
import { isErr, unwrapOr } from '@/lib/errors/safe-errors';

async function loadData(): Promise<Data> {
  const result = await fetchData();

  if (isErr(result)) {
    console.warn('Failed to load data:', result.payload.message);
    return defaultData;
  }

  return result;
}

// Or more concisely:
async function loadData(): Promise<Data> {
  const result = await fetchData();
  return unwrapOr(result, defaultData);
}
```

### Pattern 4: State Management with Error State

**Before:**
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleClick = async () => {
  try {
    setLoading(true);
    setError(null);
    const result = await fetchData();
    // handle success
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
import { isErr, getErrorMessage } from '@/lib/errors/safe-errors';

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleClick = async () => {
  setLoading(true);
  setError(null);

  const result = await fetchData();

  if (isErr(result)) {
    setError(getErrorMessage(result));
    setLoading(false);
    return;
  }

  // handle success
  setLoading(false);
};
```

### Pattern 5: Retry Logic with Exponential Backoff

**Before:**
```typescript
async function fetchWithRetry(maxRetries = 3): Promise<Data> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchData();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

**After:**
```typescript
import { retryWithBackoff, isErr, isHttpErr } from '@/lib/errors/safe-errors';

async function fetchWithRetry(maxRetries = 3): Promise<Data | HttpErr> {
  return retryWithBackoff(
    () => fetchData(),
    maxRetries,
    (error) => {
      // Retry on server errors only
      if (isHttpErr(error)) {
        return error.payload.status >= 500;
      }
      return false;
    }
  );
}
```

### Pattern 6: Quota Management Pattern

**Before:**
```typescript
async function generateImage(): Promise<Image> {
  try {
    await checkAndReserveQuota(1);

    try {
      const image = await generate();
      return image;
    } catch (error) {
      await refundQuota(1);
      throw error;
    }
  } catch (error) {
    throw new Error(`Generation failed: ${error.message}`);
  }
}
```

**After:**
```typescript
import { isErr, QuotaErr } from '@/lib/errors/safe-errors';

async function generateImage(): Promise<Image | QuotaErr | HttpErr> {
  const quotaResult = await checkAndReserveQuota(1);

  if (isErr(quotaResult)) {
    return quotaResult;
  }

  const imageResult = await generate();

  if (isErr(imageResult)) {
    await refundQuota(1);
    return imageResult;
  }

  return imageResult;
}
```

### Pattern 7: JSON Parsing

**Before:**
```typescript
function parseJSON(text: string): Data {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON');
  }
}
```

**After:**
```typescript
import { trySync, isErr } from '@/lib/errors/safe-errors';

function parseJSON(text: string): Data | st.Err<unknown> {
  const result = trySync(JSON.parse, text);

  if (isErr(result)) {
    return err('Invalid JSON');
  }

  return result;
}
```

### Pattern 8: Async Operations

**Before:**
```typescript
async function uploadFile(file: File): Promise<string> {
  try {
    const url = await storageService.upload(file);
    return url;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}
```

**After:**
```typescript
import { tryPromise, isErr, StorageErr } from '@/lib/errors/safe-errors';

async function uploadFile(file: File): Promise<string | StorageErr> {
  const result = await storageService.upload(file);

  if (isErr(result)) {
    return new StorageErr({
      message: `Upload failed: ${result.payload.message}`,
      operation: 'upload',
      cause: result,
    });
  }

  return result;
}
```

## Custom Error Types

### Available Error Types

1. **HttpErr** - HTTP/API requests
2. **BriaApiErr** - Bria API specific errors
3. **BriaTokenErr** - Missing/invalid API token
4. **StorageErr** - File/storage operations
5. **QuotaErr** - Quota-related failures
6. **ValidationErr** - Input validation
7. **FiboAnalysisErr** - Image analysis failures

### Creating Custom Errors

```typescript
import { HttpErr } from '@/lib/errors/safe-errors';

// Create error
const error = new HttpErr({
  status: 404,
  message: 'Resource not found',
  response: { detail: 'The requested resource does not exist' },
});
```

## Utility Functions

### Type Guards

```typescript
import {
  isErr,
  isHttpErr,
  isBriaApiErr,
  isValidationErr
} from '@/lib/errors/safe-errors';

if (isErr(result)) {
  if (isHttpErr(result)) {
    console.log('HTTP error:', result.payload.status);
  }
}
```

### Error Message Extraction

```typescript
import { getErrorMessage } from '@/lib/errors/safe-errors';

const message = getErrorMessage(result);
// Works with any error type
```

### Result Mapping

```typescript
import { mapOk, mapErr } from '@/lib/errors/safe-errors';

// Transform success value
const doubled = mapOk(result, x => x * 2);

// Transform error
const wrapped = mapErr(result, err =>
  new HttpErr({ status: 500, message: 'Wrapped error' })
);
```

### Unwrapping

```typescript
import { unwrap, unwrapOr, unwrapOrElse } from '@/lib/errors/safe-errors';

// Throw if error
const value = unwrap(result);

// Use default if error
const value = unwrapOr(result, defaultValue);

// Compute default if error
const value = unwrapOrElse(result, (err) => computeDefault(err));
```

## Migration Checklist

For each file with try-catch blocks:

- [ ] Import error types and utilities from `/src/lib/errors/safe-errors`
- [ ] Update function return types to include error types
- [ ] Replace `try { }` with direct async calls
- [ ] Replace `catch (error) { }` with `if (isErr(result)) { }`
- [ ] Update error handling logic to use error constructors
- [ ] Update callers to handle the new error return types
- [ ] Remove `throw` statements (except where throwing is intentional)
- [ ] Test the refactored code

## Common Gotchas

1. **Don't forget to update return types** - TypeScript will catch this
2. **Check for errors before using the value** - `isErr()` is your friend
3. **Early returns** - Return errors immediately, don't nest
4. **Propagate errors** - Pass errors up the call stack
5. **Log errors** - Use `console.error()` or logging utilities

## Benefits

1. **Type Safety**: Errors are part of the type system
2. **Explicit Handling**: You can't forget to handle errors
3. **Performance**: No exception overhead
4. **Composability**: Easy to chain operations
5. **Debugging**: Clear error paths in code

## Testing

When testing refactored code:

```typescript
// Test success case
const result = await myFunction();
expect(isErr(result)).toBe(false);
expect(result).toEqual(expectedValue);

// Test error case
const result = await myFunction();
expect(isErr(result)).toBe(true);
expect(isHttpErr(result)).toBe(true);
expect(result.payload.status).toBe(404);
```

## Questions?

Check the documentation in `/src/lib/errors/safe-errors.ts` or the `@safe-std/error` library docs.
