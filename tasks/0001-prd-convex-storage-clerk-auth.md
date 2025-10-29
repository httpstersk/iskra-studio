# PRD: Convex Database Integration with Clerk Authentication

## Introduction/Overview

Currently, the application stores generated AI images and videos using FAL.ai's temporary storage, which is not tied to user accounts. This PRD describes migrating to a persistent storage solution using Convex database with Clerk authentication, enabling users to:

1. Save and retrieve their generated images and videos across sessions
2. Manage multiple named canvas projects/workspaces
3. Have per-user storage with tiered limits (free vs paid)

**Problem:** Users lose their work when they close the browser or clear local storage. Generated assets are ephemeral and not tied to user identity.

**Solution:** Integrate Convex as the primary storage backend with Clerk for user authentication, replacing FAL storage for final asset persistence while keeping FAL for AI generation operations.

## Goals

1. Enable authenticated users to persist images, videos, and canvas state to Convex database
2. Implement Clerk authentication to identify and authorize users
3. Support multiple named projects/workspaces per user
4. Provide auto-save functionality for canvas state (every N seconds)
5. Implement tiered storage limits (free vs paid users)
6. Migrate rate limiting from IP-based to per-user (via Clerk userId)
7. Maintain local IndexedDB cache for offline access and performance
8. Ensure seamless integration with existing AI generation workflows

## User Stories

### US-1: User Registration and Authentication
**As a** new user,  
**I want to** sign up with Clerk (email, Google, GitHub, etc.),  
**So that** I can save and access my generated content across devices.

### US-2: Automatic Canvas Persistence
**As an** authenticated user,  
**I want** my canvas state to auto-save to Convex every few seconds,  
**So that** I don't lose work if my browser crashes or I close the tab.

### US-3: Multiple Named Projects
**As a** creator,  
**I want to** create and manage multiple named canvas projects,  
**So that** I can organize different creative works separately.

### US-4: Asset Ownership and Privacy
**As a** user,  
**I want** to see only my own generated images and videos,  
**So that** my creative work remains private.

### US-5: Storage Limit Visibility
**As a** free-tier user,  
**I want to** see how much storage I've used and my limits,  
**So that** I know when I'm approaching my quota and should upgrade.

### US-6: Offline Capability
**As a** user with intermittent connectivity,  
**I want** my canvas to work offline using cached data,  
**So that** I can continue working and sync changes when I reconnect.

### US-7: AI Generation to Convex Pipeline
**As a** user generating AI content,  
**I want** my generated images and videos automatically saved to Convex after creation,  
**So that** I don't have to manually save each asset.

## Functional Requirements

### Authentication & Authorization (Clerk Integration)

**FR-1.1:** The system must integrate Clerk authentication supporting email, Google, and GitHub sign-in methods.

**FR-1.2:** The system must require authentication before allowing users to generate or upload images/videos.

**FR-1.3:** The system must isolate each user's data so users can only access their own assets and canvas states.

**FR-1.4:** The system must pass Clerk's `userId` to all Convex queries and mutations for authorization.

**FR-1.5:** The system must redirect unauthenticated users to the Clerk sign-in page when attempting protected operations.

### Convex Database Schema

**FR-2.1:** Create a `users` table in Convex to store user metadata:
- `userId` (string, Clerk user ID)
- `email` (string)
- `tier` (string: "free" | "paid")
- `storageUsedBytes` (number)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**FR-2.2:** Create an `assets` table in Convex to store image/video metadata:
- `_id` (Convex generated)
- `userId` (string, indexed)
- `type` (string: "image" | "video")
- `storageId` (string, Convex file storage ID)
- `originalUrl` (string, nullable, FAL URL for reference)
- `width` (number)
- `height` (number)
- `duration` (number, nullable, for videos)
- `mimeType` (string)
- `sizeBytes` (number)
- `metadata` (object, generation params, prompts, etc.)
- `createdAt` (timestamp)

**FR-2.3:** Create a `projects` table in Convex to store canvas workspaces:
- `_id` (Convex generated)
- `userId` (string, indexed)
- `name` (string)
- `canvasState` (object: images, videos, viewport, selectedIds)
- `thumbnailStorageId` (string, nullable)
- `lastSavedAt` (timestamp)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**FR-2.4:** All tables must enforce row-level security based on `userId` from Clerk.

### Storage Migration & Asset Upload

**FR-3.1:** Replace `/api/fal/upload` with `/api/convex/upload` that:
- Accepts image/video files (max 25MB)
- Validates file types (image/*, video/*)
- Uploads to Convex file storage
- Creates asset record in `assets` table
- Returns Convex file URL and asset ID

**FR-3.2:** After AI generation completes (text-to-image, image-to-image, image-to-video):
- Download the generated asset from FAL URL
- Upload to Convex via the new upload endpoint
- Replace FAL URL with Convex URL in canvas state
- Store original FAL URL in asset metadata for reference

**FR-3.3:** Update `uploadImageDirect` in `generation-handler.ts` to:
- Upload blobs to Convex instead of FAL
- Return Convex file URL
- Handle authentication and user context

**FR-3.4:** Update `uploadMediaIfNeeded` in `video-generation-handlers.ts` to:
- Upload to Convex for authenticated users
- Handle data URLs and blob URLs appropriately

### Canvas State Auto-Save

**FR-4.1:** Implement auto-save functionality that:
- Saves canvas state to Convex every 10 seconds (configurable)
- Debounces rapid changes to avoid excessive writes
- Only saves when state has changed since last save
- Shows visual indicator during save operation

**FR-4.2:** Canvas state must include:
- All placed images (positions, dimensions, rotations)
- All placed videos (positions, dimensions, playback state)
- Viewport state (x, y, scale)
- Selected element IDs
- Active generations (in-progress AI operations)

**FR-4.3:** Auto-save must be non-blocking and not interrupt user workflow.

**FR-4.4:** On app load, fetch the user's most recent project from Convex and restore canvas state.

### Project Management

**FR-5.1:** Create a "Projects" menu/sidebar where users can:
- View all their saved projects (grid/list view)
- Create a new blank project
- Rename existing projects
- Delete projects (with confirmation)
- Switch between projects

**FR-5.2:** Each project tile must display:
- Project name
- Thumbnail (generated from canvas)
- Last modified timestamp
- Number of images/videos

**FR-5.3:** Implement a "New Project" button that:
- Prompts for project name
- Creates empty canvas
- Saves initial state to Convex

**FR-5.4:** When switching projects:
- Auto-save current project first
- Clear canvas
- Load selected project's state from Convex
- Update URL with project ID (e.g., `/canvas?project=abc123`)

### Storage Limits & Quota Management

**FR-6.1:** Define storage limits per tier:
- **Free tier**: 100 images + 20 videos (approx. 500MB)
- **Paid tier**: 1000 images + 200 videos (approx. 5GB)

**FR-6.2:** Implement storage quota tracking:
- Update `storageUsedBytes` on asset upload
- Decrement on asset deletion
- Check against tier limits before allowing uploads

**FR-6.3:** Display storage usage in UI:
- Progress bar showing used/total storage
- Percentage indicator
- Upgrade prompt when approaching limit

**FR-6.4:** Block uploads when quota exceeded:
- Show error message with upgrade CTA
- Suggest deleting old assets
- Allow users to delete assets to free up space

**FR-6.5:** Provide asset management interface where users can:
- View all their uploaded assets
- Sort by date, size, type
- Delete assets to free up quota
- Preview assets before deletion

### Rate Limiting (Per-User)

**FR-7.1:** Migrate rate limiting from IP-based to user-based:
- Use Clerk `userId` as rate limit key
- Maintain existing rate limit values for consistency
- Keep separate limits for standard and video operations

**FR-7.2:** Rate limits per authenticated user:
- **Standard operations**: 5/min, 15/hour, 50/day
- **Video operations**: 2/min, 4/hour, 8/day

**FR-7.3:** Store rate limit counters in Convex or Upstash KV tied to `userId`.

**FR-7.4:** Display rate limit status in UI when user is throttled.

### IndexedDB Caching & Offline Support

**FR-8.1:** Maintain IndexedDB as local cache layer:
- Cache Convex file URLs and thumbnails
- Store full canvas state locally
- Enable offline editing

**FR-8.2:** Implement sync strategy:
- On app load: fetch from Convex, update IndexedDB
- On save: write to Convex, update IndexedDB
- On reconnect: sync pending changes to Convex

**FR-8.3:** Show offline indicator in UI when disconnected.

**FR-8.4:** Queue canvas state changes for sync when offline, flush on reconnect.

### Convex Backend Implementation

**FR-9.1:** Create Convex mutations:
- `uploadAsset`: Handles file upload and metadata storage
- `deleteAsset`: Removes asset and updates storage quota
- `saveProject`: Upserts project canvas state
- `updateUserStorageUsed`: Recalculates storage for a user

**FR-9.2:** Create Convex queries:
- `getProjects`: Fetch all projects for authenticated user
- `getProject`: Fetch specific project by ID
- `getAssets`: Fetch all assets for authenticated user (paginated)
- `getStorageQuota`: Get user's storage usage and limits

**FR-9.3:** Implement Convex HTTP actions for file uploads (if needed for large files).

**FR-9.4:** Add indexes on `userId` in all tables for query performance.

## Non-Goals (Out of Scope)

**NG-1:** Real-time collaboration (multiple users editing same canvas simultaneously) is not included in this version.

**NG-2:** Asset versioning/history is not included; only current state is stored.

**NG-3:** Sharing projects publicly or with other users is not in scope (can be added later).

**NG-4:** Migration of existing FAL-stored assets is not required; users start fresh.

**NG-5:** Admin dashboard for viewing all user data is not included.

**NG-6:** Exporting projects as files (JSON, ZIP) is not included.

**NG-7:** AI generation API changes (still uses FAL.ai for generation operations).

## Design Considerations

### UI/UX Components

**DC-1:** Add Clerk authentication components:
- Sign-in button in top-right navigation
- User profile dropdown with:
  - Username/email
  - Storage usage indicator
  - "Manage Account" link
  - "Sign Out" button

**DC-2:** Projects panel (collapsible sidebar or modal):
- Grid view with thumbnails
- Create/rename/delete actions per project
- Search/filter projects by name
- Sort by date modified

**DC-3:** Storage quota indicator (in navigation or settings):
- Visual progress bar
- Text: "45.2 MB / 500 MB used"
- "Upgrade" button for free-tier users

**DC-4:** Auto-save indicator:
- Subtle spinner or "Saving..." text in corner
- Check mark icon when saved
- Error state if save fails

### Accessibility

**DC-5:** All new UI components must meet WCAG 2.1 AA standards:
- Keyboard navigation for project management
- Screen reader labels for storage indicators
- Focus management in modals

## Technical Considerations

### Dependencies

**TC-1:** Add required packages:
- `@clerk/nextjs` for authentication
- `convex` for database client
- No changes to `@fal-ai/client` (keep for generation)

**TC-2:** Convex setup:
- Initialize Convex project
- Configure environment variables (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`)
- Set up Clerk integration with Convex auth

### Architecture Changes

**TC-3:** Update file upload flow:
```
Before: Browser → /api/fal/upload → FAL Storage → FAL URL
After:  Browser → /api/convex/upload → Convex Storage → Convex URL
```

**TC-4:** Update AI generation flow:
```
Before: Prompt → FAL Generate → FAL URL → Canvas State
After:  Prompt → FAL Generate → FAL URL → Download → Convex Upload → Convex URL → Canvas State
```

**TC-5:** Storage service abstraction:
- Create `src/lib/storage/` folder
- `storage-service.ts`: Abstract interface for upload/download
- `convex-storage.ts`: Convex implementation
- `fal-storage.ts`: FAL implementation (for generation only)

**TC-6:** Authentication context:
- Wrap app with `ClerkProvider`
- Use `useAuth()` hook to get `userId` and `getToken()`
- Pass `userId` to all Convex mutations/queries

### Data Migration Strategy

**TC-7:** No migration needed (fresh start approach per 2Ad):
- Existing canvas states in IndexedDB remain local
- Users start with empty Convex project on first sign-in
- Optionally: show "Import from Local Storage" button on first load

### Performance Optimizations

**TC-8:** Lazy-load project thumbnails using Convex file URLs.

**TC-9:** Paginate asset listings (20 per page) to avoid loading all assets at once.

**TC-10:** Debounce auto-save to 10 seconds with max 1 save per 5 seconds during rapid changes.

**TC-11:** Use Convex subscriptions for real-time project updates (future-proofing for collaboration).

### Error Handling

**TC-12:** Handle Convex upload failures:
- Retry logic (up to 3 attempts)
- Show user-friendly error messages
- Fall back to local IndexedDB if Convex unavailable

**TC-13:** Handle authentication failures:
- Redirect to sign-in page
- Preserve canvas state in IndexedDB for post-login restore

**TC-14:** Handle quota exceeded:
- Pre-check before upload
- Show error with quota details
- Provide "Manage Assets" link

## Success Metrics

**SM-1:** 80% of active users sign up within first session.

**SM-2:** 90% of authenticated users successfully save at least one project.

**SM-3:** Average auto-save latency < 500ms.

**SM-4:** Zero data loss reports after Convex integration launch.

**SM-5:** Storage quota warnings prevent 95% of failed uploads.

**SM-6:** Per-user rate limiting reduces abuse by 50% compared to IP-based.

**SM-7:** Offline mode allows editing for 100% of cached projects.

## Open Questions

**OQ-1:** What should the default project name be when user first signs in? (e.g., "Untitled Project", "My First Canvas")
 > "Iskra 0X"

**OQ-2:** Should we compress images/videos before uploading to Convex to save storage? (e.g., resize 4K to 2K, compress quality)
 > No compression needed.

**OQ-3:** How should we handle project deletion? Soft delete (mark as deleted, keep data) or hard delete (permanent removal)?
 > Hard delete.

**OQ-4:** Should free-tier users see a watermark on exported assets as incentive to upgrade?
 > No watermark needed.

**OQ-5:** What happens if a user exceeds their quota mid-session? Block all operations or allow finishing current work?
 > Block all operations.

**OQ-6:** Should we implement a "trash" folder for deleted assets with 30-day retention before permanent deletion?
 > No trash needed.

**OQ-7:** How do we handle tier downgrades (paid → free)? Block access to excess projects/assets or allow read-only?
 > Allow read-only.

**OQ-8:** Should the auto-save interval be user-configurable in settings, or fixed at 10 seconds?
 > Fixed at 10 seconds.

---

**Prepared for:** Medior Developer Implementation
**Estimated Effort:** 2-3 weeks (includes Clerk setup, Convex schema, UI components, and testing)  
**Priority:** High
**Dependencies:** Requires Clerk account and Convex project setup before development begins
