import { PowerSyncDatabase, Schema, Table, column } from '@powersync/web';

import { SupabaseConnector } from './powersync.service';

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

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'collecta.db' },
});

export const connector = new SupabaseConnector();
