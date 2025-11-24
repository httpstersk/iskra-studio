/**
 * Subscription related constants.
 *
 * Contains all static text and configuration for subscription management.
 */

export const SUBSCRIPTION_CONSTANTS = {
  BENEFITS: {
    EDITING: "Advanced editing features",
    GENERATION_QUEUE: "Priority generation queue",
    IMAGES: "130 images per month (10x more)",
    RESOLUTION: "Higher resolution outputs",
    SUPPORT: "Email support",
    VIDEOS: "25 videos per month (8x more)",
  },
  BILLING: {
    ANNUAL: "Annual",
    ANNUAL_BADGE: "Save 20%",
    ANNUAL_SUBTEXT: "Billed annually",
    MONTHLY: "Monthly",
    MONTHLY_SUBTEXT: "Billed monthly",
    PER_MONTH: "/month",
    PER_YEAR: "/year",
  },
  CTA: {
    CANCEL_ANYTIME: "Cancel anytime. No hidden fees.",
    MANAGE: "Manage Subscription",
    PROCESSING: "Processing...",
    UPGRADE: "Upgrade to Pro",
  },
  FREE_PLAN: {
    DESCRIPTION: (images: number, videos: number) =>
      `Limited to ${images} images and ${videos} videos per month`,
    QUOTA_RESET: "Quota resets:",
    TITLE: "Free Plan",
  },
  LINKS: {
    SUPPORT_EMAIL: "support@example.com",
  },
  PRO_PLAN: {
    ACCESS_UNTIL: "Access until:",
    CANCELLING: "Cancelling",
    NEXT_BILLING: "Next billing:",
    STATUS: "Status:",
    TITLE: "Pro Plan",
    WILL_NOT_RENEW: (date: string) =>
      `Your subscription will not renew. You'll have access to Pro features until ${date}.`,
  },
  TITLES: {
    CHOOSE_CYCLE: "Choose billing cycle:",
    DESCRIPTION: "Manage your subscription and billing",
    MAIN: "Subscription Plan",
    MODAL_DESCRIPTION: "Unlock unlimited creative potential with our Pro plan",
    MODAL_TITLE: "Upgrade to Pro",
    NEED_HELP: "Need help? Contact us at ",
    WHATS_INCLUDED: "What's included:",
  },
} as const;
