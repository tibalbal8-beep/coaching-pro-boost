-- Historique des sauvegardes (exercices, séances, plays, etc.)
-- À exécuter une fois dans Supabase → SQL Editor

create table if not exists kv_store_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  created_at timestamptz not null default now()
);

create index if not exists kv_store_history_user_key_created_idx
  on kv_store_history (user_id, key, created_at desc);

alter table kv_store_history enable row level security;

create policy "Users can read own history"
  on kv_store_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on kv_store_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on kv_store_history for delete
  using (auth.uid() = user_id);
