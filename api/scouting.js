import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token manquant");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase
    .from("shared_play_collections")
    .select("title, plays, expires_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return res.status(404).send("Lien invalide ou expiré");
  if (data.expires_at && new Date(data.expires_at) < new Date()) return res.status(410).send("Lien expiré");

  const plays = data.plays || [];
  const title = data.title || "Scouting Report";

  const playsHtml = plays.map((play, idx) => {
    const images = (play.images || []).filter(img => img.file?.data);
    const imgsHtml = images.map(img => `
      <div style="flex:1;min-width:200px;max-width:280px;">
        ${img.annotation ? `<div style="font-size:11px;color:#666;margin-bottom:4px;font-style:italic;">${img.annotation}</div>` : ""}
        <img src="${img.file.data}" style="width:100%;border-radius:8px;border:1px solid #e0d8d0;" />
      </div>
    `).join("");

    return `
      <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);page-break-inside:avoid;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:11px;color:#FF6B35;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${play.type || ""}</div>
            <div style="font-size:18px;font-weight:800;color:#1B2A4A;font-family:'Oswald',sans-serif;">${play.titre || "Sans titre"}</div>
            ${play.description ? `<div style="font-size:13px;color:#666;margin-top:4px;">${play.description}</div>` : ""}
          </div>
          <div style="background:#1B2A4A;color:#fff;font-size:20px;font-weight:800;font-family:'Oswald',sans-serif;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</div>
        </div>
        ${(play.tags || []).length > 0 ? `
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
            ${play.tags.map(t => `<span style="font-size:11px;padding:2px 8px;background:#FF6B35/15;background-color:rgba(255,107,53,0.12);color:#FF6B35;border-radius:20px;">${t}</span>`).join("")}
          </div>
        ` : ""}
        ${images.length > 0 ? `
          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;">
            ${imgsHtml}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Coaching Pro Boost</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #F2EDE4; color: #1B2A4A; padding: 20px; }
    @media print { body { background: white; padding: 0; } .no-print { display: none; } }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: #1B2A4A; color: white; border-radius: 16px; padding: 28px; margin-bottom: 24px; text-align: center; }
    .header h1 { font-family: 'Oswald', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 6px; }
    .header p { color: rgba(255,255,255,0.6); font-size: 14px; }
    .import-btn { display: block; background: #FF6B35; color: white; text-align: center; padding: 14px; border-radius: 12px; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 24px; }
    .import-btn:hover { background: #e85a28; }
    .print-btn { display: block; border: 2px solid #1B2A4A; color: #1B2A4A; text-align: center; padding: 12px; border-radius: 12px; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; background: none; width: 100%; margin-bottom: 24px; }
    .count { background: white; border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:36px;margin-bottom:10px;">🏀</div>
      <h1>${title}</h1>
      <p>${plays.length} play${plays.length > 1 ? "s" : ""} • Coaching Pro Boost</p>
    </div>
    <div class="no-print">
      <a href="https://coachingproboost.com?scoutingtoken=${token}" class="import-btn">
        📥 Importer dans mon Play Book (Premium)
      </a>
      <button onclick="window.print()" class="print-btn">🖨️ Imprimer / Exporter PDF</button>
    </div>
    <div class="count">${plays.length} play${plays.length > 1 ? "s" : ""} dans ce scouting report</div>
    ${playsHtml}
    <div style="text-align:center;padding:20px;color:#999;font-size:12px;" class="no-print">
      Généré avec <strong>Coaching Pro Boost</strong> · coachingproboost.com
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
