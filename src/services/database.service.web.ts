import { PowerSyncDatabase } from '@powersync/web';

import { AppSchema } from './database.schema';
import { SupabaseConnector } from './powersync.service';

export { AppSchema };

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'collecta.db' },
});

export const connector = new SupabaseConnector();
