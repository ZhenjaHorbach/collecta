// PowerSync AppSchema is shared between native and web (database.service.ts
// vs database.service.web.ts). The architecture rule: both files must export
// the same constant. This test pins the table set so a careless edit on one
// platform doesn't drift it from the other.

import { AppSchema } from '../database.schema';

describe('AppSchema', () => {
  it('exposes the canonical PowerSync table set', () => {
    // Names come from the PowerSync schema metadata; brittle on purpose so
    // dropping/renaming a table forces a deliberate update to migrations,
    // sync rules, and any consumers.
    const tableNames = AppSchema.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(
      ['collection_items', 'collections', 'finds', 'reactions', 'user_collections'].sort()
    );
  });
});
