"use client";

/**
 * FIBO analysis toggle component.
 */

import { Switch } from "@/components/ui/switch";
import {
  CANVAS_HEADER_CLASSES,
  CANVAS_HEADER_LABELS,
  FIBO_TOGGLE_ID,
} from "@/constants/canvas-header";
import { isFiboAnalysisEnabledAtom } from "@/store/ui-atoms";
import { useAtom } from "jotai";

/**
 * Toggle switch for enabling/disabling FIBO analysis mode.
 *
 * @remarks
 * - FIBO analysis provides enhanced image analysis capabilities
 * - State persists via Jotai atom
 *
 * @returns FIBO analysis toggle component
 */
export function FiboAnalysisToggle() {
  const [isFiboAnalysisEnabled, setIsFiboAnalysisEnabled] = useAtom(
    isFiboAnalysisEnabledAtom
  );

  return (
    <div className={CANVAS_HEADER_CLASSES.FIBO_TOGGLE_CONTAINER}>
      <Switch
        checked={isFiboAnalysisEnabled}
        id={FIBO_TOGGLE_ID}
        onCheckedChange={setIsFiboAnalysisEnabled}
      />
      <label
        className={CANVAS_HEADER_CLASSES.FIBO_TOGGLE_LABEL}
        htmlFor={FIBO_TOGGLE_ID}
      >
        {CANVAS_HEADER_LABELS.FIBO_ANALYSIS}
      </label>
    </div>
  );
}
