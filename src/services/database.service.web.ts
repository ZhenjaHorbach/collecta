import type { AbstractPowerSyncDatabase } from '@powersync/common';

import { AppSchema } from './database.schema';
import { SupabaseConnector } from './powersync.service';

export { AppSchema };

// `@powersync/web` spawns a SharedWorker via `new URL(..., import.meta.url)`,
// which Metro can't transform for the web IIFE bundle (parse error at load).
// Web is online-only; queries hit Supabase directly. `_layout.tsx` calls
// `db.connect/disconnect` at boot — both are no-ops here.
const stubDb = {
  connect: async () => {},
  disconnect: async () => {},
} as unknown as AbstractPowerSyncDatabase;

export const db = stubDb;
export const connector = new SupabaseConnector();
