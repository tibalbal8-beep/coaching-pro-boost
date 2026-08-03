import { createClient } from "@supabase/supabase-js";

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Page intermédiaire pour un lien de partage d'exercice : sert des balises Open Graph (titre,
// description, image) lisibles par les aperçus de lien (WhatsApp, iMessage, etc.). Un vrai
// visiteur voit une carte avec un carrousel (s'il y a plusieurs vignettes) et clique lui-même
// sur "Ouvrir dans Coaching Pro Boost" — pas de redirection automatique, pour laisser le temps
// de parcourir les images avant de passer dans l'app.
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
  const imageCount = (isSafeImage(ex.file?.data) ? 1 : 0) + (ex.schemas || []).filter(isSafeImage).length;
  const hasImage = imageCount > 0;
  const imageUrlFor = (i) => `https://coachingproboost.com/api/share-exercise-image?token=${token}&index=${i}`;
  const imageUrl = hasImage ? imageUrlFor(0) : "https://coachingproboost.com/logo-full.png";
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
    .carousel { position: relative; background: #eee; }
    .carousel img { width: 100%; display: block; }
    .nav { position: absolute; top: 0; bottom: 0; width: 44px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
    .nav.prev { left: 0; } .nav.next { right: 0; }
    .counter { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.55); color: #fff; font-size: 11px; padding: 2px 10px; border-radius: 10px; }
    .body { padding: 20px; }
    h1 { font-family: 'Oswald', sans-serif; font-size: 20px; margin-bottom: 6px; }
    p { font-size: 13px; color: #1B2A4A99; margin-bottom: 16px; }
    .btn { display: block; background: #FF6B35; color: white; text-align: center; padding: 14px; border-radius: 12px; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 15px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    ${hasImage ? `
    <div class="carousel">
      <img id="carousel-img" src="${imageUrlFor(0)}" alt="" />
      ${imageCount > 1 ? `
        <button class="nav prev" onclick="cpbNav(-1)">‹</button>
        <button class="nav next" onclick="cpbNav(1)">›</button>
        <span class="counter"><span id="carousel-pos">1</span>/${imageCount}</span>
      ` : ""}
    </div>` : ""}
    <div class="body">
      <h1>${esc(ex.titre || "Exercice partagé")}</h1>
      <p>${esc(desc)}</p>
      <a class="btn" href="${appUrl}">Ouvrir dans Coaching Pro Boost</a>
    </div>
  </div>
  ${imageCount > 1 ? `<script>
    var cpbIdx = 0, cpbCount = ${imageCount};
    function cpbNav(dir) {
      cpbIdx = (cpbIdx + dir + cpbCount) % cpbCount;
      document.getElementById("carousel-img").src = "${imageUrlFor("__I__")}".replace("__I__", cpbIdx);
      document.getElementById("carousel-pos").textContent = cpbIdx + 1;
    }
  </script>` : ""}
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
