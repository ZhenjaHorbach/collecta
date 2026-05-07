import { useLocalSearchParams } from 'expo-router';

import { CreateCollectionScreen } from '@screens/CreateCollectionScreen';

// Edit route reuses the create screen with the editingId prop set —
// the screen branches into edit mode (loads existing data, hides AI
// affordances, dispatches updateCollection on submit). RLS ensures
// non-owners get a save error; we don't gate at the route level so
// deep links still resolve cleanly for the owner across sessions.
export default function CollectionEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreateCollectionScreen editingId={id} />;
}
