# Migration Guide: IndexedDB to Convex

This guide helps users migrate their existing local canvas data (stored in IndexedDB) to Convex for persistent cloud storage.

## Overview

**Previous System:** Canvas state saved locally in browser IndexedDB
- ✅ Fast local access
- ❌ Data lost when clearing browser data
- ❌ No cross-device sync
- ❌ No cloud backup

**New System:** Canvas state saved to Convex + cached in IndexedDB
- ✅ Persistent cloud storage
- ✅ Access from any device
- ✅ Automatic cloud backup
- ✅ Still fast (local cache)

## Migration Options

You have three options when upgrading to the Convex-powered version:

### Option 1: Fresh Start (Recommended for Most Users)

**Best for:**
- Users with no important work saved
- Users who want a clean slate
- Testing the new features

**Process:**
1. Complete Convex and Clerk setup
2. Sign in with your new account
3. Start creating projects with cloud sync
4. Old IndexedDB data remains accessible but unused

**Pros:**
- Simplest approach
- No migration errors
- Clean database

**Cons:**
- Previous canvas work not accessible in new system

### Option 2: Manual Recreation

**Best for:**
- Users with a few important canvases
- Users who want to review work before migrating

**Process:**
1. Complete Convex and Clerk setup
2. Before upgrading, take screenshots of your existing canvases
3. Note any important settings or asset URLs
4. After upgrading, sign in and recreate projects manually
5. Upload saved images/videos from your computer

**Pros:**
- Full control over what gets migrated
- Opportunity to reorganize projects

**Cons:**
- Time-consuming for many projects
- May lose some metadata

### Option 3: Automatic Import Tool (Coming Soon)

**Best for:**
- Power users with many projects
- Users with large amounts of local data

**Status:** Not yet implemented

**Planned Features:**
- One-click import from IndexedDB to Convex
- Preserve all canvas state, images, and videos
- Automatic duplicate detection
- Progress tracking and error handling

**Timeline:** Planned for future release (check GitHub issues for updates)

## Understanding the Migration

### What Happens to IndexedDB Data?

**After upgrading to Convex:**
1. IndexedDB database still exists on your device
2. Old data is not automatically deleted
3. New system uses IndexedDB as a **cache layer** (not primary storage)
4. Old projects are not visible in the new project list

### Data Storage Architecture

**Before (IndexedDB-only):**
```
Browser IndexedDB
└── CanvasState
    ├── images[]
    ├── videos[]
    └── viewport
```

**After (Convex + IndexedDB Cache):**
```
Convex Database (Cloud)
├── users
├── projects
│   └── canvasState
│       ├── elements[]
│       └── viewport
└── assets

↓ syncs to ↓

Browser IndexedDB (Cache)
├── projects (cached)
└── syncQueue (pending changes)
```

## Manual Migration Steps

If you want to manually migrate specific canvases:

### Step 1: Export Your Current Canvas Data

**Before upgrading**, save your work:

1. Open browser DevTools (F12)
2. Go to "Application" tab → "IndexedDB" → "CanvasDB"
3. Click "canvasState" object store
4. Copy the data (right-click → "Copy object")
5. Save to a text file for reference

**Example data structure:**
```json
{
  "images": [
    {
      "id": "img-123",
      "src": "https://fal.cdn/...",
      "x": 100,
      "y": 200,
      "width": 512,
      "height": 512
    }
  ],
  "videos": [],
  "viewport": { "x": 0, "y": 0, "scale": 1 }
}
```

### Step 2: Save Assets Locally

For each image/video in your canvas:

1. Right-click the image/video
2. Select "Save image as..." or "Save video as..."
3. Choose a folder on your computer
4. Name files descriptively (e.g., `landscape-001.png`)

### Step 3: Upgrade and Sign In

1. Pull the latest code with Convex integration
2. Complete [Convex Setup](./convex-setup.md)
3. Complete [Clerk Setup](./clerk-setup.md)
4. Sign in to your account

### Step 4: Create New Project

1. Click the Projects button (top-left, folder icon or Cmd/Ctrl+P)
2. Click "New Project"
3. Enter a name matching your old canvas

### Step 5: Import Assets

1. Drag and drop your saved images/videos onto the canvas
2. Position them as they were before (refer to your JSON export for x/y coordinates)
3. Adjust sizes if needed

### Step 6: Verify Auto-Save

1. Wait 10 seconds after making changes
2. Check for "Saved at [time]" indicator in the header
3. Refresh the page to confirm data persisted
4. Check Convex dashboard to see your project

## Storage Quota Migration

### Free Tier Limits

After migrating to Convex:
- **100 images** + **20 videos** (approx. 500MB)
- Storage usage shown in top-right user menu
- Quota warning when approaching 80%

### Managing Quota

If you hit storage limits:

1. **Review assets:**
   - Click user menu → "Manage Assets" (coming soon)
   - Sort by size to find large files
   
2. **Delete unused:**
   - Remove old test images
   - Delete duplicate generations
   
3. **Upgrade:**
   - Paid tier: 1000 images + 200 videos (approx. 5GB)
   - Contact support for enterprise needs

## Troubleshooting Migration Issues

### "Not authenticated" when trying to create project

**Cause:** Clerk session not established

**Solution:**
1. Sign out completely
2. Clear browser cookies for your app domain
3. Sign in again
4. Wait for "Authenticated" status in user menu

### Images appear broken after migration

**Cause:** FAL.ai URLs from old system may have expired

**Solution:**
1. Expired URLs cannot be recovered
2. Re-upload images from your computer
3. Or regenerate with AI using same prompts

### Project doesn't save

**Cause:** Convex connection issue

**Solution:**
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_CONVEX_URL` in environment
3. Ensure `npx convex dev` is running (development)
4. Check Convex dashboard "Logs" for errors

### IndexedDB quota exceeded after upgrade

**Cause:** Old data + new cache layer exceeds browser limits

**Solution:**
1. Clear old IndexedDB data:
   ```javascript
   // Run in browser console
   indexedDB.deleteDatabase('CanvasDB-old');
   ```
2. New system manages cache automatically
3. Only recent/active projects cached locally

## FAQ

### Will my old data be deleted?

No, IndexedDB data remains on your device unless you manually clear it. However, it won't be visible in the new Convex-powered app.

### Can I use both systems side-by-side?

No, the app uses either IndexedDB-only (old) or Convex+IndexedDB cache (new). You cannot switch between them without losing access to one system's data.

### What if I don't want to migrate now?

You can stay on the old version by not pulling the Convex integration changes. Your local data will continue to work as before.

### Can I rollback after migrating?

Yes, but:
- New Convex projects won't be accessible in old version
- Old IndexedDB data will still be there
- You'll need to revert Git commits to old version

### How do I export projects from Convex?

**Coming soon:** Export feature to download projects as:
- JSON (canvas state)
- ZIP (images + videos + JSON)

For now, download assets individually:
1. Right-click asset → Save
2. Copy canvas state from Convex dashboard "Data" tab

### Is my data secure in Convex?

Yes:
- **Encryption:** All data encrypted in transit (HTTPS) and at rest
- **Access control:** Row-level security ensures users only see their own data
- **Backups:** Convex automatically backs up data
- **Compliance:** SOC 2 Type II certified

### What happens if Convex goes down?

- **Read access:** Cached data in IndexedDB remains accessible
- **Offline editing:** Continue working, changes queued for sync
- **Auto-sync:** Changes upload when connection restored
- **Status:** Check [status.convex.dev](https://status.convex.dev/)

## Automated Migration (Future)

We're planning an automated migration tool with these features:

### Planned Features

- [x] **One-click import:** Migrate all local data automatically
- [x] **Progress tracking:** Real-time migration status
- [x] **Error handling:** Graceful handling of failures
- [x] **Duplicate detection:** Skip already-migrated projects
- [x] **Asset re-upload:** Upload local images/videos to Convex storage
- [x] **Rollback:** Undo migration if errors occur

### Implementation Status

Track progress on GitHub:
- Issue: [#XX - Implement IndexedDB to Convex Migration Tool](https://github.com/yourrepo/spark-videos/issues/XX)
- Milestone: Post-MVP Features

### ETA

Tentatively planned for Q1 2025 (subject to change based on user demand)

## Getting Help

### Support Channels

1. **GitHub Issues:** Report migration bugs
2. **Discord:** Community help and tips
3. **Email:** Contact support for data recovery

### Before Requesting Help

Please provide:
1. Browser and version (e.g., Chrome 120)
2. IndexedDB data size (DevTools → Application → Storage)
3. Number of projects and assets
4. Console error logs (if any)
5. Steps you've already tried

---

## Next Steps After Migration

1. ✅ Test auto-save by making changes and waiting 10 seconds
2. ✅ Verify cross-device sync by signing in from another device
3. ✅ Set up project organization (folders/tags coming soon)
4. ✅ Explore new features (project renaming, thumbnails, search)
5. ✅ Configure auto-save settings (interval, enabled/disabled)

**Welcome to the cloud! Your work is now safe and accessible everywhere.** 🎉

---

**Last Updated:** October 2024  
**Version:** 1.0.0
