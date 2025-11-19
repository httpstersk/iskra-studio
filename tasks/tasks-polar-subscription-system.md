# Tasks: Polar Payment Subscription System

## Relevant Files

### Backend (Convex)
- `convex/schema.ts` - Add subscription and quota fields to users table, create generations table
- `convex/subscriptions.ts` - Polar subscription management functions (create, update, cancel)
- `convex/quotas.ts` - Quota tracking and enforcement logic
- `convex/webhooks.ts` - Polar webhook handlers
- `convex/http.ts` - Update to add webhook endpoint routes

### API Routes
- `src/app/api/polar/checkout/route.ts` - Create Polar checkout session
- `src/app/api/polar/webhook/route.ts` - Handle Polar webhook events
- `src/app/api/polar/portal/route.ts` - Customer portal session creation

### Components
- `src/components/subscription/quota-display.tsx` - Quota usage display widget
- `src/components/subscription/upgrade-modal.tsx` - Upgrade to Pro modal
- `src/components/subscription/subscription-management.tsx` - Subscription settings page
- `src/components/subscription/quota-exceeded-modal.tsx` - Quota limit reached modal

### Hooks
- `src/hooks/use-subscription.ts` - React hook for subscription data
- `src/hooks/use-quota.ts` - React hook for quota data and checks

### Utils
- `src/lib/polar.ts` - Polar SDK initialization and helper functions
- `src/lib/quota-utils.ts` - Quota calculation and reset utilities

### Types
- `src/types/subscription.ts` - TypeScript types for subscriptions and quotas

### Configuration
- `.env.local` - Add Polar API keys and webhook secrets

### Notes

- Convex uses serverless functions instead of traditional API routes
- Quota tracking should be integrated into existing generation API routes
- Update all generation endpoints to check quota before processing
- Consider using Convex scheduled functions for quota resets

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/polar-subscription-system`)

- [ ] 1.0 Set up Polar integration and configuration
  - [ ] 1.1 Install Polar SDK package (`@polar-sh/sdk` or similar)
  - [ ] 1.2 Add Polar API keys to `.env.local` (POLAR_API_KEY, POLAR_WEBHOOK_SECRET)
  - [ ] 1.3 Create `src/lib/polar.ts` with Polar SDK initialization
  - [ ] 1.4 Set up Polar products and pricing in Polar dashboard (monthly and annual plans)
  - [ ] 1.5 Document Polar product IDs in environment variables or constants file

- [ ] 2.0 Implement database schema for subscriptions and quota tracking
  - [ ] 2.1 Read existing `convex/schema.ts` to understand current structure
  - [ ] 2.2 Update users table to add subscription-related fields:
    - [ ] 2.2.1 Add `polarCustomerId` (optional string)
    - [ ] 2.2.2 Add `polarSubscriptionId` (optional string)
    - [ ] 2.2.3 Add `subscriptionStatus` (optional: "active" | "cancelled" | "past_due")
    - [ ] 2.2.4 Add `billingCycleStart` (optional number - timestamp)
    - [ ] 2.2.5 Add `billingCycleEnd` (optional number - timestamp)
    - [ ] 2.2.6 Add `imagesUsedInPeriod` (number, default 0)
    - [ ] 2.2.7 Add `videosUsedInPeriod` (number, default 0)
  - [ ] 2.3 Create new `generations` table to track generation attempts:
    - [ ] 2.3.1 Add userId field (string, indexed)
    - [ ] 2.3.2 Add type field ("image" | "video")
    - [ ] 2.3.3 Add status field ("pending" | "completed" | "failed")
    - [ ] 2.3.4 Add countedTowardsQuota field (boolean)
    - [ ] 2.3.5 Add createdAt field (number - timestamp)
    - [ ] 2.3.6 Add index by_userId_and_type
  - [ ] 2.4 Run schema migration (Convex handles this automatically on deploy)

- [ ] 3.0 Build subscription management backend (API routes, webhooks)
  - [ ] 3.1 Create `convex/subscriptions.ts`:
    - [ ] 3.1.1 Implement `createCheckoutSession` mutation (accepts userId, billingInterval)
    - [ ] 3.1.2 Implement `getSubscriptionStatus` query (returns user's subscription details)
    - [ ] 3.1.3 Implement `createPortalSession` mutation (for managing existing subscription)
    - [ ] 3.1.4 Implement `handleUpgrade` internal function (upgrade Free → Pro)
    - [ ] 3.1.5 Implement `handleDowngrade` internal function (downgrade Pro → Free)
    - [ ] 3.1.6 Implement `cancelSubscription` mutation
  - [ ] 3.2 Create `src/app/api/polar/checkout/route.ts`:
    - [ ] 3.2.1 Accept POST request with userId and billingInterval
    - [ ] 3.2.2 Call Polar API to create checkout session
    - [ ] 3.2.3 Return checkout URL to frontend
  - [ ] 3.3 Create `src/app/api/polar/webhook/route.ts`:
    - [ ] 3.3.1 Verify Polar webhook signature
    - [ ] 3.3.2 Handle "subscription.created" event (update user record, set Pro tier)
    - [ ] 3.3.3 Handle "subscription.updated" event (update billing dates)
    - [ ] 3.3.4 Handle "subscription.cancelled" event (mark for downgrade at period end)
    - [ ] 3.3.5 Handle "payment.succeeded" event (extend billing period)
    - [ ] 3.3.6 Handle "payment.failed" event (notify user, potentially downgrade)
    - [ ] 3.3.7 Log all webhook events for debugging
  - [ ] 3.4 Create `src/app/api/polar/portal/route.ts`:
    - [ ] 3.4.1 Accept POST request with userId
    - [ ] 3.4.2 Create Polar customer portal session
    - [ ] 3.4.3 Return portal URL to frontend
  - [ ] 3.5 Update `convex/http.ts` to expose webhook endpoint if needed

- [ ] 4.0 Implement quota tracking and enforcement logic
  - [ ] 4.1 Create `convex/quotas.ts`:
    - [ ] 4.1.1 Define quota constants (FREE_IMAGE_QUOTA: 24, FREE_VIDEO_QUOTA: 4, PRO_IMAGE_QUOTA: 480, PRO_VIDEO_QUOTA: 96)
    - [ ] 4.1.2 Implement `checkQuota` query (userId, type) - returns available quota
    - [ ] 4.1.3 Implement `incrementQuota` mutation (userId, type) - increments usage counter
    - [ ] 4.1.4 Implement `resetQuota` mutation (userId) - resets counters to zero
    - [ ] 4.1.5 Implement `getQuotaStatus` query - returns usage, limits, reset date
    - [ ] 4.1.6 Implement `checkAndResetIfNeeded` internal function - auto-reset if billing period ended
  - [ ] 4.2 Create `src/lib/quota-utils.ts`:
    - [ ] 4.2.1 Export quota constants
    - [ ] 4.2.2 Implement `calculateDaysUntilReset` helper function
    - [ ] 4.2.3 Implement `getQuotaLimits` helper (returns limits based on tier)
    - [ ] 4.2.4 Implement `calculateQuotaPercentage` helper
  - [ ] 4.3 Update generation API routes to enforce quotas:
    - [ ] 4.3.1 Update `src/app/api/generate-storyline-images/route.ts` - check image quota before generation
    - [ ] 4.3.2 Update `src/app/api/generate-director-variations/route.ts` - check image quota
    - [ ] 4.3.3 Update `src/app/api/generate-camera-angle-variations/route.ts` - check image quota
    - [ ] 4.3.4 Update `src/app/api/generate-lighting-variations/route.ts` - check image quota
    - [ ] 4.3.5 Update any video generation endpoints to check video quota
    - [ ] 4.3.6 Add quota increment after successful generation in all routes
    - [ ] 4.3.7 Ensure failed generations do NOT increment quota
  - [ ] 4.4 Create Convex scheduled function for automatic quota resets:
    - [ ] 4.4.1 Create `convex/crons.ts` with daily job to check and reset expired quotas
    - [ ] 4.4.2 Configure cron schedule in Convex dashboard or config

- [ ] 5.0 Build user interface for subscription management and quota display
  - [ ] 5.1 Create `src/types/subscription.ts`:
    - [ ] 5.1.1 Define SubscriptionTier type
    - [ ] 5.1.2 Define QuotaStatus type
    - [ ] 5.1.3 Define SubscriptionStatus type
  - [ ] 5.2 Create `src/hooks/use-subscription.ts`:
    - [ ] 5.2.1 Implement hook to fetch subscription status from Convex
    - [ ] 5.2.2 Export upgrade and cancel functions
    - [ ] 5.2.3 Add loading and error states
  - [ ] 5.3 Create `src/hooks/use-quota.ts`:
    - [ ] 5.3.1 Implement hook to fetch quota status from Convex
    - [ ] 5.3.2 Return images/videos used, limits, and reset date
    - [ ] 5.3.3 Add real-time updates (Convex reactive queries)
  - [ ] 5.4 Create `src/components/subscription/quota-display.tsx`:
    - [ ] 5.4.1 Display images remaining (e.g., "18/24 images")
    - [ ] 5.4.2 Display videos remaining (e.g., "2/4 videos")
    - [ ] 5.4.3 Show progress bars for visual indication
    - [ ] 5.4.4 Display days until quota reset
    - [ ] 5.4.5 Add warning styling when quota > 80%
    - [ ] 5.4.6 Make component responsive and compact
  - [ ] 5.5 Create `src/components/subscription/upgrade-modal.tsx`:
    - [ ] 5.5.1 Design modal with Pro plan benefits
    - [ ] 5.5.2 Show pricing for monthly and annual options
    - [ ] 5.5.3 Add CTA button that redirects to Polar checkout
    - [ ] 5.5.4 Handle checkout session creation
    - [ ] 5.5.5 Add loading states during checkout creation
  - [ ] 5.6 Create `src/components/subscription/subscription-management.tsx`:
    - [ ] 5.6.1 Display current plan (Free or Pro)
    - [ ] 5.6.2 Show billing frequency for Pro users (monthly/annual)
    - [ ] 5.6.3 Display next billing date
    - [ ] 5.6.4 Add "Manage Subscription" button (links to Polar portal)
    - [ ] 5.6.5 Add "Upgrade to Pro" button for Free users
    - [ ] 5.6.6 Show cancellation status if user cancelled
  - [ ] 5.7 Create `src/components/subscription/quota-exceeded-modal.tsx`:
    - [ ] 5.7.1 Display error message explaining quota exceeded
    - [ ] 5.7.2 Show which quota was exceeded (images or videos)
    - [ ] 5.7.3 Display current usage
    - [ ] 5.7.4 Add "Upgrade to Pro" CTA for Free users
    - [ ] 5.7.5 Show quota reset date as alternative
  - [ ] 5.8 Integrate components into main UI:
    - [ ] 5.8.1 Add QuotaDisplay to header or sidebar in `src/app/canvas-page-client.tsx`
    - [ ] 5.8.2 Show QuotaExceededModal when generation fails due to quota
    - [ ] 5.8.3 Add subscription settings page/section to user menu
    - [ ] 5.8.4 Add upgrade prompts at strategic locations
