# Tasks: FIBO-Powered Camera Angles Mode

## Relevant Files

- `convex/schema.ts` - Add `cameraAngle` field to assets table schema
- `src/types/canvas.ts` - Add `cameraAngle` field to `PlacedImage` interface
- `convex/assets.ts` - Update `uploadAsset` mutation to accept `cameraAngle` parameter
- `src/utils/camera-variation-utils.ts` - Update to ensure no duplicate camera angles in batch
- `src/utils/camera-abbreviation-utils.ts` - NEW: Utility to abbreviate camera directive text for UI display
- `src/lib/handlers/variation-handler.ts` - Replace current camera angles implementation with FIBO-powered version
- `src/lib/handlers/variation-shared-utils.ts` - Extract shared FIBO workflow logic (DRY refactoring)
- `src/lib/services/fibo-image-analyzer.ts` - Existing FIBO analysis service (leverage as-is)
- `src/lib/utils/fibo-to-text.ts` - Existing FIBO-to-text converter (leverage as-is)
- `src/components/canvas/control-panel/ModeIndicator.tsx` - Update to display camera angle labels
- `src/components/canvas/StreamingImage.tsx` - Update to pass `cameraAngle` to Convex during asset sync
- `src/hooks/useAssetSync.ts` - Update to include `cameraAngle` in asset synchronization

### Notes

- Focus on DRY refactoring by extracting shared logic between director and camera angle handlers.

## Tasks

- [ ] 1.0 Update Database Schema and Type Definitions
  - [ ] 1.1 Add `cameraAngle: v.optional(v.string())` field to `assets` table in `convex/schema.ts`
  - [ ] 1.2 Add validation for `cameraAngle` length (max 500 characters) in `convex/assets.ts` uploadAsset mutation
  - [ ] 1.3 Add `cameraAngle` parameter to `uploadAsset` mutation args in `convex/assets.ts`
  - [ ] 1.4 Include `cameraAngle` in the asset creation logic within uploadAsset handler
  - [ ] 1.5 Add `cameraAngle?: string` field to `PlacedImage` interface in `src/types/canvas.ts`
  - [ ] 1.6 Run `npx convex dev` to apply schema changes to development deployment

- [ ] 2.0 Create Utility Functions for Camera Angle Processing
  - [ ] 2.1 Create `src/utils/camera-abbreviation-utils.ts` with TSDoc comments
  - [ ] 2.2 Implement `abbreviateCameraDirective(directive: string): string` function that extracts text before "—" or first 3-5 words
  - [ ] 2.3 Add unit tests in `src/utils/camera-abbreviation-utils.test.ts` covering various camera directive formats
  - [ ] 2.4 Update `selectRandomCameraVariations()` in `src/utils/camera-variation-utils.ts` to verify it already prevents duplicates (it does via Fisher-Yates)
  - [ ] 2.5 Add comment/documentation confirming no-duplicate behavior in `selectRandomCameraVariations()`

- [ ] 3.0 Refactor Shared FIBO Workflow Logic (DRY)
  - [ ] 3.1 Analyze `src/lib/handlers/director-image-variation-handler.ts` to identify shared FIBO workflow patterns
  - [ ] 3.2 Create/update `src/lib/handlers/variation-shared-utils.ts` to extract common FIBO workflow utilities
  - [ ] 3.3 Extract `performFiboAnalysis()` utility that handles FIBO analysis with error handling and status updates
  - [ ] 3.4 Extract `createVariationPlaceholders()` utility that combines early preparation and placeholder creation
  - [ ] 3.5 Update `director-image-variation-handler.ts` to use new shared utilities (refactor existing code)
  - [ ] 3.6 Add TSDoc comments to all extracted utility functions
  - [ ] 3.7 Ensure all shared utilities follow the service-handler pattern (pure functions for business logic)

- [ ] 4.0 Implement FIBO-Powered Camera Angles Handler
  - [ ] 4.1 In `src/lib/handlers/variation-handler.ts`, locate the IMAGE MODE section (lines ~151-270)
  - [ ] 4.2 Wrap the camera angles implementation in try-catch block for graceful fallback
  - [ ] 4.3 Add FIBO analysis stage using `performFiboAnalysis()` from shared utils (or inline if not extracted)
  - [ ] 4.4 Call `analyzeFiboImage()` from `src/lib/services/fibo-image-analyzer.ts` with signed image URL
  - [ ] 4.5 Convert FIBO structured prompt to text using `fiboStructuredToText()` from `src/lib/utils/fibo-to-text.ts`
  - [ ] 4.6 Select random camera directives using `selectRandomCameraVariations(variationCount)` (already ensures no duplicates)
  - [ ] 4.7 For each camera directive, create refined prompt: `{fiboText}\n\nApply this camera angle: {cameraDirective}`
  - [ ] 4.8 Update placeholder creation to include `cameraAngle` field with full camera directive text
  - [ ] 4.9 Pass `cameraAngle` to `activeGenerations` map for each variation
  - [ ] 4.10 Implement catch block that falls back to old direct-to-model approach (keep existing code structure as fallback)
  - [ ] 4.11 Add status indicator updates: UPLOADING → ANALYZING → GENERATING
  - [ ] 4.12 Update pixelated overlay logic to show during FIBO analysis phase
  - [ ] 4.13 Add logging with `logger.child({ handler: "camera-angle-variation" })` for debugging

- [ ] 5.0 Update UI Components and Asset Synchronization
  - [ ] 5.1 Update `src/components/canvas/StreamingImage.tsx` to pass `cameraAngle` when syncing assets to Convex
  - [ ] 5.2 Locate asset upload/sync logic in StreamingImage and include `cameraAngle` in mutation call
  - [ ] 5.3 Update `src/components/canvas/control-panel/ModeIndicator.tsx` to display abbreviated camera angle labels
  - [ ] 5.4 Add tooltip/hover functionality to ModeIndicator to show full camera directive text on hover
  - [ ] 5.5 Use `abbreviateCameraDirective()` utility to format camera angle labels for display
  - [ ] 5.6 Ensure camera angle display styling matches director name display pattern
  - [ ] 5.7 Update `src/hooks/useAssetSync.ts` to include `cameraAngle` in asset metadata queries (if needed)
  - [ ] 5.8 Verify asset synchronization logic properly handles `cameraAngle` field throughout the sync lifecycle

- [ ] 6.0 Testing, Validation, and Cleanup
  - [ ] 6.1 Test camera angle variations with variation count = 4 using Seedream model
  - [ ] 6.2 Test camera angle variations with variation count = 8 using Seedream model
  - [ ] 6.3 Test camera angle variations with variation count = 12 using Nano Banana model
  - [ ] 6.4 Test camera angle variations with Nano Banana model (both counts)
  - [ ] 6.5 Verify no duplicate camera angles appear within a single batch (visual inspection)
  - [ ] 6.6 Test FIBO analysis failure scenario by temporarily breaking FAL_KEY and verify fallback to direct-to-model
  - [ ] 6.7 Verify camera angle labels display correctly in UI (abbreviated format)
  - [ ] 6.8 Verify full camera directive text appears in tooltip on hover
  - [ ] 6.9 Verify camera angles persist in Convex database after generation
  - [ ] 6.10 Check that existing camera angle variations (without cameraAngle field) still display correctly
  - [ ] 6.11 Test status indicator transitions: upload → analyzing → generating
  - [ ] 6.12 Verify pixelated overlay displays during FIBO analysis phase
  - [ ] 6.13 Run `npm run lint` to check code quality
  - [ ] 6.14 Run `npm run format:check` to verify formatting
  - [ ] 6.15 Remove any old camera angles implementation code that was replaced
  - [ ] 6.16 Update inline comments and documentation to reflect FIBO integration
  - [ ] 6.17 Verify all new functions have TSDoc comments following project standards
  - [ ] 6.18 Confirm DRY refactoring eliminated code duplication between director and camera handlers
  - [ ] 6.19 Update `WARP.md` if necessary to document new camera angles workflow
  - [ ] 6.20 Commit changes with descriptive commit message: "feat: implement FIBO-powered camera angles mode"
