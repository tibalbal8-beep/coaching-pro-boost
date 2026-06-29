import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Upload, FileText, Image as ImageIcon, Clock, Layers, Trash2, Printer, ChevronRight, ListPlus, Library, FileUp, Check, Loader2, Pencil, Users, UserCheck, UserX, Star, BarChart3, Menu, Mic, LogOut } from "lucide-react";
import { storage, supabase } from "./storage";

const DEFAULT_THEMES = ["Démarquage","Pick and Roll","Pick non porteur","Transition","Défense individuelle","Défense collective","Aide défensive","Rotation défensive","Contre","Interception","Prise en charge","Tir","Tir en course","Finition","Rebond","Rebond offensif","Rebond défensif","Jeu sans ballon","Sortie de balle","Passe","Dribble","Pivot","Fixation","Jeu intérieur","Spacing","Attaque de zone","Défense de zone"];
const PHASES = ["Échauffement","Préparation physique","Technique individuelle","Pré-collectif","Collectif","Fin de séance","Autre"];
const FORMATS = ["1c0","1c1","2c1","2c2","3c1","3c2","3c3","4c1","4c2","4c3","4c4","5c3","5c4","5c5","2c1+1","3c2+1","4c3+1","5c4+1"];
const CATEGORIES = ["U7","U9","U11","U13","U15","U17","U18","U20","Seniors"];
const NIVEAUX = ["Débutant","Intermédiaire","Confirmé"];
const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getSeason(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "Sans date";
  const y = d.getFullYear(), m = d.getMonth(); // 0-indexed, 7 = août
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function useStore() {
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ex = await storage.get("exercises");
        const list = ex ? JSON.parse(ex.value) : [];
        setExercises(list.map(e => e.hasFile ? { ...e, file: { name: e.fileName, type: e.fileType, data: null } } : e));
      } catch {}
      try { const se = await storage.get("sessions"); setSessions(se ? JSON.parse(se.value) : []); } catch {}
      try { const th = await storage.get("themes"); setThemes(th ? JSON.parse(th.value) : DEFAULT_THEMES); } catch {}
      try { const tm = await storage.get("teams"); if (tm) setTeams(JSON.parse(tm.value)); } catch {}
      try { const at = await storage.get("activeTeamId"); if (at) setActiveTeamId(JSON.parse(at.value)); } catch {}
      try { const pl = await storage.get("players"); setPlayers(pl ? JSON.parse(pl.value) : []); } catch {}
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (key, value) => {
    try { const r = await storage.set(key, value); if (!r) console.error("Storage set returned null for", key); } catch (e) { console.error("Storage error", key, e); }
  }, []);

  const stripFiles = (list) => list.map(({ file, ...rest }) => ({ ...rest, hasFile: !!file, fileName: file?.name, fileType: file?.type }));

  const saveExercises = async (next) => {
    setExercises(next);
    for (const ex of next) {
      if (ex.file && ex.file.data) {
        try { await storage.set(`file:${ex.id}`, JSON.stringify(ex.file)); } catch (e) { console.error("File store failed", ex.id, e); }
      }
    }
    persist("exercises", JSON.stringify(stripFiles(next)));
  };
  const saveSessions = (next) => { setSessions(next); persist("sessions", JSON.stringify(next)); };
  const saveThemes = (next) => { setThemes(next); persist("themes", JSON.stringify(next)); };
  const saveTeams = (next) => { setTeams(next); persist("teams", JSON.stringify(next)); };
  const saveActiveTeamId = (next) => { setActiveTeamId(next); persist("activeTeamId", JSON.stringify(next)); };
  const savePlayers = (next) => { setPlayers(next); persist("players", JSON.stringify(next)); };

  return { exercises, sessions, themes, teams, activeTeamId, players, saveExercises, saveSessions, saveThemes, saveTeams, saveActiveTeamId, savePlayers, loaded };
}

function usePdfJs() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setReady(true);
    };
    script.onerror = () => console.error("Impossible de charger pdf.js");
    document.body.appendChild(script);
  }, []);
  return ready;
}

function readImageAsJpeg(file, maxDim = 1600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderPdfPages(file, maxPages = 25) {
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const n = Math.min(pdf.numPages, maxPages);
  const pages = [];
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", 0.7));
  }
  return pages;
}

async function extractExercisesFromImage(dataUrl, themes) {
  const base64 = dataUrl.split(",")[1];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            { type: "text", text:
`Cette image est une page de feuille de séance de basket annotée à la main par un coach. La page peut contenir UN SEUL exercice ou PLUSIEURS exercices distincts (souvent chacun dans son propre encadré, avec sa propre durée en minutes en haut à gauche). Identifie chaque exercice séparément, y compris l'échauffement s'il y en a un.

Pour CHAQUE exercice qui contient un schéma tactique dessiné (terrain avec joueurs/flèches), reconstruis aussi ce schéma dans un repère de coordonnées fixe : largeur 440, hauteur 420, où (0,0) est le coin haut-gauche du demi-terrain et (440,420) le coin bas-droit juste sous le panier (le panier est au centre bas, vers x=220, y=410). Convertis les positions et trajectoires du schéma manuscrit dans ce repère, en respectant cette légende :
- Joueur AVEC ballon : numéro entouré d'un cercle (hasBall: true)
- Joueur SANS ballon : numéro seul (hasBall: false, role: "offense")
- Défenseur : noté X, X1, X2... (role: "defender")
- Trait de passe : pointillé avec flèche → kind "pass"
- Trait de dribble : ondulé avec flèche → kind "dribble"
- Trait de main à main : ondulé se terminant par une double-barre (pas de flèche) → kind "handoff"
- Déplacement de joueur sans ballon (cut) : trait plein avec flèche → kind "cut"
- Écran : court trait perpendiculaire épais → objet séparé dans "screens"
Si la page n'a pas de schéma exploitable pour un exercice (texte seul), mets "diagram": null pour cet exercice.

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans texte autour, au format exact :
[{
  "titre": string court,
  "duree": number ou null (minutes, telle qu'écrite sur la page),
  "objectif": string courte phrase déduite du schéma/texte,
  "notes": string résumant les consignes/annotations visibles pour CET exercice uniquement,
  "themes": array de strings choisis UNIQUEMENT parmi cette liste ${JSON.stringify(themes)},
  "format": string ou null choisi UNIQUEMENT parmi ${JSON.stringify(FORMATS)},
  "niveau": string ou null choisi UNIQUEMENT parmi ${JSON.stringify(NIVEAUX)},
  "diagram": null ou {
    "players": [{"x": number, "y": number, "label": string, "hasBall": boolean, "role": "offense" ou "defender"}],
    "paths": [{"x1": number, "y1": number, "x2": number, "y2": number, "kind": "pass" ou "dribble" ou "handoff" ou "cut"}],
    "screens": [{"x1": number, "y1": number, "x2": number, "y2": number}]
  }
}, ...]
Un objet par exercice détecté sur la page.` }
          ]
        }]
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error("Erreur API Anthropic:", res.status, data.error || data);
      throw new Error("api_error");
    }
    const text = (data.content || []).find(b => b.type === "text")?.text || "[]";
    let clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) clean = clean.slice(start, end + 1);
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error("Échec parsing JSON extraction IA. Réponse brute :", text);
      throw parseErr;
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const validDiagram = (d) => {
      if (!d || typeof d !== "object") return null;
      const num = (v, fallback = 0) => (typeof v === "number" && !isNaN(v) ? v : fallback);
      try {
        return {
          players: Array.isArray(d.players) ? d.players.map(p => ({
            x: num(p.x, 220), y: num(p.y, 200), label: String(p.label ?? "?"),
            hasBall: !!p.hasBall, role: p.role === "defender" ? "defender" : "offense",
          })) : [],
          paths: Array.isArray(d.paths) ? d.paths.map(p => ({
            x1: num(p.x1), y1: num(p.y1), x2: num(p.x2), y2: num(p.y2),
            kind: ["pass", "dribble", "handoff", "cut"].includes(p.kind) ? p.kind : "cut",
          })) : [],
          screens: Array.isArray(d.screens) ? d.screens.map(s => ({
            x1: num(s.x1), y1: num(s.y1), x2: num(s.x2), y2: num(s.y2),
          })) : [],
        };
      } catch { return null; }
    };
    return arr.map(parsed => ({
      titre: parsed.titre || "Exercice (à compléter)",
      duree: parsed.duree || 10,
      objectif: parsed.objectif || "",
      notes: parsed.notes || "",
      themes: Array.isArray(parsed.themes) ? parsed.themes.filter(t => themes.includes(t)) : [],
      format: FORMATS.includes(parsed.format) ? parsed.format : FORMATS[0],
      niveau: NIVEAUX.includes(parsed.niveau) ? parsed.niveau : NIVEAUX[1],
      diagram: validDiagram(parsed.diagram),
    }));
  } catch (e) {
    console.error(e);
    return [{ titre: "Exercice (à compléter)", duree: 10, objectif: "", notes: "", themes: [], format: FORMATS[0], niveau: NIVEAUX[1], diagram: null }];
  }
}

function Tag({ children, active, onClick, color = "default" }) {
  const inactiveClasses = {
    default: "bg-transparent text-[#1B2A4A] border-[#1B2A4A]/30 hover:border-[#1B2A4A]",
    orange: "bg-transparent text-[#FF6B35] border-[#FF6B35]/40 hover:border-[#FF6B35]",
  };
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "" : inactiveClasses[color]}`}
      style={active ? { backgroundColor: "#2563EB", color: "#ffffff", borderColor: "#2563EB" } : undefined}>
      {children}
    </button>
  );
}

function DictateButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggle = () => {
    if (!supported) { setError("Dictée non supportée sur ce navigateur."); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setError(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ");
      onResult(transcript);
      setListening(false);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") setError("Autorise l'accès au micro dans les réglages Safari.");
      else if (e.error === "no-speech") setError("Aucune voix détectée, réessaie.");
      else setError("Erreur micro : " + e.error);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch(e) { setListening(false); setError("Impossible de démarrer le micro."); }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={toggle} title={listening ? "Arrêter la dictée" : "Dicter au micro"}
        className={`p-1.5 rounded-full transition-colors ${listening ? "bg-red-500 text-white animate-pulse" : "text-[#1B2A4A]/40 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10"}`}>
        <Mic size={15} />
      </button>
      {error && <span className="text-xs text-red-500 max-w-[180px] text-right">{error}</span>}
    </div>
  );
}

function FileDrop({ file, onChange }) {
  const inputRef = useRef();
  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 4.5 * 1024 * 1024) { alert("Fichier trop lourd (max ~4.5 Mo). Compresse l'image ou le PDF."); return; }
    const reader = new FileReader();
    reader.onload = () => onChange({ name: f.name, type: f.type, data: reader.result });
    reader.readAsDataURL(f);
  };
  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {!file ? (
        <button type="button" onClick={() => inputRef.current.click()}
          className="w-full border-2 border-dashed border-[#1B2A4A]/30 rounded-lg py-6 flex flex-col items-center gap-2 text-[#1B2A4A]/60 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
          <Upload size={20} /><span className="text-sm">Schéma annoté (PDF ou photo)</span>
        </button>
      ) : (
        <div className="flex items-center justify-between border border-[#1B2A4A]/20 rounded-lg px-3 py-2 bg-white/60">
          <div className="flex items-center gap-2 text-sm text-[#1B2A4A]">
            {file.type === "application/pdf" ? <FileText size={16} /> : <ImageIcon size={16} />}
            <span className="truncate max-w-[180px]">{file.name}</span>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-[#1B2A4A]/50 hover:text-red-600"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

function StarRating({ value, onChange, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="text-[#FF6B35]">
          <Star size={size} fill={n <= value ? "#FF6B35" : "none"} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function RatingBlock({ avis = [], onAdd, label = "Noter cette séance" }) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const moyenne = avis.length ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : null;
  return (
    <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1B2A4A]/70 uppercase tracking-wide">Avis</h3>
        {moyenne && <span className="text-xs text-[#1B2A4A]/50 flex items-center gap-1"><Star size={12} fill="#FF6B35" strokeWidth={0} /> {moyenne} ({avis.length})</span>}
      </div>
      {avis.length > 0 && (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {[...avis].reverse().map((a, i) => (
            <div key={i} className="text-xs border-b border-[#1B2A4A]/10 pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <StarRating value={a.note} onChange={() => {}} size={11} />
                <span className="text-[#1B2A4A]/40">{a.date}</span>
              </div>
              {a.commentaire && <p className="text-[#1B2A4A]/70">{a.commentaire}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <StarRating value={note} onChange={setNote} />
        <span className="text-xs text-[#1B2A4A]/40">{label}</span>
      </div>
      <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Commentaire (optionnel)" rows={2}
        className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-xs bg-white/60 mb-2" />
      <button onClick={() => { if (!note) return; onAdd({ note, commentaire, date: new Date().toISOString().slice(0, 10) }); setNote(0); setCommentaire(""); }}
        disabled={!note} className="text-xs font-medium text-[#FF6B35] hover:underline disabled:opacity-30 disabled:no-underline">
        Enregistrer l'avis
      </button>
    </div>
  );
}

function ExerciseFormImagePreview({ ex }) {
  const fileImage = useFileImage(ex);
  if (!fileImage || !ex.file?.type?.startsWith("image/")) return null;
  return <img src={fileImage} alt="" className="w-full rounded-lg border border-[#1B2A4A]/15" />;
}

function ExerciseForm({ themes, onSave, onCancel, initial }) {
  const [titre, setTitre] = useState(initial?.titre || "");
  const [sel, setSel] = useState(initial?.themes || []);
  const [phases, setPhases] = useState(initial?.phases || []);
  const [format, setFormat] = useState(initial?.format || FORMATS[0]);
  const [niveau, setNiveau] = useState(initial?.niveau || NIVEAUX[1]);
  const [categorie, setCategorie] = useState(initial?.categorie || "");
  const [duree, setDuree] = useState(initial?.duree || 10);
  const [objectif, setObjectif] = useState(initial?.objectif || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [file, setFile] = useState(initial?.file || null);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {initial?.diagram ? (
        <div className="w-full lg:w-72 flex-shrink-0 sticky top-4">
          <CourtDiagram players={initial.diagram.players} paths={initial.diagram.paths} screens={initial.diagram.screens} />
        </div>
      ) : initial?.id && initial?.file ? (
        <div className="w-full lg:w-72 flex-shrink-0 sticky top-4">
          <ExerciseFormImagePreview ex={initial} />
        </div>
      ) : null}
      <div className="flex-1 space-y-4 min-w-0">
      <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'exercice"
        className="w-full text-lg font-semibold bg-transparent border-b-2 border-[#1B2A4A]/20 focus:border-[#FF6B35] outline-none pb-1 text-[#1B2A4A]" />
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Thèmes tactiques</div>
        <div className="flex flex-wrap gap-1.5">{themes.map(t => <Tag key={t} active={sel.includes(t)} onClick={() => toggle(sel, setSel, t)} color="orange">{t}</Tag>)}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Phase de séance</div>
        <div className="flex flex-wrap gap-1.5">{PHASES.map(p => <Tag key={p} active={phases.includes(p)} onClick={() => toggle(phases, setPhases, p)}>{p}</Tag>)}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Catégorie</div>
          <select value={categorie} onChange={e => setCategorie(e.target.value)} className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60">
            <option value="">—</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Format</div>
          <select value={format} onChange={e => setFormat(e.target.value)} className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60">{FORMATS.map(f => <option key={f}>{f}</option>)}</select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Niveau</div>
          <select value={niveau} onChange={e => setNiveau(e.target.value)} className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60">{NIVEAUX.map(n => <option key={n}>{n}</option>)}</select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Durée (min)</div>
          <input type="number" min={1} value={duree} onFocus={e => e.target.select()} onChange={e => setDuree(e.target.value === "" ? "" : Number(e.target.value))} onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) setDuree(1); }} className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
        </div>
      </div>
      <div className="relative">
        <input value={objectif} onChange={e => setObjectif(e.target.value)} placeholder="Objectif (ex: créer un décalage en sortie de bloc)" className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 pr-9 text-sm bg-white/60" />
        <div className="absolute right-1 top-1"><DictateButton onResult={(t) => setObjectif(prev => prev ? prev + " " + t : t)} /></div>
      </div>
      <div className="relative">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Consignes, variantes, points clés..." rows={3} className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 pr-9 text-sm bg-white/60" />
        <div className="absolute right-1 top-1"><DictateButton onResult={(t) => setNotes(prev => prev ? prev + " " + t : t)} /></div>
      </div>
      <FileDrop file={file} onChange={setFile} />
      {initial?.id && (
        <RatingBlock avis={initial.avis || []} label="Noter cet exercice"
          onAdd={(a) => onSave({ id: initial.id, titre, themes: sel, phases, format, niveau, categorie, duree, objectif, notes, file, diagram: initial?.diagram, avis: [...(initial.avis || []), a], createdAt: initial.createdAt, _staySaved: true })} />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        <button
          onClick={() => {
            if (!titre.trim()) { alert("Donne un titre à l'exercice."); return; }
            onSave({ id: initial?.id || uid(), titre, themes: sel, phases, format, niveau, categorie, duree, objectif, notes, file, diagram: initial?.diagram, avis: initial?.avis, createdAt: initial?.createdAt || new Date().toISOString() });
          }}
          className="px-5 py-2 text-sm font-medium rounded-md bg-[#FF6B35] text-white hover:bg-[#e85a28]"
        >Enregistrer</button>
      </div>
      </div>
    </div>
  );
}

function wavyPath(x1, y1, x2, y2, amplitude = 5) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const waves = Math.max(3, Math.round(dist / 18));
  const nx = -dy / dist, ny = dx / dist; // normal vector
  let d = `M ${x1} ${y1}`;
  for (let i = 0; i < waves; i++) {
    const t1 = (i + 0.5) / waves, t2 = (i + 1) / waves;
    const side = i % 2 === 0 ? 1 : -1;
    const cx = x1 + dx * t1 + nx * amplitude * side, cy = y1 + dy * t1 + ny * amplitude * side;
    const ex = x1 + dx * t2, ey = y1 + dy * t2;
    d += ` Q ${cx} ${cy} ${ex} ${ey}`;
  }
  return d;
}

function CourtDiagram({ players = [], paths = [], screens = [], width = 440, height = 420 }) {
  const cx = width / 2;
  const keyW = width * 0.36, keyH = height * 0.36;
  const keyX = cx - keyW / 2, keyY = height - keyH;
  const ftR = keyW / 2;
  const tpR = width * 0.43;
  const hoopY = height - keyH * 0.22;
  const aid = `arr-${width}-${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="bg-white/40 rounded">
      <defs>
        <marker id={aid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" />
        </marker>
      </defs>
      <rect x="1" y="1" width={width - 2} height={height - 2} fill="none" stroke="#444441" strokeWidth="1" />
      <path d={`M ${cx - tpR} ${keyY} L ${cx - tpR} ${height} M ${cx + tpR} ${keyY} L ${cx + tpR} ${height}`} fill="none" stroke="#444441" strokeWidth="1" />
      <path d={`M ${cx - tpR} ${keyY} A ${tpR} ${tpR} 0 0 0 ${cx + tpR} ${keyY}`} fill="none" stroke="#444441" strokeWidth="1" />
      <rect x={keyX} y={keyY} width={keyW} height={keyH} fill="none" stroke="#444441" strokeWidth="1" />
      <path d={`M ${cx - ftR} ${keyY} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${keyY}`} fill="none" stroke="#444441" strokeWidth="1" />
      <path d={`M ${cx - ftR * 0.55} ${hoopY - 6} A ${ftR * 0.55} ${ftR * 0.55} 0 0 0 ${cx + ftR * 0.55} ${hoopY - 6}`} fill="none" stroke="#444441" strokeWidth="1" />
      <line x1={cx - ftR * 0.32} y1={hoopY - 6} x2={cx + ftR * 0.32} y2={hoopY - 6} stroke="#444441" strokeWidth="1.5" />
      <circle cx={cx} cy={hoopY - 9} r="3" fill="none" stroke="#444441" strokeWidth="1" />

      {paths.map((p, i) => {
        const color = p.color || "#444441";
        const isWavy = p.kind === "dribble" || p.kind === "handoff";
        const d = isWavy ? wavyPath(p.x1, p.y1, p.x2, p.y2) : `M ${p.x1} ${p.y1} ${p.curve ? `Q ${p.curve.x} ${p.curve.y} ` : ""}${p.x2} ${p.y2}`;
        const showArrow = p.kind !== "handoff";
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={color} strokeWidth={p.kind === "pass" ? "1.4" : "1.8"}
              strokeDasharray={p.kind === "pass" ? "5 4" : undefined} markerEnd={showArrow ? `url(#${aid})` : undefined} />
            {p.kind === "handoff" && (() => {
              const dx = p.x2 - p.x1, dy = p.y2 - p.y1, dist = Math.sqrt(dx * dx + dy * dy);
              const ux = dx / dist, uy = dy / dist, nx = -uy * 5, ny = ux * 5;
              const bx = p.x2 - ux * 4, by = p.y2 - uy * 4;
              return <line x1={bx - nx} y1={by - ny} x2={bx + nx} y2={by + ny} stroke={color} strokeWidth="1.6" />;
            })()}
          </g>
        );
      })}
      {screens.map((s, i) => (
        <line key={`s${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#444441" strokeWidth="2.5" />
      ))}

      {players.map((pl, i) => (
        <g key={i}>
          {pl.hasBall ? (
            <>
              <circle cx={pl.x} cy={pl.y} r="13" fill="white" stroke="#444441" strokeWidth="1.6" />
              <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1B2A4A">{pl.label}</text>
            </>
          ) : pl.role === "defender" ? (
            <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#888780">{pl.label || "X"}</text>
          ) : (
            <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1B2A4A">{pl.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function useFileImage(ex) {
  const [data, setData] = useState(ex.file?.data || null);
  useEffect(() => {
    if (ex.file?.data) { setData(ex.file.data); return; }
    if (!ex.file || !ex.id) { setData(null); return; }
    let active = true;
    (async () => {
      try {
        const r = await storage.get(`file:${ex.id}`);
        if (r && active) {
          const parsed = JSON.parse(r.value);
          setData(parsed.data || null);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [ex.id, ex.file?.data]);
  return data;
}

function ExerciseCard({ ex, index, onClick, onRemove, onAddToDraft, onCropImage }) {
  const fileImage = useFileImage(ex);
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 relative group hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-start justify-between mb-2 cursor-pointer">
        <span className="font-mono text-[10px] text-[#FF6B35] tracking-widest">SET {String(index + 1).padStart(2, "0")}</span>
        {onRemove && (
          confirmDel ? (
            <span className="flex items-center gap-1 text-[10px]" onClick={e => e.stopPropagation()}>
              <button onClick={() => onRemove()} className="text-red-600 font-medium">Confirmer</button>
              <button onClick={() => setConfirmDel(false)} className="text-[#1B2A4A]/40">Annuler</button>
            </span>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }} className="text-[#1B2A4A]/40 hover:text-red-600"><Trash2 size={14} /></button>
          )
        )}
      </div>
      <div className="cursor-pointer">
        <h3 className="font-semibold text-[#1B2A4A] mb-1.5 leading-tight">{ex.titre}</h3>
        {ex.diagram ? (
          <div className="mb-2"><CourtDiagram players={ex.diagram.players} paths={ex.diagram.paths} screens={ex.diagram.screens} /></div>
        ) : fileImage && ex.file?.type?.startsWith("image/") ? (
          <div className="mb-2 relative">
            <img src={fileImage} alt="" className="w-full rounded border border-[#1B2A4A]/10 object-contain max-h-48" />
            {onCropImage && (
              <button onClick={(e) => { e.stopPropagation(); onCropImage(fileImage); }}
                className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-xs font-medium text-[#1B2A4A] hover:bg-[#FF6B35] hover:text-white hover:border-[#FF6B35] transition-colors">
                <ImageIcon size={12} /> Rogner
              </button>
            )}
          </div>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-[#1B2A4A]/60 mb-2">
          <span className="flex items-center gap-1"><Clock size={12} />{ex.duree} min</span>
          <span>{ex.format}</span><span>{ex.niveau}</span>{ex.categorie && <span className="px-1.5 py-0.5 rounded bg-[#1B2A4A]/8">{ex.categorie}</span>}
          {ex.avis?.length > 0 && <span className="flex items-center gap-0.5 text-[#FF6B35]"><Star size={12} fill="#FF6B35" strokeWidth={0} />{(ex.avis.reduce((s, a) => s + a.note, 0) / ex.avis.length).toFixed(1)}</span>}
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {ex.themes?.slice(0, 3).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B2A4A]/8 text-[#1B2A4A]/70">{t}</span>)}
          {ex.themes?.length > 3 && <span className="text-[10px] px-2 py-0.5 text-[#1B2A4A]/40">+{ex.themes.length - 3}</span>}
        </div>
      </div>
      {onAddToDraft && (
        <button onClick={(e) => { e.stopPropagation(); onAddToDraft(); }}
          className="w-full mt-1 flex items-center justify-center gap-1 border border-[#FF6B35]/40 rounded-md px-2 py-1.5 text-xs font-medium text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-colors">
          <Plus size={13} /> Ajouter à la nouvelle séance
        </button>
      )}
    </div>
  );
}

function ImportReviewCard({ item, themes, onChange, onRemove }) {
  const toggleTheme = (t) => onChange({ ...item, themes: item.themes.includes(t) ? item.themes.filter(x => x !== t) : [...item.themes, t] });
  return (
    <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 flex gap-4">
      <img src={item.pageImage} alt="" className="w-24 h-32 object-cover rounded border border-[#1B2A4A]/10 flex-shrink-0" />
      {item.diagram && <div className="w-32 flex-shrink-0"><CourtDiagram players={item.diagram.players} paths={item.diagram.paths} screens={item.diagram.screens} /></div>}
      <div className="flex-1 space-y-2">
        <input value={item.titre} onChange={e => onChange({ ...item, titre: e.target.value })} className="w-full font-semibold text-[#1B2A4A] bg-transparent border-b border-[#1B2A4A]/15 focus:border-[#FF6B35] outline-none" />
        <div className="flex items-center gap-3">
          <input type="number" value={item.duree} onChange={e => onChange({ ...item, duree: Number(e.target.value) })} className="w-16 border border-[#1B2A4A]/20 rounded px-1.5 py-0.5 text-xs" />
          <span className="text-xs text-[#1B2A4A]/40">min</span>
          <select value={item.format} onChange={e => onChange({ ...item, format: e.target.value })} className="border border-[#1B2A4A]/20 rounded px-1.5 py-0.5 text-xs">{FORMATS.map(f => <option key={f}>{f}</option>)}</select>
          <select value={item.niveau} onChange={e => onChange({ ...item, niveau: e.target.value })} className="border border-[#1B2A4A]/20 rounded px-1.5 py-0.5 text-xs">{NIVEAUX.map(n => <option key={n}>{n}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-1">{themes.map(t => <Tag key={t} active={item.themes.includes(t)} onClick={() => toggleTheme(t)} color="orange">{t}</Tag>)}</div>
        <p className="text-xs text-[#1B2A4A]/50 italic">{item.notes}</p>
      </div>
      <button onClick={onRemove} className="text-[#1B2A4A]/30 hover:text-red-600 self-start"><X size={16} /></button>
    </div>
  );
}

function diagramToSvgString(diagram, width = 320, height = 305) {
  if (!diagram) return "";
  const cx = width / 2;
  const keyW = width * 0.36, keyH = height * 0.36;
  const keyX = cx - keyW / 2, keyY = height - keyH;
  const ftR = keyW / 2, tpR = width * 0.43, hoopY = height - keyH * 0.22;
  const wavy = (x1, y1, x2, y2, amplitude = 5) => {
    const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy);
    const waves = Math.max(3, Math.round(dist / 18));
    const nx = -dy / dist, ny = dx / dist;
    let d = `M ${x1} ${y1}`;
    for (let i = 0; i < waves; i++) {
      const t1 = (i + 0.5) / waves, t2 = (i + 1) / waves, side = i % 2 === 0 ? 1 : -1;
      d += ` Q ${x1 + dx * t1 + nx * amplitude * side} ${y1 + dy * t1 + ny * amplitude * side} ${x1 + dx * t2} ${y1 + dy * t2}`;
    }
    return d;
  };
  let s = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="background:rgba(255,255,255,0.4);border-radius:6px">`;
  s += `<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#444441" stroke-width="1.5"/></marker></defs>`;
  s += `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<path d="M ${cx - tpR} ${keyY} L ${cx - tpR} ${height} M ${cx + tpR} ${keyY} L ${cx + tpR} ${height}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<path d="M ${cx - tpR} ${keyY} A ${tpR} ${tpR} 0 0 0 ${cx + tpR} ${keyY}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<rect x="${keyX}" y="${keyY}" width="${keyW}" height="${keyH}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<path d="M ${cx - ftR} ${keyY} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${keyY}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<path d="M ${cx - ftR * 0.55} ${hoopY - 6} A ${ftR * 0.55} ${ftR * 0.55} 0 0 0 ${cx + ftR * 0.55} ${hoopY - 6}" fill="none" stroke="#444441" stroke-width="1"/>`;
  s += `<line x1="${cx - ftR * 0.32}" y1="${hoopY - 6}" x2="${cx + ftR * 0.32}" y2="${hoopY - 6}" stroke="#444441" stroke-width="1.5"/>`;
  s += `<circle cx="${cx}" cy="${hoopY - 9}" r="3" fill="none" stroke="#444441" stroke-width="1"/>`;
  (diagram.paths || []).forEach(p => {
    const isWavy = p.kind === "dribble" || p.kind === "handoff";
    const d = isWavy ? wavy(p.x1, p.y1, p.x2, p.y2) : `M ${p.x1} ${p.y1} ${p.x2} ${p.y2}`;
    const dash = p.kind === "pass" ? `stroke-dasharray="5 4"` : "";
    const arrow = p.kind !== "handoff" ? `marker-end="url(#a)"` : "";
    s += `<path d="${d}" fill="none" stroke="#444441" stroke-width="${p.kind === "pass" ? 1.4 : 1.8}" ${dash} ${arrow}/>`;
  });
  (diagram.screens || []).forEach(sc => { s += `<line x1="${sc.x1}" y1="${sc.y1}" x2="${sc.x2}" y2="${sc.y2}" stroke="#444441" stroke-width="2.5"/>`; });
  (diagram.players || []).forEach(pl => {
    if (pl.hasBall) {
      s += `<circle cx="${pl.x}" cy="${pl.y}" r="13" fill="white" stroke="#444441" stroke-width="1.6"/><text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#1B2A4A">${pl.label}</text>`;
    } else if (pl.role === "defender") {
      s += `<text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#888780">${pl.label || "X"}</text>`;
    } else {
      s += `<text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#1B2A4A">${pl.label}</text>`;
    }
  });
  s += `</svg>`;
  return s;
}

function buildSessionHTML(session, exercises) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const total = session.exerciseIds.reduce((sum, id) => sum + (exercises.find(e => e.id === id)?.duree || 0), 0);
  const blocks = session.exerciseIds.map((id, i) => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return "";
    return `
      <div class="exo">
        <div class="exo-head">
          <span class="set">SET ${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(ex.titre)}</h3>
          <span class="meta">${esc(ex.duree)} min · ${esc(ex.format)} · ${esc(ex.niveau)}</span>
        </div>
        <div class="exo-body">
          ${ex.diagram ? `<div class="diagram">${diagramToSvgString(ex.diagram)}</div>` : ""}
          <div class="exo-text">
            ${ex.themes?.length ? `<div class="tags">${ex.themes.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
            ${ex.objectif ? `<p class="obj"><strong>Objectif :</strong> ${esc(ex.objectif)}</p>` : ""}
            ${ex.notes ? `<p class="notes">${esc(ex.notes)}</p>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(session.titre)}</title>
<style>
  body { font-family: -apple-system, Inter, sans-serif; background:#F2EDE4; color:#1B2A4A; margin:0; padding:32px; }
  h1 { font-family: Oswald, sans-serif; margin:0 0 4px; }
  .sub { color:#1B2A4A99; font-size:14px; margin-bottom:24px; }
  .exo { border:1px solid #1B2A4A26; border-radius:8px; background:white; padding:16px; margin-bottom:16px; break-inside: avoid; }
  .exo-head { display:flex; align-items:baseline; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
  .exo-head .set { font-family: monospace; font-size:11px; color:#FF6B35; letter-spacing:1px; }
  .exo-head h3 { margin:0; font-size:18px; }
  .exo-head .meta { font-size:12px; color:#1B2A4A99; margin-left:auto; }
  .exo-body { display:flex; gap:16px; align-items:flex-start; }
  .diagram { width:220px; flex-shrink:0; }
  .exo-text { flex:1; }
  .tags span { display:inline-block; font-size:10px; background:#1B2A4A14; border-radius:10px; padding:2px 8px; margin:0 4px 4px 0; }
  .obj, .notes { font-size:13px; line-height:1.4; }
  @media print { body { background:white; padding:0; } .exo { box-shadow:none; } }
</style></head>
<body>
  <h1>${esc(session.titre)}</h1>
  <div class="sub">${esc(session.date)} · ${session.exerciseIds.length} exercices · ${total} min${session.themes?.length ? " · " + session.themes.map(esc).join(", ") : ""}</div>
  ${blocks}
</body></html>`;
}

function downloadSessionHTML(session, exercises) {
  const html = buildSessionHTML(session, exercises);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.titre.replace(/[^a-z0-9]+/gi, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DEFAULT_SHEET_TEMPLATE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA4QAAAT5CAIAAAAEN0j9AAEAAElEQVR42uzdd3wc1aE+/JnZvlppteq9915tWZZky7bcjTsGbELopAAJISE3yQ0pkBCSkAsJBBJIIBjb4IZxwbbcZFtWlyxZvfdeVlptL/P+Mffdq5+LkG1t1fP9g4+RRjOzZ87uPnPmFJKmaQIAAAAAwBIoFAEAAAAAIIwCAAAAAMIoAAAAAADCKAAAAAAgjAIAAAAAIIwCAAAAAMIoAAAAAADCKAAAAAAgjAIAAAAAIIwCAAAAAMIoAAAAAMBcseeykUaj6ezsRGHB/fD19XVwcEA5gHlotdqOjg6UA8DsHB0dvb29b/sruVze19eHIoL7ERQUxOVyv3k7eg6amppQoHCfTpw4QQOYS2trK950AN9o165dd3oTnThxAuUD96mpqWkun9hzahklSRIFCveJom7TJ2RwcPCHP/whCgfux09+8pPk5GR8agHcAzabfVcf2gB3ZY4fxey72mlJSYmPjw8KF+ZuaGgoJydHoVDc9rdTU1MHDhxAKcH9ePjhh28No0Y//vGPX3jhBZQSwE2++93vHj9+/Bs3c3BwKC0tdXJyQonB3LW2tubm5t7FTdFd7d3f3/9OnUsAbovL5c5yY2S8805MTHR0dKRpGiUGc6TT6crLy/V6PYvFmmUziUTi5+eH4gK4iVAonMtmJEkGBgaixz/cFaVSeVfb310Y1el0KGIwRZ158803k5OTjWGUxWLdGmFpmjYYDPcQWEmSRMy1PzKZLCkpaXp6evbNDAbDve2fpmmm9rJYrDs9r9Tr9QaDgSTJWZ513g+DwaDX62c/h/shl8s7Ozv1en1QUBCavhaauX8qWuSrX6fT0TRNUdTsd5tgnZgPLlOF0Zl6enq6urru9PlI07SPj09wcDAuCcyFm5ubu7u78X+bmpqkUqkxjwqFQolEIhaLRSIRygoYIpHofjqGjoyMNDY2tre3azQad3f3hIQEX19fHo9n3KCzs3Pnzp0jIyNPP/30L37xi9vu5PHHH8/Pz4+Lizt48KCzs/O8v8ZLly49+eSTKpXqjTfeeOyxx5hv6L1797777rsDAwPOzs6nTp0KCAi4t52r1ervfOc7x48fX7Zs2V//+leEUbgrU1NTnZ2d9fX1k5OTAoEgKioqPDxcIpHMy86Hh4f37NnT1NS0a9euN998E6Vt9+49jH744Ye/+c1vZtnge9/73t/+9jcUMdztXdT4+Pizzz5bUFAwcwMWi5WQkPDggw/u3r3b399/7ns+ePBgbW3t008/jWe1duaeW2ukUum77777j3/8o7u72/hDDoezdevWH/3oR4sWLWJ+otFourq6RkdHx8bG7rQroVDo6Oh4n7F4pvr6+s8++yw3N3fVqlUEQbDZbCcnJy6Xy+FwmA0uX778wgsvyGQyHx8fHx+fe24uVSgUr7zyyqeffvrggw++9dZbvr6+qFEwd4cPH37rrbeuXbs284eJiYk/+tGP9uzZc/9vB71e39PT093dPTIygtJGGJ1NYGBgSkoKm82mKGpoaKizs5Om6aCgIG9vb71er9frw8LCUL5wb5jnMg4ODhERERwORyaTtba2VlVVVVVVffXVV5988kl4ePgcY8cf/vCHioqKTZs2IYwCQRDT09PPP//83r17CYKQSCQZGRkODg6NjY21tbVffPFFSUnJZ599tnTpUoIgjA/fZwl8v/rVr15++WWBQODo6Dgvp/fvf//7T3/6E0VRTBhNS0v78ssvaZp2c3NjNmhtbZXJZHw+/5133lm3bh2fz7+3A9XV1dXV1b322msvv/zyzPZggG/04Ycfvvjii8yw1IyMDD8/v5GRkcLCwurq6qefflqpVD7zzDPzkE7YbON3ASCM3tHDDz/8wAMPkCRJkuRnn3320ksv6XS6F1544bHHHmNmjTJ2jlYoFPX19TU1NSRJJiYmxsXFzZwBVafTtbW1VVVVTUxM+Pr6pqamGu/RtVptdXW1RqMJDg728PAoKSmpra0NDQ3Nysri8XgymezatWudnZ0JCQnp6enGPlsqlYoZ08Dj8TC9i02Liorav3+/i4uLTqcbGhr6wx/+sG/fvqKiou985zunTp0y1qKBgYGqqqquri4nJ6fk5OTIyEjm86ujo+PkyZONjY0ODg7V1dUURRnrXn9/f1lZ2eDgoJeXV0ZGhqenp/GgWq1Wq9USBMHn8zGzif157733mCS6evXqt956KyAggM1my2Syjz/++Be/+EVXV9cPf/jDr7/+2tXV1fgnFEVptdqysrKGhgYPD4+MjAxjl5Lp6WmpVKrRaDw9PY21ZXh4+Pr16+3t7e7u7ikpKTf1VjIYDB0dHeXl5ZOTk35+fosXL2aONTExUVlZmZ+fz9TPqqqqgIAADoczMTFB0zTzDL2mpubGjRvM97RGo2lqaoqJibltlOzs7Kyqqurv73d2do6Li4uMjJwZW1UqlUqlWr9+vYuLy40bN+Li4mb+ljnDysrK0dFRLy+vlJSUwMBAY3tVdXW1SqXy9/f39/evr68vLS1ls9mZmZkhISEzT2BoaOj69eudnZ3Ozs6pqamhoaEzP42Zk6+qqtJqtVFRUcnJyTMH0zCf4Ww2e/bhj2AR1dXVv/3tbxUKhYeHx1//+tdVq1YJBAK1Wl1ZWfnss8+2trb+7ne/W7NmjUKhGB8fF4vFERERxs/q4eHh1tZWg8EQHx8vFouN8aC2tlav18fExCQmJs4+rKq7u7u8vHx4eNjf33/x4sXGmzSmUmm1WpIkBQIBqo3tmctkpM3NzcZ6cNsNPv74YyYL/vOf/7zpV7W1tWvWrLkpxQ4PDzO/lUql3/3ud2f2/ff29v7ss8+Y346MjDAzSf3sZz97+eWXjds888wzvb29K1asMN4//f73v1er1cwAlx/84AfZ2dk/+tGPpFIppv62uL6+PmYY5qlTp279bUtLC3MRS0tLjT8cGxtjLm5GRsb4+Ljx51qtduvWrcz2J0+eZH744Ycfenl5zWxS/dGPfiSTyWiaZtqWZt5n9/f3q1Sqv/71rzM/wvz8/Pbv36/X65kdfvrppytXrly9evUcp+oFS5mcnGTaI2+7nkJbWxtzfV977bWZtXHx4sUEQYSGhtbX18/cXq/Xf/e73yUIgsPh/Pvf/2YW+2Cq1nPPPbd7925jhYmLi7tx4wbzV+vXrycIIjExcWxsjPnJ/v37jdGNIAixWPzWW28xA+9omp6YmHjxxRdn3o2HhoYePnyYpunPPvvspg/nffv2nT17lsma7733Hk3TLi4uN21zay3VarWvvfbaTR1AN2/e3NraalwOYMuWLTN/u2XLFuNnu0wme+WVV2YGXDc3tw8++ID5rVwuDw0NJQjixRdf/Mtf/mL8yvfy8pr5Bv/3v/89sy+NQCD42c9+xrwraZru7e19+OGHZ57AzLebTqd75plncnJyfv7zn09PT6Oem86DDz5IEMTu3bvvtMGpU6cIghCJRDO/TF9//XXm4/QPf/jDTdt//fXXO3bsePvtt5me1gRBeHp6lpSUGDd49tlnmR02NjbeNh6sWrWqtraWpun+/v64uDiCIJ588kljzfzd73438xFEWFjYzPf+e++9t2LFivXr1w8MDODiWlxDQwNzmZqbm+ey/fyE0X/9619MoDR+ZjGGhoaWL19OEERsbOx//vOfTz75JDo6miCI559/nhko99prrzENDy+99NLevXuZ9ODt7d3W1saEEuaDLyYmJj09/eWXX2Y+4Ph8fl5eXmZm5ve//33m09nHx4ep3AaDIT09nSCIJUuWDA0NoULYdBhdvHjxyMjIzO3PnDnDtHq+8MILNE2Xl5cz35obNmzYu3fvd77zHQ6Hw2KxPvroI5qmDx8+vG7dOua78KmnnvrTn/6kVCo///xzgUBAUdT3v//9L774grnJcXd3r6ysZA7x3//937eeEthHGL1y5QrTHrNnz55b/+T48ePMDpna1dzczIRRLy+vlStXvvvuu9/97neZvptr165l7l42btxIEERycjITRi9evMjs4aGHHvriiy9++ctfOjo6cjicY8eOMZ9Or7zyCvOJ98Mf/vC9997LysoiCMLV1bWkpKStre2pp55iQuSyZct+97vfNTc3nz59WiAQGMPoO++8s3r1aoIgeDzec88998YbbxhDsNHFixcpiuLz+S+//PLevXvfe++9yMhI5iWrVKqpqalNmzYRBBESEvLRRx999tlnzBStjz32mFKppGn6r3/9K1Nuzz333N69ex944AEmUjMRQaFQxMfHM5/J4eHhP/jBD5hAwxSCSqViEglzzmvXrv373//++OOPM98Ov/vd72iaViqVjzzyCPOh/cEHH+zbty8zM5MgiK1bt05NTTFhmjnhvLw8plUYrCeMqlQq5vL5+vpWVVXNsvMLFy4w1eDdd981pknmyj7yyCMqlWpwcJCZh9LX1/eNN9548803mZ5U6enpcrl8cHDwpjD63nvvcTgcHo/3k5/85ODBg8899xzzt8a7LOZmkiAIJj8Awuj/OXz4MPPJy3R7Yj7uSZIUCoW9vb00Tb///vtPPfXUq6++ynwOnjhxgpnBhGmZGBsbY7oGOjo6Mlnh448/Zs7E19d3YGBAr9f/9Kc/ZX5y9uxZ5uP+iSeeiIyMfPrpp2c2qoF9hNEbN24w+eCBBx6gabqgoOD73//+E0880dLSQtP06OhobGwsQRDf/va3me3//ve/EwTh4uLC1J/p6Wlmz2lpacZ9Mj/5wQ9+wPzvBx98kJiYmJqa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V2fvskJCQjIzM69cuTI/P2+/UpRK5dmzZ7du3RoUFGTvK7p9+3Z9ff22bdtycnJcv60RRgEA4Avk5eXt3r378uXLFRUV9l4QdPv27d7e3qdOnbLTApD37t3r6ek5ePCgvbffHBwc/O1vf5uQkLBnzx4HryXpNmJjYw8fPjwyMnLs2DGVSmXXslJSUtLT0y9cuDA9PW2P44+Ojp44cWL37t32/lgyNzf33nvv6XS6w4cPh4aGroqGRhgFAIAvFhgY+Kd/+qdqtfr06dODg4N2LWvLli3BwcFnz54dGxtbwcPq9forV65MTk6++OKLIpHIfuev1WovXbpUVVV16NChjIwMF39C6uI8PDxeeuklmUx25syZxsZGu5aVmpq6cePGq1evtre3r+yRq6ur7927t2/fPrtOWmIYprq6+ty5c+vXr9+1axefz18trYwJfQAA8EQoinrhhRd6enpu377d0dGxZ88eirJXj0ZeXp6fn9+dO3dCQ0M3b978/Afs7++/e/duTExMWVmZXWupra3t7t27aWlpO3bsQAxdKRs3boyKirpz505XV9e+ffvs19McGxsrkUhu3brV09OzZ8+e589zCwsLFy9e9PPz2717t12nEE1PT589ezYoKOjgwYPe3t6rq30RRgEA4CkkJCSEhobW1dX97ne/KykpiYmJsVMkjY2NDQoKampqeuedd4qLiwMDA5+hO9NqtSqVyurqaqPRuHPnTrvuvTk3N1dRUaHX6w8cOOCAQYFrTWBg4KFDh+7fv//+++/n5+cnJibaaaCFn5/f/v37u7q63nvvvaysrJiYmGfbnkCpVHZ0dAwNDeXn58fFxdmvZhYXFxsbG3t7e0tLS6Ojo1dj4yKMAgDA0xGLxVu2bLENsOvq6srMzLTTw0exWFxcXJyZmXnt2jUul+vv7x8aGvqEQ+4WFxd7enrUavXU1FRubq5d04BWq21sbBwcHMzMzMSUefthsVjr1q1LTU09f/58X19fYmJienq6PQricDjp6elJSUm3b9++du1aUFBQQEBAfHz8k6y9YDabOzs71Wr15OSkTCZ788037VonjY2NHR0dQUFBf/qnf7p6Vw1DGAUAgGfh5+f35ptvNjU11dbWNjU17dixw067Cnl6eh46dGh2dravr6+zs7OpqYlhmLCwsPj4+Ieee5pMpuHh4YGBAYPBwOPxxGJx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";

function buildBlankSheetSVG() {
  const courtW = 200, courtH = 230, rowH = 260, headerH = 60, leftW = 460, gap = 8;
  const totalW = leftW + courtW * 2 + gap * 3;
  const totalH = headerH + rowH * 3 + 10;
  const blankCourt = diagramToSvgString({ players: [], paths: [], screens: [] }, courtW, courtH);
  let s = `<svg viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" width="100%" style="background:white">`;
  s += `<rect width="${totalW}" height="${totalH}" fill="white"/>`;
  ["Team:", "Date:", "Objectif séance:", "Cycle:"].forEach((h, i) => {
    const hw = totalW / 4;
    s += `<rect x="${i * hw + 4}" y="4" width="${hw - 8}" height="${headerH - 8}" fill="none" stroke="black" stroke-width="2"/>`;
    s += `<text x="${i * hw + 10}" y="20" font-size="13" font-weight="700" font-family="sans-serif">${h}</text>`;
  });
  for (let r = 0; r < 3; r++) {
    const y = headerH + r * rowH + 8;
    s += `<rect x="4" y="${y}" width="${leftW - 8}" height="${rowH - 16}" fill="none" stroke="black" stroke-width="2"/>`;
    s += `<rect x="16" y="${y + 10}" width="28" height="${rowH - 56}" fill="none" stroke="black" stroke-width="2"/>`;
    s += `<rect x="56" y="${y + rowH - 90}" width="${leftW - 80}" height="56" fill="none" stroke="black" stroke-width="2"/>`;
    s += `<text x="64" y="${y + rowH - 68}" font-size="13" font-weight="700" font-family="sans-serif">Technique</text>`;
    s += `<g transform="translate(${leftW + gap},${y})">${blankCourt}</g>`;
    s += `<g transform="translate(${leftW + gap * 2 + courtW},${y})">${blankCourt}</g>`;
  }
  s += `</svg>`;
  return { svg: s, width: totalW, height: totalH };
}

function DrawSheetView({ onValidate, onAddDirect, onCancel, processing }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const bgImgRef = useRef(null);
  const elementsRef = useRef([]);
  const currentRef = useRef(null);
  const templateInputRef = useRef(null);
  const [color, setColor] = useState("#1B2A4A");
  const [lineWidth, setLineWidth] = useState(2.5);
  const [lineStyle, setLineStyle] = useState("simple"); // simple | pointille | zigzag
  const [arrowEnd, setArrowEnd] = useState(true);
  const [tool, setTool] = useState("pen"); // pen | player | text | select
  const draggingRef = useRef(null); // { el, startX, startY, moved }
  const [textSize, setTextSize] = useState(16);
  const [pendingText, setPendingText] = useState(null); // { x, y, screenX, screenY, value }
  const [playerLabel, setPlayerLabel] = useState("1");
  const [playerHasBall, setPlayerHasBall] = useState(false);
  const [playerIsDefender, setPlayerIsDefender] = useState(false);
  const [dims, setDims] = useState({ width: 900, height: 1273 });
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const loadBackground = (src) => {
    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      setDims({ width: img.naturalWidth, height: img.naturalHeight });
      setTimeout(redraw, 0);
    };
    img.src = src;
  };

  useEffect(() => {
    (async () => {
      try {
        const custom = await storage.get("sheetTemplate");
        loadBackground(custom ? custom.value : DEFAULT_SHEET_TEMPLATE);
      } catch {
        loadBackground(DEFAULT_SHEET_TEMPLATE);
      }
    })();
  }, []);

  const handleTemplateUpload = async (file) => {
    if (!file) return;
    setLoadingTemplate(true);
    try {
      let dataUrl;
      if (file.type === "application/pdf") {
        if (!window.pdfjsLib) { alert("Le lecteur PDF n'est pas prêt, réessaie dans une seconde."); setLoadingTemplate(false); return; }
        const pages = await renderPdfPages(file, 1);
        dataUrl = pages[0];
      } else {
        dataUrl = await readImageAsJpeg(file, 1400, 0.9);
      }
      await storage.set("sheetTemplate", dataUrl);
      elementsRef.current = [];
      loadBackground(dataUrl);
    } catch (e) {
      console.error(e);
      alert("Impossible de charger ce fichier comme gabarit.");
    }
    setLoadingTemplate(false);
  };

  const resetToDefaultTemplate = async () => {
    try { await storage.delete("sheetTemplate"); } catch {}
    elementsRef.current = [];
    loadBackground(DEFAULT_SHEET_TEMPLATE);
  };

  const zigzagify = (points, amplitude = 7, step = 12) => {
    if (points.length < 2) return points;
    // resample at fixed arc-length steps along the raw path
    const resampled = [points[0]];
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      let covered = 0;
      while (dist + (segLen - covered) >= step) {
        const remaining = step - dist;
        const t = (covered + remaining) / segLen;
        resampled.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        covered += remaining;
        dist = 0;
      }
      dist += segLen - covered;
    }
    resampled.push(points[points.length - 1]);
    if (resampled.length < 3) return points;
    const out = [resampled[0]];
    for (let i = 1; i < resampled.length - 1; i++) {
      const a = resampled[i - 1], b = resampled[i];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const side = i % 2 === 0 ? 1 : -1;
      out.push({ x: b.x + nx * amplitude * side, y: b.y + ny * amplitude * side });
    }
    out.push(resampled[resampled.length - 1]);
    return out;
  };

  const drawArrowHead = (ctx, from, to, color, size) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const a1 = angle + Math.PI - 0.45, a2 = angle + Math.PI + 0.45;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x + size * Math.cos(a1), to.y + size * Math.sin(a1));
    ctx.lineTo(to.x + size * Math.cos(a2), to.y + size * Math.sin(a2));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const drawStroke = (ctx, stroke) => {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(stroke.style === "pointille" ? [stroke.width * 3.5, stroke.width * 2.5] : []);
    stroke.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.setLineDash([]);
    if (stroke.arrow && stroke.points.length > 1) {
      const last = stroke.points[stroke.points.length - 1];
      const prev = stroke.points[Math.max(0, stroke.points.length - 4)];
      drawArrowHead(ctx, prev, last, stroke.color, 6 + stroke.width * 2);
    }
  };

  const drawPlayerToken = (ctx, t) => {
    const r = 16;
    if (t.role === "defender") {
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, t.x, t.y);
    } else if (t.hasBall) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#1B2A4A";
      ctx.stroke();
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#1B2A4A";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, t.x, t.y);
    } else {
      ctx.font = "bold 17px sans-serif";
      ctx.fillStyle = "#1B2A4A";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, t.x, t.y);
    }
  };

  const drawTextElement = (ctx, t) => {
    ctx.font = `${t.bold ? "bold " : ""}${t.size}px sans-serif`;
    ctx.fillStyle = t.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lineHeight = t.size * 1.25;
    t.value.split("\n").forEach((line, i) => ctx.fillText(line, t.x, t.y + i * lineHeight));
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImgRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    elementsRef.current.forEach(el => {
      if (el.type === "token") drawPlayerToken(ctx, el);
      else if (el.type === "text") drawTextElement(ctx, el);
      else drawStroke(ctx, el);
    });
  };

  const toCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    if (tool === "player") {
      const pt = toCanvasPoint(e);
      elementsRef.current.push({ type: "token", x: pt.x, y: pt.y, label: playerLabel, hasBall: playerHasBall, role: playerIsDefender ? "defender" : "offense" });
      redraw();
      return;
    }
    if (tool === "text") {
      if (pendingText) commitPendingText();
      const pt = toCanvasPoint(e);
      const wrapRect = wrapRef.current.getBoundingClientRect();
      setPendingText({ x: pt.x, y: pt.y, screenX: e.clientX - wrapRect.left, screenY: e.clientY - wrapRect.top, value: "" });
      return;
    }
    if (tool === "select") {
      const pt = toCanvasPoint(e);
      const el = findElementAt(pt);
      if (el) draggingRef.current = { el, startX: pt.x, startY: pt.y, origX: pt.x, origY: pt.y, moved: false };
      return;
    }
    currentRef.current = { type: "stroke", color, width: lineWidth, style: lineStyle, arrow: arrowEnd, points: [toCanvasPoint(e)] };
  };
  const handlePointerMove = (e) => {
    if (tool === "select") {
      if (!draggingRef.current) return;
      e.preventDefault();
      const pt = toCanvasPoint(e);
      const d = draggingRef.current;
      moveElementBy(d.el, pt.x - d.startX, pt.y - d.startY);
      d.startX = pt.x; d.startY = pt.y;
      if (Math.hypot(pt.x - d.origX, pt.y - d.origY) > 3) d.moved = true;
      redraw();
      return;
    }
    if (tool === "player" || !currentRef.current) return;
    e.preventDefault();
    const pt = toCanvasPoint(e);
    currentRef.current.points.push(pt);
    // live raw feedback while drawing; final styling (zigzag/dash/arrow) is applied on release
    const ctx = canvasRef.current.getContext("2d");
    const pts = currentRef.current.points;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const prev = pts[pts.length - 2] || pt;
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };
  const handlePointerUp = (e) => {
    if (tool === "select") {
      const d = draggingRef.current;
      draggingRef.current = null;
      if (d && !d.moved && d.el.type === "text") {
        elementsRef.current = elementsRef.current.filter(x => x !== d.el);
        const wrapRect = wrapRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scale = rect.width / canvas.width;
        setPendingText({ x: d.el.x, y: d.el.y, screenX: d.el.x * scale, screenY: d.el.y * scale, value: d.el.value });
        redraw();
      }
      return;
    }
    if (tool === "player") return;
    const stroke = currentRef.current;
    currentRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    if (stroke.style === "zigzag") stroke.points = zigzagify(stroke.points);
    elementsRef.current.push(stroke);
    redraw();
  };

  const findElementAt = (pt) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      if (el.type === "token") {
        if (Math.hypot(pt.x - el.x, pt.y - el.y) <= 20) return el;
      } else if (el.type === "text") {
        ctx.font = `${el.size}px sans-serif`;
        const lines = el.value.split("\n");
        const w = Math.max(...lines.map(l => ctx.measureText(l).width));
        const h = lines.length * el.size * 1.25;
        if (pt.x >= el.x - 4 && pt.x <= el.x + w + 4 && pt.y >= el.y - 4 && pt.y <= el.y + h + 4) return el;
      } else if (el.type === "stroke") {
        const tolerance = el.width / 2 + 10;
        for (let j = 0; j < el.points.length - 1; j++) {
          const a = el.points[j], b = el.points[j + 1];
          const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
          let t = len2 === 0 ? 0 : ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / len2;
          t = Math.max(0, Math.min(1, t));
          const projX = a.x + t * (b.x - a.x), projY = a.y + t * (b.y - a.y);
          if (Math.hypot(pt.x - projX, pt.y - projY) <= tolerance) return el;
        }
      }
    }
    return null;
  };

  const moveElementBy = (el, dx, dy) => {
    if (el.type === "stroke") el.points.forEach(p => { p.x += dx; p.y += dy; });
    else { el.x += dx; el.y += dy; }
  };

  const undo = () => { elementsRef.current.pop(); redraw(); };
  const clearAll = () => { elementsRef.current = []; redraw(); };

  const commitPendingText = () => {
    setPendingText(current => {
      if (current && current.value.trim()) {
        elementsRef.current.push({ type: "text", x: current.x, y: current.y, value: current.value, color, size: textSize });
        redraw();
      }
      return null;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>DESSINER UNE FICHE</h2>
        <div className="flex items-center gap-1 bg-[#1B2A4A]/5 rounded-full p-1">
          <button onClick={() => setTool("pen")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "pen" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>✏️ Stylo</button>
          <button onClick={() => setTool("player")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "player" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🧍 Joueur</button>
          <button onClick={() => setTool("text")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "text" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🔤 Texte</button>
          <button onClick={() => setTool("select")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "select" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🖐 Déplacer</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tool === "pen" ? (
          <>
            {["#1B2A4A", "#D62828", "#2563EB"].map(c => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
            ))}
            <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value={1.5}>Fin</option>
              <option value={2.5}>Moyen</option>
              <option value={4}>Épais</option>
            </select>
            <select value={lineStyle} onChange={e => setLineStyle(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value="simple">Trait simple</option>
              <option value="pointille">Pointillé</option>
              <option value="zigzag">Zigzag</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
              <input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche
            </label>
          </>
        ) : tool === "player" ? (
          <>
            <select value={playerLabel} onChange={e => setPlayerLabel(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white w-20">
              {["1","2","3","4","5","X","X1","X2","X3","X4","X5"].map(n => <option key={n}>{n}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
              <input type="checkbox" checked={playerHasBall} onChange={e => setPlayerHasBall(e.target.checked)} disabled={playerIsDefender} /> Avec ballon
            </label>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
              <input type="checkbox" checked={playerIsDefender} onChange={e => setPlayerIsDefender(e.target.checked)} /> Défenseur
            </label>
            <span className="text-xs text-[#1B2A4A]/40">Touche le terrain pour placer le joueur</span>
          </>
        ) : tool === "text" ? (
          <>
            {["#1B2A4A", "#D62828", "#2563EB"].map(c => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
            ))}
            <select value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value={12}>Petit</option>
              <option value={16}>Moyen</option>
              <option value={22}>Grand</option>
            </select>
            <span className="text-xs text-[#1B2A4A]/40">Touche le terrain pour écrire</span>
          </>
        ) : (
          <span className="text-xs text-[#1B2A4A]/40">Touche un texte ou un joueur pour le faire glisser. Un simple tap sur un texte permet de le réécrire.</span>
        )}
        <button onClick={undo} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 ml-auto">Annuler</button>
        <button onClick={clearAll} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5">Effacer tout</button>
        <input ref={templateInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => handleTemplateUpload(e.target.files?.[0])} />
        <button onClick={() => templateInputRef.current.click()} disabled={loadingTemplate} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 disabled:opacity-50">
          {loadingTemplate ? "Chargement..." : "Changer de gabarit"}
        </button>
        <button onClick={resetToDefaultTemplate} className="px-3 py-1.5 rounded-md text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Gabarit par défaut</button>
      </div>

      <div ref={wrapRef} className="relative border border-[#1B2A4A]/15 rounded-lg overflow-hidden bg-white mb-4" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {pendingText && (
          <div style={{ position: "absolute", left: pendingText.screenX, top: pendingText.screenY - textSize * 0.7, display: "flex", alignItems: "flex-end", gap: 4 }}>
            <textarea
              autoFocus
              rows={Math.max(1, pendingText.value.split("\n").length)}
              value={pendingText.value}
              onChange={e => setPendingText({ ...pendingText, value: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); commitPendingText(); } if (e.key === "Escape") setPendingText(null); }}
              onPointerDown={e => e.stopPropagation()}
              style={{
                fontSize: textSize, color, background: "rgba(255,255,255,0.85)",
                border: "1px dashed #FF6B35", outline: "none", padding: "1px 3px", minWidth: 80,
                resize: "both", lineHeight: 1.25, fontFamily: "sans-serif",
              }}
            />
            <button onClick={commitPendingText} onPointerDown={e => e.stopPropagation()}
              className="text-xs bg-[#FF6B35] text-white rounded px-2 py-1 mb-0.5">OK</button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        <button onClick={() => { commitPendingText(); setTimeout(() => onAddDirect(canvasRef.current.toDataURL("image/png")), 0); }} disabled={processing}
          className="flex items-center gap-1.5 border border-[#FF6B35] text-[#FF6B35] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#FF6B35]/10 disabled:opacity-50">
          Ajouter directement à la bibliothèque
        </button>
        <button onClick={() => { commitPendingText(); setTimeout(() => onValidate(canvasRef.current.toDataURL("image/png")), 0); }} disabled={processing}
          className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28] disabled:opacity-50">
          {processing ? <><Loader2 size={15} className="animate-spin" /> Analyse en cours...</> : "Valider avec analyse IA"}
        </button>
      </div>
    </div>
  );
}

function SessionRow({ s, totalDuree, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(s.titre);
  const [confirmDel, setConfirmDel] = useState(false);
  const commit = () => { setEditing(false); if (val.trim() && val !== s.titre) onRename(val.trim()); };
  return (
    <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 flex items-center justify-between hover:shadow-md">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !editing && onOpen()}>
        {editing ? (
          <input autoFocus value={val} onChange={e => setVal(e.target.value)} onClick={e => e.stopPropagation()}
            onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(s.titre); setEditing(false); } }}
            className="font-semibold text-[#1B2A4A] bg-transparent border-b border-[#FF6B35] outline-none w-full" />
        ) : (
          <h4 className="font-semibold text-[#1B2A4A] truncate">{s.titre}</h4>
        )}
        <div className="text-xs text-[#1B2A4A]/50 flex items-center gap-3 mt-1">
          <span>{s.date}</span><span className="flex items-center gap-1"><Layers size={12} />{s.exerciseIds.length} exercices</span><span className="flex items-center gap-1"><Clock size={12} />{totalDuree} min</span>
          {s.themes?.length > 0 && <span className="text-[#FF6B35]">{s.themes.join(", ")}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="text-[#1B2A4A]/40 hover:text-[#FF6B35] p-1"><Pencil size={15} /></button>
        {confirmDel ? (
          <span className="flex items-center gap-1 text-[10px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => onDelete()} className="text-red-600 font-medium">Confirmer</button>
            <button onClick={() => setConfirmDel(false)} className="text-[#1B2A4A]/40">Annuler</button>
          </span>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }} className="text-[#1B2A4A]/40 hover:text-red-600 p-1"><Trash2 size={15} /></button>
        )}
        <ChevronRight size={18} className="text-[#1B2A4A]/30 cursor-pointer" onClick={onOpen} />
      </div>
    </div>
  );
}

function QuickCropForm({ dataUrl, themes, onSave, onCancel }) {
  const [titre, setTitre] = useState("");
  const [duree, setDuree] = useState(10);
  const [selectedThemes, setSelectedThemes] = useState([]);

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-[#1B2A4A] text-lg" style={{ fontFamily: "Oswald, sans-serif" }}>DÉCRIRE L'EXERCICE</h3>
        <img src={dataUrl} alt="" className="w-full max-h-36 object-contain rounded-lg border border-[#1B2A4A]/10 bg-[#F2EDE4]" />
        <div>
          <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Titre</label>
          <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Nom de l'exercice"
            className="mt-1 w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B35]" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Durée</label>
            <input type="number" value={duree} min={1} onFocus={e => e.target.select()} onChange={e => setDuree(e.target.value === "" ? "" : Number(e.target.value))} onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) setDuree(1); }}
              className="mt-1 w-20 border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B35]" />
          </div>
          <span className="text-sm text-[#1B2A4A]/50 mt-5">min</span>
        </div>
        <div>
          <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide mb-2 block">Thèmes</label>
          <div className="flex flex-wrap gap-1.5">
            {themes.map(t => <Tag key={t} active={selectedThemes.includes(t)} onClick={() => setSelectedThemes(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])}>{t}</Tag>)}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 border border-[#1B2A4A]/20 rounded-lg py-3 text-sm font-medium text-[#1B2A4A]/60">Annuler</button>
          <button onClick={() => onSave(titre || "Exercice rogné", duree, selectedThemes)}
            className="flex-1 text-white rounded-lg py-3 text-sm font-semibold" style={{ backgroundColor: "#FF6B35" }}>
            Ajouter à la séance
          </button>
        </div>
      </div>
    </div>
  );
}

function CropPhotoView({ imageData, onCancel, onCrop }) {
  const canvasRef = useRef();
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const dragging = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState(null);

  const normalizeRect = (r) => ({
    x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h),
    w: Math.abs(r.w), h: Math.abs(r.h),
  });

  const redraw = useCallback((r) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    if (r && (Math.abs(r.w) > 2 || Math.abs(r.h) > 2)) {
      const nr = normalizeRect(r);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const s = scaleRef.current;
      ctx.drawImage(imgRef.current, nr.x / s, nr.y / s, nr.w / s, nr.h / s, nr.x, nr.y, nr.w, nr.h);
      ctx.strokeStyle = "#FF6B35";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(nr.x, nr.y, nr.w, nr.h);
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = canvas.parentElement.clientWidth - 16;
      const maxH = window.innerHeight * 0.72;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      scaleRef.current = scale;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      redraw(null);
    };
    img.src = imageData;
  }, [imageData, redraw]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (touch.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    startRef.current = pos;
    dragging.current = true;
    const r = { ...pos, w: 0, h: 0 };
    setCropRect(r);
    redraw(r);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const r = { x: startRef.current.x, y: startRef.current.y, w: pos.x - startRef.current.x, h: pos.y - startRef.current.y };
    setCropRect(r);
    redraw(r);
  };

  const onPointerUp = () => { dragging.current = false; };

  const handleCrop = () => {
    if (!cropRect || Math.abs(cropRect.w) < 10 || Math.abs(cropRect.h) < 10) return;
    const nr = normalizeRect(cropRect);
    const s = scaleRef.current;
    const out = document.createElement("canvas");
    out.width = Math.round(nr.w / s);
    out.height = Math.round(nr.h / s);
    out.getContext("2d").drawImage(imgRef.current, nr.x / s, nr.y / s, nr.w / s, nr.h / s, 0, 0, out.width, out.height);
    onCrop(out.toDataURL("image/jpeg", 0.85));
  };

  const canCrop = cropRect && Math.abs(cropRect.w) > 10 && Math.abs(cropRect.h) > 10;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ backgroundColor: "#1B2A4A" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><X size={18} /> Annuler</button>
        <span className="text-white font-medium text-sm">Trace un rectangle autour de l'exercice</span>
        <button onClick={handleCrop} disabled={!canCrop}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: canCrop ? "#FF6B35" : "#FF6B35", opacity: canCrop ? 1 : 0.4 }}>
          Rogner
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden px-2 pb-4">
        <canvas ref={canvasRef}
          style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", display: "block" }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        />
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Compte créé ! Vérifie tes emails pour confirmer ton inscription, puis connecte-toi.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center p-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#1B2A4A] flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35]" />
          </div>
          <h1 className="font-bold text-[#1B2A4A] text-xl leading-tight" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</h1>
        </div>
        <p className="text-sm text-[#1B2A4A]/60 mb-6 leading-relaxed">Centralisez vos exercices, construisez vos meilleures séances, partagez votre expertise avec vos collègues — et faites performer votre équipe toute la saison.</p>
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-6">{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
        {message && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Mot de passe</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2563EB]" />
            {mode === "signup" && <p className="text-xs text-[#1B2A4A]/40 mt-1">6 caractères minimum</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#FF6B35] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#e85a28] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Se connecter" : "S'inscrire"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
          className="mt-4 w-full text-sm text-[#1B2A4A]/50 hover:text-[#2563EB] text-center transition-colors">
          {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}

function CoachingProBoost({ session }) {
  const { exercises, sessions, themes, teams, activeTeamId, players, saveExercises, saveSessions, saveThemes, saveTeams, saveActiveTeamId, savePlayers, loaded } = useStore();
  const team = teams.find(t => t.id === activeTeamId) || teams[0] || { nom: "", niveau: "", jours: [], nbJoueurs: 0 };
  const updateTeam = (patch) => {
    if (!team.id) {
      const created = { id: uid(), nom: "", niveau: "", jours: [], nbJoueurs: 0, ...patch };
      saveTeams([...teams, created]);
      saveActiveTeamId(created.id);
    } else {
      saveTeams(teams.map(t => t.id === team.id ? { ...t, ...patch } : t));
    }
  };
  const createTeam = (nom) => {
    const t = { id: uid(), nom: nom || "Nouvelle équipe", niveau: "", jours: [], nbJoueurs: 0 };
    saveTeams([...teams, t]);
    saveActiveTeamId(t.id);
  };
  const deleteTeam = (id) => {
    const next = teams.filter(t => t.id !== id);
    saveTeams(next);
    if (activeTeamId === id) saveActiveTeamId(next[0]?.id || null);
  };
  const pdfReady = usePdfJs();
  const [view, setView] = useState("library");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterTheme, setFilterTheme] = useState([]);
  const [filterFormat, setFilterFormat] = useState([]);
  const [filterPhase, setFilterPhase] = useState([]);
  const [filterCategorie, setFilterCategorie] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [newThemeInput, setNewThemeInput] = useState("");
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [importing, setImporting] = useState(null); // { status, progress, total } or null
  const [reviewItems, setReviewItems] = useState(null); // array or null
  const importInputRef = useRef();

  const filtered = exercises.filter(ex =>
    (filterTheme.length === 0 || filterTheme.every(t => ex.themes?.includes(t))) &&
    (filterFormat.length === 0 || filterFormat.includes(ex.format)) &&
    (filterPhase.length === 0 || filterPhase.every(p => ex.phases?.includes(p))) &&
    (filterCategorie.length === 0 || filterCategorie.includes(ex.categorie))
  );

  const toggleFilter = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const upsertExercise = (ex) => {
    const { _staySaved, ...clean } = ex;
    const exists = exercises.some(e => e.id === clean.id);
    saveExercises(exists ? exercises.map(e => e.id === clean.id ? clean : e) : [...exercises, clean]);
    if (_staySaved) { setEditing(clean); } else { setShowForm(false); setEditing(null); }
  };

  const newSession = () => {
    const s = { id: uid(), titre: "Nouvelle séance", date: new Date().toISOString().slice(0, 10), exerciseIds: [], teamId: team.id || null };
    saveSessions([...sessions, s]); setActiveSession(s); setView("session");
  };

  const updateSession = (next) => { saveSessions(sessions.map(s => s.id === next.id ? next : s)); setActiveSession(next); };
  const addToSession = (exId) => { if (!activeSession || activeSession.exerciseIds.includes(exId)) return; updateSession({ ...activeSession, exerciseIds: [...activeSession.exerciseIds, exId] }); };
  const totalDuree = (s) => s.exerciseIds.reduce((sum, id) => sum + (exercises.find(e => e.id === id)?.duree || 0), 0);

  const [addBanner, setAddBanner] = useState(null); // { sessionId, sessionTitre, count }
  const [draftSessionId, setDraftSessionId] = useState(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const addExerciseToDraft = (exId) => {
    let draft = sessions.find(s => s.id === draftSessionId && s.teamId === (team.id || null));
    let nextSessions;
    if (!draft) {
      draft = { id: uid(), titre: "Nouvelle séance", date: todayStr, exerciseIds: [exId], teamId: team.id || null };
      nextSessions = [...sessions, draft];
      setDraftSessionId(draft.id);
    } else if (draft.exerciseIds.includes(exId)) {
      setAddBanner({ sessionId: draft.id, sessionTitre: draft.titre, count: draft.exerciseIds.length });
      return;
    } else {
      draft = { ...draft, exerciseIds: [...draft.exerciseIds, exId] };
      nextSessions = sessions.map(s => s.id === draft.id ? draft : s);
    }
    saveSessions(nextSessions);
    setAddBanner({ sessionId: draft.id, sessionTitre: draft.titre, count: draft.exerciseIds.length });
  };

  const teamSessions = sessions.filter(s => (s.teamId || null) === (team.id || null));
  const seasonsList = [...new Set(teamSessions.map(s => getSeason(s.date)))].sort().reverse();
  const [selectedSeason, setSelectedSeason] = useState(null);
  const currentSeason = selectedSeason && seasonsList.includes(selectedSeason) ? selectedSeason : seasonsList[0];
  const monthGroups = teamSessions
    .filter(s => getSeason(s.date) === currentSeason)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .reduce((acc, s) => {
      const d = new Date(s.date);
      const label = isNaN(d) ? "Sans date" : `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
      (acc[label] = acc[label] || []).push(s);
      return acc;
    }, {});

  const [statsMonth, setStatsMonth] = useState(null);
  const statsMonthLabels = Object.keys(monthGroups);
  const currentStatsMonth = statsMonth && statsMonthLabels.includes(statsMonth) ? statsMonth : statsMonthLabels[0];
  const statsSessions = monthGroups[currentStatsMonth] || [];
  const statsTotalMin = statsSessions.reduce((sum, s) => sum + totalDuree(s), 0);
  const statsThemeMin = {};
  statsSessions.forEach(s => s.exerciseIds.forEach(id => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    (ex.themes || []).forEach(t => { statsThemeMin[t] = (statsThemeMin[t] || 0) + (ex.duree || 0); });
  }));
  const statsThemeRows = Object.entries(statsThemeMin).sort((a, b) => b[1] - a[1]);

  const [drawProcessing, setDrawProcessing] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropContext, setCropContext] = useState("library"); // "library" | "session"
  const [quickCropData, setQuickCropData] = useState(null);
  const [currentSessionPhoto, setCurrentSessionPhoto] = useState(null);
  const sessionPhotoInputRef = useRef();

  useEffect(() => {
    if (!activeSession) { setCurrentSessionPhoto(null); return; }
    (async () => {
      try {
        const r = await storage.get(`sessionPhoto:${activeSession.id}`);
        setCurrentSessionPhoto(r ? JSON.parse(r.value) : null);
      } catch { setCurrentSessionPhoto(null); }
    })();
  }, [activeSession?.id]);

  const handleSessionPhotoFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !activeSession) return;
    const dataUrl = await readImageAsJpeg(f, 2000, 0.8);
    setCurrentSessionPhoto(dataUrl);
    await storage.set(`sessionPhoto:${activeSession.id}`, JSON.stringify(dataUrl));
    e.target.value = "";
  };

  const deleteSessionPhoto = async () => {
    if (!activeSession) return;
    setCurrentSessionPhoto(null);
    await storage.delete(`sessionPhoto:${activeSession.id}`);
  };

  const handleCropDone = (dataUrl) => {
    if (cropContext === "session") {
      setQuickCropData(dataUrl);
      return;
    }
    const ex = {
      id: uid(), titre: "Exercice rogné " + new Date().toLocaleDateString("fr-FR"),
      themes: [], phases: [], format: FORMATS[0], niveau: NIVEAUX[1], categorie: "",
      duree: 10, objectif: "", notes: "",
      file: { name: "exercice-rogné.jpg", type: "image/jpeg", data: dataUrl },
    };
    saveExercises([...exercises, ex]);
    setCropImage(null);
    setView("library");
  };

  const handleQuickCropSave = (titre, duree, selectedThemes) => {
    const ex = {
      id: uid(), titre,
      themes: selectedThemes, phases: [], format: FORMATS[0], niveau: NIVEAUX[1], categorie: "",
      duree, objectif: "", notes: "",
      file: { name: "exercice-rogné.jpg", type: "image/jpeg", data: quickCropData },
    };
    const nextExercises = [...exercises, ex];
    saveExercises(nextExercises);
    if (activeSession) {
      const updated = { ...activeSession, exerciseIds: [...activeSession.exerciseIds, ex.id] };
      updateSession(updated);
    }
    setQuickCropData(null);
    // Retour au crop pour pouvoir rogner un autre exercice
    setCropImage(currentSessionPhoto);
    setView("crop");
  };
  const addDrawnSheetDirect = (dataUrl) => {
    const ex = {
      id: uid(), titre: "Fiche dessinée " + new Date().toLocaleDateString("fr-FR"),
      themes: [], phases: [], format: FORMATS[0], niveau: NIVEAUX[1], categorie: "",
      duree: 0, objectif: "", notes: "",
      file: { name: "fiche-dessinee.png", type: "image/png", data: dataUrl },
      createdAt: new Date().toISOString(),
    };
    saveExercises([...exercises, ex]);
    setView("library");
  };

  const processDrawnSheet = async (dataUrl) => {
    setDrawProcessing(true);
    try {
      const exList = await extractExercisesFromImage(dataUrl, themes);
      const results = exList.map(data => ({ ...data, id: uid(), pageImage: dataUrl, file: { name: "fiche-dessinee.png", type: "image/png", data: dataUrl }, phases: [] }));
      setDrawProcessing(false);
      setView("sessions");
      setReviewItems(results);
    } catch (e) {
      console.error(e);
      setDrawProcessing(false);
      alert("L'analyse a échoué — réessaie.");
    }
  };

  const handleImportFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    if (files.some(f => f.type === "application/pdf") && !pdfReady) { alert("Le lecteur PDF n'est pas encore prêt, réessaie dans une seconde."); return; }
    setImporting({ status: "rendering", progress: 0, total: 0 });
    try {
      let pageImages = [];
      for (const f of files) {
        if (f.type === "application/pdf") {
          pageImages = pageImages.concat(await renderPdfPages(f));
        } else if (f.type.startsWith("image/")) {
          pageImages.push(await readImageAsJpeg(f));
        }
      }
      if (pageImages.length === 0) { setImporting(null); alert("Aucun PDF ou photo valide n'a été trouvé."); return; }
      setImporting({ status: "extracting", progress: 0, total: pageImages.length });
      const results = [];
      for (let i = 0; i < pageImages.length; i++) {
        const exList = await extractExercisesFromImage(pageImages[i], themes);
        exList.forEach(data => {
          results.push({ ...data, id: uid(), pageImage: pageImages[i], file: { name: `page-${i + 1}.jpg`, type: "image/jpeg", data: pageImages[i] }, phases: [] });
        });
        setImporting({ status: "extracting", progress: i + 1, total: pageImages.length });
      }
      setImporting(null);
      setReviewItems(results);
    } catch (e) {
      console.error(e);
      setImporting(null);
      alert("L'import a échoué — vérifie que les fichiers sont bien lisibles (PDF ou photo).");
    }
  };

  const confirmImport = () => {
    const newExercises = reviewItems.map(({ pageImage, ...ex }) => ex);
    saveExercises([...exercises, ...newExercises]);
    const s = { id: uid(), titre: "Séance importée", date: new Date().toISOString().slice(0, 10), exerciseIds: newExercises.map(e => e.id), teamId: team.id || null };
    saveSessions([...sessions, s]);
    setReviewItems(null);
    setView("library");
  };

  if (!loaded) return <div className="p-8 text-[#1B2A4A]/50 text-sm">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#F2EDE4]" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <header className="border-b border-[#1B2A4A]/10 px-6 py-4 flex items-center gap-3 no-print">
        <button onClick={() => setSidebarOpen(true)} className="text-[#1B2A4A] p-1 -ml-1" aria-label="Ouvrir le menu"><Menu size={22} /></button>
        <div className="w-8 h-8 rounded-full bg-[#1B2A4A] flex items-center justify-center"><div className="w-3 h-3 rounded-full border-2 border-[#FF6B35]" /></div>
        <h1 className="font-bold text-[#1B2A4A] tracking-tight" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</h1>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] no-print">
          <div className="absolute inset-0 bg-black/55" onClick={() => setSidebarOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-[#1B2A4A]/15 p-4 flex flex-col gap-1 shadow-2xl">
            <div className="flex items-center justify-between mb-4 px-2 pt-1">
              <span className="font-bold text-[#1B2A4A] text-lg" style={{ fontFamily: "Oswald, sans-serif" }}>MENU</span>
              <button onClick={() => setSidebarOpen(false)} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] p-1"><X size={22} /></button>
            </div>
            {[
              { key: "library", label: "Bibliothèque", icon: Library },
              { key: "sessions", label: "Séances", icon: ListPlus, alsoActive: "session" },
              { key: "equipe", label: "Équipe", icon: Users },
              { key: "stats", label: "Stats", icon: BarChart3 },
            ].map(item => {
              const active = view === item.key || view === item.alsoActive;
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => { setView(item.key); setSidebarOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-left transition-colors ${active ? "" : "text-[#1B2A4A] hover:bg-[#1B2A4A]/8"}`}
                  style={active ? { backgroundColor: "#2563EB", color: "#ffffff" } : undefined}>
                  <Icon size={19} /> {item.label}
                </button>
              );
            })}
            <div className="mt-auto pt-4 border-t border-[#1B2A4A]/10">
              <div className="px-3 py-1 text-xs text-[#1B2A4A]/40 truncate">{session?.user?.email}</div>
              <button onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-left text-[#1B2A4A]/60 hover:bg-red-50 hover:text-red-600 transition-colors w-full mt-1">
                <LogOut size={19} /> Se déconnecter
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="px-6 py-6 max-w-5xl mx-auto">

        {view === "library" && !showForm && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>BIBLIOTHÈQUE D'EXERCICES</h2>
                <p className="text-sm text-[#1B2A4A]/50">{exercises.length} exercice{exercises.length !== 1 ? "s" : ""} enregistré{exercises.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28]"><Plus size={16} /> Nouvel exercice</button>
            </div>

            {addBanner && (
              <div className="mb-5 border border-[#FF6B35]/30 bg-[#FF6B35]/8 rounded-lg p-3 flex items-center justify-between text-sm text-[#1B2A4A]">
                <span>Ajouté à <strong>{addBanner.sessionTitre}</strong> ({addBanner.count} exercice{addBanner.count !== 1 ? "s" : ""})</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => { const s = sessions.find(x => x.id === addBanner.sessionId); if (s) { setActiveSession(s); setView("session"); } }} className="font-medium text-[#FF6B35] hover:underline">Voir la séance →</button>
                  <button onClick={() => setAddBanner(null)} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={14} /></button>
                </div>
              </div>
            )}
            <div className="space-y-2 mb-6">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Thème :</span>
                {themes.map(t => <Tag key={t} active={filterTheme.includes(t)} onClick={() => toggleFilter(filterTheme, setFilterTheme, t)} color="orange">{t}</Tag>)}
                <div className="flex items-center gap-1 ml-2">
                  <input value={newThemeInput} onChange={e => setNewThemeInput(e.target.value)} placeholder="+ ajouter un thème" className="text-xs border border-[#1B2A4A]/20 rounded-full px-2 py-1 w-32 bg-white/60"
                    onKeyDown={e => { if (e.key === "Enter" && newThemeInput.trim()) { saveThemes([...themes, newThemeInput.trim()]); setNewThemeInput(""); } }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Opposition :</span>
                {FORMATS.map(f => <Tag key={f} active={filterFormat.includes(f)} onClick={() => toggleFilter(filterFormat, setFilterFormat, f)}>{f}</Tag>)}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Phase :</span>
                {PHASES.map(p => <Tag key={p} active={filterPhase.includes(p)} onClick={() => toggleFilter(filterPhase, setFilterPhase, p)}>{p}</Tag>)}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Catégorie :</span>
                {CATEGORIES.map(c => <Tag key={c} active={filterCategorie.includes(c)} onClick={() => toggleFilter(filterCategorie, setFilterCategorie, c)}>{c}</Tag>)}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40"><p>Aucun exercice ne correspond.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((ex, i) => (
                  <ExerciseCard key={ex.id} ex={ex} index={i}
                    onClick={() => { setEditing(ex); setShowForm(true); }}
                    onRemove={() => saveExercises(exercises.filter(e => e.id !== ex.id))}
                    onAddToDraft={() => addExerciseToDraft(ex.id)}
                    onCropImage={(imgData) => { setCropImage(imgData); setView("crop"); }} />
                ))}
              </div>
            )}
          </>
        )}

        {view === "library" && showForm && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>{editing ? "MODIFIER L'EXERCICE" : "NOUVEL EXERCICE"}</h2>
            <ExerciseForm themes={themes} initial={editing} onSave={upsertExercise} onCancel={() => { setShowForm(false); setEditing(null); }} />
          </div>
        )}

        {view === "equipe" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-5" style={{ fontFamily: "Oswald, sans-serif" }}>ÉQUIPE</h2>

            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {teams.map(t => (
                <button key={t.id} onClick={() => saveActiveTeamId(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${t.id === team.id ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                  style={t.id === team.id ? { backgroundColor: "#2563EB", color: "#ffffff", borderColor: "#2563EB" } : undefined}>
                  {t.nom || "Sans nom"}
                </button>
              ))}
              {newTeamOpen ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newTeamName.trim()) { createTeam(newTeamName.trim()); setNewTeamName(""); setNewTeamOpen(false); } if (e.key === "Escape") { setNewTeamOpen(false); setNewTeamName(""); } }}
                    placeholder="Nom (ex: NM1, U18...)" className="px-3 py-1.5 rounded-full text-sm border border-[#FF6B35] outline-none w-44" />
                  <button onClick={() => { if (newTeamName.trim()) { createTeam(newTeamName.trim()); setNewTeamName(""); setNewTeamOpen(false); } }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#FF6B35] text-white">Créer</button>
                  <button onClick={() => { setNewTeamOpen(false); setNewTeamName(""); }} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={16} /></button>
                </div>
              ) : (
                <button onClick={() => setNewTeamOpen(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-[#FF6B35]/50 text-[#FF6B35] flex items-center gap-1"><Plus size={14} /> Créer une équipe</button>
              )}
              {team.id && (
                confirmDeleteTeam ? (
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="text-[#1B2A4A]/60">Supprimer "{team.nom}" ?</span>
                    <button onClick={() => { deleteTeam(team.id); setConfirmDeleteTeam(false); }} className="text-red-600 font-medium">Oui</button>
                    <button onClick={() => setConfirmDeleteTeam(false)} className="text-[#1B2A4A]/40">Non</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteTeam(true)} className="ml-2 text-[#1B2A4A]/40 hover:text-red-600"><Trash2 size={15} /></button>
                )
              )}
            </div>

            <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Nom de l'équipe</div>
                  <input value={team.nom} onChange={e => updateTeam({ nom: e.target.value })} placeholder="ex: U18 + ESP"
                    className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Niveau</div>
                  <input value={team.niveau} onChange={e => updateTeam({ niveau: e.target.value })} placeholder="ex: NM1, ProB..."
                    className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
                </div>
              </div>
              <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Jours d'entraînement</div>
              <div className="flex gap-1.5">
                {JOURS.map(j => (
                  <Tag key={j} active={(team.jours || []).includes(j)} color="orange"
                    onClick={() => { const cur = team.jours || []; updateTeam({ jours: cur.includes(j) ? cur.filter(x => x !== j) : [...cur, j] }); }}>{j}</Tag>
                ))}
              </div>
            </div>

            <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-5">
              <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Effectif (nombre de joueurs)</div>
              <input type="number" min={0} value={team.nbJoueurs || ""} onChange={e => updateTeam({ nbJoueurs: Number(e.target.value) })}
                placeholder="ex: 12" className="w-32 border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
            </div>
          </div>
        )}

        {view === "stats" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>STATISTIQUES</h2>
            </div>
            <p className="text-xs text-[#1B2A4A]/40 mb-5">{team.nom ? `Équipe : ${team.nom}` : "Aucune équipe sélectionnée"} · Saison {currentSeason || "—"}</p>

            {statsMonthLabels.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40">Aucune séance enregistrée sur cette saison.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {statsMonthLabels.map(m => <Tag key={m} active={currentStatsMonth === m} onClick={() => setStatsMonth(m)}>{m}</Tag>)}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 text-center">
                    <div className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>{statsSessions.length}</div>
                    <div className="text-xs text-[#1B2A4A]/50 uppercase tracking-wide mt-1">Entraînement{statsSessions.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 text-center">
                    <div className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>{Math.floor(statsTotalMin / 60)}h{String(statsTotalMin % 60).padStart(2, "0")}</div>
                    <div className="text-xs text-[#1B2A4A]/50 uppercase tracking-wide mt-1">Temps total</div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-[#1B2A4A]/70 uppercase tracking-wide mb-3">Répartition par thème</h3>
                {statsThemeRows.length === 0 ? (
                  <p className="text-sm text-[#1B2A4A]/40">Aucun exercice catégorisé par thème ce mois-ci.</p>
                ) : (
                  <div className="space-y-3">
                    {statsThemeRows.map(([t, min]) => {
                      const pct = statsTotalMin ? Math.round((min / statsTotalMin) * 100) : 0;
                      const h = Math.floor(min / 60), m = min % 60;
                      return (
                        <div key={t}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-[#1B2A4A] font-medium">{t}</span>
                            <span className="text-[#1B2A4A]/50">{h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`} · {pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1B2A4A]/8 overflow-hidden">
                            <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === "crop" && cropImage && (
          <>
            <CropPhotoView imageData={cropImage}
              onCancel={() => { setCropImage(null); setView(cropContext === "session" ? "session" : "library"); }}
              onCrop={handleCropDone} />
            {quickCropData && (
              <QuickCropForm dataUrl={quickCropData} themes={themes}
                onSave={handleQuickCropSave}
                onCancel={() => setQuickCropData(null)} />
            )}
          </>
        )}

        {view === "draw" && (
          <DrawSheetView processing={drawProcessing} onCancel={() => setView("sessions")} onValidate={processDrawnSheet} onAddDirect={addDrawnSheetDirect} />
        )}

        {view === "sessions" && !reviewItems && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>SÉANCES</h2>
                <p className="text-xs text-[#1B2A4A]/40">{team.nom ? `Équipe : ${team.nom}` : "Aucune équipe sélectionnée"}</p>
              </div>
              <div className="flex gap-2">
                <input ref={importInputRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={e => handleImportFiles(e.target.files)} />
                <button onClick={() => setView("draw")} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 text-[#1B2A4A] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1B2A4A]/5"><Pencil size={16} /> Dessiner une fiche</button>
                {/* Import IA désactivé temporairement — nécessite clé API Anthropic */}
                <button onClick={newSession} className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28]"><Plus size={16} /> Nouvelle séance</button>
              </div>
            </div>

            {importing && (
              <div className="mb-6 border border-[#FF6B35]/30 bg-[#FF6B35]/5 rounded-lg p-4 flex items-center gap-3 text-sm text-[#1B2A4A]">
                <Loader2 size={18} className="animate-spin text-[#FF6B35]" />
                {importing.status === "rendering" && "Lecture du PDF..."}
                {importing.status === "extracting" && `Analyse des exercices : page ${importing.progress}/${importing.total}`}
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40">Aucune séance pour l'instant.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {seasonsList.map(s => <Tag key={s} active={currentSeason === s} onClick={() => setSelectedSeason(s)}>{s}</Tag>)}
                </div>
                {Object.keys(monthGroups).length === 0 ? (
                  <div className="text-center py-16 text-[#1B2A4A]/40">Aucune séance sur cette saison.</div>
                ) : (
                  Object.entries(monthGroups).map(([monthLabel, monthSessions]) => (
                    <div key={monthLabel} className="mb-6">
                      <h3 className="text-xs uppercase tracking-widest text-[#FF6B35] font-semibold mb-2">{monthLabel}</h3>
                      <div className="space-y-2">
                        {monthSessions.map(s => (
                          <SessionRow key={s.id} s={s} totalDuree={totalDuree(s)}
                            onOpen={() => { setActiveSession(s); setView("session"); }}
                            onRename={(titre) => saveSessions(sessions.map(x => x.id === s.id ? { ...x, titre } : x))}
                            onDelete={() => saveSessions(sessions.filter(x => x.id !== s.id))} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </>
        )}

        {view === "sessions" && reviewItems && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>VÉRIFIE LES EXERCICES DÉTECTÉS</h2>
                <p className="text-sm text-[#1B2A4A]/50">{reviewItems.length} page{reviewItems.length !== 1 ? "s" : ""} analysée{reviewItems.length !== 1 ? "s" : ""} — corrige si besoin avant d'importer</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setReviewItems(null)} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
                <button onClick={confirmImport} className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28] whitespace-nowrap"><Check size={16} /> Valider ({reviewItems.length} exercice{reviewItems.length !== 1 ? "s" : ""})</button>
              </div>
            </div>
            <div className="space-y-3">
              {reviewItems.map((item, i) => (
                <ImportReviewCard key={item.id} item={item} themes={themes}
                  onChange={(next) => setReviewItems(reviewItems.map(r => r.id === item.id ? next : r))}
                  onRemove={() => setReviewItems(reviewItems.filter(r => r.id !== item.id))} />
              ))}
            </div>
          </div>
        )}

        {view === "session" && activeSession && (
          <div>
            <div className="flex items-center justify-between mb-5 no-print">
              <button onClick={() => setView("sessions")} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">← Retour aux séances</button>
              <button onClick={() => downloadSessionHTML(activeSession, exercises)} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 px-3 py-1.5 rounded-md text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5"><Printer size={14} /> Télécharger pour impression</button>
            </div>
            <input value={activeSession.titre} onChange={e => updateSession({ ...activeSession, titre: e.target.value })} className="text-2xl font-bold text-[#1B2A4A] bg-transparent border-b-2 border-transparent focus:border-[#FF6B35] outline-none mb-1 w-full" style={{ fontFamily: "Oswald, sans-serif" }} />
            <input type="date" value={activeSession.date} onChange={e => updateSession({ ...activeSession, date: e.target.value })} className="text-sm text-[#1B2A4A]/60 bg-transparent outline-none mb-3" />
            <div className="mb-6 no-print">
              <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Thèmes de la séance</div>
              <div className="flex flex-wrap gap-1.5">
                {themes.map(t => (
                  <Tag key={t} color="orange" active={(activeSession.themes || []).includes(t)}
                    onClick={() => {
                      const cur = activeSession.themes || [];
                      updateSession({ ...activeSession, themes: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
                    }}>{t}</Tag>
                ))}
              </div>
            </div>
            <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-2 no-print">Durée totale : {totalDuree(activeSession)} min</div>

            {team.nbJoueurs > 0 && (
              <div className="mb-6 no-print">
                <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Présents à cette séance</div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={team.nbJoueurs} value={activeSession.presents ?? ""} placeholder="—"
                    onChange={e => updateSession({ ...activeSession, presents: Number(e.target.value) })}
                    className="w-20 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                  <span className="text-sm text-[#1B2A4A]/50">/ {team.nbJoueurs}</span>
                </div>
              </div>
            )}

            <div className="mb-6 no-print">
              <RatingBlock avis={activeSession.avis || []} onAdd={(a) => updateSession({ ...activeSession, avis: [...(activeSession.avis || []), a] })} />
            </div>
            <div className="mb-6 no-print">
              <input ref={sessionPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleSessionPhotoFile} />
              {currentSessionPhoto ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/40">Photo de séance</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setCropImage(currentSessionPhoto); setCropContext("session"); setView("crop"); }}
                        className="flex items-center gap-1 text-xs border rounded-md px-2.5 py-1 transition-colors text-[#FF6B35] border-[#FF6B35]/40 hover:bg-[#FF6B35] hover:text-white">
                        <ImageIcon size={12} /> Rogner un exercice
                      </button>
                      <button onClick={deleteSessionPhoto}
                        className="flex items-center gap-1 text-xs border border-[#1B2A4A]/20 rounded-md px-2.5 py-1 text-[#1B2A4A]/40 hover:text-red-600 hover:border-red-300 transition-colors">
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                  <img src={currentSessionPhoto} alt="" className="w-full rounded-lg border border-[#1B2A4A]/10 object-contain max-h-80" />
                </div>
              ) : (
                <button onClick={() => sessionPhotoInputRef.current.click()}
                  className="w-full border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-4 flex items-center justify-center gap-2 text-sm text-[#1B2A4A]/50 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                  <ImageIcon size={18} /> Ajouter une photo de séance
                </button>
              )}
            </div>

            <div className="space-y-2 mb-8">
              {activeSession.exerciseIds.length === 0 && <p className="text-[#1B2A4A]/40 text-sm">Ajoute des exercices depuis la bibliothèque ci-dessous.</p>}
              {activeSession.exerciseIds.map((id, i) => {
                const ex = exercises.find(e => e.id === id);
                if (!ex) return null;
                return (
                  <div key={id} className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#FF6B35] w-12">SET {String(i + 1).padStart(2, "0")}</span>
                      <div><div className="font-medium text-[#1B2A4A]">{ex.titre}</div><div className="text-xs text-[#1B2A4A]/50">{ex.duree} min · {ex.format} · {ex.themes?.join(", ")}</div></div>
                    </div>
                    <button onClick={() => updateSession({ ...activeSession, exerciseIds: activeSession.exerciseIds.filter(x => x !== id) })} className="text-[#1B2A4A]/40 hover:text-red-600 no-print"><X size={16} /></button>
                  </div>
                );
              })}
            </div>
            <div className="no-print">
              <h3 className="text-sm font-semibold text-[#1B2A4A]/60 uppercase tracking-wide mb-3">Ajouter depuis la bibliothèque</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {exercises.filter(e => !activeSession.exerciseIds.includes(e.id)).map((ex, i) => <ExerciseCard key={ex.id} ex={ex} index={i} onClick={() => addToSession(ex.id)} />)}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <div className="text-[#1B2A4A]/50 text-sm">Chargement...</div>
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return <CoachingProBoost key={session.user.id} session={session} />;
}
