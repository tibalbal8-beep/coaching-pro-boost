-- Colonne admin sur profiles (pour autoriser la publication d'annonces)
alter table public.profiles add column if not exists is_admin boolean not null default false;

update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'tibalbal8@gmail.com');

-- Table des annonces globales (bannière affichée à tous les utilisateurs)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.announcements enable row level security;

-- Tout le monde (connecté) peut lire les annonces actives
create policy "Anyone can read announcements"
  on public.announcements for select
  using (true);

-- Seuls les admins peuvent créer/modifier des annonces
create policy "Admins can insert announcements"
  on public.announcements for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update announcements"
  on public.announcements for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
