import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';

import { supabase } from './supabase.service';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error('No active session');

    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(_database: AbstractPowerSyncDatabase): Promise<void> {
    // TODO: implement offline write-back to Supabase
    // Process pending mutations from the local queue and push to Supabase
  }
}
