-- GymTrack RAG: pgvector + ai_documents
create extension if not exists vector;

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  source_type text not null,
  source_id text,
  chunk_index integer not null default 0,
  title text not null,
  content text not null,
  metadata text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upsert key: coalesce null user_id to zero UUID for global knowledge rows
create unique index if not exists ai_documents_upsert_uidx
  on public.ai_documents (
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source_type,
    coalesce(source_id, ''),
    chunk_index
  );

create index if not exists ai_documents_user_source_idx
  on public.ai_documents (user_id, source_type, source_id);

create index if not exists ai_documents_source_type_idx
  on public.ai_documents (source_type);

-- Cosine similarity search
create index if not exists ai_documents_embedding_hnsw_idx
  on public.ai_documents
  using hnsw (embedding vector_cosine_ops);

alter table public.ai_documents enable row level security;

-- Read own personal docs + global knowledge (user_id is null)
drop policy if exists "ai_documents_select_accessible" on public.ai_documents;
create policy "ai_documents_select_accessible"
on public.ai_documents for select
to authenticated
using (user_id is null or (select auth.uid()) = user_id);

-- Users may only insert/update/delete their own rows (not global knowledge)
drop policy if exists "ai_documents_insert_own" on public.ai_documents;
create policy "ai_documents_insert_own"
on public.ai_documents for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "ai_documents_update_own" on public.ai_documents;
create policy "ai_documents_update_own"
on public.ai_documents for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "ai_documents_delete_own" on public.ai_documents;
create policy "ai_documents_delete_own"
on public.ai_documents for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Service role / server (drizzle) bypasses RLS; seed knowledge via server connection.
