# Subscription Components

This directory contains all UI components for the Polar subscription system.

## Components

### QuotaDisplay
Displays current usage for images and videos with progress bars.

```tsx
import { QuotaDisplay } from "@/components/subscription";

// Full display
<QuotaDisplay />

// Compact version for sidebars/headers
<QuotaDisplay compact />
```

### UpgradeModal
Modal for upgrading to Pro subscription with pricing options.

```tsx
import { UpgradeModal } from "@/components/subscription";

const [open, setOpen] = useState(false);

<UpgradeModal open={open} onOpenChange={setOpen} />
```

### SubscriptionManagement
Full subscription management component showing plan details and billing.

```tsx
import { SubscriptionManagement } from "@/components/subscription";

<SubscriptionManagement />
```

### QuotaExceededModal
Modal shown when user exceeds their quota limit.

```tsx
import { QuotaExceededModal } from "@/components/subscription";
import type { GenerationType } from "@/types/subscription";

const [open, setOpen] = useState(false);
const [type, setType] = useState<GenerationType>("image");

<QuotaExceededModal
  open={open}
  onOpenChange={setOpen}
  quotaType={type}
/>
```

## Hooks

### useSubscription
Hook for accessing subscription data and actions.

```tsx
import { useSubscription } from "@/hooks/use-subscription";

const {
  subscription,      // Full subscription info
  tier,             // "free" | "pro"
  isPro,            // boolean
  isFree,           // boolean
  upgrade,          // (interval: BillingInterval) => Promise<void>
  openCustomerPortal, // () => Promise<void>
  isLoading,        // boolean
  error,            // string | null
} = useSubscription();
```

### useQuota
Hook for accessing quota data and checking limits.

```tsx
import { useQuota } from "@/hooks/use-quota";

const {
  imagesUsed,           // number
  imagesLimit,          // number
  imagesRemaining,      // number
  imagesPercentage,     // number (0-100)
  videosUsed,           // number
  videosLimit,          // number
  videosRemaining,      // number
  videosPercentage,     // number (0-100)
  daysUntilReset,       // number
  resetDate,            // Date | null
  imageQuotaExceeded,   // boolean
  videoQuotaExceeded,   // boolean
  isWarning,            // boolean (>80% used)
  canGenerate,          // (type: GenerationType) => boolean
} = useQuota();
```

## Usage Example

### Checking quota before generation

```tsx
import { useQuota } from "@/hooks/use-quota";
import { QuotaExceededModal } from "@/components/subscription";

function ImageGenerator() {
  const { canGenerate, imageQuotaExceeded } = useQuota();
  const [showQuotaError, setShowQuotaError] = useState(false);

  const handleGenerate = async () => {
    if (!canGenerate("image")) {
      setShowQuotaError(true);
      return;
    }

    // Proceed with generation...
  };

  return (
    <>
      <button onClick={handleGenerate}>
        Generate Image
      </button>

      <QuotaExceededModal
        open={showQuotaError}
        onOpenChange={setShowQuotaError}
        quotaType="image"
      />
    </>
  );
}
```

### Showing upgrade prompt

```tsx
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/subscription";

function FeatureGate() {
  const { isFree } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isFree) {
    return (
      <>
        <button onClick={() => setShowUpgrade(true)}>
          Unlock Pro Features
        </button>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
        />
      </>
    );
  }

  return <ProFeature />;
}
```

## Integration Points

1. **Header** - `src/components/layout/canvas-header.tsx`
   - QuotaDisplay shown in compact mode

2. **User Menu** - `src/components/auth/user-menu.tsx`
   - Link to subscription settings page

3. **Subscription Page** - `src/app/subscription/page.tsx`
   - Full subscription management interface

4. **Generation Handlers** - To be implemented in task 4.3
   - Check quota before generation
   - Show QuotaExceededModal on limit
   - Increment quota after successful generation
