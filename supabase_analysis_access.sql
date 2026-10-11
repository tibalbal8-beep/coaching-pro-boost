-- Pack « Analyse » (onglets Scouting report + Mon équipe) : abonnement annuel de 200 €/an.
-- À exécuter une fois dans Supabase → SQL Editor, AVANT de mettre l'offre en ligne.

alter table public.profiles add column if not exists analysis_until timestamptz;
alter table public.profiles add column if not exists analysis_subscription_id text;

-- (Désactivé pour l'instant) Gratuité des abonnés Premium jusqu'au 30 juin 2027 : à n'exécuter que si tu décides de l'offrir.
-- update public.profiles
--    set analysis_until = '2027-06-30 23:59:59+02'
--  where is_premium = true
--    and (analysis_until is null or analysis_until < '2027-06-30 23:59:59+02');

-- Pour offrir l'accès à un compte précis (test, partenaire) sans abonnement :
-- update public.profiles set analysis_until = '2027-06-30 23:59:59+02'
--   where id = (select id from auth.users where email = 'email@exemple.com');
