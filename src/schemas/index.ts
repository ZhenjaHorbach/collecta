// Runtime validation schemas for everything that crosses the API boundary.
// Service-layer code MUST run Supabase rows and edge-function output through
// these schemas before letting them into the rest of the app — TypeScript
// types are erased at runtime, so a schema drift would silently bubble up
// otherwise.

import { z } from 'zod';

import { COLLECTION_CATEGORIES } from '@constants/categories';

export const CategoryEnum = z.enum([COLLECTION_CATEGORIES[0], ...COLLECTION_CATEGORIES.slice(1)]);

export const RarityEnum = z.enum(['common', 'uncommon', 'rare']);

export const ReportTargetEnum = z.enum(['collection', 'find']);
export const ReportStatusEnum = z.enum(['pending', 'reviewed', 'dismissed']);

export const CollectionSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  category: CategoryEnum.nullable(),
  ai_hint: z.string().nullable(),
  is_freeform: z.boolean(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionItemSchema = z.object({
  id: z.string().uuid(),
  collection_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  ai_validation_prompt: z.string().nullable(),
  example_image_url: z.string().nullable(),
  rarity: RarityEnum,
  fun_fact: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CollectionItem = z.infer<typeof CollectionItemSchema>;

export const FindSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  collection_item_id: z.string().uuid(),
  photo_url: z.string().min(1),
  ai_validated: z.boolean().nullable(),
  ai_confidence: z.number().min(0).max(1).nullable(),
  ai_notes: z.string().nullable(),
  notes: z.string().nullable(),
  location_lat: z.number().nullable(),
  location_lng: z.number().nullable(),
  created_at: z.string(),
});
export type Find = z.infer<typeof FindSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  target_type: ReportTargetEnum,
  target_id: z.string().uuid(),
  reason: z.string().nullable(),
  status: ReportStatusEnum,
  created_at: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;

export const AiDraftItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  ai_hint: z.string().min(1).max(500),
  rarity: RarityEnum,
  fun_fact: z.string().min(1).max(500),
});
export type AiDraftItem = z.infer<typeof AiDraftItemSchema>;

export const AiDraftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: CategoryEnum,
  items: z.array(AiDraftItemSchema).min(5).max(20),
});
export type AiDraft = z.infer<typeof AiDraftSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  confidence: z.number().min(0).max(1),
  detected: z.string().min(1),
  suggestion: z.string().min(1),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
