/**
 * Jotai atoms for history state management
 * Manages undo/redo functionality
 */

import { atom } from "jotai";
import type { HistoryState } from "@/types/canvas";

/**
 * Atom for history stack
 */
export const historyAtom = atom<HistoryState[]>([]);

/**
 * Atom for current position in history
 */
export const historyIndexAtom = atom(-1);

/**
 * Derived atom to check if undo is available
 */
export const canUndoAtom = atom((get) => get(historyIndexAtom) > 0);

/**
 * Derived atom to check if redo is available
 */
export const canRedoAtom = atom(
  (get) => get(historyIndexAtom) < get(historyAtom).length - 1
);
