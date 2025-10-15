// Deprecated: offline/local queue sync removed. Use Convex queries/mutations directly.
export class SyncManager {
  // Minimal stub to avoid breaking imports if any remain.
  destroy(): void {}
}

export function createSyncManager(): SyncManager {
  return new SyncManager();
}
