import { useEffect } from 'react';

import { connector, db } from '@services/database.service';

// Connect PowerSync on mount, disconnect on unmount. Mounted once at the
// app root so the `db` lifecycle scope matches the layout's mount lifetime
// exactly. On web the connect/disconnect calls are no-ops (the web variant
// of database.service stubs them), but the hook still runs uniformly.
export function useDbLifecycle(): void {
  useEffect(() => {
    db.connect(connector);
    return () => {
      db.disconnect();
    };
  }, []);
}
