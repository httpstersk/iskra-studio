# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Spark Videos** is an infinite canvas image and video editor with AI transformations using fal.ai. Built with Next.js 15, React Konva, tRPC, and Convex. The project implements an infinite canvas where users can manipulate images and videos with AI-powered features like style transfer, background removal, object isolation, and video generation.

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

### Convex Backend
```bash
# Initialize/start Convex development server
npx convex dev

# Deploy functions to Convex
npx convex deploy

# View Convex logs
npx convex logs
```

### Export (Static)
```bash
# Export static site (with fallback workaround)
npm run export
```

## High-Level Architecture

### Layered + Feature-Oriented Architecture
The codebase follows a professional architecture pattern with clear separation of concerns:

```
src/
├── shared/              # Cross-cutting concerns
│   ├── config/          # Runtime configuration
│   ├── logging/         # Structured logging
│   ├── errors/          # Typed error handling
│   └── utils/           # Shared utilities
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

### State Management (Multi-Layer)
The application uses multiple state management approaches:

- **Jotai Atoms** (`src/store/`): Client-side reactive state
  - Canvas State: Images, videos, viewport, canvas dimensions
  - Generation State: AI generation jobs, settings, flags
  - UI State: Dialog visibility, preferences, API keys
  - History State: Undo/redo functionality
  - Auth State: Authentication and user context

- **Convex Backend**: Real-time database with type-safe queries
  - Users: Account management and quotas
  - Assets: Image/video storage and metadata
  - Projects: Canvas workspace persistence

### Core Architecture Patterns

#### 1. Dual Backend Architecture
The app uses both Convex and tRPC for different purposes:
- **Convex**: Real-time data sync, authentication, asset storage
- **tRPC**: AI generation streaming and server-side processing
- Server-side rendering with pre-fetched data for performance

#### 2. Three-Tier Rate Limiting System
Different limits for users without API keys:
- **Regular operations**: 5/min, 15/hour, 50/day
- **Video operations**: 2/min, 4/hour, 8/day
- Users bypass limits by adding their own fal.ai API key

#### 3. Real-time Streaming with tRPC
- Server-side streaming for AI generation progress
- Client receives updates via tRPC subscriptions
- Smooth UX with gradual image/video appearance during generation

#### 4. Service-Handler Pattern
- **Services** (`src/features/*/app-services/`): Pure business logic, testable
- **Handlers** (`src/lib/handlers/`): React state orchestration and UI coordination
- Clear separation between business logic and UI concerns

### Component Architecture

#### Main Page Structure
- **`src/app/page.tsx`**: Server component wrapper for SSR optimization
- **`src/app/canvas-page-client.tsx`**: Client-side canvas interface
- Uses compound component pattern and alphabetized organization
- Pre-fetched data via server-side rendering for performance

#### Server-Side Rendering (SSR)
- **`src/lib/server/convex-server.ts`**: Server-side Convex client
- **`src/components/server/initial-data-provider.tsx`**: Pre-fetches user data, quota, projects
- **`src/components/server/initial-data-client.tsx`**: Provides pre-fetched data via React Context
- Eliminates loading states and waterfall requests

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
- **Canvas State**: Jotai atoms for reactive updates
- **Backend Persistence**: Convex real-time database
- **Asset Storage**: Convex file storage with CDN
- **Local Storage**: IndexedDB for offline/temporary data via `useStorage` hook
- **History**: In-memory undo/redo stack
- **Asset Synchronization**: Automatic sync between local and Convex storage

## Environment Setup

### Required Environment Variables
```bash
# Required for AI features
FAL_KEY=your_fal_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex Backend (generated by npx convex dev)
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

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
2. Add endpoint and parameters to tRPC router (`src/server/trpc/routers/_app.ts`)
3. Create business logic service in `src/features/generation/app-services/`
4. Create or update handler in `src/lib/handlers/`
5. Add UI components in `src/components/canvas/`

### Adding New Canvas Features
1. Define state in appropriate atom file (`src/store/`)
2. Update corresponding hook in `src/hooks/`
3. Create business logic service (if complex)
4. Create or update handlers in `src/lib/handlers/`
5. Add UI components with proper accessibility
6. Update Convex schema if backend persistence needed

### Working with Convex
```bash
# Add new database table
# 1. Update convex/schema.ts
# 2. Create mutations/queries in convex/[table].ts
# 3. Use in React components with useQuery/useMutation

# Asset storage workflow
# 1. Upload via convex/http.ts endpoints
# 2. Store metadata in assets table
# 3. Sync with local storage via useAssetSync hook
```

### Debugging AI Operations
- Check browser network tab for fal.ai API calls
- Use tRPC DevTools for subscription debugging
- Monitor `activeGenerations` and `activeVideoGenerations` atoms
- Check structured logs with context in server console
- Use Convex dashboard for real-time data inspection

### State Management Debugging
- Use Jotai DevTools (when available)
- Monitor atom values in React DevTools
- Check Convex dashboard for backend state
- Use structured logging from `src/shared/logging/logger.ts`
- Verify asset synchronization status

### Performance Optimization
- Monitor canvas rendering with React DevTools Profiler
- Check Convex query performance in dashboard
- Use server-side rendering for initial data loading
- Optimize image/video sizes before upload
- Implement viewport culling for large canvases

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

### Why Dual Backend (Convex + tRPC)
- **Convex**: Real-time database, authentication, file storage
- **tRPC**: AI generation streaming and server-side processing
- Type-safe APIs throughout the stack
- Real-time updates for collaborative features
- Optimized for different use cases

### Why fal.ai
- Comprehensive AI model marketplace
- Streaming API support for real-time updates
- Built-in storage and proxy capabilities
- Multiple video and image models available

## Troubleshooting

### Common Issues
- **Convex setup**: Run `npx convex dev` to initialize backend
- **Authentication**: Verify Clerk environment variables and webhooks
- **Large file uploads**: Ensure proxy configuration is correct
- **Rate limiting**: Verify KV environment variables for Upstash
- **Canvas performance**: Check viewport culling and image sizing
- **AI generation failures**: Verify fal.ai API key and model parameters
- **Asset sync**: Check network connectivity and Convex deployment status
- **SSR hydration**: Ensure server and client data consistency

### Performance Issues
- Monitor canvas rendering performance with React DevTools Profiler
- Check Convex query performance and caching
- Verify image sizes and compression
- Monitor memory usage with large video files
- Use server-side rendering for faster initial loads
- Optimize asset synchronization frequency


## Technical Requirements

- Always add `TSdocs` to your code.
- Always sort all props, fields, functions and type properties in alphabetical order.
- Always use the Compound Component Pattern while creating new components.
- Never compromise on security for the sake of speed. Always validate your solution for possible security vulnerabilities.
- Never hardcode strings, always extract them into constants for reuse.
- Make the components accessible following the WCAG 2.1 guidelines.
- Treat UI's as a thin layer over your data. Avoid local state (e.g. `useState`) unless it is absolutely necessary and clearly separate from business logic. Use `useRef` for variables that don't need to be reactive and Jotai's `useAtom` for global state.
- When you find yourself with nested if/else statements or complex conditional rendering, create a new component. Reserve inline ternaries for tiny, readable sections.
- Choose to derive data rather than using useEffect. Only use useEffect to synchronise with an external system (e.g. document-level events). This can cause confusion over what the logic is doing. Explicitly define logic rather than depending on implicit reactive behaviour.
- Treat `setTimeout` as a last resort and always comment on why.
- Do NOT add useless comments. Avoid adding comments unless you are clarifying a race condition (e.g. setTimeout), a long-term TODO or a confusing piece of code that even a senior engineer wouldn't initially understand.
- Before hardcoding any values, consider whether they might be used elsewhere in the code. All of our code should adhere to the DRY principle.
- Do NOT create unnecessary Markdown summary files.
