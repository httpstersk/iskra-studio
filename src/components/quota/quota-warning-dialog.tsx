"use client";

import { AlertTriangle, Crown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuota } from "@/hooks/useQuota";
import { useAuth } from "@/hooks/useAuth";
import { formatStorageSize } from "@/utils/quota-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Props for the QuotaWarningDialog component.
 */
interface QuotaWarningDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  
  /** Callback when the dialog close is requested */
  onOpenChange?: (open: boolean) => void;
  
  /** Whether to prevent closing (when quota is exceeded) */
  preventClose?: boolean;
}

/**
 * Quota warning dialog component.
 * 
 * Displays a modal warning when the user has exceeded or is approaching
 * their storage quota. Provides options to manage assets or upgrade.
 * 
 * @remarks
 * - Shows different messages for approaching vs exceeded quota
 * - Provides "Manage Assets" button to navigate to asset management
 * - Shows "Upgrade" button for free-tier users
 * - Can be configured to prevent closing when quota is exceeded
 * - Only renders for authenticated users
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { quota } = useQuota();
 *   const [showWarning, setShowWarning] = useState(false);
 *   
 *   useEffect(() => {
 *     if (quota?.isExceeded) {
 *       setShowWarning(true);
 *     }
 *   }, [quota]);
 *   
 *   return (
 *     <QuotaWarningDialog
 *       open={showWarning}
 *       onOpenChange={setShowWarning}
 *       preventClose={quota?.isExceeded}
 *     />
 *   );
 * }
 * ```
 */
export function QuotaWarningDialog({
  open,
  onOpenChange,
  preventClose = false,
}: QuotaWarningDialogProps) {
  const { quota } = useQuota();
  const { tier } = useAuth();
  const router = useRouter();

  // Don't render if no quota data
  if (!quota) {
    return null;
  }

  const isExceeded = quota.isExceeded;
  const usedText = formatStorageSize(quota.used);
  const limitText = formatStorageSize(quota.limit);

  const handleManageAssets = () => {
    // TODO: Navigate to asset management page when implemented
    // For now, just close the dialog
    router.push("/assets");
    onOpenChange?.(false);
  };

  const handleUpgrade = () => {
    // TODO: Navigate to upgrade/billing page when implemented
    router.push("/upgrade");
    onOpenChange?.(false);
  };

  const handleClose = () => {
    if (!preventClose) {
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={preventClose ? undefined : onOpenChange}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={isExceeded ? "text-red-600" : "text-yellow-600"}
            />
            {isExceeded ? "Storage Limit Exceeded" : "Storage Warning"}
          </DialogTitle>
          <DialogDescription>
            {isExceeded ? (
              <>
                You have exceeded your storage limit. Delete some assets or
                upgrade your plan to continue uploading.
              </>
            ) : (
              <>
                You are approaching your storage limit. Consider deleting
                unused assets or upgrading your plan.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Storage usage display */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current Usage</span>
              <span
                className={`text-sm font-medium ${
                  isExceeded ? "text-red-600" : "text-yellow-600"
                }`}
              >
                {quota.percentage}%
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{usedText} used</span>
                <span>{limitText} limit</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full transition-all ${
                    isExceeded ? "bg-red-600" : "bg-yellow-600"
                  }`}
                  style={{ width: `${Math.min(100, quota.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action info */}
          <div className="space-y-2 text-sm text-gray-400">
            <p>You can:</p>
            <ul className="list-inside list-disc space-y-1 pl-2">
              <li>Delete unused images and videos to free up space</li>
              {tier === "free" && (
                <li>Upgrade to paid plan for 10 GB storage (20x more)</li>
              )}
              <li>Download important assets before deleting</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="default"
            onClick={handleManageAssets}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Manage Assets
          </Button>
          
          {tier === "free" && (
            <Button
              variant="primary"
              onClick={handleUpgrade}
              className="w-full sm:w-auto"
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          )}
          
          {!preventClose && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Dismiss
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
