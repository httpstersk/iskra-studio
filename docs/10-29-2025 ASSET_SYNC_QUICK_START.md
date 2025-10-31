# Asset Synchronization - Quick Start Guide

## What Changed?

Canvas elements now maintain a **direct link to the Convex assets table**, enabling perfect synchronization and validation.

### Before (Old System)
```typescript
// Elements had separate imageId/videoId fields
interface CanvasElement {
  imageId?: string;  // ❌ No link to assets table
  videoId?: string;  // ❌ Different field for each type
  // No way to validate or sync
}
```

### After (New System)
```typescript
// Elements now reference assets directly
interface CanvasElement {
  assetId?: string;              // ✅ Link to assets table
  assetType?: "image" | "video"; // ✅ Single field, all types
  assetSyncedAt?: number;        // ✅ Track validation time
}
```

## Key Use Cases

### 1. User Uploads an Image

```typescript
// useFileUpload automatically:
const uploadResult = await storage.upload(blob, options);

// Element gets asset reference
const image: PlacedImage = {
  id: "img-123",
  assetId: uploadResult.assetId,  // ✨ NEW
  assetSyncedAt: Date.now(),      // ✨ NEW
  src: uploadResult.url,
  // ... other properties
};
```

### 2. User Opens a Project

```typescript
// Load with validation
const result = await loadProjectWithAssets(
  project.canvasState,
  assets,
  assetUrls,
  userId,
  { autoFix: true }  // Auto-sync stale metadata
);

// Result includes warnings about issues
if (result.warnings.length > 0) {
  toast.warning(result.warnings[0]);
}

// Canvas is ready with validated elements
setImages(result.images);
setVideos(result.videos);
```

### 3. User Deletes an Asset

```typescript
// Check which projects would be affected
const projects = await getProjectsUsingAsset(assetId);

if (projects.length > 0) {
  showWarning(
    `This asset is used in ${projects.length} projects. ` +
    `${projects.reduce((sum, p) => sum + p.elementCount, 0)} elements will become orphaned.`
  );
}

// Delete the asset
await deleteAsset(assetId);

// Next time those projects load, elements will be marked as orphaned
```

### 4. User Saves a Project

```typescript
// Prepare canvas state for saving
const saveResult = prepareProjectForSave(
  images,
  videos,
  canvasState,
  assets,
  userId,
  { validate: true }  // Validate before saving
);

if (!saveResult.isValid) {
  toast.error("Cannot save: asset references invalid");
  return;
}

// Convert runtime format to persistence format
const elements = saveResult.elements;

// Save to Convex
await saveProject(projectId, {
  elements,
  lastModified: Date.now(),
});
```

## File Structure

```
src/
├── types/
│   ├── project.ts           # CanvasElement with assetId
│   └── canvas.ts            # PlacedImage/PlacedVideo with assetId
├── lib/sync/
│   ├── asset-synchronizer.ts    # Validation logic
│   ├── element-converter.ts     # Format conversion
│   └── project-with-assets.ts   # High-level operations
└── hooks/
    └── useAssetSync.ts          # React hook

convex/
├── projects.ts              # Updated saveProject schema
└── asset-sync.ts            # New validation queries

docs/
├── ASSET_SYNCHRONIZATION.md  # Complete architecture
└── ASSET_SYNC_QUICK_START.md # This file
```

## Common Tasks

### Task: Validate a Project's Assets

```typescript
import { validateCanvasState } from '@/lib/sync/asset-synchronizer';

const assetMap = new Map(assets.map(a => [a.id, a]));
const result = validateCanvasState(canvasState, assetMap, userId);
```

### Task: Convert Elements to/from Persistence Format

```typescript
import { 
  mergeToElements, 
  separateElements 
} from '@/lib/sync/element-converter';

// Prepare for save
const elements = mergeToElements(images, videos);

// Prepare for load
const { images, videos } = separateElements(elements, assetUrlMap);
```

### Task: Sync Element with Asset Metadata

```typescript
import { syncElementWithAsset } from '@/lib/sync/asset-synchronizer';

const element = syncElementWithAsset(oldElement, latestAsset);
```

### Task: Orphan an Element (Remove Asset Reference)

```typescript
import { orphanElement } from '@/lib/sync/asset-synchronizer';

const orphaned = orphanElement(element);
// Element can now exist without an asset
```

## Database Schema Changes

### projects table: saveProject mutation

**Added to element schema:**
```typescript
assetId: v.optional(v.id("assets")),
assetSyncedAt: v.optional(v.number()),
assetType: v.optional(v.union(v.literal("image"), v.literal("video"))),
```

**Removed:**
```typescript
imageId: v.optional(v.string()),  // ❌ Removed
videoId: v.optional(v.string()),  // ❌ Removed
```

### New Convex Queries

In `convex/asset-sync.ts`:

- `validateProjectAssets(projectId)` - Validate all elements
- `getProjectAssets(projectId)` - Get assets used in project
- `getProjectsUsingAsset(assetId)` - Find dependent projects

## Migration Path

### For Existing Projects

The system is **backward compatible** - old projects without `assetId` will work fine.

```typescript
// Old elements still work
const element = { imageId: "img-123" };  // Still renders

// But won't have validation
const validation = validateElementAsset(element, assetMap, userId);
// → { hasValidAsset: false } (no asset reference)
```

### To Migrate Old Projects

When a user opens an old project:

1. Elements load normally (backward compatible)
2. Validation detects missing `assetId` references
3. User gets option to:
   - Keep as local-only elements (no sync)
   - Try to auto-link to existing assets (if names match)
   - Re-upload the files

## Performance Tips

### Tip 1: Use Cached Asset Type

```typescript
// ❌ Avoid: N+1 queries
const assetRecords = elements.map(e => getAsset(e.assetId));

// ✅ Better: Use cached type
if (element.assetType === 'video') {
  // Do video-specific work without fetching
}
```

### Tip 2: Batch Validate

```typescript
// ❌ Avoid: Loop validation
for (const element of elements) {
  validateElementAsset(element, assetMap, userId);
}

// ✅ Better: Batch validate
validateCanvasState(canvasState, assetMap, userId);
```

### Tip 3: Lazy Validate

```typescript
// ❌ Don't validate on every render
render() {
  const result = validateCanvasState(...);
  // ...
}

// ✅ Validate on load only
useEffect(() => {
  validateAssets();
}, [projectId]);
```

## Testing

```typescript
// Example test for validation
import { validateElementAsset } from '@/lib/sync/asset-synchronizer';

test('valid element with existing asset', () => {
  const element = { id: 'el-1', assetId: 'asset-1' };
  const asset = { id: 'asset-1', type: 'image', userId: 'user-1' };
  const assetMap = new Map([['asset-1', asset]]);
  
  const result = validateElementAsset(element, assetMap, 'user-1');
  expect(result.hasValidAsset).toBe(true);
});

test('invalid element with missing asset', () => {
  const element = { id: 'el-1', assetId: 'missing-asset' };
  const assetMap = new Map();
  
  const result = validateElementAsset(element, assetMap, 'user-1');
  expect(result.hasValidAsset).toBe(false);
  expect(result.error).toContain('not found');
});
```

## Troubleshooting

### Issue: Elements Show "Asset Not Found"

```typescript
// Check validation result
const validation = validateCanvasState(canvasState, assetMap, userId);

// Orphan them to remove the reference
const fixed = element.map(el =>
  validation.invalidElements.some(inv => inv.elementId === el.id)
    ? orphanElement(el)
    : el
);
```

### Issue: Element Dimensions Changed

```typescript
// Check if metadata is stale
const validation = validateCanvasState(canvasState, assetMap, userId);

if (validation.staleMetadata.length > 0) {
  // Sync elements with asset metadata
  const refreshed = elements.map(el =>
    validation.staleMetadata.find(s => s.elementId === el.id)
      ? syncElementWithAsset(el, assetMap.get(el.assetId)!)
      : el
  );
}
```

### Issue: "Type Mismatch" on Save

```typescript
// Asset type doesn't match element type
// Solution: Fix before saving
if (element.assetType && element.type !== element.assetType) {
  // Sync with correct asset or orphan
  element = orphanElement(element);
}
```

## Next Steps

1. **Integrate with useFileUpload** - Ensure `assetId` is captured on upload
2. **Update project load** - Use `loadProjectWithAssets()` for full validation
3. **Update project save** - Use `prepareProjectForSave()` before saving
4. **Add UI warnings** - Show when elements have orphaned assets
5. **Test migration** - Verify old projects still work

## Documentation

- **Full Details**: See `ASSET_SYNCHRONIZATION.md`
- **Source Code**: `src/lib/sync/*`
- **Convex Backend**: `convex/asset-sync.ts`
