# Convex Setup Guide

This guide walks you through setting up Convex for the Spark Videos application, enabling persistent storage of projects, assets, and user data.

## Overview

Convex provides:
- Real-time database for projects and assets
- File storage for images and videos (up to 25MB per file)
- Serverless backend functions (mutations, queries, actions)
- Automatic TypeScript type generation
- Built-in authentication integration with Clerk

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- A Convex account (free tier available)
- Clerk application already configured (see [clerk-setup.md](./clerk-setup.md))

## Step 1: Create a Convex Account

1. Go to [https://www.convex.dev/](https://www.convex.dev/)
2. Click "Start Building" or "Sign Up"
3. Sign up with GitHub, Google, or email
4. Verify your email address if required

## Step 2: Create a Convex Project

### Option A: Via Convex Dashboard

1. Log in to [https://dashboard.convex.dev/](https://dashboard.convex.dev/)
2. Click "Create a project"
3. Enter project name: `spark-videos` (or your preferred name)
4. Select your region (choose closest to your users)
5. Click "Create Project"

### Option B: Via CLI (Recommended)

1. Install Convex CLI globally (if not already installed):
   ```bash
   npm install -g convex
   ```

2. Navigate to your project directory:
   ```bash
   cd /path/to/spark-videos
   ```

3. Initialize Convex in your project:
   ```bash
   npx convex dev
   ```

4. Follow the prompts:
   - **Login**: Browser will open to authenticate with Convex
   - **Create new project**: Select "Create a new project"
   - **Project name**: Enter `spark-videos` or your preferred name
   - **Region**: Select your preferred region

5. The CLI will:
   - Create `convex/` directory if it doesn't exist
   - Generate `convex.json` configuration
   - Create `convex/_generated/` with TypeScript types
   - Start development server with live reload

## Step 3: Configure Environment Variables

After project creation, Convex will display your deployment URL. Add these to your `.env.local`:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=prod:<your-deployment-name>
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

**Example:**
```bash
CONVEX_DEPLOYMENT=prod:spark-videos-123
NEXT_PUBLIC_CONVEX_URL=https://spark-videos-123.convex.cloud
```

### Finding Your Deployment URL

If you need to find your deployment URL later:

1. Go to [https://dashboard.convex.dev/](https://dashboard.convex.dev/)
2. Select your project
3. Click "Settings" in the left sidebar
4. Copy "Deployment URL" under "Project Information"

## Step 4: Configure Clerk Authentication

Convex needs to validate Clerk JWT tokens. Add your Clerk issuer domain:

```bash
# Clerk JWT Configuration for Convex
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-domain>.clerk.accounts.dev
```

**How to find your Clerk issuer domain:**

1. Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Select your application
3. Go to "API Keys"
4. Copy the "Issuer" URL (looks like `https://xxx.clerk.accounts.dev`)
5. Paste it as `CLERK_JWT_ISSUER_DOMAIN` in `.env.local`

## Step 5: Deploy Schema and Functions

### Development Mode (Local)

While `npx convex dev` is running:

1. Convex automatically watches for changes in `convex/` directory
2. Schema changes in `convex/schema.ts` are applied immediately
3. New functions in `convex/*.ts` are deployed instantly
4. TypeScript types in `convex/_generated/` are regenerated

### Production Deployment

When ready to deploy to production:

```bash
npx convex deploy
```

This will:
- Bundle all Convex functions
- Apply schema migrations
- Deploy to production environment
- Generate production types

**Important:** Always test in development (`npx convex dev`) before deploying to production.

## Step 6: Verify Setup

### Check Convex Dashboard

1. Go to [https://dashboard.convex.dev/](https://dashboard.convex.dev/)
2. Select your project
3. Click "Data" to view database tables:
   - `users` - User accounts and storage quotas
   - `projects` - Canvas workspaces
   - `assets` - Image and video metadata
4. Click "Functions" to see deployed mutations/queries:
   - `users.ts` - User management
   - `projects.ts` - Project CRUD
   - `assets.ts` - Asset management
   - `http.ts` - File upload endpoint

### Test Local Connection

1. Ensure `npx convex dev` is running
2. Start your Next.js dev server:
   ```bash
   npm run dev
   ```
3. Open browser console (F12)
4. Check for Convex connection logs:
   ```
   [Convex] Connected to https://your-deployment.convex.cloud
   ```

### Test Authentication Integration

1. Sign in to your app using Clerk
2. Open browser console
3. Run this test query:
   ```javascript
   // This should return your user data
   await convex.query(api.users.getCurrentUser)
   ```

## Step 7: Schema Overview

Convex schema is defined in `convex/schema.ts`:

### Tables

**users**
- `userId` (string) - Clerk user ID
- `email` (string) - User email
- `tier` (string) - "free" | "paid"
- `storageUsedBytes` (number) - Current storage usage
- `createdAt`, `updatedAt` (number) - Timestamps

**projects**
- `userId` (string, indexed) - Project owner
- `name` (string) - Project name
- `canvasState` (object) - Complete canvas snapshot
- `thumbnailStorageId` (string, optional) - Preview image
- `lastSavedAt`, `createdAt`, `updatedAt` (number) - Timestamps

**assets**
- `userId` (string, indexed) - Asset owner
- `type` (string) - "image" | "video"
- `storageId` (string) - Convex file storage reference
- `width`, `height`, `duration` (number) - Dimensions
- `sizeBytes` (number) - File size
- `metadata` (object) - Generation parameters
- `createdAt` (number) - Timestamp

### Indexes

- `by_userId` - Fast lookup of user's data
- `by_userId_and_type` - Filter assets by type
- `by_userId_and_lastSavedAt` - Sort projects by recency
- `by_storageId` - Lookup assets by storage reference

## Troubleshooting

### "Not authenticated" errors

**Cause:** Clerk JWT token is not being passed to Convex.

**Solution:**
1. Verify `CLERK_JWT_ISSUER_DOMAIN` matches your Clerk issuer
2. Check `convex/auth.config.ts` is configured correctly
3. Ensure `ConvexProviderWithClerk` wraps your app in `src/app/core-providers.tsx`
4. Clear browser cache and sign in again

### "Module not found" errors

**Cause:** Convex types not generated.

**Solution:**
1. Ensure `npx convex dev` is running
2. Wait for "✓ Convex functions ready" message
3. Check `convex/_generated/` directory exists
4. Restart your Next.js dev server

### Schema migration errors

**Cause:** Breaking schema changes without migration.

**Solution:**
1. Review schema changes in `convex/schema.ts`
2. Use Convex dashboard to manually update data if needed
3. For production, plan migrations carefully:
   ```bash
   npx convex deploy --dry-run  # Preview changes
   npx convex deploy            # Apply migration
   ```

### File upload fails

**Cause:** File exceeds 25MB limit or wrong MIME type.

**Solution:**
1. Check file size: `console.log(file.size / (1024 * 1024), 'MB')`
2. Verify MIME type is `image/*` or `video/*`
3. For videos, ensure format is supported (MP4, WebM, MOV)
4. Consider compressing large files client-side

### Rate limiting issues

**Cause:** Too many requests in short time.

**Solution:**
1. Check Convex dashboard "Usage" tab for limits
2. Implement debouncing for auto-save (default: 10 seconds)
3. Batch operations when possible
4. Upgrade to paid plan for higher limits

## Environment Variables Reference

Complete `.env.local` configuration:

```bash
# Convex
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_JWT_ISSUER_DOMAIN=https://your-domain.clerk.accounts.dev
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# FAL.ai (existing)
FAL_KEY=your_fal_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Next Steps

1. ✅ Complete [Clerk Setup](./clerk-setup.md) if not done
2. ✅ Test authentication flow (sign up, sign in, sign out)
3. ✅ Create your first project in the app
4. ✅ Generate an AI image to test asset storage
5. ✅ Check Convex dashboard to see data persisted
6. Read [migration-guide.md](./migration-guide.md) if you have existing IndexedDB data

## Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [Convex React Hooks](https://docs.convex.dev/client/react)

## Support

- **Convex Discord:** [discord.gg/convex](https://discord.gg/convex)
- **Convex Dashboard:** [dashboard.convex.dev](https://dashboard.convex.dev/)
- **Convex Status:** [status.convex.dev](https://status.convex.dev/)

---

**Last Updated:** October 2024  
**Version:** 1.0.0
