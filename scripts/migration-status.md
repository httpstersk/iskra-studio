# Migration Status: Try-Catch to Errors-as-Values

## Progress Overview

**Total Files:** 73 files with try-catch blocks
**Migrated:** 6 files
**Remaining:** 67 files

## Completed Migrations ✅

### Core Infrastructure (6 files)
1. `/src/lib/errors/safe-errors.ts` - Custom error types and utilities (NEW)
2. `/src/lib/api/http-client.ts` - HTTP client with errors-as-values
3. `/src/lib/services/bria-client.ts` - Bria API client
4. `/src/lib/services/fibo-image-analyzer.ts` - FIBO image analysis
5. `/src/lib/image-analyzer.ts` - Core image analysis wrapper
6. `/MIGRATION_GUIDE.md` - Comprehensive migration guide (NEW)

## Priority Migration Order

### High Priority (Dependencies for other files)

#### 1. Storage Services (2 files)
- `/src/lib/storage/convex-storage-service.ts` - Used by hooks and handlers
- `/src/lib/storage.ts` - IndexedDB operations

#### 2. Server Utilities (2 files)
- `/src/lib/server/convex-server.ts` - Server-side data fetching
- `/src/lib/server/remote-asset-uploader.ts` - Asset upload utilities

#### 3. Core Handlers (8 files)
- `/src/lib/handlers/generation-handler.ts`
- `/src/lib/handlers/director-image-variation-handler.ts`
- `/src/lib/handlers/variation-handler.ts`
- `/src/lib/handlers/sora-video-variation-handler.ts`
- `/src/lib/handlers/b-roll-image-variation-handler.ts`
- `/src/lib/handlers/storyline-image-variation-handler.ts`
- `/src/lib/handlers/variation-utils.ts`
- `/src/lib/handlers/asset-download-handler.ts`

### Medium Priority

#### 4. API Routes (12 files)
**Generation Endpoints:**
- `/src/app/api/generate-storyline-images/route.ts`
- `/src/app/api/generate-camera-angle-variations/route.ts`
- `/src/app/api/generate-director-variations/route.ts`
- `/src/app/api/generate-lighting-variations/route.ts`

**Polar/Subscription:**
- `/src/app/api/polar/products/route.ts`
- `/src/app/api/polar/checkout/route.ts`
- `/src/app/api/polar/webhook/route.ts`
- `/src/app/api/polar/portal/route.ts`

**Storage/Upload:**
- `/src/app/api/storage/proxy/route.ts`
- `/src/app/api/fal/upload/route.ts`
- `/src/app/api/convex/upload/route.ts`
- `/src/app/api/convex/fetch-upload/route.ts`

#### 5. Client Hooks (5 files)
- `/src/hooks/useStorage.ts` - Complex async with race conditions
- `/src/hooks/useProjects.ts` - CRUD operations
- `/src/hooks/useSubscription.ts` - Subscription management
- `/src/hooks/useLocalStorage.ts` - localStorage wrapper
- `/src/hooks/useBatteryStatus.ts` - Battery API wrapper

#### 6. Utility Functions (10 files)
- `/src/lib/utils/upload-utils.ts`
- `/src/lib/utils/generate-thumbnail.ts`
- `/src/utils/download-utils.ts`
- `/src/utils/thumbnail-utils.ts`
- `/src/utils/image-pixelation-helper.ts`

**Component Utilities:**
- `/src/components/canvas/control-panel/ControlActions.tsx`
- `/src/components/canvas/ProjectPanelWrapper.tsx`

**Shared Utilities:**
- `/src/shared/errors/handlers.ts`
- `/src/lib/ratelimit.ts`
- `/src/shared/logging/logger.ts`

### Lower Priority

#### 7. tRPC Routers (1 file)
- `/src/server/trpc/routers/_app.ts` - 8+ try-catch blocks with streaming

#### 8. Remaining Files (38 files)
Files identified in the comprehensive analysis but not yet categorized.

## Migration Patterns by File Type

### API Routes
**Pattern:** Error responses with status codes
```typescript
// Before
try {
  const result = await operation();
  return NextResponse.json(result);
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}

// After
const result = await operation();

if (isErr(result)) {
  console.error('Error:', result);
  return NextResponse.json(
    { error: getErrorMessage(result) },
    { status: isHttpErr(result) ? result.payload.status : 500 }
  );
}

return NextResponse.json(result);
```

### React Hooks
**Pattern:** State management with error state
```typescript
// Before
try {
  setLoading(true);
  const result = await operation();
  setData(result);
} catch (error) {
  setError(error.message);
} finally {
  setLoading(false);
}

// After
setLoading(true);
const result = await operation();

if (isErr(result)) {
  setError(getErrorMessage(result));
  setLoading(false);
  return;
}

setData(result);
setLoading(false);
```

### Handler Functions
**Pattern:** User feedback with error handling
```typescript
// Before
try {
  const result = await operation();
  showSuccess('Operation completed');
} catch (error) {
  showErrorFromException('Failed', error, 'Please try again');
}

// After
const result = await operation();

if (isErr(result)) {
  showErrorFromException('Failed', result, 'Please try again');
  return;
}

showSuccess('Operation completed');
```

### Utility Functions
**Pattern:** Silent failures with fallback
```typescript
// Before
try {
  return await operation();
} catch (error) {
  console.warn('Operation failed:', error);
  return defaultValue;
}

// After
const result = await operation();

if (isErr(result)) {
  console.warn('Operation failed:', getErrorMessage(result));
  return defaultValue;
}

return result;
```

## Testing Strategy

1. **Unit Tests**: Test each refactored function with both success and error cases
2. **Integration Tests**: Ensure error propagation works correctly
3. **Manual Testing**: Test critical user flows

## Rollout Plan

1. ✅ Phase 1: Core infrastructure (Completed)
2. 🔄 Phase 2: Storage and server utilities (In Progress)
3. ⏳ Phase 3: Handlers and business logic
4. ⏳ Phase 4: API routes
5. ⏳ Phase 5: Client hooks and components
6. ⏳ Phase 6: Utilities and helpers
7. ⏳ Phase 7: tRPC and remaining files

## Key Metrics

- **Type Safety**: All error paths are type-checked
- **Performance**: No exception overhead
- **Developer Experience**: Explicit error handling
- **Code Size**: Similar or slightly larger (but more maintainable)

## Next Steps

1. Continue with storage services migration
2. Update tests for migrated files
3. Document any migration challenges
4. Create helper scripts for common patterns

## Notes

- Keep deprecated error classes for backward compatibility during migration
- Gradually migrate files that depend on refactored modules
- Update documentation as patterns evolve
- Monitor for any runtime issues in production
