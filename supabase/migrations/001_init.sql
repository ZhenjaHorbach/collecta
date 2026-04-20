-- Migration: 001_init
-- Creates core tables: users, collections, collection_items, finds, user_collections, reactions
-- Idempotent: safe to re-run if tables were created manually before first migration push
-- Rollback: drop tables in reverse dependency order (reactions, user_collections, finds, collection_items, collections, users)

-- ─── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── users ─────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users: public read" on public.users;
create policy "users: public read"
  on public.users for select
  using (true);

drop policy if exists "users: owner update" on public.users;
create policy "users: owner update"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── collections ───────────────────────────────────────────────────────────────
create table if not exists public.collections (
  id               uuid primary key default uuid_generate_v4(),
  creator_id       uuid not null references public.users (id) on delete cascade,
  title            text not null,
  description      text,
  cover_image_url  text,
  is_public        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.collections enable row level security;

drop policy if exists "collections: public collections readable by all" on public.collections;
create policy "collections: public collections readable by all"
  on public.collections for select
  using (is_public or creator_id = auth.uid());

drop policy if exists "collections: authenticated users can create" on public.collections;
create policy "collections: authenticated users can create"
  on public.collections for insert
  with check (auth.uid() = creator_id);

drop policy if exists "collections: owner can update" on public.collections;
create policy "collections: owner can update"
  on public.collections for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "collections: owner can delete" on public.collections;
create policy "collections: owner can delete"
  on public.collections for delete
  using (auth.uid() = creator_id);

-- ─── collection_items ──────────────────────────────────────────────────────────
create table if not exists public.collection_items (
  id                   uuid primary key default uuid_generate_v4(),
  collection_id        uuid not null references public.collections (id) on delete cascade,
  name                 text not null,
  description          text,
  example_image_url    text,
  ai_validation_prompt text,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.collection_items enable row level security;

drop policy if exists "collection_items: readable via collection access" on public.collection_items;
create policy "collection_items: readable via collection access"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.is_public or c.creator_id = auth.uid())
    )
  );

drop policy if exists "collection_items: owner can insert" on public.collection_items;
create policy "collection_items: owner can insert"
  on public.collection_items for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.creator_id = auth.uid()
    )
  );

drop policy if exists "collection_items: owner can update" on public.collection_items;
create policy "collection_items: owner can update"
  on public.collection_items for update
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.creator_id = auth.uid()
    )
  );

drop policy if exists "collection_items: owner can delete" on public.collection_items;
create policy "collection_items: owner can delete"
  on public.collection_items for delete
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.creator_id = auth.uid()
    )
  );

-- ─── finds ─────────────────────────────────────────────────────────────────────
create table if not exists public.finds (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users (id) on delete cascade,
  collection_item_id  uuid not null references public.collection_items (id) on delete cascade,
  photo_url           text not null,
  ai_validated        boolean,
  ai_confidence       real,
  ai_notes            text,
  location_lat        double precision,
  location_lng        double precision,
  notes               text,
  created_at          timestamptz not null default now()
);

alter table public.finds enable row level security;

drop policy if exists "finds: readable if collection is public or own find" on public.finds;
create policy "finds: readable if collection is public or own find"
  on public.finds for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
      where ci.id = collection_item_id and c.is_public
    )
  );

drop policy if exists "finds: authenticated users can create own finds" on public.finds;
create policy "finds: authenticated users can create own finds"
  on public.finds for insert
  with check (auth.uid() = user_id);

drop policy if exists "finds: owner can update" on public.finds;
create policy "finds: owner can update"
  on public.finds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "finds: owner can delete" on public.finds;
create policy "finds: owner can delete"
  on public.finds for delete
  using (auth.uid() = user_id);

-- ─── user_collections ──────────────────────────────────────────────────────────
create table if not exists public.user_collections (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique (user_id, collection_id)
);

alter table public.user_collections enable row level security;

drop policy if exists "user_collections: users read own rows" on public.user_collections;
create policy "user_collections: users read own rows"
  on public.user_collections for select
  using (auth.uid() = user_id);

drop policy if exists "user_collections: users can join collections" on public.user_collections;
create policy "user_collections: users can join collections"
  on public.user_collections for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_collections: users can leave collections" on public.user_collections;
create policy "user_collections: users can leave collections"
  on public.user_collections for delete
  using (auth.uid() = user_id);

-- ─── reactions ─────────────────────────────────────────────────────────────────
do $$ begin
  create type public.reaction_type as enum ('like', 'fire', 'wow');
exception when duplicate_object then null;
end $$;

create table if not exists public.reactions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users (id) on delete cascade,
  find_id    uuid not null references public.finds (id) on delete cascade,
  type       public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (user_id, find_id, type)
);

alter table public.reactions enable row level security;

drop policy if exists "reactions: public read" on public.reactions;
create policy "reactions: public read"
  on public.reactions for select
  using (true);

drop policy if exists "reactions: authenticated users can react" on public.reactions;
create policy "reactions: authenticated users can react"
  on public.reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "reactions: owner can remove reaction" on public.reactions;
create policy "reactions: owner can remove reaction"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ─── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at
  before update on public.collections
  for each row execute procedure public.set_updated_at();

drop trigger if exists collection_items_updated_at on public.collection_items;
create trigger collection_items_updated_at
  before update on public.collection_items
  for each row execute procedure public.set_updated_at();

-- ─── user profile auto-create on signup ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── indexes ───────────────────────────────────────────────────────────────────
create index if not exists finds_user_id_idx               on public.finds (user_id);
create index if not exists finds_collection_item_id_idx    on public.finds (collection_item_id);
create index if not exists finds_created_at_idx            on public.finds (created_at desc);
create index if not exists collection_items_collection_idx on public.collection_items (collection_id);
create index if not exists user_collections_user_idx       on public.user_collections (user_id);
create index if not exists user_collections_collection_idx on public.user_collections (collection_id);
create index if not exists reactions_find_id_idx           on public.reactions (find_id);
