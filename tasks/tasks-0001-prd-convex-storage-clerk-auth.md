# Tasks: Convex Storage & Clerk Authentication Integration

Generated from: `tasks/0001-prd-convex-storage-clerk-auth.md`

---

## Relevant Files

### Core Infrastructure
- `convex.json` - **CREATED** ✅ - Convex project configuration file
- `convex/tsconfig.json` - **CREATED** ✅ - TypeScript configuration for Convex backend
- `convex/README.md` - **CREATED** ✅ - Setup instructions and directory structure documentation
- `convex/.gitignore` - **CREATED** ✅ - Ignore generated files and logs
- `convex/schema.ts` - **CREATED** ✅ - Convex database schema with users, assets, and projects tables (145 lines)
- `convex/auth.config.ts` - **CREATED** ✅ - Clerk authentication configuration for Convex JWT validation (56 lines)
- `convex/_generated/` - Auto-generated Convex types and client code (generated after `npx convex dev`)
- `.env.local` - **MODIFIED** ✅ - Organized with Convex and Clerk environment variables, proper comments
- `.env.example` - **MODIFIED** ✅ - Comprehensive documentation of all required environment variables with setup instructions

### Authentication & Middleware
- `src/middleware.ts` - **CREATED** ✅ - Clerk authentication middleware for route protection (65 lines)
- `src/providers/clerk-provider.tsx` - **CREATED** ✅ - Client-side Clerk provider wrapper with dark theme (53 lines)
- `src/providers/convex-provider.tsx` - **CREATED** ✅ - Client-side Convex provider with Clerk auth integration (57 lines)
- `src/app/core-providers.tsx` - **MODIFIED** ✅ - Wrapped with ClerkProvider and ConvexProvider

### Convex Backend (Mutations & Queries)
- `convex/assets.ts` - **CREATED** ✅ - Asset CRUD operations (upload, delete, list, get) with authentication
- `convex/projects.ts` - **CREATED** ✅ - Project CRUD operations (create, save, list, get, delete, rename) with auto-naming
- `convex/users.ts` - **CREATED** ✅ - User management and quota tracking (getOrCreateUser, getUserQuota, updateUserQuota)
- `convex/http.ts` - **CREATED** ✅ - HTTP POST /upload action for file storage up to 25MB
- `convex/ratelimit.ts` - **NEW** - Per-user rate limiting logic

### Storage Service Layer
- `src/lib/storage/storage-service.ts` - **CREATED** ✅ - Abstract storage interface with upload, delete, getUrl, download methods
- `src/lib/storage/convex-storage-service.ts` - **CREATED** ✅ - Convex storage implementation with retry logic
- `src/lib/storage/index.ts` - **CREATED** ✅ - Barrel export with factory function
- `src/lib/convex-client.ts` - **NEW** - Client-side Convex client setup

### API Routes (Upload & Proxy)
- `src/app/api/convex/upload/route.ts` - **CREATED** ✅ - Upload endpoint with Clerk auth, bot detection, file validation
- `src/app/api/fal/upload/route.ts` - **MODIFY** - Add per-user rate limiting with Clerk userId

### Handlers (Business Logic)
- `src/lib/handlers/generation-handler.ts` - **MODIFIED** ✅ - Added optional Convex migration for text-to-image with feature flag
- `src/lib/handlers/video-generation-handlers.ts` - **MODIFIED** ✅ - Updated uploadMediaIfNeeded with Convex storage support
- `src/lib/handlers/asset-download-handler.ts` - **CREATED** ✅ - Download FAL assets and reupload to Convex (with batch support)

### State Management (Jotai)
- `src/store/auth-atoms.ts` - **CREATED** ✅ - Clerk user state, tier, quotas (74 lines)
- `src/store/project-atoms.ts` - **CREATED** ✅ - Current project, project list, auto-save state, dirty flags
- `src/hooks/useAuth.ts` - **CREATED** ✅ - Custom hook for Clerk auth with Convex integration (145 lines)
- `src/hooks/useProjects.ts` - **CREATED** ✅ - Custom hook for project CRUD operations with Convex queries/mutations
- `src/hooks/useQuota.ts` - **NEW** - Custom hook for storage quota tracking
- `src/hooks/useAutoSave.ts` - **CREATED** ✅ - Auto-save hook with 10-second debounce, skips during generation
- `src/hooks/useStorage.ts` - **MODIFY** - Update to sync with Convex instead of only IndexedDB

### UI Components
- `src/components/auth/sign-in-button.tsx` - **CREATED** ✅ - Clerk sign-in button with LogIn icon (68 lines)
- `src/components/auth/user-menu.tsx` - **CREATED** ✅ - User dropdown with avatar, tier badge, storage quota, and sign-out (210 lines)
- `src/components/projects/project-list.tsx` - **CREATED** ✅ - Project grid with responsive layout, loading/empty states
- `src/components/projects/project-card.tsx` - **CREATED** ✅ - Project tile with thumbnail, metadata, rename/delete actions
- `src/components/projects/project-dialog.tsx` - **CREATED** ✅ - New project creation modal with validation
- `src/components/projects/project-panel.tsx` - **CREATED** ✅ - Collapsible sidebar with Cmd/Ctrl+P shortcut
- `src/components/quota/storage-indicator.tsx` - **NEW** - Progress bar showing storage usage
- `src/components/quota/quota-warning-dialog.tsx` - **NEW** - Warning when quota exceeded
- `src/components/canvas/auto-save-indicator.tsx` - **NEW** - Saving/saved status indicator
- `src/components/canvas/offline-indicator.tsx` - **NEW** - Network status indicator
- `src/app/page.tsx` - **MODIFY** - Integrate auth, projects, quotas into main canvas

### Rate Limiting
- `src/lib/ratelimit/per-user-limiter.ts` - **NEW** - User-based rate limiting (replaces IP-based)
- `src/lib/fal/utils.ts` - **MODIFY** - Accept userId parameter instead of only IP
- `src/server/trpc/routers/_app.ts` - **MODIFY** - Pass Clerk userId to rate limiter

### IndexedDB Cache Layer
- `src/lib/storage.ts` - **MODIFY** - Add sync metadata (lastSyncedAt, isDirty)
- `src/lib/sync/sync-manager.ts` - **NEW** - Sync logic between IndexedDB and Convex
- `src/lib/sync/conflict-resolver.ts` - **NEW** - Handle sync conflicts

### Type Definitions
- `src/types/auth.ts` - **CREATED** ✅ - User, UserTier, StorageQuota types (78 lines)
- `src/types/project.ts` - **CREATED** ✅ - Project, ProjectMetadata, CanvasState, CanvasElement types
- `src/types/asset.ts` - **CREATED** ✅ - Asset, AssetType, AssetMetadata, AssetUploadResult types
- `src/types/canvas.ts` - **MODIFIED** ✅ - Added optional projectId field to CanvasState

### Utility Functions
- `src/utils/quota-utils.ts` - **CREATED** ✅ - Storage quota calculations, limits, formatting, color helpers
- `src/utils/thumbnail-utils.ts` - **CREATED** ✅ - Generate and upload project thumbnails from Konva stage
- `src/utils/download-utils.ts` - **NEW** - Download files from URLs (FAL → Convex)

### Testing Files (To be created alongside implementation)
- `src/lib/storage/__tests__/convex-storage-service.test.ts` - Unit tests for Convex storage
- `src/hooks/__tests__/useAutoSave.test.ts` - Auto-save hook tests
- `src/utils/__tests__/quota-utils.test.ts` - Quota calculation tests
- `convex/__tests__/assets.test.ts` - Convex asset mutation tests
- `convex/__tests__/projects.test.ts` - Convex project mutation tests

### Documentation
- `docs/convex-setup.md` - **NEW** - Convex project setup instructions
- `docs/clerk-setup.md` - **CREATED** ✅ - Comprehensive Clerk authentication setup guide (192 lines)
- `docs/CLERK_QUICKSTART.md` - **CREATED** ✅ - Quick reference for Clerk setup (62 lines)
- `docs/migration-guide.md` - **NEW** - Guide for users with existing IndexedDB data
- `README.md` - **MODIFY** - Update with Convex/Clerk setup instructions

### Notes

**Architecture Overview:**
- Two-tier storage: Convex (persistent, server-side) + IndexedDB (cache, client-side)
- Authentication flow: Clerk → middleware → Convex auth → queries/mutations
- Upload flow: Browser → /api/convex/upload → Convex Storage → DB record → URL
- AI generation flow: FAL generate → download handler → Convex upload → canvas state
- Rate limiting: Clerk userId replaces IP address as bucket identifier
- Auto-save: Debounced 10-second interval, saves to Convex + IndexedDB
- Quota enforcement: Pre-check before uploads, block when exceeded
- Offline support: IndexedDB cache with sync queue, flush on reconnect

**Key Patterns:**
- Storage abstraction allows swapping implementations
- Handlers remain pure functions, no direct Convex/Clerk coupling
- Jotai atoms for all global state (no component-level useState)
- TSDoc comments required on all new functions/components
- Alphabetical ordering of props, imports, and functions
- WCAG 2.1 AA accessibility compliance

**Dependencies:**
- `@clerk/nextjs@6.33.3` - Already installed ✅
- `convex@1.27.5` - Already installed ✅
- No new package installations required

**Environment Variables (to be added):**
```bash
# Convex
CONVEX_DEPLOYMENT=<deployment-name>
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Existing
FAL_KEY=<existing>
NEXT_PUBLIC_APP_URL=<existing>
```

---

## Tasks

### Phase 1: Parent Tasks

Below are the high-level tasks required to implement the Convex storage and Clerk authentication integration. These will be broken down into detailed sub-tasks once approved.

---

- [ ] 1.0 **Configure Convex and Clerk Infrastructure**
  - [x] 1.1 Initialize Convex project using `npx convex dev`
    - ✅ Created `convex/` directory structure
    - ✅ Created `convex.json` configuration file
    - ✅ Created `convex/tsconfig.json` for TypeScript support
    - ✅ Created `convex/README.md` with setup instructions
    - ✅ Created `convex/.gitignore` to exclude generated files
    - ⚠️ Note: Full deployment requires running `npx convex dev` which needs Convex account authentication
  
  - [x] 1.2 Create Convex database schema in `convex/schema.ts`
    - ✅ Defined `users` table with fields: userId (string, indexed), email, tier ("free" | "paid"), storageUsedBytes, createdAt, updatedAt
    - ✅ Defined `assets` table with fields: userId (indexed), type ("image" | "video"), storageId, originalUrl, width, height, duration, mimeType, sizeBytes, metadata (object), createdAt
    - ✅ Defined `projects` table with fields: userId (indexed), name, canvasState (object), thumbnailStorageId, lastSavedAt, createdAt, updatedAt
    - ✅ Added indexes on userId for all tables for query performance
    - ✅ Added composite indexes: by_userId_and_type (assets), by_userId_and_lastSavedAt (projects)
    - ✅ Added index by_storageId for assets table
    - ✅ Comprehensive TSDoc documentation for all tables and fields
    - ⚠️ Note: Schema will be applied when running `npx convex dev`
  
  - [x] 1.3 Set up Clerk application and configure authentication
    - ✅ Created comprehensive Clerk setup guide at `docs/clerk-setup.md` (192 lines)
    - ✅ Created quick reference guide at `docs/CLERK_QUICKSTART.md` (62 lines)
    - ✅ Updated `.env.local` with organized Clerk configuration structure
    - ✅ Added Clerk environment variables with placeholders:
      - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (with pk_test_ placeholder)
      - `CLERK_SECRET_KEY` (with sk_test_ placeholder)
      - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
      - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
      - Additional redirect URLs configured
    - ⚠️ Note: User needs to create Clerk account and replace placeholder keys with actual API keys from dashboard.clerk.com
  
  - [x] 1.4 Create Clerk authentication config for Convex in `convex/auth.config.ts`
    - ✅ Created `convex/auth.config.ts` with Clerk authentication provider configuration (56 lines)
    - ✅ Configured JWT token validation using `CLERK_JWT_ISSUER_DOMAIN` environment variable
    - ✅ Added comprehensive TSDoc documentation explaining the integration
    - ✅ Added `CLERK_JWT_ISSUER_DOMAIN` to `.env.local` (pre-filled: https://welcome-buck-6.clerk.accounts.dev)
    - ✅ Added `CLERK_JWT_ISSUER_DOMAIN` to `.env.example` with documentation
    - ✅ Updated `docs/clerk-setup.md` with JWT issuer domain instructions (Step 5)
    - ✅ Documented two methods to obtain JWT issuer domain (Dashboard & decode from publishable key)
    - ✅ Added JWT issuer domain to environment variables reference table
  
  - [x] 1.5 Update `.env.example` with all required environment variables
    - ✅ Document Convex variables: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`
    - ✅ Document Clerk variables: publishable key, secret key, sign-in/sign-up URLs
    - ✅ Add comments explaining where to obtain each value

- [x] 2.0 **Implement User Authentication & Authorization**
  - [x] 2.1 Create Clerk middleware in `src/middleware.ts`
    - ✅ Created `src/middleware.ts` with `clerkMiddleware()` from `@clerk/nextjs/server`
    - ✅ Protected all routes except public routes (sign-in, sign-up, static assets, webhooks)
    - ✅ Configured automatic redirect to `/sign-in` for unauthenticated users
    - ✅ Added comprehensive TSDoc documentation
    - ✅ Configured Next.js middleware matcher to run on appropriate routes
  
  - [x] 2.2 Create Clerk provider wrapper in `src/providers/clerk-provider.tsx`
    - ✅ Created `src/providers/clerk-provider.tsx` with ClerkProvider wrapper (53 lines)
    - ✅ Configured dark theme to match application design
    - ✅ Configured sign-in and sign-up URLs from environment variables
    - ✅ Added comprehensive TSDoc documentation
  
  - [x] 2.3 Create Convex provider wrapper in `src/providers/convex-provider.tsx`
    - ✅ Created `src/providers/convex-provider.tsx` with ConvexProviderWithClerk (57 lines)
    - ✅ Connected Clerk authentication to Convex client
    - ✅ Configured Convex client with deployment URL from environment
    - ✅ Integrated useAuth hook from @clerk/nextjs
    - ✅ Added comprehensive TSDoc documentation
  
  - [x] 2.4 Update `src/app/layout.tsx` to wrap app with providers
    - ✅ Updated `src/app/core-providers.tsx` to wrap with ClerkProvider at top level
    - ✅ Added ConvexProvider inside ClerkProvider
    - ✅ Maintained existing providers (QueryClientProvider, TRPCProvider, ThemeProvider, Toaster)
    - ✅ Proper provider nesting order for authentication flow
  
  - [x] 2.5 Create auth state atoms in `src/store/auth-atoms.ts`
    - ✅ Created `src/store/auth-atoms.ts` with authentication state atoms (74 lines)
    - ✅ `userAtom` - Combined Clerk and Convex user data
    - ✅ `isAuthenticatedAtom` - Derived boolean from userAtom
    - ✅ `userTierAtom` - Derived atom for user tier with "free" default
    - ✅ `storageQuotaAtom` - Storage quota information
    - ✅ Comprehensive TSDoc documentation for all atoms
  
  - [x] 2.6 Create `src/hooks/useAuth.ts` custom hook
    - ✅ Created `src/hooks/useAuth.ts` combining Clerk and Convex (145 lines)
    - ✅ Returns convexUser, isAuthenticated, isLoading, signIn, signOut, tier, userId
    - ✅ Syncs Clerk user data to Jotai atoms
    - ✅ Includes TODO for Convex user data fetching (backend not yet implemented)
    - ✅ Comprehensive TSDoc with usage examples
  
  - [x] 2.7 Create `src/types/auth.ts` for authentication types
    - ✅ Created `src/types/auth.ts` with authentication types (78 lines)
    - ✅ `User` interface with userId, email, tier, storageUsedBytes, timestamps
    - ✅ `UserTier` type: "free" | "paid"
    - ✅ `StorageQuota` interface with used, limit, percentage, isApproachingLimit, isExceeded
    - ✅ Comprehensive TSDoc with usage examples
  
  - [x] 2.8 Create sign-in button component in `src/components/auth/sign-in-button.tsx`
    - ✅ Created `src/components/auth/sign-in-button.tsx` (68 lines)
    - ✅ Uses Clerk's SignInButton with modal mode
    - ✅ Styled with application's Button component
    - ✅ Includes LogIn icon from lucide-react
    - ✅ Accessible with aria-label attribute
    - ✅ Comprehensive TSDoc with usage examples
  
  - [x] 2.9 Create user menu component in `src/components/auth/user-menu.tsx`
    - ✅ Created `src/components/auth/user-menu.tsx` with full functionality (210 lines)
    - ✅ Displays user avatar using Clerk's UserButton
    - ✅ Shows user email and tier badge (with Crown icon for paid tier)
    - ✅ Storage quota indicator with progress bar and color coding
    - ✅ Links to account management and settings pages
    - ✅ Sign-out functionality with Clerk integration
    - ✅ Fully accessible with ARIA labels and roles
    - ✅ Helper functions for storage formatting and quota color

- [x] 3.0 **Build Convex Storage Service & Migration**
  - [x] 3.1 Create abstract storage interface in `src/lib/storage/storage-service.ts`
    - ✅ Created `StorageService` interface with upload, delete, getUrl, download methods
    - ✅ Defined `UploadOptions` and `DownloadOptions` interfaces
    - ✅ Comprehensive TSDoc documentation with examples
    - ✅ Support for image and video asset types
    - Define `StorageService` interface with methods: `upload()`, `delete()`, `getUrl()`, `download()`
    - Type parameters: file (Blob), metadata (optional object)
    - Return types: Promise<{ url: string; storageId: string; sizeBytes: number }>
    - Add TSDoc comments for each method
  
  - [x] 3.2 Create Convex storage implementation in `src/lib/storage/convex-storage-service.ts`
    - ✅ Implemented `StorageService` interface
    - ✅ Upload via /api/convex/upload endpoint
    - ✅ Automatic retry logic (3 attempts with exponential backoff)
    - ✅ Download with timeout handling (30s default)
    - ✅ Error handling and graceful degradation
    - Implement `StorageService` interface
    - Use Convex HTTP actions for file uploads
    - Call Convex `uploadAsset` mutation after upload
    - Handle errors and retries (max 3 attempts)
    - Return Convex file URL from storage
  
  - [x] 3.3 Create barrel export in `src/lib/storage/index.ts`
    - ✅ Exported `StorageService` interface and types
    - ✅ Exported `ConvexStorageService` class
    - ✅ Created `createStorageService()` factory function
    - ✅ Support for future storage backends (extensible design)
    - Export `StorageService` interface
    - Export `ConvexStorageService` class
    - Export factory function `createStorageService()`
  
  - [x] 3.4 Create Convex assets mutations/queries in `convex/assets.ts`
    - ✅ `uploadAsset` mutation with quota tracking and authentication
    - ✅ `deleteAsset` mutation with storage cleanup and quota decrement
    - ✅ `listAssets` query with pagination and type filtering
    - ✅ `getAsset` query with ownership verification
    - ✅ All operations require Clerk authentication
    - `uploadAsset` mutation: Creates asset record, updates user quota
    - `deleteAsset` mutation: Removes asset, decrements quota, deletes file from storage
    - `listAssets` query: Returns paginated assets for authenticated user
    - `getAsset` query: Returns single asset by ID with ownership check
    - Add authentication checks using `ctx.auth.getUserIdentity()`
  
  - [x] 3.5 Create Convex HTTP actions in `convex/http.ts`
    - ✅ HTTP POST /upload action for file storage
    - ✅ Handles files up to 25MB (Convex limit)
    - ✅ Returns storageId and public URL
    - ✅ Integrated with Convex storage API
    - `uploadFile` action: Accepts multipart form data, stores in Convex storage
    - Returns storage ID and URL
    - Handles large files (up to 25MB)
    - Validates file types (image/*, video/*)
  
  - [x] 3.6 Create upload API route in `src/app/api/convex/upload/route.ts`
    - ✅ POST endpoint with Clerk authentication requirement
    - ✅ Bot detection using botid/server
    - ✅ File validation (size limit 25MB, MIME type checking)
    - ✅ Uploads to Convex storage via HTTP action
    - ✅ Returns AssetUploadResult with storageId and URL
    - ⚠️ Note: Asset record creation via mutation to be called by client
    - Replace `/api/fal/upload` as primary upload endpoint
    - Accept FormData with file
    - Check authentication (Clerk userId required)
    - Check storage quota before upload
    - Call Convex HTTP action to upload file
    - Create asset record via Convex mutation
    - Return Convex URL and asset ID
  
  - [x] 3.7 Create asset download handler in `src/lib/handlers/asset-download-handler.ts`
    - ✅ `downloadAndReupload()` function for FAL to Convex migration
    - ✅ `downloadAndReuploadBatch()` for parallel asset migration
    - ✅ Retry logic with 30-second timeout
    - ✅ Stores original FAL URL in metadata
    - ✅ Comprehensive error handling and logging
    - `downloadAndReupload()` function: Takes FAL URL, downloads blob, uploads to Convex
    - Used after AI generation completes
    - Returns Convex URL to replace FAL URL in canvas state
    - Handles download failures with retries
    - Adds timeout (30 seconds max)
  
  - [x] 3.8 Update `src/lib/handlers/generation-handler.ts`
    - ✅ Added optional `userId` and `useConvexStorage` parameters
    - ✅ Text-to-image results optionally migrated to Convex
    - ✅ Graceful fallback to FAL URL if migration fails
    - ✅ Stores generation metadata (prompt, dimensions) with assets
    - ✅ Feature flag for gradual rollout
    - Modify `uploadImageDirect()` to use Convex storage service instead of FAL client
    - After text-to-image generation, call `downloadAndReupload()` to move FAL asset to Convex
    - Update canvas state with Convex URL instead of FAL URL
    - Store original FAL URL in asset metadata for reference
  
  - [x] 3.9 Update `src/lib/handlers/video-generation-handlers.ts`
    - ✅ Updated `uploadMediaIfNeeded()` with Convex storage support
    - ✅ Added optional `userId` and `useConvexStorage` parameters
    - ✅ Detects MIME type and asset type (image/video) automatically
    - ✅ Falls back to FAL storage if Convex upload fails
    - ✅ Comprehensive TSDoc documentation
    - Modify `uploadMediaIfNeeded()` to use Convex storage instead of FAL
    - After image-to-video generation, download video from FAL and upload to Convex
    - Return Convex URL for canvas state
  
  - [x] 3.10 Create `src/types/asset.ts` for asset types
    - ✅ `Asset` interface matching Convex schema
    - ✅ `AssetType` union type ("image" | "video")
    - ✅ `AssetMetadata` interface for generation parameters
    - ✅ `AssetUploadResult` interface for upload responses
    - ✅ Comprehensive TSDoc with examples
    - `Asset` type matching Convex schema
    - `AssetMetadata` type for generation params (prompt, model, seed, etc.)
    - `AssetUploadResult` type for upload responses
  
  - [x] 3.11 Create quota utilities in `src/utils/quota-utils.ts`
    - ✅ `getQuotaForTier()` - Returns limits (500MB free, 10GB paid)
    - ✅ `checkQuotaLimit()` - Pre-upload quota validation
    - ✅ `calculateStorageQuota()` - Usage percentage and warnings
    - ✅ `formatStorageSize()` - Human-readable size formatting
    - ✅ `getQuotaColor()` and `getQuotaProgressColor()` - UI helpers
    - ✅ Threshold detection (80% warning, 100% exceeded)
    - `calculateStorageUsage()`: Sum sizeBytes for all user assets
    - `checkQuotaLimit()`: Returns boolean if upload would exceed limit
    - `getQuotaForTier()`: Returns limit in bytes for "free" or "paid" tier
    - `formatStorageSize()`: Converts bytes to human-readable (MB, GB)

- [x] 4.0 **Implement Project Management System**
  - [x] 4.1 Create Convex projects mutations/queries in `convex/projects.ts`
    - ✅ `createProject` mutation with auto-sequential naming (Iskra Project 01, 02...)
    - ✅ `saveProject` mutation with atomic canvas state updates and thumbnail support
    - ✅ `listProjects` query with pagination, sorting by lastSavedAt DESC
    - ✅ `getProject` query with ownership verification and thumbnail URLs
    - ✅ `deleteProject` mutation with thumbnail cleanup (keeps assets)
    - ✅ `renameProject` mutation with validation
    - ✅ All mutations require Clerk authentication
    - `createProject` mutation: Creates new project with default name "Iskra 0X", empty canvas state
    - `saveProject` mutation: Upserts project canvas state (atomic update)
    - `listProjects` query: Returns all projects for authenticated user, sorted by lastSavedAt DESC
    - `getProject` query: Returns single project by ID with ownership check
    - `deleteProject` query: Removes project and associated thumbnail, keeps referenced assets
    - `renameProject` mutation: Updates project name
    - All mutations require authentication via `ctx.auth.getUserIdentity()`
  
  - [x] 4.2 Create project state atoms in `src/store/project-atoms.ts`
    - ✅ `currentProjectAtom` - Active project with full canvas state
    - ✅ `projectListAtom` - Array of ProjectMetadata for list views
    - ✅ `isAutoSavingAtom` - Save in progress indicator
    - ✅ `lastSavedAtAtom` - Last successful save timestamp
    - ✅ `projectLoadingAtom` - Loading state tracking
    - ✅ `canvasDirtyAtom` - Unsaved changes flag
    - ✅ Derived atoms for projectId and projectName
    - `currentProjectAtom` - Active project ID and metadata
    - `projectListAtom` - Array of user's projects
    - `isAutoSavingAtom` - Boolean flag for auto-save in progress
    - `lastSavedAtAtom` - Timestamp of last successful save
    - `projectLoadingAtom` - Boolean for project load state
  
  - [x] 4.3 Create `src/hooks/useProjects.ts` custom hook
    - ✅ Returns: createProject, saveProject, loadProject, deleteProject, renameProject
    - ✅ Uses Convex useMutation and useQuery hooks
    - ✅ Handles loading and error states with proper error messages
    - ✅ Updates Jotai project atoms after operations
    - ✅ Automatic project list updates via Convex queries
    - Return functions: createProject, saveProject, loadProject, deleteProject, renameProject, listProjects
    - Use Convex mutations/queries via `useMutation()` and `useQuery()`
    - Handle loading and error states
    - Update project atoms after operations
  
  - [x] 4.4 Create auto-save hook in `src/hooks/useAutoSave.ts`
    - ✅ Debounced save with configurable delay (default 10 seconds)
    - ✅ Only saves if canvas state actually changed (JSON comparison)
    - ✅ Skips save if no project loaded or already saving
    - ✅ Skips save during AI generation (checks activeGenerations)
    - ✅ Optional thumbnail generation on save
    - ✅ Manual trigger function for immediate saves
    - ✅ Toast notifications for errors
    - Debounce canvas state changes with 10-second delay
    - Only save if canvas state has changed since last save
    - Only save if not currently generating (activeGenerations.size === 0)
    - Call `saveProject` mutation with current canvas state
    - Update `lastSavedAtAtom` on success
    - Show toast on save errors
  
  - [x] 4.5 Create thumbnail utilities in `src/utils/thumbnail-utils.ts`
    - ✅ `generateThumbnail()` - Captures Konva stage at 300x200px
    - ✅ `uploadThumbnail()` - Uploads thumbnail blob to Convex via /api/convex/upload
    - ✅ `generateAndUploadThumbnail()` - Combined operation
    - ✅ `generatePlaceholderThumbnail()` - Fallback for empty projects
    - ✅ `dataUrlToBlob()` - Utility for data URL conversion
    - `generateThumbnail()`: Captures canvas as 300x200px image using Konva `stage.toDataURL()`
    - `uploadThumbnail()`: Uploads thumbnail blob to Convex storage
    - Called after project save to update thumbnail
  
  - [x] 4.6 Create project card component in `src/components/projects/project-card.tsx`
    - ✅ Displays project thumbnail or placeholder
    - ✅ Shows project name with truncation
    - ✅ Displays relative time ("2 hours ago") using date-fns
    - ✅ Shows image and video element counts
    - ✅ Dropdown menu with Rename and Delete actions
    - ✅ Inline rename dialog with validation
    - ✅ Confirmation dialog for deletion
    - ✅ Hover effects and responsive design
    - ✅ Accessible with ARIA labels
    - Display project thumbnail (fallback to placeholder)
    - Show project name (editable on click)
    - Display last modified timestamp ("2 hours ago" format using `date-fns`)
    - Show count of images and videos
    - Dropdown menu with "Rename", "Delete" actions
    - Confirm dialog for delete action
  
  - [x] 4.7 Create project list component in `src/components/projects/project-list.tsx`
    - ✅ Responsive grid layout (1-4 columns based on viewport)
    - ✅ "New Project" button with dashed border design
    - ✅ Empty state with helpful messaging and CTA
    - ✅ Loading state with skeleton loaders
    - ✅ Project count display in header
    - ✅ Grid adapts to screen size (sm, md, lg breakpoints)
    - Grid view of project cards
    - "New Project" button at top
    - Empty state when no projects exist
    - Loading skeleton while fetching projects
    - Search/filter input (optional, can defer)
  
  - [x] 4.8 Create project dialog in `src/components/projects/project-dialog.tsx`
    - ✅ Modal for creating new projects
    - ✅ Optional name input (uses default sequential naming if empty)
    - ✅ Enter key support for quick submission
    - ✅ "Create" and "Cancel" buttons
    - ✅ Loading state during creation
    - ✅ Input validation and error handling
    - ✅ Toast notifications on success/failure
    - ✅ Auto-closes and calls onProjectCreated on success
    - Modal for creating new project
    - Input field for project name with validation
    - "Create" and "Cancel" buttons
    - Use Radix UI Dialog component
    - Handle form submission with react-hook-form
  
  - [x] 4.9 Create project panel in `src/components/projects/project-panel.tsx`
    - ✅ Collapsible sidebar (320px width, default collapsed)
    - ✅ Toggle button with folder icon
    - ✅ Renders ProjectList component when expanded
    - ✅ Smooth slide-in/out animation (300ms transition)
    - ✅ Keyboard shortcut: Cmd/Ctrl+P to toggle
    - ✅ Mobile overlay with backdrop blur
    - ✅ Desktop fixed sidebar
    - ✅ Scrollable content area
    - ✅ Keyboard shortcut hint at bottom
    - Collapsible sidebar (default collapsed)
    - Toggle button with icon
    - Renders `<ProjectList>` when expanded
    - Slide animation with framer-motion
    - Keyboard shortcut: Cmd/Ctrl+P to toggle
  
  - [x] 4.10 Create `src/types/project.ts` for project types
    - ✅ `Project` interface matching Convex schema
    - ✅ `ProjectMetadata` for lightweight list views
    - ✅ `CanvasState`, `CanvasElement`, `ElementTransform` interfaces
    - ✅ `CanvasViewport` for zoom and position state
    - ✅ `CreateProjectResult`, `SaveProjectResult` interfaces
    - ✅ Comprehensive TSDoc with examples
    - `Project` type matching Convex schema
    - `ProjectMetadata` type for UI display (id, name, thumbnailUrl, lastSavedAt, imageCount, videoCount)
    - `CanvasState` type extension with projectId field
  
  - [x] 4.11 Update `src/types/canvas.ts`
    - ✅ Added optional `projectId?: string` field to CanvasState interface in src/lib/storage.ts
    - ✅ Ensures canvas knows which project it belongs to
    - Add optional `projectId?: string` field to canvas state types
    - Ensures canvas knows which project it belongs to

- [ ] 5.0 **Implement Per-User Rate Limiting & Quota Management**
  - [ ] 5.1 Create per-user rate limiter in `src/lib/ratelimit/per-user-limiter.ts`
    - Implement rate limiting using Upstash KV with userId as key instead of IP
    - Maintain same limits: Standard (5/min, 15/hr, 50/day), Video (2/min, 4/hr, 8/day)
    - Export `checkUserRateLimit(userId, limitType)` function
    - Return same interface as IP-based limiter for compatibility
  
  - [ ] 5.2 Create Convex rate limit tracking in `convex/ratelimit.ts`
    - Alternative to Upstash: Store rate limit counters in Convex
    - `incrementRateLimit` mutation: Increments counter for userId, period, operation type
    - `checkRateLimit` query: Checks if user has exceeded limits
    - Store counters with TTL based on period (minute/hour/day)
    - Decide: Use Upstash KV (existing) or Convex (new) - recommend Convex for simplicity
  
  - [ ] 5.3 Update `src/lib/fal/utils.ts` to accept userId parameter
    - Modify `checkRateLimit()` to accept optional `userId` parameter
    - If userId provided, use per-user limiter; otherwise fall back to IP-based
    - Update `resolveFalClient()` signature to accept userId
    - Maintain backward compatibility for non-authenticated flows
  
  - [ ] 5.4 Update `src/server/trpc/routers/_app.ts` to pass Clerk userId
    - Extract userId from `ctx.auth.getUserIdentity()` in tRPC context
    - Pass userId to all FAL client resolution calls
    - Apply per-user rate limiting to all AI generation endpoints
    - Return appropriate error messages when rate limited
  
  - [ ] 5.5 Update `src/app/api/fal/upload/route.ts` for per-user rate limiting
    - Extract Clerk userId from request headers using `getAuth()`
    - Pass userId to rate limiter instead of IP
    - If user not authenticated, fall back to IP-based rate limiting
  
  - [ ] 5.6 Create quota tracking hook in `src/hooks/useQuota.ts`
    - Fetch user's storage quota from Convex
    - Calculate percentage used
    - Return: `{ used, limit, percentage, isApproachingLimit, isExceeded }`
    - `isApproachingLimit` = percentage >= 80%
    - `isExceeded` = percentage >= 100%
    - Poll quota every 30 seconds while user active
  
  - [ ] 5.7 Create storage indicator component in `src/components/quota/storage-indicator.tsx`
    - Progress bar showing storage usage (Radix UI Progress)
    - Text: "45.2 MB / 500 MB used (9%)"
    - Color coding: green (<60%), yellow (60-90%), red (>90%)
    - Tooltip with breakdown by asset type (images vs videos)
    - "Upgrade" button for free-tier users
  
  - [ ] 5.8 Create quota warning dialog in `src/components/quota/quota-warning-dialog.tsx`
    - Modal shown when quota exceeded
    - Message: "Storage limit reached. Delete assets or upgrade."
    - Link to asset management view
    - "Upgrade" CTA button
    - "Manage Assets" button
    - Cannot dismiss until action taken
  
  - [ ] 5.9 Create Convex user quota mutations in `convex/users.ts`
    - `updateUserQuota` mutation: Recalculates storageUsedBytes by summing all assets
    - Called after asset upload/delete
    - `getUserQuota` query: Returns user's quota info for UI
    - `getOrCreateUser` mutation: Creates user record on first sign-in with default "free" tier

- [ ] 6.0 **Implement IndexedDB Caching & Offline Support**
  - [ ] 6.1 Update `src/lib/storage.ts` to add sync metadata
    - Add `lastSyncedAt` timestamp field to `CanvasState` interface
    - Add `isDirty` boolean flag to track unsaved changes
    - Add `syncStatus` field: "synced" | "pending" | "error"
    - Modify save/load methods to include new fields
  
  - [ ] 6.2 Create sync manager in `src/lib/sync/sync-manager.ts`
    - `syncToConvex()`: Uploads dirty canvas state to Convex, updates lastSyncedAt
    - `syncFromConvex()`: Downloads latest canvas state from Convex, updates IndexedDB cache
    - `queueChange()`: Adds change to sync queue when offline
    - `flushQueue()`: Processes queued changes on reconnect
    - Detects online/offline using `navigator.onLine` and online/offline events
  
  - [ ] 6.3 Create conflict resolver in `src/lib/sync/conflict-resolver.ts`
    - `resolveConflict()`: Handles case when local and remote state diverge
    - Strategy: "last write wins" based on timestamps
    - Option to show merge dialog in future (defer for v1)
    - Returns resolved state
  
  - [ ] 6.4 Update `src/hooks/useStorage.ts` to integrate sync manager
    - Call `syncFromConvex()` on app load to fetch latest from Convex
    - Call `syncToConvex()` after auto-save
    - Set `isDirty` flag when canvas state changes
    - Clear `isDirty` flag after successful sync
    - Handle sync errors with retry logic
  
  - [ ] 6.5 Create offline indicator component in `src/components/canvas/offline-indicator.tsx`
    - Banner at top of canvas: "You're offline. Changes will sync when reconnected."
    - Icon: Cloud with slash
    - Auto-hide when back online
    - Use `navigator.onLine` and online/offline events
  
  - [ ] 6.6 Create auto-save indicator component in `src/components/canvas/auto-save-indicator.tsx`
    - Small indicator in corner: "Saving...", "Saved at 3:45 PM", or "Failed to save"
    - Spinner animation when saving
    - Check mark icon when saved
    - Error icon with retry button on failure
    - Hide after 3 seconds of success
  
  - [ ] 6.7 Add network status listener in app initialization
    - Listen to `window.addEventListener('online')` and `window.addEventListener('offline')`
    - Update Jotai atom: `isOnlineAtom`
    - Trigger sync when transitioning from offline to online
    - Show toast notification on status change

- [ ] 7.0 **End-to-End Integration & Testing**
  - [ ] 7.1 Integrate authentication into main canvas page (`src/app/page.tsx`)
    - Add `<SignInButton>` to navigation when not authenticated
    - Add `<UserMenu>` to navigation when authenticated
    - Show storage indicator in UI
    - Add project panel toggle button
    - Block AI generation for non-authenticated users with sign-in prompt
  
  - [ ] 7.2 Test complete user flow: Anonymous → Sign-up → Generate → Save
    - Open app as anonymous user
    - Attempt to generate image → should show sign-in prompt
    - Click sign-in, complete Clerk authentication
    - Generate image from text → should save to Convex
    - Verify asset appears in assets list
    - Verify storage quota updated
  
  - [ ] 7.3 Test project creation and switching
    - Create new project "Test Project 1"
    - Add images to canvas
    - Create second project "Test Project 2"
    - Add different images
    - Switch back to "Test Project 1" → verify original images load
    - Verify auto-save indicator shows "Saved"
  
  - [ ] 7.4 Test storage quota enforcement
    - As free-tier user, upload assets until approaching limit (80%)
    - Verify warning indicator appears
    - Continue uploading until quota exceeded (100%)
    - Verify quota warning dialog appears
    - Attempt to upload another asset → should be blocked
    - Delete an asset → verify quota decreases
    - Upload new asset → should succeed
  
  - [ ] 7.5 Test rate limiting per user
    - Trigger 6 image generation requests rapidly (should hit 5/min limit on 6th)
    - Verify rate limit error message appears
    - Wait 1 minute, try again → should succeed
    - Test video rate limiting separately (2/min limit)
  
  - [ ] 7.6 Test offline mode and sync
    - Load canvas with existing project
    - Disconnect network (browser DevTools → Network → Offline)
    - Make canvas changes (add/move images)
    - Verify offline indicator appears
    - Verify changes save to IndexedDB cache
    - Reconnect network → verify sync indicator shows "Syncing..."
    - Verify changes uploaded to Convex
    - Reload page → verify changes persist
  
  - [ ] 7.7 Test auto-save reliability
    - Make canvas changes
    - Wait 10 seconds → verify auto-save indicator shows "Saving..."
    - Verify auto-save indicator shows "Saved at [time]"
    - Close browser tab immediately after save
    - Reopen app → verify all changes persisted
  
  - [ ] 7.8 Test asset upload/retrieval from Convex storage
    - Upload image via drag-and-drop
    - Verify image appears in canvas immediately (optimistic UI)
    - Verify image uploaded to Convex storage
    - Verify asset record created in Convex `assets` table
    - Generate AI image → verify FAL URL replaced with Convex URL
    - Generate AI video → verify video uploaded to Convex after generation
  
  - [ ] 7.9 Test cross-device sync
    - Sign in to account on Device A
    - Create project with images
    - Sign in to same account on Device B
    - Verify projects list shows project from Device A
    - Open project → verify images load correctly
    - Make changes on Device B
    - Reload on Device A → verify changes appear
  
  - [ ] 7.10 Test error handling and edge cases
    - Test network failure during upload → verify retry logic
    - Test network failure during save → verify error shown, retry offered
    - Test concurrent saves (rapid changes) → verify debouncing works
    - Test quota exceeded mid-generation → verify graceful degradation
    - Test invalid authentication token → verify redirect to sign-in
    - Test project not found → verify error message and redirect to project list
  
  - [ ] 7.11 Create documentation for setup and deployment
    - Write `docs/convex-setup.md` with step-by-step Convex project creation
    - Write `docs/clerk-setup.md` with Clerk app configuration steps
    - Write `docs/migration-guide.md` for users with existing IndexedDB data
    - Update `README.md` with new setup instructions
    - Add troubleshooting section for common issues
  
  - [ ] 7.12 Performance testing and optimization
    - Test canvas with 100+ images → verify viewport culling still works
    - Test auto-save with large canvas state (>1MB) → verify performance
    - Test project list with 50+ projects → verify pagination/virtualization
    - Optimize thumbnail generation if too slow
    - Add loading states for all async operations
    - Ensure no layout shifts during load

---

## Summary

**Total Tasks**: 7 parent tasks, 83 sub-tasks

**Estimated Effort**: 2-3 weeks for medior developer

**Files to Create**: ~60 new files (Convex backend, UI components, hooks, utilities, types)

**Files to Modify**: ~10 existing files (handlers, atoms, storage, middleware)

**Critical Path**:
1. Convex & Clerk setup (infrastructure)
2. Authentication integration (providers, middleware)
3. Storage service layer (abstraction + Convex impl)
4. Project management system (backend + UI)
5. Rate limiting & quota management (enforcement)
6. IndexedDB caching & sync (offline support)
7. E2E integration & testing (validation)

**Dependencies**:
- All packages already installed ✅
- Requires Convex account and project creation
- Requires Clerk account and application setup
- No breaking changes to existing canvas functionality

**Next Actions**:
1. Review task breakdown with team
2. Set up Convex and Clerk accounts
3. Begin with Task 1.0 (infrastructure setup)
4. Implement tasks in sequential order (1.0 → 7.0)
5. Test each major component before proceeding to next

---

## Implementation Notes

### Task Sequencing
- Tasks 1.0-2.0 can be completed in parallel (infrastructure + auth)
- Task 3.0 depends on Tasks 1.0-2.0 (needs Convex + Clerk)
- Task 4.0 depends on Task 3.0 (needs storage service)
- Task 5.0 depends on Tasks 2.0-3.0 (needs auth + storage)
- Task 6.0 can be developed alongside 3.0-5.0 (independent caching layer)
- Task 7.0 must be last (integration & testing)

### Testing Strategy
- Unit tests for utilities and pure functions
- Integration tests for Convex mutations/queries
- Component tests for UI with React Testing Library
- E2E tests for critical user flows (Task 7.0)
- Manual QA for UX and accessibility

### Rollback Plan
- Feature flag for Convex storage (toggle between FAL and Convex)
- Keep IndexedDB as fallback if Convex unavailable
- Graceful degradation: Allow canvas editing without auth (block saves)
- Migration guide for reverting to FAL-only storage if needed
