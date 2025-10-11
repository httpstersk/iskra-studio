/**
 * Keyboard shortcuts management utilities
 * 
 * This module provides reusable utilities for handling keyboard shortcuts
 * in canvas applications, with support for input field detection, modifier keys,
 * and common canvas/video operations.
 * 
 * @module keyboard-shortcuts-utils
 */

/**
 * Keys that should be prevented from their default browser behavior
 */
export const PREVENTABLE_KEYS = [
  'Space',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
] as const;

/**
 * Checks if the current target element is an input field where
 * keyboard shortcuts should be disabled.
 * 
 * @param event - The keyboard event to check
 * @returns True if the target is an input field
 * 
 * @example
 * ```typescript
 * const handleKeyDown = (e: KeyboardEvent) => {
 *   if (isInputField(e)) {
 *     return; // Don't handle shortcuts
 *   }
 *   // Handle shortcuts
 * };
 * ```
 */
export function isInputField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.contentEditable === 'true'
  );
}

/**
 * Checks if an event should prevent its default behavior based on the key code.
 * 
 * @param event - The keyboard event to check
 * @returns True if default should be prevented
 */
export function shouldPreventDefault(event: KeyboardEvent): boolean {
  return PREVENTABLE_KEYS.includes(event.code as any);
}

/**
 * Video playback keyboard shortcut actions
 */
export interface VideoShortcutActions {
  /** Toggle play/pause */
  onTogglePlay: () => void;
  /** Seek backward */
  onSeekBackward: (seconds: number) => void;
  /** Seek forward */
  onSeekForward: (seconds: number) => void;
  /** Increase volume */
  onVolumeUp: (delta: number) => void;
  /** Decrease volume */
  onVolumeDown: (delta: number) => void;
  /** Toggle mute */
  onToggleMute: () => void;
}

/**
 * Video playback state for keyboard shortcuts
 */
export interface VideoShortcutState {
  /** Current playback time in seconds */
  currentTime: number;
  /** Video duration in seconds */
  duration: number;
  /** Current volume (0-1) */
  volume: number;
  /** Whether video is muted */
  muted: boolean;
  /** Whether video is currently playing */
  isPlaying: boolean;
}

/**
 * Configuration for video keyboard shortcuts
 */
export interface VideoShortcutConfig {
  /** Small seek distance in seconds (default: 5) */
  smallSeekStep?: number;
  /** Large seek distance in seconds (default: 10) */
  largeSeekStep?: number;
  /** Volume change step (default: 0.1) */
  volumeStep?: number;
}

/**
 * Creates a keyboard event handler for video playback controls.
 * Supports play/pause, seeking, and volume control.
 * 
 * @param state - Current video state
 * @param actions - Callback actions for keyboard shortcuts
 * @param config - Configuration for shortcut behavior
 * @returns Event handler function
 * 
 * @example
 * ```typescript
 * const handleKeyDown = createVideoShortcutHandler(
 *   {
 *     currentTime: 10,
 *     duration: 60,
 *     volume: 0.8,
 *     muted: false,
 *     isPlaying: true
 *   },
 *   {
 *     onTogglePlay: () => setPlaying(!isPlaying),
 *     onSeekBackward: (s) => setTime(Math.max(0, time - s)),
 *     onSeekForward: (s) => setTime(Math.min(duration, time + s)),
 *     onVolumeUp: (d) => setVolume(Math.min(1, volume + d)),
 *     onVolumeDown: (d) => setVolume(Math.max(0, volume - d)),
 *     onToggleMute: () => setMuted(!muted)
 *   }
 * );
 * 
 * window.addEventListener('keydown', handleKeyDown);
 * ```
 */
export function createVideoShortcutHandler(
  state: VideoShortcutState,
  actions: VideoShortcutActions,
  config: VideoShortcutConfig = {}
): (event: KeyboardEvent) => void {
  const {
    smallSeekStep = 5,
    largeSeekStep = 10,
    volumeStep = 0.1,
  } = config;

  return (event: KeyboardEvent) => {
    if (isInputField(event)) {
      return;
    }

    if (shouldPreventDefault(event)) {
      event.preventDefault();
    }

    switch (event.code) {
      case 'Space':
        actions.onTogglePlay();
        break;

      case 'ArrowLeft':
        const backwardStep = event.shiftKey ? largeSeekStep : smallSeekStep;
        actions.onSeekBackward(backwardStep);
        break;

      case 'ArrowRight':
        const forwardStep = event.shiftKey ? largeSeekStep : smallSeekStep;
        actions.onSeekForward(forwardStep);
        break;

      case 'ArrowUp':
        if (!state.muted) {
          actions.onVolumeUp(volumeStep);
        }
        break;

      case 'ArrowDown':
        if (!state.muted) {
          actions.onVolumeDown(volumeStep);
        }
        break;

      case 'KeyM':
        actions.onToggleMute();
        break;
    }
  };
}

/**
 * Canvas element manipulation keyboard shortcut actions
 */
export interface CanvasShortcutActions {
  /** Delete selected elements */
  onDelete?: () => void;
  /** Duplicate selected elements */
  onDuplicate?: () => void;
  /** Select all elements */
  onSelectAll?: () => void;
  /** Deselect all elements */
  onDeselectAll?: () => void;
  /** Undo last action */
  onUndo?: () => void;
  /** Redo last undone action */
  onRedo?: () => void;
  /** Copy selected elements */
  onCopy?: () => void;
  /** Paste copied elements */
  onPaste?: () => void;
  /** Cut selected elements */
  onCut?: () => void;
}

/**
 * Creates a keyboard event handler for canvas manipulation.
 * Supports delete, duplicate, select all, undo/redo, and clipboard operations.
 * 
 * @param actions - Callback actions for keyboard shortcuts
 * @returns Event handler function
 * 
 * @example
 * ```typescript
 * const handleKeyDown = createCanvasShortcutHandler({
 *   onDelete: () => deleteSelected(),
 *   onDuplicate: () => duplicateSelected(),
 *   onSelectAll: () => selectAll(),
 *   onUndo: () => undo(),
 *   onRedo: () => redo()
 * });
 * 
 * window.addEventListener('keydown', handleKeyDown);
 * ```
 */
export function createCanvasShortcutHandler(
  actions: CanvasShortcutActions
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (isInputField(event)) {
      return;
    }

    const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    // Delete/Backspace - Delete selected
    if ((event.code === 'Delete' || event.code === 'Backspace') && !cmdOrCtrl) {
      event.preventDefault();
      actions.onDelete?.();
      return;
    }

    // Cmd/Ctrl+D - Duplicate
    if (event.code === 'KeyD' && cmdOrCtrl && !event.shiftKey) {
      event.preventDefault();
      actions.onDuplicate?.();
      return;
    }

    // Cmd/Ctrl+A - Select all
    if (event.code === 'KeyA' && cmdOrCtrl) {
      event.preventDefault();
      actions.onSelectAll?.();
      return;
    }

    // Escape - Deselect all
    if (event.code === 'Escape') {
      event.preventDefault();
      actions.onDeselectAll?.();
      return;
    }

    // Cmd/Ctrl+Z - Undo
    if (event.code === 'KeyZ' && cmdOrCtrl && !event.shiftKey) {
      event.preventDefault();
      actions.onUndo?.();
      return;
    }

    // Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y - Redo
    if (
      (event.code === 'KeyZ' && cmdOrCtrl && event.shiftKey) ||
      (event.code === 'KeyY' && cmdOrCtrl)
    ) {
      event.preventDefault();
      actions.onRedo?.();
      return;
    }

    // Cmd/Ctrl+C - Copy
    if (event.code === 'KeyC' && cmdOrCtrl) {
      event.preventDefault();
      actions.onCopy?.();
      return;
    }

    // Cmd/Ctrl+V - Paste
    if (event.code === 'KeyV' && cmdOrCtrl) {
      event.preventDefault();
      actions.onPaste?.();
      return;
    }

    // Cmd/Ctrl+X - Cut
    if (event.code === 'KeyX' && cmdOrCtrl) {
      event.preventDefault();
      actions.onCut?.();
      return;
    }
  };
}

/**
 * Combines multiple keyboard shortcut handlers into a single handler.
 * Useful when you need both video and canvas shortcuts active.
 * 
 * @param handlers - Array of keyboard event handlers
 * @returns Combined event handler function
 * 
 * @example
 * ```typescript
 * const videoHandler = createVideoShortcutHandler(state, actions);
 * const canvasHandler = createCanvasShortcutHandler(canvasActions);
 * const combinedHandler = combineKeyboardHandlers([videoHandler, canvasHandler]);
 * 
 * window.addEventListener('keydown', combinedHandler);
 * ```
 */
export function combineKeyboardHandlers(
  handlers: Array<(event: KeyboardEvent) => void>
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    handlers.forEach((handler) => handler(event));
  };
}
