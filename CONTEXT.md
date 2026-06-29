# Contexte du projet — Coaching Pro Boost

Ce document résume tout ce qui a été décidé et construit dans une conversation Claude.ai,
pour que Claude Code (ou toute autre session) puisse reprendre le projet sans perdre le contexte.

## Qui utilise l'appli
Thibaud, coach assistant de basket en France (niveau NM1/ProB), entraîne plusieurs équipes
(ex: NM1, U18). Utilise un iPad + Apple Pencil + GoodNotes pour préparer ses séances à la main.

## Ce qu'est l'application
Une PWA (React + Vite + Tailwind) pour gérer une bibliothèque d'exercices de basket et
construire des séances d'entraînement, avec import automatique depuis des PDF/photos de
séances manuscrites (extraction par IA via l'API Anthropic).

## Stack technique
- **Frontend** : React (Vite), Tailwind CSS, icônes lucide-react
- **Stockage** : Supabase (table `kv_store`, clé/valeur) — voir `GUIDE.md` pour la mise en place
- **Hébergement prévu** : Vercel (déploiement continu depuis GitHub)
- **Extraction IA** : appels directs à l'API Anthropic (`api.anthropic.com/v1/messages`) avec
  vision, pour lire les pages de séances manuscrites

## Fonctionnalités déjà construites

### Bibliothèque d'exercices
- Champs par exercice : titre, thèmes tactiques (multi-tags, liste extensible), phase de séance,
  catégorie d'âge (U11→Seniors), format (1c0→5c5), niveau, durée, objectif, notes, fichier
  (photo/PDF original), schéma vectoriel généré (`diagram`), avis (notes/5 + commentaires)
- Filtres combinés (thème + phase + catégorie)
- Notation moyenne affichée sur chaque carte

### Import automatique de séances (PDF/photos)
- Upload PDF et/ou plusieurs photos en une fois
- Découpage PDF page par page (pdf.js chargé dynamiquement depuis cdnjs)
- Chaque page envoyée à l'API Anthropic (vision) qui détecte **un ou plusieurs exercices par
  page** (pas une contrainte 1 page = 1 exercice), avec extraction du texte ET reconstruction
  d'un schéma vectoriel (joueurs, passes, dribbles, main à main, écrans) selon la légende du
  coach (voir notation ci-dessous)
- Écran de vérification avant import définitif (tout reste éditable)

### Notation des schémas tactiques (légende du coach, à respecter dans tout code lié aux diagrammes)
- Numéro entouré d'un cercle = joueur avec ballon
- Numéro seul = joueur sans ballon ; X / X1 / X2 = défenseur
- Pointillés + flèche = passe
- Ligne ondulée + flèche = dribble
- Ligne ondulée + double-barre (sans flèche) = main à main
- Trait plein + flèche = déplacement/cut
- Court trait perpendiculaire épais = écran
- Le rendu vectoriel (`CourtDiagram`) dessine un demi-terrain (carré, arc à 3pts sideline à
  sideline, raquette, panier avec planche) — voir le composant dans `App.jsx`

### Séances
- Construction par ajout depuis la bibliothèque (bouton "+" → panier unique "Nouvelle séance"
  en cours, pas de sélecteur multiple)
- Regroupement par **saison** (août→juillet) puis par **mois**, filtré par équipe active
- Renommage inline depuis la liste (icône crayon)
- Thèmes au niveau de la séance globale (en plus des thèmes par exercice)
- Présences : compteur simple "X présents / effectif total" (pas de liste de joueurs nommés —
  choix volontaire de Thibaud, juste un nombre)
- Avis (note/5 + commentaire) sur la séance globale
- Export : génère un **fichier HTML autonome téléchargeable** (pas `window.print()`, bloqué
  dans le sandbox Claude) — à ouvrir dans un navigateur puis "Imprimer → Enregistrer en PDF"

### Équipe (multi-équipes)
- Plusieurs équipes possibles (ex: NM1, U18), chacune avec nom/niveau/jours d'entraînement/effectif
- Sélecteur d'équipe actif ; toutes les séances sont rattachées à une équipe (`teamId`)
- Création via champ inline (pas de `prompt()` — bloqué dans le sandbox), suppression avec
  confirmation inline (pas de `confirm()` — même souci)

### Stats
- Vue par mois (sélecteur), filtrée par équipe + saison active
- Nombre d'entraînements du mois, temps total
- Répartition du temps par thème tactique (barres de progression, %), calculée en comptant la
  durée complète de l'exercice pour chaque thème qu'il porte (un exercice multi-thèmes compte
  dans chaque thème — les pourcentages ne s'additionnent donc pas forcément à 100%, c'est voulu)

### Navigation
- Menu latéral gauche (hamburger ☰), PAS de barre d'onglets horizontale (changé sur demande)
- 4 sections : Bibliothèque, Séances, Équipe, Stats
- Couleur de sélection unifiée : bleu plein `#2563EB` avec texte blanc, appliqué en **style
  inline** (pas en classe Tailwind arbitraire `bg-[#2563EB]`, qui s'est avérée ne pas toujours
  être prise en compte par le moteur de rendu → bug texte blanc sur fond blanc invisible)

## Pièges déjà rencontrés (à ne pas reproduire)
- **`window.print()`** ne fonctionne pas dans le sandbox Claude → utiliser un téléchargement de
  fichier HTML/Blob à la place
- **`window.prompt()` et `window.confirm()`** ne fonctionnent pas non plus → toujours utiliser
  des champs/boutons de confirmation inline dans l'UI
- **Classes Tailwind avec couleur hexadécimale arbitraire** (`bg-[#xxxxxx]`) parfois non
  appliquées par le moteur de rendu → préférer `style={{ backgroundColor: '#xxxxxx' }}` pour les
  états actifs/sélectionnés critiques
- Lors d'édits successifs sur le fichier, plusieurs fois la ligne de déclaration d'une fonction
  (`function X(...) {`) a été accidentellement supprimée par un remplacement de texte mal ciblé,
  causant des erreurs de syntaxe — toujours valider la syntaxe avec un vrai parseur (babel) avant
  de livrer une version

## Mise à jour — fonctionnalités ajoutées depuis le dernier export

### Navigation
- Menu **latéral gauche** (hamburger ☰) au lieu d'onglets horizontaux — 4 sections : Bibliothèque,
  Séances, Équipe, Stats
- États "sélectionné" (filtres, équipe active, item de menu) en **bleu plein `#2563EB` appliqué en
  style inline** (pas en classe Tailwind arbitraire — voir section pièges)

### Multi-équipes
- `teams` (tableau) + `activeTeamId` remplacent l'ancien objet `team` unique
- Chaque équipe : nom, niveau, jours d'entraînement, effectif (juste un nombre, pas de liste de
  joueurs nommés)
- Toutes les séances ont un `teamId` ; la vue Séances ne montre que les séances de l'équipe active
- Création/suppression d'équipe via UI inline (pas de `prompt()`/`confirm()` — bloqués dans le
  sandbox Claude, donc tout est fait avec des champs/boutons de confirmation dans l'interface)

### Stats
- Nouvel onglet : nombre d'entraînements par mois + temps total + répartition du temps par thème
  tactique (barres de %), filtré par équipe et saison active

### "Dessiner une fiche" — nouvel outil majeur
Permet de dessiner une séance à main levée directement dans l'app (au lieu de passer par
GoodNotes + import photo), avec en fond l'image exacte de la fiche papier du coach (PDF
rasterisé une fois et encodé en base64 dans le code, constante `DEFAULT_SHEET_TEMPLATE` —
remplaçable via un bouton "Changer de gabarit" qui sauvegarde un nouveau fond dans le storage
sous la clé `sheetTemplate`).

Quatre outils dans la barre (state `tool`: `pen` | `player` | `text` | `select`) :
- **Stylo** : dessin libre, avec 3 couleurs, 3 épaisseurs, et surtout 3 **styles de trait** —
  simple, pointillé, zigzag (le zigzag réechantillonne le tracé brut et applique un décalage
  perpendiculaire alterné, fonction `zigzagify`). Option "Flèche" en fin de trait
  (`drawArrowHead`). Le tracé brut s'affiche pendant le geste, le style final (zigzag/pointillé/
  flèche) est appliqué seulement au relâchement (`handlePointerUp`), pas pendant le mouvement.
- **Joueur** : tape le terrain pour poser un jeton (numéro cerclé = avec ballon, numéro seul =
  sans ballon, X/X1.../X5 = défenseur), même légende que les schémas auto-générés
- **Texte** : tape le terrain → zone de texte flottante apparaît à cet endroit. **Entrée = saut de
  ligne, Maj+Entrée ou bouton OK = valide** (texte multi-lignes supporté, `drawTextElement` le
  dessine ligne par ligne)
- **Déplacer** : tape un élément existant (texte, jeton, OU trait) et glisse pour le repositionner.
  Un simple tap (sans glisser) sur un texte rouvre son édition avec le contenu existant. Le
  hit-test (`findElementAt`) gère les 3 types ; `moveElementBy` translate soit un point (jeton/
  texte) soit tous les points d'un trait

Tous les éléments dessinés (traits, jetons, textes) sont stockés dans un seul tableau unifié
`elementsRef.current` avec un champ `type` (`stroke` | `token` | `text`), ce qui permet un
"Annuler" (undo) générique qui retire le dernier élément quel que soit son type, et un rendu
(`redraw()`) qui réaffiche le fond + tous les éléments dans l'ordre.

**Deux façons de valider une fiche dessinée :**
- **"Ajouter directement à la bibliothèque"** : convertit le canevas en image et crée
  immédiatement UN exercice avec cette image comme visuel, sans passer par l'IA — retour direct
  à la bibliothèque
- **"Valider avec analyse IA"** : passe par le même pipeline d'extraction multi-exercices déjà
  utilisé pour les photos importées (détection de plusieurs exercices, écran de vérification),
  puis import et retour à la bibliothèque (pas à la fiche de séance — changé sur demande pour que
  le coach voie directement le résultat visuel)

### Affichage du visuel dans la bibliothèque
- Problème rencontré : les photos/dessins sont stockés **séparément** du reste des données
  (clé `file:{id}` dans le storage) pour ne pas dépasser les limites de taille par clé — donc
  après un rechargement, `ex.file.data` est `null` (seules les métadonnées `hasFile`/`fileName`/
  `fileType` restent dans le blob principal `exercises`)
- Solution : hook `useFileImage(ex)` qui charge à la demande `file:{ex.id}` depuis le storage si
  besoin, utilisé dans `ExerciseCard` (miniature sur la carte) et dans un composant
  `ExerciseFormImagePreview` (aperçu dans la fiche détail, à côté du formulaire, en alternative au
  schéma vectoriel s'il n'y en a pas)

### Dictée vocale
- Composant `DictateButton` (Web Speech API, `webkitSpeechRecognition`, langue `fr-FR`), ajouté
  sur les champs **Objectif** et **Notes** d'un exercice
- ⚠️ Dépend du navigateur, pas de Claude — ne fonctionnera pas forcément dans l'aperçu Claude
  (micro souvent bridé dans ce sandbox) mais devrait marcher sur Chrome/Safari une fois déployé

### Petits correctifs d'UX
- Bouton supprimer (corbeille) sur les cartes d'exercice : était caché derrière un `hover` (donc
  invisible au doigt sur iPad) — rendu **toujours visible**
- Renommage de séance possible directement depuis la liste (icône crayon, composant `SessionRow`)
- Thèmes possibles au niveau de la séance globale (en plus des thèmes par exercice)
- Catégorie d'âge (U11→Seniors) ajoutée aux exercices, filtrable comme les thèmes/phases
- Phase "Préparation physique" ajoutée à la liste des phases de séance

## Pièges supplémentaires rencontrés sur cette session
- **Erreur récurrente** : lors d'édits successifs avec l'outil de remplacement de texte, la ligne
  de déclaration `function X(...) {` juste avant le code inséré a été supprimée par accident à de
  multiples reprises (`ExerciseCard`, `CoachPlaybook`, `SessionRow`, `ExerciseForm`...), causant
  des erreurs "Unexpected token" ou "return outside of function". **Toujours valider avec un vrai
  parseur Babel après chaque modification**, pas seulement relire visuellement.
- Le bouton "Nouvelle équipe" utilisait `prompt()`, bloqué dans le sandbox → remplacé par un champ
  texte inline qui s'affiche à la place du bouton.

- **Partage communautaire entre coachs** : possibilité de créer un exercice "même format" et
  de l'envoyer alimenter une bibliothèque partagée entre plusieurs coachs, avec consentement
  explicite (case à cocher). Nécessiterait un vrai compte utilisateur + une table Supabase
  partagée (pas juste personnelle) — pas encore implémenté
- Sélection collective de groupe/joueurs basée sur les notes des entraîneurs (mentionné dans
  les croquis papier d'origine, mais Thibaud a depuis simplifié "joueurs" à un simple nombre,
  donc ce point est probablement obsolète sauf s'il change d'avis)

## Fichiers du projet
- `src/App.jsx` — composant principal (tout le code de l'appli)
- `src/storage.js` — couche d'abstraction stockage, reproduit l'API `window.storage`
  (get/set/delete/list) mais branchée sur Supabase au lieu du stockage temporaire Claude
- `src/main.jsx`, `index.html`, configs Vite/Tailwind/PostCSS
- `GUIDE.md` — guide de déploiement pas-à-pas (Supabase → GitHub → Vercel → installation iPad)

## Ce que Thibaud a dit vouloir éviter / préférences notées
- Préfère des solutions pratiques et déployables, adaptées à son flux de travail précis
- Veut garder les choses simples côté "joueurs" (juste un nombre, pas une liste nominative pour
  l'instant)
- Découpage de saison : août → juillet (saison sportive), pas calendaire
