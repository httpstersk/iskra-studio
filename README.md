# Infinite Kanvas

![Infinite Kanvas](./public/og-img-compress.png)

An infinite canvas image editor with AI transformations using fal.ai. Built with Next.js, React Konva, and tRPC.

## Features

- Infinite canvas with pan/zoom
- Drag & drop image upload
- AI style transfer via Flux models
- Background removal and object isolation
- Real-time streaming of AI results
- Multi-selection and image manipulation
- **Cloud sync with Convex** - Projects saved to cloud with auto-save
- **User authentication with Clerk** - Secure sign-in with Google, GitHub, or email
- **Project management** - Create, save, and switch between multiple projects
- **Cross-device sync** - Access your projects from any device
- **Offline support** - Continue working offline with automatic sync when reconnected
- **Storage quotas** - Track usage with free (500MB) and paid (5GB) tiers
- Undo/redo support

## Technical Details

### Canvas

React Konva for 2D canvas rendering with viewport culling for performance.

### fal.ai Integration

The app integrates with fal.ai's API in several clever ways:

#### 1. Proxy Architecture

To bypass Vercel's 4.5MB request body limit, we implement a proxy pattern:

```typescript
// Client uploads through proxy
const uploadResult = await falClient.storage.upload(blob);

// Proxy endpoint at /api/fal handles the request
export const POST = route.POST; // fal.ai's Next.js proxy
```

This allows users to upload large images that would otherwise be rejected by Vercel's edge runtime.

#### 2. Rate Limiting

The application implements a three-tier rate limiting system for users without API keys:

```typescript
const limiter = {
  perMinute: createRateLimiter(5, "60 s"), // 10 requests per minute
  perHour: createRateLimiter(15, "60 m"), // 30 requests per hour
  perDay: createRateLimiter(50, "24 h"), // 100 requests per day
};
```

Users can bypass rate limits by adding their own fal.ai API key, which switches them to their own quota.

#### 3. Real-time Streaming

Image generation uses fal.ai's streaming API to provide live updates:

```typescript
// Server-side streaming with tRPC
const stream = await falClient.stream("fal-ai/flux/dev/image-to-image", {
  input: { image_url, prompt },
});

for await (const event of stream) {
  yield tracked(eventId, { type: "progress", data: event });
}
```

The client receives these updates via a tRPC subscription and updates the canvas in real-time, creating a smooth user experience where images gradually appear as they're being generated.

### State Management

The application uses Jotai for global state management with Convex for cloud persistence:

- **Canvas State**: Images, positions, and transformations stored in Jotai atoms
- **History**: Undo/redo stack maintained in memory
- **Persistence**: Auto-saves to Convex every 10 seconds with debouncing
- **Offline Cache**: IndexedDB cache layer for offline access and fast loading
- **Sync Manager**: Bidirectional sync between IndexedDB and Convex with conflict resolution
- **Authentication State**: Clerk user data and Convex user profile in Jotai atoms
- **Project State**: Current project, project list, and auto-save indicators

### API Architecture

Built with tRPC for type-safe API calls:

- `removeBackground`: Uses fal.ai's Bria background removal model
- `isolateObject`: Leverages EVF-SAM for semantic object segmentation
- `generateTextToImage`: Text-to-image generation with Flux
- `generateImageStream`: Streaming image-to-image transformations

## How AI Features Work

### Style Transfer

Uses fal.ai's Flux models to apply artistic styles:

1. User selects an image and provides a prompt
2. Image is uploaded to fal.ai storage via proxy
3. Streaming transformation begins, updating canvas in real-time
4. Final high-quality result replaces the preview

### Object Isolation

Powered by EVF-SAM (Enhanced Visual Foundation Segment Anything Model):

1. User describes object in natural language (e.g., "the red car")
2. EVF-SAM generates a segmentation mask
3. Server applies mask to original image using Sharp
4. Isolated object with transparent background returned to canvas

### Background Removal

Uses Bria's specialized background removal model:

1. Automatic subject detection
2. Clean edge preservation
3. Transparent PNG output

## Performance Optimizations

- **Viewport Culling**: Only renders visible images
- **Streaming Images**: Custom hook prevents flickering during updates
- **Debounced Saving**: Reduces IndexedDB writes
- **Image Resizing**: Automatically resizes large images before upload
- **Lazy Loading**: Default images load asynchronously

## Development

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/spark-videos.git
   cd spark-videos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex** (for cloud storage and sync)
   - See detailed guide: [docs/convex-setup.md](./docs/convex-setup.md)
   - Quick start:
     ```bash
     npx convex dev
     ```
   - Follow prompts to create project and get deployment URL

4. **Set up Clerk** (for authentication)
   - See detailed guide: [docs/clerk-setup.md](./docs/clerk-setup.md)
   - Quick start: [docs/CLERK_QUICKSTART.md](./docs/CLERK_QUICKSTART.md)
   - Create account at [clerk.com](https://clerk.com)
   - Get API keys from dashboard

5. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and fill in:

   ```bash
   # FAL.ai (AI generation)
   FAL_KEY=your_fal_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Convex (database & storage)
   CONVEX_DEPLOYMENT=prod:your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

   # Clerk (authentication)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   CLERK_JWT_ISSUER_DOMAIN=https://your-domain.clerk.accounts.dev
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Optional: Rate limiting
   KV_REST_API_URL=
   KV_REST_API_TOKEN=
   ```

6. **Run development servers**
   
   Start Convex (in one terminal):
   ```bash
   npx convex dev
   ```
   
   Start Next.js (in another terminal):
   ```bash
   npm run dev
   ```

7. **Access the app**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

After running the app:
1. Click "Sign In" in the top-right corner
2. Create an account with email, Google, or GitHub
3. Click the folder icon (top-left) or press Cmd/Ctrl+P to open Projects panel
4. Create your first project
5. Start generating AI images!

### Migration from Old Version

If you have existing canvas data in IndexedDB:
- See migration guide: [docs/migration-guide.md](./docs/migration-guide.md)
- Old data remains accessible but won't auto-migrate
- Manual recreation recommended for important work

### Pre-commit Hooks

The project uses [Husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/lint-staged/lint-staged) for automated code formatting and linting before commits.

Pre-commit hooks are automatically installed when you run `npm install` (via the `prepare` script).

The hooks will:

- Run Prettier formatting on staged files
- Run ESLint with auto-fix on staged files
- Only process files that are staged for commit (more efficient than processing all files)

If you need to manually run the pre-commit checks:

```bash
npx lint-staged
```

### Tech Stack

- **Next.js 15**: React framework with App Router
- **React Konva**: Canvas rendering engine
- **Convex**: Real-time database and file storage
- **Clerk**: Authentication and user management
- **Jotai**: Global state management
- **tRPC**: Type-safe API layer
- **fal.ai SDK**: AI model integration
- **Tailwind CSS**: Styling
- **IndexedDB**: Client-side cache layer
- **Sharp**: Server-side image processing

## Deployment

The app is optimized for Vercel deployment:

- Uses edge-compatible APIs
- Implements request proxying for large files
- Automatic image optimization disabled for canvas compatibility
- Bot protection via BotId integration

## License

MIT
