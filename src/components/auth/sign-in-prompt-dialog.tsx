"use client";

/**
 * Sign-in prompt dialog component.
 *
 * Displays a modal prompting users to sign in before generating AI content.
 * Shown when unauthenticated users attempt to use AI generation features.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SignInButton } from "./sign-in-button";
import { Sparkles, Lock } from "lucide-react";

/**
 * Props for the SignInPromptDialog component.
 */
interface SignInPromptDialogProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when the dialog close is requested */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Sign-in prompt dialog component.
 *
 * Modal dialog that prompts unauthenticated users to sign in
 * before they can generate AI images and videos. Provides clear
 * messaging about the benefits of signing in.
 *
 * @remarks
 * - Only shown to unauthenticated users
 * - Blocks AI generation until user signs in
 * - Explains benefits of authentication:
 *   - Persistent storage across devices
 *   - Save and manage projects
 *   - Track storage usage
 * - Provides prominent Sign In button
 * - Can be dismissed (user can cancel generation)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [showPrompt, setShowPrompt] = useState(false);
 *   const { isAuthenticated } = useAuth();
 *
 *   const handleGenerate = () => {
 *     if (!isAuthenticated) {
 *       setShowPrompt(true);
 *       return;
 *     }
 *     // Proceed with generation
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleGenerate}>Generate</button>
 *       <SignInPromptDialog
 *         open={showPrompt}
 *         onOpenChange={setShowPrompt}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @param props - Component props
 * @returns Sign-in prompt dialog component
 */
export function SignInPromptDialog({
  open,
  onOpenChange,
}: SignInPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle>Sign in to generate content</DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <p>
              To use AI generation features, you need to sign in to your
              account.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-content-base">
                Benefits of signing in:
              </p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Generate AI images and videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Save your work across devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Create and manage multiple projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Track your storage usage</span>
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange?.(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="w-full sm:w-auto">
            <SignInButton variant="primary" size="default" className="w-full" />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
