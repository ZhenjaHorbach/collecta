// Seeds the EXPO_PUBLIC_* env vars our services read at import time. Real
// builds get these from .env / EAS secrets; jest runs in plain Node so they
// must be set before the module graph is compiled.
//
// Listed under `setupFiles` in package.json so it runs before transforms,
// not under `setupFilesAfterEach` (which runs after the runtime is built).

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://stub.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'stub-anon-key';
process.env.EXPO_PUBLIC_POWERSYNC_URL ??= 'https://stub.powersync.dev';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??= 'stub-maps-key';
