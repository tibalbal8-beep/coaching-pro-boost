import { createClient } from "@supabase/supabase-js";

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Page intermédiaire pour un lien de partage d'exercice : sert des balises Open Graph (titre,
// description, image) lisibles par les aperçus de lien (WhatsApp, iMessage, etc.), puis redirige
// un vrai visiteur vers l'app. Les robots d'aperçu ne lisent que le <head> et n'exécutent pas
// le script de redirection.
export default async function handler(req, res) {
  const { token } = req.query;
  if (!token || !/^[a-z0-9]+$/i.test(token)) return res.status(400).send("Token manquant");

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from("shared_exercises").select("exercise_data, expires_at").eq("token", token).maybeSingle();

  if (!data) return res.status(404).send("Lien invalide ou expiré");
  if (data.expires_at && new Date(data.expires_at) < new Date()) return res.status(410).send("Lien expiré");

  const ex = data.exercise_data || {};
  const appUrl = `https://coachingproboost.com/app?share=${token}`;
  const isSafeImage = (src) => typeof src === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(src);
  const hasImage = (ex.schemas || []).some(isSafeImage) || isSafeImage(ex.file?.data);
  const imageUrl = hasImage ? `https://coachingproboost.com/api/share-exercise-image?token=${token}` : "https://coachingproboost.com/logo-full.png";
  const themesList = (ex.themes || []).join(", ");
  const desc = `Intègre cet exercice à ta bibliothèque Coaching Pro Boost${themesList ? `, tu travailleras ${themesList}` : ""}.`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(ex.titre || "Exercice partagé")} — Coaching Pro Boost</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(ex.titre || "Exercice partagé")}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${imageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #F2EDE4; color: #1B2A4A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #fff; border-radius: 16px; overflow: hidden; max-width: 420px; width: 100%; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .card img { width: 100%; display: block; background: #eee; }
    .body { padding: 20px; }
    h1 { font-family: 'Oswald', sans-serif; font-size: 20px; margin-bottom: 6px; }
    p { font-size: 13px; color: #1B2A4A99; margin-bottom: 16px; }
    .btn { display: block; background: #FF6B35; color: white; text-align: center; padding: 14px; border-radius: 12px; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 15px; text-decoration: none; }
  </style>
  <script>window.location.replace(${JSON.stringify(appUrl)});</script>
</head>
<body>
  <div class="card">
    ${hasImage ? `<img src="${imageUrl}" alt="" />` : ""}
    <div class="body">
      <h1>${esc(ex.titre || "Exercice partagé")}</h1>
      <p>${esc(desc)}</p>
      <a class="btn" href="${appUrl}">Ouvrir dans Coaching Pro Boost</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
