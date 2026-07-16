-- Policies RLS pour les tables de partage public (shared_plays, shared_play_collections,
-- shared_exercises). Ces tables n'ont pas de colonne user_id : la sécurité repose sur le
-- jeton (token) imprévisible, pas sur l'identité du lecteur — donc la lecture est ouverte
-- à tous (anon compris), mais seule une personne connectée peut créer un partage.
-- À exécuter une fois dans Supabase → SQL Editor.

-- ── shared_play_collections ──
alter table shared_play_collections enable row level security;

create policy "Anyone can read a share by token"
  on shared_play_collections for select
  using (true);

create policy "Authenticated users can create a share"
  on shared_play_collections for insert
  to authenticated
  with check (true);

-- ── shared_plays ──
alter table shared_plays enable row level security;

create policy "Anyone can read a share by token"
  on shared_plays for select
  using (true);

create policy "Authenticated users can create a share"
  on shared_plays for insert
  to authenticated
  with check (true);

-- ── shared_exercises ──
alter table shared_exercises enable row level security;

create policy "Anyone can read a share by token"
  on shared_exercises for select
  using (true);

create policy "Authenticated users can create a share"
  on shared_exercises for insert
  to authenticated
  with check (true);
