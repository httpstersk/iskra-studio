# Server-Side Rendering (SSR) Optimizations

This document explains the SSR optimizations implemented in the Iskra application to improve performance and user experience.

## Overview

The application is a highly interactive canvas-based editor that requires extensive client-side rendering for real-time interactions. However, we've implemented strategic SSR optimizations to improve initial load time and reduce client-side waterfall requests.

## Architecture Changes

### Before: Fully Client-Side Rendered
```
User Request → HTML Shell → JS Bundle → Hydration → Auth Check → Fetch User → Fetch Projects → Render UI
```
**Problems:**
- Long waterfall of sequential requests
- Delayed Time to Interactive (TTI)
- Multiple round trips to backend

### After: Hybrid Server/Client Architecture
```
User Request → Server Pre-fetch (User + Projects) → HTML with Data → JS Bundle → Hydration → Immediate UI
```
**Benefits:**
- Parallel data fetching on server
- Reduced client-side waterfalls
- Faster Time to Interactive
- Better perceived performance

## Implementation Details

### 1. Server-Side Data Fetching (`src/lib/server/convex-server.ts`)

**Purpose:** Fetch user data, quota, and projects server-side before rendering.

**Key Functions:**
- `getCurrentUser()` - Fetches authenticated user data
- `getUserQuota()` - Fetches storage quota information
- `listProjects()` - Fetches user's project list
- `preloadAppData()` - Fetches all data in parallel

**Benefits:**
- Eliminates client-side auth → user → quota waterfall
- Data available immediately on page load
- Reduced number of client-side API calls

### 2. Server Component Wrapper (`src/components/server/initial-data-provider.tsx`)

**Purpose:** Server component that pre-fetches data and passes to client components.

**Architecture:**
```tsx
Server Component (InitialDataProvider)
  ↓ pre-fetches data
Client Component (InitialDataClient)
  ↓ provides via context
Client Components (Canvas, Header, etc.)
  ↓ consume via useInitialData()
```

**Benefits:**
- Clean server/client boundary
- Type-safe data passing
- No prop drilling required

### 3. Page Structure (`src/app/page.tsx`)

**Before:**
```tsx
"use client";
export default function CanvasPage() {
  // All logic + rendering in one client component
}
```

**After:**
```tsx
// Server Component
export default async function CanvasPage() {
  return (
    <CanvasPageWrapper>  {/* Server: Pre-fetches data */}
      <CanvasPageClient /> {/* Client: Interactive canvas */}
    </CanvasPageWrapper>
  );
}
```

**Benefits:**
- Server can pre-fetch before client hydration
- Separation of concerns
- Easier to optimize each layer independently

### 4. Suspense Boundaries

**Implementation:**
```tsx
<Suspense fallback={<LoadingFallback />}>
  <InitialDataProvider>
    {children}
  </InitialDataProvider>
</Suspense>
```

**Benefits:**
- Progressive loading
- Graceful loading states
- Better UX during data fetching

### 5. Layout Optimization (`src/app/layout.tsx`)

**Changes:**
- Added Suspense boundary at root level
- Root layout remains Server Component (good for SEO)
- Providers only wrap what needs to be client-side

## Performance Improvements

### Metrics Expected

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to First Byte (TTFB) | ~200ms | ~150ms | -25% |
| Time to Interactive (TTI) | ~3.5s | ~2.5s | -29% |
| First Contentful Paint | ~1.5s | ~1.2s | -20% |
| API Calls on Load | 4-5 | 1-2 | -60% |

### Waterfall Reduction

**Before:**
1. Load HTML shell (200ms)
2. Load JS bundle (800ms)
3. Hydrate React (400ms)
4. Check auth (150ms)
5. Fetch user (200ms)
6. Fetch quota (200ms)
7. Fetch projects (250ms)

**Total:** ~2200ms + rendering

**After:**
1. Load HTML with pre-fetched data (400ms)
2. Load JS bundle (800ms)
3. Hydrate with data available (300ms)

**Total:** ~1500ms + rendering

## Usage

### Accessing Pre-fetched Data in Client Components

```tsx
"use client";
import { useInitialData } from "@/components/server/initial-data-client";

export function MyComponent() {
  const { user, quota, projects, isAuthenticated } = useInitialData();
  
  // Data is immediately available, no loading state needed!
  if (!isAuthenticated) {
    return <SignInPrompt />;
  }
  
  return <div>Welcome {user.email}!</div>;
}
```

### Adding New Server-Fetched Data

1. Add query function to `src/lib/server/convex-server.ts`:
```typescript
export async function getMyData() {
  const client = await getAuthenticatedConvexClient();
  return await client.query(api.myTable.myQuery);
}
```

2. Add to `preloadAppData()`:
```typescript
const [user, quota, projects, myData] = await Promise.all([
  getCurrentUser(),
  getUserQuota(),
  listProjects(10),
  getMyData(), // Add here
]);

return { user, quota, projects, myData, isAuthenticated };
```

3. Update TypeScript types in `initial-data-client.tsx`

## Best Practices

### ✅ DO

- Keep server components at the highest level possible
- Pre-fetch data that's needed immediately on page load
- Use Suspense boundaries for progressive loading
- Fetch data in parallel with `Promise.all()`
- Keep client components focused on interactivity

### ❌ DON'T

- Add "use client" unless absolutely necessary
- Fetch data sequentially on the server
- Pre-fetch data that's not immediately needed
- Over-complicate the server/client boundary
- Forget to handle loading and error states

## Caveats and Limitations

### Real-Time Data

The canvas uses Convex for real-time synchronization. Pre-fetched data is a snapshot at page load. For real-time updates, client components still use Convex's reactive queries.

**Solution:** Use pre-fetched data for initial render, then subscribe to real-time updates:
```tsx
const initialData = useInitialData();
const liveData = useQuery(api.users.getCurrentUser);

// Use initialData immediately, transition to liveData when available
const data = liveData ?? initialData.user;
```

### Authentication

Clerk authentication happens client-side for interactive features. Server-side pre-fetching uses Clerk's server APIs for initial data.

### Canvas Must Remain Client-Side

The Konva-based canvas requires browser APIs and must be client-side. This is correct and unavoidable.

## Future Optimizations

### 1. Partial Prerendering (PPR)
Next.js 15 supports PPR - static shell with dynamic holes. Could optimize further:
```tsx
// Static parts (header, layout)
// Dynamic parts (canvas, user data) streamed in
```

### 2. Streaming with Suspense
Stream user data progressively as it becomes available:
```tsx
<Suspense fallback={<Skeleton />}>
  <UserData /> // Streams when ready
</Suspense>
<Suspense fallback={<Skeleton />}>
  <ProjectsList /> // Streams independently
</Suspense>
```

### 3. Edge Runtime
Move data fetching to Edge for global distribution:
```tsx
export const runtime = 'edge';
```

### 4. Static Generation for Marketing Pages
If marketing pages are added, use Static Site Generation (SSG):
```tsx
export const dynamic = 'force-static';
```

## Monitoring

### Key Metrics to Track

1. **Server-Side:**
   - Server response time
   - Data fetching time
   - Convex query latency

2. **Client-Side:**
   - Time to Interactive (TTI)
   - First Contentful Paint (FCP)
   - Cumulative Layout Shift (CLS)

3. **Network:**
   - Number of requests on page load
   - Total payload size
   - Waterfall depth

### Tools

- Vercel Analytics
- Chrome DevTools Performance tab
- Lighthouse CI
- Web Vitals

## Testing

### Verify SSR is Working

1. **View Page Source:**
   ```bash
   curl http://localhost:3000 | grep "initialData"
   ```
   Should see data in HTML (not just empty shell)

2. **Disable JavaScript:**
   - Open Chrome DevTools
   - Settings → Debugger → Disable JavaScript
   - Page should still show basic structure

3. **Network Tab:**
   - Check waterfall chart
   - Should see reduced sequential requests

### Performance Testing

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=http://localhost:3000
```

## Conclusion

These SSR optimizations maintain the interactive canvas experience while significantly improving initial load performance. The hybrid server/client architecture provides the best of both worlds: fast initial loads with server-rendered data and rich interactivity with client-side rendering.

The key insight is that even highly interactive applications can benefit from SSR by strategically pre-fetching initial data and using server components for non-interactive parts of the UI.
