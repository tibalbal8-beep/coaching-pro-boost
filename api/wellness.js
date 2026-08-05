import { createClient } from "@supabase/supabase-js";

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// "humeur" reste le nom de colonne en base (pas de migration SQL nécessaire) mais représente
// désormais le champ combiné "Humeur / Alimentation" — on écrit la même valeur dans
// "alimentation" aussi, pour ne rien perdre si ça doit être re-séparé plus tard.
const FIELDS = [
  { key: "rpe", label: "RPE (charge ressentie)", max: 10 },
  { key: "sommeil", label: "Sommeil", max: 7 },
  { key: "fatigue", label: "Fatigue", max: 7 },
  { key: "courbature", label: "Courbatures / Douleur", max: 7 },
  { key: "stress", label: "Stress", max: 7 },
  { key: "humeur", label: "Humeur / Alimentation", max: 7 },
];

// Page publique (pas de compte requis) : un joueur ouvre le lien envoyé sur WhatsApp, choisit son
// prénom dans la liste entrée par le coach (au lieu de taper son nom), sa fiche s'ouvre avec les
// 6 critères de forme à noter, valide. GET affiche le formulaire, POST enregistre la réponse.
export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === "POST") {
    try {
      const { token, playerName, ...values } = req.body;
      if (!token || !playerName) return res.status(400).json({ error: "Champs manquants" });
      const row = { token, player_name: String(playerName).slice(0, 100) };
      FIELDS.forEach(f => { row[f.key] = Number(values[f.key]) || null; });
      row.alimentation = row.humeur; // colonne conservée pour compat, même valeur que "humeur"
      const { error } = await supabase.from("wellness_checkins").insert(row);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { token } = req.query;
  if (!token || !/^[a-z0-9]+$/i.test(token)) return res.status(400).send("Lien invalide");

  const { data: form } = await supabase.from("wellness_forms").select("title, created_by, players").eq("token", token).maybeSingle();
  if (!form) return res.status(404).send("Questionnaire introuvable ou expiré");

  // Liste figée au moment de la création du questionnaire si elle existe (permet d'exclure des
  // joueurs, ou de partager le bon roster avec un coach qui n'a pas accès au compte principal) —
  // sinon repli sur la liste de joueurs live du compte créateur (anciens questionnaires).
  let players = [];
  if (Array.isArray(form.players) && form.players.length > 0) {
    players = form.players.map(p => (typeof p === "string" ? { nom: p } : p)).filter(p => p?.nom);
  } else {
    try {
      const { data: kv } = await supabase.from("kv_store").select("value").eq("user_id", form.created_by).eq("key", "players").maybeSingle();
      if (kv) players = (JSON.parse(kv.value) || []).filter(p => p?.nom);
    } catch {}
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(form.title || "Questionnaire de forme")} — Coaching Pro Boost</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #F2EDE4; color: #1B2A4A; padding: 20px; min-height: 100vh; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    h1 { font-family: 'Oswald', sans-serif; font-size: 20px; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #1B2A4A80; margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .players { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .players button { padding: 14px 8px; border: 1px solid #1B2A4A25; background: #fff; border-radius: 10px; font-size: 14px; font-weight: 600; color: #1B2A4A; cursor: pointer; }
    .players button:active { background: #FF6B35; border-color: #FF6B35; color: #fff; }
    .field { margin-bottom: 22px; }
    .scale { display: flex; gap: 4px; }
    .scale button { flex: 1; padding: 10px 0; border: 1px solid #1B2A4A25; background: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; color: #1B2A4A; cursor: pointer; }
    .scale button.active { background: #FF6B35; border-color: #FF6B35; color: #fff; }
    .btn { display: block; width: 100%; background: #FF6B35; color: white; text-align: center; padding: 14px; border-radius: 12px; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 16px; border: none; cursor: pointer; margin-top: 8px; }
    .btn:disabled { opacity: 0.5; }
    .back { font-size: 12px; color: #1B2A4A80; margin-bottom: 14px; cursor: pointer; display: inline-block; }
    #step-fiche, #done { display: none; }
    #done { text-align: center; padding: 40px 0; }
    #done .big { font-size: 40px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="card" id="step-players">
    <h1>${esc(form.title || "Questionnaire de forme")}</h1>
    <div class="sub">Choisis ton prénom pour ouvrir ta fiche.</div>
    ${players.length > 0 ? `
      <div class="players">
        ${players.map(p => `<button type="button" class="player-btn" data-name="${esc(p.nom)}">${esc(p.nom)}</button>`).join("")}
      </div>
    ` : `<div class="sub">Aucun joueur n'a encore été renseigné par ton coach.</div>`}
  </div>

  <div class="card" id="step-fiche">
    <span class="back" id="back-btn">← Changer de joueur</span>
    <h1 id="fiche-name"></h1>
    <div class="sub">Réponds honnêtement, ça aide ton coach à adapter les entraînements.</div>
    <form id="wform">
      ${FIELDS.map(f => `
        <div class="field">
          <label>${esc(f.label)} <span style="font-weight:400;color:#1B2A4A60;">(1 à ${f.max})</span></label>
          <div class="scale" data-field="${f.key}">
            ${Array.from({ length: f.max }, (_, i) => i + 1).map(v => `<button type="button" data-value="${v}">${v}</button>`).join("")}
          </div>
        </div>
      `).join("")}
      <button type="submit" class="btn" id="submit-btn">Envoyer</button>
    </form>
  </div>

  <div class="card" id="done">
    <div class="big">✅</div>
    <h1>Merci !</h1>
    <div class="sub">Ta réponse a bien été envoyée à ton coach.</div>
  </div>

  <script>
    let playerName = null;
    const values = {};
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playerName = btn.dataset.name;
        document.getElementById('fiche-name').textContent = playerName;
        document.getElementById('step-players').style.display = 'none';
        document.getElementById('step-fiche').style.display = 'block';
      });
    });
    document.getElementById('back-btn').addEventListener('click', () => {
      document.getElementById('step-fiche').style.display = 'none';
      document.getElementById('step-players').style.display = 'block';
    });
    document.querySelectorAll('.scale').forEach(scale => {
      scale.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        scale.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        values[scale.dataset.field] = e.target.dataset.value;
      });
    });
    document.getElementById('wform').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!playerName) return;
      const btn = document.getElementById('submit-btn');
      btn.disabled = true; btn.textContent = 'Envoi...';
      try {
        const res = await fetch(window.location.pathname + window.location.search, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: ${JSON.stringify(token)}, playerName, ...values }),
        });
        if (!res.ok) throw new Error();
        document.getElementById('step-fiche').style.display = 'none';
        document.getElementById('done').style.display = 'block';
      } catch {
        btn.disabled = false; btn.textContent = 'Envoyer';
        alert("Erreur d'envoi, réessaie.");
      }
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
