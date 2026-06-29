# Coaching Pro Boost — Guide de mise en ligne

Ce projet contient ton appli "Coaching Pro Boost", prête à être déployée en dehors de Claude.
Suis ces étapes dans l'ordre — ça prend environ 20 minutes la première fois.

---

## Étape 1 — Créer la base de données (Supabase)

1. Va sur **https://supabase.com** → "Start your project" → crée un compte (gratuit).
2. Clique **"New project"**. Donne-lui un nom (ex: `coaching-pro-boost`), choisis un mot de passe pour la base, valide.
3. Une fois le projet créé, va dans l'onglet **"SQL Editor"** (menu de gauche) et colle ce code, puis clique **"Run"** :

```sql
create table kv_store (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

create policy "Allow all access"
  on kv_store
  for all
  using (true)
  with check (true);
```

   Cette table stockera toutes tes données (exercices, séances, équipe...), exactement comme le faisait Claude, mais de façon permanente.

   ⚠️ Note sécurité : cette configuration ouvre l'accès à quiconque connaît l'URL et la clé de ton projet. C'est très bien pour un usage perso, mais ne partage pas ta clé publiquement. Si tu veux ajouter une vraie authentification plus tard (mot de passe pour toi/ton staff), dis-le-moi.

4. Va dans **"Project Settings" → "API"**. Note ces deux valeurs (tu en auras besoin à l'étape 3) :
   - **Project URL**
   - **anon public key**

---

## Étape 2 — Mettre le code sur GitHub

1. Crée un compte sur **https://github.com** si tu n'en as pas.
2. Crée un nouveau dépôt (bouton vert **"New"**), nomme-le `coaching-pro-boost`, laisse-le **Public** ou **Private** (au choix), ne coche aucune case d'initialisation.
3. Sur ton ordinateur, dans le dossier de ce projet, ouvre un terminal et tape :

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/TON-NOM-UTILISATEUR/coaching-pro-boost.git
git push -u origin main
```

   (Remplace `TON-NOM-UTILISATEUR` par ton pseudo GitHub.)

---

## Étape 3 — Déployer (Vercel)

1. Va sur **https://vercel.com** → connecte-toi avec ton compte GitHub.
2. Clique **"Add New" → "Project"**, choisis le dépôt `coaching-pro-boost`.
3. Avant de cliquer "Deploy", ouvre la section **"Environment Variables"** et ajoute :
   - `VITE_SUPABASE_URL` → colle l'URL notée à l'étape 1
   - `VITE_SUPABASE_ANON_KEY` → colle la clé notée à l'étape 1
4. Clique **"Deploy"**. Au bout d'une minute, Vercel te donne une URL du type `coaching-pro-boost.vercel.app`.

---

## Étape 4 — Installer sur ton iPad/téléphone

1. Ouvre l'URL Vercel dans Safari (iPad) ou Chrome (Android).
2. iPad/iPhone : bouton **Partager** → **"Sur l'écran d'accueil"**.
   Android : menu **⋮** → **"Ajouter à l'écran d'accueil"**.
3. L'icône **Coaching Pro Boost** apparaît comme une vraie app.

---

## Pour la suite (modifications)

Une fois ces étapes faites, à chaque fois que tu (ou moi, dans une nouvelle conversation) modifie le code et le pousse sur GitHub (`git push`), Vercel redéploie automatiquement la nouvelle version en quelques secondes — tu n'as rien à refaire.

Si tu reviens me voir dans une nouvelle conversation pour une modification, donne-moi accès au code (en collant le contenu de `src/App.jsx`, ou en me donnant le lien du dépôt GitHub) et je pourrai reprendre directement où on s'est arrêtés.
