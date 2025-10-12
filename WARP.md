# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Iskra Studio** is an infinite canvas image and video editor with AI transformations using fal.ai. Built with Next.js 15, React Konva, and tRPC. The project implements an infinite canvas where users can manipulate images and videos with AI-powered features like style transfer, background removal, object isolation, and video generation.

## Development Commands

### Core Development
```bash
# Start development server (binds to all interfaces)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

### Code Formatting
```bash
# Check formatting without making changes
npm run format:check

# Apply formatting fixes
npm run format:write

# Run pre-commit checks manually
npx lint-staged
```

### Export (Static)
```bash
# Export static site (with fallback workaround)
npm run export
```

## High-Level Architecture

### State Management (Jotai-Based)
The application uses **Jotai** for centralized state management across four main atom categories:

- **Canvas State** (`src/store/canvas-atoms.ts`): Images, videos, viewport, canvas dimensions
- **Generation State** (`src/store/generation-atoms.ts`): AI generation jobs, settings, flags
- **UI State** (`src/store/ui-atoms.ts`): Dialog visibility, preferences, API keys
- **History State** (`src/store/history-atoms.ts`): Undo/redo functionality with derived atoms

### Core Architecture Patterns

#### 1. Proxy Architecture for fal.ai Integration
The app implements a proxy pattern to bypass Vercel's 4.5MB request body limit:
- Client uploads through proxy at `/api/fal/route.ts`
- Uses fal.ai's Next.js proxy (`@fal-ai/server-proxy`)
- Enables large image uploads that would otherwise be rejected

#### 2. Three-Tier Rate Limiting System
Different limits for users without API keys:
- **Regular operations**: 5/min, 15/hour, 50/day
- **Video operations**: 2/min, 4/hour, 8/day
- Users bypass limits by adding their own fal.ai API key

#### 3. Real-time Streaming with tRPC
- Server-side streaming for AI generation progress
- Client receives updates via tRPC subscriptions
- Smooth UX with gradual image/video appearance during generation

### Component Architecture

#### Main Page Structure
- **`src/app/page.tsx`**: Main canvas page (1,012 lines, heavily refactored)
- Uses compound component pattern and alphabetized organization
- Zero global `useState` calls (migrated to Jotai atoms)

#### Key Components
- **`CanvasStageRenderer`**: React Konva stage with viewport culling
- **`CanvasControlPanel`**: Tool panels and controls
- **`CanvasDialogs`**: Modal management for AI operations
- **`StreamingImage`** & **`StreamingVideo`**: Real-time AI result display

### API Routes (tRPC)
Located in `src/server/trpc/routers/_app.ts`:

- **`generateImageStream`**: Streaming image-to-image with Flux
- **`generateImageToVideo`**: Image-to-video conversion (multiple models)
- **`generateTextToVideo`**: Text-to-video generation
- **`transformVideo`**: Video-to-video transformations
- **`removeBackground`**: Background removal with Bria model
- **`isolateObject`**: Object segmentation with EVF-SAM
- **`generateTextToImage`**: Text-to-image generation
- **`generateImageVariation`**: Image variation with SeeDANCE

### AI Models Integration

#### Image Models
- **Flux Models**: Style transfer and image-to-image
- **Bria Background Removal**: Clean background removal
- **EVF-SAM**: Natural language object segmentation
- **SeeDANCE v4**: Image variation generation

#### Video Models (`src/lib/video-models.ts`)
- **LTX Video**: Image-to-video conversion
- **LTX Video Extend**: Video extension
- **LTX Video Multiconditioning**: Advanced video-to-video
- **Stable Video Diffusion**: Text-to-video
- **Bria Video Background Removal**: Video background removal

## Key Development Patterns

### State Management with Jotai
```typescript
// Access atoms through custom hooks
const canvasState = useCanvasState();
const generationState = useGenerationState();
const historyState = useHistoryState();
const uiState = useUIState();

// Derived atoms for computed values
const canUndo = useAtomValue(canUndoAtom);
const canRedo = useAtomValue(canRedoAtom);
```

### Handler Pattern
Business logic is separated into pure handler functions:
- **`src/lib/handlers/generation-handler.ts`**: AI generation logic
- **`src/lib/handlers/video-generation-handlers.ts`**: Video generation
- **`src/lib/handlers/image-handlers.ts`**: Image manipulation
- **`src/lib/handlers/layer-handlers.ts`**: Layer ordering
- **`src/lib/handlers/background-handler.ts`**: Background removal

### Performance Optimizations
- **Viewport Culling**: Only renders visible images on canvas
- **Streaming Images**: Custom hook prevents flickering during AI updates
- **Debounced Saving**: Reduces IndexedDB writes with `useStorage` hook
- **Image Resizing**: Automatic resize before upload
- **Lazy Loading**: Default images load asynchronously

### Storage Strategy
- **Canvas State**: React state + Jotai atoms
- **Persistence**: Auto-save to IndexedDB via `useStorage` hook
- **History**: In-memory undo/redo stack
- **Image Storage**: Original data stored separately in IndexedDB

## Environment Setup

### Required Environment Variables
```bash
# Required for AI features
FAL_KEY=your_fal_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional rate limiting (Upstash KV)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### Pre-commit Hooks
The project uses Husky and lint-staged for automated formatting:
- Runs on `npm install` (via `prepare` script)
- Prettier formatting on staged files
- ESLint with auto-fix on staged files

## Code Quality Standards

### Documentation
- Full TSDoc comments on all functions and components
- Parameters and return types documented
- Complex logic explained with inline comments

### Organization
- Alphabetical ordering of props, functions, and imports
- Clear separation of concerns
- Constants extracted to `src/constants/canvas.ts`

### Accessibility
- WCAG 2.1 compliant
- `aria-label` on interactive elements
- `role="application"` on canvas
- `role="dialog"` on modals
- Semantic HTML throughout

## Testing Approach

### Component Testing
- Pure handler functions are easily testable
- Jotai atoms can be tested in isolation
- Components have clear boundaries
- Mock fal.ai client for AI operations

### Integration Testing
- Test tRPC subscriptions for streaming
- Test IndexedDB storage operations
- Test canvas interactions and state updates

## Deployment Configuration

### Vercel Optimization
- Edge-compatible APIs
- Request proxying for large files
- Image optimization disabled for canvas compatibility
- Bot protection via BotId integration

### Build Configuration
- Next.js 15 with App Router
- PostCSS with Tailwind CSS
- TypeScript strict mode
- ESLint with Next.js configuration

## Common Development Tasks

### Adding New AI Models
1. Update `src/lib/video-models.ts` or create image model config
2. Add endpoint and parameters to tRPC router
3. Create UI components in `src/components/canvas/`
4. Add handlers in `src/lib/handlers/`

### Adding New Canvas Features
1. Define state in appropriate atom file (`src/store/`)
2. Update corresponding hook in `src/hooks/`
3. Create handlers in `src/lib/handlers/`
4. Add UI components with proper accessibility

### Debugging AI Operations
- Check browser network tab for fal.ai API calls
- Use tRPC DevTools for subscription debugging
- Monitor `activeGenerations` and `activeVideoGenerations` atoms
- Check console logs for detailed error information

### State Management Debugging
- Use Jotai DevTools (when available)
- Monitor atom values in React DevTools
- Check localStorage for persistence issues
- Verify undo/redo history stack

## Architecture Decisions

### Why Jotai Over Redux
- Fine-grained reactivity (only affected components re-render)
- Less boilerplate than Redux
- Better TypeScript integration
- Atomic state updates
- Built-in derived state support

### Why React Konva
- High-performance 2D canvas rendering
- Excellent for infinite canvas applications
- Built-in event handling for canvas elements
- Viewport culling for performance optimization

### Why tRPC
- Type-safe API calls between client and server
- Built-in streaming support for AI operations
- Excellent TypeScript integration
- Reduced API surface area compared to REST

### Why fal.ai
- Comprehensive AI model marketplace
- Streaming API support for real-time updates
- Built-in storage and proxy capabilities
- Multiple video and image models available

## Troubleshooting

### Common Issues
- **Large file uploads**: Ensure proxy configuration is correct
- **Rate limiting**: Verify KV environment variables for Upstash
- **Canvas performance**: Check viewport culling and image sizing
- **AI generation failures**: Verify fal.ai API key and model parameters
- **State synchronization**: Check Jtai atom updates and effects

### Performance Issues
- Monitor canvas rendering performance with React DevTools Profiler
- Check IndexedDB storage size and cleanup
- Verify image sizes and compression
- Monitor memory usage with large video files


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

