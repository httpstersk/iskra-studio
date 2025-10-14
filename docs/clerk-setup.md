# Clerk Authentication Setup Guide

This guide will walk you through setting up Clerk authentication for Iskra (spark-videos).

## Prerequisites

- Convex project initialized (see `convex/README.md`)
- Modern web browser
- Email address for Clerk account

## Step 1: Create Clerk Account

1. Navigate to [clerk.com](https://clerk.com)
2. Click **"Start building for free"** or **"Sign up"**
3. Sign up with your preferred method:
   - **GitHub** (recommended for developers)
   - **Google**
   - **Email**

## Step 2: Create New Application

1. After signing in, you'll see the Clerk Dashboard
2. Click **"+ Create application"**
3. Configure your application:
   - **Application name**: `Iskra` or `spark-videos`
   - **Select authentication methods** (enable all three):
     - ✅ Email address
     - ✅ Google
     - ✅ GitHub
   - Leave other settings as default
4. Click **"Create application"**

## Step 3: Get API Keys

After creating the application, you'll be on the **Quickstart** page:

1. Find the **API Keys** section
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Keep this page open - you'll need these keys in the next step

## Step 4: Add Environment Variables

### Option A: Manual Setup

1. Open your `.env.local` file in the project root
2. Add the following variables (replace with your actual keys):

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-frontend-api.clerk.accounts.dev
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

3. Save the file

### Option B: Using Clerk CLI (Alternative)

If you prefer using the Clerk CLI:

```bash
# Install Clerk CLI globally
npm install -g @clerk/clerk-sdk-node

# Set up environment variables automatically
npx @clerk/clerk-sdk-node setup
```

## Step 5: Get JWT Issuer Domain

For Convex authentication to work, you need the JWT issuer domain:

### Option A: From Clerk Dashboard (Recommended)

1. In Clerk Dashboard, go to **API Keys**
2. Click **"Show JWT public key"** or **"Advanced"**
3. Find **"JWT Issuer"** or **"Issuer URL"**
4. Copy the domain (format: `https://your-app-name.clerk.accounts.dev`)
5. Add to `.env.local`:
   ```bash
   CLERK_JWT_ISSUER_DOMAIN=https://your-app-name.clerk.accounts.dev
   ```

### Option B: Decode from Publishable Key

The publishable key contains the issuer domain in base64:

1. Your publishable key looks like: `pk_test_d2VsY29tZS1idWNrLTYuY2xlcmsuYWNjb3VudHMuZGV2JA`
2. The last part (after `pk_test_`) is base64 encoded
3. Decode it to get the domain (e.g., `welcome-buck-6.clerk.accounts.dev`)
4. Add `https://` prefix:
   ```bash
   CLERK_JWT_ISSUER_DOMAIN=https://welcome-buck-6.clerk.accounts.dev
   ```

## Step 6: Configure Sign-In/Sign-Up Routes

The environment variables we added tell Clerk where to redirect users:
- `/sign-in` - Sign-in page
- `/sign-up` - Sign-up page

These routes will be created automatically by Clerk middleware in Task 2.1.

## Step 7: Test Authentication (After Implementation)

Once the authentication is fully implemented (Tasks 2.x), you can test it:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. You should see a **"Sign In"** button in the navigation

4. Click it and verify:
   - Email sign-in works
   - Google OAuth works
   - GitHub OAuth works

## Environment Variables Reference

Here's what each environment variable does:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public key for client-side Clerk SDK | `pk_test_abc123...` |
| `CLERK_SECRET_KEY` | Secret key for server-side API calls | `sk_test_xyz789...` |
| `CLERK_JWT_ISSUER_DOMAIN` | JWT issuer domain for Convex authentication | `https://your-app.clerk.accounts.dev` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page route | `/sign-up` |

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Step 8: Configure Additional Settings (Optional)

### Email Customization

1. In Clerk Dashboard, go to **Emails**
2. Customize email templates for:
   - Welcome emails
   - Password reset
   - Magic link sign-in

### Social Providers Setup

For production use, you'll need to configure OAuth apps:

#### GitHub OAuth
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `https://your-clerk-domain/v1/oauth_callback`
4. Copy Client ID and Secret to Clerk Dashboard

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI from Clerk Dashboard
6. Copy Client ID and Secret to Clerk Dashboard

### User Profile Fields

1. In Clerk Dashboard, go to **User & Authentication > User profile**
2. Add custom fields if needed (optional):
   - Username
   - First/Last name
   - Phone number

## Step 9: Security Best Practices

✅ **Never commit `.env.local` to Git** - Already in `.gitignore`
✅ **Use test keys for development** - Production keys for deployment
✅ **Rotate keys if exposed** - Regenerate in Clerk Dashboard
✅ **Enable MFA for your Clerk account** - Recommended for production apps

## Troubleshooting

### "Invalid API key" error
- Verify keys are copied correctly (no extra spaces)
- Check you're using the correct environment (test vs production)
- Ensure `NEXT_PUBLIC_` prefix is exact

### OAuth not working
- Verify callback URLs in OAuth provider settings
- Check that OAuth is enabled in Clerk Dashboard
- Clear browser cache and cookies

### Sign-in redirect loops
- Verify `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is set correctly
- Check middleware configuration (Task 2.1)
- Ensure no conflicts with Next.js routing

## Next Steps

After completing this setup:

1. ✅ Clerk application created
2. ✅ API keys obtained
3. ✅ Environment variables configured
4. Continue to **Task 1.4** - Create Clerk authentication config for Convex

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk + Convex Integration](https://clerk.com/docs/integrations/databases/convex)
- [Clerk Dashboard](https://dashboard.clerk.com)

## Support

If you encounter issues:
- Check [Clerk's Status Page](https://status.clerk.com)
- Visit [Clerk's Discord](https://clerk.com/discord)
- Review [Clerk's GitHub Discussions](https://github.com/clerk/javascript/discussions)
