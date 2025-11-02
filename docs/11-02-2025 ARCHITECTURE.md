# Architecture Documentation

## Overview

This document describes the architectural improvements made to the Spark Videos codebase to enhance maintainability, testability, and professional code organization.

## Architecture Pattern

The codebase follows a **Layered + Feature-Oriented Architecture** with clear separation of concerns:

```
src/
├── shared/              # Cross-cutting concerns
│   ├── config/          # Runtime configuration
│   ├── logging/         # Structured logging
│   ├── errors/          # Typed error handling
│   └── utils/           # Shared utilities (index)
│
├── features/            # Feature-oriented modules
│   └── generation/
│       └── app-services/  # Business logic layer
│
├── lib/                 # Existing handlers (being migrated)
│   └── handlers/        # State orchestration layer
│
└── app/                 # Next.js app router
    └── api/             # API route handlers
```

## Layer Responsibilities

### 1. Shared Layer (`src/shared/`)

**Purpose**: Cross-cutting concerns used throughout the application

- **`config/runtime.ts`**: Centralized configuration management
  - Environment variable access
  - Type-safe configuration object
  - Validation functions
  
- **`logging/logger.ts`**: Structured logging infrastructure
  - Severity levels (DEBUG, INFO, WARN, ERROR)
  - Contextual metadata
  - Child loggers for scoped logging
  
- **`errors/`**: Typed error classes
  - Domain-specific errors (ValidationError, ImageGenerationError, etc.)
  - Error handling utilities
  - Error-to-toast conversion

- **`utils/index.ts`**: Selective re-exports from existing utils
  - Avoids namespace conflicts
  - Provides clean import paths for commonly used utilities

### 2. Features Layer (`src/features/`)

**Purpose**: Feature-specific business logic, pure and testable

- **`generation/app-services/`**: Pure business logic services
  - `storyline-generation.service.ts`: Image analysis and storyline concept generation
  - `image-storage.service.ts`: Image upload, conversion, and storage operations
  
**Characteristics**:
- No React dependencies
- No state management
- Pure functions when possible
- Comprehensive error handling with typed errors
- Structured logging for observability

### 3. Handlers Layer (`src/lib/handlers/`)

**Purpose**: React state orchestration and UI coordination

Example: `storyline-image-variation-handler.ts`
- Delegates business logic to app-services
- Manages React state updates
- Coordinates UI placeholders and loading states
- Handles user interactions

**Characteristics**:
- Thin orchestration layer
- Delegates to services for business logic
- React-specific state management
- Error handling with user feedback

## Migration Strategy

### Completed (Phase 0-3)

✅ **Phase 0**: Foundation
- Created `shared/config/runtime.ts`
- Created `shared/logging/logger.ts`
- Created `shared/errors/` module

✅ **Phase 1**: First Handler Migration
- Extracted `storyline-generation.service.ts`
- Extracted `image-storage.service.ts`
- Refactored `storyline-image-variation-handler.ts`

✅ **Phase 2**: Shared Utilities
- Created `shared/utils/index.ts` with selective exports
- Avoided namespace conflicts with existing utils

✅ **Phase 3**: Verification
- Build compiles successfully
- No runtime errors introduced

### Remaining Work

**Phase 4**: Expand Service Layer
- Extract `variation-handler.ts` business logic
- Extract `b-roll-image-variation-handler.ts` business logic
- Extract Sora video generation logic

**Phase 5**: Transport Layer Unification
- Decide on primary RPC surface (TRPC vs Route Handlers)
- Consolidate duplicate endpoints
- Create unified API client layer

**Phase 6**: Testing & Quality
- Add unit tests for services
- Add integration tests for handlers
- Tighten ESLint rules (re-enable disabled rules)
- Add type coverage monitoring

## Design Principles

### Separation of Concerns
- **Business logic** in services (pure, testable)
- **State management** in handlers (React-specific)
- **Cross-cutting concerns** in shared modules

### Dependency Flow
```
Handlers → Services → Shared
   ↓          ↓          ↓
 React    Pure Logic  Utilities
```

### Error Handling
- Use typed error classes from `shared/errors`
- Log errors with context using `shared/logging`
- Convert errors to user-friendly messages in handlers

### Configuration
- Centralized in `shared/config/runtime.ts`
- Type-safe access via exported `config` object
- Environment validation on startup

### Logging
- Structured logging with context
- Child loggers for service-level scoping
- Debug logs only in development

## Example Usage

### Service Layer (Pure Business Logic)

```typescript
import { generateStorylineConcepts } from "@/features/generation/app-services/storyline-generation.service";

const concepts = await generateStorylineConcepts({
  count: 4,
  imageUrl: signedUrl,
  userContext: "A journey through time",
});
```

### Handler Layer (State Orchestration)

```typescript
import { handleStorylineImageVariations } from "@/lib/handlers/storyline-image-variation-handler";

await handleStorylineImageVariations({
  images,
  selectedIds,
  setActiveGenerations,
  setImages,
  setIsGenerating,
  variationCount: 4,
});
```

### Error Handling

```typescript
import { ImageAnalysisError, handleError } from "@/shared/errors";

try {
  await analyzeImage(url);
} catch (error) {
  handleError(error, {
    operation: "Image analysis",
    context: { imageUrl: url },
    showToast: toast,
  });
}
```

### Logging

```typescript
import { logger } from "@/shared/logging/logger";

const serviceLogger = logger.child({ service: "storyline-generation" });

serviceLogger.info("Starting analysis", { imageUrl });
serviceLogger.error("Analysis failed", error, { imageUrl });
```

## Benefits

1. **Testability**: Pure service functions are easy to unit test
2. **Maintainability**: Clear separation makes changes predictable
3. **Observability**: Structured logging provides debugging insights
4. **Type Safety**: Typed errors and configuration prevent runtime issues
5. **Reusability**: Services can be used across different UI contexts
6. **Professional**: Industry-standard architectural patterns

## Migration Notes

- Old handlers are backed up with `.old.ts` extension
- Existing functionality preserved during refactoring
- Build verification ensures no breaking changes
- Gradual migration allows incremental improvements
