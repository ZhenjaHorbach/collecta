import { useCallback, useState } from 'react';

import {
  addCollectionItemsAt,
  deleteCollectionItem,
  updateCollection,
  updateCollectionItem,
  type CreateItemInput,
  type UpdateCollectionInput,
  type UpdateItemInput,
} from '@services/collections.service';

// One row from the form's working state. `dbId` is set for items that
// already exist in the database (loaded via getCollection); items the
// user added during this edit session leave it undefined and become
// INSERTs at save time.
export interface DraftItem {
  dbId?: string;
  name: string;
  description: string | null;
  ai_validation_prompt: string | null;
  rarity: 'common' | 'uncommon' | 'rare';
  fun_fact: string | null;
  example_image_url: string | null;
}

export interface UpdateCollectionPayload {
  collection: UpdateCollectionInput;
  // Snapshot of the items currently in the database, used to compute the
  // diff. We pass it explicitly rather than refetching to avoid a race:
  // the screen already loaded the collection, that load IS our source
  // of truth for "what exists right now".
  existingItemIds: string[];
  // The form's current items in display order. Sort order is derived
  // from this array's index — no need for the screen to manage numbering.
  draftItems: DraftItem[];
}

interface State {
  saving: boolean;
  error: Error | null;
}

const INITIAL: State = { saving: false, error: null };

// Applies a collection edit by sequentially updating the row, deleting
// removed items, updating retained items, and inserting new ones. Not
// atomic — partial failure leaves a half-edited collection. TODO: fold
// into a single SECURITY DEFINER RPC (mirroring fork_collection) once
// editing matures past MVP.
export function useUpdateCollection() {
  const [state, setState] = useState<State>(INITIAL);

  const save = useCallback(
    async (id: string, payload: UpdateCollectionPayload): Promise<boolean> => {
      setState({ saving: true, error: null });
      try {
        // 1. Top-level columns first. If this fails (RLS, validation), the
        // caller still sees the original items in DB unchanged.
        await updateCollection(id, payload.collection);

        const draftDbIds = new Set(
          payload.draftItems.map((it) => it.dbId).filter((v): v is string => Boolean(v))
        );

        // 2. Removed items: in the existing snapshot but not in the draft.
        const toDelete = payload.existingItemIds.filter(
          (existingId) => !draftDbIds.has(existingId)
        );
        for (const removedId of toDelete) {
          await deleteCollectionItem(removedId);
        }

        // 3. Retained items + reordering: every draft item with a dbId gets
        // its fields and sort_order rewritten unconditionally. Cheaper than
        // diffing field-by-field and prevents drift if the user toggled
        // something then toggled it back.
        for (let index = 0; index < payload.draftItems.length; index += 1) {
          const item = payload.draftItems[index];
          if (!item.dbId) continue;
          const patch: UpdateItemInput = {
            name: item.name,
            description: item.description,
            ai_validation_prompt: item.ai_validation_prompt,
            rarity: item.rarity,
            fun_fact: item.fun_fact,
            example_image_url: item.example_image_url,
            sort_order: index,
          };
          await updateCollectionItem(item.dbId, patch);
        }

        // 4. New items keep their array index as sort_order so they land
        // exactly where the user dropped them in the form.
        const inserts: { input: CreateItemInput; sortOrder: number }[] = [];
        for (let index = 0; index < payload.draftItems.length; index += 1) {
          const item = payload.draftItems[index];
          if (item.dbId) continue;
          inserts.push({
            input: {
              name: item.name,
              description: item.description,
              ai_validation_prompt: item.ai_validation_prompt,
              rarity: item.rarity,
              fun_fact: item.fun_fact,
              example_image_url: item.example_image_url,
            },
            sortOrder: index,
          });
        }
        if (inserts.length > 0) {
          await addCollectionItemsAt(id, inserts);
        }

        setState({ saving: false, error: null });
        return true;
      } catch (err) {
        setState({
          saving: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        return false;
      }
    },
    []
  );

  return { ...state, save };
}
