# 🔗 Webhook Setup for Local Development

Your subscription checkout succeeded, but the webhook couldn't reach your local server to activate Pro features. Here's how to fix it:

## Quick Start (3 Steps)

### Step 1: Start ngrok Tunnel

Open a **new terminal window** and run:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123-def-456.ngrok-free.app -> http://localhost:3000
```

**Copy the https:// URL** (e.g., `https://abc123-def-456.ngrok-free.app`)

### Step 2: Configure Webhook in Polar

1. Go to: https://sandbox.polar.sh/dashboard
2. Click your organization → **Settings** → **Webhooks**
3. Click **"Add Endpoint"** or **"Create Webhook"**
4. Enter webhook URL:
   ```
   https://your-ngrok-url.ngrok-free.app/api/polar/webhook
   ```
   (Replace `your-ngrok-url` with your actual ngrok URL)

5. Select these events:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.active`
   - ✅ `subscription.canceled`
   - ✅ `order.created`

6. Save and copy the **webhook secret** (starts with `whsec_`)

7. Update `.env.local`:
   ```bash
   POLAR_WEBHOOK_SECRET=whsec_your_new_secret_here
   ```

8. **Restart your dev server** (`npm run dev` or `bun dev`)

### Step 3: Test Webhook

#### Option A: Resend Webhook for Your Existing Subscription (Recommended)

1. In Polar Dashboard, go to **Subscriptions**
2. Click on your recent subscription
3. Find the **"Events"** or **"Webhooks"** tab
4. Look for the `subscription.created` event
5. Click **"Resend"** or **"Retry"**

Your terminal should show:
```
Received Polar webhook event: subscription.created
User user_xxx upgraded to Pro tier
```

#### Option B: Use the Manual Upgrade Script (Temporary Workaround)

If you can't resend the webhook, manually activate your subscription:

1. Get your Clerk User ID:
   - Sign in to your app
   - Open browser console (F12)
   - Run: `await clerk.user.id`
   - Copy the result (e.g., `user_2abc123xyz`)

2. Get Polar IDs from dashboard:
   - Go to https://sandbox.polar.sh/dashboard
   - **Customer ID**: Go to Customers → find your email → copy ID
   - **Subscription ID**: Go to Subscriptions → find your subscription → copy ID

3. Run the upgrade script:
   ```bash
   USER_ID=user_2abc123xyz \
   POLAR_CUSTOMER_ID=cus_abc123 \
   POLAR_SUBSCRIPTION_ID=sub_xyz789 \
   npx tsx scripts/manual-upgrade.ts
   ```

4. Refresh your app - you should now have Pro access!

## Verify It Works

1. Go to your app: http://localhost:3000/subscription
2. You should see:
   - ✅ **Tier**: Pro
   - ✅ **Quota**: 480 images / 96 videos per month
   - ✅ Billing cycle dates

## Important Notes

⚠️ **ngrok URL changes**: Free ngrok URLs change every time you restart ngrok. Update the webhook URL in Polar Dashboard each time.

💰 **Paid ngrok**: Get a permanent URL with ngrok paid plan ($8/month) - https://dashboard.ngrok.com/get-started/your-authtoken

🚀 **Production**: Once deployed, replace ngrok URL with your production domain in Polar webhooks.

## Troubleshooting

### "404 Not Found" when testing webhook
- Make sure your dev server is running (`npm run dev`)
- Verify ngrok is pointing to port 3000
- Check webhook URL ends with `/api/polar/webhook`

### "403 Forbidden" when webhook fires
- Update `POLAR_WEBHOOK_SECRET` in `.env.local`
- Restart your dev server

### Pro features still not showing
- Check your terminal for webhook logs
- Verify webhook event includes your `clerkUserId` in metadata
- Try the manual upgrade script as a workaround

## Need Help?

Check the detailed guide: `scripts/setup-webhooks.md`
