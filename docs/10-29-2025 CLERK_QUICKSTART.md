# Clerk Setup - Quick Reference

## 🚀 Quick Start (5 minutes)

### 1. Create Clerk Account
👉 Go to: **[clerk.com](https://clerk.com)** → Click "Sign up"

### 2. Create Application
- Click **"+ Create application"**
- Name: `iskra-studio`
- Enable: ✅ Email, ✅ Google, ✅ GitHub
- Click **"Create application"**

### 3. Copy API Keys
You'll see two keys on the Quickstart page:

```
Publishable key: pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Secret key:      sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Update `.env.local`
Open `.env.local` and replace the placeholder values:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[YOUR_KEY_HERE]
CLERK_SECRET_KEY=sk_test_[YOUR_KEY_HERE]
```

**Save the file!**

### 5. Verify Setup ✅
Your `.env.local` should now have:
- ✅ Convex URLs (already configured)
- ✅ Clerk publishable key (starts with `pk_test_`)
- ✅ Clerk secret key (starts with `sk_test_`)
- ✅ Sign-in/sign-up URLs set to `/sign-in` and `/sign-up`

## 🎯 That's It!

You're ready to continue with Task 1.4.

## 📚 Need More Details?

See the full guide: [`docs/clerk-setup.md`](./clerk-setup.md)

## ⚠️ Important Notes

- **Never commit** `.env.local` to Git (already in `.gitignore`)
- **Use test keys** (`pk_test_` / `sk_test_`) for development
- **Production keys** (`pk_live_` / `sk_live_`) should only be used in production

## 🔧 Troubleshooting

**"Where do I find my keys again?"**
👉 [dashboard.clerk.com](https://dashboard.clerk.com) → Your App → API Keys

**"I pasted the wrong key"**
👉 Just copy it again from Clerk Dashboard and replace it in `.env.local`

**"Do I need to restart the dev server?"**
👉 Yes, restart `npm run dev` after changing `.env.local`
