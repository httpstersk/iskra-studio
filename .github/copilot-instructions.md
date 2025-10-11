# Spark Videos - AI Agent Instructions

## Architecture Overview

This is an **infinite canvas image/video editor** built with Next.js 15, React Konva for 2D rendering, tRPC for type-safe APIs, and fal.ai for AI-powered transformations. The app uses Jotai for global state management and IndexedDB for persistence.

### Core Technologies

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **React Konva** for infinite canvas rendering with viewport culling
- **tRPC** for type-safe client-server communication with streaming support
- **Jotai** for atomic global state management (migrated from useState)
- **fal.ai** for AI image/video generation via streaming API
- **IndexedDB** (`idb`) for client-side persistence with auto-save
- **shadcn/ui** + **Radix UI** for accessible components

## State Management Pattern (CRITICAL)

### Jotai Atoms Architecture

**All global state lives in Jotai atoms** - NEVER use `useState` for shared state.

```typescript
// State is organized into 4 atom files:
src/store/
├── canvas-atoms.ts      // images, videos, selectedIds, viewport, canvasSize
├── generation-atoms.ts  // AI generation state, activeGenerations Map
├── history-atoms.ts     // undo/redo stack with derived atoms
└── ui-atoms.ts          // dialog visibility, preferences, API keys
```

**Access pattern:**

```typescript
// ✅ CORRECT: Use Jotai hooks (src/hooks/*-jotai.ts)
import { useCanvasState } from "@/hooks/useCanvasState-jotai";
const { images, setImages, selectedIds } = useCanvasState();

// ❌ WRONG: Don't create new useState for shared state
const [images, setImages] = useState([]);
```

### Handler Pattern

Business logic is extracted into pure handler functions in `src/lib/handlers/`:

- `generation-handler.ts` - AI image generation with optimistic UI
- `variation-handler.ts` - 4-variation camera angle generation
- `video-generation-handlers.ts` - Video operations (i2v, v2v, extension)
- `background-handler.ts` - Background removal
- `image-handlers.ts` - Image manipulation (combine, duplicate, delete)
- `layer-handlers.ts` - Z-index management (bring forward, send back)

**Handlers receive deps explicitly** (no hooks):

```typescript
interface HandlerDeps {
  images: PlacedImage[];
  setImages: React.Dispatch<...>;
  toast: (props) => void;
  // ... all dependencies passed explicitly
}
export const handleRun = async (deps: HandlerDeps) => { /* ... */ }
```

## AI Generation Flow (CRITICAL)

### Optimistic UI Pattern

All AI operations use **placeholders + streaming updates**:

1. **Create placeholder immediately** (empty image with `isLoading: true`)
2. **Add to canvas state** (users see instant feedback)
3. **Upload source to fal.ai** (via proxy at `/api/fal`)
4. **Start tRPC subscription** (add to `activeGenerations` Map)
5. **StreamingImage component handles updates** (progressive rendering)
6. **Replace with final result** when complete

```typescript
// Example: variation-handler.ts shows this pattern
// Step 1-2: Create and add placeholders immediately
const placeholderImages = CAMERA_VARIATIONS.map((_, i) => ({
  id: `variation-${timestamp}-${i}`,
  src: "data:image/gif;base64,R0lGODlh...", // 1px transparent gif
  isLoading: true,
  ...position
}));
setImages(prev => [...prev, ...placeholderImages]);

// Step 3-4: Upload and track generation
const uploadResult = await uploadBlobDirect(blob, falClient, ...);
setActiveGenerations(prev => {
  const newMap = new Map(prev);
  placeholderImages.forEach((img) => {
    newMap.set(img.id, { imageUrl: uploadResult.url, prompt: ... });
  });
  return newMap;
});
// Step 5: StreamingImage component subscribes and updates
```

### tRPC Streaming Pattern

Server uses **async generators** for real-time updates:

```typescript
// Server (src/server/trpc/routers/_app.ts)
.subscription(async function* ({ input, signal }) {
  const stream = await falClient.stream("fal-ai/flux-kontext-lora", { input });
  for await (const event of stream) {
    yield tracked(eventId, { type: "progress", data: event });
  }
  yield tracked(eventId, { type: "complete", imageUrl });
});

// Client (StreamingImage.tsx)
const subscription = useSubscription(
  trpc.generateImageStream.subscriptionOptions({ ... }, {
    onData: (data) => {
      if (data.data.type === "progress") {
        onStreamingUpdate(imageId, event.images[0].url);
      }
    }
  })
);
```

## Rate Limiting Strategy

Three-tier system using **Upstash KV** (`@upstash/ratelimit`):

```typescript
// src/lib/ratelimit.ts
const limiter = {
  perMinute: createRateLimiter(5, "60 s"), // 5 req/min
  perHour: createRateLimiter(15, "60 m"), // 15 req/hour
  perDay: createRateLimiter(50, "24 h"), // 50 req/day
};
// Video operations have stricter limits (2/min, 4/hour, 8/day)
```

**Bypass:** Users can add custom FAL API key → switches to their quota

## Critical Patterns & Conventions

### 1. Performance Optimizations

- **Viewport culling:** Only render images visible in current viewport
- **Single state updates:** Batch changes to avoid re-renders
- **Direct blob uploads:** Skip FileReader for image processing (see `variation-handler.ts`)
- **Grid snapping:** 12px grid with haptic feedback (`snap-utils.ts`)

### 2. Constants Organization

Extract ALL magic numbers/strings to `src/constants/`:

```typescript
import {
  CANVAS_DIMENSIONS,
  CANVAS_STRINGS,
  ANIMATION,
} from "@/constants/canvas";
const spacing = CANVAS_DIMENSIONS.DEFAULT_SPACING; // not 250
```

### 3. TSDoc Comments

Every function/component needs TSDoc:

```typescript
/**
 * Handle variation generation for a selected image
 * Generates 4 variations with different camera settings positioned on each side
 * Optimized for maximum performance and UX
 */
export const handleVariationGeneration = async (
  deps: VariationHandlerDeps
) => {};
```

### 4. Type Definitions

Core types in `src/types/canvas.ts`:

- `PlacedImage` - Canvas image with position, crop, loading state
- `PlacedVideo` - Extends PlacedImage with video-specific props
- `ActiveGeneration` - Tracks ongoing AI generations (stored in Map)
- `GenerationSettings` - Prompt, LoRA URL, style ID

### 5. IndexedDB Persistence

Auto-save with debouncing via `useStorage` hook:

```typescript
// Saves canvas state + image blobs to IndexedDB
// Images stored separately to handle large files (>4MB Vercel limit)
canvasStorage.saveCanvasState({ elements, viewport, lastModified });
await canvasStorage.saveImage(src, imageId);
```

## Development Commands

```bash
npm run dev          # Dev server on 0.0.0.0 (network accessible)
npm run build        # Production build
npm run lint         # ESLint
npm run format:check # Prettier check
npm run format:write # Prettier fix
```

## Key Files Reference

- **Main page:** `src/app/page.tsx` (1012 lines, orchestrates all features)
- **Canvas rendering:** `src/components/canvas/CanvasStageRenderer.tsx`
- **Streaming components:** `src/components/canvas/Streaming{Image,Video}.tsx`
- **tRPC router:** `src/server/trpc/routers/_app.ts` (all API endpoints)
- **Storage:** `src/lib/storage.ts` (IndexedDB wrapper)
- **Rate limiting:** `src/lib/ratelimit.ts` (Upstash KV integration)

## Migration Notes

- **Jotai migration completed:** See `docs/JOTAI_MIGRATION.md` for details
- **Refactoring journey:** See `docs/REFACTORING_SUMMARY.md` (4041 → 1012 lines)
- **Original useState version:** Preserved in `page.tsx.backup` for reference

## Common Tasks

**Add new AI generation type:**

1. Add tRPC procedure in `src/server/trpc/routers/_app.ts`
2. Create handler in `src/lib/handlers/` following optimistic UI pattern
3. Add streaming component if needed (follow `StreamingImage.tsx`)
4. Update `activeGenerations` Map to track progress

**Add new canvas element type:**

1. Define type in `src/types/canvas.ts`
2. Add atom in appropriate `src/store/*-atoms.ts`
3. Update `useCanvasState` hook to expose it
4. Add rendering in `CanvasStageRenderer.tsx`

## Technical Requirements

- Always add `TSdocs` to your code.
- Always sort all props, fields, functions and type properties in alphabetical order.
- Always use the Compound Component Pattern while creating new components.
- Never hardcode strings, always extract them into constants for reuse.
- Make the components accessible following the WCAG 2.1 guidelines.
- Always use the 'gitmoji' standard when generating commit messages and capitalize the first letter. For example: `✨ feat: Add new feature` or `🐛 fix: Fix some bug`.
- Treat UI's as a thin layer over your data. Avoid local state (e.g. `useState`) unless it is absolutely necessary and clearly separate from business logic. Use `useRef` for variables that don't need to be reactive and Jotai's `useAtom` for global state.
- When you find yourself with nested if/else statements or complex conditional rendering, create a new component. Reserve inline ternaries for tiny, readable sections.
- Choose to derive data rather than using useEffect. Only use useEffect to synchronise with an external system (e.g. document-level events). This can cause confusion over what the logic is doing. Explicitly define logic rather than depending on implicit reactive behaviour.
- Treat `setTimeout` as a last resort and always comment on why.
- Do not add useless comments. Avoid adding comments unless you are clarifying a race condition (e.g. setTimeout), a long-term TODO or a confusing piece of code that even a senior engineer wouldn't initially understand.
