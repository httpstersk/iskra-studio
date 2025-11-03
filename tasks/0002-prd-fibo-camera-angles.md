# PRD: FIBO-Powered Camera Angles Mode

## Introduction/Overview

Currently, the Camera Angles variation mode generates image variations by directly applying random camera directive prompts to Seedream/Nano Banana without any AI analysis. The Director mode, in contrast, uses FIBO to analyze the source image and then refines the prompt with director-specific styling before generation.

This feature will upgrade the Camera Angles mode to use the same FIBO-powered workflow as the Director mode. The source image will first be analyzed by FIBO to understand scene composition, subject matter, lighting, and mood. The structured FIBO analysis will then be refined with randomly-selected camera directives from the existing `CAMERA_VARIATIONS` array. Finally, the refined prompts will be sent to Seedream or Nano Banana for generation.

**Problem Solved:** Camera angle variations currently lack contextual awareness of the source image, resulting in less coherent transformations. By incorporating FIBO analysis, variations will be more intelligent and maintain better visual consistency with the source material while applying different camera perspectives.

**Goal:** Implement a FIBO-based camera angles workflow that produces higher-quality, contextually-aware camera angle variations similar to the existing director variations system.

## Goals

1. Integrate FIBO image analysis into the camera angles variation workflow
2. Refine FIBO structured prompts with camera directive instructions
3. Generate variations using Seedream/Nano Banana with the refined prompts
4. Store camera angle labels in Convex assets table for display (similar to director names)
5. Maintain backward compatibility with the same variation counts (4, 8, 12)
6. Provide consistent UI status updates during the FIBO analysis phase
7. Completely replace the current camera angles implementation (no legacy fallback needed)

## User Stories

**As a user creating camera angle variations:**
- I want my camera angle variations to be contextually aware of the source image content so that transformations feel more natural and intentional
- I want to see which camera angle was applied to each variation (like director names) so I can understand and reproduce successful results
- I want the same variation count options (4, 8, 12) so my workflow remains consistent
- I want clear status indicators showing FIBO analysis progress so I understand what's happening

**As a developer maintaining the system:**
- I want to reuse existing FIBO infrastructure so I don't duplicate analysis logic
- I want camera angles stored in the database so variations maintain their metadata across sessions
- I want a clean implementation that completely replaces the old camera angles approach

## Functional Requirements

### FR1: FIBO Image Analysis Integration
The system must analyze the source image using FIBO before generating camera angle variations, following the same analysis workflow as director variations. If FIBO analysis fails, the system must gracefully degrade to the old direct-to-model approach without FIBO analysis.

### FR2: Random Camera Directive Selection
The system must randomly select camera directives from the existing `CAMERA_VARIATIONS` array based on the variation count (4, 8, or 12 selections), ensuring no duplicates within a single batch.

### FR3: Prompt Refinement with Camera Directives
The system must refine the FIBO structured prompt by incorporating camera directive instructions using a template format: "Apply this camera angle: {camera directive}".

### FR4: Seedream/Nano Banana Generation
The system must support both Seedream and Nano Banana models for generating the final variations, maintaining the existing model selection UI.

### FR5: Camera Angle Storage in Convex
The system must:
- Add a `cameraAngle` field to the Convex `assets` table schema
- Store the full camera directive text (e.g., "DUTCH ANGLE DYNAMIC — CAMERA TILTED 25-45 DEGREES...") when saving variations to Convex
- Include `cameraAngle` in asset metadata queries

### FR6: Camera Angle Display in PlacedImage
The system must:
- Add a `cameraAngle` field to the `PlacedImage` TypeScript interface
- Display abbreviated camera angle labels on generated images in the same manner as director names (extract first part before "—" or use first 3-5 words)
- Show full camera angle text in image tooltips/metadata UI on hover
- Store full camera directive text in Convex for future reference

### FR7: Status Indicators During Processing
The system must display status updates during:
- Uploading: "Uploading source image..."
- Analyzing: "Analyzing image with FIBO..."
- Generating: "Generating variations..."

### FR8: Variation Count Support
The system must support generating 4, 8, or 12 camera angle variations matching the current UI controls, with random camera directive selection for each count.

### FR9: Replace Existing Implementation
The system must completely replace the current camera angles implementation in `variation-handler.ts` (no backward compatibility mode needed).

### FR10: API Endpoint
The system must create a new refinement prompt template that differs from the director template:
- Director template: "Make it look as if it were shot by {director}"
- Camera template: "Apply this camera angle: {camera directive}"

## Non-Goals (Out of Scope)

1. **Custom camera angle selection** - Users will not be able to choose specific camera angles; selection remains random
2. **FIBO suggesting camera angles** - FIBO will only analyze the image; camera directives come from the predefined array
3. **Different variation counts** - Will not add new variation count options beyond 4, 8, 12
4. **Legacy camera angles mode** - Will not maintain the old direct-to-model approach as a fallback option
5. **Camera angle editing** - Users will not be able to edit or customize camera angle text after generation
6. **Shared API route** - Will not reuse `/api/generate-director-variations`; camera angles follow inline refinement pattern

## Design Considerations

### Database Schema Changes
**Convex `assets` table:**
```typescript
assets: defineTable({
  // ... existing fields ...
  directorName: v.optional(v.string()),
  cameraAngle: v.optional(v.string()), // NEW: Store camera directive text
})
```

### TypeScript Interface Changes
**`PlacedImage` interface:**
```typescript
export interface PlacedImage {
  // ... existing fields ...
  directorName?: string;
  cameraAngle?: string; // NEW: Camera directive label
}
```

### UI Components to Update
1. **Image metadata tooltips** - Show camera angle alongside other metadata
2. **ModeIndicator component** - Display camera angle labels similarly to director names
3. **Asset synchronization logic** - Include `cameraAngle` in sync operations

### Status Message Display
Use the existing status display pattern from director variations:
- "Uploading..." → `VARIATION_STATUS.UPLOADING`
- "Analyzing with FIBO..." → `VARIATION_STATUS.ANALYZING`
- "Generating variations..." → `VARIATION_STATUS.GENERATING`

## Technical Considerations

### Architecture Pattern
Follow the same three-stage approach as director variations:
1. **Stage 0:** Upload/ensure image is in Convex storage
2. **Stage 1:** FIBO analysis of source image (server-side)
3. **Stage 2:** Select random camera directives and refine FIBO prompts
4. **Stage 3:** Generate images using Seedream/Nano Banana

### Code Organization
- Keep camera angle logic in `variation-handler.ts` (replace existing camera angles section)
- Use existing utilities: `selectRandomCameraVariations()`, `createPlaceholderFactory()`, `performEarlyPreparation()`
- Leverage FIBO services: `fiboImageAnalyzer.ts`, `fibo-to-text.ts`
- Follow service-handler pattern: business logic in services, state orchestration in handlers
- **DRY Principle:** Refactor shared logic between camera angles and director variations into reusable utilities to eliminate code duplication

### Refinement Approach
Unlike director variations which use a server-side API route for refinement, camera angle refinement will happen client-side:
1. Call FIBO analysis (similar to director flow)
2. Convert FIBO structured prompt to text using `fiboStructuredToText()`
3. Append camera directive: `{fiboText}\n\nApply this camera angle: {cameraDirective}`
4. Pass combined text prompt to Seedream/Nano Banana

### Dependencies
- Existing: `@/lib/services/fibo-image-analyzer.ts`
- Existing: `@/lib/utils/fibo-to-text.ts`
- Existing: `@/utils/camera-variation-utils.ts`
- Existing: `@/constants/camera-variations.ts`
- Modified: `convex/schema.ts` (add `cameraAngle` field)
- Modified: `src/types/canvas.ts` (add `cameraAngle` to `PlacedImage`)
- Modified: `src/lib/handlers/variation-handler.ts` (replace camera angles logic)

### Performance Considerations
- FIBO analysis adds ~2-5 seconds to variation generation time
- Maintain optimistic UI with immediate placeholder creation
- Show pixelated overlay on reference image during analysis
- Batch all `activeGenerations` updates into single state update

## Success Metrics

1. **Quality Improvement:** Camera angle variations demonstrate better contextual awareness compared to old implementation (measured by user feedback/testing)
2. **Feature Parity:** Camera angle variations achieve similar sophistication to director variations
3. **User Experience:** Status indicators clearly communicate progress through FIBO analysis
4. **Data Persistence:** Camera angle labels consistently saved and displayed across sessions
5. **Performance:** Total generation time (including FIBO) remains under 15 seconds for 4 variations
6. **Code Quality:** Implementation follows existing patterns and maintains TSDoc documentation standards

## Resolved Design Decisions

1. **FIBO Analysis Caching:** Open question - to be determined during implementation
2. **Camera Directive Formatting:** ✅ UI labels should display abbreviated versions of the full camera directive text (not full verbose descriptions)
3. **Error Handling:** ✅ If FIBO analysis fails, fallback to the old direct-to-model approach (graceful degradation)
4. **Rate Limiting:** ✅ No rate limiting for FIBO analysis at this time
5. **Camera Angle Uniqueness:** ✅ Ensure no duplicate camera angles within a single batch (update `selectRandomCameraVariations` if needed)
6. **Migration Strategy:** ✅ Existing camera angle variations should NOT be marked differently in the UI (seamless transition)

## Implementation Phases

### Phase 1: Schema & Type Updates
- Add `cameraAngle` field to Convex `assets` table
- Add `cameraAngle` to `PlacedImage` interface
- Update asset sync logic to include `cameraAngle`

### Phase 2: Utility Functions
- Create utility function to abbreviate camera directives (extract text before "—" or first 3-5 words)
- Update `selectRandomCameraVariations()` to ensure no duplicates in batch
- Extract shared FIBO workflow logic into reusable utility functions (DRY refactoring)

### Phase 3: Core Handler Implementation
- Modify `variation-handler.ts` to integrate FIBO analysis
- Implement camera directive refinement logic (client-side)
- Add try-catch with fallback to old direct-to-model approach on FIBO failure
- Update status indicators for FIBO stages

### Phase 4: UI Updates
- Update metadata display to show abbreviated camera angle labels
- Add tooltip/hover to show full camera directive text
- Ensure ModeIndicator component displays camera angles
- Test pixelated overlay during analysis

### Phase 5: Testing & Validation
- Test with all variation counts (4, 8, 12)
- Test with both Seedream and Nano Banana models
- Verify camera angle persistence in Convex
- Validate UI status transitions
- Test FIBO failure fallback to direct-to-model approach
- Verify no duplicate camera angles in batches

### Phase 6: Cleanup & Documentation
- Remove old camera angles implementation code
- Update inline documentation and comments
- Add TSDoc comments to new functions
- Verify DRY refactoring eliminated code duplication
