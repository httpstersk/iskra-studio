# PRD: Polar Payment Subscription System

## Introduction/Overview

This feature implements a two-tier subscription system using Polar's payment infrastructure to monetize the video generation platform. The system will differentiate between Free and Pro users based on monthly generation quotas for images and videos. This allows the platform to offer a freemium model where casual users can access basic functionality while power users can unlock significantly higher quotas through a paid subscription.

**Problem:** Currently, there is no monetization strategy or usage limits, which could lead to unsustainable resource consumption and lack of revenue generation.

**Goal:** Implement a subscription-based quota system that enables sustainable platform growth while providing clear value differentiation between free and paid tiers.

## Goals

1. Integrate Polar payment system for subscription management
2. Implement quota tracking for image and video generations per user
3. Enforce quota limits based on user subscription tier
4. Provide clear visibility of remaining quota to users
5. Enable seamless upgrade/downgrade flow between Free and Pro tiers
6. Ensure failed generations do not consume user quota
7. Reset quotas monthly based on user's billing anniversary date

## User Stories

**As a Free user:**
- I want to generate up to 24 images and 4 videos per month so I can test the platform without payment
- I want to see my remaining quota so I know when I'll need to upgrade
- I want to be notified when I'm approaching or have hit my quota limit
- I want to upgrade to Pro when I need more generations

**As a Pro user:**
- I want to generate up to 480 images and 96 videos per month to support my professional workflow
- I want my quota to reset on my billing anniversary date
- I want the option to pay monthly or annually (with annual discount) based on my preference
- I want to see my subscription details and manage my plan

**As a user who downgrades:**
- I want to keep my Pro quotas until my current billing period ends
- I want clear communication about when my quotas will change

## Functional Requirements

### 1. Subscription Tiers

1.1. The system must support two subscription tiers: **Free** and **Pro**

1.2. Free tier quotas (per billing cycle):
   - 24 image generations
   - 4 video generations

1.3. Pro tier quotas (per billing cycle):
   - 480 image generations
   - 96 video generations

### 2. Polar Integration

2.1. The system must integrate with Polar's API for subscription management

2.2. The system must support Pro subscription billing in two variants:
   - Monthly recurring payment
   - Annual payment (with discounted pricing)

2.3. The system must handle Polar webhooks for subscription events:
   - Subscription created
   - Subscription updated
   - Subscription cancelled
   - Payment successful
   - Payment failed

2.4. The system must store the user's Polar customer ID and subscription ID in the database

### 3. Quota Tracking

3.1. The system must track image generation count separately from video generation count

3.2. The system must store quota usage per user in the database with fields:
   - Current billing period start date
   - Current billing period end date
   - Images generated in current period
   - Videos generated in current period
   - Subscription tier

3.3. The system must increment quota counters only when a generation completes successfully

3.4. The system must NOT increment quota counters when a generation fails (returns an error from the API)

3.5. The system must reset quotas to zero on the user's billing anniversary date

3.6. For Free users, the billing anniversary is the date they first signed up

3.7. For Pro users, the billing anniversary is the date their subscription started

### 4. Quota Enforcement

4.1. The system must check available quota before initiating any image or video generation

4.2. The system must prevent generation requests that would exceed the user's quota

4.3. The system must display an error message when quota is exceeded with:
   - Clear indication of which quota was exceeded (images or videos)
   - Current quota usage
   - Option to upgrade to Pro (for Free users)

4.4. The system must allow generations to complete even if they were started before quota was reached

### 5. User Interface

5.1. The system must display current quota usage prominently in the UI:
   - Remaining images (e.g., "18/24 images remaining")
   - Remaining videos (e.g., "2/4 videos remaining")
   - Days until quota reset

5.2. The system must show a visual indicator (progress bar or percentage) of quota consumption

5.3. The system must provide a clear "Upgrade to Pro" call-to-action for Free users

5.4. The system must provide a subscription management page showing:
   - Current plan
   - Billing frequency (for Pro users)
   - Next billing date (for Pro users)
   - Option to upgrade/downgrade/cancel

### 6. Subscription Management

6.1. Free users must be able to upgrade to Pro via Polar checkout flow

6.2. Pro users must be able to access a billing portal to:
   - Update payment method
   - Switch between monthly/annual billing
   - Cancel subscription

6.3. When a Pro user cancels/downgrades:
   - They must retain Pro quotas until the current billing period ends
   - They must receive confirmation of when downgrade takes effect
   - Their quota must automatically switch to Free limits on the next billing anniversary

6.4. When a Free user upgrades to Pro:
   - They must immediately receive Pro quotas
   - Their billing anniversary must be set to the upgrade date
   - Their previous usage in the Free period must be cleared/reset

### 7. Notifications

7.1. The system must notify users when they reach:
   - 80% of image quota
   - 80% of video quota
   - 100% of either quota

7.2. The system must send email notifications for:
   - Successful Pro subscription activation
   - Upcoming subscription renewal (3 days before)
   - Failed payment
   - Subscription cancellation confirmation

## Non-Goals (Out of Scope)

1. Enterprise or team plans (only individual Free/Pro tiers)
2. Custom quota limits or pay-per-generation options
3. Quota rollover or unused quota credits
4. Free trial period for Pro features
5. Referral or affiliate programs
6. Multiple payment providers (only Polar)
7. Detailed analytics dashboard for usage patterns
8. API access tier or rate limiting beyond quota
9. Priority processing for Pro users

## Design Considerations

### UI Components Needed:
- Quota display widget (persistent in header/sidebar)
- Subscription upgrade modal/page
- Subscription management dashboard
- Quota exceeded modal with upgrade CTA
- Billing history page

### UX Flow:
1. **Quota Display:** Always visible to remind users of their limits
2. **Upgrade Flow:** Seamless redirect to Polar checkout, return to app after payment
3. **Quota Warning:** Non-intrusive notification at 80%, blocking modal at 100%
4. **Downgrade Grace Period:** Clear messaging about when changes take effect

## Technical Considerations

### Integration Points:
1. **Polar API:** RESTful API for creating checkout sessions, managing subscriptions
2. **Polar Webhooks:** Endpoint to receive real-time subscription updates
3. **Database Schema:** New tables/fields for subscription data and quota tracking
4. **Authentication:** Link Polar customer ID to existing user accounts

### Data Model (suggested):
```
User {
  id
  email
  polar_customer_id
  subscription_tier: "free" | "pro"
  subscription_id (nullable)
  billing_cycle_start
  billing_cycle_end
}

Quota {
  user_id
  period_start
  period_end
  images_used
  videos_used
  images_limit
  videos_limit
}

Generation {
  id
  user_id
  type: "image" | "video"
  status: "pending" | "completed" | "failed"
  counted_towards_quota: boolean
  created_at
}
```

### Security:
- Validate webhook signatures from Polar
- Prevent quota manipulation through client-side code
- Secure API endpoints for subscription status checks

### Error Handling:
- Gracefully handle Polar API downtime
- Retry failed webhook processing
- Log all subscription events for debugging

### Performance:
- Cache quota data to avoid DB queries on every generation
- Index user_id and billing period fields for fast quota lookups
- Consider using Redis for real-time quota tracking

## Success Metrics

1. **Conversion Rate:** 5% of Free users upgrade to Pro within 30 days
2. **Quota Accuracy:** 99.9% accurate quota tracking (no false positives/negatives)
3. **Payment Success Rate:** 95% of subscription attempts complete successfully
4. **Churn Rate:** Less than 10% monthly churn for Pro subscribers
5. **User Satisfaction:** Quota system receives positive feedback (measured via surveys)
6. **Revenue:** Generate sustainable revenue to cover infrastructure costs

## Open Questions

1. What is the specific pricing for Pro monthly vs annual plans? - 10% discount
2. Should there be a grace period if a Pro user's payment fails (e.g., 7 days before downgrade)? - No
3. What happens to existing generations when a user hits quota - are they still viewable? - Yes
4. Should there be an admin override ability to grant additional quota in special cases? - No
5. Do we need to store historical quota usage data, or only current period? - No
6. Should we send marketing emails to Free users who consistently hit their quota? - No
7. What is the priority/phase for annual vs monthly billing (can we launch with one first)? - Launch with monthly
8. Should we implement soft limits (warnings) before hard limits (blocking)? - No
