-- Pack « 30 exercices + 15 plays » : achat unique de 10 €.
-- À exécuter une fois dans Supabase → SQL Editor, AVANT de mettre l'offre en ligne.

alter table public.profiles add column if not exists has_pack boolean not null default false;
alter table public.profiles add column if not exists pack_purchased_at timestamptz;

-- Contenu du pack : les deux liens de partage (exercices + plays) créés par l'admin.
-- Table lue et écrite UNIQUEMENT par le serveur (clé service) : RLS activé sans aucune règle = fermée au public.
create table if not exists public.pack_config (
  id int primary key default 1 check (id = 1),
  title text,
  exercises_token text,
  plays_token text,
  updated_at timestamptz default now()
);
alter table public.pack_config enable row level security;

-- Offrir le pack à un compte précis (test, partenaire) sans paiement :
-- update public.profiles set has_pack = true, pack_purchased_at = now()
--   where id = (select id from auth.users where email = 'email@exemple.com');
