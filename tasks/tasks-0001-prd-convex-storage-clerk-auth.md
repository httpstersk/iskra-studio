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
- `convex/assets.ts` - **NEW** - Asset CRUD operations (upload, delete, list)
- `convex/projects.ts` - **NEW** - Project CRUD operations (create, save, load, delete)
- `convex/users.ts` - **NEW** - User management and quota tracking
- `convex/http.ts` - **NEW** - HTTP actions for file uploads (large files)
- `convex/ratelimit.ts` - **NEW** - Per-user rate limiting logic

### Storage Service Layer
- `src/lib/storage/storage-service.ts` - **NEW** - Abstract storage interface
- `src/lib/storage/convex-storage-service.ts` - **NEW** - Convex storage implementation
- `src/lib/storage/index.ts` - **NEW** - Barrel export
- `src/lib/convex-client.ts` - **NEW** - Client-side Convex client setup

### API Routes (Upload & Proxy)
- `src/app/api/convex/upload/route.ts` - **NEW** - Upload endpoint (replaces /api/fal/upload)
- `src/app/api/fal/upload/route.ts` - **MODIFY** - Add per-user rate limiting with Clerk userId

### Handlers (Business Logic)
- `src/lib/handlers/generation-handler.ts` - **MODIFY** - Replace FAL upload with Convex upload
- `src/lib/handlers/video-generation-handlers.ts` - **MODIFY** - Replace FAL upload with Convex upload
- `src/lib/handlers/asset-download-handler.ts` - **NEW** - Download FAL assets and reupload to Convex

### State Management (Jotai)
- `src/store/auth-atoms.ts` - **CREATED** ✅ - Clerk user state, tier, quotas (74 lines)
- `src/store/project-atoms.ts` - **NEW** - Current project, project list, auto-save state
- `src/hooks/useAuth.ts` - **CREATED** ✅ - Custom hook for Clerk auth with Convex integration (145 lines)
- `src/hooks/useProjects.ts` - **NEW** - Custom hook for project CRUD operations
- `src/hooks/useQuota.ts` - **NEW** - Custom hook for storage quota tracking
- `src/hooks/useAutoSave.ts` - **NEW** - Auto-save hook with 10-second debounce
- `src/hooks/useStorage.ts` - **MODIFY** - Update to sync with Convex instead of only IndexedDB

### UI Components
- `src/components/auth/sign-in-button.tsx` - **CREATED** ✅ - Clerk sign-in button with LogIn icon (68 lines)
- `src/components/auth/user-menu.tsx` - **CREATED** ✅ - User dropdown with avatar, tier badge, storage quota, and sign-out (210 lines)
- `src/components/projects/project-list.tsx` - **NEW** - Project grid/list view
- `src/components/projects/project-card.tsx` - **NEW** - Individual project tile with thumbnail
- `src/components/projects/project-dialog.tsx` - **NEW** - Create/rename project modal
- `src/components/projects/project-panel.tsx` - **NEW** - Collapsible sidebar for projects
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
- `src/types/project.ts` - **NEW** - Project, ProjectMetadata types
- `src/types/asset.ts` - **NEW** - Asset, AssetMetadata types
- `src/types/canvas.ts` - **MODIFY** - Add projectId to canvas state types

### Utility Functions
- `src/utils/quota-utils.ts` - **NEW** - Calculate storage usage, check limits
- `src/utils/thumbnail-utils.ts` - **NEW** - Generate project thumbnails from canvas
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

- [ ] 3.0 **Build Convex Storage Service & Migration**
  - [ ] 3.1 Create abstract storage interface in `src/lib/storage/storage-service.ts`
    - Define `StorageService` interface with methods: `upload()`, `delete()`, `getUrl()`, `download()`
    - Type parameters: file (Blob), metadata (optional object)
    - Return types: Promise<{ url: string; storageId: string; sizeBytes: number }>
    - Add TSDoc comments for each method
  
  - [ ] 3.2 Create Convex storage implementation in `src/lib/storage/convex-storage-service.ts`
    - Implement `StorageService` interface
    - Use Convex HTTP actions for file uploads
    - Call Convex `uploadAsset` mutation after upload
    - Handle errors and retries (max 3 attempts)
    - Return Convex file URL from storage
  
  - [ ] 3.3 Create barrel export in `src/lib/storage/index.ts`
    - Export `StorageService` interface
    - Export `ConvexStorageService` class
    - Export factory function `createStorageService()`
  
  - [ ] 3.4 Create Convex assets mutations/queries in `convex/assets.ts`
    - `uploadAsset` mutation: Creates asset record, updates user quota
    - `deleteAsset` mutation: Removes asset, decrements quota, deletes file from storage
    - `listAssets` query: Returns paginated assets for authenticated user
    - `getAsset` query: Returns single asset by ID with ownership check
    - Add authentication checks using `ctx.auth.getUserIdentity()`
  
  - [ ] 3.5 Create Convex HTTP actions in `convex/http.ts`
    - `uploadFile` action: Accepts multipart form data, stores in Convex storage
    - Returns storage ID and URL
    - Handles large files (up to 25MB)
    - Validates file types (image/*, video/*)
  
  - [ ] 3.6 Create upload API route in `src/app/api/convex/upload/route.ts`
    - Replace `/api/fal/upload` as primary upload endpoint
    - Accept FormData with file
    - Check authentication (Clerk userId required)
    - Check storage quota before upload
    - Call Convex HTTP action to upload file
    - Create asset record via Convex mutation
    - Return Convex URL and asset ID
  
  - [ ] 3.7 Create asset download handler in `src/lib/handlers/asset-download-handler.ts`
    - `downloadAndReupload()` function: Takes FAL URL, downloads blob, uploads to Convex
    - Used after AI generation completes
    - Returns Convex URL to replace FAL URL in canvas state
    - Handles download failures with retries
    - Adds timeout (30 seconds max)
  
  - [ ] 3.8 Update `src/lib/handlers/generation-handler.ts`
    - Modify `uploadImageDirect()` to use Convex storage service instead of FAL client
    - After text-to-image generation, call `downloadAndReupload()` to move FAL asset to Convex
    - Update canvas state with Convex URL instead of FAL URL
    - Store original FAL URL in asset metadata for reference
  
  - [ ] 3.9 Update `src/lib/handlers/video-generation-handlers.ts`
    - Modify `uploadMediaIfNeeded()` to use Convex storage instead of FAL
    - After image-to-video generation, download video from FAL and upload to Convex
    - Return Convex URL for canvas state
  
  - [ ] 3.10 Create `src/types/asset.ts` for asset types
    - `Asset` type matching Convex schema
    - `AssetMetadata` type for generation params (prompt, model, seed, etc.)
    - `AssetUploadResult` type for upload responses
  
  - [ ] 3.11 Create quota utilities in `src/utils/quota-utils.ts`
    - `calculateStorageUsage()`: Sum sizeBytes for all user assets
    - `checkQuotaLimit()`: Returns boolean if upload would exceed limit
    - `getQuotaForTier()`: Returns limit in bytes for "free" or "paid" tier
    - `formatStorageSize()`: Converts bytes to human-readable (MB, GB)

- [ ] 4.0 **Implement Project Management System**
  - [ ] 4.1 Create Convex projects mutations/queries in `convex/projects.ts`
    - `createProject` mutation: Creates new project with default name "Iskra 0X", empty canvas state
    - `saveProject` mutation: Upserts project canvas state (atomic update)
    - `listProjects` query: Returns all projects for authenticated user, sorted by lastSavedAt DESC
    - `getProject` query: Returns single project by ID with ownership check
    - `deleteProject` query: Removes project and associated thumbnail, keeps referenced assets
    - `renameProject` mutation: Updates project name
    - All mutations require authentication via `ctx.auth.getUserIdentity()`
  
  - [ ] 4.2 Create project state atoms in `src/store/project-atoms.ts`
    - `currentProjectAtom` - Active project ID and metadata
    - `projectListAtom` - Array of user's projects
    - `isAutoSavingAtom` - Boolean flag for auto-save in progress
    - `lastSavedAtAtom` - Timestamp of last successful save
    - `projectLoadingAtom` - Boolean for project load state
  
  - [ ] 4.3 Create `src/hooks/useProjects.ts` custom hook
    - Return functions: createProject, saveProject, loadProject, deleteProject, renameProject, listProjects
    - Use Convex mutations/queries via `useMutation()` and `useQuery()`
    - Handle loading and error states
    - Update project atoms after operations
  
  - [ ] 4.4 Create auto-save hook in `src/hooks/useAutoSave.ts`
    - Debounce canvas state changes with 10-second delay
    - Only save if canvas state has changed since last save
    - Only save if not currently generating (activeGenerations.size === 0)
    - Call `saveProject` mutation with current canvas state
    - Update `lastSavedAtAtom` on success
    - Show toast on save errors
  
  - [ ] 4.5 Create thumbnail utilities in `src/utils/thumbnail-utils.ts`
    - `generateThumbnail()`: Captures canvas as 300x200px image using Konva `stage.toDataURL()`
    - `uploadThumbnail()`: Uploads thumbnail blob to Convex storage
    - Called after project save to update thumbnail
  
  - [ ] 4.6 Create project card component in `src/components/projects/project-card.tsx`
    - Display project thumbnail (fallback to placeholder)
    - Show project name (editable on click)
    - Display last modified timestamp ("2 hours ago" format using `date-fns`)
    - Show count of images and videos
    - Dropdown menu with "Rename", "Delete" actions
    - Confirm dialog for delete action
  
  - [ ] 4.7 Create project list component in `src/components/projects/project-list.tsx`
    - Grid view of project cards
    - "New Project" button at top
    - Empty state when no projects exist
    - Loading skeleton while fetching projects
    - Search/filter input (optional, can defer)
  
  - [ ] 4.8 Create project dialog in `src/components/projects/project-dialog.tsx`
    - Modal for creating new project
    - Input field for project name with validation
    - "Create" and "Cancel" buttons
    - Use Radix UI Dialog component
    - Handle form submission with react-hook-form
  
  - [ ] 4.9 Create project panel in `src/components/projects/project-panel.tsx`
    - Collapsible sidebar (default collapsed)
    - Toggle button with icon
    - Renders `<ProjectList>` when expanded
    - Slide animation with framer-motion
    - Keyboard shortcut: Cmd/Ctrl+P to toggle
  
  - [ ] 4.10 Create `src/types/project.ts` for project types
    - `Project` type matching Convex schema
    - `ProjectMetadata` type for UI display (id, name, thumbnailUrl, lastSavedAt, imageCount, videoCount)
    - `CanvasState` type extension with projectId field
  
  - [ ] 4.11 Update `src/types/canvas.ts`
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
