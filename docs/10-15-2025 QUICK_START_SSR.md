# Quick Start: Using SSR Optimizations

## For Developers

### Accessing Pre-fetched Data

The application now pre-fetches user data, quota, and projects on the server. To access this data in your client components:

```typescript
"use client";
import { useInitialData } from "@/components/server/initial-data-client";

export function MyComponent() {
  const { user, quota, projects, isAuthenticated } = useInitialData();
  
  // Data is immediately available!
  if (!isAuthenticated) {
    return <SignIn />;
  }
  
  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>Storage: {quota?.storageUsedBytes} bytes</p>
      <p>Projects: {projects.length}</p>
    </div>
  );
}
```

### Benefits
- ✅ **No loading state needed** - Data is pre-fetched server-side
- ✅ **No waterfall requests** - All data fetched in parallel
- ✅ **Faster page loads** - Data ready before client JavaScript executes
- ✅ **Type-safe** - Full TypeScript support

### Adding New Pre-fetched Data

1. **Add server function** in `src/lib/server/convex-server.ts`:
```typescript
export async function getMyNewData() {
  const client = await getAuthenticatedConvexClient();
  return await client.query(api.myTable.myQuery);
}
```

2. **Update preloadAppData** in the same file:
```typescript
export async function preloadAppData() {
  const { userId } = await auth();
  
  if (!userId) {
    return { user: null, quota: null, projects: [], myData: null, isAuthenticated: false };
  }

  const [user, quota, projects, myData] = await Promise.all([
    getCurrentUser(),
    getUserQuota(),
    listProjects(10),
    getMyNewData(), // Add here
  ]);

  return { user, quota, projects, myData, isAuthenticated: true };
}
```

3. **Update TypeScript types** in `src/components/server/initial-data-client.tsx`:
```typescript
type InitialData = {
  user: any | null;
  quota: any | null;
  projects: any[];
  myData: any | null; // Add here
  isAuthenticated: boolean;
};
```

4. **Use in components**:
```typescript
const { myData } = useInitialData();
```

## Architecture Overview

### Server-Side (Pre-rendering)
```
User Request
    ↓
Server Component (page.tsx)
    ↓
Fetch data from Convex
    ↓
Pass to Client via Context
```

### Client-Side (Hydration)
```
Receive pre-fetched data
    ↓
Hydrate React components
    ↓
Data immediately available!
    ↓
Continue with real-time updates
```

## File Structure

```
src/
├── app/
│   ├── page.tsx                          # Server Component wrapper
│   ├── canvas-page-client.tsx            # Client canvas (interactive)
│   ├── layout.tsx                        # Root layout with Suspense
│   └── loading.tsx                       # Loading UI
├── components/
│   ├── server/
│   │   ├── initial-data-provider.tsx     # Server: Pre-fetches data
│   │   ├── initial-data-client.tsx       # Client: Provides via context
│   │   └── canvas-page-wrapper.tsx       # Server: Wraps with Suspense
│   └── loading-fallback.tsx              # Loading component
└── lib/
    ├── server/
    │   └── convex-server.ts              # Server-side Convex client
    └── metadata.ts                       # Metadata generation
```

## Testing

### 1. Verify Server-Side Rendering
```bash
# View HTML source (should contain data, not just empty shell)
curl http://localhost:3000 | grep "InitialData"
```

### 2. Check Network Waterfall
1. Open Chrome DevTools → Network tab
2. Reload page
3. Check for reduced sequential requests
4. Data should be in initial HTML response

### 3. Measure Performance
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

### 4. Test with Slow Network
1. Chrome DevTools → Network tab
2. Throttle to "Slow 3G"
3. Reload page
4. Should see data appear faster than before

## Common Patterns

### Loading States
Even with pre-fetched data, you might need loading states for subsequent requests:

```typescript
const { user: initialUser } = useInitialData();
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState(initialUser);

// Use initialUser for instant render
// Load fresh data if needed
useEffect(() => {
  if (needFreshData) {
    setIsLoading(true);
    fetchFreshData().then(setData).finally(() => setIsLoading(false));
  }
}, [needFreshData]);
```

### Combining with Real-Time Updates
```typescript
const { user: initialUser } = useInitialData();
const liveUser = useQuery(api.users.getCurrentUser);

// Use initial data immediately, then switch to live data
const user = liveUser ?? initialUser;
```

### Error Handling
```typescript
const { user, isAuthenticated } = useInitialData();

if (!isAuthenticated) {
  return <SignInPrompt />;
}

if (!user) {
  return <ErrorState message="Failed to load user data" />;
}

return <UserDashboard user={user} />;
```

## Performance Tips

### ✅ DO
- Pre-fetch data needed for initial render
- Fetch data in parallel with `Promise.all()`
- Use Suspense for progressive loading
- Keep server components at the top level

### ❌ DON'T
- Pre-fetch data not needed immediately
- Fetch data sequentially
- Add "use client" unless necessary
- Forget to handle error states

## Troubleshooting

### "useInitialData must be used within InitialDataClient"
**Problem:** Component using `useInitialData()` is outside the context provider.

**Solution:** Ensure component is a child of `<CanvasPageClient>` or wrapped by `<CanvasPageWrapper>`.

### Data is null/undefined
**Problem:** Data not pre-fetched or user not authenticated.

**Solution:** Check `isAuthenticated` first, then access data with optional chaining:
```typescript
const { user, isAuthenticated } = useInitialData();
if (!isAuthenticated) return <SignIn />;
return <div>{user?.email}</div>;
```

### Slow initial load
**Problem:** Pre-fetching taking too long.

**Solution:** 
1. Check server response time in Network tab
2. Optimize Convex queries
3. Reduce amount of pre-fetched data
4. Use Suspense boundaries to load data progressively

## Resources

- [Full Documentation](./SSR_OPTIMIZATION.md)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Convex Server-Side Queries](https://docs.convex.dev/client/react/server-rendering)

## Support

For questions or issues:
1. Check the full documentation in `docs/SSR_OPTIMIZATION.md`
2. Review the implementation in `src/lib/server/convex-server.ts`
3. Examine existing usage in `src/app/canvas-page-client.tsx`
