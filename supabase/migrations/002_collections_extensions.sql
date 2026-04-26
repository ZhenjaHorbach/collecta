-- Migration: 002_collections_extensions
-- Extends collections + collection_items with category, icon, ai_hint, is_freeform, rarity, fun_fact.
-- Idempotent: safe to re-run.
-- Rollback: drop the new columns and types in reverse order.

-- ─── enums ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.collection_category as enum (
    'nature','urban','animals','food','transport','art','sports','visual','seasonal','travel'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.item_rarity as enum ('common','uncommon','rare');
exception when duplicate_object then null;
end $$;

-- ─── collections ───────────────────────────────────────────────────────────────
alter table public.collections
  add column if not exists category    public.collection_category,
  add column if not exists icon        text,
  add column if not exists ai_hint     text,
  add column if not exists is_freeform boolean not null default false;

-- ─── collection_items ──────────────────────────────────────────────────────────
alter table public.collection_items
  add column if not exists rarity   public.item_rarity not null default 'common',
  add column if not exists fun_fact text;
