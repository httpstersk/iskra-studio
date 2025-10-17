# Asset Synchronization Architecture

## Overview

The asset synchronization system ensures perfect consistency between canvas elements and the Convex assets table. Each element can maintain a reference to its source asset, enabling validation, dependency tracking, and graceful handling of asset lifecycle events.

## Core Concepts

### 1. Asset IDs in Elements

Each `CanvasElement` now includes asset metadata:

```typescript
export interface CanvasElement {
  assetId?: string;           // ID in Convex assets table
  assetType?: "image" | "video";  // Cached type for quick lookup
  assetSyncedAt?: number;     // Timestamp of last validation
  // ... other properties
}
```

**Key Design Decisions:**

- **Single `assetId`**: Replaces separate `imageId`/`videoId` fields
- **Cached `assetType`**: Avoids N+1 queries when rendering
- **Sync timestamp**: Enables detecting stale metadata
- **Optional fields**: Backward compatible with local-only elements

### 2. Asset as Source of Truth

Asset records contain the authoritative metadata:

```typescript
export interface Asset {
  id: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  duration?: number;  // seconds, for videos
  mimeType: string;
  storageId: string;  // Convex storage file
  userId: string;
  createdAt: number;
  // ... other metadata
}
```

Element dimensions may differ from asset dimensions (user can resize), but asset provides the baseline.

### 3. Synchronization Patterns

#### Pattern 1: Element Creation

When uploading a file:

```typescript
// 1. Upload file to Convex storage
const uploadResult = await storage.upload(blob, options);

// 2. Asset record created automatically in `uploadAsset` mutation
// 3. Element references the asset
const element: PlacedImage = {
  id: generateId(),
  assetId: uploadResult.assetId,  // Link established
  assetSyncedAt: Date.now(),
  src: uploadResult.url,
  // ... position, dimensions
};
```

#### Pattern 2: Project Load

When opening a project:

```typescript
// 1. Fetch project
const project = await getProject(projectId);

// 2. Validate all asset references
const validation = await validateProjectAssets(projectId);

// 3. Handle invalid/stale elements
for (const invalid of validation.invalidElements) {
  // Asset deleted? Orphan the element or delete it
  const element = orphanElement(element);
}

for (const stale of validation.staleMetadata) {
  // Asset updated? Refresh element metadata
  const updated = syncElementWithAsset(element, asset);
}
```

#### Pattern 3: Asset Deletion

When user deletes an asset:

```typescript
// 1. Check which projects use this asset
const dependents = await getProjectsUsingAsset(assetId);

// 2. Show warning if elements would be orphaned
if (dependents.length > 0) {
  showWarning(`This asset is used in ${dependents.length} projects`);
}

// 3. Delete asset
await deleteAsset(assetId);

// 4. On project load, elements will be marked as orphaned
```

## Implementation Details

### Runtime Format (Canvas)

Used during editing in the browser:

```typescript
export interface PlacedImage {
  id: string;
  src: string;  // Either data URL or Convex URL
  assetId?: string;  // NEW: Link to assets table
  assetSyncedAt?: number;  // NEW: When last synced
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // ... opacity, naturalWidth, etc.
}

export interface PlacedVideo extends PlacedImage {
  isVideo: true;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  muted: boolean;
  volume: number;
}
```

### Persistence Format (Convex)

What gets saved to the database:

```typescript
export interface CanvasElement {
  id: string;
  type: "image" | "video" | "text" | "shape";
  
  // Asset reference (NEW)
  assetId?: string;
  assetType?: "image" | "video";
  assetSyncedAt?: number;
  
  // Transform
  transform: ElementTransform;
  
  // Media properties (may differ from asset)
  width?: number;
  height?: number;
  duration?: number;  // video only
  
  // Video state
  currentTime?: number;
  isPlaying?: boolean;
  muted?: boolean;
  volume?: number;
  
  zIndex: number;
}
```

### Conversion Between Formats

Two utilities handle conversions:

```typescript
// Runtime → Persistence
const element = convertImageToElement(placedImage);
const elements = mergeToElements(images, videos);

// Persistence → Runtime
const image = convertElementToImage(element, assetUrl);
const { images, videos } = separateElements(elements, assetUrlMap);
```

## Validation and Synchronization

### Asset Validation Query

```typescript
// Convex query - validate all elements in project
const result = await validateProjectAssets(projectId);

result = {
  isValid: boolean,
  totalElements: number,
  validElements: number,
  invalidElements: [{
    elementId: string,
    reason: string,
  }],
  staleMetadata: [{
    elementId: string,
    assetId: string,
  }],
};
```

### Synchronization Utilities

The `asset-synchronizer.ts` module provides:

```typescript
// Validate single element
const result = validateElementAsset(element, assetMap, userId);

// Validate entire canvas
const result = validateCanvasState(canvasState, assetMap, userId);

// Sync element with current asset
const updated = syncElementWithAsset(element, asset);

// Remove asset reference (orphan)
const orphaned = orphanElement(element);

// Generate migration plan
const plan = generateMigrationPlan(validation);
```

## Data Flow During Save

```
Canvas State (PlacedImage[]/PlacedVideo[])
          ↓
    mergeToElements()
          ↓
  CanvasElement[] with assetId references
          ↓
  saveProject() mutation
          ↓
  Convex validateProjectAssets() query
          ↓
  Check all assetIds exist & user owns them
          ↓
  Save to projects table
```

## Data Flow During Load

```
Convex projects table
          ↓
  getProject() query
          ↓
CanvasElement[] with assetId references
          ↓
validateProjectAssets() query
          ↓
  Get asset URLs from Convex
          ↓
separateElements() + convertElementToImage/Video()
          ↓
Canvas State (PlacedImage[]/PlacedVideo[])
```

## Handling Edge Cases

### Case 1: Asset Deleted After Element Created

```
Initial state: Element references assetId = "a123"
Event: Asset "a123" deleted

On project load:
1. validateProjectAssets() finds assetId "a123" missing
2. Element added to invalidElements list
3. App can either:
   - Delete the element
   - Keep as orphaned (local-only)
   - Show warning to user
```

### Case 2: Asset Resized/Edited

```
Initial: Element 512×512, Asset 512×512
Event: Asset re-uploaded with different dimensions

On project load:
1. validateProjectAssets() detects metadata differs
2. Element added to staleMetadata list
3. App can:
   - Refresh element dimensions
   - Alert user of change
   - Offer to revert to original
```

### Case 3: Offline Element Creation

```
User creates element with local data URL (no upload)
- assetId = undefined
- assetSyncedAt = undefined

When syncing:
1. Check if url is data:// or blob://
2. Upload to Convex via downloadAndReupload()
3. Update element with returned assetId
4. Set assetSyncedAt = Date.now()
```

### Case 4: Duplicate Project

```
User duplicates project with 5 images

Option 1: Reference same assets
- New project elements have same assetIds
- Saves storage, but updates affect both projects

Option 2: Duplicate assets too
- Create new asset records for duplicated files
- More storage, but projects are independent
```

## Performance Considerations

### Query Optimization

- Validation uses indexed queries: `by_userId`, `by_userId_and_type`
- Batch validation in single pass
- Asset map stored as `Map<string, Asset>` for O(1) lookup

### Caching Strategy

- Asset type cached in element (`assetType` field)
- Eliminates N+1 queries when rendering
- Trade-off: 1 extra string per element vs. N asset fetches

### Lazy Loading

- Don't validate assets until needed
- Load on project open only
- Manual refresh available for debugging

## Future Enhancements

### 1. Asset Usage Analytics

```typescript
// Track which projects use which assets
// Enable smart cleanup: "Remove unused assets"
const unused = await findUnusedAssets(userId);
```

### 2. Asset Versioning

```typescript
// Store asset version in element
// Support multi-version assets with auto-upgrade
interface CanvasElement {
  assetId: string;
  assetVersion?: number;  // NEW
}
```

### 3. Three-Way Merge

```typescript
// For conflict resolution in collaborative editing
const resolved = mergeStates(
  localState,
  remoteState,
  commonAncestorState  // Asset states too
);
```

### 4. Batch Asset Operations

```typescript
// Migrate elements to different assets
await reassignAssets(projectId, [
  { fromAssetId, toAssetId },
]);
```

## Migration Guide

### For Existing Projects

Old format:
```typescript
interface CanvasElement {
  imageId?: string;
  videoId?: string;
}
```

New format:
```typescript
interface CanvasElement {
  assetId?: string;
  assetType?: "image" | "video";
  assetSyncedAt?: number;
}
```

**Migration script** (if needed):
```typescript
function migrateElement(old: OldCanvasElement): CanvasElement {
  return {
    ...old,
    assetId: old.imageId || old.videoId,
    assetType: old.imageId ? "image" : "video",
    assetSyncedAt: Date.now(),
    // Remove old fields
    imageId: undefined,
    videoId: undefined,
  };
}
```

## Testing Strategy

### Unit Tests

- `asset-synchronizer.ts`: Validation logic
- `element-converter.ts`: Format conversion

### Integration Tests

- Create element → Upload asset → Save project → Load project → Validate
- Delete asset → Validate project → Check invalid elements
- Offline element → Upload → Sync

### End-to-End Tests

- User uploads image → Creates element → Saves project
- User opens saved project → Assets loaded → Elements display correctly
- User deletes asset → Opens project → Sees warning/orphaned element
