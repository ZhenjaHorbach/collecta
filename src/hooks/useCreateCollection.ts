import { useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import {
  addCollectionItems,
  type CreateCollectionInput,
  type CreateItemInput,
  createCollection,
} from '@services/collections.service';

export interface CreateCollectionPayload {
  collection: Omit<CreateCollectionInput, 'creator_id'>;
  items: CreateItemInput[];
}

interface State {
  submitting: boolean;
  error: Error | null;
}

const INITIAL: State = { submitting: false, error: null };

export function useCreateCollection() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(INITIAL);

  const submit = async (payload: CreateCollectionPayload): Promise<string | null> => {
    if (!user) {
      const err = new Error('Not authenticated');
      setState({ submitting: false, error: err });
      return null;
    }
    setState({ submitting: true, error: null });
    try {
      const created = await createCollection({
        ...payload.collection,
        creator_id: user.id,
      });
      if (payload.items.length > 0) {
        await addCollectionItems(created.id, payload.items);
      }
      setState({ submitting: false, error: null });
      return created.id;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ submitting: false, error });
      return null;
    }
  };

  return { ...state, submit };
}
