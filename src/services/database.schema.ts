// Shared PowerSync schema. Used by both database.service.ts (native) and
// database.service.web.ts (web). `@powersync/common` is the platform-neutral
// package both `@powersync/react-native` and `@powersync/web` already depend
// on at the same version — re-using it here lets the schema definition stay
// in a single file without dragging a platform-specific bundle into the
// other platform's build. See `.claude/rules/architecture.md` (Platform-split
// files) for the parity rule that motivated this split.
import { Schema, Table, column } from '@powersync/common';

const finds = new Table({
  user_id: column.text,
  collection_item_id: column.text,
  photo_url: column.text,
  ai_validated: column.integer,
  ai_confidence: column.real,
  ai_notes: column.text,
  location_lat: column.real,
  location_lng: column.real,
  notes: column.text,
  created_at: column.text,
});

const collections = new Table({
  creator_id: column.text,
  title: column.text,
  description: column.text,
  cover_image_url: column.text,
  is_public: column.integer,
  category: column.text,
  icon: column.text,
  ai_hint: column.text,
  is_freeform: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const collection_items = new Table({
  collection_id: column.text,
  name: column.text,
  description: column.text,
  example_image_url: column.text,
  ai_validation_prompt: column.text,
  sort_order: column.integer,
  rarity: column.text,
  fun_fact: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const user_collections = new Table({
  user_id: column.text,
  collection_id: column.text,
  joined_at: column.text,
});

const reactions = new Table({
  user_id: column.text,
  find_id: column.text,
  type: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({
  finds,
  collections,
  collection_items,
  user_collections,
  reactions,
});
