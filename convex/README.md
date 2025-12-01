# Convex Backend

This directory contains the Convex backend functions for `iskra-studio`.

## Setup Instructions

### 1. Create Convex Account

1. Go to [convex.dev](https://convex.dev)
2. Sign up or sign in with your preferred method (GitHub recommended)

### 2. Initialize Convex Project

Run the following command to initialize and deploy your Convex project:

```bash
npx convex dev
```

This will:
- Create a new Convex project (or connect to an existing one)
- Generate deployment credentials
- Create the `_generated/` directory with TypeScript types
- Start the development server
- Add `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to your `.env.local`

### 3. Environment Variables

After running `npx convex dev`, the following environment variables will be added to `.env.local`:

```bash
CONVEX_DEPLOYMENT=<your-deployment-name>
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

### 4. Schema

The database schema is defined in `schema.ts` and includes:
- **users** - User accounts with tiers and storage quotas
- **assets** - Images and videos uploaded by users
- **projects** - Canvas workspaces with saved state

### 5. Development

- Run `npx convex dev` to start the development server
- Changes to functions are automatically deployed
- View logs and data at [dashboard.convex.dev](https://dashboard.convex.dev)

## Directory Structure

```
convex/
├── _generated/        # Auto-generated types (do not edit)
├── assets.ts          # Asset management mutations/queries
├── auth.config.ts     # Clerk authentication configuration
├── http.ts            # HTTP actions for file uploads
├── projects.ts        # Project management mutations/queries
├── ratelimit.ts       # Rate limiting logic
├── schema.ts          # Database schema definition
└── users.ts           # User management mutations/queries
```

## Next Steps

Once Convex is initialized, proceed with:
1. Setting up Clerk authentication (see `docs/clerk-setup.md`)
2. Implementing the database schema (Task 1.2)
3. Creating authentication config (Task 1.4)
