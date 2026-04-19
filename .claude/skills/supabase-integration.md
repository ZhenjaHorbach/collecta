# Supabase Integration Patterns

## Client setup
```ts
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '~/src/types/database.types';

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
```

## Query patterns
```ts
// Typed select
const { data, error } = await supabase
  .from('collections')
  .select('id, name, items(count)')
  .eq('user_id', userId)
  .throwOnError()
  .returns<Collection[]>();

// Insert and get row back
const { data } = await supabase
  .from('items')
  .insert({ collection_id, photo_url, status: 'pending' })
  .select()
  .single()
  .throwOnError();
```

## Auth
```ts
// Sign in with OAuth
await supabase.auth.signInWithOAuth({ provider: 'google' });

// Get current user (sync, from cache)
const { data: { user } } = await supabase.auth.getUser();

// Listen to auth changes in root layout
supabase.auth.onAuthStateChange((event, session) => { ... });
```

## Realtime
```ts
// In a hook, with cleanup
useEffect(() => {
  const channel = supabase
    .channel('collection-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, handler)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

## Storage
```ts
// Upload
const { data } = await supabase.storage
  .from('photos')
  .upload(`${userId}/${filename}`, fileBlob, { contentType: 'image/jpeg' });

// Signed URL (private bucket)
const { data: { signedUrl } } = await supabase.storage
  .from('photos')
  .createSignedUrl(path, 3600);
```

## PowerSync (offline sync)
- Initialize PowerSync in `src/services/powersync.service.ts`
- Use `usePowerSync()` hook for reactive queries in components
- Sync rules defined in `powersync.yaml` — map Supabase tables to local SQLite
