import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { Plus, X, Upload, FileText, Image as ImageIcon, Clock, Layers, Trash2, Printer, ChevronRight, ListPlus, Library, FileUp, Check, Loader2, Pencil, Users, UserCheck, UserX, Star, BarChart3, Menu, Mic, LogOut, BookOpen, Camera, Share2, Zap, Maximize2, Minimize2, Lock, Unlock, Undo2, StickyNote, Video } from "lucide-react";
import { storage, supabase, isPasswordRecoveryUrl } from "./storage";
import JSZip from "jszip";
import QRCode from "qrcode";

const AlertCtx = createContext(null);
function useAlert() { return useContext(AlertCtx); }
function AlertProvider({ children }) {
  const [modal, setModal] = useState(null);
  const show = useCallback((msg, opts = {}) => new Promise(resolve => setModal({ msg, resolve, confirm: opts.confirm, confirmLabel: opts.confirmLabel, cancelLabel: opts.cancelLabel })), []);
  const close = (result) => { modal?.resolve(result); setModal(null); };
  return (
    <AlertCtx.Provider value={show}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="bg-[#1B2A4A] px-5 py-4 flex items-center gap-3">
              <img src="/logo-icon.png" alt="CPB" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
              <span className="text-white font-bold text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</span>
            </div>
            <div className="px-5 py-5">
              <p className="text-[#1B2A4A] text-sm leading-relaxed mb-5">{modal.msg}</p>
              {modal.confirm ? (
                <div className="flex gap-3">
                  <button onClick={() => close(false)}
                    className="flex-1 border border-[#1B2A4A]/20 text-[#1B2A4A] font-semibold py-2.5 rounded-xl text-sm hover:bg-[#1B2A4A]/5 transition-colors">
                    {modal.cancelLabel || "Annuler"}
                  </button>
                  <button onClick={() => close(true)}
                    className="flex-1 bg-[#FF6B35] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#e85a28] transition-colors"
                    style={{ fontFamily: "Oswald, sans-serif" }}>
                    {modal.confirmLabel || "Confirmer"}
                  </button>
                </div>
              ) : (
                <button onClick={() => close(true)}
                  className="w-full bg-[#FF6B35] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#e85a28] transition-colors"
                  style={{ fontFamily: "Oswald, sans-serif" }}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertCtx.Provider>
  );
}

const ToastCtx = createContext(null);
function useToast() { return useContext(ToastCtx); }
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, duration = 2200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-[#1B2A4A] text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-up">
            <Check size={14} className="text-green-400 flex-shrink-0" />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const SPORTS_CONFIG = {
  basketball: {
    label: "Basketball", emoji: "🏀",
    themes: ["Démarquage","Pick and Roll","Pick non porteur","Transition","Défense individuelle","Défense collective","Aide défensive","Rotation défensive","Contre","Interception","Prise en charge","Tir","Tir en course","Finition","Rebond","Rebond offensif","Rebond défensif","Jeu sans ballon","Sortie de balle","Passe","Dribble","Pivot","Fixation","Jeu intérieur","Spacing","Attaque de zone","Défense de zone"],
    phases: ["Échauffement","Préparation physique","Technique individuelle","Pré-collectif","Collectif","Fin de séance","Autre"],
    formats: ["1c0","2c0","3c0","4c0","5c0","1c1","2c1","2c2","3c1","3c2","3c3","4c1","4c2","4c3","4c4","5c3","5c4","5c5","2c1+1","3c2+1","4c3+1","5c4+1"],
    categories: ["U7","U9","U11","U13","U15","U17","U18","U20","Seniors"],
    court: "basketball",
    color: "#FF6B35",
  },
  football: {
    label: "Football", emoji: "⚽",
    themes: ["Finition","Conduite de balle","Contrôle du pied","Passes","Amortis","Jeu de tête","Centres","Tir au but"],
    phases: ["Échauffement","Préparation physique","Technique individuelle","Pré-collectif","Collectif","Situations","Fin de séance","Autre"],
    formats: ["1c0","1c1","2c1","2c2","3c2","3c3","4c3","4c4","5c4","5c5","6c5","7c6","8c7","9c8","10c9","11c11"],
    categories: ["U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U19","U20","Seniors"],
    court: "football",
    color: "#2E8B57",
  },
  handball: {
    label: "Handball", emoji: "🤾",
    themes: ["Montée de balle","Jeu en pivot","Jeu en aile","Tir en suspension","Tir en appui","Contre-attaque","Défense 6-0","Défense 5-1","Défense 3-2-1","Repli défensif","Fautes tactiques","Jeu de puissance","Jeu en infériorité","Écran","Pivot","Jet de 7 mètres","Bras roulé","Tir en extension","Défense étagée","Croisement","Permutation","Feinte de tir","Jeu placé","Relance gardien","Tir en cloche"],
    phases: ["Échauffement","Préparation physique","Technique individuelle","Pré-collectif","Collectif","Fin de séance","Autre"],
    formats: ["1c0","1c1","2c1","2c2","3c2","3c3","4c3","5c4","6c5","6c6","4c4+GB","6c6+GB"],
    categories: ["U9","U11","U13","U15","U17","U18","U20","Seniors"],
    court: "handball",
    color: "#993C1D",
  },
  volleyball: {
    label: "Volleyball", emoji: "🏐",
    themes: ["Service","Réception","Passe","Attaque","Contre","Défense","Couverture","Rotation","Système 5-1","Système 4-2","Lecture de jeu","Smasher","Libéro","Manchette","Service flottant","Service smashé","Feinte","Bloc à deux/trois","Pipe","Combinaison d'attaque","Transition","Relance","Placement défensif"],
    phases: ["Échauffement","Technique individuelle","Combinaisons","Système de jeu","Fin de séance","Autre"],
    formats: ["1c0","1c1","2c2","3c3","4c4","6c6"],
    categories: ["U11","U13","U15","U17","U18","U20","Seniors"],
    court: "volleyball",
    color: "#EF9F27",
  },
  rugby: {
    label: "Rugby", emoji: "🏉",
    themes: ["Plaquage","Ruck","Maul","Touche","Mêlée","Pénalité","En-avant","Jeu au pied","Soutien","Défense en ligne","Défense en rideau","Jeu dans l'axe","Jeu au large","Contre-attaque","Drives","Percussion","Cadrage-débordement","Franchissement","Chandelle","Turnover","Sortie de camp","Jeu de transformation","Regroupement offensif","Passe au large","Passe sautée"],
    phases: ["Échauffement","Préparation physique","Technique individuelle","Lignes avants","Trois-quarts","Collectif","Fin de séance","Autre"],
    formats: ["1c0","1c1","2c1","2c2","3c2","3c3","5c4","7c7","15c15"],
    categories: ["U8","U10","U12","U14","U16","U18","U20","Seniors"],
    court: "rugby",
    color: "#712B13",
  },
  autre: {
    label: "Autre sport", emoji: "🏅",
    themes: ["Technique","Tactique","Physique","Mental","Collectif","Individuel"],
    phases: ["Échauffement","Préparation physique","Technique individuelle","Collectif","Fin de séance","Autre"],
    formats: ["1c0","1c1","2c1","2c2","3c3","Groupe","Équipe"],
    categories: ["U10","U12","U14","U16","U18","U20","Seniors"],
    court: "generic",
    color: "#5F5E5A",
  },
};

const DEFAULT_SPORT = "basketball";
const DEFAULT_THEMES = SPORTS_CONFIG.basketball.themes;
const PHASES = SPORTS_CONFIG.basketball.phases;
const FORMATS = SPORTS_CONFIG.basketball.formats;
const CATEGORIES = SPORTS_CONFIG.basketball.categories;
const NIVEAUX = ["Débutant","Intermédiaire","Confirmé"];
const PLAY_TYPES = ["Transition", "Système offensif", "Zone", "SLOB", "BLOB", "ATO"];
const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Génère et télécharge un événement .ics (Apple Calendar, Google Calendar, Outlook...) pour une
// séance individuelle programmée — juste une date (pas d'heure), donc événement "journée entière".
function downloadIndividualSessionIcs(session, playerName) {
  const escIcs = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const dateStr = (session.date || "").replace(/-/g, "");
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const summary = `Séance individuelle — ${playerName}${session.theme ? " — " + session.theme : ""}`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coaching Pro Boost//FR",
    "BEGIN:VEVENT",
    `UID:${session.id}@coachingproboost.com`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${escIcs(summary)}`,
    session.contenu ? `DESCRIPTION:${escIcs(session.contenu)}` : null,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `seance-${playerName.replace(/[^a-z0-9]+/gi, "_")}-${session.date || "date"}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
// ex.categorie est un tableau depuis l'ajout de la sélection multiple ; les exercices
// enregistrés avant avaient une simple chaîne — normalise pour rester compatible partout.
const catList = (ex) => Array.isArray(ex?.categorie) ? ex.categorie : (ex?.categorie ? [ex.categorie] : []);

const FREE_MAX_EXERCISES = 10;
const FREE_MAX_SESSIONS = 3;

function useSubscription(userId) {
  const [isPremium, setIsPremium] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(true);
  const [sport, setSportState] = useState(() => localStorage.getItem("cpb_sport") || DEFAULT_SPORT);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("is_premium, premium_until, sport").eq("id", userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const until = data.premium_until ? new Date(data.premium_until) : null;
          const active = data.is_premium && (!until || until > new Date());
          setIsPremium(active);
          if (data.sport && SPORTS_CONFIG[data.sport]) {
            setSportState(data.sport);
            localStorage.setItem("cpb_sport", data.sport);
          }
        }
        setLoadingPremium(false);
      });
  }, [userId]);

  const setSport = async (s) => {
    setSportState(s);
    localStorage.setItem("cpb_sport", s);
    if (userId) await supabase.from("profiles").update({ sport: s }).eq("id", userId);
  };

  return { isPremium, loadingPremium, sport, setSport };
}

// Annonce globale (bannière visible par tous les utilisateurs) + statut admin.
// Table `announcements` distincte de kv_store (qui est scopé par utilisateur) : ici on veut
// un message unique lu par tout le monde, publié uniquement par un compte admin (voir
// supabase_announcements.sql pour les policies RLS).
function useAnnouncement(userId) {
  const [announcement, setAnnouncement] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageWellness, setCanManageWellness] = useState(false);
  const [canUseMatchmode, setCanUseMatchmode] = useState(false);

  useEffect(() => {
    supabase.from("announcements").select("id, message").eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data && localStorage.getItem("cpb_announcement_dismissed") !== data.id) {
          setAnnouncement(data);
        }
      });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("is_admin, can_manage_wellness, can_use_matchmode").eq("id", userId).maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data?.is_admin); setCanManageWellness(!!data?.can_manage_wellness); setCanUseMatchmode(!!data?.can_use_matchmode); });
  }, [userId]);

  const dismiss = () => {
    if (announcement) localStorage.setItem("cpb_announcement_dismissed", announcement.id);
    setAnnouncement(null);
  };

  const publish = async (message) => {
    await supabase.from("announcements").update({ active: false }).eq("active", true);
    await supabase.from("announcements").insert({ message, active: true });
  };

  const deactivate = async () => {
    await supabase.from("announcements").update({ active: false }).eq("active", true);
  };

  return { announcement, dismiss, isAdmin, canManageWellness, canUseMatchmode, publish, deactivate };
}

async function startCheckout(priceId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté.");

  // Vérifie si déjà premium pour éviter un double abonnement
  const { data: profile } = await supabase.from("profiles")
    .select("stripe_customer_id, is_premium, premium_until").eq("id", user.id).maybeSingle();

  if (profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()) {
    throw new Error("Tu as déjà un abonnement actif jusqu'au " + new Date(profile.premium_until).toLocaleDateString("fr-FR") + ".");
  }

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId,
      successUrl: window.location.origin + "?premium=success",
      cancelUrl: window.location.origin + "?premium=cancel",
      userId: user.id,
      userEmail: user.email,
      customerId: profile?.stripe_customer_id || null,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // Sauvegarde le customerId s'il est nouveau ou a changé (ex: l'ancien client Stripe a été
  // supprimé côté Stripe et l'API en a recréé un).
  if (data.customerId && data.customerId !== profile?.stripe_customer_id) {
    await supabase.from("profiles").update({ stripe_customer_id: data.customerId }).eq("id", user.id);
  }

  if (data.url) window.location.href = data.url;
  else throw new Error("Erreur lors de la redirection vers le paiement.");
}

async function openBillingPortal() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté.");

  const { data: profile } = await supabase.from("profiles")
    .select("stripe_customer_id").eq("id", user.id).maybeSingle();

  const res = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: profile?.stripe_customer_id,
      userId: user.id,
      returnUrl: window.location.origin,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (data.url) window.location.href = data.url;
  else throw new Error("Impossible d'ouvrir le portail client.");
}

function PaywallModal({ onClose, reason }) {
  const [loading, setLoading] = useState(false);
  const [annual, setAnnual] = useState(false);
  const cpbAlert = useAlert();

  const PRICE_MONTHLY = "price_1Tp8g9LH4wEQmwbloGD8n6cP";
  const PRICE_ANNUAL = "price_1Tp8g8LH4wEQmwblB9CJi7zZ";

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#F2EDE4] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#1B2A4A] px-6 py-5 text-center">
          <div className="text-3xl mb-2">🏀</div>
          <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</div>
          <div className="text-white/60 text-sm mt-1">Version Premium</div>
        </div>
        <div className="px-6 py-5">
          <p className="text-[#1B2A4A] font-medium text-center mb-4">{reason}</p>
          <div className="bg-white rounded-2xl p-4 mb-4 space-y-2">
            {["Exercices illimités", "Séances illimitées", "Play Book complet", "Impression PDF", "Statistiques avancées"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#1B2A4A]">
                <Check size={15} className="text-[#FF6B35] flex-shrink-0" />{f}
              </div>
            ))}
          </div>

          <div className="flex items-center bg-white rounded-xl p-1 mb-4 gap-1">
            <button onClick={() => setAnnual(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${!annual ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/50"}`}>
              Mensuel
            </button>
            <button onClick={() => setAnnual(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${annual ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/50"}`}>
              Annuel
              <span className="absolute -top-2.5 -right-1 bg-[#FF6B35] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-33%</span>
            </button>
          </div>

          <div className="text-center mb-4">
            {annual ? (
              <>
                <span className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>39,99€</span>
                <span className="text-[#1B2A4A]/50 text-sm"> / an</span>
                <div className="text-xs text-[#FF6B35] mt-1 font-medium">soit 3,33€/mois — 2 mois offerts</div>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>4,99€</span>
                <span className="text-[#1B2A4A]/50 text-sm"> / mois</span>
              </>
            )}
          </div>

          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try { await startCheckout(annual ? PRICE_ANNUAL : PRICE_MONTHLY); }
              catch(e) { await cpbAlert(e.message); }
              setLoading(false);
            }}
            className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ fontFamily: "Oswald, sans-serif" }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Chargement...</> : "S'ABONNER MAINTENANT"}
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-[#1B2A4A]/40 mt-3 hover:text-[#1B2A4A]/60">Continuer en version gratuite</button>
        </div>
      </div>
    </div>
  );
}

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getSeason(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "Sans date";
  const y = d.getFullYear(), m = d.getMonth(); // 0-indexed, 7 = août
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function useStore(sport = DEFAULT_SPORT) {
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [themes, setThemes] = useState(SPORTS_CONFIG[sport]?.themes || DEFAULT_THEMES);
  const themesKey = `themes:${sport}`;
  const [formats, setFormats] = useState(SPORTS_CONFIG[sport]?.formats || FORMATS);
  const formatsKey = `formats:${sport}`;
  const [playTypes, setPlayTypes] = useState(PLAY_TYPES);
  const playTypesKey = `playTypes:${sport}`;
  const exercisesKey = `exercises:${sport}`;
  const sessionsKey = `sessions:${sport}`;
  const playsKey = `plays:${sport}`;
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [individualSessions, setIndividualSessions] = useState([]);
  const individualSessionsKey = `individualSessions:${sport}`;
  const [matchSessions, setMatchSessions] = useState([]);
  const matchSessionsKey = `matchSessions:${sport}`;
  // Scouting vidéo (admin) : dépouillement d'un match adverse filmé, en amont d'une rencontre —
  // distinct du Mode match (qui scoute EN DIRECT pendant un match réel). Même mécanique de
  // recherche par temps forts pour retrouver/réutiliser un système déjà noté (pas de re-saisie
  // en texte libre = pas de doublon), et même tally {played, points, possible, ...} pour la
  // rentabilité, mais dans une liste de sessions séparée.
  const [videoScoutSessions, setVideoScoutSessions] = useState([]);
  const videoScoutSessionsKey = `videoScoutSessions:${sport}`;
  // Analyse de mon équipe (admin) : imports Excel (cinq alignés, box score par match).
  const [teamAnalyses, setTeamAnalyses] = useState([]);
  const teamAnalysesKey = `teamAnalyses:${sport}`;
  // Copie locale (localStorage, synchrone) du Mode match — seule donnée de l'app à en avoir
  // une : c'est la seule pensée pour être utilisée en direct, sans connexion, pendant un match.
  const matchSessionsLocalKey = `cpb_local_matchSessions:${sport}`;
  const [matchSyncPending, setMatchSyncPending] = useState(false);
  const matchSyncPendingRef = useRef(false);
  useEffect(() => { matchSyncPendingRef.current = matchSyncPending; }, [matchSyncPending]);
  const [plays, setPlays] = useState([]);
  const [playTags, setPlayTags] = useState([]);
  const [clubLogo, setClubLogo] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // Une coupure réseau (partage de connexion, etc.) PENDANT le chargement initial faisait
  // échouer chaque storage.get() silencieusement (try/catch vide) : l'app affichait alors un
  // catalogue vide comme si tout avait été perdu, alors que les données étaient toujours là
  // côté serveur — le vrai risque étant qu'un enregistrement ultérieur écrase le bon état
  // distant avec cet état local vide. loadError permet d'avertir au lieu de continuer en silence.
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      let hadError = false;
      try { const tm = await storage.get("teams"); if (tm) setTeams(JSON.parse(tm.value)); } catch { hadError = true; }
      try { const at = await storage.get("activeTeamId"); if (at) setActiveTeamId(JSON.parse(at.value)); } catch { hadError = true; }
      try { const pl = await storage.get("players"); setPlayers(pl ? JSON.parse(pl.value) : []); } catch { hadError = true; }
      try { const pt = await storage.get("playTags"); setPlayTags(pt ? JSON.parse(pt.value) : []); } catch { hadError = true; }
      try { const cl = await storage.get("clubLogo"); if (cl) setClubLogo(cl.value); } catch { hadError = true; }
      if (hadError) setLoadError(true);
      setLoaded(true);
    })();
  }, []);

  // Thèmes/exercices/séances/plays chargés séparément, sous une clé propre à chaque sport,
  // pour ne pas mélanger les données basket/foot/etc. d'un coach qui gère plusieurs équipes.
  // Repli sur l'ancienne clé générique (partagée entre tous les sports avant ce correctif) pour
  // TOUS les sports au premier chargement, tant que la clé scopée n'existe pas encore — non
  // destructif, l'ancienne clé n'est jamais supprimée, seulement lue en fallback.
  useEffect(() => {
    (async () => {
      let hadError = false;
      try {
        const th = await storage.get(themesKey);
        if (th) {
          setThemes(JSON.parse(th.value));
        } else if (sport === "basketball") {
          // Compat : les thèmes basket existants étaient stockés sous la clé générique "themes"
          const legacy = await storage.get("themes");
          setThemes(legacy ? JSON.parse(legacy.value) : SPORTS_CONFIG.basketball.themes);
        } else {
          setThemes(SPORTS_CONFIG[sport]?.themes || []);
        }
      } catch { hadError = true; }
      try {
        const fm = await storage.get(formatsKey);
        setFormats(fm ? JSON.parse(fm.value) : (SPORTS_CONFIG[sport]?.formats || FORMATS));
      } catch { hadError = true; }
      try {
        const pt = await storage.get(playTypesKey);
        setPlayTypes(pt ? JSON.parse(pt.value) : PLAY_TYPES);
      } catch { hadError = true; }
      try {
        let ex = await storage.get(exercisesKey);
        if (!ex) { const legacy = await storage.get("exercises"); if (legacy) ex = legacy; }
        const list = ex ? JSON.parse(ex.value) : [];
        setExercises(list.map(e => e.hasFile ? { ...e, file: { name: e.fileName, type: e.fileType, data: null } } : e));
      } catch { hadError = true; }
      try {
        let se = await storage.get(sessionsKey);
        if (!se) { const legacy = await storage.get("sessions"); if (legacy) se = legacy; }
        setSessions(se ? JSON.parse(se.value) : []);
      } catch { hadError = true; }
      try {
        let pb = await storage.get(playsKey);
        if (!pb) { const legacy = await storage.get("plays"); if (legacy) pb = legacy; }
        setPlays(pb ? JSON.parse(pb.value) : []);
      } catch { hadError = true; }
      try {
        const is = await storage.get(individualSessionsKey);
        setIndividualSessions(is ? JSON.parse(is.value) : []);
      } catch { hadError = true; }
      try {
        const ms = await storage.get(matchSessionsKey);
        setMatchSessions(ms ? JSON.parse(ms.value) : []);
      } catch {
        // Repli hors-ligne : si une copie locale pas encore synchronisée existe (match en
        // cours saisi sans connexion), on l'utilise plutôt que de bloquer tout le chargement —
        // permet de rouvrir l'app sans réseau et de continuer un match déjà commencé.
        try {
          const cached = localStorage.getItem(matchSessionsLocalKey);
          if (cached) { setMatchSessions(JSON.parse(cached)); setMatchSyncPending(true); }
          else hadError = true;
        } catch { hadError = true; }
      }
      try {
        const vs = await storage.get(videoScoutSessionsKey);
        setVideoScoutSessions(vs ? JSON.parse(vs.value) : []);
      } catch { hadError = true; }
      try {
        const ta = await storage.get(teamAnalysesKey);
        setTeamAnalyses(ta ? JSON.parse(ta.value) : []);
      } catch { hadError = true; }
      if (hadError) setLoadError(true);
      setLoaded(true);
    })();
  }, [sport]);

  const persistAlert = useAlert();
  // Mémorise la dernière valeur écrite par clé — l'autosave (toutes les 30s) appelle persist()
  // même quand rien n'a changé, ce qui gonflait kv_store_history d'un instantané quasi identique
  // à chaque tick (320 Mo constatés). On n'écrit (et on ne snapshotte) que si ça a vraiment changé.
  const lastPersistedRef = useRef({});
  const persist = useCallback(async (key, value) => {
    if (lastPersistedRef.current[key] === value) return;
    const attempt = async () => {
      const r = await storage.set(key, value);
      if (!r) throw new Error("Storage set returned null for " + key);
    };
    let succeeded = false;
    try {
      await attempt();
      succeeded = true;
    } catch (e) {
      console.error("Storage error", key, e);
      // Une coupure réseau (partage de connexion perdu, etc.) peut faire échouer
      // l'enregistrement silencieusement — une tentative de retry, puis on prévient
      // clairement l'utilisateur plutôt que de perdre sa modification sans le dire.
      try {
        await attempt();
        succeeded = true;
      } catch (e2) {
        console.error("Storage retry failed", key, e2);
        persistAlert?.("⚠️ Échec de l'enregistrement (connexion perdue). Vérifie ta connexion internet et refais la modification si besoin — sinon elle risque de ne pas être sauvegardée.");
      }
    }
    // Le cache n'est mis à jour qu'après un succès confirmé, pour que l'échec continue d'être
    // retenté au prochain tick (30s) au lieu d'être oublié parce que la valeur "n'a pas changé".
    if (succeeded) {
      lastPersistedRef.current[key] = value;
      storage.snapshot(key, value).catch(() => {});
    }
  }, [persistAlert]);

  // Bug corrigé le 20/07/2026 : la plupart des exercices en mémoire ne portent PAS `file`/
  // `schemas` (chargés en lazy uniquement à l'affichage, jamais reversés dans l'état partagé
  // `exercises`) — seuls ceux tout juste créés/édités dans cette session les ont. Écraser
  // hasFile/fileName/fileType/schemaCount à chaque saveExercises() effaçait donc le "pointeur"
  // vers la photo/les schémas de TOUS les autres exercices (les visuels restaient bien en base
  // sous file:{id}/schemas:{id}, mais devenaient invisibles car plus jamais chargés).
  // `file`/`schemas` undefined (clé absente) = pas de nouvelle donnée, on garde l'existant ;
  // `null` explicite = l'utilisateur a bien retiré la photo/les schémas, on efface pour de vrai.
  const stripFiles = (list) => list.map(({ file, schemas, ...rest }) => ({
    ...rest,
    hasFile: file !== undefined ? !!file : rest.hasFile,
    fileName: file !== undefined ? file?.name : rest.fileName,
    fileType: file !== undefined ? file?.type : rest.fileType,
    schemaCount: schemas !== undefined ? (schemas?.length || 0) : rest.schemaCount,
  }));

  const saveExercises = async (next) => {
    setExercises(next);
    for (const ex of next) {
      if (ex.file && ex.file.data) {
        try { await storage.set(`file:${ex.id}`, JSON.stringify(ex.file)); } catch (e) { console.error("File store failed", ex.id, e); }
      }
      if (ex.schemas?.length) {
        try { await storage.set(`schemas:${ex.id}`, JSON.stringify(ex.schemas)); } catch (e) { console.error("Schemas store failed", ex.id, e); }
      }
    }
    persist(exercisesKey, JSON.stringify(stripFiles(next)));
  };
  const saveSessions = (next) => { setSessions(next); persist(sessionsKey, JSON.stringify(next)); };
  const saveThemes = (next) => { setThemes(next); persist(themesKey, JSON.stringify(next)); };
  const saveFormats = (next) => { setFormats(next); persist(formatsKey, JSON.stringify(next)); };
  const savePlayTypes = (next) => { setPlayTypes(next); persist(playTypesKey, JSON.stringify(next)); };
  const saveTeams = (next) => { setTeams(next); persist("teams", JSON.stringify(next)); };
  const saveActiveTeamId = (next) => { setActiveTeamId(next); persist("activeTeamId", JSON.stringify(next)); };
  const savePlayers = (next) => { setPlayers(next); persist("players", JSON.stringify(next)); };
  const saveIndividualSessions = (next) => { setIndividualSessions(next); persist(individualSessionsKey, JSON.stringify(next)); };
  // Le Mode match a besoin de continuer à fonctionner sans connexion (gymnase sans réseau,
  // coupure en cours de match) : contrairement à persist() utilisé pour le reste de l'app,
  // aucune alerte bloquante à chaque échec — juste une resynchronisation silencieuse en fond
  // dès que la connexion revient, avec un indicateur discret côté écran de saisie.
  const matchSessionsRef = useRef(matchSessions);
  useEffect(() => { matchSessionsRef.current = matchSessions; }, [matchSessions]);
  const trySyncMatchSessions = useCallback(async (data) => {
    try {
      const r = await storage.set(matchSessionsKey, JSON.stringify(data));
      if (!r) throw new Error("Storage set returned null for " + matchSessionsKey);
      setMatchSyncPending(false);
      storage.snapshot(matchSessionsKey, JSON.stringify(data)).catch(() => {});
      return true;
    } catch (e) {
      console.error("Match sync failed, will retry", e);
      setMatchSyncPending(true);
      return false;
    }
  }, [matchSessionsKey]);
  // Retente toutes les 10s tant qu'une écriture est en attente, et immédiatement dès que le
  // navigateur signale le retour du réseau ("online").
  useEffect(() => {
    if (!matchSyncPending) return;
    const retry = () => { if (matchSyncPendingRef.current) trySyncMatchSessions(matchSessionsRef.current); };
    const id = setInterval(retry, 10000);
    window.addEventListener("online", retry);
    return () => { clearInterval(id); window.removeEventListener("online", retry); };
  }, [matchSyncPending, trySyncMatchSessions]);
  const saveMatchSessions = (next) => {
    setMatchSessions(next);
    try { localStorage.setItem(matchSessionsLocalKey, JSON.stringify(next)); } catch {}
    trySyncMatchSessions(next);
  };
  const saveVideoScoutSessions = (next) => { setVideoScoutSessions(next); persist(videoScoutSessionsKey, JSON.stringify(next)); };
  const saveTeamAnalyses = (next) => { setTeamAnalyses(next); persist(teamAnalysesKey, JSON.stringify(next)); };
  const savePlays = async (next) => {
    for (const play of next) {
      for (const img of play.images || []) {
        if (img.file?.data) {
          try { await storage.set(`playimg:${play.id}:${img.id}`, JSON.stringify(img.file)); } catch {}
        }
      }
    }
    const stripped = next.map(play => ({
      ...play,
      images: (play.images || []).map((img) => {
        const { file, ...imgRest } = img;
        if (!file) return imgRest; // existing image: keep hasFile/fileName/fileType intact
        return { ...imgRest, hasFile: true, fileName: file.name, fileType: file.type };
      }),
    }));
    // Enrichir next avec fileType/fileName/hasFile pour que l'affichage immédiat fonctionne
    const nextWithMeta = next.map(play => ({
      ...play,
      images: (play.images || []).map(img => ({
        ...img,
        fileType: img.fileType || img.file?.type,
        fileName: img.fileName || img.file?.name,
        hasFile: img.hasFile || !!img.file?.data,
      })),
    }));
    setPlays(nextWithMeta);
    persist(playsKey, JSON.stringify(stripped));
  };
  const savePlayTags = (next) => { setPlayTags(next); persist("playTags", JSON.stringify(next)); };
  const saveClubLogo = async (dataUrl) => { setClubLogo(dataUrl); if (dataUrl) await storage.set("clubLogo", dataUrl); else await storage.delete("clubLogo"); };

  return { exercises, sessions, themes, formats, playTypes, teams, activeTeamId, players, individualSessions, matchSessions, videoScoutSessions, teamAnalyses, plays, playTags, clubLogo, saveExercises, saveSessions, saveThemes, saveFormats, savePlayTypes, saveTeams, saveActiveTeamId, savePlayers, saveIndividualSessions, saveMatchSessions, saveVideoScoutSessions, saveTeamAnalyses, savePlays, savePlayTags, saveClubLogo, loaded, loadError, matchSyncPending, persist };
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

function readImageAsJpeg(file, maxDim = 1200, quality = 0.72) {
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
        // Si encore trop lourd, réduire la qualité progressivement
        let result = canvas.toDataURL("image/jpeg", quality);
        if (result.length > 600000) result = canvas.toDataURL("image/jpeg", 0.6);
        if (result.length > 400000) result = canvas.toDataURL("image/jpeg", 0.5);
        resolve(result);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Comme readImageAsJpeg, mais en PNG (sans perte, transparence conservée) — utilisé pour le
// logo du club : la plupart des logos sont des PNG à fond transparent, et les convertir en JPEG
// remplissait le fond transparent en noir (JPEG n'a pas de canal alpha).
function readImageAsPng(file, maxDim = 400) {
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
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = (text || "").split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/\s*\S*$/, "…");
  shown.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return shown.length;
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Compose une image "prête à publier" (photo/schéma + titre + logo) pour Instagram/Facebook,
// en réutilisant le canvas plutôt qu'un rendu serveur — pas d'aller-retour réseau nécessaire.
async function composeSocialImage({ photoDataUrl, title, subtitle, caption, format = "post" }) {
  const W = 1080;
  const H = format === "story" ? 1920 : 1080;
  // Le bandeau grandit un peu quand il y a une annotation à afficher (temps fort du play,
  // vignette par vignette) pour ne pas la faire chevaucher le titre/logo.
  const bandH = format === "story" ? (caption ? 480 : 380) : (caption ? 340 : 260);
  const pad = 48;
  const photoAreaH = H - bandH;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#F2EDE4";
  ctx.fillRect(0, 0, W, H);

  try {
    await document.fonts.load("800 52px Oswald");
    await document.fonts.load("600 30px Oswald");
    await document.fonts.load("italic 500 26px Inter");
  } catch {}

  const [photo, logo] = await Promise.all([
    photoDataUrl ? loadImageEl(photoDataUrl).catch(() => null) : Promise.resolve(null),
    loadImageEl("/logo%20détouré.png").catch(() => null),
  ]);

  const cardX = pad, cardY = pad, cardW = W - pad * 2, cardH = photoAreaH - pad * 1.5;
  ctx.save();
  ctx.shadowColor = "rgba(27,42,74,0.18)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  if (photo) {
    const innerPad = 28;
    const ix = cardX + innerPad, iy = cardY + innerPad, iw = cardW - innerPad * 2, ih = cardH - innerPad * 2;
    const scale = Math.min(iw / photo.width, ih / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    const dx = ix + (iw - dw) / 2, dy = iy + (ih - dh) / 2;
    ctx.save();
    roundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.clip();
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.restore();
  }

  ctx.fillStyle = "#1B2A4A";
  ctx.fillRect(0, photoAreaH, W, bandH);
  ctx.fillStyle = "#FF6B35";
  ctx.fillRect(0, photoAreaH, W, 6);

  const logoSize = 84;
  if (logo) ctx.drawImage(logo, W - pad - logoSize, photoAreaH + bandH - logoSize - 34, logoSize, logoSize);

  ctx.textBaseline = "top";
  const textMaxWidth = W - pad * 2 - logoSize - 24;
  let cursorY = photoAreaH + 36;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 52px Oswald, sans-serif";
  const titleLines = wrapCanvasText(ctx, (title || "").toUpperCase(), pad, cursorY, textMaxWidth, 58, 2);
  cursorY += titleLines * 58 + 14;

  if (subtitle) {
    ctx.fillStyle = "#FF6B35";
    ctx.font = "600 28px Oswald, sans-serif";
    ctx.fillText(subtitle.toUpperCase(), pad, cursorY);
    cursorY += 42;
  }

  if (caption) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "italic 500 26px Inter, sans-serif";
    wrapCanvasText(ctx, caption, pad, cursorY, textMaxWidth, 32, 2);
  }

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Export "Mode match" : score final, systèmes joués et leur rentabilité (points/possession)
// triés par fréquence, détail tirs ouverts/contestés, et quelques graphiques en SVG inline
// (pas de dépendance externe : le fichier exporté doit rester autonome).
function buildMatchReportHtml(match, rows, scoreInfo, fourFactorsHtml) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const homeAwayLabel = match.homeAway === "exterieur" ? "Extérieur" : match.homeAway === "domicile" ? "Domicile" : "";
  const title = match.homeAway === "exterieur" ? `${match.scoutedTeam} vs ${match.ourTeam || "Nous"}` : `${match.ourTeam || "Nous"} vs ${match.scoutedTeam}`;
  const dateStr = match.date ? new Date(match.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td class="rank">${i + 1}</td>
      <td class="titre">${esc(r.titre)}${r.tempsFort?.length ? `<div class="tf">${r.tempsFort.map(esc).join(", ")}</div>` : ""}</td>
      <td class="num">${r.played}</td>
      <td class="num">${r.points}${r.possible > 0 ? ` / ${r.possible}` : ""}</td>
      <td class="num ppp">${r.played > 0 ? (r.points / r.played).toFixed(2) : "—"}</td>
      <td class="num miss">${r.openMisses || 0}</td>
      <td class="num miss">${r.contestedMisses || 0}</td>
    </tr>`).join("");

  // Graphique 1 : points marqués par système (barres horizontales, les 8 plus utilisés).
  const barRows = rows.slice(0, 8);
  const maxPoints = Math.max(1, ...barRows.map(r => r.points));
  const barChartHtml = barRows.length === 0 ? "" : `
    <div class="chart-block">
      <div class="chart-title">Points marqués par système</div>
      ${barRows.map(r => `
        <div class="bar-row">
          <div class="bar-label">${esc(r.titre)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((r.points / maxPoints) * 100)}%"></div></div>
          <div class="bar-value">${r.points} pt${r.points !== 1 ? "s" : ""}</div>
        </div>`).join("")}
    </div>`;

  // Graphique 2 : répartition tirs ouverts / contestés (barre empilée simple).
  const totalOpen = rows.reduce((s, r) => s + (r.openMisses || 0), 0);
  const totalContested = rows.reduce((s, r) => s + (r.contestedMisses || 0), 0);
  const totalMisses = totalOpen + totalContested;
  const missChartHtml = totalMisses === 0 ? "" : `
    <div class="chart-block">
      <div class="chart-title">Tirs manqués à 2/3 pts : ouverts vs contestés</div>
      <div class="stack-track">
        <div class="stack-open" style="width:${Math.round((totalOpen / totalMisses) * 100)}%"></div>
        <div class="stack-contested" style="width:${Math.round((totalContested / totalMisses) * 100)}%"></div>
      </div>
      <div class="stack-legend">
        <span><i class="dot dot-open"></i> Ouverts : ${totalOpen}</span>
        <span><i class="dot dot-contested"></i> Contestés : ${totalContested}</span>
      </div>
    </div>`;

  const scoreHtml = !scoreInfo ? "" : `
    <div class="scoreboard">
      <div class="score-side"><div class="score-name">${esc(scoreInfo.homeLabel || "Locaux")} · ${esc(scoreInfo.homeTeamName || "?")}</div><div class="score-value">${scoreInfo.scoreHome ?? 0}</div></div>
      <div class="score-sep">—</div>
      <div class="score-side"><div class="score-name">${esc(scoreInfo.awayLabel || "Visiteurs")} · ${esc(scoreInfo.awayTeamName || "?")}</div><div class="score-value">${scoreInfo.scoreAway ?? 0}</div></div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(title)} — Rapport Mode match</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#F2EDE4;color:#1B2A4A;padding:24px}
  .card{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .header{background:#1B2A4A;color:#fff;padding:24px}
  .header h1{font-family:'Oswald',sans-serif;font-size:24px;letter-spacing:.3px}
  .header .meta{color:rgba(255,255,255,.65);font-size:13px;margin-top:6px;text-transform:capitalize}
  .scoreboard{display:flex;align-items:center;justify-content:center;gap:28px;padding:20px 16px;border-bottom:1px solid #1B2A4A0f}
  .score-side{text-align:center}
  .score-name{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:#1B2A4A80;margin-bottom:4px}
  .score-value{font-family:'Oswald',sans-serif;font-size:34px;font-weight:700}
  .score-sep{font-size:20px;color:#1B2A4A30;font-weight:700}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1B2A4A80;padding:10px 16px;border-bottom:2px solid #1B2A4A15}
  th.num,td.num{text-align:center}
  td{padding:10px 16px;border-bottom:1px solid #1B2A4A0f;font-size:14px;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .rank{font-family:'Oswald',sans-serif;font-weight:700;color:#FF6B35;width:28px}
  .titre{font-weight:600}
  .tf{font-size:11px;color:#1B2A4A60;margin-top:2px;font-weight:400}
  .ppp{font-weight:700}
  .miss{color:#1B2A4A80;font-size:13px}
  .empty{padding:24px;text-align:center;color:#1B2A4A60;font-size:13px}
  .ff{padding:16px 16px 20px}
  .chart-block{padding:18px 20px;border-top:1px solid #1B2A4A0f}
  .chart-title{font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:#1B2A4A80;font-weight:600;margin-bottom:12px}
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .bar-label{width:150px;font-size:12px;font-weight:600;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar-track{flex:1;background:#1B2A4A0d;border-radius:5px;height:14px;overflow:hidden}
  .bar-fill{background:#FF6B35;height:100%;border-radius:5px}
  .bar-value{width:52px;flex-shrink:0;font-size:12px;font-weight:700;text-align:right}
  .stack-track{display:flex;height:20px;border-radius:6px;overflow:hidden;background:#1B2A4A0d}
  .stack-open{background:#22c55e}
  .stack-contested{background:#ef4444}
  .stack-legend{display:flex;gap:18px;margin-top:10px;font-size:12px;color:#1B2A4A}
  .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
  .dot-open{background:#22c55e}
  .dot-contested{background:#ef4444}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${esc(title)}</h1>
      <div class="meta">${esc(dateStr)}${match.time ? ` · ${esc(match.time)}` : ""}${match.championnat ? ` · ${esc(match.championnat)}` : ""}${homeAwayLabel ? ` · ${esc(homeAwayLabel)}` : ""}</div>
    </div>
    ${scoreHtml}
    ${rows.length === 0 ? `<div class="empty">Aucun système comptabilisé pour ce match.</div>` : `
    <table>
      <thead><tr><th></th><th>Système</th><th class="num">Joué</th><th class="num">Points</th><th class="num">Pts/possession</th><th class="num">Tirs ouverts</th><th class="num">Tirs contestés</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`}
    ${barChartHtml}
    ${missChartHtml}
    ${fourFactorsHtml ? `<div class="ff">${fourFactorsHtml}</div>` : ""}
  </div>
</body>
</html>`;
}

// Export "Scouting vidéo" : récap présentable pour le staff — équipe observée, défenses
// vues, notes libres, et le classement des systèmes avec leur rentabilité (même mécanique
// que buildMatchReportHtml, sans le tableau de score qui n'a pas de sens hors match réel).
// Repère de version affiché en bas de l'export (à faire évoluer à chaque refonte du rapport).
const VIDEO_SCOUT_REPORT_VERSION = "2026-10-06-g";
// Feuille de style commune aux récaps (scouting vidéo, analyse de mon équipe).
const SCOUT_REPORT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#F2EDE4;color:#1B2A4A;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
  .hero{background:linear-gradient(135deg,#1B2A4A 0%,#243a66 100%);color:#fff;border-radius:18px;padding:28px;position:relative;overflow:hidden}
  .hero:after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:#FF6B35;opacity:.14}
  .hero-logo{width:48px;height:48px;object-fit:contain;border-radius:10px;background:#fff;padding:5px;margin-bottom:14px;position:relative}
  .kicker{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#FF6B35;font-weight:700;margin-bottom:6px;position:relative}
  .hero h1{font-family:'Oswald',sans-serif;font-size:38px;line-height:1.05;letter-spacing:.5px;text-transform:uppercase;position:relative}
  .hero .meta{color:rgba(255,255,255,.65);font-size:13px;margin-top:8px;text-transform:capitalize;position:relative}
  .kpis{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;position:relative}
  .kpi{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px 16px;min-width:120px;flex:1}
  .kpi b{display:block;font-family:'Oswald',sans-serif;font-size:28px;line-height:1}
  .kpi span{display:block;font-size:11px;color:rgba(255,255,255,.6);margin-top:5px;text-transform:uppercase;letter-spacing:.5px}
  .card{background:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 2px 12px rgba(27,42,74,.06)}
  .card h2{font-family:'Oswald',sans-serif;font-size:17px;letter-spacing:.6px;text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:10px}
  .card h2 i{display:inline-block;width:5px;height:20px;border-radius:3px;background:#FF6B35}
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .chip{font-size:12px;font-weight:600;padding:4px 11px;border-radius:20px;background:#1B2A4A12;color:#1B2A4A}
  .chip-int{background:#FF6B35;color:#fff}
  .rank-row{display:grid;grid-template-columns:34px 1fr 62px auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .rank-row:first-of-type{border-top:none}
  .atk-name{font-family:'Oswald',sans-serif;font-size:15px;font-weight:700;letter-spacing:.3px;margin-bottom:6px}
  .atk-name-inline{font-family:'Oswald',sans-serif;font-weight:700;font-size:13px;margin-right:4px}
  .cat-block{margin-top:6px}
  .cat-block + .cat-block{margin-top:22px}
  .cat-title{font-family:'Oswald',sans-serif;font-size:14px;letter-spacing:.8px;text-transform:uppercase;color:#fff;background:#1B2A4A;border-radius:8px;padding:8px 14px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:baseline}
  .cat-title span{font-family:'Inter',sans-serif;font-size:11px;letter-spacing:0;text-transform:none;color:rgba(255,255,255,.65)}
  .mini-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .mini-row .chips{flex:1}
  .mini-count{font-family:'Oswald',sans-serif;font-weight:700;font-size:15px;min-width:34px;text-align:right}
  .rank-n{font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;color:#1B2A4A40;text-align:center}
  .rank-top{color:#FF6B35}
  .bar{height:8px;background:#1B2A4A0d;border-radius:5px;margin-top:9px;overflow:hidden}
  .bar div{height:100%;border-radius:5px;background:linear-gradient(90deg,#FF6B35,#ff9a6b)}
  .rank-side{text-align:right}
  .rank-count{font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;line-height:1}
  .rank-count small{font-size:13px;color:#1B2A4A80;margin-left:1px}
  .rank-share{font-size:11px;color:#1B2A4A80;margin-top:3px}
  .ppp{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-width:64px;padding:6px 10px;border-radius:10px;font-family:'Oswald',sans-serif;font-size:17px;font-weight:700;line-height:1}
  .ppp small{font-family:'Inter',sans-serif;font-size:8.5px;font-weight:600;letter-spacing:.3px;margin-top:3px;text-transform:uppercase;opacity:.8}
  .ppp-good{background:#22c55e22;color:#15803d}.ppp-mid{background:#eab30826;color:#a16207}.ppp-low{background:#ef444422;color:#b91c1c}.ppp-na{background:#1B2A4A0d;color:#1B2A4A80}
  .donut-wrap{display:flex;align-items:center;gap:26px;flex-wrap:wrap}
  .donut{flex-shrink:0}
  .donut-n{font-family:'Oswald',sans-serif;font-size:30px;font-weight:700;fill:#1B2A4A}
  .donut-l{font-size:10px;fill:#1B2A4A80;text-transform:uppercase;letter-spacing:.6px}
  .legend{flex:1;min-width:230px;display:flex;flex-direction:column;gap:9px}
  .legend-row{display:flex;align-items:center;gap:10px;font-size:13px}
  .legend-row i{width:12px;height:12px;border-radius:4px;flex-shrink:0}
  .legend-name{flex:1;font-weight:600}
  .legend-val{font-weight:700;margin-right:6px}
  .legend-val small{font-weight:400;color:#1B2A4A80}
  .detail{padding:16px 0;border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .detail:first-of-type{border-top:none;padding-top:0}
  .detail-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .detail-pure{display:flex;align-items:center;gap:8px}
  .detail-pure span{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#1B2A4A80;font-weight:600}
  .detail-pure em{font-style:normal;font-family:'Oswald',sans-serif;font-weight:700;font-size:16px}
  .def-block{padding:14px 0;border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .def-block:first-of-type{border-top:none}
  .def-block .sub-title{margin-top:0}
  .int-row{display:flex;align-items:center;gap:12px;margin-top:8px}
  .stack{flex:1;display:flex;height:12px;border-radius:6px;overflow:hidden;background:#1B2A4A0d}
  .int-top{font-size:12px;font-weight:700;min-width:170px;text-align:right}
  .int-top small{font-weight:400;color:#1B2A4A80}
  .sub-title{font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:#FF6B35;margin:16px 0 6px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#1B2A4A80;padding:6px 8px;border-bottom:2px solid #1B2A4A15}
  th.num,td.num{text-align:center}
  td{padding:9px 8px;border-bottom:1px solid #1B2A4A0f;font-size:13px;vertical-align:middle}
  .rk{font-family:'Oswald',sans-serif;font-weight:700;color:#FF6B35;width:26px}
  .tt{font-weight:600}
  .tf{font-size:11px;color:#1B2A4A60;margin-top:2px;font-weight:400}
  .stamp{text-align:center;font-size:10px;color:#1B2A4A55;padding:4px 0 12px}
  .hint{font-size:12px;color:#1B2A4A80;margin:-8px 0 8px}
  .more{font-size:12px;color:#1B2A4A80;margin-top:8px}
  .notes-text{font-size:13.5px;line-height:1.65}
  .alt-int{font-size:11.5px;color:#1B2A4A99;margin-top:6px;line-height:1.45}
  .alt-int b{color:#1B2A4A}
  .pb-row{border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .pb-row:first-of-type{border-top:none}
  .pb-row .rank-row{border-top:none}
  .pb-imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 0 14px 48px}
  .pb-imgs img{width:100%;height:150px;object-fit:contain;background:#fff;border:1px solid #1B2A4A14;border-radius:8px}
  @media (max-width:600px){.pb-imgs{padding-left:0;grid-template-columns:repeat(2,1fr)}}
  .bs-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
  .bs-kpi{background:#1B2A4A08;border-radius:10px;padding:10px 12px}
  .bs-kpi b{display:block;font-family:'Oswald',sans-serif;font-size:21px;line-height:1.1}
  .bs-kpi span{display:block;font-size:10px;color:#1B2A4A80;text-transform:uppercase;letter-spacing:.4px;margin-top:3px}
  .bs-ins{list-style:none;display:flex;flex-direction:column;gap:7px;margin:4px 0 14px}
  .bs-ins li{font-size:13px;line-height:1.5;padding-left:16px;position:relative}
  .bs-ins li:before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;border-radius:50%;background:#FF6B35}
  .bs-table{overflow-x:auto}
  .bs-res{display:inline-block;width:18px;height:18px;line-height:18px;border-radius:5px;font-size:10px;font-weight:700;color:#fff;background:#64748b;text-align:center}
  .bs-w{background:#22c55e}.bs-l{background:#ef4444}
  .bs-act{display:grid;grid-template-columns:170px 1fr 56px 120px;gap:10px;align-items:center;padding:5px 0;font-size:12.5px}
  .bs-act .bar{margin-top:0}
  .bs-act-l{font-weight:600}
  .bs-act-n{font-family:'Oswald',sans-serif;font-weight:700;font-size:15px;text-align:right}
  .bs-act-n small{font-family:'Inter',sans-serif;font-size:10px;font-weight:400;color:#1B2A4A80}
  .bs-act-p{font-size:12px;font-weight:600;text-align:right;padding:3px 8px;border-radius:7px;background:#1B2A4A0a}
  .bs-good{background:#22c55e22;color:#15803d}.bs-low{background:#ef444422;color:#b91c1c}
  .bs-ff td,.bs-ff th{padding:7px 8px}
  .cmp td,.cmp th{padding:7px 10px}
  .cmp td.num{width:28%;font-weight:600}
  .cmp-win{background:#22c55e1f;color:#15803d;font-weight:700!important}
  .cmp-them{background:#ef44441a;color:#b91c1c}
  @media (max-width:600px){.bs-kpis{grid-template-columns:repeat(2,1fr)}.bs-act{grid-template-columns:110px 1fr 46px 96px}}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none;border:1px solid #1B2A4A14}.hero{border-radius:12px}}
`;
function buildVideoScoutReportHtml(session, rows, typeOrder = [], logo = null, teamPlays = null) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const dateStr = session.date ? new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const PALETTE = ["#FF6B35", "#2563EB", "#22c55e", "#a855f7", "#eab308", "#14b8a6", "#ef4444", "#64748b"];
  const pct = (n, tot) => tot ? Math.round((n / tot) * 100) : 0;
  // Badge de rentabilité : vert ≥ 1,2 pt/poss., orange ≥ 0,9, rouge en dessous.
  const pppBadge = (ppp) => ppp === null || ppp === undefined
    ? `<span class="ppp ppp-na">—</span>`
    : `<span class="ppp ${ppp >= 1.2 ? "ppp-good" : ppp >= 0.9 ? "ppp-mid" : "ppp-low"}">${ppp.toFixed(2)}<small>pts/poss.</small></span>`;

  // Camembert (donut) en SVG pur : un arc par part, total au centre.
  const donut = (items, size = 150, centerLabel = "poss.") => {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total === 0) return "";
    const r = 52, C = 2 * Math.PI * r;
    let offset = 0;
    const arcs = items.map(i => {
      const len = (i.value / total) * C;
      const arc = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${i.color}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" />`;
      offset += len; return arc;
    }).join("");
    return `<svg viewBox="0 0 140 140" width="${size}" height="${size}" class="donut"><g transform="rotate(-90 70 70)">${arcs}</g>
      <text x="70" y="68" text-anchor="middle" class="donut-n">${total}</text><text x="70" y="86" text-anchor="middle" class="donut-l">${esc(centerLabel)}</text></svg>`;
  };
  const legend = (items, total) => `<div class="legend">${items.map(i => `
      <div class="legend-row"><i style="background:${i.color}"></i><span class="legend-name">${esc(i.label)}</span>
      <span class="legend-val">${i.value}<small> · ${pct(i.value, total)}%</small></span>${i.ppp !== undefined ? pppBadge(i.ppp) : ""}</div>`).join("")}</div>`;
  const chips = (a) => a.labels.map(l => {
    const grp = typeof l === "string" ? "" : (l.group || "");
    return `<span class="chip ${/intention/i.test(grp) ? "chip-int" : ""}">${esc(attackLabelText(l))}</span>`;
  }).join("");

  // ── Attaques importées de Sportscode ───────────────────────────────────────
  const allMerged = mergeAttacksForDisplay(session.attacks || []);
  // Une attaque décrite uniquement par une intention (ex. SIDE41) n'est pas un système : écartée.
  // Idem pour une simple remise en jeu (SLOB / BLOB seul, éventuellement avec une intention) :
  // sans entrée taguée, ce n'est pas un système à classer.
  const isIntentionOnly = (a) => a.labels.every(l => typeof l !== "string"
    && (/intention|touche/i.test(l.group || "") || /^(slob|blob)$/i.test(l.text)));
  const attacks = allMerged.filter(a => !isIntentionOnly(a)).sort((a, b) => b.count - a.count);
  const skippedIntentionOnly = allMerged.filter(isIntentionOnly).reduce((n, a) => n + a.count, 0);
  const entryCount = (a) => new Set(a.labels.filter(l => typeof l !== "string" && /entr[ée]e/i.test(l.group || "")).map(l => l.text.toLowerCase())).size;
  const totalPoss = attacks.reduce((s, a) => s + a.count, 0);
  const atkStats = attacks.map(a => ({ a, st: attackStats(a) }));
  // Plays du Playbook de l'équipe reliés aux attaques : une attaque sans nom prend celui du play.
  const playRank = teamPlays ? matchPlaysToAttacks(teamPlays, attacks, session.tally || {}) : null;
  if (playRank) playRank.forEach(r => r.groups.forEach(g => { if (!g.name) g.name = r.play.titre; }));
  const seenPlays = playRank ? playRank.filter(r => r.count > 0) : [];
  const unseenPlays = playRank ? playRank.filter(r => r.count === 0) : [];
  const pbTotal = seenPlays.reduce((n, r) => n + r.count, 0);
  // Intentions secondaires (la principale est déjà en pastille) et ordres d'entrées différents.
  const altInts = (a) => {
    const parts = [];
    if ((a.otherIntentions || []).length) parts.push("Autres intentions vues : " + a.otherIntentions.map(i => `${esc(i.text)} <b>${i.count}×</b>`).join(", "));
    if (a.mainIntention && (a.otherIntentions || []).length) parts.unshift(`${esc(a.mainIntention.text)} ${a.mainIntention.count}×`);
    if ((a.orderVariants || 0) > 1) parts.push(`entrées vues dans ${a.orderVariants} ordres (le plus joué affiché)`);
    return parts.length ? `<div class="alt-int">${parts.join(" · ")}</div>` : "";
  };
  const totalPoints = atkStats.reduce((s, x) => s + x.st.points, 0);
  const totalResolved = atkStats.reduce((s, x) => s + x.st.resolved, 0);
  const globalPpp = totalResolved ? totalPoints / totalResolved : null;
  // Part des possessions taguées sans résultat (= pertes de balle), pour le contrôle avec le box score.
  const totalZero = attacks.reduce((s, a) => s + [...(a.xmlOutcomes || []), ...(a.outcomes || [])].slice(0, a.count).filter(v => v === 0).length, 0);
  const boxHtml = boxScoreReportHtml(session.boxScore, session.opponent, { ppp: globalPpp, tovRate: totalResolved ? totalZero / totalResolved : null });

  // Défenses rencontrées, toutes attaques confondues
  // Défenses adverses rencontrées, par famille (ÉCRANS, DÉFENSE COLLECTIVE, ÉCRANS NON PORTEUR...)
  const defFamilies = new Map();
  attacks.forEach(a => (a.byDefense || []).forEach(d => {
    const fam = d.group || "Défense", ds = defenseStats(d);
    const m = defFamilies.get(fam) || new Map();
    const e = m.get(d.label.toLowerCase()) || { label: d.label, count: 0, points: 0 };
    e.count += ds.count; e.points += ds.points; m.set(d.label.toLowerCase(), e); defFamilies.set(fam, m);
  }));
  const familyItems = [...defFamilies.entries()].map(([fam, m]) => ({
    fam,
    items: [...m.values()].sort((x, y) => y.count - x.count).map((e, i) => ({ label: e.label, value: e.count, color: PALETTE[i % PALETTE.length], ppp: e.count ? e.points / e.count : null })),
  }));
  const defItems = familyItems.flatMap(f => f.items);

  const kpis = attacks.length === 0 ? "" : `
    <div class="kpis">
      <div class="kpi"><b>${totalPoss}</b><span>possessions</span></div>
      <div class="kpi"><b>${attacks.length}</b><span>attaques distinctes</span></div>
      <div class="kpi"><b>${globalPpp === null ? "—" : globalPpp.toFixed(2)}</b><span>pts / possession</span></div>
      ${defItems.length ? `<div class="kpi"><b>${defItems.length}</b><span>défenses rencontrées</span></div>` : ""}
      ${seenPlays.length ? `<div class="kpi"><b>${seenPlays.length}</b><span>systèmes du playbook vus</span></div>` : ""}
    </div>`;

  // Classement par catégorie : TRANSITION (phase de jeu transi pick / post up / jeu rapide...),
  // SLOB, BLOB, et ATTAQUE PLACÉE par défaut quand rien n'est précisé. Dans chaque catégorie,
  // les attaques à plusieurs entrées passent en priorité (les vrais enchaînements de système).
  const catOf = attackCategoryOf;
  // Le nom de la catégorie (SLOB / BLOB) est déjà dans le titre : inutile de le répéter en pastille.
  const chipsCat = (a, cat) => chips({ ...a, labels: cat === "SLOB" || cat === "BLOB" ? a.labels.filter(l => typeof l === "string" || !(/touche/i.test(l.group || "") || /^(slob|blob)$/i.test(l.text))) : a.labels });
  const CAT_ORDER = ["Transition", "Attaque placée", "SLOB", "BLOB"];
  const catBlocks = CAT_ORDER.map(cat => {
    const list = atkStats.filter(x => catOf(x.a) === cat)
      .sort((x, y) => (entryCount(y.a) >= 2 ? 1 : 0) - (entryCount(x.a) >= 2 ? 1 : 0) || y.a.count - x.a.count || entryCount(y.a) - entryCount(x.a));
    return { cat, list, poss: list.reduce((n, x) => n + x.a.count, 0) };
  }).filter(c => c.list.length > 0);
  const rankingHtml = attacks.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Classement des attaques les plus jouées</h2>
      ${catBlocks.map(({ cat, list, poss }) => {
        const main = list.slice(0, 10), rest = list.slice(10);
        const max = Math.max(1, ...main.map(x => x.a.count));
        return `
        <div class="cat-block">
          <div class="cat-title">${esc(cat)} <span>${poss} possession${poss > 1 ? "s" : ""} · ${list.length} attaque${list.length > 1 ? "s" : ""}</span></div>
          ${main.map(({ a, st }, i) => `
            <div class="rank-row">
              <div class="rank-n ${i < 3 ? "rank-top" : ""}">${i + 1}</div>
              <div class="rank-main">
                ${a.name ? `<div class="atk-name">${esc(a.name)}</div>` : ""}<div class="chips">${chipsCat(a, cat)}</div>${altInts(a)}
                <div class="bar"><div style="width:${Math.round((a.count / max) * 100)}%"></div></div>
              </div>
              <div class="rank-side"><div class="rank-count">${a.count}<small>×</small></div><div class="rank-share">${pct(a.count, totalPoss)}%</div></div>
              ${pppBadge(st.ppp)}
            </div>`).join("")}
          ${rest.slice(0, 30).map(({ a, st }) => `
            <div class="mini-row"><div style="flex:1"><div class="chips">${a.name ? `<span class="atk-name-inline">${esc(a.name)}</span>` : ""}${chipsCat(a, cat)}</div>${altInts(a)}</div><span class="mini-count">${a.count}×</span>${pppBadge(st.ppp)}</div>`).join("")}
          ${rest.length > 30 ? `<p class="more">+ ${rest.length - 30} autres</p>` : ""}
        </div>`;
      }).join("")}
      ${skippedIntentionOnly > 0 ? `<p class="more">${skippedIntentionOnly} possession${skippedIntentionOnly > 1 ? "s" : ""} décrite${skippedIntentionOnly > 1 ? "s" : ""} seulement par une intention ou une remise en jeu (SIDE41, SLOB, BLOB), non listée${skippedIntentionOnly > 1 ? "s" : ""}.</p>` : ""}
    </section>`;

  // Entrées prises une à une : chaque entrée taguée apparaît, quelle que soit la combinaison dans
  // laquelle elle a été jouée.
  const entryMap = new Map();
  atkStats.forEach(({ a, st }) => {
    [...new Set(a.labels.filter(l => typeof l !== "string" && /entr[ée]e/i.test(l.group || "")).map(l => l.text))].forEach(t => {
      const k = t.toLowerCase(), e = entryMap.get(k) || { label: t, count: 0, points: 0, resolved: 0 };
      e.count += a.count; e.points += st.points; e.resolved += st.resolved; entryMap.set(k, e);
    });
  });
  const entryRows = [...entryMap.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "fr"));
  const entriesHtml = entryRows.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Entrées les plus utilisées</h2>
      ${entryRows.map((e, i) => `
        <div class="rank-row">
          <div class="rank-n ${i < 3 ? "rank-top" : ""}">${i + 1}</div>
          <div class="rank-main"><div class="chips"><span class="chip">${esc(e.label)}</span></div><div class="bar"><div style="width:${Math.round((e.count / entryRows[0].count) * 100)}%"></div></div></div>
          <div class="rank-side"><div class="rank-count">${e.count}<small>×</small></div><div class="rank-share">${pct(e.count, totalPoss)}%</div></div>
          ${pppBadge(e.resolved ? e.points / e.resolved : null)}
        </div>`).join("")}
    </section>`;

  const defOverviewHtml = defItems.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Attaque de ${esc(session.opponent)} sur défenses adverses</h2>
      ${familyItems.map(f => { const tot = f.items.reduce((s, i) => s + i.value, 0); return `
        <div class="def-block"><div class="sub-title">${esc(f.fam.charAt(0).toUpperCase() + f.fam.slice(1).toLowerCase())}</div>
        <div class="donut-wrap">${donut(f.items, 150)}${legend(f.items, tot)}</div></div>`; }).join("")}
    </section>`;

  // Fiche par attaque : play pur puis le même play selon la défense (camembert + comparaison)
  const detailHtml = atkStats.filter(x => (x.a.byDefense || []).length > 0).slice(0, 8).map(({ a, st }) => {
    const items = [...a.byDefense].sort((x, y) => y.outcomes.length - x.outcomes.length).map((d, i) => {
      const ds = defenseStats(d);
      return { label: d.label, value: ds.count, color: PALETTE[i % PALETTE.length], ppp: ds.ppp };
    });
    const tot = items.reduce((s, i) => s + i.value, 0);
    return `
      <div class="detail">
        <div class="detail-head">
          <div>${a.name ? `<div class="atk-name">${esc(a.name)}</div>` : ""}<div class="chips">${chips(a)}</div></div>
          <div class="detail-pure"><span>Play pur</span>${pppBadge(st.ppp)}<em>${a.count}×</em></div>
        </div>
        <div class="donut-wrap">${donut(items, 130, "poss.")}${legend(items, tot)}</div>
      </div>`;
  }).join("");
  const detailSection = detailHtml ? `<section class="card"><h2><i></i>Le même play selon la défense</h2>${detailHtml}</section>` : "";

  // ── Systèmes du Playbook (tags manuels), un tableau par type ─────────────────
  const groups = [];
  rows.forEach(r => {
    const key = r.type || "Sans catégorie";
    let g = groups.find(g => g.type === key);
    if (!g) { g = { type: key, rows: [] }; groups.push(g); }
    g.rows.push(r);
  });
  const rank = (t) => { const i = typeOrder.indexOf(t); return i === -1 ? typeOrder.length : i; };
  groups.sort((a, b) => rank(a.type) - rank(b.type));
  // Playbook de l'équipe : les plays dessinés, classés par possessions vues (vidéo + comptage
  // manuel), avec leurs schémas et leur rentabilité — remplace le tableau "Systèmes du Playbook".
  const playbookHtml = !playRank || playRank.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Playbook de ${esc(session.opponent)} : les plus joués</h2>
      <p class="hint">Systèmes dessinés dans le Playbook, classés par possessions vues (vidéo + comptage manuel), avec leur rentabilité.</p>
      ${seenPlays.map((r, i) => {
        const imgs = (r.play._images || (r.play.schemas || []).map(d => ({ data: d }))).filter(x => x && x.data).slice(0, 3);
        const ints = r.intentions.length ? `<div class="alt-int">Intentions : ${r.intentions.map((x, k) => k === 0 ? `<b>${esc(x.text)} ${x.count}×</b>` : `${esc(x.text)} ${x.count}×`).join(", ")}</div>` : "";
        return `
        <div class="pb-row">
          <div class="rank-row">
            <div class="rank-n ${i < 3 ? "rank-top" : ""}">${i + 1}</div>
            <div class="rank-main"><div class="atk-name">${esc(r.play.titre)}</div>
              <div class="chips">${r.play.type ? `<span class="chip chip-int">${esc(r.play.type)}</span>` : ""}${(r.play.tags || []).slice(0, 6).map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>${ints}
              <div class="bar"><div style="width:${Math.round((r.count / Math.max(1, seenPlays[0].count)) * 100)}%"></div></div></div>
            <div class="rank-side"><div class="rank-count">${r.count}<small>×</small></div><div class="rank-share">${pct(r.count, pbTotal)}%</div></div>
            ${pppBadge(r.ppp)}
          </div>
          ${imgs.length ? `<div class="pb-imgs">${imgs.map(im => `<img src="${im.data}" alt="" />`).join("")}</div>` : ""}
        </div>`;
      }).join("")}
      ${unseenPlays.length ? `<p class="more">Pas encore vus en vidéo : ${unseenPlays.map(r => esc(r.play.titre)).join(", ")}.</p>` : ""}
    </section>`;

  const systemsHtml = rows.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Systèmes du Playbook</h2>
      ${groups.map(g => `
        <div class="sub-title">${esc(g.type)}</div>
        <table>
          <thead><tr><th></th><th>Système</th><th class="num">Joué</th><th class="num">Points</th><th class="num">Pts/poss.</th></tr></thead>
          <tbody>${g.rows.map((r, i) => `
            <tr><td class="rk">${i + 1}</td>
            <td class="tt">${esc(r.titre)}${r.tempsFort?.length ? `<div class="tf">${r.tempsFort.map(esc).join(", ")}</div>` : ""}</td>
            <td class="num">${r.played}</td>
            <td class="num">${r.points}${r.possible > 0 ? ` / ${r.possible}` : ""}</td>
            <td class="num">${r.played > 0 ? pppBadge(r.points / r.played) : "—"}</td></tr>`).join("")}</tbody>
        </table>`).join("")}
    </section>`;

  // Défense de l'équipe scoutée (séquences DEFENSE) : un camembert par groupe de libellés
  // (écrans de pick and roll, écrans non porteur, post up...), et pour les écrans, la défense
  // choisie selon l'intention adverse (ex. sur SIDE 50 : step out).
  const defInst = session.defenseInstances || [];
  const defGroupMap = new Map();
  defInst.forEach(ls => ls.forEach(l => {
    if (/intention/i.test(l.group)) return;
    const gm = defGroupMap.get(l.group) || new Map();
    gm.set(l.text, (gm.get(l.text) || 0) + 1); defGroupMap.set(l.group, gm);
  }));
  const prettyGroup = (g) => {
    const k = g.toLowerCase();
    if (/porteur/.test(k)) return "Écrans non porteur";
    if (/[eé]cran/.test(k)) return "Écrans (pick and roll)";
    if (/post ?up/.test(k)) return "Gestion du post up";
    if (/def.*collect/.test(k)) return "Défense collective";
    if (/^entr/.test(k)) return "Entrées adverses défendues";
    if (/phase/.test(k)) return "Phase de jeu adverse";
    if (/touche/.test(k)) return "Remises en jeu";
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  };
  const ownDefHtml = defGroupMap.size === 0 ? "" : `
    <section class="card">
      <h2><i></i>Défense de ${esc(session.opponent)}</h2>
      ${[...defGroupMap.entries()].sort((x, y) => {
        const pr = (g) => { const i = [/[eé]cran/i, /porteur/i, /post ?up/i, /def/i].findIndex(r => r.test(g)); return i === -1 ? 9 : i; };
        return pr(x[0]) - pr(y[0]);
      }).map(([group, gm]) => {
        const items = [...gm.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
        const tot = items.reduce((s, i) => s + i.value, 0);
        const colorOf = new Map(items.map(i => [i.label, i.color]));
        let perIntention = "";
        if (/[eé]cran/i.test(group)) {
          const byInt = new Map();
          defInst.forEach(ls => {
            const ints = ls.filter(l => /intention/i.test(l.group)).map(l => l.text);
            const cov = ls.filter(l => l.group === group).map(l => l.text);
            ints.forEach(it => cov.forEach(c => { const m = byInt.get(it) || new Map(); m.set(c, (m.get(c) || 0) + 1); byInt.set(it, m); }));
          });
          const rowsInt = [...byInt.entries()].map(([it, m]) => ({ it, m, total: [...m.values()].reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total).slice(0, 8);
          if (rowsInt.length) perIntention = `
            <div class="sub-title" style="margin-top:18px">Défense choisie selon l'intention adverse</div>
            ${rowsInt.map(r => {
              const parts = [...r.m.entries()].sort((a, b) => b[1] - a[1]);
              return `<div class="int-row"><span class="chip chip-int">${esc(r.it)}</span>
                <div class="stack">${parts.map(([lab, n]) => `<div style="width:${pct(n, r.total)}%;background:${colorOf.get(lab) || "#64748b"}" title="${esc(lab)} ${n}"></div>`).join("")}</div>
                <span class="int-top">${esc(parts[0][0])} <small>${pct(parts[0][1], r.total)}% · ${r.total}×</small></span></div>`;
            }).join("")}`;
        }
        return `<div class="def-block"><div class="sub-title">${esc(prettyGroup(group))}</div>
          <div class="donut-wrap">${donut(items, 140, "séq.")}${legend(items, tot)}</div>${perIntention}</div>`;
      }).join("")}
    </section>`;

  // Défenses observées à la main (compteurs) : camembert aussi
  const manualDef = Object.entries(session.defenses || {}).sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
  const manualDefTotal = manualDef.reduce((s, i) => s + i.value, 0);
  const manualDefHtml = manualDef.length === 0 ? "" : `
    <section class="card">
      <h2><i></i>Défenses observées (saisie manuelle)</h2>
      <div class="donut-wrap">${donut(manualDef, 150, "obs.")}${legend(manualDef, manualDefTotal)}</div>
    </section>`;

  const notesHtml = !session.note && !session.notes ? "" : `
    <section class="card">
      ${session.note ? `<h2><i></i>Matchs scoutés</h2><p class="notes-text">${esc(session.note)}</p>` : ""}
      ${session.notes ? `<h2 style="${session.note ? "margin-top:18px" : ""}"><i></i>Notes</h2><p class="notes-text">${esc(session.notes).replace(/\n/g, "<br>")}</p>` : ""}
    </section>`;

  const empty = attacks.length === 0 && rows.length === 0 && !(playRank || []).length ? `<section class="card"><p class="notes-text" style="text-align:center;color:#1B2A4A80">Aucun système noté pour cette session.</p></section>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Scouting vidéo — ${esc(session.opponent)}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${SCOUT_REPORT_CSS}</style>
</head>
<body>
  <div class="page">
    <header class="hero">
      ${logo ? `<img src="${logo}" alt="Logo" class="hero-logo" />` : ""}
      <div class="kicker">Scouting vidéo</div>
      <h1>${esc(session.opponent)}</h1>
      <div class="meta">${esc(dateStr) || "Date non précisée"}</div>
      ${kpis}
    </header>
    ${notesHtml}
    ${comparisonReportHtml(session.comparison, session.opponent)}
    ${boxHtml}
    ${playbookHtml}
    ${rankingHtml}
    ${entriesHtml}
    ${defOverviewHtml}
    ${detailSection}
    ${playRank ? "" : systemsHtml}
    ${ownDefHtml}
    ${manualDefHtml}
    ${empty}
    <p class="stamp">Coaching Pro Boost · récap généré le ${new Date().toLocaleDateString("fr-FR")} · version ${VIDEO_SCOUT_REPORT_VERSION}</p>
  </div>
</body>
</html>`;
}

// Box score d'équipe (fichier Excel .xlsx exporté par un site de stats : une ligne par match,
// colonnes Date / Opponent / Score / Possessions / Points / Field goals... ). Un .xlsx est un ZIP
// de fichiers XML : lu avec JSZip (déjà utilisé pour l'export Canva), sans librairie en plus.
function xlsxSheetRows(sheetXml, sharedStrings = []) {
  const dec = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
  const colIdx = (ref) => { const letters = (ref.match(/^[A-Z]+/) || ["A"])[0]; let n = 0; for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const rows = [];
  (sheetXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || []).forEach(rowXml => {
    const row = [];
    (rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach(cell => {
      const attrs = cell.match(/^<c\b([^>]*?)\/?>/)[1];
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const v = (cell.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
      let val = null;
      if (type === "s") val = v !== undefined ? (sharedStrings[+v] ?? "") : null;
      else if (type === "inlineStr") val = (cell.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => dec(t.replace(/<[^>]+>/g, ""))).join("");
      else if (v !== undefined) val = type === "str" || type === "e" ? dec(v) : type === "b" ? v === "1" : (isNaN(+v) ? dec(v) : +v);
      row[ref ? colIdx(ref) : row.length] = val;
    });
    rows.push(Array.from(row, x => x ?? null));
  });
  return rows;
}
async function readXlsxFirstSheet(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const sheetName = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))[0];
  if (!sheetName) throw new Error("aucune feuille trouvée dans ce fichier (il faut un .xlsx)");
  const ssFile = zip.file("xl/sharedStrings.xml");
  const shared = ssFile ? ((await ssFile.async("string")).match(/<si\b[^>]*>[\s\S]*?<\/si>/g) || [])
    .map(si => (si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, "")).join("")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")) : [];
  return xlsxSheetRows(await zip.file(sheetName).async("string"), shared);
}
// Lignes du tableur → matchs. Colonnes reconnues par leur intitulé (anglais ou français). Format
// détaillé accepté : sous chaque match, une ligne sans adversaire = les stats de l'ADVERSAIRE de ce
// match (colonne sans titre = code d'équipe, ex. CHA / BES). Les lignes de moyenne arrêtent la
// lecture (on recalcule tout). Les colonnes "<action> made" / "<action> attempted" (transition,
// catch and shoot, pick and roll...) donnent les types d'action utilisés.
const BOX_ACTION_LABELS = [
  [/^transition/, "Transition"], [/^catch and shoot/, "Catch & shoot"], [/^catch and drive/, "Catch & drive"],
  [/^screens? off/, "Sortie d'écran"], [/^posts? ?up/, "Post up"], [/^isolation/, "Isolation"], [/^hand ?off/, "Hand off"],
  [/^cuts?/, "Coupe"], [/^pnr handler/, "Pick & roll — porteur"], [/^pnr roller/, "Pick & roll — roller"],
  [/^pnp|^pick.?n.?pop/, "Pick & pop"], [/^drives?/, "Pénétration"],
];
function parseBoxScoreRows(rows) {
  const hIdx = rows.findIndex(r => r.some(c => /^(opponent|adversaire)$/i.test(String(c ?? "").trim())) && r.some(c => /point/i.test(String(c ?? ""))));
  if (hIdx === -1) throw new Error("colonnes « Opponent » / « Points » introuvables");
  const head = rows[hIdx].map(c => String(c ?? "").trim().toLowerCase().replace(/\s+/g, " "));
  const col = (...res) => head.findIndex(h => res.some(re => re.test(h)));
  const C = {
    date: col(/^date$/), opp: col(/^(opponent|adversaire)$/), score: col(/^score$/), poss: col(/^possessions?$/), pts: col(/^points?$/),
    fgm: col(/^field goals made$/, /^tirs r[ée]ussis$/, /^tirs? de champ (marqu|r[ée]ussi)/), fga: col(/^field goals attempted$/, /^tirs tent[ée]s$/, /^tirs? de champ tent/),
    fg3m: col(/^3-?pt.*made$/, /^3.*r[ée]ussis$/, /^tirs? [àa] 3 ?pts? (marqu|r[ée]ussi)/), fg3a: col(/^3-?pt.*attempted$/, /^3.*tent[ée]s$/, /^tirs? [àa] 3 ?pts? tent/),
    ftm: col(/^free throws made$/, /^lf r[ée]ussis$/, /^lancers? francs? (marqu|r[ée]ussi)/), fta: col(/^free throws attempted$/, /^lf tent[ée]s$/, /^lancers? francs? tent/),
    oreb: col(/^offensive rebounds$/, /^rebonds? offensifs?$/), dreb: col(/^defensive rebounds$/, /^rebonds? d[ée]fensifs?$/),
    ast: col(/^assists$/, /^passes? d[ée]cisives?$/), stl: col(/^steals?$/, /^interceptions?$/), tov: col(/^turnovers?$/, /^balles? perdues?$/, /^pertes? de balle/),
    ucm: col(/^uncontested field goals made$/, /^tirs? non contest[ée]s? r[ée]ussis?$/), uca: col(/^uncontested field goals$/, /^tirs? non contest[ée]s?$/),
    ctm: col(/^contested field goals made$/, /^tirs? contest[ée]s? r[ée]ussis?$/), cta: col(/^contested field goals$/, /^tirs? contest[ée]s?$/),
    pto: col(/^points off turnovers/, /^points apr[èe]s (les )?pertes/),
  };
  // Colonne sans titre entre le score et les possessions : code de l'équipe de la ligne.
  const teamCol = head.findIndex((h, i) => !h && i > C.opp && rows.slice(hIdx + 1).some(r => /^[A-Z]{2,5}$/.test(String(r[i] ?? "").trim())));
  const actions = [];
  head.forEach((h, i) => {
    // Anglais : "<action> made" + "<action> attempted|with shot" ; français : "<action>-Tirs de champ
    // marqués" (ou "- tirs effectués") + "<action>-Tirs".
    const m = h.match(/^(.+?) made$/) || h.match(/^(.+?)\s*-\s*(?:tirs? de champ marqu[ée]s?|tirs? effectu[ée]s?)$/);
    if (!m || /field goals|free throws|^\d|-pt/.test(h)) return;
    const next = head[i + 1] || "";
    if (!/attempted|with shot|-\s*tirs?$/.test(next)) return;
    const lab = BOX_ACTION_LABELS.find(([re]) => re.test(m[1]));
    actions.push({ key: m[1], label: lab ? lab[1] : m[1].charAt(0).toUpperCase() + m[1].slice(1), made: i, att: i + 1 });
  });
  const numAt = (r, i) => { if (i === -1 || i === undefined) return 0; const v = r[i]; const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
  const statsOf = (r) => {
    const s = { team: teamCol === -1 ? "" : String(r[teamCol] ?? "").trim() };
    ["poss", "pts", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta", "oreb", "dreb", "ast", "stl", "tov", "ucm", "uca", "ctm", "cta", "pto"].forEach(k => { s[k] = numAt(r, C[k]); });
    if (actions.length) s.actions = Object.fromEntries(actions.map(a => [a.label, [numAt(r, a.made), numAt(r, a.att)]]));
    return s;
  };
  const games = [];
  for (const r of rows.slice(hIdx + 1)) {
    const opp = String(r[C.opp] ?? "").trim().replace(/^[-–—]+$/, "");
    if (/average|moyenne|total/i.test(opp)) break;
    if (opp) {
      const g = { date: C.date === -1 ? "" : String(r[C.date] ?? ""), opponent: opp, score: C.score === -1 ? "" : String(r[C.score] ?? ""), ...statsOf(r) };
      // Score "87:79" : le côté qui vaut "Points" est celui de l'équipe, l'autre celui de l'adversaire.
      const sc = g.score.match(/(\d+)\s*[:\-–]\s*(\d+)/);
      if (sc) { const a = +sc[1], b = +sc[2]; g.oppPts = a === g.pts ? b : b === g.pts ? a : b; }
      games.push(g);
    } else {
      const last = games[games.length - 1];
      if (last && !last.opp && r.some((c, i) => i > C.opp && typeof c === "number")) { last.opp = statsOf(r); last.oppPts = last.opp.pts; }
    }
  }
  if (!games.length) throw new Error("aucun match trouvé sous la ligne d'en-tête");
  return games;
}
// Indicateurs (Four Factors) : possessions estimées = tirs tentés − rebonds offensifs + 0,44 ×
// lancers francs tentés + balles perdues (formule standard, plus fiable que la colonne
// « Possessions » des fichiers exportés, qui ne compte pas toujours de la même façon).
function boxScoreMetrics(g, opp = null) {
  const poss = g.fga - g.oreb + 0.44 * g.fta + g.tov;
  const fg2a = g.fga - g.fg3a;
  return {
    poss, ppp: poss > 0 ? g.pts / poss : null,
    efg: g.fga ? (g.fgm + 0.5 * g.fg3m) / g.fga : null,
    tovPct: poss > 0 ? g.tov / poss : null,
    ftr: g.fga ? g.fta / g.fga : null,
    threeRate: g.fga ? g.fg3a / g.fga : null,
    threePct: g.fg3a ? g.fg3m / g.fg3a : null,
    twoPct: fg2a > 0 ? (g.fgm - g.fg3m) / fg2a : null,
    astRate: g.fgm ? g.ast / g.fgm : null,
    orebPct: opp && (g.oreb + opp.dreb) ? g.oreb / (g.oreb + opp.dreb) : null,
    contestedShare: (g.cta || 0) + (g.uca || 0) ? g.cta / (g.cta + g.uca) : null,
    contestedPct: g.cta ? g.ctm / g.cta : null, uncontestedPct: g.uca ? g.ucm / g.uca : null,
    oppPpp: poss > 0 && g.oppPts !== undefined ? g.oppPts / poss : null,
    win: g.oppPts !== undefined ? g.pts > g.oppPts : null,
  };
}
function boxScoreTotals(list) {
  const t = {};
  ["pts", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta", "oreb", "dreb", "ast", "stl", "tov", "ucm", "uca", "ctm", "cta", "pto"].forEach(k => { t[k] = list.reduce((s, g) => s + (g[k] || 0), 0); });
  const acts = {};
  list.forEach(g => Object.entries(g.actions || {}).forEach(([k, [m, a]]) => { const e = acts[k] || [0, 0]; acts[k] = [e[0] + m, e[1] + a]; }));
  if (Object.keys(acts).length) t.actions = acts;
  return t;
}
function boxScoreSummary(games) {
  const n = games.length;
  const tot = boxScoreTotals(games);
  if (games.every(g => g.oppPts !== undefined)) tot.oppPts = games.reduce((s, g) => s + g.oppPts, 0);
  const oppTot = games.every(g => g.opp) ? boxScoreTotals(games.map(g => g.opp)) : null;
  const m = boxScoreMetrics(tot, oppTot);
  const om = oppTot ? boxScoreMetrics(oppTot, tot) : null;
  const perGame = games.map(g => ({ g, m: boxScoreMetrics(g, g.opp || null) }));
  const wins = perGame.filter(x => x.m.win === true), losses = perGame.filter(x => x.m.win === false);
  const avg = (list, f) => list.length ? list.reduce((s, x) => s + f(x), 0) / list.length : null;
  return {
    n, perGame, tot, oppTot, om, wins: wins.length, losses: losses.length, ...m,
    pace: m.poss / n, ptsPerGame: tot.pts / n, oppPtsPerGame: tot.oppPts !== undefined ? tot.oppPts / n : null,
    orebPerGame: tot.oreb / n, tovPerGame: tot.tov / n, astPerGame: tot.ast / n,
    tovWins: avg(wins, x => x.g.tov), tovLosses: avg(losses, x => x.g.tov),
    efgWins: avg(wins, x => x.m.efg), efgLosses: avg(losses, x => x.m.efg),
  };
}
// Bloc "Profil statistique" de l'export : indicateurs, constats, tableau par match, types d'action,
// ce que subit leur défense (lignes adverses), et le contrôle avec les attaques taguées en vidéo.
function boxScoreReportHtml(box, opponent, video = null, own = false) {
  if (!box || !(box.games || []).length) return "";
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const S = boxScoreSummary(box.games), O = S.om, OT = S.oppTot;
  const p = (x, d = 0) => x === null || x === undefined ? "—" : (x * 100).toFixed(d).replace(".", ",") + " %";
  const f = (x, d = 2) => x === null || x === undefined ? "—" : x.toFixed(d).replace(".", ",");
  const kpi = (v, l) => `<div class="bs-kpi"><b>${v}</b><span>${l}</span></div>`;
  const insights = [];
  if (S.threeRate !== null) insights.push(S.threeRate >= 0.42
    ? `<b>Équipe de shooteurs</b> : ${p(S.threeRate)} de leurs tirs sont des 3 pts (${p(S.threePct, 1)} de réussite).`
    : `${p(S.threeRate)} de leurs tirs sont des 3 pts (${p(S.threePct, 1)} de réussite).`);
  if (S.astRate !== null && S.astRate >= 0.65) insights.push(`<b>Jeu collectif</b> : ${p(S.astRate)} de leurs paniers suivent une passe décisive (${f(S.astPerGame, 1)} passes déc. / match).`);
  if (S.orebPerGame <= 8) insights.push(`<b>Peu de rebond offensif</b> (${f(S.orebPerGame, 1)} / match${S.orebPct !== null ? `, ${p(S.orebPct)} des rebonds offensifs possibles` : ""}) : peu de secondes chances.`);
  if (S.wins && S.losses && S.tovWins !== null && S.tovLosses !== null && S.tovLosses - S.tovWins >= 3)
    insights.push(`<b>Les balles perdues décident</b> : ${f(S.tovWins, 1)} par match quand ils gagnent, ${f(S.tovLosses, 1)} quand ils perdent → ${own ? "priorité : protéger le ballon" : "mettre la pression sur le porteur"}.`);
  if (S.wins && S.losses && S.efgWins !== null && S.efgLosses !== null && S.efgWins - S.efgLosses >= 0.05)
    insights.push(`<b>Dépendants de leur adresse</b> : ${p(S.efgWins)} d'eFG% dans les victoires, ${p(S.efgLosses)} dans les défaites.`);
  if (S.contestedShare !== null && S.contestedShare >= 0.75) insights.push(`<b>Tirs surtout contestés</b> : ${p(S.contestedShare)} de leurs tirs (${p(S.contestedPct)} de réussite) — ils créent peu de tirs ouverts${S.uncontestedPct !== null ? `, mais ${p(S.uncontestedPct)} quand ils sont seuls` : ""}.`);
  if (OT && S.tot.pto + OT.pto > 0 && OT.pto - S.tot.pto >= S.n * 4) insights.push(`<b>Leurs pertes coûtent cher</b> : ${f(OT.pto / S.n, 1)} pts encaissés par match sur leurs balles perdues (contre ${f(S.tot.pto / S.n, 1)} marqués sur celles des adversaires).`);

  // Types d'action (tirs tentés par action)
  const actionRows = (act, fgaTot) => Object.entries(act || {}).filter(([, [, a]]) => a > 0)
    .sort((x, y) => y[1][1] - x[1][1]).map(([label, [m, a]]) => ({ label, m, a, share: fgaTot ? a / fgaTot : 0, pct: a ? m / a : null }));
  const actionTable = (rowsA, title, hint) => rowsA.length === 0 ? "" : `
      <div class="sub-title">${title}</div>${hint ? `<p class="hint" style="margin:0 0 6px">${hint}</p>` : ""}
      ${rowsA.map(r => `<div class="bs-act"><span class="bs-act-l">${esc(r.label)}</span>
        <div class="bar"><div style="width:${Math.round((r.a / rowsA[0].a) * 100)}%"></div></div>
        <span class="bs-act-n">${f(r.a / S.n, 1)}<small>/m</small></span>
        <span class="bs-act-p ${r.pct === null ? "" : r.pct >= 0.55 ? "bs-good" : r.pct < 0.4 ? "bs-low" : ""}">${r.m}/${r.a} · ${p(r.pct)}</span></div>`).join("")}`;
  const ownActions = actionTable(actionRows(S.tot.actions, S.tot.fga), `Comment ${esc(opponent)} attaque (tirs par type d'action)`, "Tirs tentés par match et réussite — vert ≥ 55 %, rouge < 40 %.");

  // Ce que subit leur défense : stats cumulées de leurs adversaires
  let defHtml = "";
  if (OT && O) {
    const dIns = [];
    if (O.twoPct !== null && O.twoPct >= 0.55) dIns.push(`<b>Défense intérieure fragile</b> : les adversaires réussissent ${p(O.twoPct)} à 2 pts.`);
    if (O.orebPct !== null && O.orebPct >= 0.27) dIns.push(`<b>Rebond défensif ${own ? "à travailler" : "à attaquer"}</b> : les adversaires prennent ${p(O.orebPct)} des rebonds offensifs possibles (${f(OT.oreb / S.n, 1)} / match).`);
    if (O.threePct !== null && O.threePct <= 0.32) dIns.push(`Le tir à 3 pts adverse leur réussit peu (${p(O.threePct)}) : ils défendent bien la ligne.`);
    if (O.tovPct !== null && O.tovPct <= 0.15) dIns.push(`Ils forcent peu de pertes (${p(O.tovPct)} des possessions adverses).`);
    if (O.ftr !== null && O.ftr >= 0.33) dIns.push(`<b>${own ? "Trop de fautes" : "Ils font beaucoup de fautes"}</b> : ${f(OT.fta / S.n, 1)} lancers francs adverses par match.`);
    const fr = (l, a, b) => `<tr><td class="tt">${l}</td><td class="num">${a}</td><td class="num">${b}</td></tr>`;
    defHtml = `
      <div class="sub-title">Ce que subit la défense de ${esc(opponent)}</div>
      <table class="bs-ff"><thead><tr><th></th><th class="num">${esc(opponent)}</th><th class="num">Adversaires</th></tr></thead><tbody>
        ${fr("Points / match", f(S.ptsPerGame, 1), f(OT.pts / S.n, 1))}
        ${fr("Points / possession", f(S.ppp), f(O.ppp))}
        ${fr("eFG% (adresse)", p(S.efg), p(O.efg))}
        ${fr("Réussite à 2 pts", p(S.twoPct), p(O.twoPct))}
        ${fr("Réussite à 3 pts", p(S.threePct), p(O.threePct))}
        ${fr("Balles perdues / possession", p(S.tovPct), p(O.tovPct))}
        ${S.orebPct !== null ? fr("Rebonds offensifs pris", p(S.orebPct), p(O.orebPct)) : ""}
        ${fr("Lancers / tirs", p(S.ftr), p(O.ftr))}
        ${S.tot.pto + OT.pto ? fr("Points sur balles perdues / match", f(S.tot.pto / S.n, 1), f(OT.pto / S.n, 1)) : ""}
      </tbody></table>
      ${dIns.length ? `<ul class="bs-ins" style="margin-top:12px">${dIns.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      ${actionTable(actionRows(OT.actions, OT.fga), "Ce que les adversaires leur font (tirs par type d'action)", "")}`;
  }

  const cmp = [];
  if (video && video.ppp !== null && S.ppp !== null) cmp.push(`Rentabilité des attaques taguées en vidéo : <b>${f(video.ppp)}</b> pt/poss. contre <b>${f(S.ppp)}</b> sur les matchs du fichier${Math.abs(video.ppp - S.ppp) > 0.15 ? " — écart important : vérifier que toutes les possessions (lancers francs, contre-attaques) sont bien taguées." : "."}`);
  if (video && video.tovRate !== null && S.tovPct !== null) cmp.push(`Possessions sans résultat (comptées comme pertes de balle) en vidéo : <b>${p(video.tovRate)}</b>, contre <b>${p(S.tovPct)}</b> de balles perdues dans les stats${Math.abs(video.tovRate - S.tovPct) > 0.06 ? " — écart important : des résultats manquent peut-être au tagging." : "."}`);
  return `
    <section class="card">
      <h2><i></i>Profil statistique de ${esc(opponent)}</h2>
      <p class="hint">${S.n} match${S.n > 1 ? "s" : ""}${S.wins + S.losses ? ` · ${S.wins} victoire${S.wins > 1 ? "s" : ""}, ${S.losses} défaite${S.losses > 1 ? "s" : ""}` : ""}${box.fileName ? ` · ${esc(box.fileName)}` : ""}</p>
      <div class="bs-kpis">
        ${kpi(f(S.ptsPerGame, 1), "pts marqués / match")}
        ${S.oppPtsPerGame !== null ? kpi(f(S.oppPtsPerGame, 1), "pts encaissés / match") : ""}
        ${kpi(f(S.pace, 1), "possessions / match")}
        ${kpi(f(S.ppp), "pts / possession")}
        ${kpi(p(S.efg), "eFG% (adresse)")}
        ${kpi(p(S.tovPct), "balles perdues / poss.")}
        ${kpi(p(S.ftr), "lancers / tirs")}
        ${kpi(p(S.threeRate), "tirs à 3 pts")}
      </div>
      ${insights.length ? `<ul class="bs-ins">${insights.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      <div class="bs-table"><table>
        <thead><tr><th>Match</th><th class="num">Score</th><th class="num">Pts/poss.</th><th class="num">eFG%</th><th class="num">3 pts</th><th class="num">Bal. perdues</th><th class="num">Reb. off.</th><th class="num">Passes déc.</th></tr></thead>
        <tbody>${S.perGame.map(({ g, m }) => `
          <tr><td class="tt">${esc(g.opponent)}${g.date ? `<div class="tf">${esc(g.date)}</div>` : ""}</td>
          <td class="num"><span class="bs-res ${m.win === true ? "bs-w" : m.win === false ? "bs-l" : ""}">${m.win === true ? "V" : m.win === false ? "D" : ""}</span> ${esc(g.score)}</td>
          <td class="num">${f(m.ppp)}</td><td class="num">${p(m.efg)}</td><td class="num">${g.fg3m}/${g.fg3a}</td>
          <td class="num"><b>${g.tov}</b></td><td class="num">${g.oreb}</td><td class="num">${g.ast}</td></tr>`).join("")}</tbody>
      </table></div>
      ${ownActions}
      ${defHtml}
      ${cmp.length ? `<div class="sub-title">Contrôle avec la vidéo</div><ul class="bs-ins">${cmp.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      <p class="more">Possessions estimées (tirs tentés − rebonds off. + 0,44 × lancers tentés + balles perdues). eFG% : un panier à 3 pts compte pour 1,5.</p>
    </section>`;
}

// Fichier « Team comparison » (.xlsx) : une statistique par ligne (moyennes par match), une colonne
// par équipe (en-tête = nom de l'équipe sur la 1re ligne de la cellule). Sert au « face à face »
// entre mon équipe et l'équipe scoutée.
function parseTeamComparisonRows(rows) {
  const hIdx = rows.findIndex(r => !String(r[0] ?? "").trim() && String(r[1] ?? "").trim() && String(r[2] ?? "").trim() && typeof r[1] === "string");
  if (hIdx === -1) throw new Error("en-têtes des deux équipes introuvables");
  const teamName = (c) => String(c ?? "").split(/\n/)[0].trim();
  const MAP = [
    ["games", /^(matche?s jou[ée]s|games played|matchs?)$/], ["poss", /^possessions?$/], ["pts", /^points?$/],
    ["fgm", /^(tirs? de champ marqu[ée]s?|field goals made)$/], ["fga", /^(tirs? de champ tent[ée]s?|field goals attempted)$/],
    ["fg3m", /^(tirs? [àa] 3 ?pts? marqu[ée]s?|3-?pt field goals made)$/], ["fg3a", /^(tirs? [àa] 3 ?pts? tent[ée]s?|3-?pt field goals attempted)$/],
    ["ftm", /^(lancers? francs? marqu[ée]s?|free throws made)$/], ["fta", /^(lancers? francs? tent[ée]s?|free throws attempted)$/],
    ["reb", /^(rebonds?|rebounds)$/], ["oreb", /^(rebonds? offensifs?|offensive rebounds)$/], ["dreb", /^(rebonds? d[ée]fensifs?|defensive rebounds)$/],
    ["ast", /^(passes? d[ée]cisives?|assists)$/], ["stl", /^(steals?|interceptions?)$/], ["tov", /^(turnovers?|balles? perdues?)$/],
    ["blk", /^(contres?|blocks?)$/], ["pf", /^(fautes?|fouls)$/], ["pfd", /^(fautes? contre|fautes? subies|fouls drawn)$/],
  ];
  const teams = [1, 2].map(ci => ({ name: teamName(rows[hIdx][ci]), stats: {} }));
  rows.slice(hIdx + 1).forEach(r => {
    const lab = String(r[0] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const k = (MAP.find(([, re]) => re.test(lab)) || [])[0];
    if (!k) return;
    [1, 2].forEach((ci, t) => { const v = r[ci]; const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); teams[t].stats[k] = isNaN(n) ? 0 : n; });
  });
  if (!teams.every(t => t.name && t.stats.pts !== undefined && t.stats.fga !== undefined)) throw new Error("statistiques des deux équipes introuvables");
  return teams;
}
// Index (0/1) de l'équipe scoutée dans la comparaison : celle dont le nom contient le nom de session.
function comparisonOpponentIndex(teams, opponent) {
  const n = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const o = n(opponent).split(" ").filter(w => w.length > 2);
  const score = (t) => o.filter(w => n(t.name).includes(w)).length;
  return score(teams[0]) > score(teams[1]) ? 0 : 1;
}
function comparisonReportHtml(cmp, opponent) {
  if (!cmp || !(cmp.teams || []).length) return "";
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const oi = comparisonOpponentIndex(cmp.teams, opponent);
  const T = cmp.teams[oi], U = cmp.teams[1 - oi];
  const short = (s) => s.length > 22 ? s.split(/[\s-]+/).slice(0, 2).join(" ") : s;
  const uN = short(U.name), tN = short(T.name);
  const met = (a, b) => {
    const poss = a.fga - a.oreb + 0.44 * a.fta + a.tov;
    return {
      ppp: poss > 0 ? a.pts / poss : null, efg: a.fga ? (a.fgm + 0.5 * a.fg3m) / a.fga : null,
      two: a.fga - a.fg3a > 0 ? (a.fgm - a.fg3m) / (a.fga - a.fg3a) : null, three: a.fg3a ? a.fg3m / a.fg3a : null,
      threeRate: a.fga ? a.fg3a / a.fga : null, ft: a.fta ? a.ftm / a.fta : null, ftr: a.fga ? a.fta / a.fga : null,
      tovPct: poss > 0 ? a.tov / poss : null, orbPct: a.oreb + b.dreb ? a.oreb / (a.oreb + b.dreb) : null,
    };
  };
  const mU = met(U.stats, T.stats), mT = met(T.stats, U.stats);
  const p = (x) => x === null || x === undefined ? "—" : Math.round(x * 100) + " %";
  const f = (x, d = 1) => x === null || x === undefined ? "—" : x.toFixed(d).replace(".", ",");
  // [libellé, valeur nous, valeur eux, format, plus haut = mieux ?]
  const lines = [
    ["Points / match", U.stats.pts, T.stats.pts, (x) => f(x), true],
    ["Points / possession", mU.ppp, mT.ppp, (x) => f(x, 2), true],
    ["eFG% (adresse)", mU.efg, mT.efg, p, true],
    ["Réussite à 2 pts", mU.two, mT.two, p, true],
    ["Réussite à 3 pts", mU.three, mT.three, p, true],
    ["Part des tirs à 3 pts", mU.threeRate, mT.threeRate, p, null],
    ["Lancers francs tentés / match", U.stats.fta, T.stats.fta, (x) => f(x), true],
    ["Réussite aux lancers", mU.ft, mT.ft, p, true],
    ["Balles perdues / possession", mU.tovPct, mT.tovPct, p, false],
    ["Rebonds offensifs pris", mU.orbPct, mT.orbPct, p, true],
    ["Rebonds / match", U.stats.reb, T.stats.reb, (x) => f(x), true],
    ["Passes décisives / match", U.stats.ast, T.stats.ast, (x) => f(x), true],
    ["Interceptions / match", U.stats.stl, T.stats.stl, (x) => f(x), true],
    ["Contres / match", U.stats.blk, T.stats.blk, (x) => f(x), true],
    ["Fautes / match", U.stats.pf, T.stats.pf, (x) => f(x), false],
  ].filter(l => l[1] !== undefined && l[2] !== undefined);
  const edge = (a, b, hi) => hi === null || a === null || b === null || a === b ? 0 : (a > b) === hi ? 1 : -1;
  const keys = [];
  if (mT.three !== null && mT.three >= 0.37 && mT.threeRate >= 0.4) keys.push(`<b>Leur arme : le tir à 3 pts</b> — ${f(T.stats.fg3a)} tentatives par match à ${p(mT.three)}. Fermer les shooteurs, défendre les sorties d'écran.`);
  if (T.stats.fta - U.stats.fta >= 3 || (mT.ft !== null && mT.ft >= 0.75 && U.stats.pf >= 21)) keys.push(`<b>Discipline</b> — ils vont ${f(T.stats.fta)} fois sur la ligne par match (${p(mT.ft)}) et nous faisons ${f(U.stats.pf)} fautes : éviter les fautes inutiles.`);
  if (mU.ft !== null && mT.ft !== null && mT.ft - mU.ft >= 0.08) keys.push(`<b>Lancers francs</b> — ${p(mU.ft)} pour nous contre ${p(mT.ft)} pour eux : les fins de match serrées leur profitent.`);
  if (U.stats.reb - T.stats.reb >= 2) keys.push(`<b>Avantage au rebond</b> — ${f(U.stats.reb)} rebonds par match contre ${f(T.stats.reb)} : à exploiter (rebond défensif pour courir).`);
  else if (T.stats.reb - U.stats.reb >= 2) keys.push(`<b>Rebond</b> — ils prennent ${f(T.stats.reb)} rebonds par match contre ${f(U.stats.reb)} : box-out obligatoire.`);
  if (U.stats.stl - T.stats.stl >= 2 && T.stats.tov >= 13) keys.push(`<b>Notre pression peut payer</b> — ${f(U.stats.stl)} interceptions par match pour nous, ${f(T.stats.tov)} balles perdues pour eux.`);
  if (mU.two !== null && mT.two !== null && mU.two - mT.two >= 0.03) keys.push(`<b>Attaquer l'intérieur</b> — ${p(mU.two)} à 2 pts pour nous contre ${p(mT.two)} pour eux.`);
  if (U.stats.ast - T.stats.ast >= 3) keys.push(`<b>Partage du ballon</b> — ${f(U.stats.ast)} passes décisives par match contre ${f(T.stats.ast)}.`);
  const wins = lines.filter(l => edge(l[1], l[2], l[4]) === 1).length, losses = lines.filter(l => edge(l[1], l[2], l[4]) === -1).length;
  return `
    <section class="card">
      <h2><i></i>Face à face : ${esc(uN)} / ${esc(tN)}</h2>
      <p class="hint">Moyennes par match${U.stats.games ? ` (${esc(uN)} : ${U.stats.games} matchs, ${esc(tN)} : ${T.stats.games} matchs)` : ""}. Avantage sur ${wins} indicateurs pour ${esc(uN)}, ${losses} pour ${esc(tN)}.</p>
      ${keys.length ? `<div class="sub-title">Clés du match</div><ul class="bs-ins">${keys.map(k => `<li>${k}</li>`).join("")}</ul>` : ""}
      <div class="bs-table"><table class="cmp">
        <thead><tr><th></th><th class="num">${esc(uN)}</th><th class="num">${esc(tN)}</th></tr></thead>
        <tbody>${lines.map(([l, a, b, fmt, hi]) => { const e = edge(a, b, hi); return `
          <tr><td class="tt">${l}</td><td class="num ${e === 1 ? "cmp-win" : ""}">${fmt(a)}</td><td class="num ${e === -1 ? "cmp-win cmp-them" : ""}">${fmt(b)}</td></tr>`; }).join("")}</tbody>
      </table></div>
      <p class="more">Surligné = meilleure valeur (moins de balles perdues et de fautes = mieux). Points/possession et rebonds offensifs pris : estimations à partir des moyennes.</p>
    </section>`;
}

// ── Analyse de mon équipe (admin) ─────────────────────────────────────────────
// Fichier "Lineups" (.xlsx exporté par le site de stats) : une ligne par cinq aligné (joueurs
// séparés par des virgules, éventuellement précédés du numéro), suivie d'une ligne OPP = ce que
// l'adversaire a fait contre ce cinq. Les valeurs peuvent être des moyennes par match (décimales) :
// on ne travaille donc qu'en ratios (points pour 100 possessions), jamais en totaux absolus.
const TEAM_REPORT_VERSION = "2026-10-06-a";
const LINEUP_KEYS = ["min", "pm", "possFile", "pts", "fga", "fgm", "fg3a", "fg3m", "fta", "ftm", "oreb", "dreb", "ast", "stl", "tov", "pf"];
function parseLineupRows(rows) {
  const hIdx = rows.findIndex(r => r.some(c => /^(lineups?|cinq|composition)$/i.test(String(c ?? "").trim())));
  if (hIdx === -1) throw new Error("colonne « Lineup » introuvable");
  const head = rows[hIdx].map(c => String(c ?? "").trim().toLowerCase());
  const col = (...res) => head.findIndex(h => res.some(re => re.test(h)));
  // Intitulés anglais ou français (export « Les cinq majeurs » du site de stats).
  const C = {
    lineup: col(/^(lineups?|cinq|composition)$/), min: col(/^minutes?$/), pm: col(/^plus.?minus$|^\+\/-$/), possFile: col(/^possessions?$/), pts: col(/^points?$/),
    fga: col(/^field goals attempted$/, /^tirs? de champ tent[ée]s?$/), fgm: col(/^field goals made$/, /^tirs? de champ (marqu|r[ée]ussi)/),
    fg3a: col(/^3-?pt.*attempted$/, /^tirs? [àa] 3 ?pts? tent/), fg3m: col(/^3-?pt.*made$/, /^tirs? [àa] 3 ?pts? (marqu|r[ée]ussi)/),
    fta: col(/^free throws attempted$/, /^lancers? francs? tent/), ftm: col(/^free throws made$/, /^lancers? francs? (marqu|r[ée]ussi)/),
    oreb: col(/^offensive rebounds$/, /^rebonds? offensifs?$/), dreb: col(/^defensive rebounds$/, /^rebonds? d[ée]fensifs?$/),
    ast: col(/^assists$/, /^passes? d[ée]cisives?$/), stl: col(/^steals?$/, /^interceptions?$/), tov: col(/^turnovers?$/, /^balles? perdues?$/, /^pertes? de balle/), pf: col(/^fouls$/, /^fautes?$/),
  };
  const teamCol = head.findIndex((h, i) => !h && i > C.lineup);
  const minutesOf = (v) => {
    if (typeof v === "number") return v < 1 ? v * 24 * 60 : v; // une durée Excel est une fraction de jour
    const parts = String(v ?? "").trim().split(":").map(Number);
    if (parts.some(isNaN) || !parts.length) return 0;
    return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts.length === 2 ? parts[0] + parts[1] / 60 : parts[0];
  };
  const statsOf = (r) => {
    const s = {};
    LINEUP_KEYS.forEach(k => {
      if (k === "min") { s.min = C.min === -1 ? 0 : minutesOf(r[C.min]); return; }
      const v = C[k] === -1 ? null : r[C[k]];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
      s[k] = isNaN(n) ? 0 : n;
    });
    return s;
  };
  const cleanName = (n) => n.replace(/^\s*\d+\s*/, "").replace(/\s+/g, " ").trim();
  const lineups = [];
  rows.slice(hIdx + 1).forEach(r => {
    const name = String(r[C.lineup] ?? "").trim().replace(/^[-–—]+$/, "");
    const tag = teamCol === -1 ? "" : String(r[teamCol] ?? "").trim();
    if (name && !/^opp/i.test(tag)) {
      const players = name.split(",").map(cleanName).filter(Boolean);
      if (players.length) lineups.push({ players, team: tag, ...statsOf(r), opp: null });
    } else if (lineups.length && !lineups[lineups.length - 1].opp) {
      lineups[lineups.length - 1].opp = statsOf(r);
    }
  });
  if (!lineups.length) throw new Error("aucun cinq trouvé sous la ligne d'en-tête");
  return lineups;
}
// Possessions estimées (même formule que le box score) ; repli sur la colonne du fichier.
const lineupPoss = (s) => { const e = s.fga - s.oreb + 0.44 * s.fta + s.tov; return e > 0 ? e : (s.possFile || 0); };
function lineupMetrics(s, o) {
  const pT = lineupPoss(s), pO = o ? lineupPoss(o) : 0;
  const off = pT > 0 ? (s.pts / pT) * 100 : null, def = o && pO > 0 ? (o.pts / pO) * 100 : null;
  return {
    poss: (pT + pO) / (o ? 2 : 1), min: s.min, off, def, net: off !== null && def !== null ? off - def : null,
    diff: s.pts - (o ? o.pts : 0),
    efg: s.fga ? (s.fgm + 0.5 * s.fg3m) / s.fga : null, oppEfg: o && o.fga ? (o.fgm + 0.5 * o.fg3m) / o.fga : null,
    tovPct: pT > 0 ? s.tov / pT : null, forcedTov: o && pO > 0 ? o.tov / pO : null,
    orebPct: o && (s.oreb + o.dreb) ? s.oreb / (s.oreb + o.dreb) : null, dorebPct: o && (s.dreb + o.oreb) ? s.dreb / (s.dreb + o.oreb) : null,
  };
}
function sumLineups(list) {
  const z = () => Object.fromEntries(LINEUP_KEYS.map(k => [k, 0]));
  const t = z(), o = z();
  list.forEach(l => LINEUP_KEYS.forEach(k => { t[k] += l[k] || 0; if (l.opp) o[k] += l.opp[k] || 0; }));
  return { t, o };
}
function lineupAnalysis(lineups) {
  const all = sumLineups(lineups);
  const totalMetrics = lineupMetrics(all.t, all.o);
  const rows = lineups.map(l => ({ l, m: lineupMetrics(l, l.opp) }));
  // Seuil de fiabilité : un cinq vu sur trop peu de possessions ne dit rien (bruit).
  const minPoss = Math.max(8, totalMetrics.poss * 0.03);
  const reliable = rows.filter(x => x.m.poss >= minPoss && x.m.net !== null);
  const names = [...new Set(lineups.flatMap(l => l.players))];
  const keyOf = (n) => n.toLowerCase();
  const players = names.map(name => {
    const on = lineups.filter(l => l.players.some(p => keyOf(p) === keyOf(name)));
    const off = lineups.filter(l => !on.includes(l));
    const sOn = sumLineups(on), sOff = sumLineups(off);
    const mOn = lineupMetrics(sOn.t, sOn.o), mOff = off.length ? lineupMetrics(sOff.t, sOff.o) : null;
    return { name, on: mOn, off: mOff, impact: mOn.net !== null && mOff && mOff.net !== null ? mOn.net - mOff.net : null, share: totalMetrics.min ? mOn.min / totalMetrics.min : 0 };
  }).sort((a, b) => (b.impact ?? -999) - (a.impact ?? -999));
  const duoMap = new Map();
  lineups.forEach(l => {
    const ps = [...l.players].sort((a, b) => a.localeCompare(b, "fr"));
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const k = keyOf(ps[i]) + "|" + keyOf(ps[j]);
      const e = duoMap.get(k) || { players: [ps[i], ps[j]], list: [] };
      e.list.push(l); duoMap.set(k, e);
    }
  });
  const minDuoPoss = Math.max(15, totalMetrics.poss * 0.06);
  const duos = [...duoMap.values()].map(d => { const s = sumLineups(d.list); return { players: d.players, m: lineupMetrics(s.t, s.o) }; })
    .filter(d => d.m.poss >= minDuoPoss && d.m.net !== null).sort((a, b) => b.m.net - a.m.net);
  return { total: totalMetrics, rows, reliable, minPoss, players, duos, minDuoPoss };
}
function buildTeamReportHtml(a, logo = null) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const f = (x, d = 1) => x === null || x === undefined ? "—" : x.toFixed(d).replace(".", ",");
  const sg = (x, d = 1) => x === null || x === undefined ? "—" : (x > 0 ? "+" : "") + f(x, d);
  const p = (x) => x === null || x === undefined ? "—" : Math.round(x * 100) + " %";
  const mmss = (m) => { const t = Math.round(m * 60); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  const netBadge = (n) => n === null || n === undefined ? `<span class="ppp ppp-na">—</span>`
    : `<span class="ppp ${n >= 5 ? "ppp-good" : n <= -5 ? "ppp-low" : "ppp-mid"}">${sg(n)}<small>net / 100 poss.</small></span>`;
  const chipsOf = (ps) => `<div class="chips">${ps.map(n => `<span class="chip">${esc(n)}</span>`).join("")}</div>`;
  const LA = (a.lineups || []).length ? lineupAnalysis(a.lineups) : null;
  const box = a.boxScore && (a.boxScore.games || []).length ? a.boxScore : null;
  const B = box ? boxScoreSummary(box.games) : null;

  const kpis = [];
  if (B) { kpis.push([`${B.wins}-${B.losses}`, "bilan"], [f(B.ppp, 2), "pts / poss. (attaque)"]); if (B.om) kpis.push([f(B.om.ppp, 2), "pts / poss. encaissés"]); }
  if (LA) { kpis.push([String(LA.rows.length), "cinq utilisés"]); if (LA.total.net !== null) kpis.push([sg(LA.total.net), "net / 100 poss."]); }

  const lineupRow = ({ l, m }, i, showRank = true) => `
    <div class="rank-row">
      <div class="rank-n ${showRank && i < 3 ? "rank-top" : ""}">${showRank ? i + 1 : ""}</div>
      <div class="rank-main">${chipsOf(l.players)}
        <div class="tl-sub">${mmss(m.min)} min · ${f(m.poss, 0)} poss. · att. ${f(m.off, 0)} / déf. ${f(m.def, 0)} · écart ${sg(m.diff, 1)} pts</div></div>
      <div class="rank-side"><div class="rank-count">${sg(l.pm || m.diff, 0)}</div><div class="rank-share">+/-</div></div>
      ${netBadge(m.net)}
    </div>`;
  let lineupsHtml = "";
  if (LA) {
    const used = [...LA.rows].sort((x, y) => y.m.min - x.m.min).slice(0, 8);
    const best = LA.reliable.slice().sort((x, y) => y.m.net - x.m.net).slice(0, 5);
    const worst = LA.reliable.slice().sort((x, y) => x.m.net - y.m.net).filter(x => x.m.net < 0).slice(0, 5);
    const ins = [];
    if (best[0]) ins.push(`<b>Cinq le plus efficace</b> : ${best[0].l.players.map(esc).join(", ")} (${sg(best[0].m.net)} pour 100 possessions sur ${f(best[0].m.poss, 0)} poss.).`);
    if (used[0] && used[0].m.net !== null && used[0].m.net < 0) ins.push(`<b>Attention</b> : le cinq le plus utilisé est négatif (${sg(used[0].m.net)} pour 100 poss.).`);
    const topImpact = LA.players.filter(x => x.impact !== null && x.share >= 0.15);
    if (topImpact[0] && topImpact[0].impact >= 5) ins.push(`<b>${esc(topImpact[0].name)}</b> : l'équipe fait ${sg(topImpact[0].impact)} pts / 100 poss. de mieux quand ce joueur est sur le terrain que quand il est sur le banc.`);
    const lowImpact = topImpact[topImpact.length - 1];
    if (lowImpact && lowImpact !== topImpact[0] && lowImpact.impact <= -5) ins.push(`<b>${esc(lowImpact.name)}</b> : ${sg(lowImpact.impact)} pts / 100 poss. sur le terrain par rapport au banc — à creuser à la vidéo (associations, rôle).`);
    if (LA.duos[0]) ins.push(`<b>Meilleur duo</b> : ${LA.duos[0].players.map(esc).join(" + ")} (${sg(LA.duos[0].m.net)}).`);
    const lastDuo = LA.duos[LA.duos.length - 1];
    if (lastDuo && lastDuo !== LA.duos[0] && lastDuo.m.net < 0) ins.push(`<b>Duo qui souffre</b> : ${lastDuo.players.map(esc).join(" + ")} (${sg(lastDuo.m.net)}).`);
    const t = LA.total;
    lineupsHtml = `
    <section class="card">
      <h2><i></i>Les cinq</h2>
      <p class="hint">${LA.rows.length} cinq différents · efficacité nette = points marqués − points encaissés pour 100 possessions (vert ≥ +5, rouge ≤ −5). Fiable à partir de ${f(LA.minPoss, 0)} possessions.</p>
      ${ins.length ? `<ul class="bs-ins">${ins.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
      <div class="sub-title">Les plus utilisés</div>
      ${used.map((x, i) => lineupRow(x, i)).join("")}
      ${best.length ? `<div class="sub-title">Ceux qui fonctionnent</div>${best.map((x, i) => lineupRow(x, i)).join("")}` : ""}
      ${worst.length ? `<div class="sub-title">Ceux qui ne fonctionnent pas</div>${worst.map((x, i) => lineupRow(x, i, false)).join("")}` : ""}
    </section>
    <section class="card">
      <h2><i></i>Impact des joueurs (sur le terrain / sur le banc)</h2>
      <p class="hint">Efficacité nette de l'équipe quand le joueur est sur le terrain, puis quand il n'y est pas. L'écart mesure son impact (à relativiser avec peu de minutes).</p>
      <div class="bs-table"><table>
        <thead><tr><th>Joueur</th><th class="num">Temps</th><th class="num">Net sur le terrain</th><th class="num">Net sur le banc</th><th class="num">Impact</th><th class="num">eFG% / adv.</th></tr></thead>
        <tbody>${LA.players.map(x => `
          <tr><td class="tt">${esc(x.name)}</td><td class="num">${p(x.share)}</td>
          <td class="num">${sg(x.on.net)}</td><td class="num">${x.off ? sg(x.off.net) : "—"}</td>
          <td class="num"><span class="bs-act-p ${x.impact === null ? "" : x.impact >= 5 ? "bs-good" : x.impact <= -5 ? "bs-low" : ""}">${sg(x.impact)}</span></td>
          <td class="num">${p(x.on.efg)} / ${p(x.on.oppEfg)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="more">Temps = part des minutes jouées par les cinq du fichier.</p>
    </section>
    ${LA.duos.length ? `<section class="card">
      <h2><i></i>Les duos</h2>
      <p class="hint">Associations de deux joueurs vues sur au moins ${f(LA.minDuoPoss, 0)} possessions.</p>
      <div class="sub-title">Meilleurs duos</div>
      ${LA.duos.slice(0, 6).map(d => `<div class="mini-row">${chipsOf(d.players)}<span class="mini-count">${f(d.m.poss, 0)}<small style="font-size:10px"> poss.</small></span>${netBadge(d.m.net)}</div>`).join("")}
      ${LA.duos.length > 6 ? `<div class="sub-title">Duos les moins efficaces</div>
      ${LA.duos.slice(-Math.min(6, LA.duos.length - 6)).reverse().map(d => `<div class="mini-row">${chipsOf(d.players)}<span class="mini-count">${f(d.m.poss, 0)}<small style="font-size:10px"> poss.</small></span>${netBadge(d.m.net)}</div>`).join("")}` : ""}
    </section>` : ""}
    <section class="card">
      <h2><i></i>Toutes les associations confondues</h2>
      <div class="bs-kpis">
        <div class="bs-kpi"><b>${f(t.off, 0)}</b><span>pts marqués / 100 poss.</span></div>
        <div class="bs-kpi"><b>${f(t.def, 0)}</b><span>pts encaissés / 100 poss.</span></div>
        <div class="bs-kpi"><b>${p(t.efg)}</b><span>eFG% / ${p(t.oppEfg)} adv.</span></div>
        <div class="bs-kpi"><b>${p(t.tovPct)}</b><span>pertes / ${p(t.forcedTov)} forcées</span></div>
      </div>
    </section>`;
  }
  const boxHtml = box ? boxScoreReportHtml(box, a.name, null, true) : "";
  const empty = !LA && !box ? `<section class="card"><p class="notes-text" style="text-align:center;color:#1B2A4A80">Importe un fichier Excel (matchs ou cinq) pour voir l'analyse.</p></section>` : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analyse — ${esc(a.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${SCOUT_REPORT_CSS}
  .tl-sub{font-size:11.5px;color:#1B2A4A80;margin-top:6px}
  .rank-row .bar{display:none}
</style>
</head>
<body>
  <div class="page">
    <header class="hero">
      ${logo ? `<img src="${logo}" alt="Logo" class="hero-logo" />` : ""}
      <div class="kicker">Analyse de mon équipe</div>
      <h1>${esc(a.name)}</h1>
      <div class="meta">${[box?.fileName, a.lineupsFile].filter(Boolean).map(esc).join(" · ") || "Aucun fichier importé"}</div>
      ${kpis.length ? `<div class="kpis">${kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("")}</div>` : ""}
    </header>
    ${a.notes ? `<section class="card"><h2><i></i>Notes</h2><p class="notes-text">${esc(a.notes).replace(/\n/g, "<br>")}</p></section>` : ""}
    ${lineupsHtml}
    ${boxHtml}
    ${empty}
    <p class="stamp">Coaching Pro Boost · analyse générée le ${new Date().toLocaleDateString("fr-FR")} · version ${TEAM_REPORT_VERSION}</p>
  </div>
</body>
</html>`;
}

// Import d'un export XML de Sportscode. Structure lue (confirmée sur un export réel) :
// <instance><code>ATTAQUE</code><label><group>ENTREE</group><text>E_Horn</text></label>…</instance>.
// - Seules les instances qui portent des libellés sont des possessions (START/DEFENSE vides ignorées).
// - Les libellés d'un groupe "POINTS…" à valeur numérique (+2, +3, -2…) sont le RÉSULTAT de la
//   possession, pas sa définition : ils servent à calculer la rentabilité, pas à regrouper.
// - Les possessions aux mêmes libellés de définition (ENTREE + INTENTION…, dans le même ordre au sein
//   d'un groupe) forment une "attaque".
function parseSportscodeXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Fichier XML illisible.");
  const nodes = [...doc.getElementsByTagName("instance")];
  if (nodes.length === 0) throw new Error("Aucune instance trouvée dans ce XML (balise <instance> absente).");
  const txt = (el) => (el?.textContent || "").trim().replace(/\s+/g, " ");
  const all = nodes.map((n, pos) => ({
    pos, // position dans le fichier : permet de savoir si deux instances se suivent vraiment
    code: txt(n.getElementsByTagName("code")[0]),
    labels: [...n.getElementsByTagName("label")]
      .map(l => ({ group: txt(l.getElementsByTagName("group")[0]), text: txt(l.getElementsByTagName("text")[0]) || txt(l) }))
      .filter(l => l.text),
  }));
  const instances = all.filter(i => i.labels.length > 0);
  if (instances.length === 0) throw new Error("Aucune possession avec libellés dans ce XML.");
  return { instances, ignored: all.length - instances.length };
}

const isSportscodeResult = (l) => /^points/i.test(l.group || "") && /^[+-]?\d+$/.test(l.text);

function groupSportscodeInstances(instances, excludedKeys = [], excludedCodes = [], defenseGroups = [], ignoredGroups = []) {
  const exclL = new Set(excludedKeys), exclC = new Set(excludedCodes.map(c => c.toLowerCase()));
  // Groupes de libellés qui décrivent la DÉFENSE adverse (ex. SWITCH sur pick and roll) : ils ne
  // définissent pas l'attaque (sinon "Horn" et "Horn contre switch" seraient deux attaques) mais
  // servent à ventiler la rentabilité d'une même attaque selon la défense rencontrée.
  const defG = new Set(defenseGroups.map(g => g.toLowerCase()));
  const groupOf = (l) => (l.group || "Libellés").toLowerCase();
  const ignG = new Set(ignoredGroups.map(g => g.toLowerCase())); // groupes à ignorer entièrement (ex. joueurs)
  const groups = new Map();
  let lastGroup = null; // attaque de la possession précédente, pour rattacher les résultats "seuls"
  let lastDefKeys = []; // défenses de cette possession précédente
  let lastPlaceholder = false; // la possession précédente est-elle comptée à 0 faute de résultat (perte de balle) ?
  let lastPos = -10; // position (dans le fichier) de la dernière instance prise en compte
  // Une attaque "touche" (SLOB / BLOB) sans résultat suivie IMMÉDIATEMENT d'une autre attaque est
  // la même action : la remise en jeu et l'attaque qui en découle ne comptent qu'une possession.
  const isTouch = (x) => x.labels.some(l => /touche/i.test(l.group || "") || /^(slob|blob)$/i.test(l.text));
  const list = [];
  for (let i = 0; i < instances.length; i++) {
    const cur = instances[i], nxt = instances[i + 1];
    if (nxt && !exclC.has(cur.code.toLowerCase()) && cur.code === nxt.code && nxt.pos === cur.pos + 1
        && isTouch(cur) && !isTouch(nxt) && !cur.labels.some(isSportscodeResult) && !nxt.labels.every(isSportscodeResult)) {
      list.push({ ...nxt, labels: [...cur.labels, ...nxt.labels] }); i++; continue;
    }
    list.push(cur);
  }
  list.forEach(inst => {
    // Une séquence DEFENSE (ce que fait l'équipe scoutée en défense) n'est jamais une attaque : elle
    // alimente uniquement la section "Défense de l'équipe", quel que soit le réglage des codes.
    if (exclC.has(inst.code.toLowerCase()) || /^def/i.test(inst.code)) return;
    // Instance qui ne porte QUE des résultats (+1, +2, -1...) : suite de l'action précédente
    // (lancer franc, and-one...), jamais une possession de plus. Si la possession précédente
    // était comptée à 0 faute de résultat, c'est son résultat ; sinon ce sont des points en plus.
    if (inst.labels.every(isSportscodeResult)) {
      // Rattaché seulement s'il suit réellement la possession précédente dans le fichier (une
      // défense ou une instance non taguée entre les deux casse le lien).
      if (lastGroup && inst.pos === lastPos + 1) { lastPos = inst.pos; inst.labels.forEach(l => {
        const v = parseInt(l.text.replace("+", ""), 10);
        if (lastPlaceholder) {
          lastGroup.xmlOutcomes[lastGroup.xmlOutcomes.length - 1] = v;
          lastDefKeys.forEach(k => { const e = lastGroup.defMap.get(k); e.outcomes[e.outcomes.length - 1] = v; });
          lastPlaceholder = false;
        } else {
          lastGroup.xmlBonus.push(v);
          lastDefKeys.forEach(k => lastGroup.defMap.get(k).bonus.push(v));
        }
      }); }
      return;
    }
    const usable = inst.labels.filter(l => !isSportscodeResult(l) && !exclL.has(l.text.toLowerCase()) && !ignG.has(groupOf(l)));
    const defining = [...new Map(usable.filter(l => !defG.has(groupOf(l))).map(l => [l.text.toLowerCase(), l])).values()];
    if (defining.length === 0) {
      // Possession qu'aucun libellé de système ne décrit (ex. seulement une défense adverse) : pas
      // d'attaque à créer, et les résultats seuls qui suivent ne doivent pas se rattacher à une
      // autre attaque plus ancienne.
      lastGroup = null; lastDefKeys = []; lastPlaceholder = false; lastPos = inst.pos;
      return;
    }
    const defs = [...new Map(usable.filter(l => defG.has(groupOf(l))).map(l => [groupOf(l) + "|" + l.text.toLowerCase(), { text: l.text, group: l.group || "Libellés" }])).values()];
    // L'ordre compte à l'intérieur d'un groupe (ex. ENTREE : Iverson puis Diamand ≠ Diamand
    // puis Iverson, c'est le déroulé du système) ; l'ordre ENTRE groupes est normalisé.
    const byGroup = new Map();
    defining.forEach(l => { const g = (l.group || "").toLowerCase(); byGroup.set(g, [...(byGroup.get(g) || []), l.text.toLowerCase()]); });
    const key = [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([g, t]) => g + ":" + t.join(">")).join("|");
    const g = groups.get(key) || { key, labels: defining, count: 0, xmlOutcomes: [], xmlBonus: [], defMap: new Map() };
    g.count++;
    lastGroup = g; lastPos = inst.pos;
    // Pas de résultat = perte de balle : possession jouée, 0 point (sauf si un résultat seul suit,
    // typiquement des lancers francs, qui prend alors la place de ce 0).
    // Premier résultat = résultat de la possession ; résultats suivants dans la même instance
    // (ex. -2 puis rebond offensif et +3) = points en plus sur cette même possession.
    const results = inst.labels.filter(isSportscodeResult).map(l => parseInt(l.text.replace("+", ""), 10));
    const value = results.length ? results[0] : 0;
    g.xmlOutcomes.push(value);
    results.slice(1).forEach(v => g.xmlBonus.push(v));
    lastPlaceholder = results.length === 0;
    lastDefKeys = defs.map(d => d.group.toLowerCase() + "|" + d.text.toLowerCase());
    defs.forEach(d => {
      const k = d.group.toLowerCase() + "|" + d.text.toLowerCase(), e = g.defMap.get(k) || { label: d.text, group: d.group, outcomes: [], bonus: [] };
      e.outcomes.push(value); results.slice(1).forEach(v => e.bonus.push(v)); g.defMap.set(k, e);
    });
    groups.set(key, g);
  });
  return [...groups.values()]
    .map(({ defMap, ...g }) => ({ ...g, byDefense: [...defMap.values()].sort((a, b) => b.outcomes.length - a.outcomes.length || a.label.localeCompare(b.label, "fr")) }))
    .sort((a, b) => b.count - a.count || a.labels.map(l => l.text).join().localeCompare(b.labels.map(l => l.text).join(), "fr"));
}

// Séquences de DÉFENSE de l'équipe scoutée (code DEFENSE) : leurs libellés (écrans, écrans non
// porteur, post up, intention adverse...) alimentent les camemberts "Défense de l'équipe".
function collectSportscodeDefense(instances, ignoredGroups = [], excludedKeys = [], keepGroups = null) {
  const ign = new Set(ignoredGroups.map(g => g.toLowerCase())), exl = new Set(excludedKeys);
  const keep = keepGroups ? new Set(keepGroups.map(g => g.toLowerCase())) : null;
  return instances.filter(i => /^def/i.test(i.code))
    .map(i => i.labels
      .filter(l => {
        const g = (l.group || "Libellés").toLowerCase();
        if (isSportscodeResult(l) || ign.has(g) || exl.has(l.text.toLowerCase())) return false;
        // L'intention adverse est toujours gardée (elle sert de clé de lecture) ; le reste est limité
        // aux groupes choisis pour les camemberts (écrans, écrans non porteur, post up...).
        return !keep || keep.has(g) || /intention/i.test(g);
      })
      .map(l => ({ group: l.group || "Libellés", text: l.text })))
    .filter(ls => ls.some(l => !/intention/i.test(l.group)));
}

// Rentabilité d'une attaque face à UNE défense (entrée de byDefense) : même calcul que attackStats.
function defenseStats(e) {
  const all = [...(e.outcomes || []), ...(e.bonus || [])];
  const points = all.reduce((s, v) => s + (v > 0 ? v : 0), 0);
  const possible = all.reduce((s, v) => s + Math.abs(v), 0);
  const n = (e.outcomes || []).length;
  return { points, possible, count: n, ppp: n ? points / n : null };
}

// Catégorie d'une attaque : Transition (phase de jeu transi / jeu rapide), BLOB, SLOB, sinon
// "Attaque placée" par défaut. Partagée par l'export et l'envoi vers le Playbook.
function attackCategoryOf(a) {
  const L = (a.labels || []).filter(l => typeof l !== "string");
  if (L.some(l => /phase/i.test(l.group || "") || /transi|jeu rapide/i.test(l.text))) return "Transition";
  if (L.some(l => /^blob$/i.test(l.text) || /fond/i.test(l.group || ""))) return "BLOB";
  if (L.some(l => /^slob$/i.test(l.text) || /side/i.test(l.group || ""))) return "SLOB";
  return "Attaque placée";
}

// Prépare les attaques pour le classement (export / vue globale) : retire des libellés d'attaque ce
// qui n'en définit pas une (défenses adverses, joueurs, marqueurs de montage, "rebond off"...), puis
// regroupe. Règles demandées par Thibaud le 06/10 : les mêmes entrées jouées dans un ordre différent
// = la même attaque, affichée dans l'ordre le plus joué ; l'intention ne sépare plus deux attaques :
// la plus jouée est gardée (mainIntention), les autres sont listées à titre indicatif.
const ATTACK_HIDDEN_GROUP_RE = /def|[eé]cran|porteur|post ?up|joueur|player|nom\b|montage|tag ?up/i;
function mergeAttacksForDisplay(attacks) {
  const hidden = ATTACK_HIDDEN_GROUP_RE;
  const isEntry = (l) => typeof l !== "string" && /entr[ée]e/i.test(l.group || "");
  const isInt = (l) => typeof l !== "string" && /intention/i.test(l.group || "");
  const low = (l) => attackLabelText(l).toLowerCase();
  const copyDef = (d) => ({ ...d, outcomes: [...(d.outcomes || [])], bonus: [...(d.bonus || [])] });
  const merged = new Map();
  attacks.forEach(a => {
    const labels = (a.labels || []).filter(l => typeof l === "string" || !hidden.test(l.group || ""));
    if (labels.length === 0) return;
    const entries = labels.filter(isEntry), ints = labels.filter(isInt), others = labels.filter(l => !isEntry(l) && !isInt(l));
    const byGroup = new Map();
    [...entries, ...others].forEach(l => { const g = typeof l === "string" ? "" : (l.group || "").toLowerCase(); byGroup.set(g, [...(byGroup.get(g) || []), low(l)]); });
    // Clé sans ordre (entrées triées) et sans intention ; une attaque décrite seulement par une
    // intention garde une clé à elle (elle est de toute façon écartée du classement).
    const key = [...byGroup.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([g, t]) => g + ":" + [...t].sort().join("+")).join("|")
      || "intention:" + ints.map(low).sort().join("+");
    let m = merged.get(key);
    if (!m) {
      m = { ...a, key, memberKeys: [], name: "", count: 0, xmlOutcomes: [], xmlBonus: [], outcomes: [], byDefense: [], _orders: new Map(), _ints: new Map(), _others: others, _nameCount: 0 };
      merged.set(key, m);
    }
    m.memberKeys.push(a.key);
    m.count += a.count;
    if (a.name && a.count > m._nameCount) { m.name = a.name; m._nameCount = a.count; }
    const orderKey = entries.map(low).join(">");
    const o = m._orders.get(orderKey) || { labels: entries, count: 0 };
    o.count += a.count; m._orders.set(orderKey, o);
    [...new Map(ints.map(l => [low(l), l])).values()].forEach(l => { const e = m._ints.get(low(l)) || { label: l, count: 0 }; e.count += a.count; m._ints.set(low(l), e); });
    m.xmlOutcomes.push(...(a.xmlOutcomes || [])); m.xmlBonus.push(...(a.xmlBonus || [])); m.outcomes.push(...(a.outcomes || []));
    (a.byDefense || []).forEach(d => {
      const k = (d.group || "") + "|" + d.label.toLowerCase();
      const e = m.byDefense.find(x => (x.group || "") + "|" + x.label.toLowerCase() === k);
      if (e) { e.outcomes.push(...(d.outcomes || [])); e.bonus.push(...(d.bonus || [])); } else m.byDefense.push(copyDef(d));
    });
  });
  return [...merged.values()].map(m => {
    const { _orders, _ints, _others, _nameCount, ...rest } = m;
    const order = [..._orders.values()].sort((x, y) => y.count - x.count)[0];
    const ints = [..._ints.values()].sort((x, y) => y.count - x.count);
    return {
      ...rest,
      labels: [...(order ? order.labels : []), ...(ints[0] ? [ints[0].label] : []), ..._others],
      mainIntention: ints[0] ? { text: attackLabelText(ints[0].label), count: ints[0].count } : null,
      otherIntentions: ints.slice(1).map(e => ({ text: attackLabelText(e.label), count: e.count })),
      orderVariants: _orders.size,
    };
  });
}
// Relie les plays du Playbook (équipe scoutée) aux attaques regroupées : par le nom du play (= nom
// donné à l'attaque), par la clé d'origine (play créé via « ➜ Playbook »), sinon par ses entrées
// (mots-clés du play = mêmes entrées, quel que soit l'ordre). Chaque attaque ne compte que pour un
// play. Rentabilité = résultats du XML + comptage manuel de la session (tally).
function matchPlaysToAttacks(teamPlays, mergedAttacks, tally = {}) {
  const norm = (s) => String(s ?? "").toLowerCase().replace(/^e_/, "").replace(/\s+/g, " ").trim();
  const entriesOf = (g) => (g.labels || []).filter(l => typeof l !== "string" && /entr[ée]e/i.test(l.group || "")).map(l => norm(l.text));
  const vocab = new Set(mergedAttacks.flatMap(entriesOf));
  const rows = teamPlays.map(p => ({ play: p, groups: [], tagSet: [...new Set((p.tags || []).map(norm).filter(t => vocab.has(t)))].sort().join("+") }));
  mergedAttacks.forEach(g => {
    const entSet = [...new Set(entriesOf(g))].sort().join("+");
    const r = (g.name && rows.find(x => norm(x.play.titre) === norm(g.name)))
      || rows.find(x => (x.play.sourceAttackKeys || []).some(k => (g.memberKeys || [g.key]).includes(k)))
      || (entSet && rows.find(x => x.tagSet === entSet));
    if (r) r.groups.push(g);
  });
  return rows.map(r => {
    const st = r.groups.map(attackStats);
    const man = tally[r.play.id];
    const manPlayed = typeof man === "number" ? man : (man?.played || 0), manPts = typeof man === "number" ? 0 : (man?.points || 0);
    const videoCount = r.groups.reduce((s, g) => s + g.count, 0);
    const points = st.reduce((s, x) => s + x.points, 0) + manPts, resolved = st.reduce((s, x) => s + x.resolved, 0) + manPlayed;
    const ints = new Map();
    r.groups.forEach(g => [g.mainIntention, ...(g.otherIntentions || [])].filter(Boolean).forEach(i => {
      const e = ints.get(i.text.toLowerCase()) || { text: i.text, count: 0 }; e.count += i.count; ints.set(i.text.toLowerCase(), e);
    }));
    return { play: r.play, groups: r.groups, count: videoCount + manPlayed, videoCount, manualCount: manPlayed, points, resolved,
      ppp: resolved ? points / resolved : null, intentions: [...ints.values()].sort((a, b) => b.count - a.count) };
  }).sort((a, b) => b.count - a.count || String(a.play.titre || "").localeCompare(String(b.play.titre || ""), "fr"));
}

// Résultats d'une attaque : ceux lus dans le XML + ceux ajoutés à la main (+3 +2 +1 0 -2 -3).
function attackStats(a) {
  // Un résultat n'est jamais une possession de plus : les premiers résultats (du XML puis saisis
  // à la main) renseignent les possessions encore sans résultat, dans la limite de `count` ;
  // tout résultat au-delà (lancers francs, and-one...) s'ajoute en points sur ces possessions.
  const all = [...(a.xmlOutcomes || []), ...(a.outcomes || [])];
  const results = all.slice(0, a.count || all.length);
  const extra = [...all.slice(a.count || all.length), ...(a.xmlBonus || [])];
  const points = [...results, ...extra].reduce((s, v) => s + (v > 0 ? v : 0), 0);
  const possible = [...results, ...extra].reduce((s, v) => s + Math.abs(v), 0);
  return { points, possible, resolved: results.length, ppp: results.length ? points / results.length : null };
}
const attackLabelText = (l) => typeof l === "string" ? l : l.text;

// Statistiques sur ce qui a été tagué dans le Playbook (types, mots-clés, temps forts, combinaisons
// de mots-clés) — calculées sur les plays passés en paramètre (typiquement filtrés sur une équipe
// scoutée). Comptage insensible à la casse/aux espaces ("Stagger " = "stagger", "ZONE" = "Zone"),
// chaque mot-clé compté une seule fois par play.
function computePlaybookStats(plays, typeOrder = []) {
  const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  const keyOf = (s) => norm(s).toLowerCase();
  const tfOfPlay = (p) => Array.isArray(p.tempsFort) ? p.tempsFort : (p.tempsFort ? [p.tempsFort] : []);
  const canonType = (t) => typeOrder.find(x => keyOf(x) === keyOf(t)) || norm(t) || "Sans catégorie";
  const bump = (map, label) => {
    const k = keyOf(label); if (!k) return null;
    const e = map.get(k) || { label: norm(label), count: 0 };
    e.count++; map.set(k, e); return k;
  };
  const sortDesc = (arr) => arr.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));

  const types = new Map(), tags = new Map(), tfs = new Map(), tagsByType = new Map(), pairs = new Map();
  let untagged = 0;
  plays.forEach(p => {
    const type = canonType(p.type);
    bump(types, type);
    const uniqTags = [...new Map((p.tags || []).map(t => [keyOf(t), norm(t)]).filter(([k]) => k)).values()];
    if (uniqTags.length === 0) untagged++;
    uniqTags.forEach(t => bump(tags, t));
    if (!tagsByType.has(keyOf(type))) tagsByType.set(keyOf(type), { type, total: 0, tags: new Map() });
    const tb = tagsByType.get(keyOf(type)); tb.total++;
    uniqTags.forEach(t => bump(tb.tags, t));
    [...new Map(tfOfPlay(p).map(t => [keyOf(t), norm(t)]).filter(([k]) => k)).values()].forEach(t => bump(tfs, t));
    const sortedTags = uniqTags.map(t => ({ k: keyOf(t), label: t })).sort((a, b) => a.k.localeCompare(b.k));
    for (let i = 0; i < sortedTags.length; i++) for (let j = i + 1; j < sortedTags.length; j++) {
      const k = sortedTags[i].k + "||" + sortedTags[j].k;
      const e = pairs.get(k) || { a: sortedTags[i].label, b: sortedTags[j].label, label: `${sortedTags[i].label} + ${sortedTags[j].label}`, count: 0 };
      e.count++; pairs.set(k, e);
    }
  });
  const rank = (t) => { const i = typeOrder.findIndex(x => keyOf(x) === keyOf(t)); return i === -1 ? typeOrder.length : i; };
  return {
    total: plays.length,
    untagged,
    byType: [...types.values()].sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count),
    tags: sortDesc([...tags.values()]),
    tempsForts: sortDesc([...tfs.values()]),
    tagsByType: [...tagsByType.values()]
      .sort((a, b) => rank(a.type) - rank(b.type))
      .map(g => ({ type: g.type, total: g.total, tags: sortDesc([...g.tags.values()]) })),
    pairs: sortDesc([...pairs.values()]).filter(x => x.count >= 2),
  };
}

// Barres horizontales "label — barre — compte (pourcentage)" réutilisées dans la vue et l'export.
function PlaybookStatBars({ items, total, limit = 12, color = "#FF6B35" }) {
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map(i => i.count));
  if (shown.length === 0) return <p className="text-xs text-[#1B2A4A]/40 italic">Rien de tagué pour l'instant.</p>;
  return (
    <div className="space-y-1.5">
      {shown.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <div className="w-32 sm:w-40 text-xs font-medium text-[#1B2A4A] truncate flex-shrink-0" title={i.label}>{i.label}</div>
          <div className="flex-1 bg-[#1B2A4A]/8 rounded h-3.5 overflow-hidden">
            <div className="h-full rounded" style={{ width: `${Math.round((i.count / max) * 100)}%`, backgroundColor: color }} />
          </div>
          <div className="w-16 text-right text-xs font-bold text-[#1B2A4A] flex-shrink-0">{i.count} <span className="font-normal text-[#1B2A4A]/40">· {total ? Math.round((i.count / total) * 100) : 0}%</span></div>
        </div>
      ))}
      {items.length > limit && <p className="text-[10px] text-[#1B2A4A]/40">+ {items.length - limit} autre{items.length - limit > 1 ? "s" : ""}</p>}
    </div>
  );
}

function PlaybookStatsView({ stats, title, onClose, onExport }) {
  const Section = ({ heading, children }) => (
    <div className="bg-white rounded-xl border border-[#1B2A4A]/10 p-4">
      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-3">{heading}</div>
      {children}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[500] bg-[#F2EDE4] flex flex-col no-print">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1B2A4A] flex-shrink-0 gap-3">
        <div className="text-white font-bold text-sm truncate" style={{ fontFamily: "Oswald, sans-serif" }}>STATS DU PLAYBOOK — {title}</div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={onExport} className="text-xs font-semibold text-white px-3 py-1.5 rounded-md" style={{ backgroundColor: "#2563EB" }}>📤 Exporter</button>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={22} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-sm text-[#1B2A4A]/60">
            <strong className="text-[#1B2A4A]">{stats.total}</strong> play{stats.total > 1 ? "s" : ""} analysé{stats.total > 1 ? "s" : ""}
            {stats.untagged > 0 && <> · {stats.untagged} sans mot-clé</>}
          </p>
          <Section heading="Répartition par type"><PlaybookStatBars items={stats.byType} total={stats.total} color="#1B2A4A" /></Section>
          <Section heading="Mots-clés les plus utilisés"><PlaybookStatBars items={stats.tags} total={stats.total} limit={15} /></Section>
          {stats.tempsForts.length > 0 && (
            <Section heading="Temps forts les plus utilisés"><PlaybookStatBars items={stats.tempsForts} total={stats.total} color="#2563EB" /></Section>
          )}
          {stats.pairs.length > 0 && (
            <Section heading="Mots-clés qui reviennent ensemble"><PlaybookStatBars items={stats.pairs} total={stats.total} limit={10} color="#22c55e" /></Section>
          )}
          <Section heading="Mots-clés par type">
            <div className="space-y-4">
              {stats.tagsByType.map(g => (
                <div key={g.type}>
                  <div className="text-sm font-bold text-[#1B2A4A] mb-1.5" style={{ fontFamily: "Oswald, sans-serif" }}>{g.type} <span className="text-xs font-normal text-[#1B2A4A]/40">· {g.total} play{g.total > 1 ? "s" : ""}</span></div>
                  <PlaybookStatBars items={g.tags} total={g.total} limit={8} />
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// Export HTML autonome du même rapport de stats (même habillage que les autres récaps).
function buildPlaybookStatsReportHtml(stats, title, logo = null) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const bars = (items, total, limit = 12, color = "#FF6B35") => {
    const shown = items.slice(0, limit);
    if (shown.length === 0) return `<p class="none">Rien de tagué pour l'instant.</p>`;
    const max = Math.max(1, ...shown.map(i => i.count));
    return shown.map(i => `
      <div class="bar-row">
        <div class="bar-label" title="${esc(i.label)}">${esc(i.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((i.count / max) * 100)}%;background:${color}"></div></div>
        <div class="bar-value">${i.count} <span>· ${total ? Math.round((i.count / total) * 100) : 0}%</span></div>
      </div>`).join("") + (items.length > limit ? `<p class="more">+ ${items.length - limit} autre${items.length - limit > 1 ? "s" : ""}</p>` : "");
  };
  const block = (heading, inner) => `<div class="block"><div class="block-title">${esc(heading)}</div>${inner}</div>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Stats Playbook — ${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#F2EDE4;color:#1B2A4A;padding:24px}
  .card{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .header{background:#1B2A4A;color:#fff;padding:24px}
  .header-logo{width:44px;height:44px;object-fit:contain;border-radius:8px;background:#fff;padding:4px;margin-bottom:10px}
  .kicker{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#FF6B35;font-weight:700;margin-bottom:4px}
  .header h1{font-family:'Oswald',sans-serif;font-size:24px}
  .meta{color:rgba(255,255,255,.65);font-size:13px;margin-top:6px}
  .block{padding:18px 20px;border-top:1px solid #1B2A4A0f;page-break-inside:avoid}
  .block-title{font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:#1B2A4A80;font-weight:600;margin-bottom:12px}
  .sub{font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;margin:14px 0 6px}
  .sub span{font-family:'Inter',sans-serif;font-size:11px;font-weight:400;color:#1B2A4A60}
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:7px}
  .bar-label{width:160px;font-size:12px;font-weight:600;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar-track{flex:1;background:#1B2A4A0d;border-radius:5px;height:14px;overflow:hidden}
  .bar-fill{height:100%;border-radius:5px}
  .bar-value{width:72px;flex-shrink:0;font-size:12px;font-weight:700;text-align:right}
  .bar-value span{font-weight:400;color:#1B2A4A60}
  .none,.more{font-size:11px;color:#1B2A4A60;font-style:italic}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="Logo" class="header-logo" />` : ""}
      <div class="kicker">Stats du Playbook</div>
      <h1>${esc(title)}</h1>
      <div class="meta">${stats.total} play${stats.total > 1 ? "s" : ""} analysé${stats.total > 1 ? "s" : ""}${stats.untagged > 0 ? ` · ${stats.untagged} sans mot-clé` : ""}</div>
    </div>
    ${block("Répartition par type", bars(stats.byType, stats.total, 12, "#1B2A4A"))}
    ${block("Mots-clés les plus utilisés", bars(stats.tags, stats.total, 15))}
    ${stats.tempsForts.length > 0 ? block("Temps forts les plus utilisés", bars(stats.tempsForts, stats.total, 12, "#2563EB")) : ""}
    ${stats.pairs.length > 0 ? block("Mots-clés qui reviennent ensemble", bars(stats.pairs, stats.total, 10, "#22c55e")) : ""}
    ${block("Mots-clés par type", stats.tagsByType.map(g => `<div class="sub">${esc(g.type)} <span>· ${g.total} play${g.total > 1 ? "s" : ""}</span></div>${bars(g.tags, g.total, 8)}`).join(""))}
  </div>
</body>
</html>`;
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

function FileDrop({ file, onChange, cpbAlert }) {
  const inputRef = useRef();
  const cameraRef = useRef();
  const [cropSource, setCropSource] = useState(null);
  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { cpbAlert?.("Fichier trop lourd (max 20 Mo)."); return; }
    if (f.type.startsWith("image/")) {
      try {
        const data = await readImageAsJpeg(f, 1600, 0.8);
        setCropSource(data);
      } catch { cpbAlert?.("Impossible de lire l'image."); }
    } else {
      const reader = new FileReader();
      reader.onload = () => onChange({ name: f.name, type: f.type, data: reader.result });
      reader.readAsDataURL(f);
    }
  };
  const handleCropped = (dataUrl) => {
    setCropSource(null);
    onChange({ name: "photo.jpg", type: "image/jpeg", data: dataUrl });
  };
  if (cropSource) {
    return <CropPhotoView imageData={cropSource} onCancel={() => setCropSource(null)} onCrop={handleCropped} />;
  }
  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {!file ? (
        <div className="grid grid-cols-2 gap-2" data-tour="exercise-photo">
          <button type="button" onClick={() => cameraRef.current.click()}
            className="border-2 border-dashed border-[#1B2A4A]/30 rounded-lg py-5 flex flex-col items-center gap-2 text-[#1B2A4A]/60 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <Camera size={20} /><span className="text-xs">Prendre une photo</span>
          </button>
          <button type="button" onClick={() => inputRef.current.click()}
            className="border-2 border-dashed border-[#1B2A4A]/30 rounded-lg py-5 flex flex-col items-center gap-2 text-[#1B2A4A]/60 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <Upload size={20} /><span className="text-xs">Galerie / PDF</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border border-[#1B2A4A]/20 rounded-lg px-3 py-2 bg-white/60">
          <div className="flex items-center gap-2 text-sm text-[#1B2A4A]">
            {file.type === "application/pdf" ? <FileText size={16} /> : <ImageIcon size={16} />}
            <span className="truncate max-w-[180px]">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {file.type?.startsWith("image/") && file.data && (
              <button type="button" onClick={() => setCropSource(file.data)} className="text-[#1B2A4A]/50 hover:text-[#FF6B35]" title="Rogner"><ImageIcon size={16} /></button>
            )}
            <button type="button" onClick={() => onChange(null)} className="text-[#1B2A4A]/50 hover:text-red-600"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function useSchemasData(ex) {
  const [schemas, setSchemas] = React.useState(ex.schemas || []);
  React.useEffect(() => {
    if (ex.schemas?.length) { setSchemas(ex.schemas); return; }
    if (!ex.id || !ex.schemaCount) { setSchemas([]); return; }
    let active = true;
    (async () => {
      try {
        const r = await storage.get(`schemas:${ex.id}`);
        if (r && active) setSchemas(JSON.parse(r.value) || []);
      } catch {}
    })();
    return () => { active = false; };
  }, [ex.id, ex.schemaCount]);
  return schemas;
}

// Carrousel réutilisable (carte claire, ombre douce, glisser au doigt, points cliquables).
// `card=true` : le carrousel dessine sa propre carte blanche arrondie avec ombre (usage autonome).
// `card=false` : pas de carte propre, on suppose que le parent fournit déjà le cadre (évite les cartes imbriquées).
function MediaCarousel({ items, index, onIndexChange, card = true, height = "h-48", overlay, onClickImage }) {
  const touchStartX = React.useRef(null);
  const touchDeltaX = React.useRef(0);
  if (!items || items.length === 0) return null;
  const idx = Math.min(index, items.length - 1);
  const go = (i) => onIndexChange((i + items.length) % items.length);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; };
  const onTouchMove = (e) => { if (touchStartX.current != null) touchDeltaX.current = e.touches[0].clientX - touchStartX.current; };
  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 40) go(idx + (touchDeltaX.current < 0 ? 1 : -1));
    touchStartX.current = null; touchDeltaX.current = 0;
  };
  return (
    <div className={card ? "bg-white rounded-2xl shadow-lg shadow-[#1B2A4A]/15 border border-[#1B2A4A]/5 overflow-hidden" : ""}>
      <div className="relative select-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={onClickImage}>
        <img key={idx} src={items[idx]} alt="" className={`w-full ${height} object-contain bg-white animate-carousel-fade`} />
        {overlay}
        {items.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(idx - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[#1B2A4A] hover:bg-[#FF6B35] hover:text-white transition-colors">
              <ChevronRight size={15} className="rotate-180" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(idx + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[#1B2A4A] hover:bg-[#FF6B35] hover:text-white transition-colors">
              <ChevronRight size={15} />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-white">
          {items.map((_, i) => (
            <button type="button" key={i} onClick={(e) => { e.stopPropagation(); onIndexChange(i); }}
              className={`rounded-full transition-all ${i === idx ? "w-2.5 h-2.5 bg-[#FF6B35]" : "w-2 h-2 bg-[#1B2A4A]/15 hover:bg-[#1B2A4A]/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// Bouton "Réseaux" : compose côté navigateur un visuel prêt à publier (post carré 1080×1080
// ou story 1080×1920) à partir de la photo/du schéma affiché et le télécharge directement —
// pas d'aller-retour serveur, réutilise composeSocialImage/downloadBlob (voir src/App.jsx:~604).
function SocialExportButton({ items, title, subtitle, filenameBase }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  // Accepte soit un tableau de chaînes (photos brutes), soit d'objets { src, caption }
  // (annotation par vignette, ex: temps fort d'un play) — normalisé ici une fois pour toutes.
  const list = (items || [])
    .map(it => typeof it === "string" ? { src: it, caption: null } : it)
    .filter(it => it?.src);
  const count = list.length;

  // Une vignette = un fichier téléchargé : plusieurs photos/schémas donnent autant de PNG
  // (numérotés) plutôt qu'un seul visuel basé sur la vignette affichée au moment du clic.
  const handleExport = async (format) => {
    setOpen(false);
    if (count === 0) return;
    setExporting(true);
    try {
      for (let i = 0; i < count; i++) {
        const blob = await composeSocialImage({ photoDataUrl: list[i].src, caption: list[i].caption, title, subtitle, format });
        const suffix = count > 1 ? `-${i + 1}` : "";
        downloadBlob(blob, `${slugifyForFile(filenameBase)}-${format === "story" ? "story" : "post"}${suffix}.png`);
        if (i < count - 1) await new Promise(r => setTimeout(r, 300));
      }
    } catch {
      toast?.("Impossible de générer l'image.");
    }
    setExporting(false);
  };

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} disabled={exporting || count === 0}
        className="flex items-center gap-1.5 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A] disabled:opacity-50">
        <Share2 size={16} /> {exporting ? "Génération..." : count > 1 ? `Réseaux (${count})` : "Réseaux"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-[#1B2A4A]/10 py-1 w-60" onClick={e => e.stopPropagation()}>
            <button onClick={() => handleExport("post")} className="w-full text-left px-3 py-2 text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5">
              Post carré (1080×1080){count > 1 ? ` · ${count} fichiers` : ""}
            </button>
            <button onClick={() => handleExport("story")} className="w-full text-left px-3 py-2 text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5">
              Story (1080×1920){count > 1 ? ` · ${count} fichiers` : ""}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExerciseFormImagePreview({ ex }) {
  const fileImage = useFileImage(ex);
  if (!fileImage || !ex.file?.type?.startsWith("image/")) return null;
  return <img src={fileImage} alt="" className="w-full rounded-lg border border-[#1B2A4A]/15" />;
}

function ExerciseForm({ themes, onSave, onCancel, initial, cpbAlert, saveThemes, saveFormats, sportPhases = PHASES, sportFormats = FORMATS, sportCategories = CATEGORIES, courtType = "basketball", autoOpenDraw = false }) {
  const [titre, setTitre] = useState(initial?.titre || "");
  const [sel, setSel] = useState(initial?.themes || []);
  const [phases, setPhases] = useState(initial?.phases || []);
  const [format, setFormat] = useState(initial?.format || sportFormats[0]);
  const [niveau, setNiveau] = useState(initial?.niveau || NIVEAUX[1]);
  // categorie est un tableau (plusieurs catégories possibles, ex U13+U15+U18) ; les exercices
  // enregistrés avant ce changement ont une simple chaîne, on la ramène en tableau à l'ouverture.
  const [categorie, setCategorie] = useState(() => {
    if (Array.isArray(initial?.categorie)) return initial.categorie;
    return initial?.categorie ? [initial.categorie] : [];
  });
  const [duree, setDuree] = useState(initial?.duree || 10);
  const [objectif, setObjectif] = useState(initial?.objectif || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [file, setFile] = useState(initial?.file?.name !== "schema.png" ? (initial?.file || null) : null);
  const [schemas, setSchemas] = useState(() => {
    if (initial?.schemas?.length) return initial.schemas;
    if (initial?.file?.name === "schema.png" && initial.file.data) return [initial.file.data];
    return [];
  });
  const extraPhotoInputRef = useRef();
  // Un exercice rouvert pour édition n'a que `schemaCount` (les schémas sont stockés à part,
  // schemas:{id}) — sans ce chargement lazy, les schémas déjà dessinés semblent avoir disparu.
  useEffect(() => {
    if (!initial?.id || initial?.schemas?.length || !initial?.schemaCount) return;
    let active = true;
    (async () => {
      try {
        const r = await storage.get(`schemas:${initial.id}`);
        if (r && active) setSchemas(JSON.parse(r.value) || []);
      } catch {}
    })();
    return () => { active = false; };
  }, [initial?.id, initial?.schemaCount]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [extraCropSource, setExtraCropSource] = useState(null);
  const hasFilePhoto = file?.type?.startsWith("image/") && !!file?.data;
  const [editingSchemaIdx, setEditingSchemaIdx] = useState(autoOpenDraw ? 0 : null);
  const [lastMaterial, setLastMaterial] = useState(null);
  const [newTheme, setNewTheme] = useState("");
  const [themesOpen, setThemesOpen] = useState(false);
  const [newFormat, setNewFormat] = useState("");
  const [newFormatOpen, setNewFormatOpen] = useState(false);
  const [showDraw, setShowDraw] = useState(autoOpenDraw);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const addTheme = () => {
    const t = newTheme.trim();
    if (!t) return;
    if (!themes.includes(t) && saveThemes) saveThemes([...themes, t]);
    if (!sel.includes(t)) setSel(prev => [...prev, t]);
    setNewTheme("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
      <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'exercice"
        className="w-full text-lg font-semibold bg-transparent border-b-2 border-[#1B2A4A]/20 focus:border-[#FF6B35] outline-none pb-1 text-[#1B2A4A]" />
      <div className="border border-[#1B2A4A]/15 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setThemesOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/40 hover:bg-white/70 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/60 font-semibold">Thèmes tactiques</span>
            {sel.length > 0 && <span className="text-[10px] font-bold bg-[#FF6B35] text-white rounded-full px-1.5 py-0.5">{sel.length}</span>}
          </div>
          <svg className={`w-4 h-4 text-[#1B2A4A]/40 transition-transform ${themesOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {sel.length > 0 && !themesOpen && (
          <div className="px-4 py-2 bg-white/20 flex flex-wrap gap-1.5 border-t border-[#1B2A4A]/10">
            {sel.map(t => <Tag key={t} active color="orange" onClick={() => toggle(sel, setSel, t)}>{t}</Tag>)}
          </div>
        )}
        {themesOpen && (
          <div className="px-4 py-3 bg-white/20 border-t border-[#1B2A4A]/10 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {[...themes]
                .sort((a, b) => a.localeCompare(b, "fr"))
                .filter(t => t.toLowerCase().includes(newTheme.trim().toLowerCase()))
                .map(t => <Tag key={t} active={sel.includes(t)} onClick={() => toggle(sel, setSel, t)} color="orange">{t}</Tag>)}
              {newTheme.trim() && !themes.some(t => t.toLowerCase().includes(newTheme.trim().toLowerCase())) && (
                <p className="text-xs text-[#1B2A4A]/40 w-full">Aucun thème existant ne correspond.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input value={newTheme} onChange={e => setNewTheme(e.target.value)} onKeyDown={e => e.key === "Enter" && addTheme()}
                placeholder="Rechercher ou + nouveau thème..."
                className="flex-1 text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1.5 focus:outline-none focus:border-[#FF6B35] bg-white/60" />
              {newTheme.trim() && !themes.some(t => t.toLowerCase() === newTheme.trim().toLowerCase()) && (
                <button type="button" onClick={addTheme} className="text-xs px-3 py-1.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded-full font-medium hover:bg-[#FF6B35]/20">+ Ajouter "{newTheme.trim()}"</button>
              )}
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Phase de séance</div>
        <div className="flex flex-wrap gap-1.5">{sportPhases.map(p => <Tag key={p} active={phases.includes(p)} onClick={() => toggle(phases, setPhases, p)}>{p}</Tag>)}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Catégories</div>
        <div className="flex flex-wrap gap-1.5">{sportCategories.map(c => <Tag key={c} active={categorie.includes(c)} onClick={() => toggle(categorie, setCategorie, c)}>{c}</Tag>)}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Format</div>
          <select value={format} onChange={e => setFormat(e.target.value)} className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60">{sportFormats.map(f => <option key={f}>{f}</option>)}</select>
          {newFormatOpen ? (
            <div className="flex items-center gap-1 mt-1">
              <input autoFocus value={newFormat} onChange={e => setNewFormat(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const f = newFormat.trim();
                    if (f) {
                      if (!sportFormats.includes(f) && saveFormats) saveFormats([...sportFormats, f]);
                      setFormat(f);
                    }
                    setNewFormat(""); setNewFormatOpen(false);
                  }
                  if (e.key === "Escape") { setNewFormat(""); setNewFormatOpen(false); }
                }}
                placeholder="ex: 2c0" className="flex-1 min-w-0 border border-[#FF6B35] rounded-md px-2 py-1 text-xs outline-none" />
              <button type="button" onClick={() => {
                const f = newFormat.trim();
                if (f) {
                  if (!sportFormats.includes(f) && saveFormats) saveFormats([...sportFormats, f]);
                  setFormat(f);
                }
                setNewFormat(""); setNewFormatOpen(false);
              }} className="text-xs font-semibold text-[#FF6B35] px-1.5">OK</button>
            </div>
          ) : (
            <button type="button" onClick={() => setNewFormatOpen(true)} className="text-[11px] text-[#FF6B35] mt-1 hover:underline">+ Ajouter un format</button>
          )}
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
      <FileDrop file={file} onChange={setFile} cpbAlert={cpbAlert} />
      {extraCropSource && (
        <CropPhotoView imageData={extraCropSource} courtType={courtType}
          onCancel={() => setExtraCropSource(null)}
          onCrop={(dataUrl) => {
            setSchemas(s => [...s, dataUrl]);
            setPhotoIdx(schemas.length + (hasFilePhoto ? 1 : 0));
            setExtraCropSource(null);
          }} />
      )}

      {/* Photos supplémentaires : carrousel direct, indépendant de l'outil de dessin.
          hasFilePhoto = la 1ère vignette (index 0) vient de FileDrop ; les suivantes viennent de
          `schemas` (importées directement ici, ou dessinées via l'outil plus bas) — les deux
          sources alimentent le même carrousel pour ne jamais perdre une vignette de vue. */}
      {(() => {
        const allPhotos = [...(hasFilePhoto ? [file.data] : []), ...schemas];
        if (allPhotos.length === 0) return null;
        const isFileSlide = hasFilePhoto && photoIdx === 0;
        return (
        <div className="border border-[#1B2A4A]/15 rounded-lg p-3">
          <div className="mb-2">
            <MediaCarousel items={allPhotos} index={photoIdx} onIndexChange={setPhotoIdx} height="max-h-72 h-auto" />
          </div>
          <div className="flex gap-2">
            <input ref={extraPhotoInputRef} type="file" accept="image/*" className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const data = await readImageAsJpeg(f, 1600, 0.8);
                  setExtraCropSource(data);
                } catch { cpbAlert?.("Impossible de lire l'image."); }
              }} />
            <button type="button" onClick={() => extraPhotoInputRef.current.click()}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 border-dashed border-[#FF6B35]/40 text-[#FF6B35] hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-colors">
              + Ajouter une photo
            </button>
            {!isFileSlide && (
              <button type="button" onClick={() => {
                const schemaIdx = hasFilePhoto ? photoIdx - 1 : photoIdx;
                setSchemas(s => s.filter((_, i) => i !== schemaIdx));
                setPhotoIdx(i => Math.max(0, i - 1));
              }} className="py-1.5 px-3 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50">Supprimer</button>
            )}
          </div>
        </div>
        );
      })()}

      {/* Outil de dessin, séparé : schéma tactique dessiné par-dessus le terrain */}
      <div>
        {!showDraw && (
          <button type="button" onClick={() => { setShowDraw(true); setEditingSchemaIdx(schemas.length); }}
            className="w-full border-2 border-dashed border-[#1B2A4A]/30 rounded-lg py-3 flex items-center justify-center gap-2 text-[#1B2A4A]/60 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <span className="text-lg leading-none">{Object.values(SPORTS_CONFIG).find(s => s.court === courtType)?.emoji || "🏀"}</span>
            <span className="text-xs font-semibold">Dessiner un schéma tactique</span>
          </button>
        )}
        {showDraw && (
          <div className="border-2 border-dashed border-[#1B2A4A]/30 rounded-lg p-3">
            <button type="button" onClick={() => { setShowDraw(false); setEditingSchemaIdx(null); }}
              className="w-full flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/60 font-semibold">Dessiner un schéma tactique</span>
              <svg className="w-4 h-4 text-[#1B2A4A]/40 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <DrawTacticalView
              courtType={courtType}
              referencePhotoOptions={file?.data ? [{ label: "Photo importée", src: file.data }] : []}
              previousMaterial={lastMaterial}
              initialImage={editingSchemaIdx < schemas.length ? schemas[editingSchemaIdx] : null}
              previousSchemaGhost={editingSchemaIdx === schemas.length && schemas.length > 0 ? schemas[schemas.length - 1] : null}
              onCancel={() => { setShowDraw(false); setEditingSchemaIdx(null); }}
              onValidate={(dataUrl, meta) => {
                if (meta) setLastMaterial(meta);
                if (editingSchemaIdx < schemas.length) {
                  setSchemas(s => s.map((x, i) => i === editingSchemaIdx ? dataUrl : x));
                } else {
                  setSchemas(s => [...s, dataUrl]);
                  setPhotoIdx(schemas.length + (hasFilePhoto ? 1 : 0));
                }
                setShowDraw(false);
                setEditingSchemaIdx(null);
              }}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        <button
          onClick={async () => {
            if (!titre.trim()) { cpbAlert?.("Donne un titre à l'exercice."); return; }
            if (editingSchemaIdx !== null) {
              const ok = await cpbAlert?.("Un schéma est en cours de dessin et n'a pas été validé (bouton \"Utiliser ce schéma\") — il sera perdu si tu enregistres maintenant. Continuer sans le sauvegarder ?", { confirm: true });
              if (!ok) return;
            }
            onSave({ id: initial?.id || uid(), titre, themes: sel, phases, format, niveau, categorie, duree, objectif, notes, file, schemas, diagram: initial?.diagram, avis: initial?.avis, createdAt: initial?.createdAt || new Date().toISOString() });
          }}
          className="px-5 py-2 text-sm font-medium rounded-md bg-[#FF6B35] text-white hover:bg-[#e85a28]"
        >Enregistrer</button>
      </div>
      </div>
      {initial?.diagram ? (
        <div className="w-full max-w-sm mx-auto">
          <CourtDiagram players={initial.diagram.players} paths={initial.diagram.paths} screens={initial.diagram.screens} />
        </div>
      ) : initial?.id && initial?.file ? (
        <div className="w-full max-w-sm mx-auto">
          <ExerciseFormImagePreview ex={initial} />
        </div>
      ) : null}
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

function CourtLines({ courtType, width, height }) {
  const cx = width / 2, cy = height / 2;
  const s = "#444441";
  if (courtType === "football") {
    const pw = width * 0.55, ph = height * 0.18, px = (width - pw) / 2;
    const gw = width * 0.22, gx = (width - gw) / 2;
    const circleR = Math.min(width, height) * 0.14;
    return (
      <g>
        <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1"/>
        <line x1="0" y1={cy} x2={width} y2={cy} stroke={s} strokeWidth="0.8" strokeDasharray="4 3"/>
        <circle cx={cx} cy={cy} r={circleR} fill="none" stroke={s} strokeWidth="1"/>
        <circle cx={cx} cy={cy} r="2" fill={s}/>
        <rect x={px} y="1" width={pw} height={ph} fill="none" stroke={s} strokeWidth="1"/>
        <rect x={gx} y="1" width={gw} height={ph * 0.45} fill="none" stroke={s} strokeWidth="1"/>
        <rect x={px} y={height - ph - 1} width={pw} height={ph} fill="none" stroke={s} strokeWidth="1"/>
        <rect x={gx} y={height - ph * 0.45 - 1} width={gw} height={ph * 0.45} fill="none" stroke={s} strokeWidth="1"/>
      </g>
    );
  }
  if (courtType === "handball") {
    const gw = width * 0.3, gx = (width - gw) / 2;
    const gh = height * 0.05;
    const zone6R = width * 0.38, zone9R = width * 0.54;
    return (
      <g>
        <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1"/>
        <line x1="0" y1={cy} x2={width} y2={cy} stroke={s} strokeWidth="0.8" strokeDasharray="4 3"/>
        <rect x={gx} y="1" width={gw} height={gh} fill="none" stroke={s} strokeWidth="1.5"/>
        <path d={`M ${cx - zone6R} 0 A ${zone6R} ${zone6R} 0 0 1 ${cx + zone6R} 0`} fill="none" stroke={s} strokeWidth="1" transform={`translate(0,${gh})`}/>
        <path d={`M ${cx - zone9R} 0 A ${zone9R} ${zone9R} 0 0 1 ${cx + zone9R} 0`} fill="none" stroke={s} strokeWidth="1" strokeDasharray="5 3" transform={`translate(0,${gh})`}/>
        <rect x={gx} y={height - gh - 1} width={gw} height={gh} fill="none" stroke={s} strokeWidth="1.5"/>
        <path d={`M ${cx - zone6R} 0 A ${zone6R} ${zone6R} 0 0 0 ${cx + zone6R} 0`} fill="none" stroke={s} strokeWidth="1" transform={`translate(0,${height - gh - 1})`}/>
        <path d={`M ${cx - zone9R} 0 A ${zone9R} ${zone9R} 0 0 0 ${cx + zone9R} 0`} fill="none" stroke={s} strokeWidth="1" strokeDasharray="5 3" transform={`translate(0,${height - gh - 1})`}/>
      </g>
    );
  }
  if (courtType === "volleyball") {
    const netY = cy;
    const attackY1 = cy - height * 0.22, attackY2 = cy + height * 0.22;
    return (
      <g>
        <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1.5"/>
        <line x1="0" y1={netY} x2={width} y2={netY} stroke={s} strokeWidth="2.5"/>
        <line x1="0" y1={attackY1} x2={width} y2={attackY1} stroke={s} strokeWidth="0.8" strokeDasharray="5 3"/>
        <line x1="0" y1={attackY2} x2={width} y2={attackY2} stroke={s} strokeWidth="0.8" strokeDasharray="5 3"/>
      </g>
    );
  }
  if (courtType === "rugby") {
    const tryW = width * 0.08, inGoalW = width * 0.1;
    const h22_1 = height * 0.22, h22_2 = height * 0.78;
    const hCy = cy;
    const postW = width * 0.1, postX = (width - postW) / 2;
    return (
      <g>
        <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1"/>
        <line x1="0" y1={inGoalW} x2={width} y2={inGoalW} stroke={s} strokeWidth="1.5"/>
        <line x1="0" y1={height - inGoalW} x2={width} y2={height - inGoalW} stroke={s} strokeWidth="1.5"/>
        <line x1="0" y1={h22_1} x2={width} y2={h22_1} stroke={s} strokeWidth="0.8" strokeDasharray="4 3"/>
        <line x1="0" y1={h22_2} x2={width} y2={h22_2} stroke={s} strokeWidth="0.8" strokeDasharray="4 3"/>
        <line x1="0" y1={hCy} x2={width} y2={hCy} stroke={s} strokeWidth="1"/>
        <line x1={postX} y1="1" x2={postX} y2={inGoalW} stroke={s} strokeWidth="2"/>
        <line x1={postX + postW} y1="1" x2={postX + postW} y2={inGoalW} stroke={s} strokeWidth="2"/>
        <line x1={postX} y1={height - inGoalW} x2={postX} y2={height - 1} stroke={s} strokeWidth="2"/>
        <line x1={postX + postW} y1={height - inGoalW} x2={postX + postW} y2={height - 1} stroke={s} strokeWidth="2"/>
      </g>
    );
  }
  if (courtType === "generic") {
    return (
      <g>
        <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1"/>
        <line x1="0" y1={cy} x2={width} y2={cy} stroke={s} strokeWidth="0.8" strokeDasharray="4 3"/>
        <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.12} fill="none" stroke={s} strokeWidth="1"/>
      </g>
    );
  }
  // basketball (default)
  const keyW = width * 0.36, keyH = height * 0.36;
  const keyX = cx - keyW / 2, keyY = height - keyH;
  const ftR = keyW / 2, tpR = width * 0.43;
  const hoopY = height - keyH * 0.22;
  return (
    <g>
      <rect x="1" y="1" width={width-2} height={height-2} fill="none" stroke={s} strokeWidth="1"/>
      <path d={`M ${cx-tpR} ${keyY} L ${cx-tpR} ${height} M ${cx+tpR} ${keyY} L ${cx+tpR} ${height}`} fill="none" stroke={s} strokeWidth="1"/>
      <path d={`M ${cx-tpR} ${keyY} A ${tpR} ${tpR} 0 0 0 ${cx+tpR} ${keyY}`} fill="none" stroke={s} strokeWidth="1"/>
      <rect x={keyX} y={keyY} width={keyW} height={keyH} fill="none" stroke={s} strokeWidth="1"/>
      <path d={`M ${cx-ftR} ${keyY} A ${ftR} ${ftR} 0 0 0 ${cx+ftR} ${keyY}`} fill="none" stroke={s} strokeWidth="1"/>
      <path d={`M ${cx-ftR*0.55} ${hoopY-6} A ${ftR*0.55} ${ftR*0.55} 0 0 0 ${cx+ftR*0.55} ${hoopY-6}`} fill="none" stroke={s} strokeWidth="1"/>
      <line x1={cx-ftR*0.32} y1={hoopY-6} x2={cx+ftR*0.32} y2={hoopY-6} stroke={s} strokeWidth="1.5"/>
      <circle cx={cx} cy={hoopY-9} r="3" fill="none" stroke={s} strokeWidth="1"/>
    </g>
  );
}

function CourtDiagram({ players = [], paths = [], screens = [], width = 440, height = 420, courtType = "basketball" }) {
  const aid = `arr-${width}-${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="bg-white/40 rounded">
      <defs>
        <marker id={aid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" />
        </marker>
      </defs>
      <CourtLines courtType={courtType} width={width} height={height} />

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
            <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#D62828">{pl.label}</text>
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

function FilterAccordion({ label, activeCount, borderTop, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={borderTop ? "border-t border-[#1B2A4A]/8" : ""}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1B2A4A]/4 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1B2A4A]">{label}</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold bg-[#FF6B35] text-white rounded-full px-1.5 py-0.5 leading-none">{activeCount}</span>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-[#1B2A4A]/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex, index, onClick, onView, onRemove, onAddToDraft, onCropImage, onShare, selectMode = false, selected = false, onToggleSelect }) {
  const fileImage = useFileImage(ex);
  const schemas = useSchemasData(ex);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="border border-[#1B2A4A]/10 rounded-xl bg-white shadow-md shadow-[#1B2A4A]/10 p-4 relative group hover:shadow-lg transition-shadow" onClick={selectMode ? onToggleSelect : onClick}>
      {selectMode && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center border-2"
          style={{ borderColor: selected ? "#FF6B35" : "#1B2A4A40", backgroundColor: selected ? "#FF6B35" : "#fff" }}>
          {selected && <Check size={13} className="text-white" />}
        </div>
      )}
      <div className="flex items-start justify-between mb-2 cursor-pointer">
        <div className="flex items-center gap-2">
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
        {onShare && (
          <button onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="text-[#1B2A4A]/30 hover:text-[#FF6B35] transition-colors" title="Partager">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        )}
      </div>
      <div className="cursor-pointer">
        <h3 className="font-semibold text-[#1B2A4A] mb-1.5 leading-tight">{ex.titre}</h3>
        {ex.diagram ? (
          <div className="mb-2"><CourtDiagram players={ex.diagram.players} paths={ex.diagram.paths} screens={ex.diagram.screens} /></div>
        ) : (() => {
          const hasFile = fileImage && ex.file?.type?.startsWith("image/");
          const allPhotos = [...(hasFile ? [fileImage] : []), ...schemas];
          if (allPhotos.length === 0) return null;
          const idx = Math.min(carouselIdx, allPhotos.length - 1);
          const isFileSlide = hasFile && idx === 0;
          return (
            <div className="mb-2 rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <MediaCarousel items={allPhotos} index={idx} onIndexChange={setCarouselIdx} card={false} height="h-48"
                onClickImage={onView}
                overlay={isFileSlide && onCropImage && (
                  <button onClick={(e) => { e.stopPropagation(); onCropImage(fileImage); }}
                    className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-xs font-medium text-[#1B2A4A] hover:bg-[#FF6B35] hover:text-white hover:border-[#FF6B35] transition-colors">
                    <ImageIcon size={12} /> Rogner
                  </button>
                )} />
            </div>
          );
        })()}
        <div className="flex items-center gap-3 text-xs text-[#1B2A4A]/60 mb-2">
          <span className="flex items-center gap-1"><Clock size={12} />{ex.duree} min</span>
          <span>{ex.format}</span><span>{ex.niveau}</span>{catList(ex).length > 0 && <span className="px-1.5 py-0.5 rounded bg-[#1B2A4A]/8">{catList(ex).join(", ")}</span>}
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

function ExerciseViewer({ ex, onClose, onEdit, showSocialExport = false }) {
  const fileImage = useFileImage(ex);
  const schemas = useSchemasData(ex);
  const [imgIdx, setImgIdx] = useState(0);
  const hasFile = fileImage && ex.file?.type?.startsWith("image/");
  const allPhotos = [...(hasFile ? [fileImage] : []), ...schemas];

  return (
    <div className="fixed inset-0 z-[250] bg-[#F4F0E6] flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-[#1B2A4A]/10 bg-white" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]"><X size={18} /> Fermer</button>
        <div className="text-center">
          <div className="text-[#1B2A4A] font-semibold">{ex.titre}</div>
          <div className="text-xs font-medium" style={{ color: "var(--sport-accent)" }}>{ex.format} · {ex.duree} min</div>
        </div>
        <div className="flex items-center gap-3">
          {showSocialExport && (
            <SocialExportButton items={allPhotos}
              title={ex.titre} subtitle={`${ex.format} · ${ex.duree} min`} filenameBase={ex.titre} />
          )}
          {onEdit && (
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">
              <Pencil size={16} /> Modifier
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {ex.diagram ? (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-[#1B2A4A]/10 overflow-hidden p-2">
            <CourtDiagram players={ex.diagram.players} paths={ex.diagram.paths} screens={ex.diagram.screens} />
          </div>
        ) : allPhotos.length > 0 ? (
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-[#1B2A4A]/10 overflow-hidden">
            <MediaCarousel items={allPhotos} index={imgIdx} onIndexChange={setImgIdx} card={false} height="max-h-[65vh] h-auto" />
          </div>
        ) : (
          <div className="text-[#1B2A4A]/30 text-sm">Aucune image</div>
        )}
      </div>
      {(ex.objectif || ex.notes || (ex.themes || []).length > 0) && (
        <div className="flex-shrink-0 bg-white border-t border-[#1B2A4A]/10 px-4 py-3 max-h-60 overflow-y-auto" onClick={e => e.stopPropagation()}>
          {ex.objectif && <p className="text-[#1B2A4A]/80 text-sm mb-1">{ex.objectif}</p>}
          {ex.notes && <p className="text-[#1B2A4A]/50 text-xs">{ex.notes}</p>}
          {(ex.themes || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(ex.themes || []).map(t => (
                <span key={t} className="text-xs bg-[#1B2A4A]/8 text-[#1B2A4A]/60 rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImportReviewCard({ item, themes, onChange, onRemove, sportFormats = FORMATS }) {
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
          <select value={item.format} onChange={e => onChange({ ...item, format: e.target.value })} className="border border-[#1B2A4A]/20 rounded px-1.5 py-0.5 text-xs">{sportFormats.map(f => <option key={f}>{f}</option>)}</select>
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
  let s = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="background:#f8f6f0;border-radius:6px">`;
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
      s += `<text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#D62828">${pl.label}</text>`;
    } else {
      s += `<text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#1B2A4A">${pl.label}</text>`;
    }
  });
  s += `</svg>`;
  return s;
}

// Ordre combiné exercices + plays d'une séance, pour l'organisateur/aperçu et l'impression.
// Additif et non-destructif : session.itemOrder est un champ nouveau, calculé automatiquement
// à partir de exerciseIds/playIds (qui restent la source de vérité pour l'appartenance à la séance).
// Les items retirés de exerciseIds/playIds disparaissent de l'ordre ; les items ajoutés ailleurs
// (bouton +, suggestions...) sont ajoutés en fin d'ordre automatiquement au prochain calcul.
function getSessionOrder(session) {
  const known = [
    ...(session.exerciseIds || []).map(id => ({ type: "exercise", id })),
    ...(session.playIds || []).map(id => ({ type: "play", id })),
    ...(session.notes || []).map(n => ({ type: "note", id: n.id })),
  ];
  const stored = (session.itemOrder || []).filter(it => known.some(k => k.type === it.type && k.id === it.id));
  const missing = known.filter(k => !stored.some(it => it.type === k.type && it.id === k.id));
  return [...stored, ...missing];
}

// ─── Cahier technique (export PDF de toute la bibliothèque) ────────────────────────────────
// Fonctionnalité réservée aux comptes admin (voir isAdmin/profiles.is_admin) : génère un
// document soigné (couverture, sommaire par thème, une fiche par exercice) pensé pour être
// vendu tel quel à des coachs n'utilisant pas l'app, en plus d'être un outil de conversion
// (donner envie de passer à l'app / au Premium).
async function enrichExercisesAssets(exercises) {
  return Promise.all(exercises.map(async (ex) => {
    let result = ex;
    if (ex.file && !ex.file.data) {
      try {
        const r = await storage.get(`file:${ex.id}`);
        if (r) { const parsed = JSON.parse(r.value); result = { ...result, file: { ...ex.file, data: parsed.data } }; }
      } catch {}
    }
    if (!result.schemas?.length && result.schemaCount) {
      try {
        const r = await storage.get(`schemas:${ex.id}`);
        if (r) result = { ...result, schemas: JSON.parse(r.value) || [] };
      } catch {}
    }
    return result;
  }));
}

function buildExerciseBookletHTML(exercises, { clubLogo, sport = "basketball", coachName = "" } = {}) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const coral = "#FF5C5C";
  const navy = "#1B2A4A";
  const sportEmoji = SPORTS_CONFIG[sport]?.emoji || "🏀";
  const sportLabel = SPORTS_CONFIG[sport]?.label || "Basketball";

  // Regroupement par thème (un exercice sans thème atterrit dans "Autres")
  const groups = {};
  exercises.forEach(ex => {
    const themesList = ex.themes?.length ? ex.themes : ["Autres"];
    themesList.forEach(t => { (groups[t] = groups[t] || []).push(ex); });
  });
  const themeNames = Object.keys(groups).sort((a, b) => a === "Autres" ? 1 : b === "Autres" ? -1 : a.localeCompare(b));

  let exNumber = 0;
  const sections = themeNames.map((theme, ti) => {
    const cards = groups[theme].map((ex, ei) => {
      exNumber++;
      const hasDiagram = !!ex.diagram;
      const hasPhoto = !!(ex.file?.data && ex.file?.type?.startsWith("image/"));
      const schemas = ex.schemas || [];
      const hasVisual = hasDiagram || hasPhoto || schemas.length > 0;
      let visualHtml = "";
      if (hasDiagram) {
        const raw = diagramToSvgString(ex.diagram, 420, 400);
        visualHtml += raw.replace(/id="a"/g, `id="bk${exNumber}"`).replace(/url\(#a\)/g, `url(#bk${exNumber})`);
      } else if (hasPhoto) {
        visualHtml += `<img src="${ex.file.data}" alt="" style="width:100%;height:auto;display:block;border-radius:6px" />`;
      }
      schemas.forEach(s => {
        visualHtml += `<div style="margin-top:8px"><img src="${s}" alt="" style="width:100%;height:auto;display:block;border-radius:6px" /></div>`;
      });
      const metaPills = [`${esc(ex.duree)} min`, ex.format, ex.niveau].filter(Boolean).join(" · ");
      return `
      <div class="exo">
        <div class="exo-label"><span>Exercice ${String(ei + 1).padStart(2, "0")}</span></div>
        <div class="exo-card">
          ${hasVisual ? `<div class="exo-visual"><div class="visual-inner">${visualHtml}</div></div>` : `<div class="exo-visual exo-visual-empty"></div>`}
          <div class="exo-info">
            <div class="exo-meta-bar">${esc(metaPills)}</div>
            <div class="exo-info-body">
              ${ex.themes?.length || catList(ex).length ? `<div class="tags">${[...ex.themes || [], ...catList(ex)].map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
              <div class="exo-title">${esc(ex.titre)}</div>
              ${ex.objectif ? `<div class="field"><div class="field-label">Objectif</div><p class="field-val">${esc(ex.objectif)}</p></div>` : ""}
              ${ex.notes ? `<div class="field"><div class="field-label">Consignes</div><p class="field-val notes">${esc(ex.notes)}</p></div>` : ""}
              ${!ex.objectif && !ex.notes ? `<p class="empty-text">Aucune consigne renseignée.</p>` : ""}
            </div>
          </div>
        </div>
      </div>`;
    }).join("");
    return `<div class="section-page">
      <div class="section-head"><span class="section-num">${String(ti + 1).padStart(2, "0")}</span><h2 class="section-title">${esc(theme)}</h2></div>
      <div class="section-cards">${cards}</div>
    </div>`;
  }).join("");

  const toc = themeNames.map((t, i) => `
    <div class="toc-item">
      <span class="toc-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="toc-text"><h3>${esc(t)}</h3><p>${groups[t].length} exercice${groups[t].length > 1 ? "s" : ""}</p></div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Cahier technique — ${esc(sportLabel)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700;800&family=Kalam:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#F2EDE4;color:${navy};font-size:13px}
    .marker{font-family:'Kalam',cursive}

    /* ── COUVERTURE ── */
    .cover{min-height:100vh;background:#F2EDE4;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;page-break-after:always}
    .cover-logo{width:120px;height:auto;object-fit:contain;margin-bottom:48px}
    .cover-emoji{font-size:64px;margin-bottom:48px}
    .cover-title{font-family:'Oswald',sans-serif;font-size:42px;font-weight:800;letter-spacing:.5px;margin-bottom:28px}
    .cover-sub{font-family:'Oswald',sans-serif;font-size:26px;font-weight:700;color:${navy}}

    /* ── SOMMAIRE ── */
    .toc-page{padding:48px;page-break-after:always;min-height:100vh}
    .toc-kicker{font-family:'Oswald',sans-serif;font-size:26px;font-weight:800;color:${coral};text-transform:lowercase;border-bottom:3px solid ${coral};display:inline-block;padding-bottom:6px;margin-bottom:36px}
    .toc-item{display:flex;align-items:center;gap:18px;margin-bottom:22px}
    .toc-num{font-family:'Oswald',sans-serif;font-size:44px;font-weight:800;color:${coral};width:70px;flex-shrink:0}
    .toc-text h3{font-family:'Oswald',sans-serif;font-size:15px;letter-spacing:.5px;color:${navy};margin-bottom:2px;text-transform:uppercase}
    .toc-text p{font-size:12px;color:${navy}90}

    /* ── PAGES DE SECTION ── */
    .section-page{padding:36px;page-break-before:always}
    .section-head{display:flex;align-items:baseline;gap:16px;margin-bottom:24px}
    .section-num{font-family:'Oswald',sans-serif;font-size:48px;font-weight:800;color:${coral}}
    .section-title{font-family:'Oswald',sans-serif;font-size:20px;letter-spacing:.5px;color:${navy};text-transform:uppercase}

    .exo{margin-bottom:22px;break-inside:avoid;page-break-inside:avoid}
    .exo-label{margin-bottom:-1px}
    .exo-label span{display:inline-block;background:${coral};color:#fff;font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;letter-spacing:.5px;padding:6px 14px;border-radius:6px 6px 0 0}
    .exo-card{display:grid;grid-template-columns:52% 48%;background:#fff;border-radius:0 8px 8px 8px;overflow:hidden;box-shadow:0 1px 4px rgba(27,42,74,.08)}
    .exo-visual{padding:14px;background:#F2EDE4;display:flex;align-items:center;justify-content:center}
    .exo-visual-empty{background:repeating-linear-gradient(45deg,#F2EDE4,#F2EDE4 10px,#ece5d8 10px,#ece5d8 20px)}
    .visual-inner{width:100%;background:#fff;border-radius:8px;overflow:hidden}
    .visual-inner svg{width:100%;height:auto;display:block;background:#f8f6f0}
    .visual-inner img{width:100%;height:auto;display:block}
    .exo-info{display:flex;flex-direction:column}
    .exo-meta-bar{background:${navy};color:rgba(255,255,255,.75);font-size:11px;text-align:right;padding:8px 14px}
    .exo-info-body{padding:14px;display:flex;flex-direction:column;gap:8px}
    .exo-title{font-family:'Oswald',sans-serif;font-size:14px;color:${navy};font-weight:700}

    .tags{display:flex;flex-wrap:wrap;gap:4px}
    .tags span{font-size:10px;background:${coral}18;color:${coral};border-radius:10px;padding:2px 8px;font-weight:600}
    .field-label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:${navy}60;font-weight:700;margin-bottom:3px}
    .field-val{font-size:12px;line-height:1.55;color:${navy}}
    .notes{white-space:pre-wrap;color:${navy}90}
    .empty-text{font-size:12px;color:${navy}40;font-style:italic}

    .footer{text-align:center;padding:24px;font-size:11px;color:${navy}40}

    @media print{
      @page{margin:0;size:A4}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>

  <div class="cover">
    ${clubLogo ? `<img class="cover-logo" src="${clubLogo}" alt="Logo" />` : `<div class="cover-emoji">${sportEmoji}</div>`}
    <div class="cover-title">Cahier technique</div>
    <div class="cover-sub">${esc(coachName || sportLabel)}</div>
  </div>

  <div class="toc-page">
    <div class="toc-kicker marker">sommaire</div>
    ${toc}
  </div>

  ${sections}

  <div class="footer">Coaching Pro Boost — coachingproboost.com</div>

</body></html>`;
}

async function downloadExerciseBooklet(exercises, opts) {
  const enriched = await enrichExercisesAssets(exercises);
  const html = buildExerciseBookletHTML(enriched, opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cahier-technique-${(opts?.sport || "basketball")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Export "pour Canva" : un dossier par exercice (terrain(s) PNG, explications.txt, qrcode.png) ──
function slugifyForFile(str) {
  return String(str || "exercice")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "exercice";
}

function svgStringToPngDataUrl(svgString, width, height) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Crée (ou réutilise) un lien de partage permanent pour un exercice — même mécanisme que le
// bouton "partager" (shared_exercises, aucune expires_at = jamais expiré), mais généré en masse
// sans copier le lien à chaque fois.
async function getOrCreatePermanentShareLink(ex) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("shared_exercises").insert({ token, exercise_data: ex });
  if (error) throw error;
  return `${window.location.origin}/app?share=${token}`;
}

// Même principe mais pour tout un lot d'exercices (cahier technique) sous un seul token —
// table shared_exercise_collections, voir supabase_shared_exercise_collections.sql.
async function getOrCreatePermanentCollectionLink(exercises, title) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("shared_exercise_collections").insert({ token, title, exercises });
  if (error) throw error;
  return `${window.location.origin}/app?sharecollection=${token}`;
}

async function exportExercisesForCanva(exercises, { sport = "basketball", onProgress } = {}) {
  const enriched = await enrichExercisesAssets(exercises);
  const zip = new JSZip();

  for (let i = 0; i < enriched.length; i++) {
    const ex = enriched[i];
    onProgress?.(i + 1, enriched.length);
    const folderName = `${String(i + 1).padStart(2, "0")} - ${slugifyForFile(ex.titre)}`;
    const folder = zip.folder(folderName);

    // Terrain(s) : diagramme structuré, photo, et/ou schémas dessinés
    let terrainCount = 0;
    if (ex.diagram) {
      terrainCount++;
      const svg = diagramToSvgString(ex.diagram, 900, 860);
      const png = await svgStringToPngDataUrl(svg, 900, 860);
      folder.file(`terrain-${terrainCount}.png`, png.split(",")[1], { base64: true });
    }
    if (ex.file?.data && ex.file?.type?.startsWith("image/")) {
      terrainCount++;
      folder.file(`terrain-${terrainCount}.${ex.file.type.includes("png") ? "png" : "jpg"}`, ex.file.data.split(",")[1], { base64: true });
    }
    (ex.schemas || []).forEach(s => {
      terrainCount++;
      folder.file(`terrain-${terrainCount}.png`, s.split(",")[1], { base64: true });
    });

    // Explications
    const lines = [
      ex.titre || "",
      "",
      [ex.duree ? `${ex.duree} min` : null, ex.format, ex.niveau].filter(Boolean).join(" · "),
      ex.themes?.length ? `Thèmes : ${ex.themes.join(", ")}` : null,
      "",
      ex.objectif ? `OBJECTIF\n${ex.objectif}` : null,
      "",
      ex.notes ? `CONSIGNES\n${ex.notes}` : null,
    ].filter(l => l !== null).join("\n");
    folder.file("explications.txt", lines);

    // QR code (lien de partage permanent vers l'app)
    try {
      const link = await getOrCreatePermanentShareLink(ex);
      const qrDataUrl = await QRCode.toDataURL(link, { width: 512, margin: 1 });
      folder.file("qrcode.png", qrDataUrl.split(",")[1], { base64: true });
    } catch (e) {
      folder.file("qrcode-erreur.txt", "QR code non généré : " + e.message);
    }
  }

  // QR code global : télécharge/importe tout le lot d'un coup (à placer sur la couverture du cahier)
  try {
    const link = await getOrCreatePermanentCollectionLink(enriched, `Cahier technique — ${sport}`);
    const qrDataUrl = await QRCode.toDataURL(link, { width: 512, margin: 1 });
    zip.file("qrcode-tout-le-cahier.png", qrDataUrl.split(",")[1], { base64: true });
  } catch (e) {
    zip.file("qrcode-tout-le-cahier-erreur.txt", "QR code non généré : " + e.message);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exercices-canva-${sport}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildSessionHTML(session, exercises, { clubLogo, sessionPhoto, teams = [], sport = "basketball", plays = [], textScale = 1, imageScale = 1 } = {}) {
  const esc = (str) => String(str ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const sportColor = SPORTS_CONFIG[sport]?.color || "#FF6B35";
  const sportEmoji = SPORTS_CONFIG[sport]?.emoji || "🏀";
  const total = session.exerciseIds.reduce((sum, id) => sum + (exercises.find(e => e.id === id)?.duree || 0), 0)
    + (session.notes || []).reduce((sum, n) => sum + (n.duree || 0), 0);
  const h = Math.floor(total / 60), m = total % 60;
  const totalStr = h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
  const d = new Date(session.date);
  const dateStr = isNaN(d) ? esc(session.date) : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const team = teams.find(t => t.id === session.teamId);
  const teamStr = team ? `${team.nom}${team.niveau ? ` · ${team.niveau}` : ""}` : null;
  const sessionExos = session.exerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
  const sessionPlays = (session.playIds || []).map(id => plays.find(p => p.id === id)).filter(Boolean);
  const allThemes = [...new Set(sessionExos.flatMap(e => e.themes || []))];
  const imgPct = Math.round(imageScale * 100);

  let exoCount = 0, playCount = 0;
  const combinedBlocks = getSessionOrder(session).map((item, gi) => {
    if (item.type === "exercise") {
      const ex = exercises.find(e => e.id === item.id);
      if (!ex) return "";
      const i = exoCount++;
      const hasDiagram = !!ex.diagram;
      const hasPhoto = !!(ex.file?.data && ex.file?.type?.startsWith("image/"));
      const schemas = ex.schemas || [];
      const hasVisual = hasDiagram || hasPhoto || schemas.length > 0;

      let visualHtml = "";
      if (hasDiagram) {
        // IDs uniques par exercice pour éviter les conflits entre plusieurs schémas
        const raw = diagramToSvgString(ex.diagram, 420, 400);
        visualHtml += raw
          .replace(/id="a"/g, `id="marr${gi}"`)
          .replace(/url\(#a\)/g, `url(#marr${gi})`);
      } else if (hasPhoto) {
        visualHtml += `<img src="${ex.file.data}" alt="" style="width:${imgPct}%;margin:0 auto;height:auto;display:block;border-radius:6px;border:1px solid #1B2A4A15" />`;
      }
      schemas.forEach(s => {
        visualHtml += `<div style="margin-top:8px"><img src="${s}" alt="" style="width:${imgPct}%;margin:0 auto;height:auto;display:block;border-radius:6px;border:1px solid #1B2A4A15" /></div>`;
      });

      return `
      <div class="exo">
        <div class="exo-header">
          <span class="exo-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="exo-title">${esc(ex.titre)}</span>
          <span class="exo-meta">${esc(ex.duree)} min · ${esc(ex.format)} · ${esc(ex.niveau)}${catList(ex).length ? " · " + esc(catList(ex).join(", ")) : ""}</span>
        </div>
        <div class="exo-body${hasVisual ? "" : " no-visual"}">
          ${hasVisual ? `<div class="exo-visual"><div class="visual-inner">${visualHtml}</div></div>` : ""}
          <div class="exo-text">
            ${ex.themes?.length ? `<div class="tags">${ex.themes.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
            ${ex.objectif ? `<div class="field"><div class="field-label">Objectif</div><p class="field-val">${esc(ex.objectif)}</p></div>` : ""}
            ${ex.notes ? `<div class="field"><div class="field-label">Consignes</div><p class="field-val notes">${esc(ex.notes)}</p></div>` : ""}
            ${!ex.objectif && !ex.notes && !ex.themes?.length ? `<p class="empty-text">Aucune consigne renseignée.</p>` : ""}
          </div>
        </div>
      </div>`;
    }
    if (item.type === "note") {
      const note = (session.notes || []).find(n => n.id === item.id);
      if (!note) return "";
      return `
      <div class="exo">
        <div class="exo-header">
          <span class="exo-num">TXT</span>
          <span class="exo-title">${esc(note.titre)}</span>
          <span class="exo-meta">${esc(note.duree)} min${note.theme ? " · " + esc(note.theme) : ""} · hors bibliothèque</span>
        </div>
      </div>`;
    }
    const play = plays.find(p => p.id === item.id);
    if (!play) return "";
    const i = playCount++;
    const schemas = play.schemas || [];
    const photos = (play.images || []).filter(img => img.file?.data || img.data).map(img => img.file?.data || img.data);
    const visuals = [...schemas, ...photos];
    const imgsHtml = visuals.map(v => `<div class="play-img" style="width:${imgPct}%"><img src="${v}" alt="" /></div>`).join("");
    return `
    <div class="play-block">
      <div class="play-block-header">
        <span class="exo-num">S${String(i + 1).padStart(2, "0")}</span>
        <span class="play-block-title">${esc(play.titre)}</span>
        ${play.type ? `<span class="play-block-type">${esc(play.type)}</span>` : ""}
      </div>
      ${visuals.length ? `<div class="plays-grid">${imgsHtml}</div>` : `<p class="empty-text" style="padding:12px">Aucun visuel.</p>`}
    </div>`;
  }).join("");


  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${esc(session.titre)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1B2A4A;font-size:13px}

    /* ── HEADER ── */
    .header{background:#1B2A4A;color:#fff;padding:20px 28px;display:flex;align-items:center;gap:18px}
    .header-logo{width:64px;height:64px;object-fit:contain;border-radius:10px;flex-shrink:0}
    .header-divider{width:3px;height:56px;background:${sportColor};border-radius:2px;flex-shrink:0}
    .header-info{flex:1}
    .header-info h1{font-family:'Oswald',sans-serif;font-size:26px;letter-spacing:.5px;line-height:1.1}
    .header-date{font-size:12px;color:rgba(255,255,255,.65);margin-top:4px;text-transform:capitalize}
    .header-meta{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
    .header-meta span{font-size:11px;color:rgba(255,255,255,.75);background:rgba(255,255,255,.12);border-radius:20px;padding:2px 10px}

    /* ── STATS BAR ── */
    .stats-bar{background:${sportColor};display:flex;padding:12px 28px;gap:0}
    .stat{flex:1;text-align:center;border-right:1px solid rgba(255,255,255,.25);padding:0 12px}
    .stat:last-child{border-right:none}
    .stat-val{font-family:'Oswald',sans-serif;font-size:22px;color:#fff;line-height:1}
    .stat-lbl{font-size:10px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.8px;margin-top:3px}

    /* ── THEMES BAR ── */
    .themes-bar{background:#F2EDE4;padding:10px 28px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .theme-tag{background:#1B2A4A;color:#fff;font-size:10px;font-weight:600;border-radius:12px;padding:3px 10px;white-space:nowrap}

    /* ── SESSION PHOTO ── */
    .session-photo-wrap{padding:20px 28px 0}
    .session-photo-wrap img{width:100%;height:auto;border-radius:10px;border:1px solid #1B2A4A15;display:block}

    /* ── CONTENT ── */
    .content{padding:20px 28px}

    /* ── EXERCISE CARD ── */
    .exo{border:1px solid #1B2A4A20;border-radius:10px;overflow:hidden;margin-bottom:16px;break-inside:avoid;page-break-inside:avoid}
    .exo-header{background:#1B2A4A;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px}
    .exo-num{background:${sportColor};color:#fff;font-size:11px;font-weight:700;border-radius:4px;padding:2px 8px;font-family:monospace;letter-spacing:1px;flex-shrink:0}
    .exo-title{font-family:'Oswald',sans-serif;font-size:calc(15px * var(--ts, 1));flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .exo-meta{font-size:calc(11px * var(--ts, 1));color:rgba(255,255,255,.6);white-space:nowrap;flex-shrink:0}

    .exo-body{display:grid;grid-template-columns:56% 44%;min-height:200px}
    .exo-body.no-visual{grid-template-columns:1fr;min-height:unset}
    .exo-visual{padding:12px;border-right:2px solid #1B2A4A12;background:#eef2f7;display:flex;align-items:center;justify-content:center}
    .visual-inner{width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .visual-inner svg{width:100%;height:auto;display:block;background:#f8f6f0}
    .visual-inner img{width:100%;height:auto;display:block}
    .exo-text{padding:16px;display:flex;flex-direction:column;gap:12px}

    .tags{display:flex;flex-wrap:wrap;gap:4px}
    .tags span{font-size:calc(10px * var(--ts, 1));background:${sportColor}20;color:${sportColor};border-radius:10px;padding:2px 8px;font-weight:600}
    .field-label{font-size:calc(10px * var(--ts, 1));text-transform:uppercase;letter-spacing:.7px;color:#1B2A4A60;font-weight:600;margin-bottom:3px}
    .field-val{font-size:calc(12px * var(--ts, 1));line-height:1.55;color:#1B2A4A}
    .notes{white-space:pre-wrap;color:#1B2A4A90}
    .empty-text{font-size:calc(12px * var(--ts, 1));color:#1B2A4A40;font-style:italic}

    /* ── SYSTEMES (un bloc par play, images complètes 4 par ligne) ── */
    .play-block{border:1px solid #1B2A4A20;border-radius:10px;overflow:hidden;margin-bottom:16px;break-inside:avoid;page-break-inside:avoid}
    .play-block-header{background:#1B2A4A;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px}
    .play-block-title{font-family:'Oswald',sans-serif;font-size:calc(15px * var(--ts, 1));flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .play-block-type{font-size:calc(11px * var(--ts, 1));color:rgba(255,255,255,.6);white-space:nowrap;flex-shrink:0}
    .plays-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
    /* Hauteur fixe + object-fit:contain : sans ça, un demi-terrain et un terrain complet (ou un
       schéma avec du texte qui prend plus de place que le terrain seul) n'ont pas la même
       hauteur naturelle et se décalent les uns des autres dans la grille. */
    .play-img{background:#eef2f7;border-radius:6px;overflow:hidden;border:1px solid #1B2A4A12;height:150px;display:flex;align-items:center;justify-content:center}
    .play-img img{width:100%;height:100%;object-fit:contain;display:block}

    @media print{
      @page{margin:0;size:A4}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>

  <div class="header">
    ${clubLogo ? `<img class="header-logo" src="${clubLogo}" alt="Logo" />` : ""}
    <div class="header-divider"></div>
    <div class="header-info">
      <h1>${esc(session.titre)}</h1>
      <div class="header-date">${dateStr}</div>
      <div class="header-meta">
        ${teamStr ? `<span>${sportEmoji} ${esc(teamStr)}</span>` : ""}
        ${session.lieu ? `<span>📍 ${esc(session.lieu)}</span>` : ""}
      </div>
    </div>
  </div>

  <div class="stats-bar">
    <div class="stat"><div class="stat-val">${sessionExos.length}</div><div class="stat-lbl">Exercices</div></div>
    <div class="stat"><div class="stat-val">${totalStr}</div><div class="stat-lbl">Durée totale</div></div>
    ${sessionPlays.length ? `<div class="stat"><div class="stat-val">${sessionPlays.length}</div><div class="stat-lbl">Système${sessionPlays.length > 1 ? "s" : ""}</div></div>` : ""}
    ${allThemes.length ? `<div class="stat"><div class="stat-val">${allThemes.length}</div><div class="stat-lbl">Thèmes</div></div>` : ""}
    ${session.presents != null ? `<div class="stat"><div class="stat-val">${session.presents}${team?.nbJoueurs ? `<span style="font-size:14px;font-weight:400;color:#1B2A4A60"> / ${team.nbJoueurs}</span>` : ""}</div><div class="stat-lbl">Joueurs présents</div></div>` : ""}
  </div>

  ${allThemes.length ? `<div class="themes-bar">${allThemes.map(t => `<span class="theme-tag">${esc(t)}</span>`).join("")}</div>` : ""}

  ${sessionPhoto ? `<div class="session-photo-wrap"><img src="${sessionPhoto}" alt="Photo de séance" /></div>` : ""}

  <div class="content" style="--ts:${textScale}">
    ${combinedBlocks}
  </div>

</body></html>`;
}

// Précharge les images/schémas stockés séparément (file:{id}, schemas:{id}, playimg:{playId}:{imgId})
// afin que buildSessionHTML puisse générer un rendu complet (téléchargement final ou aperçu live).
async function enrichSessionAssets(session, exercises, opts) {
  const sessionExos = session.exerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
  const enriched = await Promise.all(sessionExos.map(async (ex) => {
    let result = ex;
    // Enrichir file
    if (ex.file && !ex.file.data) {
      try {
        const r = await storage.get(`file:${ex.id}`);
        if (r) {
          const parsed = JSON.parse(r.value);
          result = { ...result, file: { ...ex.file, data: parsed.data } };
        }
      } catch {}
    }
    // Enrichir schemas
    if (!result.schemas?.length && result.schemaCount) {
      try {
        const r = await storage.get(`schemas:${ex.id}`);
        if (r) result = { ...result, schemas: JSON.parse(r.value) || [] };
      } catch {}
    }
    return result;
  }));
  // Reconstruire la liste complète avec les exercices enrichis
  const exercisesEnriched = exercises.map(ex => enriched.find(e => e.id === ex.id) || ex);

  // Précharger les photos des systèmes liés (stockées séparément sous playimg:{playId}:{imgId})
  const plays = opts?.plays || [];
  const sessionPlayIds = session.playIds || [];
  const enrichedPlays = await Promise.all(
    plays.filter(p => sessionPlayIds.includes(p.id)).map(async (play) => {
      const images = await Promise.all((play.images || []).map(async (img) => {
        if (img.file?.data || img.data) return img;
        try {
          const r = await storage.get(`playimg:${play.id}:${img.id}`);
          if (r) { const parsed = JSON.parse(r.value); return { ...img, file: parsed }; }
        } catch {}
        return img;
      }));
      return { ...play, images };
    })
  );
  const playsEnriched = plays.map(p => enrichedPlays.find(e => e.id === p.id) || p);

  return { exercisesEnriched, playsEnriched };
}

async function buildSessionPreviewHTML(session, exercises, opts) {
  const { exercisesEnriched, playsEnriched } = await enrichSessionAssets(session, exercises, opts);
  return buildSessionHTML(session, exercisesEnriched, { ...opts, plays: playsEnriched });
}

async function downloadSessionHTML(session, exercises, opts) {
  const { exercisesEnriched, playsEnriched } = await enrichSessionAssets(session, exercises, opts);
  const html = buildSessionHTML(session, exercisesEnriched, { ...opts, plays: playsEnriched });
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

const DEFAULT_SHEET_TEMPLATE = "data:image/png;base64,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IJ588kljzfzd73438xFEWFjYzPf+e++9t2LFivXr1w8MDODiWlxDQwNzmZqbm+ey/fyE0X/9619MoDR+ZjGGhoaWL19OEERsbOx//vOfTz75JDo6miCI559/nhko99prrzENDy+99NLevXuZ9ODt7d3W1saEEuaDLyYmJj09/eWXX2Y+4Ph8fl5eXmZm5ve//33m09nHx4ep3AaDIT09nSCIJUuWDA0NoULYdBhdvHjxyMjIzO3PnDnDtHq+8MILNE2Xl5cz35obNmzYu3fvd77zHQ6Hw2KxPvroI5qmDx8+vG7dOua78KmnnvrTn/6kVCo///xzgUBAUdT3v//9L774grnJcXd3r6ysZA7x3//937eeEthHGL1y5QrTHrNnz55b/+T48ePMDpna1dzczIRRLy+vlStXvvvuu9/97neZvptr165l7l42btxIEERycjITRi9evMjs4aGHHvriiy9++ctfOjo6cjicY8eOMZ9Or7zyCvOJ98Mf/vC9997LysoiCMLV1bWkpKStre2pp55iQuSyZct+97vfNTc3nz59WiAQGMPoO++8s3r1aoIgeDzec88998YbbxhDsNHFixcpiuLz+S+//PLevXvfe++9yMhI5iWrVKqpqalNmzYRBBESEvLRRx999tlnzBStjz32mFKppGn6r3/9K1Nuzz333N69ex944AEmUjMRQaFQxMfHM5/J4eHhP/jBD5hAwxSCSqViEglzzmvXrv373//++OOPM98Ov/vd72iaViqVjzzyCPOh/cEHH+zbty8zM5MgiK1bt05NTTFhmjnhvLw8plUYrCeMqlQq5vL5+vpWVVXNsvMLFy4w1eDdd981pknmyj7yyCMqlWpwcJCZh9LX1/eNN9548803mZ5U6enpcrl8cHDwpjD63nvvcTgcHo/3k5/85ODBg8899xzzt8a7LOZmkiAIJj8Awuj/OXz4MPPJy3R7Yj7uSZIUCoW9vb00Tb///vtPPfXUq6++ynwOnjhxgpnBhGmZGBsbY7oGOjo6Mlnh448/Zs7E19d3YGBAr9f/9Kc/ZX5y9uxZ5uP+iSeeiIyMfPrpp2c2qoF9hNEbN24w+eCBBx6gabqgoOD73//+E0880dLSQtP06OhobGwsQRDf/va3me3//ve/EwTh4uLC1J/p6Wlmz2lpacZ9Mj/5wQ9+wPzvBx98kJiYmJqa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V2fvskJCQjIzM69cuTI/P2+/UpRK5dmzZ7du3RoUFGTvK7p9+3Z9ff22bdtycnJcv60RRgEA4Avk5eXt3r378uXLFRUV9l4QdPv27d7e3qdOnbLTApD37t3r6ek5ePCgvbffHBwc/O1vf5uQkLBnzx4HryXpNmJjYw8fPjwyMnLs2DGVSmXXslJSUtLT0y9cuDA9PW2P44+Ojp44cWL37t32/lgyNzf33nvv6XS6w4cPh4aGroqGRhgFAIAvFhgY+Kd/+qdqtfr06dODg4N2LWvLli3BwcFnz54dGxtbwcPq9forV65MTk6++OKLIpHIfuev1WovXbpUVVV16NChjIwMF39C6uI8PDxeeuklmUx25syZxsZGu5aVmpq6cePGq1evtre3r+yRq6ur7927t2/fPrtOWmIYprq6+ty5c+vXr9+1axefz18trYwJfQAA8EQoinrhhRd6enpu377d0dGxZ88eirJXj0ZeXp6fn9+dO3dCQ0M3b978/Afs7++/e/duTExMWVmZXWupra3t7t27aWlpO3bsQAxdKRs3boyKirpz505XV9e+ffvs19McGxsrkUhu3brV09OzZ8+e589zCwsLFy9e9PPz2717t12nEE1PT589ezYoKOjgwYPe3t6rq30RRgEA4CkkJCSEhobW1dX97ne/KykpiYmJsVMkjY2NDQoKampqeuedd4qLiwMDA5+hO9NqtSqVyurqaqPRuHPnTrvuvTk3N1dRUaHX6w8cOOCAQYFrTWBg4KFDh+7fv//+++/n5+cnJibaaaCFn5/f/v37u7q63nvvvaysrJiYmGfbnkCpVHZ0dAwNDeXn58fFxdmvZhYXFxsbG3t7e0tLS6Ojo1dj4yKMAgDA0xGLxVu2bLENsOvq6srMzLTTw0exWFxcXJyZmXnt2jUul+vv7x8aGvqEQ+4WFxd7enrUavXU1FRubq5d04BWq21sbBwcHMzMzMSUefthsVjr1q1LTU09f/58X19fYmJienq6PQricDjp6elJSUm3b9++du1aUFBQQEBAfHz8k6y9YDabOzs71Wr15OSkTCZ788037VonjY2NHR0dQUFBf/qnf7p6Vw1DGAUAgGfh5+f35ptvNjU11dbWNjU17dixw067Cnl6eh46dGh2dravr6+zs7OpqYlhmLCwsPj4+Ieee5pMpuHh4YGBAYPBwOPxxGJx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";

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

function generateBasketballCourtDataUrl(variant) {
  const s = "#1B2A4A";
  const bg = "#f0e4c4";
  let svgStr;
  if (variant === "full") {
    const w = 430, h = 800, cx = w / 2;
    const keyW = w * 0.36, keyH = h * 0.18, keyX = cx - keyW / 2;
    const ftR = keyW / 2, tpR = w * 0.43;
    const hoopTop = keyH * 0.22, hoopBot = h - keyH * 0.22;
    svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/><rect x="1" y="1" width="${w-2}" height="${h-2}" fill="none" stroke="${s}" stroke-width="2"/><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="${s}" stroke-width="1.5"/><circle cx="${cx}" cy="${h/2}" r="${w*0.14}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${keyH} L ${cx-tpR} 0 M ${cx+tpR} ${keyH} L ${cx+tpR} 0" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${keyH} A ${tpR} ${tpR} 0 0 1 ${cx+tpR} ${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><rect x="${keyX}" y="0" width="${keyW}" height="${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-ftR} ${keyH} A ${ftR} ${ftR} 0 0 1 ${cx+ftR} ${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><circle cx="${cx}" cy="${hoopTop}" r="7" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${h-keyH} L ${cx-tpR} ${h} M ${cx+tpR} ${h-keyH} L ${cx+tpR} ${h}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${h-keyH} A ${tpR} ${tpR} 0 0 0 ${cx+tpR} ${h-keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><rect x="${keyX}" y="${h-keyH}" width="${keyW}" height="${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-ftR} ${h-keyH} A ${ftR} ${ftR} 0 0 0 ${cx+ftR} ${h-keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><circle cx="${cx}" cy="${hoopBot}" r="7" fill="none" stroke="${s}" stroke-width="1.5"/></svg>`;
  } else if (variant === "half-top") {
    const w = 430, h = 500, cx = w / 2;
    const keyW = w * 0.36, keyH = h * 0.36, keyX = cx - keyW / 2;
    const ftR = keyW / 2, tpR = w * 0.43;
    const hoopY = keyH * 0.22;
    svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/><rect x="1" y="1" width="${w-2}" height="${h-2}" fill="none" stroke="${s}" stroke-width="2"/><path d="M ${cx-tpR} ${keyH} L ${cx-tpR} 0 M ${cx+tpR} ${keyH} L ${cx+tpR} 0" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${keyH} A ${tpR} ${tpR} 0 0 1 ${cx+tpR} ${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><rect x="${keyX}" y="0" width="${keyW}" height="${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-ftR} ${keyH} A ${ftR} ${ftR} 0 0 1 ${cx+ftR} ${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><circle cx="${cx}" cy="${hoopY}" r="7" fill="none" stroke="${s}" stroke-width="1.5"/></svg>`;
  } else {
    const w = 430, h = 500, cx = w / 2;
    const keyW = w * 0.36, keyH = h * 0.36, keyX = cx - keyW / 2, keyY = h - keyH;
    const ftR = keyW / 2, tpR = w * 0.43;
    const hoopY = h - keyH * 0.22;
    svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/><rect x="1" y="1" width="${w-2}" height="${h-2}" fill="none" stroke="${s}" stroke-width="2"/><path d="M ${cx-tpR} ${keyY} L ${cx-tpR} ${h} M ${cx+tpR} ${keyY} L ${cx+tpR} ${h}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-tpR} ${keyY} A ${tpR} ${tpR} 0 0 0 ${cx+tpR} ${keyY}" fill="none" stroke="${s}" stroke-width="1.5"/><rect x="${keyX}" y="${keyY}" width="${keyW}" height="${keyH}" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M ${cx-ftR} ${keyY} A ${ftR} ${ftR} 0 0 0 ${cx+ftR} ${keyY}" fill="none" stroke="${s}" stroke-width="1.5"/><circle cx="${cx}" cy="${hoopY}" r="7" fill="none" stroke="${s}" stroke-width="1.5"/></svg>`;
  }
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
}

// ─── Fonctions utilitaires de dessin canvas (partagées entre DrawSheetView et DrawTacticalView) ───

function SizeSlider({ value, onChange, min, max, step = 0.1, width = 80, presets }) {
  return (
    <div className="flex items-center gap-1.5">
      {presets && (
        <div className="flex items-center gap-0.5 bg-[#1B2A4A]/5 rounded-full px-1 py-0.5">
          {presets.map(p => (
            <button key={p.l} type="button" onClick={() => onChange(p.v)}
              className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${value === p.v ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>
              {p.l}
            </button>
          ))}
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width, accentColor: "#FF6B35" }} />
      <span className="text-xs text-[#1B2A4A]/60 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

function _zigzagify(points, amplitude = 7, step = 12) {
  if (points.length < 2) return points;
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
}

function _catmullRomPath(ctx, pts) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
      p2.x, p2.y
    );
  }
}

function _sampleCatmullRom(pts, stepsPerSeg = 30) {
  if (pts.length < 2) return pts;
  const result = [];
  for (let seg = 0; seg < pts.length - 1; seg++) {
    const p0 = pts[Math.max(seg - 1, 0)];
    const p1 = pts[seg];
    const p2 = pts[seg + 1];
    const p3 = pts[Math.min(seg + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    for (let i = 0; i < stepsPerSeg; i++) {
      const t = i / stepsPerSeg, mt = 1 - t;
      result.push({
        x: mt*mt*mt*p1.x + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*p2.x,
        y: mt*mt*mt*p1.y + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*p2.y,
      });
    }
  }
  result.push(pts[pts.length - 1]);
  return result;
}

function _drawArrowHead(ctx, from, to, color, size, halfAngle = 0.45) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const a1 = angle + Math.PI - halfAngle, a2 = angle + Math.PI + halfAngle;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x + size * Math.cos(a1), to.y + size * Math.sin(a1));
  ctx.lineTo(to.x + size * Math.cos(a2), to.y + size * Math.sin(a2));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Libellés des styles de trait, adaptés au vocabulaire du sport (le rendu visuel
// derrière chaque valeur ne change pas, seul le nom affiché change).
const LINE_STYLE_LABELS = {
  football: { simple: "Passe / Tir", pointille: "Déplacement", zigzag: "Conduite", ecran: "Écran", tir: "Tir" },
  handball: { simple: "Passe", pointille: "Course sans ballon", zigzag: "Dribble", ecran: "Écran", tir: "Tir" },
  rugby: { simple: "Passe", pointille: "Soutien", zigzag: "Évitement", ecran: "Percussion", tir: "Coup de pied" },
  volleyball: { simple: "Passe / Manchette", pointille: "Déplacement", zigzag: "Feinte", ecran: "Bloc", tir: "Attaque" },
  default: { simple: "Déplacement", pointille: "Passe", zigzag: "Dribble", ecran: "Écran", tir: "Tir" },
};
function styleLabel(courtType, key) {
  return (LINE_STYLE_LABELS[courtType] || LINE_STYLE_LABELS.default)[key] || key;
}

function _drawZone(ctx, z) {
  const x = Math.min(z.x, z.x + z.w), y = Math.min(z.y, z.y + z.h);
  const w = Math.abs(z.w), h = Math.abs(z.h);
  ctx.save();
  ctx.fillStyle = (z.color || "#1B2A4A") + "26";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = z.color || "#1B2A4A";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.restore();
}

function _drawStroke(ctx, stroke) {
  const pts = stroke.points;
  if (pts.length < 2) return;
  if (stroke.erase) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.restore();
    return;
  }
  const last = pts[pts.length - 1];
  const prev = stroke.isCurve ? pts[Math.max(0, pts.length - 2)] : pts[Math.max(0, pts.length - 4)];
  const arrowSize = 6 + stroke.width * 2;
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  if (stroke.style === "tir") {
    // Pointe distincte du double trait (comme une flèche "=>" dessinée à la main) : triangle
    // plus fin et plus long, dont la largeur dépasse nettement l'écart entre les deux lignes,
    // qui s'arrêtent net avant la pointe au lieu de se prolonger dedans.
    const gap = stroke.width * 2.5;
    const tirArrowSize = 11 + stroke.width * 3.2;
    const tirHalfAngle = 0.32;
    const globalAngle = Math.atan2(last.y - pts[0].y, last.x - pts[0].x);
    const px = Math.cos(globalAngle + Math.PI / 2) * gap / 2;
    const py = Math.sin(globalAngle + Math.PI / 2) * gap / 2;
    const tirPts = [...pts.slice(0, -1), { x: last.x - Math.cos(angle) * tirArrowSize * 0.95, y: last.y - Math.sin(angle) * tirArrowSize * 0.95 }];
    const drawLine = (offX, offY) => {
      const op = tirPts.map(p => ({ x: p.x + offX, y: p.y + offY }));
      ctx.beginPath();
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width * 0.75;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([]);
      if (op.length < 3) { op.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); }
      else { ctx.moveTo(op[0].x, op[0].y); for (let i = 1; i < op.length - 1; i++) { const mx = (op[i].x + op[i + 1].x) / 2, my = (op[i].y + op[i + 1].y) / 2; ctx.quadraticCurveTo(op[i].x, op[i].y, mx, my); } ctx.lineTo(op[op.length - 1].x, op[op.length - 1].y); }
      ctx.stroke();
    };
    drawLine(px, py); drawLine(-px, -py);
    _drawArrowHead(ctx, prev, last, stroke.color, tirArrowSize, tirHalfAngle);
    return;
  }
  const drawPts = (stroke.arrow && stroke.style !== "ecran") ? [...pts.slice(0, -1), { x: last.x - Math.cos(angle) * arrowSize * 0.7, y: last.y - Math.sin(angle) * arrowSize * 0.7 }] : pts;
  ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.setLineDash(stroke.style === "pointille" ? [stroke.width * 3.5, stroke.width * 2.5] : []);
  if (stroke.isCurve && stroke.style === "zigzag") {
    // Vague de dribble lissée (comme une sinusoïde à la main), pas un zigzag à angles vifs :
    // on passe les points alternés par une spline Catmull-Rom au lieu de segments droits.
    const sampled = _sampleCatmullRom(stroke.arrow ? [...pts.slice(0, -1), { x: last.x - Math.cos(angle) * arrowSize * 0.7, y: last.y - Math.sin(angle) * arrowSize * 0.7 }] : pts);
    const zpts = _zigzagify(sampled, 3, 6);
    _catmullRomPath(ctx, zpts);
  } else if (stroke.isCurve) { _catmullRomPath(ctx, drawPts); }
  else if (drawPts.length < 3) { drawPts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); }
  else { ctx.moveTo(drawPts[0].x, drawPts[0].y); for (let i = 1; i < drawPts.length - 1; i++) { const mx = (drawPts[i].x + drawPts[i + 1].x) / 2, my = (drawPts[i].y + drawPts[i + 1].y) / 2; ctx.quadraticCurveTo(drawPts[i].x, drawPts[i].y, mx, my); } ctx.lineTo(drawPts[drawPts.length - 1].x, drawPts[drawPts.length - 1].y); }
  ctx.stroke(); ctx.setLineDash([]);
  if (stroke.arrow && stroke.style !== "ecran") _drawArrowHead(ctx, prev, last, stroke.color, arrowSize);
  if (stroke.style === "ecran") {
    const perpLen = 7 + stroke.width;
    const px = Math.cos(angle + Math.PI / 2) * perpLen, py = Math.sin(angle + Math.PI / 2) * perpLen;
    ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width * 1.2; ctx.lineCap = "round";
    ctx.moveTo(last.x - px, last.y - py); ctx.lineTo(last.x + px, last.y + py); ctx.stroke();
  }
}

const HANDBALL_ICON = (
  <svg viewBox="0 0 22 22" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="9" fill="#c0392b" stroke="#7b241c" strokeWidth="1.2"/>
    <path d="M 5 8 Q 11 5 17 8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M 3.5 12 Q 11 9.5 18.5 12" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M 5 16 Q 11 14 17 16" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M 11 2 Q 11 11 11 20" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);
// Matériel générique disponible pour tous les sports (préparation physique) + ballon/but
// propre au sport actif uniquement.
function EQUIPMENT_ITEMS(courtType) {
  const generic = [
    {v:"plot", icon: <span className="text-base">🔶</span>},
    {v:"chaise", icon: <span className="text-base">🪑</span>},
    {v:"cerceau", icon: <span className="text-base">⭕</span>},
    {v:"haie", icon: <span className="text-base">🚧</span>},
    {v:"jalon", icon: <span className="text-base">📍</span>},
    {v:"coupelle", icon: <span className="text-base">🟠</span>},
  ];
  if (courtType === "handball") return [...generic, {v:"handball", icon: HANDBALL_ICON}];
  if (courtType === "football") return [...generic, {v:"ballonfoot", icon: <span className="text-base">⚽</span>}, {v:"cage", icon: <span className="text-base">🥅</span>}];
  if (courtType === "basketball") return [...generic, {v:"ballonbasket", icon: <span className="text-base">🏀</span>}];
  if (courtType === "volleyball") return [...generic, {v:"ballonvolley", icon: <span className="text-base">🏐</span>}];
  if (courtType === "rugby") return [...generic, {v:"ballonrugby", icon: <span className="text-base">🏉</span>}];
  return generic;
}

// Panneau d'accès rapide au matériel/style de trait, en plus des sélecteurs compacts déjà en
// place (jamais remplacés) — ouvert par un glisser depuis le bord droit du dessinateur ou en
// tapant la poignée. Réutilise directement les setters existants (setTool/setToolLineStyles/
// setPlayerLabel) pour rester strictement cohérent avec le reste de la barre d'outils.
// Panneau de modification, uniquement en plein écran : glisser de gauche à droite (ou taper
// la poignée) ouvre l'accès à annuler/effacer, sélection-déplacement, gomme, couleurs, épaisseur,
// flèche — sans avoir à quitter le plein écran. Miroir de DrawQuickPanel mais côté gauche.
// Bouton "Annuler" flottant et déplaçable (surtout utile en plein écran) : glisser pour le
// positionner où on veut, taper pour annuler. Un petit cadenas fige la position une fois placé,
// pour ne plus le déplacer par erreur en dessinant à côté. Position/verrouillage mémorisés
// (localStorage) pour rester où on les a mis d'une session à l'autre.
function FloatingUndoButton({ onUndo }) {
  const [pos, setPos] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("cpb_floating_undo_pos")); if (saved?.x != null) return saved; } catch {}
    return { x: 16, y: 90 };
  });
  const [locked, setLocked] = useState(() => localStorage.getItem("cpb_floating_undo_locked") === "1");
  const dragRef = useRef(null);

  const onPointerDown = (e) => {
    if (locked) return;
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragRef.current.startX, dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };
  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const { moved } = dragRef.current;
    dragRef.current = null;
    if (moved) {
      setPos(p => { localStorage.setItem("cpb_floating_undo_pos", JSON.stringify(p)); return p; });
    } else {
      onUndo();
    }
  };
  const toggleLock = (e) => {
    e.stopPropagation();
    setLocked(l => { const next = !l; localStorage.setItem("cpb_floating_undo_locked", next ? "1" : "0"); return next; });
  };

  return (
    <div style={{ position: "absolute", left: pos.x, top: pos.y, touchAction: "none" }} className="z-50 no-print"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className={`relative w-12 h-12 rounded-full bg-[#1B2A4A] text-white shadow-lg flex items-center justify-center select-none ${locked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
        title="Annuler (glisser pour déplacer)">
        <Undo2 size={18} />
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={toggleLock}
          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${locked ? "bg-[#FF6B35] text-white" : "bg-white text-[#1B2A4A]"}`}
          title={locked ? "Déverrouiller la position" : "Verrouiller la position"}>
          {locked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
      </div>
    </div>
  );
}

function DrawModifyPanel({ tool, setTool, color, setColor, lineWidth, setLineWidth, eraserSize, setEraserSize, arrowEnd, setArrowEnd, playerSize, setPlayerSize, playerColor, setPlayerColor, onUndo, onClearAll, open, setOpen }) {
  const touchStartX = useRef(null);

  const onEdgeTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onEdgeTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 24) setOpen(true);
    else if (dx < -24) setOpen(false);
    touchStartX.current = null;
  };

  const colors = ["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"];

  return (
    <>
      <div onTouchStart={onEdgeTouchStart} onTouchEnd={onEdgeTouchEnd} onClick={() => setOpen(!open)}
        className="absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-6 h-16 bg-[#1B2A4A] text-white rounded-r-lg shadow-lg cursor-pointer transition-[left] duration-200 no-print"
        style={{ left: open ? 224 : 0, touchAction: "pan-y" }} title="Modifier (glisser ou taper)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none" }}><polyline points="15 18 9 12 15 6" /></svg>
      </div>
      {open && <div className="absolute inset-0 z-30 bg-black/10 no-print" onClick={() => setOpen(false)} />}
      <div onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
        className={`absolute top-0 left-0 bottom-0 z-[35] w-56 bg-white shadow-2xl border-r border-[#1B2A4A]/10 overflow-y-auto transition-transform duration-200 no-print ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-3 space-y-4">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { onUndo(); setOpen(false); }}
              className="flex-1 py-2 rounded-lg border border-[#1B2A4A]/15 text-xs font-semibold text-[#1B2A4A] hover:bg-[#1B2A4A]/5">↩ Annuler</button>
            <button type="button" onClick={() => { onClearAll(); setOpen(false); }}
              className="flex-1 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50">🗑 Tout effacer</button>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Outil</div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setTool("select")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tool === "select" ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>🖐 Déplacer</button>
              <button type="button" onClick={() => setTool("eraser")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tool === "eraser" ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>🧹 Gomme</button>
            </div>
            {tool === "eraser" && (
              <select value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))}
                className="w-full mt-1.5 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-xs bg-white">
                <option value={12}>Petite</option>
                <option value={24}>Moyenne</option>
                <option value={40}>Grande</option>
              </select>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Couleur</div>
            <div className="flex flex-wrap gap-1.5">
              {colors.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Épaisseur du trait</div>
            <SizeSlider value={lineWidth} onChange={setLineWidth} min={1} max={10} step={0.5} presets={[{v:1.5,l:"S"},{v:2.5,l:"M"},{v:4,l:"L"}]} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Épaisseur joueur</div>
            <SizeSlider value={playerSize} onChange={setPlayerSize} min={0.4} max={2.2} step={0.1} presets={[{v:0.6,l:"S"},{v:1,l:"M"},{v:1.5,l:"L"}]} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Couleur joueur</div>
            <div className="flex flex-wrap gap-1.5">
              {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
                <button key={c} type="button" onClick={() => setPlayerColor(c)}
                  className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: c, borderColor: playerColor === c ? "#FF6B35" : "transparent" }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
            <input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche en bout de trait
          </label>
        </div>
      </div>
    </>
  );
}

function DrawQuickPanel({ courtType, tool, lastLineTool, toolLineStyles, setTool, setToolLineStyles, playerLabel, setPlayerLabel, playerHasBall, setPlayerHasBall, playerIsDefender, setPlayerIsDefender, open, setOpen }) {
  const touchStartX = useRef(null);

  const onEdgeTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onEdgeTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -24) setOpen(true);
    else if (dx > 24) setOpen(false);
    touchStartX.current = null;
  };

  const actions = [
    { key: "simple", glyph: "⟶" },
    { key: "pointille", glyph: "┄┄▶" },
    { key: "zigzag", glyph: "∿▶" },
    { key: "ecran", glyph: "⊣" },
    { key: "tir", glyph: "⇒" },
  ].filter(a => !(courtType === "football" && (a.key === "ecran" || a.key === "tir")));

  // L'outil (Stylo vs Courbe) suit le DERNIER outil de trait utilisé (lastLineTool), pas l'outil
  // actuellement affiché — sinon passer par "Joueur" pour ajouter un joueur puis choisir une
  // action retombait toujours sur Stylo, en perdant le fait qu'on dessinait au Courbe juste avant.
  const targetToolFor = (key) => key === "zigzag" ? "curve" : (lastLineTool === "curve" ? "curve" : "pen");
  const isActionActive = (key) => tool === targetToolFor(key) && (toolLineStyles[targetToolFor(key)] ?? "simple") === key;

  const chooseAction = (key) => {
    const targetTool = targetToolFor(key);
    setTool(targetTool);
    setToolLineStyles(s => ({ ...s, [targetTool]: key }));
    setOpen(false);
  };
  const choosePlayer = (n, hasBall) => { setTool("player"); setPlayerIsDefender(false); setPlayerLabel(String(n)); setPlayerHasBall(hasBall); setOpen(false); };
  const chooseDefender = (n) => { setTool("player"); setPlayerIsDefender(true); setPlayerLabel("X" + n); setPlayerHasBall(false); setOpen(false); };
  const chooseMaterial = (v) => { setTool("player"); setPlayerIsDefender(false); setPlayerLabel(v); setOpen(false); };
  const chooseText = () => { setTool("text"); setOpen(false); };

  return (
    <>
      <div onTouchStart={onEdgeTouchStart} onTouchEnd={onEdgeTouchEnd} onClick={() => setOpen(!open)}
        className="absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-6 h-16 bg-[#1B2A4A] text-white rounded-l-lg shadow-lg cursor-pointer transition-[right] duration-200 no-print"
        style={{ right: open ? 224 : 0, touchAction: "pan-y" }} title="Menu rapide (glisser ou taper)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none" }}><polyline points="9 18 15 12 9 6" /></svg>
      </div>
      {open && <div className="absolute inset-0 z-30 bg-black/10 no-print" onClick={() => setOpen(false)} />}
      <div onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
        className={`absolute top-0 right-0 bottom-0 z-[35] w-56 bg-white shadow-2xl border-l border-[#1B2A4A]/10 overflow-y-auto transition-transform duration-200 no-print ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-3 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Joueurs</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => choosePlayer(n, true)} title={`Joueur ${n} avec ballon`}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${tool === "player" && playerLabel === String(n) && playerHasBall ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => choosePlayer(n, false)} title={`Joueur ${n} sans ballon`}
                  className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm font-bold transition-colors ${tool === "player" && playerLabel === String(n) && !playerHasBall ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:border-[#1B2A4A]/40"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => chooseDefender(n)} title={`Défenseur X${n}`}
                  className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm font-bold transition-colors ${tool === "player" && playerLabel === "X" + n && playerIsDefender ? "bg-red-600 border-red-600 text-white" : "border-red-300 text-red-600 hover:border-red-500"}`}>
                  X{n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Outil</div>
            <div className="flex gap-1.5 mb-2">
              <button type="button" onClick={() => setTool("pen")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tool === "pen" ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>Stylo</button>
              <button type="button" onClick={() => setTool("curve")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${tool === "curve" ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>Courbe</button>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Actions</div>
            <div className="space-y-1">
              {actions.map(a => (
                <button key={a.key} type="button" onClick={() => chooseAction(a.key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${isActionActive(a.key) ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>
                  <span className="w-8 text-center font-mono text-sm flex-shrink-0">{a.glyph}</span>
                  <span className="text-xs font-medium">{styleLabel(courtType, a.key)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Divers</div>
            <div className="grid grid-cols-4 gap-1.5">
              {EQUIPMENT_ITEMS(courtType).map(eq => (
                <button key={eq.v} type="button" onClick={() => chooseMaterial(eq.v)}
                  className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${tool === "player" && playerLabel === eq.v ? "bg-[#1B2A4A] border-[#1B2A4A]" : "border-[#1B2A4A]/15 hover:bg-[#1B2A4A]/5"}`}>
                  {eq.icon}
                </button>
              ))}
              <button type="button" onClick={chooseText}
                className={`aspect-square rounded-lg border flex items-center justify-center font-bold text-sm transition-colors ${tool === "text" ? "bg-[#1B2A4A] border-[#1B2A4A] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>
                T
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function _drawPlayerToken(ctx, t) {
  const sc = t.size ?? 1; const r = 16 * sc;
  ctx.save();
  if (t.kind === "plot") {
    const h = 28 * sc, w = 22 * sc;
    ctx.beginPath(); ctx.moveTo(t.x, t.y - h / 2); ctx.lineTo(t.x - w / 2, t.y + h / 2); ctx.lineTo(t.x + w / 2, t.y + h / 2); ctx.closePath();
    ctx.fillStyle = "#FF6B35"; ctx.fill(); ctx.strokeStyle = "#c0440a"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x - w * 0.28, t.y + h * 0.12); ctx.lineTo(t.x + w * 0.28, t.y + h * 0.12); ctx.strokeStyle = "white"; ctx.lineWidth = 2.5; ctx.stroke();
  } else if (t.kind === "chaise") {
    const s = 18 * sc; ctx.strokeStyle = "#5a3e2b"; ctx.lineWidth = 2.5 * sc; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(t.x - s / 2, t.y); ctx.lineTo(t.x + s / 2, t.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x + s / 2, t.y); ctx.lineTo(t.x + s / 2, t.y - s * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x - s / 2, t.y); ctx.lineTo(t.x - s / 2, t.y + s * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x + s / 2, t.y); ctx.lineTo(t.x + s / 2, t.y + s * 0.7); ctx.stroke();
  } else if (t.kind === "cerceau") {
    const cr = 16 * sc; ctx.beginPath(); ctx.arc(t.x, t.y, cr, 0, Math.PI * 2); ctx.strokeStyle = "#e07020"; ctx.lineWidth = 3 * sc; ctx.stroke();
  } else if (t.kind === "handball") {
    const br = 11 * sc;
    ctx.beginPath(); ctx.arc(t.x, t.y, br, 0, Math.PI * 2); ctx.fillStyle = "#c0392b"; ctx.fill(); ctx.strokeStyle = "#7b241c"; ctx.lineWidth = 1.5 * sc; ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, br, 0, Math.PI * 2); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = sc; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x - br, t.y); ctx.lineTo(t.x + br, t.y); ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = sc; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x, t.y - br); ctx.lineTo(t.x, t.y + br); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, br * 0.6, Math.PI * 0.2, Math.PI * 0.9); ctx.stroke();
  } else if (t.kind === "ballonfoot") {
    ctx.font = `${Math.round(24 * sc)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("⚽", t.x, t.y + 1 * sc);
  } else if (t.kind === "cage") {
    const w = 30 * sc, h = 20 * sc;
    const x0 = t.x - w / 2, y0 = t.y - h;
    ctx.strokeStyle = "#1B2A4A"; ctx.lineWidth = 2 * sc; ctx.lineJoin = "round";
    ctx.strokeRect(x0, y0, w, h);
    ctx.strokeStyle = "rgba(27,42,74,0.35)"; ctx.lineWidth = 0.8 * sc;
    for (let i = 1; i < 4; i++) { const gx = x0 + (w / 4) * i; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + h); ctx.stroke(); }
    for (let i = 1; i < 3; i++) { const gy = y0 + (h / 3) * i; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + w, gy); ctx.stroke(); }
    ctx.strokeStyle = "#1B2A4A"; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(t.x, y0 + h); ctx.lineTo(t.x, y0 + h + 4 * sc); ctx.stroke();
  } else if (t.kind === "haie") {
    const w = 22 * sc, h = 14 * sc;
    ctx.strokeStyle = "#D62828"; ctx.lineWidth = 2.5 * sc; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(t.x - w / 2, t.y + h / 2); ctx.lineTo(t.x - w / 2, t.y - h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x + w / 2, t.y + h / 2); ctx.lineTo(t.x + w / 2, t.y - h / 2); ctx.stroke();
    ctx.strokeStyle = "#F2B705"; ctx.lineWidth = 3 * sc;
    ctx.beginPath(); ctx.moveTo(t.x - w / 2, t.y - h / 2); ctx.lineTo(t.x + w / 2, t.y - h / 2); ctx.stroke();
  } else if (t.kind === "jalon") {
    const h = 26 * sc;
    ctx.strokeStyle = "#1B2A4A"; ctx.lineWidth = 2 * sc; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(t.x, t.y + h / 2); ctx.lineTo(t.x, t.y - h / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y - h / 2, 4.5 * sc, 0, Math.PI * 2); ctx.fillStyle = "#D62828"; ctx.fill();
  } else if (t.kind === "coupelle") {
    const w = 20 * sc, h = 6 * sc;
    ctx.beginPath(); ctx.ellipse(t.x, t.y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FF6B35"; ctx.fill(); ctx.strokeStyle = "#c0440a"; ctx.lineWidth = 1.3 * sc; ctx.stroke();
  } else if (t.kind === "ballonbasket") {
    ctx.font = `${Math.round(24 * sc)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏀", t.x, t.y + 1 * sc);
  } else if (t.kind === "ballonvolley") {
    ctx.font = `${Math.round(24 * sc)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏐", t.x, t.y + 1 * sc);
  } else if (t.kind === "ballonrugby") {
    ctx.font = `${Math.round(24 * sc)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏉", t.x, t.y + 1 * sc);
  } else if (t.role === "defender") {
    ctx.font = `bold ${Math.round(17 * sc)}px sans-serif`; ctx.fillStyle = t.color || "#D62828"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.label, t.x, t.y);
  } else if (t.hasBall) {
    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill(); ctx.lineWidth = 2 * sc; ctx.strokeStyle = t.color || "#1B2A4A"; ctx.stroke();
    ctx.font = `bold ${Math.round(15 * sc)}px sans-serif`; ctx.fillStyle = t.color || "#1B2A4A"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.label, t.x, t.y);
  } else {
    ctx.font = `bold ${Math.round(17 * sc)}px sans-serif`; ctx.fillStyle = t.color || "#1B2A4A"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.label, t.x, t.y);
  }
  ctx.restore();
}

function _tokenHaloRadius(t) {
  const sc = t.size ?? 1;
  switch (t.kind) {
    case "plot": return 17 * sc;
    case "chaise": return 14 * sc;
    case "cerceau": return 19 * sc;
    case "handball": return 14 * sc;
    case "ballonfoot": case "ballonbasket": case "ballonvolley": case "ballonrugby": return 15 * sc;
    case "cage": return 19 * sc;
    case "haie": return 15 * sc;
    case "jalon": return 16 * sc;
    case "coupelle": return 13 * sc;
    default: return 16 * sc;
  }
}

function _parseInline(text) {
  const segs = []; const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), b: false, i: false });
    if (m[2]) segs.push({ text: m[2], b: true, i: true });
    else if (m[3]) segs.push({ text: m[3], b: true, i: false });
    else segs.push({ text: m[4], b: false, i: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last), b: false, i: false });
  return segs.length ? segs : [{ text, b: false, i: false }];
}

function _segFont(t, seg) { return `${(t.italic || seg.i) ? "italic " : ""}${(t.bold || seg.b) ? "bold " : ""}${t.size}px sans-serif`; }

function _drawTextElement(ctx, t) {
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const lineHeight = t.size * 1.25;
  const lines = t.value.split("\n");
  if (t.highlight) {
    const maxW = Math.max(...lines.map(line => _parseInline(line).reduce((w, seg) => { ctx.font = _segFont(t, seg); return w + ctx.measureText(seg.text).width; }, 0)));
    ctx.fillStyle = "rgba(255,230,0,0.55)"; ctx.fillRect(t.x - 2, t.y - 2, maxW + 4, lines.length * lineHeight + 4);
  }
  ctx.fillStyle = t.color;
  lines.forEach((line, li) => {
    let xOff = 0;
    _parseInline(line).forEach(seg => { ctx.font = _segFont(t, seg); ctx.fillText(seg.text, t.x + xOff, t.y + li * lineHeight); xOff += ctx.measureText(seg.text).width; });
  });
}

function DrawSheetView({ onValidate, onAddDirect, onCancel, processing, courtType = "basketball", referencePhoto = null, gabaritKey = "sheetGabarits", initialImage = null }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const bgImgRef = useRef(null);
  const elementsRef = useRef([]);
  const currentRef = useRef(null);
  const templateInputRef = useRef(null);
  const [color, setColor] = useState("#1B2A4A");
  const [lineWidth, setLineWidth] = useState(2.5);
  const [eraserSize, setEraserSize] = useState(24);
  const [arrowEnd, setArrowEnd] = useState(true);
  const [tool, setTool] = useState("pen"); // pen | player | text | select
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSwipePanel, setActiveSwipePanel] = useState(null); // "quick" | "modify" | null — jamais les deux ouverts en même temps
  // Le style de trait (simple/pointillé/zigzag/écran/tir) est mémorisé séparément par outil
  // (Stylo vs Courbe notamment), pour éviter qu'un style choisi sur l'un ne "déteigne" sur
  // l'autre en changeant d'outil — surprenant sinon (ex: garder "Tir" en passant sur Courbe).
  const [toolLineStyles, setToolLineStyles] = useState({});
  const lineStyle = toolLineStyles[tool] ?? "simple";
  const setLineStyle = (val) => setToolLineStyles(s => ({ ...s, [tool]: val }));
  // Dernier outil de trait utilisé (Stylo/Courbe) — distinct de `tool`, qui peut valoir "player"/
  // "text"/etc. entre-temps. Sert au panneau rapide pour retomber sur le bon outil quand on
  // choisit une action après être passé par "Joueur" (sinon ça retombait toujours sur Stylo).
  const [lastLineTool, setLastLineTool] = useState("pen");
  useEffect(() => { if (tool === "pen" || tool === "curve") setLastLineTool(tool); }, [tool]);
  const draggingRef = useRef(null); // { el, startX, startY, moved }
  const [textSize, setTextSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textHighlight, setTextHighlight] = useState(false);
  const [pendingText, setPendingText] = useState(null); // { x, y, screenX, screenY, value }
  const [noteFields, setNoteFields] = useState([
    { id: "obj", label: "Objectif", value: "" },
    { id: "cons", label: "Consignes", value: "" },
    { id: "var", label: "Variantes", value: "" },
    { id: "pts", label: "Points clés", value: "" },
  ]);
  const [showNotes, setShowNotes] = useState(false);
  const updateNoteField = (id, value) => setNoteFields(f => f.map(x => x.id === id ? { ...x, value } : x));
  const addNoteField = () => setNoteFields(f => [...f, { id: uid(), label: "Note", value: "" }]);
  const removeNoteField = (id) => setNoteFields(f => f.filter(x => x.id !== id));
  const renameNoteField = (id, label) => setNoteFields(f => f.map(x => x.id === id ? { ...x, label } : x));
  const [playerLabel, setPlayerLabel] = useState("1");
  const [playerHasBall, setPlayerHasBall] = useState(false);
  const [playerColor, setPlayerColor] = useState("#1B2A4A"); // permet de distinguer plusieurs "équipes"/groupes de joueurs
  const [playerIsDefender, setPlayerIsDefender] = useState(false);
  const [playerSize, setPlayerSize] = useState(1); // 0.6 petit, 1 moyen, 1.5 grand
  const [dims, setDims] = useState({ width: 900, height: 1273 });
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const DEFAULT_GABARITS = [
    { name: "Gabarit 1", dataUrl: null },
    { name: "Gabarit 2", dataUrl: null },
    { name: "Gabarit 3", dataUrl: null },
  ];
  const [gabarits, setGabarits] = useState(DEFAULT_GABARITS);
  const [activeGab, setActiveGab] = useState(0);
  const [editingGabName, setEditingGabName] = useState(null); // index being renamed
  const [showRefPhoto, setShowRefPhoto] = useState(true);
  const [courtVariant, setCourtVariant] = useState(null);
  const [selectedEl, setSelectedEl] = useState(null);
  const curvePointsRef = useRef([]);
  const [curvePoints, setCurvePoints] = useState([]);
  const lastClickTimeRef = useRef(0);

  const loadBackground = (src) => {
    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      setDims({ width: img.naturalWidth, height: img.naturalHeight });
      setTimeout(redraw, 0);
    };
    img.src = src;
  };

  const fetchImgAsDataUrl = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  useEffect(() => {
    // Reprendre un dessin déjà validé (ex: "Dessiner la séance" rouvert) : on charge cette image
    // comme fond au lieu du gabarit vierge, pour continuer à dessiner par-dessus sans repartir
    // de zéro et perdre ce qui était déjà là.
    if (initialImage) { loadBackground(initialImage); return; }
    (async () => {
      try {
        const stored = await storage.get(gabaritKey);
        const loaded = stored ? JSON.parse(stored.value) : DEFAULT_GABARITS;
        let merged = DEFAULT_GABARITS.map((d, i) => loaded[i] || d);
        const FICHE_SEANCE_SPORTS = ["basketball", "football", "handball", "rugby", "volleyball"];
        if (FICHE_SEANCE_SPORTS.includes(courtType) && gabaritKey === "sheetGabarits" && !merged[0]?.dataUrl) {
          const resp = await fetch(`/${courtType}-fiche-seance.png`);
          const blob = await resp.blob();
          const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(blob); });
          merged = merged.map((g, i) => i === 0 ? { name: "Fiche séance", dataUrl } : g);
        }
        setGabarits(merged);
        loadBackground(merged[0].dataUrl || DEFAULT_SHEET_TEMPLATE);
      } catch {
        loadBackground(DEFAULT_SHEET_TEMPLATE);
      }
    })();
  }, []);

  const saveGabarits = async (next) => {
    setGabarits(next);
    await storage.set(gabaritKey, JSON.stringify(next));
  };

  const switchGabarit = (idx) => {
    setActiveGab(idx);
    elementsRef.current = [];
    loadBackground(gabarits[idx].dataUrl || DEFAULT_SHEET_TEMPLATE);
  };

  const handleTemplateUpload = async (file) => {
    if (!file) return;
    setLoadingTemplate(true);
    try {
      let dataUrl;
      if (file.type === "application/pdf") {
        if (!window.pdfjsLib) { window.alert("Le lecteur PDF n'est pas prêt, réessaie dans une seconde."); setLoadingTemplate(false); return; }
        const pages = await renderPdfPages(file, 1);
        dataUrl = pages[0];
      } else {
        dataUrl = await readImageAsJpeg(file, 1400, 0.9);
      }
      const next = gabarits.map((g, i) => i === activeGab ? { ...g, dataUrl } : g);
      await saveGabarits(next);
      elementsRef.current = [];
      loadBackground(dataUrl);
    } catch (e) {
      console.error(e);
      window.alert("Impossible de charger ce fichier comme gabarit.");
    }
    setLoadingTemplate(false);
  };

  const resetCurrentGabarit = async () => {
    const next = gabarits.map((g, i) => i === activeGab ? { ...g, dataUrl: null } : g);
    await saveGabarits(next);
    elementsRef.current = [];
    loadBackground(DEFAULT_SHEET_TEMPLATE);
  };

  const renameGabarit = (idx, name) => {
    const next = gabarits.map((g, i) => i === idx ? { ...g, name } : g);
    saveGabarits(next);
    setEditingGabName(null);
  };

  const zigzagify = _zigzagify;
  const drawArrowHead = _drawArrowHead;
  const drawStroke = _drawStroke;
  const drawZone = _drawZone;
  const drawPlayerToken = _drawPlayerToken;
  const parseInline = _parseInline;
  const segFont = _segFont;
  const drawTextElement = _drawTextElement;

  const selectedElRef = useRef(null);

  // Raccourcis clavier : Suppr/Backspace supprime l'élément sélectionné, Cmd/Ctrl+C copie,
  // Cmd/Ctrl+V colle (léger décalage). Même logique que DrawTacticalView.
  const clipboardRef = useRef(null);
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const sel = selectedElRef.current;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        elementsRef.current = elementsRef.current.filter(x => x !== sel);
        selectedElRef.current = null; setSelectedEl(null); redraw();
        return;
      }
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "c" && sel) {
        e.preventDefault();
        clipboardRef.current = JSON.parse(JSON.stringify(sel));
        return;
      }
      if (cmd && e.key === "v" && clipboardRef.current) {
        e.preventDefault();
        const clone = JSON.parse(JSON.stringify(clipboardRef.current));
        if (clone.points) clone.points = clone.points.map(p => ({ x: p.x + 15, y: p.y + 15 }));
        else { clone.x += 15; clone.y += 15; }
        elementsRef.current.push(clone);
        selectedElRef.current = clone; setSelectedEl(clone); redraw();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Buffer hors-écran pour les éléments (tokens/traits/textes), séparé du fond.
  // La gomme applique un destination-out sur CE buffer uniquement, jamais sur
  // le fond du terrain, pour éviter de créer une zone transparente qui
  // ressortirait noire une fois exportée en JPEG.
  const elementsCanvasRef = useRef(null);
  const getElementsCanvas = () => {
    const canvas = canvasRef.current;
    if (!elementsCanvasRef.current) elementsCanvasRef.current = document.createElement("canvas");
    const buf = elementsCanvasRef.current;
    if (canvas && (buf.width !== canvas.width || buf.height !== canvas.height)) {
      buf.width = canvas.width; buf.height = canvas.height;
    }
    return buf;
  };
  const compositeMain = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImgRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(getElementsCanvas(), 0, 0);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImgRef.current) return;
    const buf = getElementsCanvas();
    const bctx = buf.getContext("2d");
    bctx.clearRect(0, 0, buf.width, buf.height);
    elementsRef.current.forEach(el => {
      if (el.type === "token") drawPlayerToken(bctx, el);
      else if (el.type === "text") drawTextElement(bctx, el);
      else if (el.type === "zone") drawZone(bctx, el);
      else drawStroke(bctx, el);
      // Highlight selected element
      if (el === selectedElRef.current) {
        if (el.type === "token") {
          bctx.save();
          bctx.strokeStyle = "#FF6B35";
          bctx.lineWidth = 3;
          bctx.setLineDash([4, 3]);
          bctx.beginPath();
          bctx.arc(el.x, el.y, _tokenHaloRadius(el), 0, Math.PI * 2);
          bctx.stroke();
          bctx.setLineDash([]);
          bctx.restore();
        } else if (el.type === "stroke" && el.isCurve) {
          el.points.forEach(p => {
            bctx.beginPath(); bctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            bctx.fillStyle = "rgba(255,107,53,0.9)"; bctx.fill();
            bctx.strokeStyle = "white"; bctx.lineWidth = 2; bctx.stroke();
          });
        } else if (el.type === "stroke") {
          bctx.save();
          bctx.strokeStyle = "#FF6B35";
          bctx.lineWidth = el.width + 6;
          bctx.lineCap = "round";
          bctx.lineJoin = "round";
          bctx.globalAlpha = 0.35;
          bctx.beginPath();
          el.points.forEach((p, i) => { if (i === 0) bctx.moveTo(p.x, p.y); else bctx.lineTo(p.x, p.y); });
          bctx.stroke();
          bctx.restore();
          // Poignées aux extrémités pour montrer où glisser pour rallonger/raccourcir
          if (tool === "select" && el.points.length > 1) {
            [el.points[0], el.points[el.points.length - 1]].forEach(p => {
              bctx.beginPath(); bctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
              bctx.fillStyle = "rgba(255,107,53,0.9)"; bctx.fill();
              bctx.strokeStyle = "white"; bctx.lineWidth = 2; bctx.stroke();
            });
          }
        }
      }
    });
    compositeMain();
    // Preview courbe en cours (par-dessus, sur le canvas principal)
    const ctx = canvas.getContext("2d");
    const cpPts = curvePointsRef.current;
    if (cpPts.length >= 1) {
      if (cpPts.length >= 2) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([6, 4]);
        ctx.beginPath(); _catmullRomPath(ctx, cpPts); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
      cpPts.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#FF6B35" : color; ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      });
    }
  };

  const toCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const commitCurve = () => {
    const pts = curvePointsRef.current;
    if (pts.length >= 2) {
      elementsRef.current.push({ type: "stroke", color, width: lineWidth, style: lineStyle, arrow: arrowEnd, points: pts, isCurve: true });
    }
    curvePointsRef.current = [];
    setCurvePoints([]);
    redraw();
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    try { canvasRef.current.setPointerCapture?.(e.pointerId); } catch {}
    if (tool === "curve") {
      const pt = toCanvasPoint(e);
      const now = Date.now();
      const isDbl = (now - lastClickTimeRef.current) < 350;
      lastClickTimeRef.current = now;
      if (isDbl && curvePointsRef.current.length >= 1) {
        commitCurve();
      } else {
        curvePointsRef.current = [...curvePointsRef.current, pt];
        setCurvePoints([...curvePointsRef.current]);
        redraw();
      }
      return;
    }
    if (tool === "text") {
      if (pendingText) commitPendingText();
      const pt = toCanvasPoint(e);
      const wrapRect = wrapRef.current.getBoundingClientRect();
      setPendingText({ x: pt.x, y: pt.y, screenX: e.clientX - wrapRect.left, screenY: e.clientY - wrapRect.top, value: "" });
      return;
    }
    // Cliquer sur un élément déjà posé (joueur, mouvement, matériel) le sélectionne
    // pour le déplacer/supprimer — quel que soit l'outil actif (sauf gomme/texte/courbe/stylo :
    // avec le stylo, cliquer sur un joueur doit démarrer un trait depuis lui, pas le déplacer).
    if (tool !== "eraser" && tool !== "pen") {
      const pt = toCanvasPoint(e);
      if (tool === "select") {
        const sel = selectedElRef.current;
        if (sel?.type === "stroke" && sel.isCurve) {
          const pidx = sel.points.findIndex(p => Math.hypot(pt.x - p.x, pt.y - p.y) <= 14);
          if (pidx >= 0) { draggingRef.current = { el: sel, pointIdx: pidx, startX: pt.x, startY: pt.y, moved: false }; return; }
        } else if (sel?.type === "stroke" && sel.points?.length > 1) {
          // Permet de rallonger/raccourcir un trait simple en glissant l'une de ses extrémités
          for (const idx of [0, sel.points.length - 1]) {
            const p = sel.points[idx];
            if (p && Math.hypot(pt.x - p.x, pt.y - p.y) <= 14) {
              draggingRef.current = { el: sel, pointIdx: idx, startX: pt.x, startY: pt.y, moved: false };
              return;
            }
          }
        }
      }
      const el = findElementAt(pt);
      if (el) {
        draggingRef.current = { el, startX: pt.x, startY: pt.y, origX: pt.x, origY: pt.y, moved: false };
        return;
      }
      if (tool === "select") {
        selectedElRef.current = null;
        setSelectedEl(null);
        redraw();
        return;
      }
    }
    if (tool === "player") {
      const pt = toCanvasPoint(e);
      const equipKinds = ["plot", "chaise", "cerceau", "handball", "cage", "haie", "jalon", "coupelle", "ballonfoot", "ballonbasket", "ballonvolley", "ballonrugby"];
      const isEquip = equipKinds.includes(playerLabel);
      elementsRef.current.push(isEquip
        ? { type: "token", x: pt.x, y: pt.y, kind: playerLabel, size: playerSize }
        : { type: "token", x: pt.x, y: pt.y, label: playerLabel, hasBall: playerHasBall, role: playerIsDefender ? "defender" : "offense", size: playerSize, color: playerColor });
      redraw();
      // Auto-incrément du numéro de joueur
      const numSeq = ["1","2","3","4","5","6","7","8","9","10","11","12"];
      const xSeq = ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"];
      const idxNum = numSeq.indexOf(playerLabel);
      const idxX = xSeq.indexOf(playerLabel);
      if (idxNum >= 0 && idxNum < numSeq.length - 1) setPlayerLabel(numSeq[idxNum + 1]);
      else if (idxX >= 0 && idxX < xSeq.length - 1) setPlayerLabel(xSeq[idxX + 1]);
      return;
    }
    if (tool === "zone") {
      const pt = toCanvasPoint(e);
      currentRef.current = { type: "zone", x: pt.x, y: pt.y, w: 0, h: 0, color };
      return;
    }
    currentRef.current = tool === "eraser"
      ? { type: "stroke", erase: true, width: eraserSize, points: [toCanvasPoint(e)] }
      : { type: "stroke", color, width: lineWidth, style: lineStyle, arrow: arrowEnd, points: [toCanvasPoint(e)] };
  };
  const handlePointerMove = (e) => {
    if (tool === "curve") { e.preventDefault(); return; }
    if (draggingRef.current) {
      e.preventDefault();
      const pt = toCanvasPoint(e);
      const d = draggingRef.current;
      if (d.pointIdx !== undefined) {
        d.el.points[d.pointIdx] = { x: pt.x, y: pt.y };
        d.moved = true; redraw(); return;
      }
      moveElementBy(d.el, pt.x - d.startX, pt.y - d.startY);
      d.startX = pt.x; d.startY = pt.y;
      if (Math.hypot(pt.x - d.origX, pt.y - d.origY) > 3) d.moved = true;
      redraw();
      return;
    }
    if (tool === "zone") {
      if (!currentRef.current) return;
      e.preventDefault();
      const pt = toCanvasPoint(e);
      currentRef.current.w = pt.x - currentRef.current.x;
      currentRef.current.h = pt.y - currentRef.current.y;
      redraw();
      drawZone(canvasRef.current.getContext("2d"), currentRef.current);
      return;
    }
    if (tool === "select" || tool === "player" || !currentRef.current) return;
    e.preventDefault();
    const pt = toCanvasPoint(e);
    currentRef.current.points.push(pt);
    // live raw feedback while drawing; final styling (zigzag/dash/arrow) is applied on release
    const pts = currentRef.current.points;
    const prev = pts[pts.length - 2] || pt;
    if (tool === "eraser") {
      // Efface uniquement sur le buffer d'éléments, jamais le fond (évite le noir au flatten JPEG)
      const bctx = getElementsCanvas().getContext("2d");
      bctx.save();
      bctx.globalCompositeOperation = "destination-out";
      bctx.beginPath();
      bctx.lineWidth = eraserSize;
      bctx.lineCap = "round";
      bctx.lineJoin = "round";
      bctx.moveTo(prev.x, prev.y);
      bctx.lineTo(pt.x, pt.y);
      bctx.stroke();
      bctx.restore();
      compositeMain();
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };
  const handlePointerUp = (e) => {
    if (tool === "curve") return;
    if (draggingRef.current) {
      const d = draggingRef.current;
      draggingRef.current = null;
      if (d && !d.moved) {
        if (d.el.type === "text") {
          elementsRef.current = elementsRef.current.filter(x => x !== d.el);
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const scale = rect.width / canvas.width;
          setPendingText({ x: d.el.x, y: d.el.y, screenX: d.el.x * scale, screenY: d.el.y * scale, value: d.el.value });
          redraw();
        } else {
          // Select the element (stroke or token)
          selectedElRef.current = d.el;
          setSelectedEl(d.el);
          redraw();
        }
      } else if (d && d.moved) {
        // Deselect after drag
        selectedElRef.current = null;
        setSelectedEl(null);
        redraw();
      }
      return;
    }
    if (tool === "zone") {
      const zone = currentRef.current;
      currentRef.current = null;
      if (!zone || (Math.abs(zone.w) < 6 && Math.abs(zone.h) < 6)) { redraw(); return; }
      elementsRef.current.push(zone);
      selectedElRef.current = zone; setSelectedEl(zone);
      redraw();
      return;
    }
    if (tool === "select" || tool === "player") return;
    const stroke = currentRef.current;
    currentRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    if (stroke.style === "zigzag") stroke.points = zigzagify(stroke.points);
    elementsRef.current.push(stroke);
    selectedElRef.current = stroke; setSelectedEl(stroke);
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
      } else if (el.type === "zone") {
        const zx = Math.min(el.x, el.x + el.w), zy = Math.min(el.y, el.y + el.h);
        const zw = Math.abs(el.w), zh = Math.abs(el.h);
        const onBorder = pt.x >= zx - 8 && pt.x <= zx + zw + 8 && pt.y >= zy - 8 && pt.y <= zy + zh + 8
          && (pt.x <= zx + 8 || pt.x >= zx + zw - 8 || pt.y <= zy + 8 || pt.y >= zy + zh - 8);
        if (onBorder) return el;
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

  const undo = () => {
    const el = elementsRef.current.pop();
    if (el?.type === "token" && el.label) {
      const numSeq = ["1","2","3","4","5","6","7","8","9","10","11","12"];
      const xSeq = ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"];
      const idxNum = numSeq.indexOf(el.label);
      const idxX = xSeq.indexOf(el.label);
      if (idxNum >= 0 && playerLabel === numSeq[idxNum + 1]) setPlayerLabel(el.label);
      else if (idxX >= 0 && playerLabel === xSeq[idxX + 1]) setPlayerLabel(el.label);
    }
    redraw();
  };
  const clearAll = () => { elementsRef.current = []; redraw(); };

  const commitPendingText = () => {
    setPendingText(current => {
      if (current && current.value.trim()) {
        elementsRef.current.push({ type: "text", x: current.x, y: current.y, value: current.value, color, size: textSize, bold: textBold, italic: textItalic, highlight: textHighlight });
        redraw();
      }
      return null;
    });
  };

  const COURT_LABELS = courtType === "handball"
    ? ["Fiche séance", "Gabarit 2", "Gabarit 3"]
    : ["Terrain complet", "Demi-terrain ↑", "Demi-terrain ↓"];

  return (
    <div>
      {referencePhoto && showRefPhoto && (
        <div className="mb-3 rounded-lg overflow-hidden border border-[#1B2A4A]/10 bg-white/40">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] text-[#1B2A4A]/50 font-semibold uppercase tracking-wide">Photo modèle</p>
            <button type="button" onClick={() => setShowRefPhoto(false)} className="text-[10px] text-[#1B2A4A]/40 hover:text-[#1B2A4A]">Masquer</button>
          </div>
          <img src={referencePhoto} alt="Photo modèle" className="w-full max-h-64 object-contain" />
        </div>
      )}
      {referencePhoto && !showRefPhoto && (
        <button type="button" onClick={() => setShowRefPhoto(true)} className="mb-3 text-xs text-[#FF6B35] hover:underline">Afficher photo modèle</button>
      )}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>DESSINER UNE FICHE</h2>
        <div className="flex items-center gap-1 bg-[#1B2A4A]/5 rounded-full p-1 overflow-x-auto max-w-full [&>button]:flex-shrink-0 [&>button]:whitespace-nowrap">
          <button onClick={() => setTool("pen")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "pen" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>✏️ Stylo</button>
          <button onClick={() => { curvePointsRef.current = []; setCurvePoints([]); setTool("curve"); }} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "curve" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>〜 Courbe</button>
          <button onClick={() => setTool("player")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "player" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🧍 Joueur</button>
          <button onClick={() => setTool("text")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "text" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🔤 Texte</button>
          <button onClick={() => setTool("eraser")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "eraser" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🧹 Gomme</button>
          <button onClick={() => setTool("zone")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "zone" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>▭ Zone</button>
          <button onClick={() => setTool("select")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "select" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🖐 Déplacer</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tool === "eraser" ? (
          <select value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
            <option value={12}>Petite</option>
            <option value={24}>Moyenne</option>
            <option value={40}>Grande</option>
          </select>
        ) : tool === "pen" ? (
          <>
            {["#1B2A4A", "#D62828", "#2563EB"].map(c => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
            ))}
            <SizeSlider value={lineWidth} onChange={setLineWidth} min={1} max={10} step={0.5} presets={[{v:1.5,l:"S"},{v:2.5,l:"M"},{v:4,l:"L"}]} />
            <select value={lineStyle} onChange={e => setLineStyle(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value="simple">{styleLabel(courtType, "simple")}</option>
              <option value="pointille">{styleLabel(courtType, "pointille")}</option>
              <option value="zigzag">{styleLabel(courtType, "zigzag")}</option>
              {courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}
              {courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
              <input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche
            </label>
          </>
        ) : tool === "curve" ? (
          <>
            {["#1B2A4A","#D62828","#2563EB"].map(c => <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />)}
            <SizeSlider value={lineWidth} onChange={setLineWidth} min={1} max={10} step={0.5} presets={[{v:1.5,l:"S"},{v:2.5,l:"M"},{v:4,l:"L"}]} />
            <select value={lineStyle} onChange={e => setLineStyle(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value="simple">{styleLabel(courtType, "simple")}</option><option value="pointille">{styleLabel(courtType, "pointille")}</option><option value="zigzag">{styleLabel(courtType, "zigzag")}</option>{courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}{courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none"><input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche</label>
            {curvePoints.length >= 2 ? (
              <button onClick={commitCurve} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-[#FF6B35] text-white hover:bg-[#e85a28]">✓ Terminer ({curvePoints.length} pts)</button>
            ) : (
              <span className="text-xs text-[#1B2A4A]/40">{curvePoints.length === 0 ? "Clique pour placer des points · double-clic pour terminer" : "1 point placé · clique pour continuer"}</span>
            )}
          </>
        ) : tool === "player" ? (
          <>
            {/* Équipements en boutons icône — re-cliquer désélectionne */}
            {EQUIPMENT_ITEMS(courtType).map(eq => (
              <button key={eq.v} type="button"
                onClick={() => setPlayerLabel(playerLabel === eq.v ? (playerIsDefender ? "X1" : "1") : eq.v)}
                title={eq.v.charAt(0).toUpperCase()+eq.v.slice(1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${playerLabel === eq.v ? "bg-[#1B2A4A] border-[#1B2A4A]" : "border-[#1B2A4A]/20 hover:bg-[#1B2A4A]/5"}`}>
                {eq.icon}
              </button>
            ))}
            <div className="w-px h-5 bg-[#1B2A4A]/15 mx-0.5" />
            {/* Accès rapide aux 5 joueurs (clic direct pour choisir le numéro) */}
            {!["plot","chaise","cerceau","handball","cage","haie","jalon","coupelle","ballonfoot","ballonbasket","ballonvolley","ballonrugby"].includes(playerLabel) && (
              <div className="flex items-center gap-1">
                {["1","2","3","4","5"].map(n => {
                  const lbl = playerIsDefender ? "X" + n : n;
                  return (
                    <button key={n} type="button" onClick={() => setPlayerLabel(lbl)}
                      className={`w-7 h-7 rounded-md text-xs font-bold border transition-colors ${playerLabel === lbl ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>
                      {lbl}
                    </button>
                  );
                })}
                <select value={playerLabel} onChange={e => setPlayerLabel(e.target.value)}
                  className="border border-[#1B2A4A]/20 rounded-md px-1.5 py-1 text-xs bg-white w-14">
                  {(playerIsDefender
                    ? ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"]
                    : ["1","2","3","4","5","6","7","8","9","10","11","12"]
                  ).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {!["plot","chaise","cerceau","handball","cage","haie","jalon","coupelle","ballonfoot","ballonbasket","ballonvolley","ballonrugby"].includes(playerLabel) && <>
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
                <input type="checkbox" checked={playerHasBall} onChange={e => setPlayerHasBall(e.target.checked)} disabled={playerIsDefender} /> Ballon
              </label>
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
                <input type="checkbox" checked={playerIsDefender} onChange={e => {
                  const def = e.target.checked;
                  setPlayerIsDefender(def);
                  const nums = ["1","2","3","4","5","6","7","8","9","10","11","12"];
                  const xNums = ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"];
                  if (def) { const i = nums.indexOf(playerLabel); if (i >= 0) setPlayerLabel(xNums[i]); else setPlayerLabel("X1"); }
                  else { const i = xNums.indexOf(playerLabel); if (i >= 0) setPlayerLabel(nums[i]); else setPlayerLabel("1"); }
                }} /> Défenseur
              </label>
              <div className="flex items-center gap-1">
                {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
                  <button key={c} type="button" onClick={() => setPlayerColor(c)}
                    className="w-6 h-6 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: c, borderColor: playerColor === c ? "#FF6B35" : "transparent" }} />
                ))}
              </div>
            </>}
            <SizeSlider value={playerSize} onChange={setPlayerSize} min={0.4} max={2.2} step={0.1} presets={[{v:0.6,l:"S"},{v:1,l:"M"},{v:1.5,l:"L"}]} />
            <span className="text-xs text-[#1B2A4A]/40">Touche le terrain pour placer</span>
          </>
        ) : tool === "text" ? (
          <>
            {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
            ))}
            <select value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value={10}>XS</option>
              <option value={14}>Petit</option>
              <option value={18}>Moyen</option>
              <option value={24}>Grand</option>
              <option value={32}>Titre</option>
            </select>
            <button onClick={() => setTextBold(b => !b)} className={`px-2.5 py-1 rounded text-sm font-bold border transition-colors ${textBold ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A]"}`}>G</button>
            <button onClick={() => setTextItalic(b => !b)} className={`px-2.5 py-1 rounded text-sm italic border transition-colors ${textItalic ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A]"}`}>I</button>
            <button onClick={() => setTextHighlight(b => !b)} title="Surligner" className={`px-2.5 py-1 rounded text-sm border transition-colors ${textHighlight ? "bg-yellow-300 border-yellow-400 text-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A]"}`} style={{ background: textHighlight ? "rgba(255,230,0,0.7)" : undefined }}>🖊</button>
            <span className="text-xs text-[#1B2A4A]/40">Touche le terrain pour écrire</span>
          </>
        ) : tool === "zone" ? (
          <>
            {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
              <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />
            ))}
            <span className="text-xs text-[#1B2A4A]/40">Glisse pour tracer une zone</span>
          </>
        ) : (
          <span className="text-xs text-[#1B2A4A]/40">
            {selectedEl ? "Élément sélectionné — modifie ou supprime ci-dessous" : "Tap = sélectionner · Glisser = déplacer"}
          </span>
        )}
        <button onClick={undo} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 ml-auto">Annuler</button>
        <button onClick={() => { if (window.confirm("Effacer tout le dessin ? Cette action est irréversible.")) clearAll(); }} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5">Effacer tout</button>
        <input ref={templateInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { handleTemplateUpload(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-col gap-1 ml-auto">
          <div className="flex items-center gap-1">
            {gabarits.map((g, i) => (
              <button key={i} onClick={() => switchGabarit(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeGab === i ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#1B2A4A]/50"}`}>
                {g.dataUrl ? "●" : "○"} {g.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {editingGabName === activeGab ? (
              <input autoFocus defaultValue={gabarits[activeGab].name}
                className="border border-[#FF6B35] rounded px-2 py-0.5 text-xs w-28 outline-none"
                onBlur={e => renameGabarit(activeGab, e.target.value || gabarits[activeGab].name)}
                onKeyDown={e => { if (e.key === "Enter") renameGabarit(activeGab, e.target.value || gabarits[activeGab].name); if (e.key === "Escape") setEditingGabName(null); }} />
            ) : (
              <button onClick={() => setEditingGabName(activeGab)} className="text-xs text-[#1B2A4A]/40 hover:text-[#1B2A4A] underline">Renommer</button>
            )}
            <button onClick={() => templateInputRef.current.click()} disabled={loadingTemplate}
              className="text-xs text-[#1B2A4A]/40 hover:text-[#1B2A4A] underline disabled:opacity-50">
              {loadingTemplate ? "Chargement…" : "Changer l'image"}
            </button>
            {gabarits[activeGab].dataUrl && (
              <button onClick={resetCurrentGabarit} className="text-xs text-[#1B2A4A]/30 hover:text-red-500 underline">Réinitialiser</button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar de sélection */}
      {selectedEl && (
        <div className="mb-4 p-3 border border-[#FF6B35]/30 rounded-xl bg-[#FF6B35]/5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-wide">
            {selectedEl.type === "stroke" ? "Trait sélectionné" : "Élément sélectionné"}
          </span>
          {selectedEl.type === "stroke" && (
            <>
              {/* Couleur */}
              <div className="flex items-center gap-1">
                {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
                  <button key={c} type="button"
                    onClick={() => {
                      selectedEl.color = c;
                      selectedElRef.current = selectedEl;
                      redraw();
                      setSelectedEl({ ...selectedEl, color: c });
                    }}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: selectedEl.color === c ? "#FF6B35" : "transparent" }} />
                ))}
              </div>
              {/* Style */}
              <select value={selectedEl.style}
                onChange={e => {
                  selectedEl.style = e.target.value;
                  selectedElRef.current = selectedEl;
                  redraw();
                  setSelectedEl({ ...selectedEl, style: e.target.value });
                }}
                className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
                <option value="simple">{styleLabel(courtType, "simple")}</option>
                <option value="pointille">{styleLabel(courtType, "pointille")}</option>
                <option value="zigzag">{styleLabel(courtType, "zigzag")}</option>
                {courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}
                {courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
              </select>
              {/* Flèche */}
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
                <input type="checkbox" checked={!!selectedEl.arrow}
                  onChange={e => {
                    selectedEl.arrow = e.target.checked;
                    selectedElRef.current = selectedEl;
                    redraw();
                    setSelectedEl({ ...selectedEl, arrow: e.target.checked });
                  }} /> Flèche
              </label>
              {/* Épaisseur */}
              <select value={selectedEl.width}
                onChange={e => {
                  selectedEl.width = Number(e.target.value);
                  selectedElRef.current = selectedEl;
                  redraw();
                  setSelectedEl({ ...selectedEl, width: Number(e.target.value) });
                }}
                className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
                <option value={1.5}>Fin</option>
                <option value={2.5}>Moyen</option>
                <option value={4}>Épais</option>
              </select>
            </>
          )}
          {/* Supprimer */}
          <button type="button"
            onClick={() => {
              elementsRef.current = elementsRef.current.filter(x => x !== selectedEl);
              selectedElRef.current = null;
              setSelectedEl(null);
              redraw();
            }}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
            🗑 Supprimer
          </button>
          <button type="button"
            onClick={() => { selectedElRef.current = null; setSelectedEl(null); redraw(); }}
            className="px-3 py-1.5 rounded-lg text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-colors">
            ✕ Désélectionner
          </button>
        </div>
      )}

      <div ref={wrapRef}
        className={fullscreen
          ? "fixed inset-0 z-[900] bg-white overflow-hidden flex items-center justify-center"
          : "relative border border-[#1B2A4A]/15 rounded-lg overflow-hidden bg-white mb-4"}
        style={{ touchAction: "none" }}>
        <button type="button" onClick={() => { setFullscreen(f => !f); setActiveSwipePanel(null); }}
          className="absolute top-2 left-2 z-40 w-8 h-8 rounded-lg bg-white/90 shadow border border-[#1B2A4A]/15 flex items-center justify-center text-[#1B2A4A] hover:bg-white no-print"
          title={fullscreen ? "Réduire" : "Agrandir en plein écran"}>
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none", ...(fullscreen ? { maxHeight: "100vh", width: "auto", maxWidth: "100vw" } : {}) }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {pendingText && (() => {
          const taRef = React.createRef();
          const wrap = (marker) => {
            const ta = taRef.current;
            if (!ta) return;
            const s = ta.selectionStart, e = ta.selectionEnd;
            const val = pendingText.value;
            const selected = val.slice(s, e);
            const newVal = val.slice(0, s) + marker + selected + marker + val.slice(e);
            setPendingText({ ...pendingText, value: newVal });
            setTimeout(() => { ta.focus(); ta.setSelectionRange(s + marker.length, e + marker.length); }, 0);
          };
          return (
          <div style={{ position: "absolute", left: pendingText.screenX, top: pendingText.screenY - textSize * 0.7 }} onPointerDown={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 3, marginBottom: 3 }}>
              <button onPointerDown={e => { e.preventDefault(); wrap("**"); }} style={{ fontSize: 11, fontWeight: "bold", background: "white", border: "1px solid #ddd", borderRadius: 3, padding: "1px 6px", cursor: "pointer" }}>G</button>
              <button onPointerDown={e => { e.preventDefault(); wrap("*"); }} style={{ fontSize: 11, fontStyle: "italic", background: "white", border: "1px solid #ddd", borderRadius: 3, padding: "1px 6px", cursor: "pointer" }}>I</button>
              <span style={{ fontSize: 9, color: "#aaa", alignSelf: "center", marginLeft: 2 }}>Sélectionner puis G ou I</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <textarea
              ref={taRef}
              autoFocus
              rows={Math.max(1, pendingText.value.split("\n").length)}
              value={pendingText.value}
              onChange={e => setPendingText({ ...pendingText, value: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); commitPendingText(); } if (e.key === "Escape") setPendingText(null); }}
              style={{
                fontSize: textSize, color,
                fontWeight: textBold ? "bold" : "normal",
                fontStyle: textItalic ? "italic" : "normal",
                background: textHighlight ? "rgba(255,230,0,0.7)" : "rgba(255,255,255,0.9)",
                border: "1px dashed #FF6B35", outline: "none", padding: "2px 4px", minWidth: 120,
                resize: "both", lineHeight: 1.25, fontFamily: "sans-serif", borderRadius: 3,
              }}
            />
            <button onClick={commitPendingText}
              style={{ fontSize: 11, background: "#FF6B35", color: "white", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", marginBottom: 2 }}>OK</button>
            </div>
          </div>
          );
        })()}
        <DrawQuickPanel courtType={courtType} tool={tool} lastLineTool={lastLineTool} toolLineStyles={toolLineStyles} setTool={setTool} setToolLineStyles={setToolLineStyles}
          playerLabel={playerLabel} setPlayerLabel={setPlayerLabel} playerHasBall={playerHasBall} setPlayerHasBall={setPlayerHasBall}
          playerIsDefender={playerIsDefender} setPlayerIsDefender={setPlayerIsDefender}
          open={activeSwipePanel === "quick"} setOpen={(v) => setActiveSwipePanel(v ? "quick" : null)} />
        {fullscreen && (
          <DrawModifyPanel tool={tool} setTool={setTool} color={color} setColor={setColor} lineWidth={lineWidth} setLineWidth={setLineWidth}
            eraserSize={eraserSize} setEraserSize={setEraserSize} arrowEnd={arrowEnd} setArrowEnd={setArrowEnd} playerSize={playerSize} setPlayerSize={setPlayerSize} playerColor={playerColor} setPlayerColor={setPlayerColor}
            onUndo={undo} onClearAll={() => { if (window.confirm("Effacer tout le dessin ? Cette action est irréversible.")) clearAll(); }}
            open={activeSwipePanel === "modify"} setOpen={(v) => setActiveSwipePanel(v ? "modify" : null)} />
        )}
        {fullscreen && <FloatingUndoButton onUndo={undo} />}
      </div>

      {/* Notes structurées */}
      <div className="mb-4 border border-[#1B2A4A]/15 rounded-lg bg-white/60 overflow-hidden">
        <button onClick={() => setShowNotes(n => !n)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-colors">
          <span>📝 Notes de séance</span>
          <span className="text-[#1B2A4A]/40 text-xs">{showNotes ? "Masquer" : "Afficher"}</span>
        </button>
        {showNotes && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#1B2A4A]/10 pt-3">
            {noteFields.map((f) => (
              <div key={f.id}>
                <div className="flex items-center gap-2 mb-1">
                  <input value={f.label} onChange={e => renameNoteField(f.id, e.target.value)}
                    className="text-xs font-semibold text-[#1B2A4A]/60 uppercase tracking-wide bg-transparent border-none outline-none w-28 cursor-pointer"
                    onFocus={e => e.target.select()} />
                  <button onClick={() => removeNoteField(f.id)} className="text-[#1B2A4A]/20 hover:text-red-500 ml-auto"><X size={12} /></button>
                </div>
                <div className="relative">
                  <textarea value={f.value} onChange={e => updateNoteField(f.id, e.target.value)}
                    placeholder={`${f.label}...`} rows={2}
                    className="w-full border border-[#1B2A4A]/15 rounded-md px-3 py-2 pr-9 text-sm bg-white/80 resize-y focus:outline-none focus:border-[#FF6B35]/50" />
                  <div className="absolute right-1 top-1">
                    <DictateButton onResult={t => updateNoteField(f.id, f.value ? f.value + " " + t : t)} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addNoteField}
              className="flex items-center gap-1 text-xs text-[#FF6B35] hover:underline font-medium mt-1">
              <Plus size={13} /> Ajouter un champ
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        {onAddDirect && (
          <button onClick={() => { commitPendingText(); setTimeout(() => { let q = canvasRef.current.toDataURL("image/jpeg", 0.75); if (q.length > 400000) q = canvasRef.current.toDataURL("image/jpeg", 0.55); onAddDirect(q); }, 0); }} disabled={processing}
            className="flex items-center gap-1.5 border border-[#FF6B35] text-[#FF6B35] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#FF6B35]/10 disabled:opacity-50">
            Ajouter directement à la bibliothèque
          </button>
        )}
        <button onClick={() => { commitPendingText(); setTimeout(() => { let q = canvasRef.current.toDataURL("image/jpeg", 0.75); if (q.length > 400000) q = canvasRef.current.toDataURL("image/jpeg", 0.55); onValidate(q); }, 0); }} disabled={processing}
          className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28] disabled:opacity-50">
          {processing ? <><Loader2 size={15} className="animate-spin" /> Analyse en cours...</> : onAddDirect ? "Valider avec analyse IA" : "Utiliser ce schéma"}
        </button>
      </div>
    </div>
  );
}

// ─── Dessinateur tactique (bibliothèque + playbook) — terrains fixes, sans gabarits Supabase ───
function DrawTacticalView({ onValidate, onCancel, courtType = "basketball", initialImage = null, allSchemas = [], currentSchemaIdx = null, referencePhotoOptions = [], previousMaterial = null, previousSchemaGhost = null }) {
  const [showGhost, setShowGhost] = useState(true);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const bgImgRef = useRef(null);
  const elementsRef = useRef([]);
  const currentRef = useRef(null);
  const [color, setColor] = useState("#1B2A4A");
  const [lineWidth, setLineWidth] = useState(2.5);
  const [eraserSize, setEraserSize] = useState(24);
  const [refPhotoCollapsed, setRefPhotoCollapsed] = useState(false);
  const [refPhotoZoomed, setRefPhotoZoomed] = useState(false);
  const [refPhotoIdx, setRefPhotoIdx] = useState(0);
  const referencePhoto = referencePhotoOptions[refPhotoIdx]?.src || null;
  const [arrowEnd, setArrowEnd] = useState(true);
  const [tool, setTool] = useState("pen");
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSwipePanel, setActiveSwipePanel] = useState(null); // "quick" | "modify" | null — jamais les deux ouverts en même temps
  // Style de trait mémorisé séparément par outil (Stylo vs Courbe) — voir DrawSheetView.
  const [toolLineStyles, setToolLineStyles] = useState({});
  const lineStyle = toolLineStyles[tool] ?? "simple";
  const setLineStyle = (val) => setToolLineStyles(s => ({ ...s, [tool]: val }));
  // Dernier outil de trait utilisé (Stylo/Courbe) — distinct de `tool`, qui peut valoir "player"/
  // "text"/etc. entre-temps. Sert au panneau rapide pour retomber sur le bon outil quand on
  // choisit une action après être passé par "Joueur" (sinon ça retombait toujours sur Stylo).
  const [lastLineTool, setLastLineTool] = useState("pen");
  useEffect(() => { if (tool === "pen" || tool === "curve") setLastLineTool(tool); }, [tool]);
  const draggingRef = useRef(null);
  const [textSize, setTextSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textHighlight, setTextHighlight] = useState(false);
  const [pendingText, setPendingText] = useState(null);
  const [playerLabel, setPlayerLabel] = useState("1");
  const [playerHasBall, setPlayerHasBall] = useState(false);
  const [playerColor, setPlayerColor] = useState("#1B2A4A"); // permet de distinguer plusieurs "équipes"/groupes de joueurs
  const [playerIsDefender, setPlayerIsDefender] = useState(false);
  const [playerSize, setPlayerSize] = useState(1);
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [selectedEl, setSelectedEl] = useState(null);
  const selectedElRef = useRef(null);
  const curvePointsRef = useRef([]);
  const [curvePoints, setCurvePoints] = useState([]);
  const lastClickTimeRef = useRef(0);

  const TERRAIN_DEFS_BY_SPORT = {
    handball: [
      { label: "Terrain complet", file: "/handball-terrain-complet.png" },
      { label: "Attaque", file: "/handball-terrain-attaque.png" },
      { label: "Défense", file: "/handball-terrain-defense.png" },
    ],
    football: [
      { label: "Terrain complet", file: "/football-terrain-complet.png" },
      { label: "Demi-terrain ↑", file: "/football-demi-terrain-haut.png" },
      { label: "Demi-terrain ↓", file: "/football-demi-terrain-bas.png" },
    ],
    rugby: [
      { label: "Terrain complet", file: "/rugby-terrain-complet.png" },
      { label: "Demi-terrain ↑", file: "/rugby-demi-terrain-haut.png" },
      { label: "Demi-terrain ↓", file: "/rugby-demi-terrain-bas.png" },
    ],
    volleyball: [
      { label: "Terrain complet", file: "/volleyball-terrain-complet.png" },
    ],
    basketball: [
      { label: "Terrain complet", file: "/basketball-terrain-complet.png" },
      { label: "Demi-terrain ↑", file: "/basketball-demi-terrain-haut.png" },
      { label: "Demi-terrain ↓", file: "/basketball-demi-terrain-bas.png" },
    ],
  };
  const TERRAIN_DEFS = TERRAIN_DEFS_BY_SPORT[courtType] || TERRAIN_DEFS_BY_SPORT.basketball;

  const [activeTerrain, setActiveTerrain] = useState(0);
  const [bgReady, setBgReady] = useState(false);
  const [editingExisting, setEditingExisting] = useState(!!initialImage);

  // Charge le fond : soit le schéma existant (édition), soit le terrain sélectionné
  useEffect(() => {
    setBgReady(false);
    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      setDims({ width: img.naturalWidth, height: img.naturalHeight });
      setBgReady(true);
    };
    img.onerror = () => { bgImgRef.current = null; setBgReady(false); };
    img.src = editingExisting ? initialImage : TERRAIN_DEFS[activeTerrain].file;
  }, [activeTerrain, editingExisting]);

  // Redessine dès que le fond est prêt ou que les dims changent
  useEffect(() => {
    if (bgReady) redraw();
  }, [bgReady, dims]);

  // Raccourcis clavier : Suppr/Backspace supprime l'élément sélectionné, Cmd/Ctrl+C copie,
  // Cmd/Ctrl+V colle (léger décalage pour voir qu'il y a bien 2 éléments), Cmd/Ctrl+S valide
  // le schéma (équivalent du bouton "Utiliser ce schéma").
  const clipboardRef = useRef(null);
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // ne pas interférer avec la saisie de texte
      const sel = selectedElRef.current;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        elementsRef.current = elementsRef.current.filter(x => x !== sel);
        selectedElRef.current = null; setSelectedEl(null); redraw();
        return;
      }
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "c" && sel) {
        e.preventDefault();
        clipboardRef.current = JSON.parse(JSON.stringify(sel));
        return;
      }
      if (cmd && e.key === "v" && clipboardRef.current) {
        e.preventDefault();
        const clone = JSON.parse(JSON.stringify(clipboardRef.current));
        if (clone.points) clone.points = clone.points.map(p => ({ x: p.x + 15, y: p.y + 15 }));
        else { clone.x += 15; clone.y += 15; }
        elementsRef.current.push(clone);
        selectedElRef.current = clone; setSelectedEl(clone); redraw();
        return;
      }
      if (cmd && e.key === "s") {
        e.preventDefault();
        validateSchema();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const validateSchema = () => {
    commitPendingText();
    setTimeout(() => {
      let q = canvasRef.current.toDataURL("image/jpeg", 0.75);
      if (q.length > 400000) q = canvasRef.current.toDataURL("image/jpeg", 0.55);
      onValidate(q, { elements: elementsRef.current, terrainIdx: activeTerrain });
    }, 0);
  };

  const switchTerrain = (idx) => {
    elementsRef.current = [];
    setActiveTerrain(idx);
  };

  // Reprend le même terrain que la vignette précédente, avec uniquement son matériel
  // (plots, joueurs...) conservé au même endroit — pas les traits/flèches, et surtout
  // pas une image aplatie : ce sont les mêmes éléments vectoriels, toujours déplaçables.
  const usePreviousMaterial = () => {
    if (!previousMaterial) return;
    // Uniquement le matériel (plot/chaise/cerceau/haie/jalon/coupelle...), jamais les joueurs :
    // les tokens joueurs n'ont pas de `kind`, contrairement aux tokens de matériel.
    const tokens = (previousMaterial.elements || []).filter(el => el.type === "token" && el.kind).map(el => ({ ...el }));
    elementsRef.current = tokens;
    if (activeTerrain === previousMaterial.terrainIdx) redraw();
    else setActiveTerrain(previousMaterial.terrainIdx);
  };

  // Buffer hors-écran pour les éléments (tokens/traits/textes), séparé du fond.
  // La gomme applique un destination-out sur CE buffer uniquement, jamais sur
  // le fond du terrain/schéma, pour éviter une zone transparente qui
  // ressortirait noire une fois exportée en JPEG.
  const elementsCanvasRef = useRef(null);
  const getElementsCanvas = () => {
    const canvas = canvasRef.current;
    if (!elementsCanvasRef.current) elementsCanvasRef.current = document.createElement("canvas");
    const buf = elementsCanvasRef.current;
    if (canvas && (buf.width !== canvas.width || buf.height !== canvas.height)) {
      buf.width = canvas.width; buf.height = canvas.height;
    }
    return buf;
  };
  const compositeMain = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImgRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(getElementsCanvas(), 0, 0);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImgRef.current) return;
    const buf = getElementsCanvas();
    const bctx = buf.getContext("2d");
    bctx.clearRect(0, 0, buf.width, buf.height);
    elementsRef.current.forEach(el => {
      if (el.type === "token") _drawPlayerToken(bctx, el);
      else if (el.type === "text") _drawTextElement(bctx, el);
      else if (el.type === "zone") _drawZone(bctx, el);
      else _drawStroke(bctx, el);
    });
    elementsRef.current.forEach(el => {
      if (el === selectedElRef.current) {
        if (el.type === "token") {
          bctx.save(); bctx.strokeStyle = "#FF6B35"; bctx.lineWidth = 3; bctx.setLineDash([4, 3]);
          bctx.beginPath(); bctx.arc(el.x, el.y, _tokenHaloRadius(el), 0, Math.PI * 2); bctx.stroke(); bctx.setLineDash([]); bctx.restore();
        } else if (el.type === "stroke" && el.isCurve) {
          el.points.forEach(p => {
            bctx.beginPath(); bctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            bctx.fillStyle = "rgba(255,107,53,0.9)"; bctx.fill();
            bctx.strokeStyle = "white"; bctx.lineWidth = 2; bctx.stroke();
          });
        } else if (el.type === "stroke") {
          bctx.save(); bctx.strokeStyle = "#FF6B35"; bctx.lineWidth = el.width + 6; bctx.lineCap = "round"; bctx.lineJoin = "round"; bctx.globalAlpha = 0.35;
          bctx.beginPath(); el.points.forEach((p, i) => { if (i === 0) bctx.moveTo(p.x, p.y); else bctx.lineTo(p.x, p.y); }); bctx.stroke(); bctx.restore();
          // Poignées aux extrémités pour montrer où glisser pour rallonger/raccourcir
          if (tool === "select" && el.points.length > 1) {
            [el.points[0], el.points[el.points.length - 1]].forEach(p => {
              bctx.beginPath(); bctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
              bctx.fillStyle = "rgba(255,107,53,0.9)"; bctx.fill();
              bctx.strokeStyle = "white"; bctx.lineWidth = 2; bctx.stroke();
            });
          }
        }
      }
    });
    compositeMain();
    // Preview courbe en cours (par-dessus, sur le canvas principal)
    const ctx = canvas.getContext("2d");
    const cpPts = curvePointsRef.current;
    if (cpPts.length >= 1) {
      if (cpPts.length >= 2) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([6, 4]);
        ctx.beginPath(); _catmullRomPath(ctx, cpPts); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
      cpPts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#FF6B35" : color;
        ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      });
    }
  };

  const toCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * canvas.width / rect.width, y: (e.clientY - rect.top) * canvas.height / rect.height };
  };

  const findElementAt = (pt) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      if (el.type === "token") { if (Math.hypot(pt.x - el.x, pt.y - el.y) <= 20) return el; }
      else if (el.type === "text") { ctx.font = `${el.size}px sans-serif`; const lines = el.value.split("\n"); const w = Math.max(...lines.map(l => ctx.measureText(l).width)); const h = lines.length * el.size * 1.25; if (pt.x >= el.x - 4 && pt.x <= el.x + w + 4 && pt.y >= el.y - 4 && pt.y <= el.y + h + 4) return el; }
      else if (el.type === "zone") {
        const zx = Math.min(el.x, el.x + el.w), zy = Math.min(el.y, el.y + el.h);
        const zw = Math.abs(el.w), zh = Math.abs(el.h);
        const onBorder = pt.x >= zx - 8 && pt.x <= zx + zw + 8 && pt.y >= zy - 8 && pt.y <= zy + zh + 8
          && (pt.x <= zx + 8 || pt.x >= zx + zw - 8 || pt.y <= zy + 8 || pt.y >= zy + zh - 8);
        if (onBorder) return el;
      }
      else if (el.type === "stroke") { const tol = el.width / 2 + 10; for (let j = 0; j < el.points.length - 1; j++) { const a = el.points[j], b = el.points[j + 1]; const len2 = (b.x-a.x)**2+(b.y-a.y)**2; let t = len2===0?0:((pt.x-a.x)*(b.x-a.x)+(pt.y-a.y)*(b.y-a.y))/len2; t=Math.max(0,Math.min(1,t)); if (Math.hypot(pt.x-a.x-t*(b.x-a.x), pt.y-a.y-t*(b.y-a.y))<=tol) return el; } }
    }
    return null;
  };

  const moveElementBy = (el, dx, dy) => { if (el.type === "stroke") el.points.forEach(p => { p.x += dx; p.y += dy; }); else { el.x += dx; el.y += dy; } };

  const commitCurve = () => {
    const pts = curvePointsRef.current;
    if (pts.length >= 2) {
      elementsRef.current.push({ type: "stroke", color, width: lineWidth, style: lineStyle, arrow: arrowEnd, points: pts, isCurve: true });
    }
    curvePointsRef.current = [];
    setCurvePoints([]);
    redraw();
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    try { canvasRef.current.setPointerCapture?.(e.pointerId); } catch {}
    if (tool === "curve") {
      const pt = toCanvasPoint(e);
      const now = Date.now();
      const isDbl = (now - lastClickTimeRef.current) < 350;
      lastClickTimeRef.current = now;
      if (isDbl && curvePointsRef.current.length >= 1) {
        commitCurve();
      } else {
        curvePointsRef.current = [...curvePointsRef.current, pt];
        setCurvePoints([...curvePointsRef.current]);
        redraw();
      }
      return;
    }
    if (tool === "text") {
      if (pendingText) commitPendingText();
      const pt = toCanvasPoint(e);
      const wrapRect = wrapRef.current.getBoundingClientRect();
      setPendingText({ x: pt.x, y: pt.y, screenX: e.clientX - wrapRect.left, screenY: e.clientY - wrapRect.top, value: "" });
      return;
    }
    // Cliquer sur un élément déjà posé (joueur, mouvement, matériel) le sélectionne
    // pour le déplacer/supprimer — quel que soit l'outil actif (sauf gomme/texte/courbe/stylo :
    // avec le stylo, cliquer sur un joueur doit démarrer un trait depuis lui, pas le déplacer).
    if (tool !== "eraser" && tool !== "pen") {
      const pt = toCanvasPoint(e);
      if (tool === "select") {
        const sel = selectedElRef.current;
        if (sel?.type === "stroke" && sel.isCurve) {
          const pidx = sel.points.findIndex(p => Math.hypot(pt.x - p.x, pt.y - p.y) <= 14);
          if (pidx >= 0) { draggingRef.current = { el: sel, pointIdx: pidx, startX: pt.x, startY: pt.y, moved: false }; return; }
        } else if (sel?.type === "stroke" && sel.points?.length > 1) {
          // Permet de rallonger/raccourcir un trait simple en glissant l'une de ses extrémités
          for (const idx of [0, sel.points.length - 1]) {
            const p = sel.points[idx];
            if (p && Math.hypot(pt.x - p.x, pt.y - p.y) <= 14) {
              draggingRef.current = { el: sel, pointIdx: idx, startX: pt.x, startY: pt.y, moved: false };
              return;
            }
          }
        }
      }
      const el = findElementAt(pt);
      if (el) {
        draggingRef.current = { el, startX: pt.x, startY: pt.y, origX: pt.x, origY: pt.y, moved: false };
        return;
      }
      if (tool === "select") {
        selectedElRef.current = null;
        setSelectedEl(null);
        redraw();
        return;
      }
    }
    if (tool === "player") {
      const pt = toCanvasPoint(e);
      const equipKinds = ["plot", "chaise", "cerceau", "handball", "cage", "haie", "jalon", "coupelle", "ballonfoot", "ballonbasket", "ballonvolley", "ballonrugby"];
      const isEquip = equipKinds.includes(playerLabel);
      elementsRef.current.push(isEquip
        ? { type: "token", x: pt.x, y: pt.y, kind: playerLabel, size: playerSize }
        : { type: "token", x: pt.x, y: pt.y, label: playerLabel, hasBall: playerHasBall, role: playerIsDefender ? "defender" : "offense", size: playerSize, color: playerColor });
      redraw();
      const numSeq = ["1","2","3","4","5","6","7","8","9","10","11","12"];
      const xSeq = ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"];
      const idxNum = numSeq.indexOf(playerLabel), idxX = xSeq.indexOf(playerLabel);
      if (idxNum >= 0 && idxNum < numSeq.length - 1) setPlayerLabel(numSeq[idxNum + 1]);
      else if (idxX >= 0 && idxX < xSeq.length - 1) setPlayerLabel(xSeq[idxX + 1]);
      return;
    }
    if (tool === "zone") {
      const pt = toCanvasPoint(e);
      currentRef.current = { type: "zone", x: pt.x, y: pt.y, w: 0, h: 0, color };
      return;
    }
    currentRef.current = tool === "eraser"
      ? { type: "stroke", erase: true, width: eraserSize, points: [toCanvasPoint(e)] }
      : { type: "stroke", color, width: lineWidth, style: lineStyle, arrow: arrowEnd, points: [toCanvasPoint(e)] };
  };

  const handlePointerMove = (e) => {
    if (tool === "curve") { e.preventDefault(); return; }
    if (draggingRef.current) {
      e.preventDefault();
      const pt = toCanvasPoint(e);
      const d = draggingRef.current;
      if (d.pointIdx !== undefined) {
        d.el.points[d.pointIdx] = { x: pt.x, y: pt.y };
        d.moved = true; redraw(); return;
      }
      moveElementBy(d.el, pt.x - d.startX, pt.y - d.startY);
      d.startX = pt.x; d.startY = pt.y;
      if (Math.hypot(pt.x - d.origX, pt.y - d.origY) > 3) d.moved = true;
      redraw(); return;
    }
    if (tool === "zone") {
      if (!currentRef.current) return;
      e.preventDefault();
      const pt = toCanvasPoint(e);
      currentRef.current.w = pt.x - currentRef.current.x;
      currentRef.current.h = pt.y - currentRef.current.y;
      redraw();
      _drawZone(canvasRef.current.getContext("2d"), currentRef.current);
      return;
    }
    if (tool === "select" || tool === "player" || !currentRef.current) return;
    e.preventDefault();
    const pt = toCanvasPoint(e);
    currentRef.current.points.push(pt);
    const pts = currentRef.current.points;
    const prev = pts[pts.length - 2] || pt;
    if (tool === "eraser") {
      // Efface uniquement sur le buffer d'éléments, jamais le fond (évite le noir au flatten JPEG)
      const bctx = getElementsCanvas().getContext("2d");
      bctx.save();
      bctx.globalCompositeOperation = "destination-out";
      bctx.beginPath(); bctx.lineWidth = eraserSize; bctx.lineCap = "round"; bctx.lineJoin = "round";
      bctx.moveTo(prev.x, prev.y); bctx.lineTo(pt.x, pt.y); bctx.stroke();
      bctx.restore();
      compositeMain();
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (tool === "curve") return;
    if (draggingRef.current) {
      const d = draggingRef.current; draggingRef.current = null;
      if (d && !d.moved) {
        if (d.el.type === "text") {
          elementsRef.current = elementsRef.current.filter(x => x !== d.el);
          const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const scale = rect.width / canvas.width;
          setPendingText({ x: d.el.x, y: d.el.y, screenX: d.el.x * scale, screenY: d.el.y * scale, value: d.el.value }); redraw();
        } else { selectedElRef.current = d.el; setSelectedEl(d.el); redraw(); }
      } else if (d && d.moved) { selectedElRef.current = null; setSelectedEl(null); redraw(); }
      return;
    }
    if (tool === "zone") {
      const zone = currentRef.current; currentRef.current = null;
      if (!zone || (Math.abs(zone.w) < 6 && Math.abs(zone.h) < 6)) { redraw(); return; }
      elementsRef.current.push(zone);
      selectedElRef.current = zone; setSelectedEl(zone);
      redraw();
      return;
    }
    if (tool === "select" || tool === "player") return;
    const stroke = currentRef.current; currentRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    if (stroke.style === "zigzag") stroke.points = _zigzagify(stroke.points);
    elementsRef.current.push(stroke);
    selectedElRef.current = stroke; setSelectedEl(stroke);
    redraw();
  };

  const commitPendingText = () => {
    setPendingText(current => {
      if (current && current.value.trim()) {
        elementsRef.current.push({ type: "text", x: current.x, y: current.y, value: current.value, color, size: textSize, bold: textBold, italic: textItalic, highlight: textHighlight });
        redraw();
      }
      return null;
    });
  };

  const undo = () => {
    const el = elementsRef.current.pop();
    if (el?.type === "token" && el.label) {
      const numSeq = ["1","2","3","4","5","6","7","8","9","10","11","12"];
      const xSeq = ["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"];
      const idxNum = numSeq.indexOf(el.label);
      const idxX = xSeq.indexOf(el.label);
      if (idxNum >= 0 && playerLabel === numSeq[idxNum + 1]) setPlayerLabel(el.label);
      else if (idxX >= 0 && playerLabel === xSeq[idxX + 1]) setPlayerLabel(el.label);
    }
    redraw();
  };
  const clearAll = () => { if (window.confirm("Effacer tout le dessin ?")) { elementsRef.current = []; redraw(); } };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {editingExisting ? (
          <>
            <span className="text-xs font-medium text-[#1B2A4A]/60">✏️ Modification du schéma existant — ajoute tes flèches/joueurs par-dessus</span>
            <button type="button" onClick={() => { if (window.confirm("Repartir d'un terrain vierge ? Le dessin existant sera perdu.")) { elementsRef.current = []; setEditingExisting(false); } }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#1B2A4A]/50 transition-colors">
              Repartir d'un terrain vierge
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-[#1B2A4A]/60 uppercase tracking-wide">Terrain :</span>
            {TERRAIN_DEFS.map((d, i) => (
              <button key={i} type="button" onClick={() => switchTerrain(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeTerrain === i ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#1B2A4A]/50"}`}>
                {d.label}
              </button>
            ))}
            {previousMaterial && (
              <button type="button" onClick={usePreviousMaterial}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors text-[#1B2A4A] hover:bg-[#1B2A4A]/5"
                style={{ borderColor: "#FF6B35", color: "#FF6B35" }}>
                ↺ Terrain précédent (matériel conservé)
              </button>
            )}
          </>
        )}
      </div>
      {allSchemas.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <span className="text-xs text-[#1B2A4A]/40 flex-shrink-0">Déjà fait :</span>
          {allSchemas.map((s, i) => (
            <div key={i} className={`relative flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 ${i === currentSchemaIdx ? "border-[#FF6B35]" : "border-[#1B2A4A]/15"}`}>
              <img src={s} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 leading-tight">{i + 1}</span>
            </div>
          ))}
          {currentSchemaIdx === allSchemas.length && (
            <div className="flex-shrink-0 w-14 h-10 rounded-md border-2 border-dashed border-[#FF6B35] flex items-center justify-center text-[#FF6B35] text-[10px] font-bold">
              {allSchemas.length + 1}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>DESSINER UN SCHÉMA</h2>
        <div className="flex items-center gap-1 bg-[#1B2A4A]/5 rounded-full p-1 overflow-x-auto max-w-full [&>button]:flex-shrink-0 [&>button]:whitespace-nowrap">
          <button onClick={() => setTool("pen")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "pen" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>✏️ Stylo</button>
          <button onClick={() => { curvePointsRef.current = []; setCurvePoints([]); setTool("curve"); }} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "curve" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>〜 Courbe</button>
          <button onClick={() => setTool("player")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "player" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🧍 Joueur</button>
          <button onClick={() => setTool("text")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "text" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🔤 Texte</button>
          <button onClick={() => setTool("eraser")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "eraser" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🧹 Gomme</button>
          <button onClick={() => setTool("zone")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "zone" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>▭ Zone</button>
          <button onClick={() => setTool("select")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${tool === "select" ? "bg-white text-[#1B2A4A] shadow-sm" : "text-[#1B2A4A]/50"}`}>🖐 Déplacer</button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tool === "eraser" ? (
          <select value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
            <option value={12}>Petite</option>
            <option value={24}>Moyenne</option>
            <option value={40}>Grande</option>
          </select>
        ) : tool === "pen" ? (
          <>
            {["#1B2A4A","#D62828","#2563EB"].map(c => <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />)}
            <SizeSlider value={lineWidth} onChange={setLineWidth} min={1} max={10} step={0.5} presets={[{v:1.5,l:"S"},{v:2.5,l:"M"},{v:4,l:"L"}]} />
            <select value={lineStyle} onChange={e => setLineStyle(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value="simple">{styleLabel(courtType, "simple")}</option><option value="pointille">{styleLabel(courtType, "pointille")}</option><option value="zigzag">{styleLabel(courtType, "zigzag")}</option>{courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}{courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none"><input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche</label>
          </>
        ) : tool === "curve" ? (
          <>
            {["#1B2A4A","#D62828","#2563EB"].map(c => <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2" style={{ backgroundColor: c, borderColor: color === c ? "#FF6B35" : "transparent" }} />)}
            <SizeSlider value={lineWidth} onChange={setLineWidth} min={1} max={10} step={0.5} presets={[{v:1.5,l:"S"},{v:2.5,l:"M"},{v:4,l:"L"}]} />
            <select value={lineStyle} onChange={e => setLineStyle(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
              <option value="simple">{styleLabel(courtType, "simple")}</option><option value="pointille">{styleLabel(courtType, "pointille")}</option><option value="zigzag">{styleLabel(courtType, "zigzag")}</option>{courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}{courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none"><input type="checkbox" checked={arrowEnd} onChange={e => setArrowEnd(e.target.checked)} /> Flèche</label>
            {curvePoints.length >= 2 ? (
              <button onClick={commitCurve} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-[#FF6B35] text-white hover:bg-[#e85a28]">✓ Terminer ({curvePoints.length} pts)</button>
            ) : (
              <span className="text-xs text-[#1B2A4A]/40">{curvePoints.length === 0 ? "Clique pour placer des points · double-clic pour terminer" : "1 point placé · clique pour continuer"}</span>
            )}
          </>
        ) : tool === "player" ? (
          <>
            {EQUIPMENT_ITEMS(courtType).map(eq => (
              <button key={eq.v} type="button" onClick={() => setPlayerLabel(playerLabel === eq.v ? (playerIsDefender ? "X1" : "1") : eq.v)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${playerLabel === eq.v ? "bg-[#1B2A4A] border-[#1B2A4A]" : "border-[#1B2A4A]/20 hover:bg-[#1B2A4A]/5"}`}>{eq.icon}</button>
            ))}
            <div className="w-px h-5 bg-[#1B2A4A]/15 mx-0.5" />
            {!["plot","chaise","cerceau","handball","cage","haie","jalon","coupelle","ballonfoot","ballonbasket","ballonvolley","ballonrugby"].includes(playerLabel) && (
              <div className="flex items-center gap-1">
                {["1","2","3","4","5"].map(n => {
                  const lbl = playerIsDefender ? "X" + n : n;
                  return (
                    <button key={n} type="button" onClick={() => setPlayerLabel(lbl)}
                      className={`w-7 h-7 rounded-md text-xs font-bold border transition-colors ${playerLabel === lbl ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>
                      {lbl}
                    </button>
                  );
                })}
                <select value={playerLabel} onChange={e => setPlayerLabel(e.target.value)} className="border border-[#1B2A4A]/20 rounded-md px-1.5 py-1 text-xs bg-white w-14">
                  {(playerIsDefender?["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"]:["1","2","3","4","5","6","7","8","9","10","11","12"]).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {!["plot","chaise","cerceau","handball","cage","haie","jalon","coupelle","ballonfoot","ballonbasket","ballonvolley","ballonrugby"].includes(playerLabel) && <>
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none"><input type="checkbox" checked={playerHasBall} onChange={e => setPlayerHasBall(e.target.checked)} disabled={playerIsDefender} /> Ballon</label>
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none"><input type="checkbox" checked={playerIsDefender} onChange={e => { const def=e.target.checked; setPlayerIsDefender(def); const nums=["1","2","3","4","5","6","7","8","9","10","11","12"],xNums=["X1","X2","X3","X4","X5","X6","X7","X8","X9","X10","X11","X12"]; if(def){const i=nums.indexOf(playerLabel);if(i>=0)setPlayerLabel(xNums[i]);else setPlayerLabel("X1");}else{const i=xNums.indexOf(playerLabel);if(i>=0)setPlayerLabel(nums[i]);else setPlayerLabel("1");} }} /> Défenseur</label>
              <div className="flex items-center gap-1">
                {["#1B2A4A", "#D62828", "#2563EB", "#16a34a", "#FF6B35"].map(c => (
                  <button key={c} type="button" onClick={() => setPlayerColor(c)}
                    className="w-6 h-6 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: c, borderColor: playerColor === c ? "#FF6B35" : "transparent" }} />
                ))}
              </div>
            </>}
            <SizeSlider value={playerSize} onChange={setPlayerSize} min={0.4} max={2.2} step={0.1} presets={[{v:0.6,l:"S"},{v:1,l:"M"},{v:1.5,l:"L"}]} />
          </>
        ) : tool === "text" ? (
          <>
            {["#1B2A4A","#D62828","#2563EB","#16a34a","#FF6B35"].map(c=><button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 flex-shrink-0" style={{ backgroundColor:c, borderColor:color===c?"#FF6B35":"transparent" }} />)}
            <select value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white"><option value={10}>XS</option><option value={14}>Petit</option><option value={18}>Moyen</option><option value={24}>Grand</option><option value={32}>Titre</option></select>
            <button onClick={() => setTextBold(b=>!b)} className={`px-2.5 py-1 rounded text-sm font-bold border ${textBold?"bg-[#1B2A4A] text-white border-[#1B2A4A]":"border-[#1B2A4A]/20 text-[#1B2A4A]"}`}>G</button>
            <button onClick={() => setTextItalic(b=>!b)} className={`px-2.5 py-1 rounded text-sm italic border ${textItalic?"bg-[#1B2A4A] text-white border-[#1B2A4A]":"border-[#1B2A4A]/20 text-[#1B2A4A]"}`}>I</button>
            <button onClick={() => setTextHighlight(b=>!b)} className={`px-2.5 py-1 rounded text-sm border ${textHighlight?"bg-yellow-300 border-yellow-400 text-[#1B2A4A]":"border-[#1B2A4A]/20 text-[#1B2A4A]"}`}>🖊</button>
          </>
        ) : tool === "zone" ? (
          <>
            {["#1B2A4A","#D62828","#2563EB","#16a34a","#FF6B35"].map(c=><button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 flex-shrink-0" style={{ backgroundColor:c, borderColor:color===c?"#FF6B35":"transparent" }} />)}
            <span className="text-xs text-[#1B2A4A]/40">Glisse pour tracer une zone</span>
          </>
        ) : (
          <span className="text-xs text-[#1B2A4A]/40">{selectedEl ? "Élément sélectionné" : "Tap = sélectionner · Glisser = déplacer"}</span>
        )}
        {previousSchemaGhost && (
          <label className="flex items-center gap-1.5 text-xs text-[#1B2A4A]/60 cursor-pointer select-none ml-auto">
            <input type="checkbox" checked={showGhost} onChange={e => setShowGhost(e.target.checked)} /> Vignette précédente en repère
          </label>
        )}
        <button onClick={undo} className={`px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 ${previousSchemaGhost ? "" : "ml-auto"}`}>Annuler</button>
        <button onClick={clearAll} className="px-3 py-1.5 rounded-md text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5">Effacer tout</button>
      </div>
      {selectedEl && (
        <div className="mb-4 p-3 border border-[#FF6B35]/30 rounded-xl bg-[#FF6B35]/5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-wide">{selectedEl.type === "stroke" ? "Trait sélectionné" : "Élément sélectionné"}</span>
          {selectedEl.type === "stroke" && (
            <>
              <div className="flex items-center gap-1">
                {["#1B2A4A","#D62828","#2563EB","#16a34a","#FF6B35"].map(c => (
                  <button key={c} type="button" onClick={() => { selectedEl.color=c; selectedElRef.current=selectedEl; redraw(); setSelectedEl({...selectedEl,color:c}); }}
                    className="w-6 h-6 rounded-full border-2" style={{ backgroundColor:c, borderColor:selectedEl.color===c?"#FF6B35":"transparent" }} />
                ))}
              </div>
              <select value={selectedEl.style} onChange={e => { selectedEl.style=e.target.value; selectedElRef.current=selectedEl; redraw(); setSelectedEl({...selectedEl,style:e.target.value}); }}
                className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
                <option value="simple">{styleLabel(courtType, "simple")}</option><option value="pointille">{styleLabel(courtType, "pointille")}</option><option value="zigzag">{styleLabel(courtType, "zigzag")}</option>{courtType !== "football" && <option value="ecran">{styleLabel(courtType, "ecran")}</option>}{courtType !== "football" && <option value="tir">{styleLabel(courtType, "tir")}</option>}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-[#1B2A4A] cursor-pointer select-none">
                <input type="checkbox" checked={!!selectedEl.arrow} onChange={e => { selectedEl.arrow=e.target.checked; selectedElRef.current=selectedEl; redraw(); setSelectedEl({...selectedEl,arrow:e.target.checked}); }} /> Flèche
              </label>
              <select value={selectedEl.width} onChange={e => { selectedEl.width=Number(e.target.value); selectedElRef.current=selectedEl; redraw(); setSelectedEl({...selectedEl,width:Number(e.target.value)}); }}
                className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white">
                <option value={1.5}>Fin</option><option value={2.5}>Moyen</option><option value={4}>Épais</option>
              </select>
            </>
          )}
          <button type="button" onClick={() => { elementsRef.current=elementsRef.current.filter(x=>x!==selectedEl); selectedElRef.current=null; setSelectedEl(null); redraw(); }}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600">🗑 Supprimer</button>
          <button type="button" onClick={() => { selectedElRef.current=null; setSelectedEl(null); redraw(); }}
            className="px-3 py-1.5 rounded-lg text-sm border border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5">✕ Désélectionner</button>
        </div>
      )}
      <div className="lg:flex lg:gap-4 lg:items-start mb-4">
        <div ref={wrapRef}
          className={fullscreen
            ? "fixed inset-0 z-[900] bg-white overflow-hidden flex items-center justify-center"
            : "relative border border-[#1B2A4A]/15 rounded-lg overflow-hidden bg-white lg:flex-1 min-w-0"}
          style={{ touchAction: "none" }}>
          <button type="button" onClick={() => setFullscreen(f => !f)}
            className="absolute top-2 left-2 z-40 w-8 h-8 rounded-lg bg-white/90 shadow border border-[#1B2A4A]/15 flex items-center justify-center text-[#1B2A4A] hover:bg-white no-print"
            title={fullscreen ? "Réduire" : "Agrandir en plein écran"}>
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <canvas ref={canvasRef} width={dims.width} height={dims.height}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none", ...(fullscreen ? { maxHeight: "100vh", width: "auto", maxWidth: "100vw" } : {}) }}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
          {previousSchemaGhost && showGhost && (
            <img src={previousSchemaGhost} alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.25, pointerEvents: "none" }} />
          )}
          {pendingText && (() => {
            const taRef = React.createRef();
            return (
              <div style={{ position: "absolute", left: pendingText.screenX, top: pendingText.screenY - textSize * 0.7 }} onPointerDown={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <textarea ref={taRef} autoFocus rows={Math.max(1, pendingText.value.split("\n").length)} value={pendingText.value}
                    onChange={e => setPendingText({ ...pendingText, value: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); commitPendingText(); } if (e.key === "Escape") setPendingText(null); }}
                    style={{ fontSize: textSize, color, fontWeight: textBold?"bold":"normal", fontStyle: textItalic?"italic":"normal", background: textHighlight?"rgba(255,230,0,0.7)":"rgba(255,255,255,0.9)", border: "1px dashed #FF6B35", outline: "none", padding: "2px 4px", minWidth: 120, resize: "both", lineHeight: 1.25, fontFamily: "sans-serif", borderRadius: 3 }} />
                  <button onClick={commitPendingText} style={{ fontSize: 11, background: "#FF6B35", color: "white", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", marginBottom: 2 }}>OK</button>
                </div>
              </div>
            );
          })()}
          <DrawQuickPanel courtType={courtType} tool={tool} lastLineTool={lastLineTool} toolLineStyles={toolLineStyles} setTool={setTool} setToolLineStyles={setToolLineStyles}
            playerLabel={playerLabel} setPlayerLabel={setPlayerLabel} playerHasBall={playerHasBall} setPlayerHasBall={setPlayerHasBall}
          playerIsDefender={playerIsDefender} setPlayerIsDefender={setPlayerIsDefender}
          open={activeSwipePanel === "quick"} setOpen={(v) => setActiveSwipePanel(v ? "quick" : null)} />
          {fullscreen && (
            <DrawModifyPanel tool={tool} setTool={setTool} color={color} setColor={setColor} lineWidth={lineWidth} setLineWidth={setLineWidth}
              eraserSize={eraserSize} setEraserSize={setEraserSize} arrowEnd={arrowEnd} setArrowEnd={setArrowEnd} playerSize={playerSize} setPlayerSize={setPlayerSize} playerColor={playerColor} setPlayerColor={setPlayerColor}
              onUndo={undo} onClearAll={clearAll}
              open={activeSwipePanel === "modify"} setOpen={(v) => setActiveSwipePanel(v ? "modify" : null)} />
          )}
          {fullscreen && <FloatingUndoButton onUndo={undo} />}
        </div>
        {referencePhotoOptions.length > 0 && (
          <div className={`hidden lg:flex lg:flex-col flex-shrink-0 ${refPhotoCollapsed ? "lg:w-8" : "lg:w-64"}`}>
            <button type="button" onClick={() => setRefPhotoCollapsed(c => !c)}
              className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B2A4A]/40 hover:text-[#1B2A4A]/70 mb-1.5">
              <span className={`transition-transform ${refPhotoCollapsed ? "-rotate-90" : ""}`}>▾</span>
              {!refPhotoCollapsed && "Photo de référence"}
            </button>
            {!refPhotoCollapsed && (
              <>
                {referencePhotoOptions.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap mb-1.5">
                    {referencePhotoOptions.map((opt, i) => (
                      <button key={i} type="button" onClick={() => setRefPhotoIdx(i)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${i === refPhotoIdx ? "text-white" : "text-[#1B2A4A]/60 border-[#1B2A4A]/20 hover:border-[#1B2A4A]/40"}`}
                        style={i === refPhotoIdx ? { backgroundColor: "#FF6B35", borderColor: "#FF6B35" } : undefined}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {referencePhoto && (
                  <img src={referencePhoto} alt="Photo de référence" onClick={() => setRefPhotoZoomed(true)}
                    className="w-full rounded-lg border border-[#1B2A4A]/15 object-contain bg-[#F2EDE4] cursor-zoom-in" />
                )}
              </>
            )}
          </div>
        )}
      </div>
      {refPhotoZoomed && (
        <div className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4" onClick={() => setRefPhotoZoomed(false)}>
          <img src={referencePhoto} alt="Photo de référence" className="max-w-full max-h-full object-contain rounded-lg" />
          <button type="button" onClick={() => setRefPhotoZoomed(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center">✕</button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        <button onClick={validateSchema}
          className="bg-[#FF6B35] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#e85a28]">
          Utiliser ce schéma
        </button>
      </div>
    </div>
  );
}

function MonthRow({ month, monthSessions, totalDuree, onOpen, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const totalMin = monthSessions.reduce((sum, s) => sum + totalDuree(s), 0);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/70 border border-[#1B2A4A]/15 hover:shadow-md transition-shadow text-left">
        <span className="font-semibold text-[#1B2A4A] capitalize">{month}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#1B2A4A]/50">{monthSessions.length} séance{monthSessions.length > 1 ? "s" : ""} · {totalMin} min</span>
          <ChevronRight size={16} className={`text-[#1B2A4A]/30 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 pl-3 border-l-2 ml-4" style={{ borderColor: "#FF6B35" + "33" }}>
          {monthSessions.map(s => (
            <SessionRow key={s.id} s={s} totalDuree={totalDuree(s)}
              onOpen={() => onOpen(s)}
              onRename={(titre) => onRename(s, titre)}
              onDelete={() => onDelete(s)} />
          ))}
        </div>
      )}
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
  const [newTheme, setNewTheme] = useState("");
  const [extraThemes, setExtraThemes] = useState([]);

  const addTheme = () => {
    const t = newTheme.trim();
    if (!t || selectedThemes.includes(t) || themes.includes(t)) return;
    setExtraThemes(prev => prev.includes(t) ? prev : [...prev, t]);
    setSelectedThemes(prev => [...prev, t]);
    setNewTheme("");
  };

  const allThemes = [...themes, ...extraThemes.filter(t => !themes.includes(t))];

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
          <div className="flex flex-wrap gap-1.5 mb-2">
            {allThemes.map(t => <Tag key={t} active={selectedThemes.includes(t)} onClick={() => setSelectedThemes(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])}>{t}</Tag>)}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={newTheme} onChange={e => setNewTheme(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTheme()}
              placeholder="+ Ajouter un thème..."
              className="flex-1 border border-[#1B2A4A]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B35]" />
            <button onClick={addTheme} className="px-3 py-2 bg-[#FF6B35]/10 text-[#FF6B35] rounded-lg text-sm font-medium hover:bg-[#FF6B35]/20">Ajouter</button>
          </div>
          {extraThemes.length > 0 && <p className="text-xs text-[#1B2A4A]/40 mt-1">Ces thèmes seront ajoutés à ta bibliothèque.</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 border border-[#1B2A4A]/20 rounded-lg py-3 text-sm font-medium text-[#1B2A4A]/60">Annuler</button>
          <button onClick={() => onSave(titre || "Exercice rogné", duree, selectedThemes, extraThemes)}
            className="flex-1 text-white rounded-lg py-3 text-sm font-semibold" style={{ backgroundColor: "#FF6B35" }}>
            Ajouter à la séance
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Perspective correction (homography) ──────────────────────────────────────
function gaussSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let mx = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[mx][c])) mx = r;
    [M[c], M[mx]] = [M[mx], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let j = 0; j < i; j++) M[j][n] -= M[j][i] * x[i];
  }
  return x;
}

function buildHomography(src4, dst4) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src4[i], { x: dx, y: dy } = dst4[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx*sx, -dx*sy]); b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy*sx, -dy*sy]); b.push(dy);
  }
  const h = gaussSolve(A, b);
  return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
}

function dist2pts(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }

// Pivote une image (dataURL) de 90° par pas — utile pour une photo prise en mauvais sens
// avant de la redresser (voir PerspectiveCorrectionView).
function rotateImageDataUrl(dataUrl, degrees) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swap = ((degrees / 90) % 2 + 2) % 2 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.naturalHeight : img.naturalWidth;
      canvas.height = swap ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function warpPerspective(imgEl, corners) {
  const naturalW = imgEl.naturalWidth, naturalH = imgEl.naturalHeight;
  const maxW = 1800;
  const scale = Math.min(1, maxW / Math.max(naturalW, naturalH));
  const sw = Math.round(naturalW * scale), sh = Math.round(naturalH * scale);
  const sc = corners.map(p => ({ x: p.x * scale, y: p.y * scale }));
  const outW = Math.round((dist2pts(sc[0],sc[1]) + dist2pts(sc[3],sc[2])) / 2);
  const outH = Math.round((dist2pts(sc[0],sc[3]) + dist2pts(sc[1],sc[2])) / 2);

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = sw; srcCanvas.height = sh;
  srcCanvas.getContext('2d').drawImage(imgEl, 0, 0, sw, sh);
  const srcData = srcCanvas.getContext('2d').getImageData(0, 0, sw, sh).data;

  const dstPts = [{ x:0,y:0 },{ x:outW,y:0 },{ x:outW,y:outH },{ x:0,y:outH }];
  const H = buildHomography(dstPts, sc);
  const [h0,h1,h2,h3,h4,h5,h6,h7,h8] = H;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = outW; dstCanvas.height = outH;
  const dstCtx = dstCanvas.getContext('2d');
  const dstImg = dstCtx.createImageData(outW, outH);
  const d = dstImg.data;

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const w = h6*dx + h7*dy + h8;
      const sx = (h0*dx + h1*dy + h2) / w;
      const sy = (h3*dx + h4*dy + h5) / w;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = x0+1, y1 = y0+1;
      if (x0 < 0 || y0 < 0 || x1 >= sw || y1 >= sh) continue;
      const fx = sx-x0, fy = sy-y0;
      const i = (dy*outW+dx)*4;
      for (let c = 0; c < 3; c++) {
        const tl = srcData[(y0*sw+x0)*4+c], tr = srcData[(y0*sw+x1)*4+c];
        const bl = srcData[(y1*sw+x0)*4+c], br = srcData[(y1*sw+x1)*4+c];
        d[i+c] = Math.round(tl*(1-fx)*(1-fy) + tr*fx*(1-fy) + bl*(1-fx)*fy + br*fx*fy);
      }
      d[i+3] = 255;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return dstCanvas.toDataURL('image/jpeg', 0.9);
}

function PerspectiveCorrectionView({ imageData, onConfirm, onSkip }) {
  const containerRef = useRef();
  const imgRef = useRef();
  const [imgSize, setImgSize] = useState(null);
  const [corners, setCorners] = useState(null); // [TL, TR, BR, BL] image coords
  const [dragging, setDragging] = useState(null);
  const [processing, setProcessing] = useState(false);
  // Photo pivotée si besoin (avant redressement) — remplace imageData tant qu'on tourne.
  const [displayImage, setDisplayImage] = useState(imageData);
  const [rotating, setRotating] = useState(false);

  const handleRotate = async () => {
    setRotating(true);
    try {
      const rotated = await rotateImageDataUrl(displayImage, 90);
      setImgSize(null);
      setCorners(null);
      setDisplayImage(rotated);
    } catch {
      /* image illisible pour la rotation, on garde l'affichage actuel */
    } finally {
      setRotating(false);
    }
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    const w = img.naturalWidth, h = img.naturalHeight;
    setImgSize({ w, h });
    const m = Math.min(w, h) * 0.08;
    setCorners([{ x:m, y:m },{ x:w-m, y:m },{ x:w-m, y:h-m },{ x:m, y:h-m }]);
  };

  const getLayout = useCallback(() => {
    if (!containerRef.current || !imgSize) return null;
    const cw = containerRef.current.clientWidth, ch = containerRef.current.clientHeight;
    const scale = Math.min(cw / imgSize.w, ch / imgSize.h);
    const dw = imgSize.w * scale, dh = imgSize.h * scale;
    return { scale, dw, dh, ox: (cw-dw)/2, oy: (ch-dh)/2 };
  }, [imgSize]);

  const layout = getLayout();
  const toDisp = (p, l) => ({ x: p.x*l.scale+l.ox, y: p.y*l.scale+l.oy });
  const toImg = (x, y, l) => ({
    x: Math.max(0, Math.min(imgSize.w, (x-l.ox)/l.scale)),
    y: Math.max(0, Math.min(imgSize.h, (y-l.oy)/l.scale)),
  });

  const onPointerMove = useCallback((e) => {
    if (dragging === null || !layout) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pt = toImg(e.clientX - rect.left, e.clientY - rect.top, layout);
    setCorners(prev => prev.map((c, i) => i === dragging ? pt : c));
  }, [dragging, layout, imgSize]);

  const handleConfirm = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 30));
    try { onConfirm(warpPerspective(imgRef.current, corners)); }
    finally { setProcessing(false); }
  };

  const COLORS = ["#FF6B35","#22c55e","#3b82f6","#a855f7"];

  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1B2A4A]">
        <div>
          <div className="text-white font-bold text-sm" style={{ fontFamily:"Oswald,sans-serif" }}>REDRESSER LA PHOTO</div>
          <div className="text-white/50 text-xs">Glisse les 4 coins sur les bords de ta feuille</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleRotate} disabled={rotating} title="Pivoter la photo de 90°"
            className="text-white/70 border border-white/20 rounded-lg px-3 py-1.5 hover:text-white disabled:opacity-50 flex items-center justify-center">
            {rotating ? <Loader2 size={15} className="animate-spin" /> : "⟳ Pivoter"}
          </button>
          <button onClick={() => onSkip(displayImage)} className="text-white/50 text-xs border border-white/20 rounded-lg px-3 py-1.5 hover:text-white">Passer</button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(null)}>
        <img ref={imgRef} src={displayImage} onLoad={onImgLoad} alt=""
          draggable={false}
          style={layout ? { position:"absolute", left:layout.ox, top:layout.oy, width:layout.dw, height:layout.dh, userSelect:"none", pointerEvents:"none" } : { opacity:0 }} />

        {layout && corners && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <polygon
              points={corners.map(p => { const d=toDisp(p,layout); return `${d.x},${d.y}`; }).join(" ")}
              fill="rgba(255,107,53,0.12)" stroke="#FF6B35" strokeWidth="2" strokeDasharray="8 4" />
            {corners.map((p, i) => {
              const d = toDisp(p, layout);
              return <line key={i}
                x1={toDisp(corners[i],layout).x} y1={toDisp(corners[i],layout).y}
                x2={toDisp(corners[(i+1)%4],layout).x} y2={toDisp(corners[(i+1)%4],layout).y}
                stroke={COLORS[i]} strokeWidth="2" opacity="0.6" />;
            })}
          </svg>
        )}

        {layout && corners && corners.map((p, i) => {
          const d = toDisp(p, layout);
          return (
            <div key={i}
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(i); }}
              style={{ position:"absolute", left:d.x-24, top:d.y-24, width:48, height:48,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"grab", touchAction:"none" }}>
              <div style={{ width:28, height:28, borderRadius:"50%",
                background:COLORS[i], border:"3px solid white",
                boxShadow:"0 2px 10px rgba(0,0,0,0.6)" }} />
            </div>
          );
        })}
      </div>

      <div className="px-4 py-4 bg-[#1B2A4A] flex gap-3">
        <button onClick={() => onSkip(displayImage)} className="flex-1 border border-white/20 text-white/60 rounded-xl py-3 text-sm">
          Sans correction
        </button>
        <button onClick={handleConfirm} disabled={processing || !corners}
          className="flex-1 bg-[#FF6B35] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {processing ? <><Loader2 size={15} className="animate-spin" /> Traitement…</> : "✓ Redresser"}
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function CropPhotoView({ imageData, onCancel, onCrop, multiMode = false, cropCount = 0, courtType = "basketball" }) {
  const canvasRef = useRef();
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const dragging = useRef(false);
  const dragModeRef = useRef("draw"); // "draw" (nouveau rectangle) ou "move" (déplacer l'existant)
  const moveOffsetRef = useRef({ dx: 0, dy: 0 });
  const startRef = useRef({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState(null);
  // Ratio des terrains fournis dans /public (largeur/hauteur) — aide à cadrer pile sur les lignes
  const TERRAIN_RATIO = 330 / 410;
  const [aspect, setAspect] = useState(null); // null = libre, sinon ratio largeur/hauteur

  // Mémorise le dernier cadrage (coordonnées relatives 0-1) pour le reproduire
  // sur d'autres photos prises du même terrain/même angle de caméra.
  const LAST_CROP_KEY = "cpb_last_crop_rect";
  const [hasLastCrop, setHasLastCrop] = useState(() => {
    try { return !!localStorage.getItem(LAST_CROP_KEY); } catch { return false; }
  });
  const applyLastCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_CROP_KEY));
      if (!saved) return;
      const r = {
        x: saved.rx * canvas.width, y: saved.ry * canvas.height,
        w: saved.rw * canvas.width, h: saved.rh * canvas.height,
      };
      setCropRect(r);
      redraw(r);
    } catch {}
  };

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
    dragging.current = true;
    // Si on clique à l'intérieur du rectangle déjà tracé (ex: après "Reproduire le dernier
    // cadrage"), on le déplace au lieu d'en redessiner un nouveau — pratique pour recaler le
    // même cadrage sur un autre terrain de la photo sans le retracer à chaque fois.
    const nr = cropRect ? normalizeRect(cropRect) : null;
    if (nr && pos.x >= nr.x && pos.x <= nr.x + nr.w && pos.y >= nr.y && pos.y <= nr.y + nr.h) {
      dragModeRef.current = "move";
      moveOffsetRef.current = { dx: pos.x - nr.x, dy: pos.y - nr.y };
      setCropRect(nr);
      return;
    }
    dragModeRef.current = "draw";
    startRef.current = pos;
    const r = { ...pos, w: 0, h: 0 };
    setCropRect(r);
    redraw(r);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (dragModeRef.current === "move") {
      setCropRect(prev => {
        if (!prev) return prev;
        let x = pos.x - moveOffsetRef.current.dx;
        let y = pos.y - moveOffsetRef.current.dy;
        x = Math.max(0, Math.min(x, canvas.width - prev.w));
        y = Math.max(0, Math.min(y, canvas.height - prev.h));
        const r = { ...prev, x, y };
        redraw(r);
        return r;
      });
      return;
    }
    let w = pos.x - startRef.current.x;
    let h = pos.y - startRef.current.y;
    if (aspect) {
      // Contraint la hauteur au ratio choisi, en gardant le sens du glissement
      h = (Math.abs(w) / aspect) * Math.sign(h || 1);
    }
    const r = { x: startRef.current.x, y: startRef.current.y, w, h };
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
    const canvas = canvasRef.current;
    try {
      localStorage.setItem(LAST_CROP_KEY, JSON.stringify({
        rx: nr.x / canvas.width, ry: nr.y / canvas.height,
        rw: nr.w / canvas.width, rh: nr.h / canvas.height,
      }));
      setHasLastCrop(true);
    } catch {}
    if (multiMode) { setCropRect(null); redraw(null); }
  };

  const canCrop = cropRect && Math.abs(cropRect.w) > 10 && Math.abs(cropRect.h) > 10;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ backgroundColor: "#1B2A4A" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        {multiMode ? (
          <button onClick={onCancel} className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><Check size={18} /> Terminer</button>
        ) : (
          <button onClick={onCancel} className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><X size={18} /> Annuler</button>
        )}
        <span className="text-white font-medium text-sm">
          {multiMode ? (cropCount > 0 ? `${cropCount} image${cropCount > 1 ? "s" : ""} ajoutée${cropCount > 1 ? "s" : ""} · trace une nouvelle zone (ou glisse le cadre pour le déplacer)` : "Trace un rectangle à rogner") : "Trace un rectangle autour de l'exercice"}
        </span>
        <button onClick={handleCrop} disabled={!canCrop}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: "#FF6B35", opacity: canCrop ? 1 : 0.4 }}>
          {multiMode ? "Ajouter" : "Rogner"}
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 pb-2 flex-shrink-0">
        <button onClick={() => setAspect(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium ${aspect === null ? "bg-white text-[#1B2A4A]" : "bg-white/10 text-white/60"}`}>
          Libre
        </button>
        <button onClick={() => setAspect(TERRAIN_RATIO)}
          className={`px-3 py-1 rounded-full text-xs font-medium ${aspect === TERRAIN_RATIO ? "bg-white text-[#1B2A4A]" : "bg-white/10 text-white/60"}`}>
          🏀 Terrain
        </button>
        {hasLastCrop && (
          <button onClick={applyLastCrop}
            className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60 hover:bg-white/20 hover:text-white">
            📍 Reproduire le dernier cadrage
          </button>
        )}
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

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function ChangePasswordBlock() {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd !== confirm) { setErr("Les mots de passe ne correspondent pas."); return; }
    if (pwd.length < 6) { setErr("Minimum 6 caractères."); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setOk(true);
    setTimeout(() => { setOpen(false); setOk(false); setPwd(""); setConfirm(""); }, 2000);
  };

  return (
    <>
      <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
        <button onClick={() => setOpen(true)} className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors">
          <span>Changer mon mot de passe</span>
          <ChevronRight size={16} className="text-[#1B2A4A]/40" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1B2A4A] mb-4">Changer le mot de passe</h3>
            {ok ? (
              <p className="text-green-600 text-sm">✅ Mot de passe mis à jour !</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input type="password" placeholder="Nouveau mot de passe" value={pwd} onChange={e => setPwd(e.target.value)} required className="border border-[#1B2A4A]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B2A4A]" />
                <input type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} required className="border border-[#1B2A4A]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B2A4A]" />
                {err && <p className="text-red-500 text-xs">{err}</p>}
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 border border-[#1B2A4A]/20 rounded-xl py-3 text-sm text-[#1B2A4A]">Annuler</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-[#1B2A4A] text-white rounded-xl py-3 text-sm font-medium">{loading ? "..." : "Enregistrer"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Détecte le retour de confirmation email
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes("access_token") || params.get("type") === "signup") {
      setMessage("✅ Email confirmé ! Vous pouvez maintenant vous connecter.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Compte créé ! Vérifie tes emails pour confirmer ton inscription, puis connecte-toi.");
        setMode("login");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/?type=recovery",
        });
        if (error) throw error;
        setMessage("Email de réinitialisation envoyé ! Vérifie ta boîte mail.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.auth.signOut({ scope: "others" });
      }
    } catch (err) {
      const msg = typeof err.message === "string" && err.message.trim() && err.message !== "{}"
        ? err.message
        : "Une erreur est survenue. Vérifie ton email ou réessaie plus tard.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(null); setMessage(null); setPassword(""); setConfirm(""); };

  return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center p-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo-icon.png" alt="CPB" className="w-10 h-10 rounded-xl object-contain" />
          <h1 className="font-bold text-[#1B2A4A] text-xl leading-tight" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</h1>
        </div>
        {mode !== "forgot" && <p className="text-sm text-[#1B2A4A]/60 mb-6 leading-relaxed">Centralisez vos exercices, construisez vos meilleures séances et faites performer votre équipe.</p>}
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-6">
          {mode === "login" ? "Connexion" : mode === "signup" ? "Créer un compte" : "Mot de passe oublié"}
        </h2>
        {message && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#FF6B35]" />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Mot de passe</label>
              <div className="relative mt-1">
                <input type={showPwd ? "text" : "password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:border-[#FF6B35]" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/40 hover:text-[#1B2A4A]">
                  <EyeIcon open={showPwd} />
                </button>
              </div>
              {mode === "signup" && <p className="text-xs text-[#1B2A4A]/40 mt-1">6 caractères minimum</p>}
            </div>
          )}
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-[#1B2A4A]/60 uppercase tracking-wide">Confirmer le mot de passe</label>
              <div className="relative mt-1">
                <input type={showConfirm ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-[#1B2A4A]/20 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:border-[#FF6B35]" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/40 hover:text-[#1B2A4A]">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-[#FF6B35] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#e85a28] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Se connecter" : mode === "signup" ? "S'inscrire" : "Envoyer le lien"}
          </button>
        </form>
        <div className="mt-4 space-y-2 text-center">
          {mode === "login" && (
            <>
              <button onClick={() => switchMode("signup")} className="w-full text-sm text-[#1B2A4A]/50 hover:text-[#FF6B35] transition-colors">
                Pas encore de compte ? S'inscrire
              </button>
              <button onClick={() => switchMode("forgot")} className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#FF6B35] transition-colors">
                Mot de passe oublié ?
              </button>
            </>
          )}
          {mode !== "login" && (
            <button onClick={() => switchMode("login")} className="w-full text-sm text-[#1B2A4A]/50 hover:text-[#FF6B35] transition-colors">
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function usePlayImages(play) {
  const [images, setImages] = useState([]);
  useEffect(() => {
    if (!play.images || play.images.length === 0) { setImages([]); return; }
    let active = true;
    (async () => {
      const loaded = await Promise.all(play.images.map(async (img) => {
        if (img.file?.data) return { ...img, data: img.file.data };
        try {
          const r = await storage.get(`playimg:${play.id}:${img.id}`);
          if (r && active) { const parsed = JSON.parse(r.value); return { ...img, data: parsed.data || null, hasFile: true }; }
        } catch {}
        return { ...img, data: null };
      }));
      if (active) setImages(loaded);
    })();
    return () => { active = false; };
  }, [play.id, JSON.stringify(play.images?.map(i => i.id))]);
  return images;
}

// Un des systèmes "proposés au coach" en Mode match : carrousel de ses visuels (schémas/photos)
// pour rester lisible en un coup d'oeil pendant le match.
function MatchFavoritePlayCard({ play, onView }) {
  const images = usePlayImages(play);
  const [idx, setIdx] = useState(0);
  const visibleImgs = images.filter(img => img.data && img.fileType?.startsWith("image/")).map(img => img.data);
  const items = [...visibleImgs, ...(play.schemas || [])];
  return (
    <div className="border border-[#1B2A4A]/15 rounded-xl bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-[#1B2A4A]/10 cursor-pointer" onClick={onView}>
        <div className="font-semibold text-[#1B2A4A] text-sm leading-tight">{play.titre}</div>
        {play.type && <div className="text-[10px] font-medium" style={{ color: "var(--sport-accent)" }}>{play.type}</div>}
      </div>
      {items.length > 0 ? (
        <MediaCarousel items={items} index={idx} onIndexChange={setIdx} card={false} height="h-40" onClickImage={onView} />
      ) : (
        <div className="h-40 flex items-center justify-center text-xs text-[#1B2A4A]/30 cursor-pointer" onClick={onView}>Aucun visuel</div>
      )}
    </div>
  );
}

// Panneau "Mes systèmes" en Mode match : glisser depuis le bord droit (ou taper la poignée)
// pour afficher jusqu'à 4 plays choisis en amont du match, à proposer au coach en direct —
// même geste swipe que dans les dessinateurs, pour rester cohérent avec le reste de l'app.
function MatchFavoritesPanel({ plays, onViewPlay }) {
  const [open, setOpen] = useState(false);
  const touchStartX = useRef(null);
  const onEdgeTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onEdgeTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -24) setOpen(true);
    else if (dx > 24) setOpen(false);
    touchStartX.current = null;
  };
  if (!plays.length) return null;
  return (
    <>
      <div onTouchStart={onEdgeTouchStart} onTouchEnd={onEdgeTouchEnd} onClick={() => setOpen(o => !o)}
        className="fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-6 h-16 bg-[#1B2A4A] text-white rounded-l-lg shadow-lg cursor-pointer transition-[right] duration-200 no-print"
        style={{ right: open ? 288 : 0, touchAction: "pan-y" }} title="Mes systèmes (glisser ou taper)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none" }}><polyline points="9 18 15 12 9 6" /></svg>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/10 no-print" onClick={() => setOpen(false)} />}
      <div className={`fixed top-0 right-0 bottom-0 z-[35] w-72 bg-[#F2EDE4] shadow-2xl border-l border-[#1B2A4A]/10 overflow-y-auto transition-transform duration-200 no-print ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-3 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2A4A]/40">Mes systèmes</div>
          {plays.map(play => <MatchFavoritePlayCard key={play.id} play={play} onView={() => onViewPlay?.(play)} />)}
        </div>
      </div>
    </>
  );
}

function PlayCard({ play, onView, onEdit, onRemove, onAddToSession, onShare, onSelect, selected, onToggleFavorite }) {
  const images = usePlayImages(play);
  const [imgIdx, setImgIdx] = useState(0);
  const [confirmDel, setConfirmDel] = useState(false);
  const visibleImgs = images.filter(img => img.data && img.fileType?.startsWith("image/"));
  const schemas = play.schemas || [];
  // Carousel unifié : photos + schémas tactiques
  const carouselItems = [
    ...visibleImgs.map(img => ({ src: img.data, annotation: img.annotation })),
    ...schemas.map(s => ({ src: s, annotation: null })),
  ];
  const currentItem = carouselItems[Math.min(imgIdx, carouselItems.length - 1)];

  return (
    <div className={`relative border rounded-xl bg-white shadow-md shadow-[#1B2A4A]/10 hover:shadow-lg overflow-hidden transition-all ${selected ? "border-[#FF6B35] ring-2 ring-[#FF6B35]/30" : play.favorite ? "border-[#FF6B35]/40" : "border-[#1B2A4A]/10 hover:border-[#FF6B35]/50"}`}>
      {onToggleFavorite && (
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
          title={play.favorite ? "Retirer des favoris" : "Mettre en favori"}>
          <Star size={14} fill={play.favorite ? "#FF6B35" : "none"} className={play.favorite ? "text-[#FF6B35]" : "text-[#1B2A4A]/30"} />
        </button>
      )}
      {onSelect && (
        <div className="flex items-center gap-2 px-3 pt-2" onClick={onSelect}>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${selected ? "bg-[#FF6B35] border-[#FF6B35]" : "border-[#1B2A4A]/30"}`}>
            {selected && <Check size={12} className="text-white" />}
          </div>
          <span className="text-xs text-[#1B2A4A]/50">{selected ? "Sélectionné" : "Sélectionner"}</span>
        </div>
      )}
      {carouselItems.length > 0 && (
        <div className="cursor-pointer">
          <MediaCarousel items={carouselItems.map(it => it.src)} index={imgIdx} onIndexChange={setImgIdx} card={false} height="h-48"
            onClickImage={onView}
            overlay={currentItem.annotation && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-xs px-2 py-1 text-center">
                {currentItem.annotation}
              </div>
            )} />
        </div>
      )}
      <div className="p-3 cursor-pointer" onClick={onView}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="font-semibold text-[#1B2A4A] text-sm truncate">{play.titre}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: "var(--sport-accent)" }}>{play.type}</div>
            {play.scoutedTeam && (
              <div className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#1B2A4A] text-white rounded-full px-2 py-0.5 mt-1">
                🔍 {play.scoutedTeam}
              </div>
            )}
            {play.description && <div className="text-xs text-[#1B2A4A]/50 mt-0.5 line-clamp-2">{play.description}</div>}
            {(play.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(play.tags || []).map(t => (
                  <span key={t} className="text-xs bg-[#1B2A4A]/8 text-[#1B2A4A]/60 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
            {onAddToSession && (
              <button onClick={onAddToSession} className="p-1 text-[#FF6B35] hover:bg-[#FF6B35]/10 rounded" title="Ajouter à la séance">
                <Plus size={14} />
              </button>
            )}
            {onShare && (
              <button onClick={onShare} className="p-1 text-[#1B2A4A]/40 hover:text-[#FF6B35] rounded" title="Partager">
                <Share2 size={14} />
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="p-1 text-[#1B2A4A]/40 hover:text-[#FF6B35] rounded" title="Modifier">
                <Pencil size={14} />
              </button>
            )}
            {onRemove && (
              confirmDel ? (
                <div className="flex gap-1">
                  <button onClick={() => onRemove()} className="text-xs text-red-600 font-medium px-1">Suppr.</button>
                  <button onClick={() => setConfirmDel(false)} className="text-xs text-[#1B2A4A]/40 px-1">✕</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="p-1 text-[#1B2A4A]/30 hover:text-red-600 rounded">
                  <Trash2 size={14} />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const COURT_W = 440, COURT_H = 420;

function CourtEditor({ value, onChange }) {
  const svgRef = useRef();
  const players = value?.players || [];
  const paths = value?.paths || [];
  const screens = value?.screens || [];

  const [tool, setTool] = useState("offense");
  const [pending, setPending] = useState(null); // {x,y} awaiting second click for path/screen
  const [screenStart, setScreenStart] = useState(null);
  const [selected, setSelected] = useState(null); // {type:"player"|"path"|"screen", idx}

  const offCount = players.filter(p => p.role === "offense").length;
  const defCount = players.filter(p => p.role === "defender").length;

  const getSvgPos = (e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: Math.round(((src.clientX - rect.left) / rect.width) * COURT_W),
      y: Math.round(((src.clientY - rect.top) / rect.height) * COURT_H),
    };
  };

  const hitPlayer = (pos) => {
    const idx = players.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 18);
    return idx >= 0 ? idx : null;
  };

  const handleSvgClick = (e) => {
    if (e.target.closest("[data-el]")) return;
    const pos = getSvgPos(e);

    if (tool === "delete") { setSelected(null); return; }

    if (tool === "offense" || tool === "defense") {
      const role = tool === "offense" ? "offense" : "defender";
      const label = role === "offense"
        ? String(offCount + 1)
        : `X${defCount + 1}`;
      onChange({ players: [...players, { x: pos.x, y: pos.y, label, hasBall: false, role }], paths, screens });
      setSelected(null);
      return;
    }

    if (tool === "pass" || tool === "dribble" || tool === "cut") {
      if (!pending) {
        const pi = hitPlayer(pos);
        setPending(pi !== null ? { x: players[pi].x, y: players[pi].y } : pos);
      } else {
        const pi = hitPlayer(pos);
        const end = pi !== null ? { x: players[pi].x, y: players[pi].y } : pos;
        if (Math.hypot(end.x - pending.x, end.y - pending.y) > 10) {
          onChange({ players, paths: [...paths, { x1: pending.x, y1: pending.y, x2: end.x, y2: end.y, kind: tool }], screens });
        }
        setPending(null);
      }
      return;
    }

    if (tool === "screen") {
      if (!screenStart) {
        setScreenStart(pos);
      } else {
        if (Math.hypot(pos.x - screenStart.x, pos.y - screenStart.y) > 5) {
          onChange({ players, paths, screens: [...screens, { x1: screenStart.x, y1: screenStart.y, x2: pos.x, y2: pos.y }] });
        }
        setScreenStart(null);
      }
      return;
    }
  };

  const handleElClick = (e, type, idx) => {
    e.stopPropagation();
    if (tool === "delete") {
      if (type === "player") onChange({ players: players.filter((_, i) => i !== idx), paths, screens });
      if (type === "path") onChange({ players, paths: paths.filter((_, i) => i !== idx), screens });
      if (type === "screen") onChange({ players, paths, screens: screens.filter((_, i) => i !== idx) });
      return;
    }
    if (tool === "pass" || tool === "dribble" || tool === "cut") {
      if (type === "player") {
        const p = players[idx];
        if (!pending) { setPending({ x: p.x, y: p.y }); }
        else {
          if (Math.hypot(p.x - pending.x, p.y - pending.y) > 10) {
            onChange({ players, paths: [...paths, { x1: pending.x, y1: pending.y, x2: p.x, y2: p.y, kind: tool }], screens });
          }
          setPending(null);
        }
        return;
      }
    }
    if (tool === "ball" && type === "player") {
      onChange({ players: players.map((p, i) => i === idx ? { ...p, hasBall: !p.hasBall } : { ...p, hasBall: false }), paths, screens });
      return;
    }
    setSelected({ type, idx });
  };

  const cancelPending = () => { setPending(null); setScreenStart(null); };

  const tools = [
    { key: "offense", label: "Attaquant", icon: "①" },
    { key: "defense", label: "Défenseur", icon: "X" },
    { key: "ball", label: "Ballon", icon: "⚽", title: "Cliquer un joueur pour lui donner/retirer le ballon" },
    { key: "pass", label: "Passe", icon: "- ->" },
    { key: "dribble", label: "Dribble", icon: "〰→" },
    { key: "cut", label: "Déplacement", icon: "→" },
    { key: "screen", label: "Écran", icon: "||" },
    { key: "delete", label: "Supprimer", icon: "🗑" },
  ];

  const aid = "ce-arr";

  return (
    <div className="space-y-2">
      {/* Palette */}
      <div className="flex flex-wrap gap-1.5">
        {tools.map(t => (
          <button key={t.key} type="button" title={t.title || t.label}
            onClick={() => { setTool(t.key); cancelPending(); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tool === t.key ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "bg-white/60 text-[#1B2A4A] border-[#1B2A4A]/20 hover:border-[#1B2A4A]/50"}`}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {(pending || screenStart) && (
        <div className="flex items-center gap-2 text-xs text-[#FF6B35]">
          <span>Cliquer la destination sur le terrain…</span>
          <button type="button" onClick={cancelPending} className="underline">Annuler</button>
        </div>
      )}
      {/* SVG Court */}
      <div className="rounded-lg overflow-hidden border border-[#1B2A4A]/15 touch-none select-none" style={{ background: "#f8f5ef" }}>
        <svg ref={svgRef} viewBox={`0 0 ${COURT_W} ${COURT_H}`} width="100%"
          style={{ cursor: tool === "delete" ? "crosshair" : "pointer", display: "block" }}
          onClick={handleSvgClick}>
          <defs>
            <marker id={aid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" />
            </marker>
          </defs>
          {/* Court lines */}
          <CourtLines courtType={courtType} width={COURT_W} height={COURT_H} />

          {/* Paths */}
          {paths.map((p, i) => {
            const isWavy = p.kind === "dribble" || p.kind === "handoff";
            const d = isWavy ? wavyPath(p.x1, p.y1, p.x2, p.y2) : `M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`;
            const color = "#1B2A4A";
            return (
              <g key={i} data-el="path" onClick={e => handleElClick(e, "path", i)}>
                <path d={d} fill="none" stroke={color} strokeWidth={2}
                  strokeDasharray={p.kind === "pass" ? "6 4" : undefined}
                  markerEnd={p.kind !== "handoff" ? `url(#${aid})` : undefined}
                  style={{ cursor: "pointer" }} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
              </g>
            );
          })}

          {/* Screens */}
          {screens.map((s, i) => (
            <g key={i} data-el="screen" onClick={e => handleElClick(e, "screen", i)}>
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#1B2A4A" strokeWidth="3" style={{ cursor: "pointer" }} />
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" strokeWidth="12" />
            </g>
          ))}

          {/* Pending path preview */}
          {pending && (
            <circle cx={pending.x} cy={pending.y} r="5" fill="#FF6B35" opacity="0.7" />
          )}
          {screenStart && (
            <circle cx={screenStart.x} cy={screenStart.y} r="5" fill="#FF6B35" opacity="0.7" />
          )}

          {/* Players */}
          {players.map((pl, i) => (
            <g key={i} data-el="player" style={{ cursor: "pointer" }}
              onClick={e => handleElClick(e, "player", i)}>
              {pl.role === "defender" ? (
                <g transform={`translate(${pl.x},${pl.y})`}>
                  <path d="M -10 -4 C -18 -10 -26 -14 -28 -10 C -30 -6 -28 2 -26 6 C -22 10 -14 8 -10 4 Z" fill="#1B2A4A"/>
                  <circle cx="0" cy="0" r="11" fill="#1B2A4A"/>
                  <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">{pl.label}</text>
                </g>
              ) : pl.hasBall ? (
                <>
                  <circle cx={pl.x} cy={pl.y} r="14" fill="white" stroke="#1B2A4A" strokeWidth="2" />
                  <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1B2A4A">{pl.label}</text>
                </>
              ) : (
                <text x={pl.x} y={pl.y + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1B2A4A">{pl.label}</text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-[#1B2A4A]/40">
        <span>{players.length} joueur{players.length !== 1 ? "s" : ""} · {paths.length} trait{paths.length !== 1 ? "s" : ""} · {screens.length} écran{screens.length !== 1 ? "s" : ""}</span>
        {(players.length > 0 || paths.length > 0 || screens.length > 0) && (
          <button type="button" onClick={() => { if (window.confirm("Effacer tout le schéma ?")) onChange({ players: [], paths: [], screens: [] }); }}
            className="text-red-400 hover:text-red-600">Tout effacer</button>
        )}
      </div>
    </div>
  );
}

function PlayViewer({ play, onClose, onEdit, onUpdatePlay, showSocialExport = false }) {
  const images = usePlayImages(play);
  const [imgIdx, setImgIdx] = useState(0);
  const [cropping, setCropping] = useState(false);
  const visibleImgs = images.filter(img => img.data && img.fileType?.startsWith("image/"));
  const schemas = play.schemas || [];
  const carouselItems = [
    ...visibleImgs.map((img, i) => ({ src: img.data, annotation: img.annotation, type: "image", idx: i })),
    ...schemas.map((s, i) => ({ src: s, annotation: null, type: "schema", idx: i })),
  ];
  const currentItem = carouselItems[Math.min(imgIdx, carouselItems.length - 1)];

  const handleCrop = (croppedDataUrl) => {
    if (!onUpdatePlay || !currentItem) return;
    if (currentItem.type === "schema") {
      const newSchemas = [...(play.schemas || [])];
      newSchemas[currentItem.idx] = croppedDataUrl;
      onUpdatePlay({ ...play, schemas: newSchemas });
    } else {
      const newImages = play.images.map((img, i) => i === currentItem.idx ? { ...img, file: { ...img.file, data: croppedDataUrl } } : img);
      onUpdatePlay({ ...play, images: newImages });
    }
    setCropping(false);
  };

  if (cropping && currentItem) {
    return <CropPhotoView imageData={currentItem.src} onCancel={() => setCropping(false)} onCrop={handleCrop} />;
  }

  return (
    <div className="fixed inset-0 z-[250] bg-[#F4F0E6] flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-[#1B2A4A]/10 bg-white" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]"><X size={18} /> Fermer</button>
        <div className="text-center">
          <div className="text-[#1B2A4A] font-semibold">{play.titre}</div>
          <div className="text-xs font-medium" style={{ color: "var(--sport-accent)" }}>{play.type}</div>
        </div>
        <div className="flex items-center gap-3">
          {showSocialExport && (
            <SocialExportButton items={carouselItems.map(it => ({ src: it.src, caption: it.annotation }))}
              title={play.titre} subtitle={play.type} filenameBase={play.titre} />
          )}
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">
            <Pencil size={16} /> Modifier
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {carouselItems.length > 0 ? (
          <>
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-[#1B2A4A]/10 overflow-hidden">
              <MediaCarousel items={carouselItems.map(it => it.src)} index={imgIdx} onIndexChange={setImgIdx} card={false} height="max-h-[60vh] h-auto"
                overlay={onUpdatePlay && (
                  <button onClick={(e) => { e.stopPropagation(); setCropping(true); }}
                    className="absolute top-2 right-2 bg-white shadow-md text-[#1B2A4A] rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[#FF6B35] hover:text-white transition-colors">
                    <Pencil size={12} /> Rogner
                  </button>
                )} />
            </div>
            {currentItem.annotation && (
              <div className="mt-2 text-[#1B2A4A]/70 text-sm italic text-center">{currentItem.annotation}</div>
            )}
          </>
        ) : (
          <div className="text-[#1B2A4A]/30 text-sm">Aucune image</div>
        )}
      </div>
      {(play.description || play.notes || (play.tags || []).length > 0 || play.diagram) && (
        <div className="flex-shrink-0 bg-white border-t border-[#1B2A4A]/10 px-4 py-3 max-h-60 overflow-y-auto" onClick={e => e.stopPropagation()}>
          {play.diagram && !play.schemas?.length && (
            <div className="mb-2 bg-[#1B2A4A]/5 rounded-lg overflow-hidden">
              <CourtDiagram diagram={play.diagram} />
            </div>
          )}
          {play.description && <p className="text-[#1B2A4A]/80 text-sm mb-1">{play.description}</p>}
          {play.notes && <p className="text-[#1B2A4A]/50 text-xs">{play.notes}</p>}
          {(play.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(play.tags || []).map(t => (
                <span key={t} className="text-xs bg-[#1B2A4A]/8 text-[#1B2A4A]/60 rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayImageSlot({ img, playId, onChange, onRemove }) {
  const inputRef = useRef();
  const [localData, setLocalData] = useState(img.file?.data || null);

  useEffect(() => {
    if (img.file?.data) { setLocalData(img.file.data); return; }
    if (!img.hasFile || !img.id) { setLocalData(null); return; }
    (async () => {
      try {
        const r = await storage.get(`playimg:${playId}:${img.id}`);
        if (r) { const p = JSON.parse(r.value); setLocalData(p.data || null); }
      } catch {}
    })();
  }, [img.id, img.file?.data]);

  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { cpbAlert("Fichier trop lourd (max 20 Mo)."); return; }
    if (f.type.startsWith("image/")) {
      try {
        const data = await readImageAsJpeg(f, 1200, 0.72);
        const file = { name: f.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", data };
        setLocalData(data);
        onChange({ ...img, file });
      } catch { cpbAlert("Impossible de lire l'image."); }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const file = { name: f.name, type: f.type, data: reader.result };
        setLocalData(reader.result);
        onChange({ ...img, file });
      };
      reader.readAsDataURL(f);
    }
  };

  return (
    <div className="border border-[#1B2A4A]/20 rounded-lg overflow-hidden bg-white/60">
      {localData ? (
        <div className="relative">
          <img src={localData} alt="" className="w-full h-36 object-contain bg-white" />
          <button onClick={() => { setLocalData(null); onChange({ ...img, file: null, hasFile: false }); }}
            className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current.click()}
          className="w-full h-24 flex flex-col items-center justify-center gap-1.5 text-[#1B2A4A]/40 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 transition-colors">
          <ImageIcon size={20} />
          <span className="text-xs">Ajouter une image</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <div className="p-2 flex items-center gap-2">
        <input value={img.annotation || ""} onChange={e => onChange({ ...img, annotation: e.target.value })}
          placeholder="Annotation (ex: situation A, variante 1...)"
          className="flex-1 text-xs border border-[#1B2A4A]/15 rounded px-2 py-1 bg-white/60 focus:outline-none focus:border-[#FF6B35]" />
        <button onClick={onRemove} className="text-[#1B2A4A]/30 hover:text-red-500 shrink-0"><X size={14} /></button>
      </div>
    </div>
  );
}

function PlayForm({ onSave, onCancel, initial, playTags, savePlayTags, playTypes = PLAY_TYPES, savePlayTypes, courtType = "basketball", cpbAlert, autoOpenDraw = false, allTempsForts = [] }) {
  const [titre, setTitre] = useState(initial?.titre || "");
  const [type, setType] = useState(initial?.type || playTypes[0]);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [scoutedTeam, setScoutedTeam] = useState(initial?.scoutedTeam || "");
  const [tempsFort, setTempsFort] = useState(() => {
    const t = initial?.tempsFort;
    if (Array.isArray(t)) return t;
    return t ? [t] : [];
  });
  const [newTempsFort, setNewTempsFort] = useState("");
  const [intention, setIntention] = useState(initial?.intention || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [images, setImages] = useState(
    initial?.images?.map(img => ({ ...img, file: img.hasFile ? { name: img.fileName, type: img.fileType, data: null } : null })) || []
  );
  const [schemas, setSchemas] = useState(initial?.schemas || []);
  const [editingSchemaIdx, setEditingSchemaIdx] = useState(autoOpenDraw ? 0 : null);
  const [selectedTags, setSelectedTags] = useState(initial?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropCount, setCropCount] = useState(0);
  const cropInputRef = useRef();

  const addImage = () => setImages(prev => [...prev, { id: uid(), file: null, annotation: "" }]);
  const updateImage = (id, updated) => setImages(prev => prev.map(img => img.id === id ? updated : img));
  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  const handleCropFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCropSource(reader.result);
    reader.readAsDataURL(f);
  };

  const toast = useToast();
  const handleCropResult = (dataUrl) => {
    const newImg = { id: uid(), file: { name: "crop.jpg", type: "image/jpeg", data: dataUrl }, annotation: "" };
    setImages(prev => [...prev, newImg]);
    setCropCount(c => c + 1);
    toast?.("Photo rognée ajoutée ✓");
  };

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    // Réutilise le mot-clé existant (même casse) s'il y en a déjà un similaire, plutôt que de
    // créer un quasi-doublon (ex: "Ecran" vs "ecran").
    const existing = playTags.find(t => t.toLowerCase() === trimmed.toLowerCase());
    const finalTag = existing || trimmed;
    if (!existing) savePlayTags([...playTags, finalTag]);
    if (!selectedTags.includes(finalTag)) setSelectedTags(prev => [...prev, finalTag]);
    setNewTagInput("");
  };

  return (
    <div className="space-y-4">
      <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre du play (ex: Horns, Box BLOB 1...)"
        className="w-full text-lg font-semibold bg-transparent border-b-2 border-[#1B2A4A]/20 focus:border-[#FF6B35] outline-none pb-1 text-[#1B2A4A]" />
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Type</div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {playTypes.map(t => <Tag key={t} active={type === t} onClick={() => setType(t)}>{t}</Tag>)}
          {newTypeOpen ? (
            <div className="flex items-center gap-1">
              <input autoFocus value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newTypeInput.trim()) {
                    const t = newTypeInput.trim();
                    if (!playTypes.includes(t) && savePlayTypes) savePlayTypes([...playTypes, t]);
                    setType(t); setNewTypeInput(""); setNewTypeOpen(false);
                  }
                  if (e.key === "Escape") { setNewTypeInput(""); setNewTypeOpen(false); }
                }}
                placeholder="Nouveau type" className="px-2.5 py-1 rounded-full text-xs border border-[#FF6B35] outline-none w-28" />
              <button type="button" onClick={() => {
                const t = newTypeInput.trim();
                if (!t) return;
                if (!playTypes.includes(t) && savePlayTypes) savePlayTypes([...playTypes, t]);
                setType(t); setNewTypeInput(""); setNewTypeOpen(false);
              }} className="text-xs font-semibold text-[#FF6B35]">OK</button>
            </div>
          ) : (
            <button type="button" onClick={() => setNewTypeOpen(true)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-[#FF6B35]/50 text-[#FF6B35] flex items-center gap-1"><Plus size={12} /> Ajouter un type</button>
          )}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Équipe scoutée</div>
        <input value={scoutedTeam} onChange={e => setScoutedTeam(e.target.value)} placeholder="Ex: US Munster (facultatif)"
          className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Temps fort <span className="normal-case text-[#1B2A4A]/40">(3 max)</span></div>
          {tempsFort.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tempsFort.map((t, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  {t}
                  <button type="button" onClick={() => setTempsFort(arr => arr.filter((_, j) => j !== i))} className="text-[#1B2A4A]/50 hover:text-red-600">✕</button>
                </span>
              ))}
            </div>
          )}
          {tempsFort.length < 3 && (() => {
            const q = newTempsFort.trim().toLowerCase();
            const suggestions = q ? allTempsForts.filter(t => t.toLowerCase().includes(q) && !tempsFort.includes(t)) : [];
            const exactMatch = allTempsForts.some(t => t.toLowerCase() === q);
            return (
              <div className="space-y-1.5">
                <input value={newTempsFort} onChange={e => setNewTempsFort(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newTempsFort.trim()) {
                      e.preventDefault();
                      setTempsFort(arr => [...arr, newTempsFort.trim()]);
                      setNewTempsFort("");
                    }
                  }}
                  placeholder="Rechercher ou + nouveau temps fort..."
                  className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(t => (
                      <button key={t} type="button" onClick={() => { setTempsFort(arr => [...arr, t]); setNewTempsFort(""); }}
                        className="text-xs px-2.5 py-1 rounded-full bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {newTempsFort.trim() && !exactMatch && (
                  <button type="button" onClick={() => { setTempsFort(arr => [...arr, newTempsFort.trim()]); setNewTempsFort(""); }}
                    className="w-full px-3 py-2 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
                    + Ajouter "{newTempsFort.trim()}"
                  </button>
                )}
              </div>
            );
          })()}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Intention</div>
          <input value={intention} onChange={e => setIntention(e.target.value)} placeholder="Ex: Top52..."
            className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60" />
        </div>
      </div>
      <div className="border border-[#1B2A4A]/15 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setTagsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/40 hover:bg-white/70 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/60 font-semibold">Mots-clés</span>
            {selectedTags.length > 0 && <span className="text-[10px] font-bold bg-[#FF6B35] text-white rounded-full px-1.5 py-0.5">{selectedTags.length}</span>}
          </div>
          <svg className={`w-4 h-4 text-[#1B2A4A]/40 transition-transform ${tagsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {selectedTags.length > 0 && !tagsOpen && (
          <div className="px-4 py-2 bg-white/20 flex flex-wrap gap-1.5 border-t border-[#1B2A4A]/10">
            {selectedTags.map(t => <Tag key={t} active color="orange" onClick={() => setSelectedTags(prev => prev.filter(x => x !== t))}>{t}</Tag>)}
          </div>
        )}
        {tagsOpen && (() => {
          const q = newTagInput.trim().toLowerCase();
          const sortedPlayTags = [...playTags].sort((a, b) => a.localeCompare(b, "fr"));
          const filteredTags = q ? sortedPlayTags.filter(t => t.toLowerCase().includes(q)) : sortedPlayTags;
          const exactExists = q && playTags.some(t => t.toLowerCase() === q);
          return (
          <div className="px-4 py-3 bg-white/20 border-t border-[#1B2A4A]/10 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {filteredTags.map(t => (
                <Tag key={t} active={selectedTags.includes(t)} onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} color="orange">{t}</Tag>
              ))}
              {q && filteredTags.length === 0 && <span className="text-xs text-[#1B2A4A]/40">Aucun mot-clé existant ne correspond.</span>}
            </div>
            <div className="flex gap-2 items-center">
              <input value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                placeholder="Chercher ou créer un mot-clé"
                className="flex-1 text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1.5 focus:outline-none focus:border-[#FF6B35] bg-white/60"
                onKeyDown={e => { if (e.key === "Enter") addTag(newTagInput); }} />
              {q && (exactExists
                ? <span className="text-xs text-[#1B2A4A]/40 whitespace-nowrap">Existe déjà, clique dessus ↑</span>
                : <button type="button" onClick={() => addTag(newTagInput)} className="text-xs px-3 py-1.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded-full font-medium hover:bg-[#FF6B35]/20 whitespace-nowrap">+ Créer "{newTagInput.trim()}"</button>
              )}
            </div>
          </div>
          );
        })()}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50">Images ({images.length})</div>
        </div>
        <input ref={cropInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCropFile(e.target.files?.[0])} />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button type="button" onClick={() => { setCropCount(0); cropInputRef.current.click(); }}
            className="border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-5 flex flex-col items-center gap-1.5 text-[#1B2A4A]/40 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <ImageIcon size={20} /><span className="text-xs text-center">Rogner depuis une photo</span>
          </button>
          <button type="button" onClick={addImage}
            className="border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-5 flex flex-col items-center gap-1.5 text-[#1B2A4A]/40 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
            <Plus size={20} /><span className="text-xs text-center">Ajouter une image</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {images.map(img => (
            <PlayImageSlot key={img.id} img={img} playId={initial?.id} onChange={updated => updateImage(img.id, updated)} onRemove={() => removeImage(img.id)} />
          ))}
        </div>
      </div>

      {cropSource && (
        <CropPhotoView
          imageData={cropSource}
          multiMode={true}
          cropCount={cropCount}
          courtType={courtType}
          onCrop={handleCropResult}
          onCancel={() => { setCropSource(null); setCropCount(0); }}
        />
      )}
      <div>
        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-2">Schémas tactiques</div>
        {schemas.length > 0 && editingSchemaIdx === null && (
          <div className="flex gap-2 flex-wrap mb-2">
            {schemas.map((dataUrl, i) => (
              <div key={i} className="relative group">
                <img src={dataUrl} className="w-28 h-20 object-cover rounded-lg border border-[#1B2A4A]/15 cursor-pointer" onClick={() => setEditingSchemaIdx(i)} />
                <button type="button" onClick={() => setSchemas(s => s.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            ))}
          </div>
        )}
        {editingSchemaIdx !== null && (
          <DrawTacticalView
            courtType={courtType}
            referencePhotoOptions={[
              ...(editingSchemaIdx > 0 && editingSchemaIdx <= schemas.length ? [{ label: "Vignette précédente", src: schemas[editingSchemaIdx - 1] }] : []),
              ...images.filter(img => img.file?.data || img.data).map((img, i) => ({ label: `Photo ${i + 1}`, src: img.file?.data || img.data })),
              ...schemas.map((s, i) => ({ label: `Vignette ${i + 1}`, src: s })).filter((_, i) => i !== editingSchemaIdx && i !== editingSchemaIdx - 1),
            ]}
            initialImage={editingSchemaIdx < schemas.length ? schemas[editingSchemaIdx] : null}
            previousSchemaGhost={editingSchemaIdx === schemas.length && schemas.length > 0 ? schemas[schemas.length - 1] : null}
            allSchemas={schemas}
            currentSchemaIdx={editingSchemaIdx}
            onCancel={() => setEditingSchemaIdx(null)}
            onValidate={(dataUrl) => {
              if (editingSchemaIdx < schemas.length) {
                setSchemas(s => s.map((x, i) => i === editingSchemaIdx ? dataUrl : x));
              } else {
                setSchemas(s => [...s, dataUrl]);
              }
              setEditingSchemaIdx(null);
            }}
          />
        )}
        {editingSchemaIdx === null && (
          <button type="button"
            onClick={() => setEditingSchemaIdx(schemas.length)}
            className="w-full py-2 rounded-lg text-xs font-semibold border-2 border-dashed border-[#FF6B35]/40 text-[#FF6B35] hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-colors">
            + Ajouter un schéma tactique
          </button>
        )}
      </div>
      <div className="relative">
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description du système de jeu..." rows={3}
          className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 pr-9 text-sm bg-white/60" />
        <div className="absolute right-1 top-1"><DictateButton onResult={t => setDescription(prev => prev ? prev + " " + t : t)} /></div>
      </div>
      <div className="relative">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes, variantes, points clés..." rows={2}
          className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 pr-9 text-sm bg-white/60" />
        <div className="absolute right-1 top-1"><DictateButton onResult={t => setNotes(prev => prev ? prev + " " + t : t)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A]">Annuler</button>
        <button onClick={async () => {
          if (!titre.trim()) { cpbAlert?.("Donne un titre au play."); return; }
          if (editingSchemaIdx !== null) {
            const ok = await cpbAlert?.("Un schéma est en cours de dessin et n'a pas été validé (bouton \"Utiliser ce schéma\") — il sera perdu si tu enregistres maintenant. Continuer sans le sauvegarder ?", { confirm: true });
            if (!ok) return;
          }
          onSave({ ...(initial || {}), id: initial?.id || uid(), titre, type, scoutedTeam: scoutedTeam.trim(), tempsFort, intention: intention.trim(), description, notes, tags: selectedTags, images, schemas, createdAt: initial?.createdAt || new Date().toISOString() });
        }} className="px-5 py-2 text-sm font-medium rounded-md bg-[#FF6B35] text-white hover:bg-[#e85a28]">Enregistrer</button>
      </div>
    </div>
  );
}

const ONBOARDING_STEPS = [
  {
    icon: "🏀",
    title: "Bienvenue sur\nCoaching Pro Boost",
    desc: "Votre assistant d'entraînement basket. Retrouvez tous vos outils de coach en un seul endroit, sur iOS et Android.",
    color: "#1B2A4A",
  },
  {
    icon: "📚",
    title: "Bibliothèque d'exercices",
    desc: "Créez, filtrez et organisez vos exercices par thème, format ou niveau. Ajoutez des photos, des schémas tactiques et des notes.",
    color: "#FF6B35",
  },
  {
    icon: "📋",
    title: "Séances",
    desc: "Composez vos séances en glissant des exercices depuis la bibliothèque. Exportez en PDF pour l'imprimer ou le partager.",
    color: "#1B2A4A",
  },
  {
    icon: "♟️",
    title: "Play Book",
    desc: "Dessinez vos systèmes offensifs et défensifs sur un terrain interactif. Placez les joueurs, tracez les déplacements et les passes.",
    color: "#FF6B35",
  },
  {
    icon: "✏️",
    title: "Dessiner une fiche",
    desc: "Annotez vos gabarits personnalisés avec votre doigt ou un stylet. Texte, schémas, pictogrammes d'équipement — tout y est.",
    color: "#1B2A4A",
  },
  {
    icon: "🚀",
    title: "Tout est prêt !",
    desc: "Commencez par créer votre première équipe et votre premier exercice. Bonne saison !",
    color: "#FF6B35",
  },
];

function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const next = () => { if (isLast) onDone(); else setStep(step + 1); };
  const skip = () => onDone();

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="bg-[#F2EDE4] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* top color bar */}
        <div className="h-2" style={{ background: s.color }} />

        {/* content */}
        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <div className="text-6xl mb-6 leading-none select-none">{s.icon}</div>
          <h2 className="font-bold text-[#1B2A4A] text-xl mb-3 leading-snug whitespace-pre-line" style={{ fontFamily: "Oswald, sans-serif" }}>
            {s.title}
          </h2>
          <p className="text-[#1B2A4A]/70 text-sm leading-relaxed">{s.desc}</p>
        </div>

        {/* dots */}
        <div className="flex justify-center gap-1.5 pb-6">
          {ONBOARDING_STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{ width: i === step ? 20 : 8, height: 8, background: i === step ? s.color : "#1B2A4A22" }}
            />
          ))}
        </div>

        {/* buttons */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button onClick={next}
            className="w-full py-3 rounded-2xl text-white font-semibold text-sm transition-opacity active:opacity-80"
            style={{ background: s.color }}>
            {isLast ? "C'est parti !" : "Suivant"}
          </button>
          {!isLast && (
            <button onClick={skip} className="text-xs text-[#1B2A4A]/40 hover:text-[#1B2A4A]/60 py-1">
              Passer l'introduction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const TOUR_STEPS = [
  {
    tourId: "add-exercise",
    title: "① Créer un exercice",
    text: "Appuie sur ce bouton orange pour créer ton premier exercice : titre, thèmes, durée, objectif...",
    navigateTo: "library",
    openForm: false,
  },
  {
    tourId: "exercise-photo",
    title: "② Ajouter une photo",
    text: "Dans la fiche exercice, appuie ici pour importer une photo ou un PDF depuis ta pellicule. Tu pourras rogner l'image après l'import.",
    navigateTo: "library",
    openForm: true,
  },
  {
    tourId: "new-session",
    title: "③ Créer une séance",
    text: "Dans l'onglet Séances, crée une nouvelle séance et ajoute-y tes exercices depuis la bibliothèque.",
    navigateTo: "sessions",
    openForm: false,
  },
  {
    tourId: "session-draw",
    title: "④ Dessiner une fiche",
    text: "Ce bouton ouvre l'éditeur de dessin. Sélectionne un gabarit et annote-le au stylo Apple Pencil.",
    navigateTo: "sessions",
    openForm: false,
  },
];

function GuidedTour({ onDone, onNavigate, onOpenForm, onCloseForm }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const s = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const findTarget = useCallback((tourId) => {
    const el = document.querySelector(`[data-tour="${tourId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
      }, 250);
    } else {
      setTimeout(() => {
        const el2 = document.querySelector(`[data-tour="${tourId}"]`);
        if (el2) { const r = el2.getBoundingClientRect(); setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }); }
      }, 600);
    }
  }, []);

  useEffect(() => {
    setRect(null);
    onNavigate(s.navigateTo);
    if (s.openForm) { onOpenForm(); } else { onCloseForm(); }
    setTimeout(() => findTarget(s.tourId), 350);
  }, [step]);

  const next = () => { if (isLast) onDone(); else setStep(step + 1); };

  const ww = typeof window !== "undefined" ? window.innerWidth : 400;
  const wh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 10;

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[490] bg-black/55 flex items-end justify-center pb-24 pointer-events-none">
        <div className="bg-white rounded-2xl px-6 py-4 text-sm text-[#1B2A4A]/50 shadow-xl pointer-events-auto">
          Préparation de l'étape…
        </div>
      </div>
    );
  }

  const { top, left, bottom, right, width, height } = rect;
  const bubbleAbove = bottom > wh * 0.55;
  const bubbleMidX = Math.min(Math.max(left + width / 2, 150), ww - 150);
  const bubbleW = Math.min(300, ww - 32);
  const bubbleLeft = Math.max(16, Math.min(bubbleMidX - bubbleW / 2, ww - bubbleW - 16));
  const arrowPercent = Math.min(Math.max(((bubbleMidX - bubbleLeft) / bubbleW) * 100, 15), 85);

  return (
    <div className="fixed inset-0 z-[490]" style={{ pointerEvents: "none" }}>
      {/* 4 overlay quadrants */}
      {[
        { style: { top: 0, left: 0, right: 0, height: Math.max(0, top - pad) } },
        { style: { top: bottom + pad, left: 0, right: 0, bottom: 0 } },
        { style: { top: top - pad, left: 0, width: Math.max(0, left - pad), height: height + 2 * pad } },
        { style: { top: top - pad, left: right + pad, right: 0, height: height + 2 * pad } },
      ].map((q, i) => (
        <div key={i} style={{ position: "fixed", background: "rgba(0,0,0,0.62)", pointerEvents: "auto", ...q.style }} onClick={next} />
      ))}

      {/* Highlight ring */}
      <div style={{
        position: "fixed", top: top - pad, left: left - pad,
        width: width + 2 * pad, height: height + 2 * pad,
        border: "2.5px solid #FF6B35", borderRadius: 14,
        boxShadow: "0 0 0 4px rgba(255,107,53,0.2)",
        pointerEvents: "none",
      }} />

      {/* Bubble */}
      <div style={{
        position: "fixed",
        ...(bubbleAbove ? { bottom: wh - top + pad + 14 } : { top: bottom + pad + 14 }),
        left: bubbleLeft,
        width: bubbleW,
        background: "white",
        borderRadius: 20,
        padding: "18px 20px 14px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        zIndex: 491,
        pointerEvents: "auto",
      }}>
        {/* Arrow */}
        <div style={{
          position: "absolute",
          [bubbleAbove ? "bottom" : "top"]: -8,
          left: `${arrowPercent}%`,
          transform: "translateX(-50%) rotate(45deg)",
          width: 16, height: 16,
          background: "white",
          borderRadius: 3,
          boxShadow: bubbleAbove ? "3px 3px 6px rgba(0,0,0,0.12)" : "-3px -3px 6px rgba(0,0,0,0.08)",
        }} />

        <h3 className="font-bold text-[#1B2A4A] text-sm mb-1.5" style={{ fontFamily: "Oswald, sans-serif" }}>{s.title}</h3>
        <p className="text-sm text-[#1B2A4A]/70 leading-relaxed mb-4">{s.text}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-200" style={{
                width: i === step ? 18 : 7, height: 7,
                background: i === step ? "#FF6B35" : "#1B2A4A22",
              }} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={onDone} className="text-xs text-[#1B2A4A]/35 hover:text-[#1B2A4A]/60 py-1">Terminer</button>
            <button onClick={next}
              className="px-4 py-2 text-white text-sm font-semibold rounded-xl active:opacity-80"
              style={{ background: "#FF6B35" }}>
              {isLast ? "C'est compris !" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-5 z-[500] w-11 h-11 rounded-full bg-[#1B2A4A] text-white shadow-lg flex items-center justify-center hover:bg-[#FF6B35] transition-colors no-print"
      aria-label="Remonter en haut">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
  );
}

// Miniature d'un item (exercice ou play) pour l'organisateur de séance.
function organizerThumb(item, exercises, plays) {
  if (item.type === "note") return null;
  if (item.type === "exercise") {
    const ex = exercises.find(e => e.id === item.id);
    if (!ex) return null;
    if (ex.file?.data && ex.file?.type?.startsWith("image/")) return ex.file.data;
    if (ex.schemas?.[0]) return ex.schemas[0];
    return null;
  }
  const play = plays.find(p => p.id === item.id);
  if (!play) return null;
  if (play.schemas?.[0]) return play.schemas[0];
  const img = (play.images || []).find(i => i.file?.data || i.data);
  return img ? (img.file?.data || img.data) : null;
}

function SessionOrganizerModal({ session, exercises, plays, onClose, onDownload, onUpdateSession, onBuildPreview }) {
  const [order, setOrder] = useState(() => getSessionOrder(session));
  const [textScale, setTextScale] = useState(session.printTextScale || 1);
  const [imageScale, setImageScale] = useState(session.printImageScale || 1);
  const [dragIdx, setDragIdx] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);

  const move = (from, to) => {
    if (to < 0 || to >= order.length) return;
    setOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const label = (item) => {
    if (item.type === "exercise") return exercises.find(e => e.id === item.id)?.titre || "Exercice";
    if (item.type === "note") return (session.notes || []).find(n => n.id === item.id)?.titre || "Bloc texte";
    return plays.find(p => p.id === item.id)?.titre || "Play";
  };

  // Aperçu live : régénéré (avec un léger délai) à chaque changement d'ordre ou de taille,
  // pour que Thibaud voie immédiatement l'effet des curseurs avant de télécharger.
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      const draft = { ...session, itemOrder: order, printTextScale: textScale, printImageScale: imageScale };
      const html = await onBuildPreview(draft, { textScale, imageScale });
      if (!cancelled) { setPreviewHtml(html); setPreviewLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [order, textScale, imageScale]);

  const handleConfirm = async () => {
    setDownloading(true);
    const updated = { ...session, itemOrder: order, printTextScale: textScale, printImageScale: imageScale };
    onUpdateSession(updated);
    await onDownload(updated, { textScale, imageScale });
    setDownloading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[#1B2A4A]/10 flex items-center justify-between flex-shrink-0">
          <h3 className="font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>APERÇU DE LA SÉANCE</h3>
          <button onClick={onClose} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A] p-1"><X size={20} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="px-5 py-4 md:h-full md:overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r border-[#1B2A4A]/10">
          <p className="text-xs text-[#1B2A4A]/50">Glisse-dépose une carte pour réorganiser, ou utilise les flèches. L'aperçu à droite se met à jour automatiquement.</p>

          <div className="space-y-2">
            {order.length === 0 && <p className="text-sm text-[#1B2A4A]/40 text-center py-6">Aucun exercice ni play dans cette séance.</p>}
            {order.map((item, i) => {
              const thumb = organizerThumb(item, exercises, plays);
              return (
                <div key={`${item.type}:${item.id}`}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) move(dragIdx, i); setDragIdx(null); }}
                  onDragEnd={() => setDragIdx(null)}
                  className="flex items-center gap-2.5 border border-[#1B2A4A]/15 rounded-xl bg-white p-2 cursor-grab active:cursor-grabbing">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F2EDE4] flex items-center justify-center flex-shrink-0 border border-[#1B2A4A]/10">
                    {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-[#1B2A4A]/30">{item.type === "exercise" ? "EX" : item.type === "note" ? "TXT" : "PL"}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1B2A4A] truncate">{label(item)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40">{item.type === "exercise" ? "Exercice" : item.type === "note" ? "Bloc texte" : "Play"}</div>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => move(i, i - 1)} disabled={i === 0} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg></button>
                    <button onClick={() => move(i, i + 1)} disabled={i === order.length - 1} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#1B2A4A]/10 pt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-[#1B2A4A]/60 mb-1">
                <span>Taille du texte</span><span>{Math.round(textScale * 100)}%</span>
              </div>
              <input type="range" min="0.8" max="1.4" step="0.05" value={textScale} onChange={e => setTextScale(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[#1B2A4A]/60 mb-1">
                <span>Taille des images</span><span>{Math.round(imageScale * 100)}%</span>
              </div>
              <input type="range" min="0.5" max="1" step="0.05" value={imageScale} onChange={e => setImageScale(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
          </div>

          <div className="relative bg-[#F2EDE4] min-h-[300px] md:min-h-0 md:h-full">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#F2EDE4]/80 text-sm text-[#1B2A4A]/50 z-10">Mise à jour de l'aperçu...</div>
            )}
            {previewHtml ? (
              <iframe title="Aperçu de la séance" srcDoc={previewHtml} className="w-full h-full min-h-[300px] border-0" />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-[#1B2A4A]/40">Génération de l'aperçu...</div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#1B2A4A]/10 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-[#1B2A4A]/20 text-[#1B2A4A] py-2.5 rounded-xl text-sm font-medium hover:bg-[#1B2A4A]/5">Annuler</button>
          <button onClick={handleConfirm} disabled={downloading}
            className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>
            {downloading ? "Génération..." : "Imprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementAdminPanel({ currentMessage, onPublish, onDeactivate, cpbAlert }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!message.trim()) { cpbAlert?.("Écris un message avant de publier."); return; }
    setBusy(true);
    try { await onPublish(message.trim()); setMessage(""); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white/70 border border-[#1B2A4A]/15 rounded-2xl p-4 mb-4">
      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-2">Annonce à tous les utilisateurs (admin)</div>
      {currentMessage && (
        <div className="flex items-start justify-between gap-2 bg-[#1B2A4A]/5 rounded-lg px-3 py-2 mb-2">
          <span className="text-xs text-[#1B2A4A]/70">Actuellement affichée : « {currentMessage} »</span>
          <button onClick={() => onDeactivate()} className="text-xs text-red-500 hover:underline flex-shrink-0">Retirer</button>
        </div>
      )}
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Nouveau message à afficher à tous les utilisateurs..." rows={2}
        className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/60 mb-2" />
      <button onClick={publish} disabled={busy}
        className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>
        {busy ? "Publication..." : "Publier"}
      </button>
    </div>
  );
}

function CoachingProBoost({ session }) {
  const { isPremium, sport, setSport } = useSubscription(session?.user?.id);
  const { announcement, dismiss: dismissAnnouncement, isAdmin, canManageWellness, canUseMatchmode, publish: publishAnnouncement, deactivate: deactivateAnnouncement } = useAnnouncement(session?.user?.id);
  const { exercises, sessions, themes, formats, playTypes, teams, activeTeamId, players, individualSessions, matchSessions, videoScoutSessions, teamAnalyses, plays, playTags, clubLogo, saveExercises, saveSessions, saveThemes, saveFormats, savePlayTypes, saveTeams, saveActiveTeamId, savePlayers, saveIndividualSessions, saveMatchSessions, saveVideoScoutSessions, saveTeamAnalyses, savePlays, savePlayTags, saveClubLogo, loaded, loadError, matchSyncPending, persist } = useStore(sport);
  const sportConfig = SPORTS_CONFIG[sport] || SPORTS_CONFIG.basketball;
  const SPORT_PHASES = sportConfig.phases;
  const SPORT_FORMATS = formats;
  const SPORT_CATEGORIES = sportConfig.categories;
  const SPORT_COURT = sportConfig.court;
  const SPORT_COLOR = sportConfig.color;
  const cpbAlert = useAlert();
  const [paywallReason, setPaywallReason] = useState(null);
  const toast = useToast();

  // Répare le catalogue playTags s'il est vide/désynchronisé alors que des plays ont des tags
  // (ex: après une restauration qui ne couvrait pas cette clé).
  useEffect(() => {
    if (!loaded) return;
    const used = [...new Set(plays.flatMap(p => p.tags || []))];
    const missing = used.filter(t => !playTags.includes(t));
    if (missing.length > 0) savePlayTags([...playTags, ...missing]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, plays]);
  const [premiumSuccess, setPremiumSuccess] = useState(() => {
    const p = new URLSearchParams(window.location.search).get("premium");
    if (p === "success") { window.history.replaceState({}, "", "/"); return true; }
    return false;
  });

  // Sync premium au retour du paiement — appel direct à Stripe via /api/sync-premium
  useEffect(() => {
    if (!premiumSuccess) return;
    const userId = session?.user?.id;
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch("/api/sync-premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.isPremium) window.location.reload();
        else {
          // Webhook peut avoir du retard — retry toutes les 3s pendant 30s
          let attempts = 0;
          const interval = setInterval(async () => {
            attempts++;
            const r2 = await fetch("/api/sync-premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
            const d2 = await r2.json();
            if (d2.isPremium || attempts >= 10) { clearInterval(interval); if (d2.isPremium) window.location.reload(); }
          }, 3000);
        }
      } catch {}
    })();
  }, [premiumSuccess, session?.user?.id]);
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
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem("cpb_view");
    return ["library","sessions","stats","playbook","account","suivi","matchmode","videoscout","myteam","wellness"].includes(saved) ? saved : "library";
  });
  // Toujours à jour, contrairement à `view` capturé dans la closure de l'effet ci-dessous
  // (qui ne tourne qu'une fois au montage) — évite qu'un retour arrière égaré (ex: swipe
  // iPad accidentel pendant un rognage) ne renvoie vers l'onglet du tout premier chargement.
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const setViewPersist = (v) => {
    setView(v);
    localStorage.setItem("cpb_view", v);
    history.pushState({ view: v }, "", "#" + v);
  };

  useEffect(() => {
    // Initialise l'état history sans redirection
    if (!history.state?.view) history.replaceState({ view }, "", "#" + view);
    const onPop = (e) => {
      const v = e.state?.view;
      if (v === "session" && activeSessionRef.current) {
        setView("session");
      } else if (v && ["library","sessions","stats","playbook","account","suivi","matchmode","videoscout","myteam","wellness"].includes(v)) {
        setView(v);
        localStorage.setItem("cpb_view", v);
      } else if (activeSessionRef.current) {
        // Retour arrière sans état connu pendant qu'une séance est ouverte (ex: rognage
        // en cours) → on reste sur la séance plutôt que de sauter vers un autre onglet.
        setView("session");
        history.pushState({ view: "session" }, "", "#session");
      } else {
        // Pas d'état connu → repousse une entrée pour éviter de quitter
        history.pushState({ view: viewRef.current }, "", "#" + viewRef.current);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTarget, setQuickAddTarget] = useState(null); // "exercise" | "play" | "session"
  const quickAddCameraRef = useRef();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [autoOpenDrawForNew, setAutoOpenDrawForNew] = useState(false);
  const [sharedExercise, setSharedExercise] = useState(null);
  const [sharedExerciseCollection, setSharedExerciseCollection] = useState(null);
  const [sharedSession, setSharedSession] = useState(null);
  const [sharedPlay, setSharedPlay] = useState(null);
  const [sharedPlayCollection, setSharedPlayCollection] = useState(null);
  const [showHistoryRestore, setShowHistoryRestore] = useState(false);

  const restoreAt = async (before, label) => {
    const confirmed = await cpbAlert(
      `Restaurer tes données à leur état ${label} ? Cela remplacera tes exercices, séances, thèmes, équipes et plays actuels.`,
      { confirm: true }
    );
    if (!confirmed) return;
    let restoredAny = false;
    const apply = async (key, applyFn, isExercises) => {
      const snap = await storage.getHistorySnapshot(key, before);
      if (!snap) return;
      let parsed = JSON.parse(snap.value);
      if (isExercises) {
        // Les exercices sont stockés sans le champ `file` (juste hasFile/fileName/fileType) ;
        // useFileImage exige `ex.file` pour déclencher le chargement lazy depuis file:{id}.
        parsed = parsed.map(e => e.hasFile ? { ...e, file: { name: e.fileName, type: e.fileType, data: null } } : e);
      }
      applyFn(parsed);
      restoredAny = true;
    };
    try {
      // Clés scopées par sport (voir useStore) — l'historique suit désormais la même clé que
      // le stockage courant, pour rester cohérent après le correctif de séparation multi-sport.
      await apply(`exercises:${sport}`, saveExercises, true);
      await apply(`sessions:${sport}`, saveSessions);
      await apply(`themes:${sport}`, saveThemes);
      await apply("teams", saveTeams);
      await apply(`plays:${sport}`, savePlays);
    } catch (e) { await cpbAlert("Erreur lors de la restauration : " + e.message); return; }
    setShowHistoryRestore(false);
    await cpbAlert(restoredAny ? "✓ Données restaurées !" : "Aucun historique disponible pour cette période (moins de 3 jours conservés).");
  };
  const restoreFromHistory = (hoursAgo) => restoreAt(
    new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    `d'il y a ${hoursAgo < 24 ? hoursAgo + "h" : Math.round(hoursAgo / 24) + " jour(s)"}`
  );
  const [customRestoreDate, setCustomRestoreDate] = useState("");
  const restoreAtCustomDate = () => {
    if (!customRestoreDate) return;
    const d = new Date(customRestoreDate);
    if (isNaN(d)) return;
    restoreAt(d, `du ${d.toLocaleString("fr-FR")}`);
  };

  // Fix dictée vocale iOS : les événements compositionend ne déclenchent pas onChange dans React
  useEffect(() => {
    const onCompositionEnd = (e) => {
      const el = e.target;
      if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
      const nativeDescriptor =
        el.tagName === "TEXTAREA"
          ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")
          : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (!nativeDescriptor) return;
      nativeDescriptor.set.call(el, el.value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    document.addEventListener("compositionend", onCompositionEnd);
    return () => document.removeEventListener("compositionend", onCompositionEnd);
  }, []);

  // Détection lien scouting ?scoutingtoken=TOKEN
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("scoutingtoken");
    if (!token) return;
    window.history.replaceState({}, "", "/");
    supabase.from("shared_play_collections").select("title, plays, expires_at").eq("token", token).maybeSingle()
      .then(({ data }) => {
        if (!data) { cpbAlert("Ce lien de scouting est invalide ou a expiré."); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { cpbAlert("Ce lien de scouting a expiré."); return; }
        setSharedPlayCollection(data);
      });
  }, []);

  // Détection lien de partage play ?shareplay=TOKEN
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("shareplay");
    if (!token) return;
    window.history.replaceState({}, "", "/");
    supabase.from("shared_plays").select("play_data, expires_at").eq("token", token).maybeSingle()
      .then(({ data }) => {
        if (!data) { cpbAlert("Ce lien de partage est invalide ou a expiré."); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { cpbAlert("Ce lien de partage a expiré."); return; }
        setSharedPlay(data.play_data);
      });
  }, []);

  // Détection lien de partage ?share=TOKEN
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("share");
    if (!token) return;
    window.history.replaceState({}, "", "/");
    supabase.from("shared_exercises").select("exercise_data, expires_at").eq("token", token).maybeSingle()
      .then(({ data }) => {
        if (!data) { cpbAlert("Ce lien de partage est invalide ou a expiré."); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { cpbAlert("Ce lien de partage a expiré."); return; }
        setSharedExercise(data.exercise_data);
      });
  }, []);

  // Détection lien de partage d'un lot d'exercices ?sharecollection=TOKEN (cahier technique complet)
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("sharecollection");
    if (!token) return;
    window.history.replaceState({}, "", "/");
    supabase.from("shared_exercise_collections").select("title, exercises").eq("token", token).maybeSingle()
      .then(({ data, error }) => {
        if (error) { cpbAlert("Erreur de chargement du lien : " + error.message); return; }
        if (!data) { cpbAlert("Ce lien de partage est invalide ou a expiré."); return; }
        setSharedExerciseCollection(data);
      });
  }, []);

  // Détection lien de partage de séance ?sharesession=TOKEN
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("sharesession");
    if (!token) return;
    window.history.replaceState({}, "", "/");
    supabase.from("shared_sessions").select("session_data, exercises, plays, session_photo, expires_at").eq("token", token).maybeSingle()
      .then(({ data, error }) => {
        if (error) { cpbAlert("Erreur de chargement du lien : " + error.message); return; }
        if (!data) { cpbAlert("Ce lien de partage est invalide ou a expiré."); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { cpbAlert("Ce lien de partage a expiré."); return; }
        setSharedSession(data);
      });
  }, []);

  const sharePlay = async (play) => {
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const playData = { ...play };
      // Charger toutes les images embarquées
      if (play.images?.length) {
        playData.images = await Promise.all(play.images.map(async (img) => {
          if (img.file?.data) return img;
          try {
            const r = await storage.get(`playimg:${play.id}:${img.id}`);
            if (r) { const parsed = JSON.parse(r.value); return { ...img, file: parsed }; }
          } catch {}
          return img;
        }));
      }
      const { error } = await supabase.from("shared_plays").insert({ token, play_data: playData });
      if (error) throw error;
      const link = `${window.location.origin}/app?shareplay=${token}`;
      await copyOrShow(link, "Lien copié ! Valable 30 jours.");
    } catch(e) { await cpbAlert("Erreur lors du partage : " + e.message); }
  };

  const copyOrShow = async (link, successMsg) => {
    try {
      await navigator.clipboard.writeText(link);
      toast?.(successMsg);
    } catch {
      await cpbAlert(`Copie ce lien :\n\n${link}`);
    }
  };

  // Récupère les visuels (schémas + photos, lazy-loadées depuis playimg:{id}:{id}) d'une
  // sélection de plays — utilisé par l'export HTML/PDF ET par la planche en direct dans l'app.
  // On mappe sur selectedIds (pas un .filter sur `plays`) pour respecter l'ordre choisi par le
  // coach (réorganisable dans le bandeau "Mode scouting"), pas l'ordre du Playbook.
  const loadPlaysWithImages = async (selectedIds) => {
    const byId = new Map(plays.map(p => [p.id, p]));
    return Promise.all(
      selectedIds.map(id => byId.get(id)).filter(Boolean).map(async (play) => {
        const images = await Promise.all((play.images || []).map(async (img) => {
          if (img.file?.data) return { ...img, data: img.file.data };
          try {
            const r = await storage.get(`playimg:${play.id}:${img.id}`);
            if (r) { const parsed = JSON.parse(r.value); return { ...img, data: parsed.data || null }; }
          } catch {}
          return { ...img, data: null };
        }));
        const schemaImages = (play.schemas || []).map(s => ({ data: s, annotation: null }));
        return { ...play, _images: [...schemaImages, ...images.filter(i => i.data)] };
      })
    );
  };

  const buildScoutingReportHtml = async (selectedIds, title, { logo } = {}) => {
    const selectedPlaysData = await loadPlaysWithImages(selectedIds);

    const playsHtml = selectedPlaysData.map((play, idx) => {
      // Hauteur fixe + object-fit:contain sur l'image (pas juste width:100%) : sans ça, un
      // demi-terrain, un terrain complet et un schéma avec du texte qui déborde au-dessus du
      // terrain ont chacun une hauteur naturelle différente et se décalent entre eux dans la
      // rangée — même avec une légende de hauteur variable au-dessus.
      // Grille à 3 colonnes fixes (pas flex:1 qui étirait un 4e schéma seul sur sa ligne
      // plus large que les 3 du dessus) : chaque case fait la même largeur, quel que soit
      // le nombre de schémas ou leur position dans la dernière ligne.
      const imgsHtml = play._images.map(img => `
        <div style="display:flex;flex-direction:column;">
          <div style="font-size:10px;color:#888;margin-bottom:3px;font-style:italic;min-height:12px;">${img.annotation || ""}</div>
          <div style="height:180px;background:#f5f5f5;border-radius:6px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${img.data}" style="width:100%;height:100%;object-fit:contain;" />
          </div>
        </div>
      `).join("");

      return `
        <div style="background:#fff;border-radius:10px;padding:18px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);page-break-inside:avoid;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
            <div>
              <div style="font-size:10px;color:#FF6B35;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${play.type || ""}${play.scoutedTeam ? ` · ${play.scoutedTeam}` : ""}</div>
              <div style="font-size:17px;font-weight:800;color:#1B2A4A;font-family:'Oswald',sans-serif;">${play.titre || "Sans titre"}</div>
              ${play.description ? `<div style="font-size:12px;color:#666;margin-top:3px;">${play.description}</div>` : ""}
            </div>
            <div style="background:#1B2A4A;color:#fff;font-size:18px;font-weight:800;font-family:'Oswald',sans-serif;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</div>
          </div>
          ${(play.tags || []).length > 0 ? `
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">
              ${play.tags.map(t => `<span style="font-size:10px;padding:2px 7px;background:rgba(255,107,53,0.12);color:#FF6B35;border-radius:20px;">${t}</span>`).join("")}
            </div>` : ""}
          ${play._images.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;">${imgsHtml}</div>` : ""}
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title || "Scouting Report"}</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#F2EDE4;color:#1B2A4A;padding:20px}
    @media print{body{background:white;padding:0}@page{margin:8mm;size:A4}}
  </style>
</head>
<body>
  <div style="max-width:780px;margin:0 auto;">
    <div style="background:#1B2A4A;color:white;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center;">
      ${logo ? `<img src="${logo}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:white;padding:4px;margin-bottom:8px;" />` : `<div style="font-size:32px;margin-bottom:8px;">🏀</div>`}
      <div style="font-family:'Oswald',sans-serif;font-size:26px;font-weight:800;">${title || "SCOUTING REPORT"}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:5px;">${selectedPlaysData.length} play${selectedPlaysData.length > 1 ? "s" : ""} • Coaching Pro Boost</div>
    </div>
    ${playsHtml}
    <div style="background:#FF6B35;border-radius:12px;padding:20px;text-align:center;margin-top:8px;">
      <div style="color:white;font-family:'Oswald',sans-serif;font-size:18px;font-weight:800;margin-bottom:4px;">Coaching Pro Boost</div>
      <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-bottom:12px;">Crée tes séances, gère ton Play Book, partage tes exercices.</div>
      <div style="background:white;color:#FF6B35;font-family:'Oswald',sans-serif;font-weight:800;font-size:15px;padding:10px 24px;border-radius:8px;display:inline-block;">À partir de 3,33€/mois — Abonnement annuel 39,99€/an</div>
      <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:10px;">coachingproboost.com</div>
    </div>
    <div style="text-align:center;padding:12px;color:#999;font-size:11px;">Généré avec Coaching Pro Boost</div>
  </div>
</body>
</html>`;
    return html;
  };

  // Export classique : télécharge le rapport en fichier .html brut.
  const doExportPlaysHtml = async (selectedIds, title, logo) => {
    const html = await buildScoutingReportHtml(selectedIds, title, { logo });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "scouting").replace(/[^a-z0-9]+/gi, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSelectedPlays([]);
    setScoutingTitle("");
  };

  // Export impression/PDF : ouvre le rapport dans un nouvel onglet et déclenche directement
  // l'impression — en choisissant "Enregistrer au format PDF" comme destination, ça donne un vrai
  // PDF (rendu par le navigateur, fidèle à la mise en page) au lieu d'un fichier .html brut.
  const doExportPlaysPrint = async (selectedIds, title, logo) => {
    const html = await buildScoutingReportHtml(selectedIds, title, { logo });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => { win.focus(); win.print(); });
    } else {
      // Popup bloquée par le navigateur : repli sur le téléchargement du fichier HTML
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "scouting").replace(/[^a-z0-9]+/gi, "_")}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setSelectedPlays([]);
    setScoutingTitle("");
  };

  // Avant chaque export imprimable, une popup dédiée (voir logoExportPrompt plus bas dans le
  // rendu) propose d'ajouter le logo du club : celui déjà enregistré si présent, ou le choix
  // d'en importer un directement à la volée si aucun n'existe encore — dans les deux cas,
  // toujours annulable ("Non merci") sans bloquer l'export.
  const [logoExportPrompt, setLogoExportPrompt] = useState(null); // { selectedIds, title, kind: "html" | "print" | "videoscout", ... }
  const logoExportInputRef = useRef();
  const exportPlaysHtml = (selectedIds, title) => setLogoExportPrompt({ selectedIds, title, kind: "html" });
  const exportPlaysPrint = (selectedIds, title) => setLogoExportPrompt({ selectedIds, title, kind: "print" });
  const exportVideoScoutReport = (session, rows, typeOrder, playIds = []) => setLogoExportPrompt({ session, rows, typeOrder, playIds, kind: "videoscout" });
  const exportPlaybookStats = (stats, title) => setLogoExportPrompt({ stats, title, kind: "playbookstats" });
  const runLogoExportPrompt = (logo) => {
    const p = logoExportPrompt;
    setLogoExportPrompt(null);
    if (!p) return;
    if (p.kind === "html") doExportPlaysHtml(p.selectedIds, p.title, logo);
    else if (p.kind === "print") doExportPlaysPrint(p.selectedIds, p.title, logo);
    else if (p.kind === "playbookstats") {
      const html = buildPlaybookStatsReportHtml(p.stats, p.title, logo);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `stats-playbook-${slugifyForFile(p.title)}.html`);
    }
    else if (p.kind === "myteam") {
      try {
        const html = buildTeamReportHtml(p.analysis, logo);
        downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `analyse-${slugifyForFile(p.analysis.name)}.html`);
        toast?.("✓ Analyse exportée");
      } catch (e) {
        console.error("Export analyse équipe", e);
        cpbAlert?.("L'export a échoué : " + (e?.message || e) + " — envoie-moi ce message pour que je corrige.");
      }
    }
    else if (p.kind === "videoscout") {
      // Une erreur ici ne doit jamais rester silencieuse (c'est ce qui rendait le bouton "muet").
      // Schémas + photos des plays de l'équipe chargés avant de générer le récap.
      (async () => {
        try {
          const teamPlays = await loadPlaysWithImages(p.playIds || []);
          const html = buildVideoScoutReportHtml(p.session, p.rows, p.typeOrder, logo, teamPlays);
          downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `scouting-${slugifyForFile(p.session.opponent)}-${p.session.date || ""}.html`);
          toast?.("✓ Récap exporté");
        } catch (e) {
          console.error("Export scouting vidéo", e);
          cpbAlert?.("L'export a échoué : " + (e?.message || e) + " — envoie-moi ce message pour que je corrige.");
        }
      })();
    }
  };

  const sharePlayCollection = async (selectedIds, title) => {
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const byId = new Map(plays.map(p => [p.id, p]));
      const selectedPlaysData = await Promise.all(
        selectedIds.map(id => byId.get(id)).filter(Boolean).map(async (play) => {
          const playData = { ...play };
          if (play.images?.length) {
            playData.images = await Promise.all(play.images.map(async (img) => {
              if (img.file?.data) return img;
              try {
                const r = await storage.get(`playimg:${play.id}:${img.id}`);
                if (r) { const parsed = JSON.parse(r.value); return { ...img, file: parsed }; }
              } catch {}
              return img;
            }));
          }
          return playData;
        })
      );
      const { error } = await supabase.from("shared_play_collections").insert({
        token, title: title || "Scouting Report", plays: selectedPlaysData
      });
      if (error) throw error;
      const scoutingUrl = `${window.location.origin}/api/scouting?token=${token}`;
      await copyOrShow(scoutingUrl, `Lien scouting copié ! ${selectedIds.length} play${selectedIds.length > 1 ? "s" : ""} partagé${selectedIds.length > 1 ? "s" : ""}.`);
      setSelectedPlays([]);
      setScoutingTitle("");
    } catch(e) { await cpbAlert("Erreur : " + e.message); }
  };

  const shareExercise = async (ex) => {
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const [exData] = await enrichExercisesAssets([ex]);
      const { error } = await supabase.from("shared_exercises").insert({ token, exercise_data: exData });
      if (error) throw error;
      const link = `${window.location.origin}/api/share-exercise?token=${token}`;
      await copyOrShow(link, "Lien copié ! Valable 30 jours.");
    } catch(e) { await cpbAlert("Erreur lors du partage : " + e.message); }
  };

  // Partage d'une séance complète entre deux comptes Premium : snapshot figé au moment du
  // partage (pas de synchro live) — embarque les exercices/plays référencés (enrichis, comme
  // shareExercise/sharePlay) pour que le destinataire puisse tout importer d'un coup même s'il
  // ne les a pas déjà en bibliothèque. teamId/id sont volontairement omis : l'équipe et l'id ne
  // veulent rien dire sur le compte destinataire, régénérés à l'import.
  const shareSession = async (session) => {
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const sessionExercises = session.exerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
      const sessionPlaysList = (session.playIds || []).map(id => plays.find(p => p.id === id)).filter(Boolean);
      const enrichedExercises = await enrichExercisesAssets(sessionExercises);
      const enrichedPlays = await Promise.all(sessionPlaysList.map(async (play) => {
        const playData = { ...play };
        if (play.images?.length) {
          playData.images = await Promise.all(play.images.map(async (img) => {
            if (img.file?.data) return img;
            try {
              const r = await storage.get(`playimg:${play.id}:${img.id}`);
              if (r) { const parsed = JSON.parse(r.value); return { ...img, file: parsed }; }
            } catch {}
            return img;
          }));
        }
        return playData;
      }));
      let sessionPhoto = null;
      try {
        const r = await storage.get(`sessionPhoto:${session.id}`);
        if (r) sessionPhoto = JSON.parse(r.value);
      } catch {}
      const { id, teamId, itemOrder, ...sessionRest } = session;
      const { error } = await supabase.from("shared_sessions").insert({
        token, session_data: sessionRest, exercises: enrichedExercises, plays: enrichedPlays, session_photo: sessionPhoto,
      });
      if (error) throw error;
      const link = `${window.location.origin}/app?sharesession=${token}`;
      await copyOrShow(link, "Lien copié ! Valable 30 jours.");
    } catch(e) { await cpbAlert("Erreur lors du partage : " + e.message); }
  };

  const [editing, setEditing] = useState(null);
  const [filterTheme, setFilterTheme] = useState([]);
  const [filterFormat, setFilterFormat] = useState([]);
  const [filterPhase, setFilterPhase] = useState([]);
  const [filterCategorie, setFilterCategorie] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [playbookForm, setPlaybookForm] = useState(false);
  const [selectedPlays, setSelectedPlays] = useState([]);
  // Réorganisation manuelle de l'ordre des plays sélectionnés (Mode scouting) avant export —
  // sinon l'ordre suivait celui du Playbook au lieu de celui voulu par le coach.
  const [scoutingReorderOpen, setScoutingReorderOpen] = useState(false);
  const [scoutingDragIdx, setScoutingDragIdx] = useState(null);
  const moveSelectedPlay = (from, to) => {
    if (to < 0 || to >= selectedPlays.length) return;
    setSelectedPlays(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  // Planche des systèmes sélectionnés : vue d'ensemble directement dans l'app (sans export HTML)
  // pour vérifier d'un coup d'œil quel système correspond à un découpage vidéo.
  const [playsBoard, setPlaysBoard] = useState(null); // array de plays enrichis (_images) ou null si fermée
  const [playsBoardLoading, setPlaysBoardLoading] = useState(false);
  const [playbookStatsOpen, setPlaybookStatsOpen] = useState(false);
  const openPlaysBoard = async (selectedIds) => {
    setPlaysBoardLoading(true);
    try { setPlaysBoard(await loadPlaysWithImages(selectedIds)); }
    finally { setPlaysBoardLoading(false); }
  };
  const [scoutingTitle, setScoutingTitle] = useState("");
  const [editingPlay, setEditingPlay] = useState(null);
  const [viewingPlay, setViewingPlay] = useState(null);
  const [viewingExercise, setViewingExercise] = useState(null);
  const [filterPlayType, setFilterPlayType] = useState([]);
  const [filterPlayTags, setFilterPlayTags] = useState([]);
  const [filterScoutedTeam, setFilterScoutedTeam] = useState("");
  const [playbookSearch, setPlaybookSearch] = useState("");
  const [playbookTagsOpen, setPlaybookTagsOpen] = useState(false);
  const [playTagSearch, setPlayTagSearch] = useState("");
  // "recent" (défaut, favoris puis date), "type" (regroupe par catégorie), "alpha" (A→Z).
  const [playbookSort, setPlaybookSort] = useState("recent");
  // Gestion de l'ordre des catégories (Type) du Playbook — c'est cet ordre qui détermine le
  // tri "Catégorie" ci-dessus, donc l'ordre d'export quand on choisit ce tri.
  const [playTypesManagerOpen, setPlayTypesManagerOpen] = useState(false);
  const [playTypeDragIdx, setPlayTypeDragIdx] = useState(null);
  const [newPlayTypeInput, setNewPlayTypeInput] = useState("");
  const movePlayType = (from, to) => {
    if (to < 0 || to >= playTypes.length) return;
    const next = [...playTypes];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    savePlayTypes(next);
  };
  // Catalogue des mots-clés reconstruit à partir des tags réellement présents sur les plays
  // (plus fiable que la liste playTags séparée, qui peut se désynchroniser).
  const usedPlayTags = [...new Set(plays.flatMap(p => p.tags || []))].sort();
  const usedTempsForts = [...new Set(plays.flatMap(p => Array.isArray(p.tempsFort) ? p.tempsFort : (p.tempsFort ? [p.tempsFort] : [])))].sort();
  const playTypeRank = (t) => { const i = playTypes.indexOf(t); return i === -1 ? playTypes.length : i; };
  const filteredPlays = plays.filter(p => {
    const q = playbookSearch.trim().toLowerCase();
    return (filterPlayType.length === 0 || filterPlayType.includes(p.type)) &&
      (filterPlayTags.length === 0 || filterPlayTags.every(t => (p.tags || []).includes(t))) &&
      (!filterScoutedTeam || p.scoutedTeam === filterScoutedTeam) &&
      (!q || p.titre?.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)));
  }).sort((a, b) => {
    if (playbookSort === "type") return playTypeRank(a.type) - playTypeRank(b.type) || (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (playbookSort === "alpha") return (a.titre || "").localeCompare(b.titre || "", "fr");
    return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  const [activeSession, setActiveSession] = useState(null);
  const activeSessionRef = useRef(null);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // Autosave toutes les 30 secondes. Ne doit JAMAIS tourner si le chargement initial a
  // échoué (loadError) : exercises/sessions seraient alors des tableaux vides par défaut
  // (pas encore récupérés du serveur), et cet autosave les aurait réécrits par-dessus les
  // vraies données au bout de 30 secondes, sans aucune action de l'utilisateur.
  useEffect(() => {
    if (loadError) return;
    const interval = setInterval(async () => {
      try {
        await Promise.all([
          persist(`exercises:${sport}`, JSON.stringify(exercises.map(({ file, ...rest }) => ({ ...rest, hasFile: !!file, fileName: file?.name, fileType: file?.type })))),
          persist(`sessions:${sport}`, JSON.stringify(sessions)),
        ]);
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [exercises, sessions, sport, loadError]);
  const [newThemeInput, setNewThemeInput] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [repairingVisuals, setRepairingVisuals] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [migratingStorage, setMigratingStorage] = useState(false);
  const [migrateStorageResult, setMigrateStorageResult] = useState(null);
  const [finalizingStorage, setFinalizingStorage] = useState(false);
  const [bookletPickerOpen, setBookletPickerOpen] = useState(false);
  const [canvaExporting, setCanvaExporting] = useState(false);
  const [canvaProgress, setCanvaProgress] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [newPlayerOpen, setNewPlayerOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [confirmDeletePlayerId, setConfirmDeletePlayerId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [indivForm, setIndivForm] = useState(null); // { date, duree, theme, contenu, notes } en cours d'ajout
  const [activeMatchId, setActiveMatchId] = useState(null);
  // Scouting vidéo (voir view === "videoscout" plus bas)
  const [activeVideoScoutId, setActiveVideoScoutId] = useState(null);
  // Analyse de mon équipe (voir view === "myteam" plus bas)
  const [activeTeamAnalysisId, setActiveTeamAnalysisId] = useState(null);
  const [taNewName, setTaNewName] = useState("");
  const [vsTfFilters, setVsTfFilters] = useState([]);
  const [vsTypeFilters, setVsTypeFilters] = useState([]);
  const [vsNewTfInput, setVsNewTfInput] = useState("");
  const [vsPendingMiss, setVsPendingMiss] = useState(null);
  const [vsNewSessionOpen, setVsNewSessionOpen] = useState(false);
  const [vsNewOpponent, setVsNewOpponent] = useState("");
  const [vsNewDate, setVsNewDate] = useState("");
  const [vsNewNote, setVsNewNote] = useState("");
  const [vsNewDefenseInput, setVsNewDefenseInput] = useState("");
  // Saisie rapide "annonce entendue" : on tape le nom du play annoncé (corrigeable avant de
  // valider), PUIS on lui attache des temps forts, PUIS on valide — plutôt que l'inverse
  // (choisir des temps forts pour filtrer une liste existante).
  const [vsAnnounceName, setVsAnnounceName] = useState("");
  const [vsAnnounceTf, setVsAnnounceTf] = useState([]);
  const [vsAnnounceType, setVsAnnounceType] = useState("");
  // Système remonté en haut de la liste (et surligné) après un clic sur une suggestion, pour
  // pouvoir enchaîner tout de suite sur les boutons de score sans avoir à le rechercher.
  const [vsHighlightPlayId, setVsHighlightPlayId] = useState(null);
  // Import XML Sportscode : aperçu avant d'importer { fileName, instances, labels, excluded }
  const [vsImportPreview, setVsImportPreview] = useState(null);
  // Recherche dans les attaques importées (texte libre + libellés cliqués, ex. TOP52, Stagger)
  const [vsAtkQuery, setVsAtkQuery] = useState("");
  const [vsGlobalOpen, setVsGlobalOpen] = useState(false); // vue globale (récap affiché dans l'app)
  const [vsAtkFilters, setVsAtkFilters] = useState([]);
  const [vsAnnounceTfInput, setVsAnnounceTfInput] = useState("");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchDate, setNewMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMatchTime, setNewMatchTime] = useState("");
  const [newMatchChampionnat, setNewMatchChampionnat] = useState("");
  const [newMatchTeamId, setNewMatchTeamId] = useState(null); // null = équipe active par défaut
  const [newMatchTeamHome, setNewMatchTeamHome] = useState(""); // nom de l'équipe qui reçoit
  const [newMatchTeamAway, setNewMatchTeamAway] = useState(""); // nom de l'équipe qui se déplace
  const [newMatchScoutTarget, setNewMatchScoutTarget] = useState(""); // "home" ou "away" : équipe scoutée en direct
  const [tfFilters, setTfFilters] = useState([]);
  const [newTfInput, setNewTfInput] = useState("");
  const [matchTypeFilters, setMatchTypeFilters] = useState([]);
  const [lastMatchAction, setLastMatchAction] = useState(null); // { playId, playTitre, value, prevTally, ts }
  const [pendingMiss, setPendingMiss] = useState(null); // { playId, value } tir manqué (-2/-3) en attente du contexte
  const [matchNotesOpen, setMatchNotesOpen] = useState(false);
  const [wellnessForms, setWellnessForms] = useState([]);
  const [wellnessLoading, setWellnessLoading] = useState(false);
  const [wellnessNewOpen, setWellnessNewOpen] = useState(false);
  const [wellnessNewPlayerIds, setWellnessNewPlayerIds] = useState(null);
  const [wellnessNewTitle, setWellnessNewTitle] = useState("");
  const [wellnessOpenFormId, setWellnessOpenFormId] = useState(null);
  const [wellnessCheckins, setWellnessCheckins] = useState([]);

  useEffect(() => {
    if (view !== "wellness" || !session?.user?.id) return;
    setWellnessLoading(true);
    supabase.from("wellness_forms").select("token, title, created_at").eq("created_by", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setWellnessForms(data || []); setWellnessLoading(false); });
  }, [view, session?.user?.id]);

  useEffect(() => {
    if (!wellnessOpenFormId) { setWellnessCheckins([]); return; }
    supabase.from("wellness_checkins").select("*").eq("token", wellnessOpenFormId)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => setWellnessCheckins(data || []));
  }, [wellnessOpenFormId]);
  const [newPlayOpen, setNewPlayOpen] = useState(false);
  const [favPlayPickerOpen, setFavPlayPickerOpen] = useState(false);
  const [scoresheetAnalyzing, setScoresheetAnalyzing] = useState(false);
  const [qsFormOpen, setQsFormOpen] = useState(false);
  const [qsDraft, setQsDraft] = useState(null); // { quarter, nous:{...}, adverse:{...} } en cours de saisie
  const [scoresheetError, setScoresheetError] = useState(null);
  const [scoresheetDraft, setScoresheetDraft] = useState(null); // résultat IA en cours de vérification, avant enregistrement
  const scoresheetCameraRef = useRef();
  const clubLogoInputRef = useRef();
  const [favPlaySearch, setFavPlaySearch] = useState("");
  const [newPlayName, setNewPlayName] = useState("");
  const [bookletSelection, setBookletSelection] = useState(null); // null = tous sélectionnés (défaut)
  const bookletSelectedIds = bookletSelection ?? exercises.map(e => e.id);
  const toggleBookletExercise = (id) => {
    const current = bookletSelection ?? exercises.map(e => e.id);
    setBookletSelection(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  // Réparation ponctuelle du bug corrigé le 20/07/2026 (stripFiles écrasait hasFile/schemaCount
  // à false/0 pour tous les exercices non touchés à chaque sauvegarde). Les données réelles
  // (file:{id}, schemas:{id}) n'étaient jamais supprimées — on revérifie juste leur présence
  // et on restaure le "pointeur" (hasFile/fileName/fileType/schemaCount) si elles existent.
  const repairMissingVisuals = async () => {
    setRepairingVisuals(true);
    let fixed = 0;
    try {
      const repaired = await Promise.all(exercises.map(async (ex) => {
        let next = ex;
        if (!ex.hasFile) {
          try {
            const r = await storage.get(`file:${ex.id}`);
            if (r) { const parsed = JSON.parse(r.value); next = { ...next, hasFile: true, fileName: parsed.name, fileType: parsed.type }; fixed++; }
          } catch {}
        }
        if (!ex.schemaCount) {
          try {
            const r = await storage.get(`schemas:${ex.id}`);
            const arr = r ? JSON.parse(r.value) : [];
            if (arr?.length) { next = { ...next, schemaCount: arr.length }; fixed++; }
          } catch {}
        }
        return next;
      }));
      await saveExercises(repaired);
      await cpbAlert?.(fixed > 0 ? `✓ Réparation terminée : ${fixed} visuel(s) restauré(s).` : "Aucun visuel manquant trouvé — tout est déjà correct.");
    } catch (e) {
      await cpbAlert?.("Erreur pendant la réparation : " + e.message);
    }
    setRepairingVisuals(false);
  };

  // Supprime les fichiers (photos/schémas d'exercices, photos de plays) qui ne correspondent plus
  // à rien — accumulés avant le correctif du 04/08/2026 qui nettoie désormais à la suppression.
  const cleanupOrphanFiles = async () => {
    const ok = await cpbAlert?.("Supprimer définitivement les fichiers orphelins (photos/schémas d'exercices et de plays supprimés) ? Cette action est irréversible.", { confirm: true });
    if (!ok) return;
    setCleaningOrphans(true);
    let deleted = 0;
    try {
      const exerciseIds = new Set(exercises.map(e => e.id));
      const validPlayImgKeys = new Set();
      plays.forEach(p => (p.images || []).forEach(img => validPlayImgKeys.add(`playimg:${p.id}:${img.id}`)));

      const { keys } = await storage.list();
      for (const key of keys) {
        let orphan = false;
        if (key.startsWith("file:")) orphan = !exerciseIds.has(key.slice("file:".length));
        else if (key.startsWith("schemas:")) orphan = !exerciseIds.has(key.slice("schemas:".length));
        else if (key.startsWith("playimg:")) orphan = !validPlayImgKeys.has(key);
        if (orphan) { await storage.delete(key); deleted++; }
      }
      await cpbAlert?.(deleted > 0 ? `✓ Nettoyage terminé : ${deleted} fichier(s) orphelin(s) supprimé(s).` : "Aucun fichier orphelin trouvé — tout est déjà propre.");
    } catch (e) {
      await cpbAlert?.("Erreur pendant le nettoyage : " + e.message);
    }
    setCleaningOrphans(false);
  };

  // Copie les photos/schémas/images de plays du kv_store vers Supabase Storage — SANS supprimer
  // les anciennes lignes en base (sécurité : on garde les deux le temps de vérifier que tout
  // s'affiche bien). Chaque copie est relue immédiatement pour confirmer qu'elle a bien pris.
  const migrateToStorage = async () => {
    setMigratingStorage(true);
    setMigrateStorageResult(null);
    let migrated = 0, failed = 0;
    try {
      const userId = session.user.id;
      const { data: rows, error } = await supabase.from("kv_store").select("key, value").eq("user_id", userId)
        .or("key.like.file:%,key.like.schemas:%,key.like.playimg:%");
      if (error) throw error;
      for (const row of rows || []) {
        try {
          const path = `${userId}/${row.key}`;
          const blob = new Blob([row.value], { type: "application/json" });
          const { error: upErr } = await supabase.storage.from("media").upload(path, blob, { upsert: true, contentType: "application/json" });
          if (upErr) throw upErr;
          const { data: check, error: checkErr } = await supabase.storage.from("media").download(path);
          if (checkErr || !check) throw new Error("Vérification échouée après upload");
          migrated++;
        } catch (e) {
          failed++;
          console.error("Migration Storage échouée pour", row.key, e);
        }
      }
      setMigrateStorageResult({ migrated, failed, total: (rows || []).length });
      await cpbAlert?.(`Migration terminée : ${migrated} fichier(s) copié(s) vers Storage${failed > 0 ? `, ${failed} échec(s) (laissés en base, rien de perdu)` : ""}.\n\nLes anciennes données restent en base pour l'instant. Vérifie que tes photos/schémas s'affichent bien dans l'app, puis utilise "Finaliser" pour libérer l'espace.`);
    } catch (e) {
      await cpbAlert?.("Erreur pendant la migration : " + e.message);
    }
    setMigratingStorage(false);
  };

  // Supprime les anciennes copies en kv_store — uniquement celles dont on vérifie qu'une copie
  // existe bien dans Storage juste avant de les effacer.
  const finalizeStorageMigration = async () => {
    const ok = await cpbAlert?.("Supprimer définitivement les anciennes copies en base (une fois vérifié que tes photos/schémas s'affichent bien) ? Action irréversible.", { confirm: true });
    if (!ok) return;
    setFinalizingStorage(true);
    let deleted = 0, skipped = 0;
    try {
      const userId = session.user.id;
      const { data: rows, error } = await supabase.from("kv_store").select("key").eq("user_id", userId)
        .or("key.like.file:%,key.like.schemas:%,key.like.playimg:%");
      if (error) throw error;
      for (const row of rows || []) {
        const path = `${userId}/${row.key}`;
        const { data: check } = await supabase.storage.from("media").download(path);
        if (check) {
          await supabase.from("kv_store").delete().eq("user_id", userId).eq("key", row.key);
          deleted++;
        } else {
          skipped++; // pas encore migré : on ne touche pas, par sécurité
        }
      }
      await cpbAlert?.(`✓ Nettoyage terminé : ${deleted} ancienne(s) copie(s) supprimée(s) de la base${skipped > 0 ? `, ${skipped} laissée(s) en base (pas encore migrée(s))` : ""}.`);
    } catch (e) {
      await cpbAlert?.("Erreur pendant la finalisation : " + e.message);
    }
    setFinalizingStorage(false);
  };
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [importing, setImporting] = useState(null); // { status, progress, total } or null
  const [reviewItems, setReviewItems] = useState(null); // array or null
  const importInputRef = useRef();

  const [librarySearch, setLibrarySearch] = useState("");
  const [libSelectMode, setLibSelectMode] = useState(false);
  const [librarySelectedIds, setLibrarySelectedIds] = useState([]);
  const [libShareTitle, setLibShareTitle] = useState("");
  const [libSharing, setLibSharing] = useState(false);
  const filtered = exercises.filter(ex =>
    (filterTheme.length === 0 || filterTheme.every(t => ex.themes?.includes(t))) &&
    (filterFormat.length === 0 || filterFormat.includes(ex.format)) &&
    (filterPhase.length === 0 || filterPhase.every(p => ex.phases?.includes(p))) &&
    (filterCategorie.length === 0 || catList(ex).some(c => filterCategorie.includes(c))) &&
    (!librarySearch.trim() || ex.titre?.toLowerCase().includes(librarySearch.trim().toLowerCase()))
  ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const toggleFilter = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const upsertExercise = (ex) => {
    const { _staySaved, ...clean } = ex;
    const exists = exercises.some(e => e.id === clean.id);
    if (!exists && !isPremium && exercises.length >= FREE_MAX_EXERCISES) {
      setPaywallReason(`La version gratuite est limitée à ${FREE_MAX_EXERCISES} exercices. Passez en Premium pour en créer autant que vous voulez.`);
      return;
    }
    saveExercises(exists ? exercises.map(e => e.id === clean.id ? clean : e) : [...exercises, clean]);
    if (_staySaved) { setEditing(clean); } else { setShowForm(false); setEditing(null); }
  };

  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [viewSessionPhotoFull, setViewSessionPhotoFull] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [addExerciseThemeSearch, setAddExerciseThemeSearch] = useState("");
  const [sessionThemeSearch, setSessionThemeSearch] = useState("");
  const [sessionPlaySearch, setSessionPlaySearch] = useState("");
  const [addExerciseThemeFilter, setAddExerciseThemeFilter] = useState([]);
  const [noteTitre, setNoteTitre] = useState("");
  const [noteDuree, setNoteDuree] = useState(10);
  const [noteTheme, setNoteTheme] = useState("");
  const [viewingSessionExercise, setViewingSessionExercise] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("cpb_onboarded"));
  const [showTour, setShowTour] = useState(false);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const [showInstallBanner, setShowInstallBanner] = useState(() => !isStandalone && !localStorage.getItem("cpb_install_dismissed"));
  const finishOnboarding = () => {
    localStorage.setItem("cpb_onboarded", "1");
    setShowOnboarding(false);
    if (!localStorage.getItem("cpb_tour_done")) setShowTour(true);
  };
  const finishTour = () => { localStorage.setItem("cpb_tour_done", "1"); setShowTour(false); };

  const newSession = (teamId) => {
    if (!isPremium && sessions.length >= FREE_MAX_SESSIONS) {
      setPaywallReason(`La version gratuite est limitée à ${FREE_MAX_SESSIONS} séances. Passez en Premium pour en créer autant que vous voulez.`);
      return;
    }
    // Numérotée par équipe (compte toutes les séances déjà créées pour cette équipe, y compris
    // les anciennes saisons) plutôt qu'un titre générique "Nouvelle séance" à renommer à chaque fois.
    const teamSessionCount = sessions.filter(s => (s.teamId || null) === (teamId || null)).length;
    const s = { id: uid(), titre: `Séance ${teamSessionCount + 1}`, date: new Date().toISOString().slice(0, 10), exerciseIds: [], playIds: [], notes: [], teamId: teamId || null };
    saveSessions([...sessions, s]); setActiveSession(s); setView("session"); history.pushState({ view: "session" }, "", "#session");
  };

  const handleNewSession = () => {
    if (teams.length <= 1) { newSession(teams[0]?.id || null); return; }
    setTeamPickerOpen(true);
  };

  const updateSession = (next) => { saveSessions(sessions.map(s => s.id === next.id ? next : s)); setActiveSession(next); };
  const addToSession = (exId) => {
    if (!activeSession || activeSession.exerciseIds.includes(exId)) return;
    updateSession({ ...activeSession, exerciseIds: [...activeSession.exerciseIds, exId] });
    const ex = exercises.find(e => e.id === exId);
    toast?.(ex?.titre ? `"${ex.titre}" ajouté à la séance` : "Exercice ajouté à la séance");
  };
  const totalDuree = (s) => s.exerciseIds.reduce((sum, id) => sum + (exercises.find(e => e.id === id)?.duree || 0), 0)
    + (s.notes || []).reduce((sum, n) => sum + (n.duree || 0), 0);

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

  // Stats filters (independent from sessions view)
  const [statsTeamFilter, setStatsTeamFilter] = useState("all");
  const [statsSeasonFilter, setStatsSeasonFilter] = useState(null);
  const [statsMonthFilter, setStatsMonthFilter] = useState([]); // liste de mois sélectionnés (plusieurs possibles) ; vide = toute la saison
  const [statsCatFilter, setStatsCatFilter] = useState([]);

  const statsBaseSessions = statsTeamFilter === "all" ? sessions : sessions.filter(s => s.teamId === statsTeamFilter);
  const statsSeasons = [...new Set(statsBaseSessions.map(s => getSeason(s.date)))].sort().reverse();
  const statsActiveSeason = statsSeasonFilter && statsSeasons.includes(statsSeasonFilter) ? statsSeasonFilter : statsSeasons[0];
  const statsSeasonSessions = statsActiveSeason ? statsBaseSessions.filter(s => getSeason(s.date) === statsActiveSeason) : statsBaseSessions;
  const statsMonthGroups = [...statsSeasonSessions].sort((a, b) => new Date(b.date) - new Date(a.date)).reduce((acc, s) => {
    const d = new Date(s.date);
    const label = isNaN(d) ? "Sans date" : `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    (acc[label] = acc[label] || []).push(s);
    return acc;
  }, {});
  const statsMonthLabels = Object.keys(statsMonthGroups);
  const statsActiveMonths = statsMonthFilter.filter(m => statsMonthLabels.includes(m));
  const statsSessions = statsActiveMonths.length > 0
    ? statsActiveMonths.flatMap(m => statsMonthGroups[m] || [])
    : statsSeasonSessions;
  const statsTotalMin = statsSessions.reduce((sum, s) => sum + totalDuree(s), 0);
  const statsThemeMin = {};
  statsSessions.forEach(s => s.exerciseIds.forEach(id => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    if (statsCatFilter.length > 0 && !catList(ex).some(c => statsCatFilter.includes(c))) return;
    (ex.themes || []).forEach(t => { statsThemeMin[t] = (statsThemeMin[t] || 0) + (ex.duree || 0); });
  }));
  // Blocs texte (hors bibliothèque) : comptés dans les stats par thème comme demandé,
  // mais pas de catégorie à filtrer dessus donc ignorés si un filtre catégorie est actif.
  statsSessions.forEach(s => (s.notes || []).forEach(n => {
    if (statsCatFilter.length > 0 || !n.theme) return;
    statsThemeMin[n.theme] = (statsThemeMin[n.theme] || 0) + (n.duree || 0);
  }));
  const statsThemeRows = Object.entries(statsThemeMin).sort((a, b) => b[1] - a[1]);
  const statsAvgMin = statsSessions.length ? Math.round(statsTotalMin / statsSessions.length) : 0;
  const statsExCount = statsSessions.reduce((sum, s) => sum + s.exerciseIds.length, 0);

  const [drawProcessing, setDrawProcessing] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropContext, setCropContext] = useState("library"); // "library" | "session"
  const [quickCropData, setQuickCropData] = useState(null);
  const [currentSessionPhoto, setCurrentSessionPhoto] = useState(null);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [showSessionOrganizer, setShowSessionOrganizer] = useState(false);
  const [pendingPerspectivePhoto, setPendingPerspectivePhoto] = useState(null);
  const sessionPhotoInputRef = useRef();
  const sessionCameraRef = useRef();

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
    const dataUrl = await readImageAsJpeg(f, 1600, 0.78);
    setPendingPerspectivePhoto(dataUrl);
    e.target.value = "";
  };

  const confirmSessionPhoto = async (dataUrl) => {
    setPendingPerspectivePhoto(null);
    setCurrentSessionPhoto(dataUrl);
    await storage.set(`sessionPhoto:${activeSession.id}`, JSON.stringify(dataUrl));
  };

  // Bandeau du bas : bouton photo central → choix Exercice/Play/Séance → appareil photo →
  // la photo capturée alimente directement le formulaire de création correspondant.
  const handleQuickAddPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    const target = quickAddTarget;
    setQuickAddTarget(null);
    if (!f || !target) return;
    let dataUrl;
    try {
      dataUrl = await readImageAsJpeg(f, 1600, 0.8);
    } catch { cpbAlert?.("Impossible de lire la photo."); return; }
    if (target === "exercise") {
      setEditing({ file: { name: "photo.jpg", type: "image/jpeg", data: dataUrl } });
      setShowForm(true);
      setViewPersist("library");
    } else if (target === "play") {
      setEditingPlay({ images: [{ id: uid(), file: { name: "photo.jpg", type: "image/jpeg", data: dataUrl }, annotation: "" }] });
      setPlaybookForm(true);
      setViewPersist("playbook");
    } else if (target === "session") {
      if (!isPremium && sessions.length >= FREE_MAX_SESSIONS) {
        setPaywallReason(`La version gratuite est limitée à ${FREE_MAX_SESSIONS} séances. Passez en Premium pour en créer autant que vous voulez.`);
        return;
      }
      newSession(null);
      setPendingPerspectivePhoto(dataUrl);
    }
  };

  const deleteSessionPhoto = async () => {
    if (!activeSession) return;
    // Contrairement aux exercices/séances/thèmes, la photo/dessin de séance n'est PAS couverte
    // par la restauration d'historique (exclue volontairement pour éviter de recharger
    // kv_store_history en images, cause de la crise de quota résolue cet été) — une suppression
    // ici est définitive, d'où la confirmation qui manquait.
    const confirmed = await cpbAlert("Supprimer le dessin/la photo de cette séance ? Cette action est définitive (pas récupérable via la restauration d'historique).", { confirm: true });
    if (!confirmed) return;
    setCurrentSessionPhoto(null);
    await storage.delete(`sessionPhoto:${activeSession.id}`);
  };

  const handleCropDone = (dataUrl) => {
    // On se base aussi sur activeSession en filet de sécurité (pas seulement cropContext) :
    // si une séance est ouverte, un exercice rogné doit lui revenir, jamais partir en bibliothèque.
    if (cropContext === "session" || activeSession) {
      setQuickCropData(dataUrl);
      return;
    }
    const ex = {
      id: uid(), titre: "Exercice rogné " + new Date().toLocaleDateString("fr-FR"),
      themes: [], phases: [], format: SPORT_FORMATS[0], niveau: NIVEAUX[1], categorie: "",
      duree: 10, objectif: "", notes: "",
      file: { name: "exercice-rogné.jpg", type: "image/jpeg", data: dataUrl },
    };
    saveExercises([...exercises, ex]);
    setCropImage(null);
    setViewPersist("library");
  };

  const handleQuickCropSave = (titre, duree, selectedThemes, extraThemes = []) => {
    if (extraThemes.length > 0) {
      const newThemes = extraThemes.filter(t => !themes.includes(t));
      if (newThemes.length > 0) saveThemes([...themes, ...newThemes]);
    }
    const ex = {
      id: uid(), titre,
      themes: selectedThemes, phases: [], format: SPORT_FORMATS[0], niveau: NIVEAUX[1], categorie: "",
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
      themes: [], phases: [], format: SPORT_FORMATS[0], niveau: NIVEAUX[1], categorie: "",
      duree: 0, objectif: "", notes: "",
      file: { name: "fiche-dessinee.png", type: "image/png", data: dataUrl },
      createdAt: new Date().toISOString(),
    };
    saveExercises([...exercises, ex]);
    setViewPersist("library");
  };

  const processDrawnSheet = async (dataUrl) => {
    setDrawProcessing(true);
    try {
      const exList = await extractExercisesFromImage(dataUrl, themes);
      const results = exList.map(data => ({ ...data, id: uid(), pageImage: dataUrl, file: { name: "fiche-dessinee.png", type: "image/png", data: dataUrl }, phases: [] }));
      setDrawProcessing(false);
      setViewPersist("sessions");
      setReviewItems(results);
    } catch (e) {
      console.error(e);
      setDrawProcessing(false);
      cpbAlert("L'analyse a échoué — réessaie.");
    }
  };

  const handleImportFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    if (files.some(f => f.type === "application/pdf") && !pdfReady) { cpbAlert("Le lecteur PDF n'est pas encore prêt, réessaie dans une seconde."); return; }
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
      if (pageImages.length === 0) { setImporting(null); cpbAlert("Aucun PDF ou photo valide n'a été trouvé."); return; }
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
      cpbAlert("L'import a échoué — vérifie que les fichiers sont bien lisibles (PDF ou photo).");
    }
  };

  const confirmImport = () => {
    const newExercises = reviewItems.map(({ pageImage, ...ex }) => ex);
    saveExercises([...exercises, ...newExercises]);
    const s = { id: uid(), titre: "Séance importée", date: new Date().toISOString().slice(0, 10), exerciseIds: newExercises.map(e => e.id), teamId: team.id || null };
    saveSessions([...sessions, s]);
    setReviewItems(null);
    setViewPersist("library");
  };

  if (!loaded) return <div className="p-8 text-[#1B2A4A]/50 text-sm">Chargement...</div>;

  // Une partie des données n'a pas pu être récupérée (coupure réseau pendant le chargement,
  // souvent un partage de connexion instable) : on bloque plutôt que d'afficher un catalogue
  // vide qui ressemble à une perte de données — rien n'a été effacé côté serveur, mais
  // continuer ici pourrait écraser le bon état distant avec cet état local incomplet dès la
  // prochaine sauvegarde.
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#F2EDE4" }}>
        <div className="max-w-sm bg-white rounded-xl shadow-lg border border-[#1B2A4A]/10 p-6 text-center">
          <div className="text-3xl mb-3">📡</div>
          <h2 className="font-bold text-[#1B2A4A] mb-2" style={{ fontFamily: "Oswald, sans-serif" }}>Connexion instable</h2>
          <p className="text-sm text-[#1B2A4A]/60 mb-4">Une partie de tes données n'a pas pu être chargée (coupure réseau). Rien n'a été supprimé — mais pour éviter d'écraser tes données par erreur, ne fais aucune modification tant que la connexion n'est pas revenue.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: SPORT_COLOR }}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2EDE4]" style={{ fontFamily: "Inter, sans-serif", "--sport-accent": SPORT_COLOR }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      {announcement && (
        <div className="no-print px-4 py-2.5 flex items-center gap-3 text-sm text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
          <span className="flex-1">📣 {announcement.message}</span>
          <button onClick={dismissAnnouncement} className="flex-shrink-0 text-white/80 hover:text-white text-lg leading-none">✕</button>
        </div>
      )}
      {paywallReason && <PaywallModal reason={paywallReason} onClose={() => setPaywallReason(null)} />}
      {premiumSuccess && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-center">
            <div className="bg-[#FF6B35] px-6 py-8">
              <div className="text-5xl mb-3">🏆</div>
              <div className="text-white font-bold text-2xl" style={{ fontFamily: "Oswald, sans-serif" }}>BIENVENUE EN PREMIUM !</div>
            </div>
            <div className="px-6 py-6">
              <p className="text-[#1B2A4A] text-sm mb-2 font-medium">Ton abonnement est actif.</p>
              <p className="text-[#1B2A4A]/50 text-xs mb-6">Exercices illimités, séances illimitées, Play Book complet — tout est débloqué.</p>
              <button onClick={() => { setPremiumSuccess(false); setViewPersist("account"); }}
                className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Accéder à mon compte
              </button>
            </div>
          </div>
        </div>
      )}
      {sharedExercise && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">🏀</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>EXERCICE PARTAGÉ</div>
              <div className="text-white/60 text-sm mt-1">Un coach partage cet exercice avec toi</div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-[#F2EDE4] rounded-xl p-4 mb-4">
                <div className="font-bold text-[#1B2A4A] mb-1">{sharedExercise.titre}</div>
                <div className="flex flex-wrap gap-2 text-xs text-[#1B2A4A]/60 mb-2">
                  {sharedExercise.duree > 0 && <span>{sharedExercise.duree} min</span>}
                  {sharedExercise.format && <span>{sharedExercise.format}</span>}
                  {sharedExercise.niveau && <span>{sharedExercise.niveau}</span>}
                </div>
                {sharedExercise.themes?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sharedExercise.themes.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">{t}</span>)}
                  </div>
                )}
                {sharedExercise.objectif && <p className="text-xs text-[#1B2A4A]/60 mt-2 italic">{sharedExercise.objectif}</p>}
              </div>
              <button onClick={() => {
                if (!isPremium) { setSharedExercise(null); setPaywallReason("L'import d'un exercice partagé est une fonctionnalité Premium."); return; }
                const newEx = { ...sharedExercise, id: uid(), createdAt: new Date().toISOString() };
                if (newEx.file?.data) {
                  storage.set(`file:${newEx.id}`, JSON.stringify(newEx.file)).catch(() => {});
                  newEx.file = { name: newEx.file.name, type: newEx.file.type, data: null };
                }
                saveExercises([...exercises, newEx]);
                setSharedExercise(null);
                setViewPersist("library");
                toast?.(`"${newEx.titre}" ajouté à ta bibliothèque !`);
              }} className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors mb-3"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                {isPremium ? "Ajouter à ma bibliothèque" : "🔒 Ajouter à ma bibliothèque (Premium)"}
              </button>
              <button onClick={() => setSharedExercise(null)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors">
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}
      {sharedExerciseCollection && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>CAHIER PARTAGÉ</div>
              <div className="text-white/60 text-sm mt-1">{sharedExerciseCollection.exercises.length} exercice{sharedExerciseCollection.exercises.length > 1 ? "s" : ""} à ajouter</div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-[#F2EDE4] rounded-xl p-4 mb-4 max-h-56 overflow-y-auto">
                {sharedExerciseCollection.exercises.map((ex, i) => (
                  <div key={i} className="text-sm text-[#1B2A4A] py-1 border-b border-[#1B2A4A]/10 last:border-0 truncate">{ex.titre}</div>
                ))}
              </div>
              <button onClick={() => {
                if (!isPremium) { setSharedExerciseCollection(null); setPaywallReason("L'import d'un lot d'exercices partagés est une fonctionnalité Premium."); return; }
                const newExs = sharedExerciseCollection.exercises.map(ex => {
                  const newEx = { ...ex, id: uid(), createdAt: new Date().toISOString() };
                  if (newEx.file?.data) {
                    storage.set(`file:${newEx.id}`, JSON.stringify(newEx.file)).catch(() => {});
                    newEx.file = { name: newEx.file.name, type: newEx.file.type, data: null };
                  }
                  return newEx;
                });
                saveExercises([...exercises, ...newExs]);
                setSharedExerciseCollection(null);
                setViewPersist("library");
                toast?.(`${newExs.length} exercice${newExs.length > 1 ? "s" : ""} ajouté${newExs.length > 1 ? "s" : ""} à ta bibliothèque !`);
              }} className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors mb-3"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                {isPremium ? "Tout ajouter à ma bibliothèque" : "🔒 Tout ajouter (Premium)"}
              </button>
              <button onClick={() => setSharedExerciseCollection(null)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors">
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}
      {sharedSession && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">🗓️</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>SÉANCE PARTAGÉE</div>
              <div className="text-white/60 text-sm mt-1">Un coach partage cette séance avec toi</div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-[#F2EDE4] rounded-xl p-4 mb-4">
                <div className="font-bold text-[#1B2A4A] mb-1">{sharedSession.session_data.titre}</div>
                <div className="flex flex-wrap gap-2 text-xs text-[#1B2A4A]/60">
                  <span>{(sharedSession.exercises || []).length} exercice{(sharedSession.exercises || []).length !== 1 ? "s" : ""}</span>
                  {(sharedSession.plays || []).length > 0 && <span>{sharedSession.plays.length} play{sharedSession.plays.length !== 1 ? "s" : ""}</span>}
                  {(sharedSession.session_data.notes || []).length > 0 && <span>{sharedSession.session_data.notes.length} bloc{sharedSession.session_data.notes.length !== 1 ? "s" : ""} texte</span>}
                </div>
              </div>
              <button onClick={() => {
                if (!isPremium) { setSharedSession(null); setPaywallReason("L'import d'une séance partagée est une fonctionnalité Premium."); return; }

                // Dédoublonne par titre (pas d'id commun entre comptes) : réutilise l'exercice/play
                // déjà en bibliothèque plutôt que d'en recréer un doublon si le titre correspond.
                const normTitle = (t) => (t || "").trim().toLowerCase();
                const exIdMap = {};
                const newExercisesToAdd = [];
                (sharedSession.session_data.exerciseIds || []).forEach((oldId, i) => {
                  const exData = sharedSession.exercises[i];
                  if (!exData) return;
                  const existing = exercises.find(e => normTitle(e.titre) === normTitle(exData.titre));
                  if (existing) { exIdMap[oldId] = existing.id; return; }
                  const newEx = { ...exData, id: uid(), createdAt: new Date().toISOString() };
                  if (newEx.file?.data) {
                    storage.set(`file:${newEx.id}`, JSON.stringify(newEx.file)).catch(() => {});
                    newEx.file = { name: newEx.file.name, type: newEx.file.type, data: null };
                  }
                  // schemas laissés tels quels : saveExercises() les persiste et les strippe
                  // automatiquement (voir stripFiles), même pattern que l'import sharedExercise.
                  exIdMap[oldId] = newEx.id;
                  newExercisesToAdd.push(newEx);
                });

                const playIdMap = {};
                const newPlaysToAdd = [];
                (sharedSession.session_data.playIds || []).forEach((oldId, i) => {
                  const playData = sharedSession.plays[i];
                  if (!playData) return;
                  const existing = plays.find(p => normTitle(p.titre) === normTitle(playData.titre));
                  if (existing) { playIdMap[oldId] = existing.id; return; }
                  const newPlay = { ...playData, id: uid(), createdAt: new Date().toISOString() };
                  if (newPlay.images?.length) {
                    newPlay.images = newPlay.images.map(img => {
                      if (!img.file?.data) return img;
                      storage.set(`playimg:${newPlay.id}:${img.id}`, JSON.stringify(img.file)).catch(() => {});
                      return { ...img, hasFile: true, fileName: img.file.name, fileType: img.file.type, file: null };
                    });
                  }
                  playIdMap[oldId] = newPlay.id;
                  newPlaysToAdd.push(newPlay);
                });

                const newSessionObj = {
                  ...sharedSession.session_data,
                  id: uid(),
                  teamId: null,
                  itemOrder: [],
                  exerciseIds: (sharedSession.session_data.exerciseIds || []).map(id => exIdMap[id]).filter(Boolean),
                  playIds: (sharedSession.session_data.playIds || []).map(id => playIdMap[id]).filter(Boolean),
                };

                if (newExercisesToAdd.length) saveExercises([...exercises, ...newExercisesToAdd]);
                if (newPlaysToAdd.length) savePlays([...plays, ...newPlaysToAdd]);
                saveSessions([...sessions, newSessionObj]);
                if (sharedSession.session_photo) {
                  storage.set(`sessionPhoto:${newSessionObj.id}`, JSON.stringify(sharedSession.session_photo)).catch(() => {});
                }

                setActiveSession(newSessionObj);
                setSharedSession(null);
                setView("session"); history.pushState({ view: "session" }, "", "#session");
                toast?.(`Séance "${newSessionObj.titre}" ajoutée !`);
              }} className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors mb-3"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                {isPremium ? "Ajouter à mes séances" : "🔒 Ajouter à mes séances (Premium)"}
              </button>
              <button onClick={() => setSharedSession(null)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors">
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}
      {sharedPlay && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>PLAY PARTAGÉ</div>
              <div className="text-white/60 text-sm mt-1">Un coach partage ce play avec toi</div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-[#F2EDE4] rounded-xl p-4 mb-4">
                <div className="font-bold text-[#1B2A4A] mb-1">{sharedPlay.titre}</div>
                {sharedPlay.type && <div className="text-xs font-medium mb-1" style={{ color: "#FF6B35" }}>{sharedPlay.type}</div>}
                {sharedPlay.description && <p className="text-xs text-[#1B2A4A]/60 mt-1">{sharedPlay.description}</p>}
                {(sharedPlay.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sharedPlay.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">{t}</span>)}
                  </div>
                )}
                {sharedPlay.images?.length > 0 && (
                  <div className="mt-2 text-xs text-[#1B2A4A]/50">{sharedPlay.images.length} schéma{sharedPlay.images.length > 1 ? "s" : ""}</div>
                )}
              </div>
              <button onClick={async () => {
                const newPlay = { ...sharedPlay, id: uid(), createdAt: new Date().toISOString() };
                if (newPlay.images?.length) {
                  newPlay.images = await Promise.all(newPlay.images.map(async (img) => {
                    if (img.file?.data) {
                      await storage.set(`playimg:${newPlay.id}:${img.id}`, JSON.stringify(img.file)).catch(() => {});
                      return { ...img, file: { name: img.file.name, type: img.file.type, data: null } };
                    }
                    return img;
                  }));
                }
                savePlays([...plays, newPlay]);
                setSharedPlay(null);
                setViewPersist("playbook");
                toast?.(`"${newPlay.titre}" ajouté à ton Play Book !`);
              }} className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors mb-3"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Ajouter à mon Play Book
              </button>
              <button onClick={() => setSharedPlay(null)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors">
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}
      {sharedPlayCollection && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>SCOUTING REPORT</div>
              <div className="text-white/60 text-sm mt-1">Un coach partage {sharedPlayCollection.plays?.length || 0} play{(sharedPlayCollection.plays?.length || 0) > 1 ? "s" : ""} avec toi</div>
            </div>
            <div className="px-6 py-5">
              <div className="bg-[#F2EDE4] rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
                <div className="font-bold text-[#1B2A4A] mb-2">{sharedPlayCollection.title}</div>
                {(sharedPlayCollection.plays || []).map((p, i) => (
                  <div key={i} className="text-xs text-[#1B2A4A]/70 py-1 border-t border-[#1B2A4A]/10 first:border-t-0">
                    {p.titre || "Sans titre"}{p.type ? ` — ${p.type}` : ""}
                  </div>
                ))}
              </div>
              <button onClick={async () => {
                const newPlays = await Promise.all((sharedPlayCollection.plays || []).map(async (sp) => {
                  const newPlay = { ...sp, id: uid(), createdAt: new Date().toISOString() };
                  if (newPlay.images?.length) {
                    newPlay.images = await Promise.all(newPlay.images.map(async (img) => {
                      if (img.file?.data) {
                        await storage.set(`playimg:${newPlay.id}:${img.id}`, JSON.stringify(img.file)).catch(() => {});
                        return { ...img, file: { name: img.file.name, type: img.file.type, data: null } };
                      }
                      return img;
                    }));
                  }
                  return newPlay;
                }));
                savePlays([...plays, ...newPlays]);
                setSharedPlayCollection(null);
                setViewPersist("playbook");
                toast?.(`${newPlays.length} play${newPlays.length > 1 ? "s" : ""} ajouté${newPlays.length > 1 ? "s" : ""} à ton Play Book !`);
              }} className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors mb-3"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Tout ajouter à mon Play Book
              </button>
              <button onClick={() => setSharedPlayCollection(null)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors">
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}
      {showSessionDrawer && activeSession && (
        <div className="fixed inset-0 z-[700] bg-[#F2EDE4] overflow-y-auto p-4">
          <DrawSheetView
            courtType={SPORT_COURT}
            initialImage={currentSessionPhoto}
            onCancel={() => setShowSessionDrawer(false)}
            onValidate={async (dataUrl) => {
              await confirmSessionPhoto(dataUrl);
              setShowSessionDrawer(false);
            }}
          />
        </div>
      )}
      {showSessionOrganizer && activeSession && (
        <SessionOrganizerModal
          session={activeSession}
          exercises={exercises}
          plays={plays}
          onClose={() => setShowSessionOrganizer(false)}
          onUpdateSession={updateSession}
          onDownload={(sess, scaleOpts) => downloadSessionHTML(sess, exercises, { clubLogo, sessionPhoto: currentSessionPhoto, teams, sport, plays, ...scaleOpts })}
          onBuildPreview={(sess, scaleOpts) => buildSessionPreviewHTML(sess, exercises, { clubLogo, sessionPhoto: currentSessionPhoto, teams, sport, plays, ...scaleOpts })}
        />
      )}
      {showHistoryRestore && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1B2A4A] px-6 py-5 text-center">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif" }}>RESTAURER UNE VERSION</div>
              <div className="text-white/60 text-sm mt-1">Choisis à quel moment revenir (3 derniers jours)</div>
            </div>
            <div className="px-6 py-5 flex flex-col gap-2">
              {[{ label: "Il y a 1 heure", h: 1 }, { label: "Il y a 8 heures", h: 8 }, { label: "Il y a 24 heures", h: 24 }, { label: "Il y a 3 jours", h: 72 }].map(opt => (
                <button key={opt.h} onClick={() => restoreFromHistory(opt.h)}
                  className="w-full bg-[#F2EDE4] text-[#1B2A4A] font-bold py-3 rounded-xl text-sm hover:bg-[#FF6B35]/15 transition-colors"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-[#1B2A4A]/10" />
                <span className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40">ou une date précise</span>
                <div className="flex-1 h-px bg-[#1B2A4A]/10" />
              </div>
              <input type="datetime-local" value={customRestoreDate} onChange={e => setCustomRestoreDate(e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
                className="w-full border border-[#1B2A4A]/20 rounded-xl px-3 py-2.5 text-sm text-[#1B2A4A] outline-none focus:border-[#FF6B35]" />
              <button onClick={restoreAtCustomDate} disabled={!customRestoreDate}
                className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#e85a28] transition-colors disabled:opacity-40"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Restaurer à cette date
              </button>
              <button onClick={() => setShowHistoryRestore(false)}
                className="w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A] transition-colors mt-2">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {showOnboarding && <OnboardingModal onDone={finishOnboarding} />}
      {showInstallBanner && !showOnboarding && (
        <div className="fixed bottom-24 left-3 right-3 z-40 bg-[#1B2A4A] text-white rounded-2xl p-4 shadow-xl flex items-start gap-3 no-print">
          <span className="text-2xl flex-shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5">Installer l'application</p>
            <p className="text-xs text-white/60">
              {/iphone|ipad|ipod/i.test(navigator.userAgent)
                ? "Sur Safari : bouton Partager ⎋ → \"Sur l'écran d'accueil\""
                : "Sur Chrome : menu ⋮ → \"Ajouter à l'écran d'accueil\""}
            </p>
          </div>
          <button onClick={() => { setShowInstallBanner(false); localStorage.setItem("cpb_install_dismissed", "1"); }}
            className="flex-shrink-0 text-white/50 hover:text-white text-lg leading-none mt-0.5">✕</button>
        </div>
      )}
      {showTour && !showOnboarding && (
        <GuidedTour
          onDone={finishTour}
          onNavigate={(v) => setViewPersist(v)}
          onOpenForm={() => { setEditing(null); setShowForm(true); }}
          onCloseForm={() => setShowForm(false)}
        />
      )}

      <header className="px-6 py-4 flex items-center gap-3 no-print" style={{ borderBottom: `3px solid ${SPORT_COLOR}` }}>
        <button onClick={() => setSidebarOpen(true)} className="text-[#1B2A4A] p-1 -ml-1" aria-label="Ouvrir le menu"><Menu size={22} /></button>
        <img src="/logo-icon.png" alt="CPB" className="w-9 h-9 rounded-xl object-contain" />
        <h1 className="font-bold text-[#1B2A4A] tracking-tight flex-1" style={{ fontFamily: "Oswald, sans-serif" }}>COACHING PRO BOOST</h1>
        <span className="text-lg" title={sportConfig.label}>{sportConfig.emoji}</span>
        {lastSaved && (
          <span className="text-[10px] text-[#1B2A4A]/30 hidden sm:block">
            ✓ Sauvegardé {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
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
              { key: "sessions", label: "Séances", icon: ListPlus, alsoActive: "session" },
              { key: "library", label: "Bibliothèque", icon: Library },
              { key: "playbook", label: "Play Book", icon: BookOpen },
              { key: "stats", label: "Stats", icon: BarChart3 },
              ...(isAdmin ? [{ key: "suivi", label: "Suivi individuel (admin)", icon: UserCheck }] : []),
              ...(isAdmin || canUseMatchmode ? [{ key: "matchmode", label: isAdmin ? "Mode match (admin)" : "Mode match", icon: Zap }] : []),
              ...(isAdmin ? [{ key: "videoscout", label: "Scouting vidéo (admin)", icon: Video }] : []),
              ...(isAdmin ? [{ key: "myteam", label: "Mon équipe (admin)", icon: BarChart3 }] : []),
              ...(isAdmin || canManageWellness ? [{ key: "wellness", label: "Bien-être joueurs", icon: UserCheck }] : []),
              { key: "account", label: "Mon compte", icon: Users },
            ].map(item => {
              const active = view === item.key || view === item.alsoActive;
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => { setViewPersist(item.key); setSidebarOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-left transition-colors ${active ? "" : "text-[#1B2A4A] hover:bg-[#1B2A4A]/8"}`}
                  style={active ? { backgroundColor: SPORT_COLOR, color: "#ffffff" } : undefined}>
                  <Icon size={19} /> {item.label}
                </button>
              );
            })}
            <div className="mt-auto pt-4 border-t border-[#1B2A4A]/10">
              {/* Logo du club */}
              <div className="px-3 py-2 flex items-center gap-2">
                {clubLogo ? (
                  <img src={clubLogo} alt="Logo" className="w-9 h-9 rounded object-contain border border-[#1B2A4A]/10 bg-white" />
                ) : (
                  <div className="w-9 h-9 rounded border-2 border-dashed border-[#1B2A4A]/20 flex items-center justify-center text-[#1B2A4A]/30">
                    <ImageIcon size={16} />
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <input ref={clubLogoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await readImageAsPng(file, 400);
                      await saveClubLogo(dataUrl);
                    } catch { cpbAlert?.("Impossible de lire cette image, essaie un autre fichier (PNG, JPEG, WEBP...)."); }
                    e.target.value = "";
                  }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); clubLogoInputRef.current?.click(); }}
                    className="text-xs text-[#FF6B35] hover:underline font-medium text-left">
                    {clubLogo ? "Changer le logo" : "Ajouter le logo du club"}
                  </button>
                  {clubLogo && <button onClick={() => saveClubLogo(null)} className="text-xs text-[#1B2A4A]/30 hover:text-red-500 text-left">Supprimer</button>}
                </div>
              </div>
              <div className="px-3 py-1 text-xs text-[#1B2A4A]/40 truncate">{session?.user?.email}</div>
              <button onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-left text-[#1B2A4A]/60 hover:bg-red-50 hover:text-red-600 transition-colors w-full mt-1">
                <LogOut size={19} /> Se déconnecter
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="px-6 py-6 pb-24 max-w-5xl mx-auto">

        {view === "library" && !showForm && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>BIBLIOTHÈQUE D'EXERCICES</h2>
                <p className="text-sm text-[#1B2A4A]/50">
                  {filtered.length !== exercises.length
                    ? `${filtered.length} exercice${filtered.length !== 1 ? "s" : ""} affiché${filtered.length !== 1 ? "s" : ""} sur ${exercises.length}`
                    : `${exercises.length} exercice${exercises.length !== 1 ? "s" : ""} enregistré${exercises.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => { setLibSelectMode(m => !m); setLibrarySelectedIds([]); }}
                    className={`px-3 py-2 rounded-md text-sm font-medium border ${libSelectMode ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5"}`}>
                    {libSelectMode ? "Annuler la sélection" : "Sélectionner plusieurs (admin)"}
                  </button>
                )}
                <button data-tour="add-exercise" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-md text-sm font-medium hover:brightness-90 transition-[filter]" style={{ backgroundColor: "var(--sport-accent)" }}><Plus size={16} /> Nouvel exercice</button>
              </div>
            </div>

            {libSelectMode && (
              <div className="bg-[#1B2A4A] rounded-2xl p-4 mb-4 flex flex-col gap-3">
                <div className="text-white font-semibold text-sm">{librarySelectedIds.length} exercice{librarySelectedIds.length !== 1 ? "s" : ""} sélectionné{librarySelectedIds.length !== 1 ? "s" : ""}</div>
                <input value={libShareTitle} onChange={e => setLibShareTitle(e.target.value)} placeholder="Titre du lot (ex: Pour Julien)" className="w-full rounded-xl px-3 py-2 text-sm outline-none text-[#1B2A4A]" />
                <div className="flex gap-2">
                  <button disabled={librarySelectedIds.length === 0 || libSharing}
                    onClick={async () => {
                      setLibSharing(true);
                      try {
                        const selected = exercises.filter(e => librarySelectedIds.includes(e.id));
                        const enriched = await enrichExercisesAssets(selected);
                        const link = await getOrCreatePermanentCollectionLink(enriched, libShareTitle || `${selected.length} exercices`);
                        await copyOrShow(link, "Lien de partage copié !");
                        setLibSelectMode(false); setLibrarySelectedIds([]); setLibShareTitle("");
                      } catch (e) { await cpbAlert?.("Erreur : " + e.message); }
                      setLibSharing(false);
                    }}
                    className="flex-1 bg-white text-[#1B2A4A] py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                    {libSharing ? "Création du lien..." : "Créer le lien de partage"}
                  </button>
                  <button onClick={() => { setLibSelectMode(false); setLibrarySelectedIds([]); }} className="px-4 py-2 rounded-xl text-sm text-white/60 border border-white/20">✕</button>
                </div>
              </div>
            )}

            {addBanner && (
              <div className="mb-5 border border-[#FF6B35]/30 bg-[#FF6B35]/8 rounded-lg p-3 flex items-center justify-between text-sm text-[#1B2A4A]">
                <span>Ajouté à <strong>{addBanner.sessionTitre}</strong> ({addBanner.count} exercice{addBanner.count !== 1 ? "s" : ""})</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => { const s = sessions.find(x => x.id === addBanner.sessionId); if (s) { setActiveSession(s); setView("session"); history.pushState({ view: "session" }, "", "#session"); } }} className="font-medium text-[#FF6B35] hover:underline">Voir la séance →</button>
                  <button onClick={() => setAddBanner(null)} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={14} /></button>
                </div>
              </div>
            )}
            <div className="relative mb-3">
              <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Rechercher un exercice par nom..."
                className="w-full border border-[#1B2A4A]/20 rounded-lg pl-9 pr-8 py-2 text-sm bg-white/60 outline-none focus:border-[#FF6B35]" />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" /></svg>
              {librarySearch && (
                <button onClick={() => setLibrarySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={14} /></button>
              )}
            </div>
            {(() => {
              const anyFilter = filterTheme.length + filterFormat.length + filterPhase.length + filterCategorie.length > 0;
              const filterSections = [
                {
                  key: "theme", label: "Thème", active: filterTheme.length,
                  content: (
                    <>
                      <input value={newThemeInput} onChange={e => setNewThemeInput(e.target.value)}
                        placeholder="Rechercher ou + nouveau thème..." className="text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1.5 w-full mb-2 bg-white/60 outline-none focus:border-[#FF6B35]"
                        onKeyDown={e => {
                          if (e.key !== "Enter" || !newThemeInput.trim()) return;
                          const t = newThemeInput.trim();
                          if (!themes.some(x => x.toLowerCase() === t.toLowerCase())) saveThemes([...themes, t]);
                          setNewThemeInput("");
                        }} />
                      <div className="flex flex-wrap gap-1.5">
                        {[...themes]
                          .filter(t => t.toLowerCase().includes(newThemeInput.trim().toLowerCase()))
                          .sort((a, b) => a.localeCompare(b, "fr"))
                          .map(t => (
                            <Tag key={t} active={filterTheme.includes(t)} onClick={() => toggleFilter(filterTheme, setFilterTheme, t)} color="orange">{t}</Tag>
                          ))}
                        {newThemeInput.trim() && !themes.some(t => t.toLowerCase().includes(newThemeInput.trim().toLowerCase())) && (
                          <p className="text-xs text-[#1B2A4A]/40 w-full">Aucun thème existant ne correspond — Entrée pour l'ajouter.</p>
                        )}
                      </div>
                    </>
                  )
                },
                {
                  key: "format", label: "Opposition", active: filterFormat.length,
                  content: SPORT_FORMATS.map(f => <Tag key={f} active={filterFormat.includes(f)} onClick={() => toggleFilter(filterFormat, setFilterFormat, f)}>{f}</Tag>)
                },
                {
                  key: "phase", label: "Phase", active: filterPhase.length,
                  content: SPORT_PHASES.map(p => <Tag key={p} active={filterPhase.includes(p)} onClick={() => toggleFilter(filterPhase, setFilterPhase, p)}>{p}</Tag>)
                },
                {
                  key: "categorie", label: "Catégorie", active: filterCategorie.length,
                  content: SPORT_CATEGORIES.map(c => <Tag key={c} active={filterCategorie.includes(c)} onClick={() => toggleFilter(filterCategorie, setFilterCategorie, c)}>{c}</Tag>)
                },
              ];
              return (
                <div className="mb-5 rounded-2xl overflow-hidden border border-[#1B2A4A]/10 bg-white/60">
                  {filterSections.map((sec, idx) => (
                    <FilterAccordion key={sec.key} label={sec.label} activeCount={sec.active} borderTop={idx > 0}>
                      {sec.content}
                    </FilterAccordion>
                  ))}
                  {anyFilter && (
                    <div className="px-4 py-2 border-t border-[#1B2A4A]/8 flex justify-end">
                      <button onClick={() => { setFilterTheme([]); setFilterFormat([]); setFilterPhase([]); setFilterCategorie([]); }}
                        className="text-xs text-[#FF6B35] font-medium hover:underline">
                        Effacer tous les filtres
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40"><p>Aucun exercice ne correspond.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((ex, i) => (
                  <ExerciseCard key={ex.id} ex={ex} index={i}
                    selectMode={libSelectMode}
                    selected={librarySelectedIds.includes(ex.id)}
                    onToggleSelect={() => setLibrarySelectedIds(ids => ids.includes(ex.id) ? ids.filter(id => id !== ex.id) : [...ids, ex.id])}
                    onClick={() => { setEditing(ex); setShowForm(true); }}
                    onView={() => setViewingExercise(ex)}
                    onRemove={() => {
                      saveExercises(exercises.filter(e => e.id !== ex.id));
                      // Best-effort : la photo/les schémas de l'exercice restaient orphelins en
                      // base indéfiniment (jamais nettoyés), ce qui gonflait inutilement la taille
                      // de la base au fil des suppressions.
                      storage.delete(`file:${ex.id}`).catch(() => {});
                      storage.delete(`schemas:${ex.id}`).catch(() => {});
                    }}
                    onAddToDraft={() => addExerciseToDraft(ex.id)}
                    onCropImage={(imgData) => { setCropImage(imgData); setView("crop"); }}
                    onShare={isPremium ? () => shareExercise(ex) : () => setPaywallReason("Le partage d'exercices est une fonctionnalité Premium.")} />
                ))}
              </div>
            )}
          </>
        )}

        {view === "library" && showForm && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>{editing ? "MODIFIER L'EXERCICE" : "NOUVEL EXERCICE"}</h2>
            <ExerciseForm themes={themes} saveThemes={saveThemes} saveFormats={saveFormats} initial={editing}
              onSave={(ex) => { upsertExercise(ex); setAutoOpenDrawForNew(false); }}
              onCancel={() => { setShowForm(false); setEditing(null); setAutoOpenDrawForNew(false); }}
              cpbAlert={cpbAlert} sportPhases={SPORT_PHASES} sportFormats={SPORT_FORMATS} sportCategories={SPORT_CATEGORIES} courtType={SPORT_COURT} autoOpenDraw={autoOpenDrawForNew} />
          </div>
        )}

        {view === "playbook" && !playbookForm && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>PLAY BOOK</h2>
                <p className="text-sm text-[#1B2A4A]/50">
                  {filteredPlays.length !== plays.length
                    ? `${filteredPlays.length} play${filteredPlays.length !== 1 ? "s" : ""} affiché${filteredPlays.length !== 1 ? "s" : ""} sur ${plays.length}`
                    : `${plays.length} play${plays.length !== 1 ? "s" : ""} enregistré${plays.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              {isPremium ? (
                <button onClick={() => { setEditingPlay(null); setPlaybookForm(true); }}
                  className="flex items-center gap-1.5 text-white px-4 py-2 rounded-md text-sm font-medium hover:brightness-90 transition-[filter]" style={{ backgroundColor: "var(--sport-accent)" }}>
                  <Plus size={16} /> Nouveau play
                </button>
              ) : (
                <button onClick={() => setPaywallReason("Le Play Book est en lecture seule en version gratuite. Passez en Premium pour créer et modifier vos plays.")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium" style={{ border: "1px solid var(--sport-accent)", color: "var(--sport-accent)" }}>
                  🔒 Premium
                </button>
              )}
            </div>
            {/* Mode scouting */}
            {selectedPlays.length > 0 && (
              <div className="bg-[#1B2A4A] rounded-2xl p-4 mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold text-sm">{selectedPlays.length} play{selectedPlays.length > 1 ? "s" : ""} sélectionné{selectedPlays.length > 1 ? "s" : ""}</div>
                  {selectedPlays.length > 1 && (
                    <button onClick={() => setScoutingReorderOpen(o => !o)} className="text-xs text-white/70 hover:text-white underline">
                      {scoutingReorderOpen ? "Masquer l'ordre" : "🔀 Réorganiser l'ordre"}
                    </button>
                  )}
                </div>
                {scoutingReorderOpen && (
                  <div className="space-y-1.5 bg-white/5 rounded-xl p-2">
                    <p className="text-[11px] text-white/50 px-1">Glisse-dépose ou utilise les flèches — c'est cet ordre qui sera utilisé pour l'export.</p>
                    {selectedPlays.map((id, i) => {
                      const p = plays.find(x => x.id === id);
                      return (
                        <div key={id}
                          draggable
                          onDragStart={() => setScoutingDragIdx(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); if (scoutingDragIdx !== null && scoutingDragIdx !== i) moveSelectedPlay(scoutingDragIdx, i); setScoutingDragIdx(null); }}
                          onDragEnd={() => setScoutingDragIdx(null)}
                          className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing">
                          <span className="text-[10px] font-bold text-[#FF6B35] w-4 text-center flex-shrink-0">{i + 1}</span>
                          <span className="flex-1 min-w-0 truncate text-sm text-[#1B2A4A]">
                            {p?.titre || "Play supprimé"}
                            {p?.type && <span className="text-[10px] font-medium text-[#1B2A4A]/40 ml-1.5">· {p.type}</span>}
                          </span>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button onClick={() => moveSelectedPlay(i, i - 1)} disabled={i === 0} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                            </button>
                            <button onClick={() => moveSelectedPlay(i, i + 1)} disabled={i === selectedPlays.length - 1} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <input value={scoutingTitle} onChange={e => setScoutingTitle(e.target.value)} placeholder="Titre du scouting (ex: Adversaire Finale)" className="w-full rounded-xl px-3 py-2 text-sm outline-none text-[#1B2A4A]" />
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openPlaysBoard(selectedPlays)} disabled={playsBoardLoading}
                    className="flex-1 bg-[#FF6B35] text-white py-2 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                    {playsBoardLoading ? <Loader2 size={15} className="animate-spin" /> : "🖼"} Voir en planche
                  </button>
                  <button onClick={() => sharePlayCollection(selectedPlays, scoutingTitle)} className="flex-1 bg-white text-[#1B2A4A] py-2 rounded-xl text-sm font-bold">Partager</button>
                  <button onClick={() => exportPlaysPrint(selectedPlays, scoutingTitle)} className="flex-1 bg-white text-[#1B2A4A] border border-[#1B2A4A]/20 py-2 rounded-xl text-sm font-bold">Export impression/PDF</button>
                  <button onClick={() => exportPlaysHtml(selectedPlays, scoutingTitle)} className="flex-1 bg-white text-[#1B2A4A] border border-[#1B2A4A]/20 py-2 rounded-xl text-sm font-bold">Exporter HTML</button>
                  <button onClick={() => setSelectedPlays([])} className="px-4 py-2 rounded-xl text-sm text-white/60 border border-white/20">✕</button>
                </div>
              </div>
            )}
            <div className="relative mb-3">
              <input value={playbookSearch} onChange={e => setPlaybookSearch(e.target.value)} placeholder="Rechercher un play par nom..."
                className="w-full border border-[#1B2A4A]/20 rounded-lg pl-9 pr-8 py-2 text-sm bg-white/60 outline-none focus:border-[#FF6B35]" />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" /></svg>
              {playbookSearch && (
                <button onClick={() => setPlaybookSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={14} /></button>
              )}
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Type :</span>
                {playTypes.map(t => (
                  <Tag key={t} active={filterPlayType.includes(t)} onClick={() => setFilterPlayType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</Tag>
                ))}
                <button onClick={() => setPlayTypesManagerOpen(o => !o)} className="text-xs text-[#1B2A4A]/40 hover:text-[#FF6B35] underline ml-1">
                  {playTypesManagerOpen ? "Fermer" : "⚙️ Gérer les catégories"}
                </button>
              </div>
              {playTypesManagerOpen && (
                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/60 p-3 space-y-1.5">
                  <p className="text-[11px] text-[#1B2A4A]/40 mb-1">Glisse-dépose ou utilise les flèches — c'est cet ordre qui sert au tri "Catégorie" et donc à l'export.</p>
                  {playTypes.map((t, i) => (
                    <div key={t}
                      draggable
                      onDragStart={() => setPlayTypeDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (playTypeDragIdx !== null && playTypeDragIdx !== i) movePlayType(playTypeDragIdx, i); setPlayTypeDragIdx(null); }}
                      onDragEnd={() => setPlayTypeDragIdx(null)}
                      className="flex items-center gap-2 bg-white border border-[#1B2A4A]/10 rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing">
                      <span className="text-[10px] font-bold text-[#FF6B35] w-4 text-center flex-shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-[#1B2A4A]">{t}</span>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button onClick={() => movePlayType(i, i - 1)} disabled={i === 0} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button onClick={() => movePlayType(i, i + 1)} disabled={i === playTypes.length - 1} className="text-[#1B2A4A]/50 hover:text-[#1B2A4A] disabled:opacity-20 p-0.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input value={newPlayTypeInput} onChange={e => setNewPlayTypeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newPlayTypeInput.trim() && !playTypes.includes(newPlayTypeInput.trim())) { savePlayTypes([...playTypes, newPlayTypeInput.trim()]); setNewPlayTypeInput(""); } }}
                      placeholder="Nouvelle catégorie (ex: Transition)" className="flex-1 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#FF6B35]" />
                    <button onClick={() => { if (newPlayTypeInput.trim() && !playTypes.includes(newPlayTypeInput.trim())) { savePlayTypes([...playTypes, newPlayTypeInput.trim()]); setNewPlayTypeInput(""); } }}
                      className="px-3 py-1.5 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Ajouter</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 mr-1">Trier par :</span>
                <select value={playbookSort} onChange={e => setPlaybookSort(e.target.value)}
                  className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white text-[#1B2A4A]">
                  <option value="recent">Favoris puis récents</option>
                  <option value="type">Catégorie ({playTypes.join(" → ")})</option>
                  <option value="alpha">Alphabétique (A → Z)</option>
                </select>
                <button onClick={() => setPlaybookStatsOpen(true)} disabled={filteredPlays.length === 0}
                  className="ml-auto text-xs font-semibold text-white px-3 py-1.5 rounded-md disabled:opacity-40" style={{ backgroundColor: "#2563EB" }}>
                  📊 Stats des mots-clés
                </button>
              </div>
              {[...new Set(plays.map(p => p.scoutedTeam).filter(Boolean))].length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#1B2A4A]/40 mr-1">Équipe scoutée :</span>
                  <select value={filterScoutedTeam} onChange={e => setFilterScoutedTeam(e.target.value)}
                    className="border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm bg-white text-[#1B2A4A]">
                    <option value="">Toutes</option>
                    {[...new Set(plays.map(p => p.scoutedTeam).filter(Boolean))].sort().map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
              {usedPlayTags.length > 0 && (
                <div className="border border-[#1B2A4A]/15 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setPlaybookTagsOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/40 hover:bg-white/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/60 font-semibold">Mots-clés</span>
                      {filterPlayTags.length > 0 && <span className="text-[10px] font-bold bg-[#FF6B35] text-white rounded-full px-1.5 py-0.5">{filterPlayTags.length}</span>}
                    </div>
                    <svg className={`w-4 h-4 text-[#1B2A4A]/40 transition-transform ${playbookTagsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {filterPlayTags.length > 0 && !playbookTagsOpen && (
                    <div className="px-4 py-2 bg-white/20 flex flex-wrap gap-1.5 border-t border-[#1B2A4A]/10">
                      {filterPlayTags.map(t => <Tag key={t} active color="orange" onClick={() => setFilterPlayTags(prev => prev.filter(x => x !== t))}>{t}</Tag>)}
                    </div>
                  )}
                  {playbookTagsOpen && (
                    <div className="px-4 py-3 bg-white/20 border-t border-[#1B2A4A]/10">
                      {usedPlayTags.length > 8 && (
                        <input value={playTagSearch} onChange={e => setPlayTagSearch(e.target.value)}
                          placeholder="Rechercher un mot-clé... (ex: Iverson)"
                          className="w-full mb-2 text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1.5 bg-white/60 outline-none focus:border-[#FF6B35]" />
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {usedPlayTags
                          .filter(t => t.toLowerCase().includes(playTagSearch.trim().toLowerCase()))
                          .map(t => (
                            <Tag key={t} active={filterPlayTags.includes(t)} onClick={() => setFilterPlayTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} color="orange">{t}</Tag>
                          ))}
                        {playTagSearch.trim() && !usedPlayTags.some(t => t.toLowerCase().includes(playTagSearch.trim().toLowerCase())) && (
                          <p className="text-xs text-[#1B2A4A]/40 w-full">Aucun mot-clé ne correspond.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {isPremium && filteredPlays.length > 0 && (
              <div className="flex items-center justify-between mb-3 -mt-2">
                <span className="text-xs text-[#1B2A4A]/40">{filteredPlays.length} play{filteredPlays.length > 1 ? "s" : ""} affiché{filteredPlays.length > 1 ? "s" : ""}</span>
                {filteredPlays.every(p => selectedPlays.includes(p.id)) ? (
                  <button onClick={() => setSelectedPlays(prev => prev.filter(id => !filteredPlays.some(p => p.id === id)))}
                    className="text-xs font-medium hover:underline" style={{ color: "var(--sport-accent)" }}>
                    Tout désélectionner
                  </button>
                ) : (
                  <button onClick={() => {
                    // Toujours par catégorie (indépendamment du tri affiché à l'écran) : c'est
                    // l'ordre par défaut le plus utile à retrouver dans "Réorganiser l'ordre".
                    const byCategory = [...filteredPlays].sort((a, b) => playTypeRank(a.type) - playTypeRank(b.type));
                    setSelectedPlays(prev => [...new Set([...prev, ...byCategory.map(p => p.id)])]);
                  }}
                    className="text-xs font-medium hover:underline" style={{ color: "var(--sport-accent)" }}>
                    Tout sélectionner ({filteredPlays.length})
                  </button>
                )}
              </div>
            )}
            {filteredPlays.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p>Ton Play Book est vide.</p>
                <p className="text-sm mt-1">Ajoute des systèmes, ATO, SLOB et BLOB.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPlays.map(play => (
                  <PlayCard key={play.id} play={play}
                    onView={() => setViewingPlay(play)}
                    onToggleFavorite={() => savePlays(plays.map(p => p.id === play.id ? { ...p, favorite: !p.favorite } : p))}
                    onShare={() => sharePlay(play)}
                    onSelect={isPremium ? () => setSelectedPlays(prev => prev.includes(play.id) ? prev.filter(id => id !== play.id) : [...prev, play.id]) : null}
                    selected={selectedPlays.includes(play.id)}
                    onEdit={isPremium ? () => { setEditingPlay(play); setPlaybookForm(true); } : () => setPaywallReason("Modifiez vos plays en passant en Premium.")}
                    onRemove={isPremium ? () => {
                      savePlays(plays.filter(p => p.id !== play.id));
                      // Best-effort : les photos du play restaient orphelines en base (jamais
                      // nettoyées à la suppression), gonflant inutilement la taille de la base.
                      (play.images || []).forEach(img => { storage.delete(`playimg:${play.id}:${img.id}`).catch(() => {}); });
                    } : () => setPaywallReason("Supprimez vos plays en passant en Premium.")} />
                ))}
              </div>
            )}
          </>
        )}

        {view === "playbook" && playbookForm && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>{editingPlay?.id ? "MODIFIER LE PLAY" : "NOUVEAU PLAY"}</h2>
            <PlayForm initial={editingPlay} playTags={playTags} savePlayTags={savePlayTags} playTypes={playTypes} savePlayTypes={savePlayTypes} courtType={SPORT_COURT} cpbAlert={cpbAlert} autoOpenDraw={autoOpenDrawForNew} allTempsForts={usedTempsForts}
              onSave={(play) => {
                // Un brouillon (photo rapide, envoi depuis le scouting vidéo) n'a pas encore d'id enregistré :
                // on l'ajoute au lieu de chercher à le remplacer.
                const next = plays.some(p => p.id === play.id) ? plays.map(p => p.id === play.id ? play : p) : [...plays, play];
                savePlays(next);
                setPlaybookForm(false);
                setEditingPlay(null);
                setAutoOpenDrawForNew(false);
              }}
              onCancel={() => { setPlaybookForm(false); setEditingPlay(null); setAutoOpenDrawForNew(false); }} />
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

        {view === "suivi" && isAdmin && (() => {
          const selectedPlayer = players.find(p => p.id === selectedPlayerId);
          const sessionPlayerIds = (s) => s.playerIds || (s.playerId ? [s.playerId] : []);
          const playerSessions = selectedPlayer
            ? individualSessions.filter(s => sessionPlayerIds(s).includes(selectedPlayer.id)).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            : [];
          const totalMinutes = playerSessions.reduce((sum, s) => sum + (Number(s.duree) || 0), 0);
          const byTheme = {};
          playerSessions.forEach(s => { const t = s.theme || "Sans thème"; byTheme[t] = (byTheme[t] || 0) + (Number(s.duree) || 0); });

          const todayStr = new Date().toISOString().slice(0, 10);
          const upcomingSessions = playerSessions.filter(s => s.date && s.date >= todayStr).sort((a, b) => new Date(a.date) - new Date(b.date));
          const pastSessions = playerSessions.filter(s => !s.date || s.date < todayStr);
          const pastByMonth = {};
          pastSessions.forEach(s => {
            const d = s.date ? new Date(s.date) : null;
            const key = d ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "Date inconnue";
            (pastByMonth[key] = pastByMonth[key] || []).push(s);
          });

          return (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>SUIVI INDIVIDUEL</h2>
            <p className="text-xs text-[#1B2A4A]/40 mb-5">Fonctionnalité en test, visible uniquement par toi (admin).</p>

            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {players.map(p => (
                editingPlayerId === p.id ? (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <input autoFocus value={editingPlayerName} onChange={e => setEditingPlayerName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && editingPlayerName.trim()) {
                          savePlayers(players.map(x => x.id === p.id ? { ...x, nom: editingPlayerName.trim() } : x));
                          setEditingPlayerId(null);
                        }
                        if (e.key === "Escape") setEditingPlayerId(null);
                      }}
                      className="px-3 py-1.5 rounded-full text-sm border border-[#FF6B35] outline-none w-44" />
                    <button onClick={() => {
                      if (editingPlayerName.trim()) savePlayers(players.map(x => x.id === p.id ? { ...x, nom: editingPlayerName.trim() } : x));
                      setEditingPlayerId(null);
                    }} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#FF6B35] text-white">OK</button>
                    <button onClick={() => setEditingPlayerId(null)} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={16} /></button>
                  </div>
                ) : confirmDeletePlayerId === p.id ? (
                  <span key={p.id} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-red-200 bg-red-50">
                    <span className="text-[#1B2A4A]/70">Supprimer {p.nom} et ses séances ?</span>
                    <button onClick={() => {
                      savePlayers(players.filter(x => x.id !== p.id));
                      saveIndividualSessions(individualSessions
                        .map(s => (s.playerIds || (s.playerId ? [s.playerId] : [])).includes(p.id)
                          ? { ...s, playerIds: (s.playerIds || (s.playerId ? [s.playerId] : [])).filter(id => id !== p.id) }
                          : s)
                        .filter(s => (s.playerIds || []).length > 0));
                      if (selectedPlayerId === p.id) setSelectedPlayerId(null);
                      setConfirmDeletePlayerId(null);
                    }} className="text-red-600 font-semibold">Oui</button>
                    <button onClick={() => setConfirmDeletePlayerId(null)} className="text-[#1B2A4A]/40">Non</button>
                  </span>
                ) : (
                  <span key={p.id} className={`flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium border ${selectedPlayerId === p.id ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A]"}`}
                    style={selectedPlayerId === p.id ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                    <button onClick={() => setSelectedPlayerId(p.id)}>{p.nom}</button>
                    <button onClick={() => { setEditingPlayerId(p.id); setEditingPlayerName(p.nom); }}
                      className={selectedPlayerId === p.id ? "text-white/70 hover:text-white" : "text-[#1B2A4A]/30 hover:text-[#1B2A4A]"}><Pencil size={13} /></button>
                    <button onClick={() => setConfirmDeletePlayerId(p.id)}
                      className={selectedPlayerId === p.id ? "text-white/70 hover:text-white" : "text-[#1B2A4A]/30 hover:text-red-600"}><Trash2 size={13} /></button>
                  </span>
                )
              ))}
              {newPlayerOpen ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newPlayerName.trim()) {
                        const p = { id: uid(), nom: newPlayerName.trim() };
                        savePlayers([...players, p]); setSelectedPlayerId(p.id); setNewPlayerName(""); setNewPlayerOpen(false);
                      }
                      if (e.key === "Escape") { setNewPlayerOpen(false); setNewPlayerName(""); }
                    }}
                    placeholder="Prénom Nom" className="px-3 py-1.5 rounded-full text-sm border border-[#FF6B35] outline-none w-44" />
                  <button onClick={() => {
                    if (newPlayerName.trim()) {
                      const p = { id: uid(), nom: newPlayerName.trim() };
                      savePlayers([...players, p]); setSelectedPlayerId(p.id); setNewPlayerName("");
                    }
                    setNewPlayerOpen(false);
                  }} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#FF6B35] text-white">Ajouter</button>
                </div>
              ) : (
                <button onClick={() => setNewPlayerOpen(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-[#FF6B35]/50 text-[#FF6B35] flex items-center gap-1"><Plus size={14} /> Ajouter un joueur</button>
              )}
            </div>

            {!selectedPlayer ? (
              <p className="text-sm text-[#1B2A4A]/40">Sélectionne ou ajoute un joueur pour voir son suivi.</p>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-5 text-sm text-[#1B2A4A]/60">
                  <span><strong className="text-[#1B2A4A]">{playerSessions.length}</strong> séance{playerSessions.length !== 1 ? "s" : ""} individuelle{playerSessions.length !== 1 ? "s" : ""}</span>
                  <span><strong className="text-[#1B2A4A]">{Math.round(totalMinutes / 6) / 10}h</strong> cumulées</span>
                </div>

                {Object.keys(byTheme).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {Object.entries(byTheme).sort((a, b) => b[1] - a[1]).map(([theme, min]) => (
                      <span key={theme} className="text-xs px-2.5 py-1 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] font-medium">{theme} · {Math.round(min / 6) / 10}h</span>
                    ))}
                  </div>
                )}

                {indivForm ? (
                  <div className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 mb-5">
                    <div className="mb-3">
                      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1.5">Joueurs concernés (plusieurs si séance commune)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {players.map(p => {
                          const on = indivForm.playerIds.includes(p.id);
                          return (
                            <button key={p.id} type="button"
                              onClick={() => setIndivForm({ ...indivForm, playerIds: on ? indivForm.playerIds.filter(id => id !== p.id) : [...indivForm.playerIds, p.id] })}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${on ? "" : "border-[#1B2A4A]/25 text-[#1B2A4A]/60"}`}
                              style={on ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                              {p.nom}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Date</div>
                        <input type="date" value={indivForm.date} onChange={e => setIndivForm({ ...indivForm, date: e.target.value })}
                          className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Durée (min)</div>
                        <input type="number" min={0} value={indivForm.duree} onChange={e => setIndivForm({ ...indivForm, duree: e.target.value })}
                          className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Thème</div>
                        <input value={indivForm.theme} onChange={e => setIndivForm({ ...indivForm, theme: e.target.value })}
                          placeholder="ex: Tir à 3 points" className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Contenu de la séance</div>
                      <textarea value={indivForm.contenu} onChange={e => setIndivForm({ ...indivForm, contenu: e.target.value })} rows={2}
                        className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                    </div>
                    <div className="mb-4">
                      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Notes / points clés</div>
                      <textarea value={indivForm.notes} onChange={e => setIndivForm({ ...indivForm, notes: e.target.value })} rows={2}
                        className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if (indivForm.playerIds.length === 0) return;
                        if (indivForm.id) {
                          saveIndividualSessions(individualSessions.map(x => x.id === indivForm.id ? { ...x, ...indivForm } : x));
                        } else {
                          saveIndividualSessions([...individualSessions, { id: uid(), createdAt: new Date().toISOString(), ...indivForm }]);
                        }
                        setIndivForm(null);
                      }} disabled={indivForm.playerIds.length === 0}
                        className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>{indivForm.id ? "Enregistrer les modifications" : "Enregistrer"}</button>
                      <button onClick={() => setIndivForm(null)} className="px-4 py-2 rounded-md text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setIndivForm({ playerIds: [selectedPlayer.id], date: new Date().toISOString().slice(0, 10), duree: "", theme: "", contenu: "", notes: "" })}
                    className="mb-5 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "var(--sport-accent)" }}>
                    <Plus size={15} /> Nouvelle séance individuelle
                  </button>
                )}

                {(() => {
                  const renderSessionCard = (s, { programmed = false } = {}) => {
                    const others = sessionPlayerIds(s).filter(id => id !== selectedPlayer.id).map(id => players.find(p => p.id === id)?.nom).filter(Boolean);
                    return (
                      <div key={s.id} className={`border rounded-lg bg-white/70 p-3 ${programmed ? "border-[#2563EB]/30" : "border-[#1B2A4A]/15"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#1B2A4A]">
                            {programmed && <span className="text-[10px] font-bold uppercase tracking-wide text-[#2563EB] bg-[#2563EB]/10 rounded-full px-2 py-0.5 mr-2">Programmé</span>}
                            {s.date ? new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "Date inconnue"} {s.theme && `· ${s.theme}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#1B2A4A]/40">{s.duree || 0} min</span>
                            {s.date && (
                              <button onClick={() => downloadIndividualSessionIcs(s, selectedPlayer.nom)}
                                title="Ajouter à l'agenda" className="text-[#1B2A4A]/30 hover:text-[#2563EB]"><Clock size={14} /></button>
                            )}
                            <button onClick={() => setIndivForm({ id: s.id, playerIds: sessionPlayerIds(s), date: s.date || "", duree: s.duree || "", theme: s.theme || "", contenu: s.contenu || "", notes: s.notes || "" })}
                              className="text-[#1B2A4A]/30 hover:text-[#1B2A4A]"><Pencil size={14} /></button>
                            <button onClick={() => saveIndividualSessions(individualSessions.filter(x => x.id !== s.id))} className="text-[#1B2A4A]/30 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        {others.length > 0 && <p className="text-xs text-[#2563EB] mb-1">Avec {others.join(", ")}</p>}
                        {s.contenu && <p className="text-sm text-[#1B2A4A]/70 mb-1">{s.contenu}</p>}
                        {s.notes && <p className="text-xs text-[#1B2A4A]/40 italic">{s.notes}</p>}
                      </div>
                    );
                  };
                  return (
                    <>
                      {upcomingSessions.length > 0 && (
                        <div className="mb-6">
                          <div className="text-xs uppercase tracking-wide text-[#2563EB] font-semibold mb-2">Programmé ({upcomingSessions.length})</div>
                          <div className="flex flex-col gap-2">{upcomingSessions.map(s => renderSessionCard(s, { programmed: true }))}</div>
                        </div>
                      )}
                      {Object.entries(pastByMonth).map(([month, sessions]) => {
                        const monthMinutes = sessions.reduce((sum, s) => sum + (Number(s.duree) || 0), 0);
                        return (
                          <div key={month} className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold">{month}</span>
                              <span className="text-xs text-[#1B2A4A]/40">{sessions.length} séance{sessions.length !== 1 ? "s" : ""} · {Math.round(monthMinutes / 6) / 10}h</span>
                            </div>
                            <div className="flex flex-col gap-2">{sessions.map(s => renderSessionCard(s))}</div>
                          </div>
                        );
                      })}
                      {playerSessions.length === 0 && <p className="text-sm text-[#1B2A4A]/40">Aucune séance individuelle enregistrée pour ce joueur.</p>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          );
        })()}

        {view === "matchmode" && (isAdmin || canUseMatchmode) && (() => {
          const scoutedTeams = [...new Set(plays.map(p => p.scoutedTeam).filter(Boolean))].sort();
          const activeMatch = matchSessions.find(m => m.id === activeMatchId) || null;
          const tfOf = (p) => Array.isArray(p.tempsFort) ? p.tempsFort : (p.tempsFort ? [p.tempsFort] : []);
          // Repli sur les anciennes entrées (juste un nombre) enregistrées avant l'ajout du score.
          const playedOf = (entry) => typeof entry === "number" ? entry : (entry?.played || 0);
          const pointsOf = (entry) => typeof entry === "number" ? 0 : (entry?.points || 0);
          const possibleOf = (entry) => typeof entry === "number" ? 0 : (entry?.possible || 0);
          const openMissesOf = (entry) => typeof entry === "number" ? 0 : (entry?.openMisses || 0);
          const contestedMissesOf = (entry) => typeof entry === "number" ? 0 : (entry?.contestedMisses || 0);

          const updateActiveMatch = (patch) => saveMatchSessions(matchSessions.map(m => m.id === activeMatchId ? { ...m, ...patch } : m));

          // Analyse d'une photo de feuille de match (côté serveur, voir api/analyze-scoresheet.js) :
          // résultat affiché en vérification (scoresheetDraft) avant tout enregistrement — une IA
          // vision sur écriture manuscrite se trompe, on ne fait jamais confiance en aveugle.
          const analyzeScoresheet = async (file) => {
            if (!file) return;
            setScoresheetError(null);
            setScoresheetAnalyzing(true);
            try {
              const dataUrl = await readImageAsJpeg(file, 1600, 0.85);
              const res = await fetch("/api/analyze-scoresheet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataUrl }),
              });
              const data = await res.json();
              if (!res.ok || data.error) throw new Error(data.error || "Erreur inconnue");
              setScoresheetDraft({
                quartTemps: data.quartTemps ?? null,
                scoreEquipe: data.scoreEquipe ?? null,
                scoreAdverse: data.scoreAdverse ?? null,
                scoreParQuartTemps: data.scoreParQuartTemps || [],
                joueurs: (data.joueurs || []).map(j => ({ numero: j.numero || "", points: j.points ?? "", fautes: j.fautes ?? "" })),
                incertitudes: data.incertitudes || "",
              });
            } catch (e) {
              setScoresheetError(e.message || "Impossible d'analyser la photo.");
            }
            setScoresheetAnalyzing(false);
          };

          // Four Factors (Dean Oliver) calculés à la main à partir de stats saisies par quart-temps
          // — gratuit, pas d'IA nécessaire. ORB% d'une équipe dépend des rebonds défensifs de
          // l'AUTRE équipe (rebonds "disputés"), d'où le besoin de saisir les deux équipes.
          const emptyQuarterTeamStats = () => ({ fgm: "", fga: "", tpm: "", tov: "", oreb: "", dreb: "", ftm: "", fta: "" });
          const qsNum = (v) => Number(v) || 0;
          const sumQuarterStats = (side) => (activeMatch.quarterStats || []).reduce((acc, q) => {
            const t = q[side] || {};
            Object.keys(acc).forEach(k => { acc[k] += qsNum(t[k]); });
            return acc;
          }, { fgm: 0, fga: 0, tpm: 0, tov: 0, oreb: 0, dreb: 0, ftm: 0, fta: 0 });
          const computeFourFactors = (own, opp) => {
            const efg = own.fga > 0 ? (own.fgm + 0.5 * own.tpm) / own.fga * 100 : 0;
            const tovPct = (own.fga + 0.44 * own.fta + own.tov) > 0 ? own.tov / (own.fga + 0.44 * own.fta + own.tov) * 100 : 0;
            const orbPct = (own.oreb + opp.dreb) > 0 ? own.oreb / (own.oreb + opp.dreb) * 100 : 0;
            const ftRate = own.fga > 0 ? own.ftm / own.fga * 100 : 0;
            return { efg, tovPct, orbPct, ftRate };
          };

          // Camp physique (domicile/extérieur) de l'équipe actuellement scoutée. Sert à taguer
          // chaque entrée du journal de score avec une identité STABLE : contrairement à
          // "scouted"/"other", ce tag ne doit jamais changer de sens si on bascule ensuite
          // le Playbook affiché (switchScoutSide) — sinon les anciens points changent de camp.
          const scoutedSideNow = () => (activeMatch.homeAway === "exterieur" ? "home" : "away");

          // value = null (juste compter, pas de tir) ou un nombre signé : positif = panier marqué
          // de cette valeur, négatif = tir tenté de cette valeur mais manqué.
          // missContext (uniquement pour un tir manqué à 2 ou 3 pts) = "ouvert" ou "conteste".
          const recordOutcome = (playId, value, missContext = null) => {
            const cur = activeMatch.tally?.[playId];
            const next = {
              played: playedOf(cur) + 1,
              points: pointsOf(cur) + (value > 0 ? value : 0),
              possible: possibleOf(cur) + (value ? Math.abs(value) : 0),
              openMisses: openMissesOf(cur) + (missContext === "ouvert" ? 1 : 0),
              contestedMisses: contestedMissesOf(cur) + (missContext === "conteste" ? 1 : 0),
            };
            // Les points marqués via un système appartiennent à l'équipe SCOUTÉE
            // (celle dont on suit le Playbook), pas à "nous" au sens propre.
            const prevScoreLog = activeMatch.scoreLog || [];
            const scoreLog = value > 0 ? [...prevScoreLog, { id: uid(), team: "scouted", side: scoutedSideNow(), points: value, ts: Date.now() }] : prevScoreLog;
            updateActiveMatch({ tally: { ...(activeMatch.tally || {}), [playId]: next }, scoreLog });
            setTfFilters([]);
            setNewPlayOpen(false); setNewPlayName("");
            const playTitre = plays.find(p => p.id === playId)?.titre || "Système";
            const label = value ? (value > 0 ? `+${value}` : `${value}`) : "sans tir";
            const contextLabel = missContext === "ouvert" ? " (tir ouvert)" : missContext === "conteste" ? " (tir contesté)" : "";
            toast?.(`✓ ${playTitre} — ${label}${contextLabel}`);
            setLastMatchAction({ team: "scouted", playId, playTitre, value, prevTally: cur, prevScoreLog, ts: Date.now() });
          };

          const requestMissContext = (playId, value) => setPendingMiss({ playId, value });
          const resolveMissContext = (context) => {
            if (!pendingMiss) return;
            recordOutcome(pendingMiss.playId, pendingMiss.value, context);
            setPendingMiss(null);
          };

          // &1 ("and-one") : le tir (+2/+3) est déjà marqué comme une action, le lancer franc bonus
          // s'ajoute à cette MÊME action (pas de nouvelle occurrence du système comptée).
          // LF1 (tir manqué avec faute, aucun -2/-3 n'a été saisi) est en revanche une action à part
          // entière : il utilise recordOutcome(p.id, 1), comme +2/+3.
          const addBonusPoint = (playId, label) => {
            const cur = activeMatch.tally?.[playId];
            const next = {
              played: playedOf(cur), points: pointsOf(cur) + 1, possible: possibleOf(cur),
              openMisses: openMissesOf(cur), contestedMisses: contestedMissesOf(cur),
            };
            const prevScoreLog = activeMatch.scoreLog || [];
            const scoreLog = [...prevScoreLog, { id: uid(), team: "scouted", side: scoutedSideNow(), points: 1, ts: Date.now() }];
            updateActiveMatch({ tally: { ...(activeMatch.tally || {}), [playId]: next }, scoreLog });
            const playTitre = plays.find(p => p.id === playId)?.titre || "Système";
            toast?.(`✓ ${playTitre} — +1 (${label}, même action)`);
            setLastMatchAction({ team: "scouted", playId, playTitre, value: 1, bonus: label, prevTally: cur, prevScoreLog, ts: Date.now() });
          };

          // Les boutons manuels servent à saisir le score de l'AUTRE équipe (celle qu'on ne scoute pas).
          const recordOpponentScore = (value) => {
            const prevScoreLog = activeMatch.scoreLog || [];
            const otherSide = scoutedSideNow() === "home" ? "away" : "home";
            const scoreLog = [...prevScoreLog, { id: uid(), team: "other", side: otherSide, points: value, ts: Date.now() }];
            updateActiveMatch({ scoreLog });
            toast?.(`✓ ${activeMatch.ourTeam || "Adversaire"} — +${value}`);
            setLastMatchAction({ team: "other", value, prevScoreLog, ts: Date.now() });
          };

          const undoLastMatchAction = () => {
            if (!lastMatchAction) return;
            const { team, playId, prevTally, prevScoreLog } = lastMatchAction;
            const patch = { scoreLog: prevScoreLog };
            if (team === "scouted") {
              const tally = { ...(activeMatch.tally || {}) };
              if (prevTally) tally[playId] = prevTally; else delete tally[playId];
              patch.tally = tally;
            }
            updateActiveMatch(patch);
            toast?.("↩ Action annulée");
            setLastMatchAction(null);
          };

          // Match "les deux équipes scoutées" : le bouton de bascule échange simplement
          // scoutedTeam/ourTeam (et homeAway avec, pour garder Locaux/Visiteurs cohérents).
          // Comme tout le reste (liste des systèmes, temps forts, tableau de score, export)
          // se base sur ces deux champs, rien d'autre n'a besoin de changer.
          const switchScoutSide = () => {
            updateActiveMatch({
              scoutedTeam: activeMatch.ourTeam,
              ourTeam: activeMatch.scoutedTeam,
              homeAway: activeMatch.homeAway === "domicile" ? "exterieur" : "domicile",
            });
            setTfFilters([]); setMatchTypeFilters([]); setNewPlayOpen(false);
            toast?.(`🔁 Scouting : ${activeMatch.ourTeam}`);
            document.getElementById("match-tf-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
          };
          // Sélection directe d'un côté (au lieu d'une simple bascule) pour les deux boutons
          // gauche/droite : ne fait rien si le côté demandé est déjà celui affiché.
          const setScoutSide = (side) => {
            const currentSide = activeMatch.homeAway === "exterieur" ? "home" : "away";
            if (side !== currentSide) switchScoutSide();
          };

          // ── Vue "saisie" : un match est actif ──────────────────────────────────
          if (activeMatch) {
            // homeAway décrit si "ourTeam" (l'équipe non scoutée) joue à domicile.
            const scoutedIsHome = activeMatch.homeAway === "exterieur";
            const homeTeamName = scoutedIsHome ? activeMatch.scoutedTeam : activeMatch.ourTeam;
            const awayTeamName = scoutedIsHome ? activeMatch.ourTeam : activeMatch.scoutedTeam;
            // Le camp (side: "home"/"away") de chaque entrée est stable, contrairement à team
            // ("scouted"/"other") qui ne décrit que la situation au moment de l'action et change
            // de sens si on bascule ensuite le Playbook affiché (voir switchScoutSide plus haut).
            const scoreLog = (activeMatch.scoreLog || []).map(e => ({ ...e, side: e.side || (e.team === "scouted" ? (scoutedIsHome ? "home" : "away") : (scoutedIsHome ? "away" : "home")) }));
            const scoreHome = scoreLog.filter(e => e.side === "home").reduce((s, e) => s + e.points, 0);
            const scoreAway = scoreLog.filter(e => e.side === "away").reduce((s, e) => s + e.points, 0);
            let currentRun = null;
            if (scoreLog.length > 0) {
              const lastSide = scoreLog[scoreLog.length - 1].side;
              let runPoints = 0, runCount = 0;
              for (let i = scoreLog.length - 1; i >= 0 && scoreLog[i].side === lastSide; i--) {
                runPoints += scoreLog[i].points; runCount++;
              }
              currentRun = { side: lastSide, points: runPoints, count: runCount };
            }
            const teamPlays = plays.filter(p => p.scoutedTeam === activeMatch.scoutedTeam);
            const tfOptions = [...new Set(teamPlays.flatMap(tfOf))];
            const matchTypeOptions = playTypes.filter(t => teamPlays.some(p => p.type === t));
            const filteredPlays = teamPlays
              .filter(p => tfFilters.every(f => tfOf(p).includes(f)))
              .filter(p => matchTypeFilters.length === 0 || matchTypeFilters.includes(p.type))
              .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || playedOf(activeMatch.tally?.[b.id]) - playedOf(activeMatch.tally?.[a.id]));
            const sorted = [...teamPlays].sort((a, b) => playedOf(activeMatch.tally?.[b.id]) - playedOf(activeMatch.tally?.[a.id]));
            const totalTally = teamPlays.reduce((sum, p) => sum + playedOf(activeMatch.tally?.[p.id]), 0);

            return (
              <div className="max-w-3xl">
                <button onClick={() => { setActiveMatchId(null); setTfFilters([]); setMatchTypeFilters([]); setNewPlayOpen(false); setLastMatchAction(null); setPendingMiss(null); setMatchNotesOpen(false); }}
                  className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A] mb-3">← Retour aux matchs</button>
                <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                  {activeMatch.homeAway === "exterieur"
                    ? `${activeMatch.scoutedTeam} vs ${activeMatch.ourTeam || "Nous"}`
                    : `${activeMatch.ourTeam || "Nous"} vs ${activeMatch.scoutedTeam}`}
                </h2>
                <p className="text-xs text-[#1B2A4A]/40 mb-2">
                  {activeMatch.date ? new Date(activeMatch.date).toLocaleDateString("fr-FR") : "Date inconnue"}{activeMatch.time && ` · ${activeMatch.time}`}{activeMatch.championnat && ` · ${activeMatch.championnat}`}{activeMatch.homeAway && ` · ${activeMatch.homeAway === "domicile" ? "Domicile" : "Extérieur"}`} — <strong className="text-[#1B2A4A]/60">{totalTally}</strong> système{totalTally !== 1 ? "s" : ""} comptabilisé{totalTally !== 1 ? "s" : ""}
                </p>
                {matchSyncPending && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    🔌 Pas de connexion — tes actions sont gardées sur cet appareil et se synchroniseront automatiquement dès que le réseau reviendra. Ne ferme pas l'appli entre-temps.
                  </p>
                )}
                <div className="sticky top-0 z-30 border border-[#1B2A4A]/15 rounded-xl bg-[#F2EDE4] shadow-md p-4 mb-3">
                  <div className="flex items-center justify-around text-center mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold">Locaux · {homeTeamName || "?"}</div>
                      <div className="text-3xl font-bold" style={{ color: "var(--sport-accent)" }}>{scoreHome}</div>
                    </div>
                    <div className="text-lg text-[#1B2A4A]/20 font-bold">—</div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold">Visiteurs · {awayTeamName || "?"}</div>
                      <div className="text-3xl font-bold text-[#1B2A4A]">{scoreAway}</div>
                    </div>
                  </div>
                  {currentRun && currentRun.points > 0 && (
                    <p className={`text-center text-xs font-semibold rounded-lg py-1.5 mb-3 ${currentRun.side === "home" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      🔥 Série en cours : {currentRun.side === "home" ? (homeTeamName || "Locaux") : (awayTeamName || "Visiteurs")} +{currentRun.points} ({currentRun.count} action{currentRun.count > 1 ? "s" : ""})
                    </p>
                  )}
                  {activeMatch.bothScouted && (
                    <p className="text-center text-[11px] text-[#1B2A4A]/40 mb-3">Playbook affiché : <strong className="text-[#1B2A4A]/70">{activeMatch.scoutedTeam}</strong> — boutons de bascule à gauche/droite de l'écran</p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-[#1B2A4A]/40 mr-1">Score {activeMatch.ourTeam || "autre équipe"} :</span>
                    {[1, 2, 3].map(v => (
                      <button key={v} onClick={() => recordOpponentScore(v)}
                        className="w-11 h-11 rounded-lg text-base font-bold border-2 border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 active:bg-[#1B2A4A]/10">+{v}</button>
                    ))}
                  </div>
                </div>
                {lastMatchAction && (
                  <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2 mb-3">
                    <span>
                      Dernier : <strong>{lastMatchAction.team === "other" ? (activeMatch.ourTeam || "Autre équipe") : lastMatchAction.playTitre}</strong> {lastMatchAction.value ? (lastMatchAction.value > 0 ? `+${lastMatchAction.value}` : lastMatchAction.value) : "sans tir"}{lastMatchAction.bonus ? ` (${lastMatchAction.bonus}, même action)` : ""} comptabilisé
                    </span>
                    <button onClick={undoLastMatchAction} className="ml-auto font-semibold hover:underline">↩ Annuler</button>
                  </div>
                )}
                {pendingMiss && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPendingMiss(null)}>
                    <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                      <p className="text-sm font-semibold text-[#1B2A4A] mb-1">Tir à {pendingMiss.value} pts manqué</p>
                      <p className="text-xs text-[#1B2A4A]/50 mb-4">Le tir était-il ouvert ou contesté ?</p>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => resolveMissContext("ouvert")}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 border-green-300 text-green-700 hover:bg-green-50">🟢 Tir ouvert</button>
                        <button onClick={() => resolveMissContext("conteste")}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 border-red-300 text-red-700 hover:bg-red-50">🔴 Tir contesté</button>
                        <button onClick={() => setPendingMiss(null)}
                          className="w-full py-2 rounded-lg text-xs text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={() => setMatchNotesOpen(o => !o)}
                  title="Notes du coach"
                  className="fixed top-4 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: "var(--sport-accent)" }}>
                  <StickyNote size={20} />
                  {activeMatch.notes?.trim() && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />}
                </button>
                {matchNotesOpen && (
                  <div className="fixed top-20 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-[#1B2A4A]/15 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#1B2A4A]/50">Notes du coach</span>
                      <button onClick={() => setMatchNotesOpen(false)} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={16} /></button>
                    </div>
                    <textarea value={activeMatch.notes || ""} onChange={e => updateActiveMatch({ notes: e.target.value })}
                      autoFocus placeholder="Ajustements, consignes de mi-temps, joueurs à surveiller..."
                      className="w-full h-40 border border-[#1B2A4A]/20 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B35] resize-none" />
                  </div>
                )}

                {activeMatch.bothScouted && (
                  <>
                    <button onClick={() => setScoutSide("home")} title={`Scouter ${homeTeamName}`}
                      className="fixed bottom-40 left-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-[10px] font-bold text-center leading-tight px-1"
                      style={activeMatch.scoutedTeam === homeTeamName
                        ? { backgroundColor: "var(--sport-accent)", color: "#fff" }
                        : { backgroundColor: "#fff", color: "#1B2A4A", border: "2px solid #1B2A4A30" }}>
                      {(homeTeamName || "Locaux").slice(0, 8)}
                    </button>
                    <button onClick={() => setScoutSide("away")} title={`Scouter ${awayTeamName}`}
                      className="fixed bottom-40 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-[10px] font-bold text-center leading-tight px-1"
                      style={activeMatch.scoutedTeam === awayTeamName
                        ? { backgroundColor: "var(--sport-accent)", color: "#fff" }
                        : { backgroundColor: "#fff", color: "#1B2A4A", border: "2px solid #1B2A4A30" }}>
                      {(awayTeamName || "Visiteurs").slice(0, 8)}
                    </button>
                  </>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <button onClick={() => setFavPlayPickerOpen(true)} className="text-xs font-medium text-[#FF6B35] hover:underline">
                    🎯 Mes systèmes proposés au coach ({(activeMatch.favoritePlayIds || []).length}/4)
                  </button>
                  <span className="text-[#1B2A4A]/15">·</span>
                  <input ref={scoresheetCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; analyzeScoresheet(f); }} />
                  <button onClick={() => scoresheetCameraRef.current?.click()} disabled={scoresheetAnalyzing}
                    className="text-xs font-medium text-[#FF6B35] hover:underline disabled:opacity-50 flex items-center gap-1">
                    <Camera size={12} /> {scoresheetAnalyzing ? "Analyse en cours..." : "Analyser la feuille de match"}
                  </button>
                  {(activeMatch.scoresheetStats || []).length > 0 && (
                    <span className="text-[10px] text-[#1B2A4A]/40">{activeMatch.scoresheetStats.length} relevé{activeMatch.scoresheetStats.length > 1 ? "s" : ""} enregistré{activeMatch.scoresheetStats.length > 1 ? "s" : ""}</span>
                  )}
                </div>
                {scoresheetError && (
                  <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span>{scoresheetError}</span>
                    <button onClick={() => setScoresheetError(null)} className="text-red-400 hover:text-red-600 ml-2"><X size={12} /></button>
                  </div>
                )}
                {(activeMatch.scoresheetStats || []).length > 0 && (
                  <div className="mb-6 space-y-2">
                    {activeMatch.scoresheetStats.map((s, i) => (
                      <div key={s.id} className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[#1B2A4A]">{s.quartTemps ? `Quart-temps ${s.quartTemps}` : `Relevé ${i + 1}`}</span>
                          <div className="flex items-center gap-2">
                            {(s.scoreEquipe != null || s.scoreAdverse != null) && (
                              <span className="text-xs text-[#1B2A4A]/60">{s.scoreEquipe ?? "?"} - {s.scoreAdverse ?? "?"}</span>
                            )}
                            <button onClick={() => updateActiveMatch({ scoresheetStats: activeMatch.scoresheetStats.filter(x => x.id !== s.id) })}
                              className="text-[#1B2A4A]/30 hover:text-red-600"><X size={14} /></button>
                          </div>
                        </div>
                        {s.joueurs?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.joueurs.map((j, ji) => (
                              <span key={ji} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B2A4A]/8 text-[#1B2A4A]/70">
                                #{j.numero} · {j.points ?? "?"}pts{j.fautes !== "" && j.fautes != null ? ` · ${j.fautes}f` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.incertitudes && <p className="text-[10px] text-[#1B2A4A]/40 italic mt-1.5">⚠️ {s.incertitudes}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Four Factors : saisie manuelle par quart-temps, gratuite (pas d'IA) — voir
                    computeFourFactors/sumQuarterStats ci-dessus. */}
                <div className="mb-6 border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#1B2A4A] uppercase tracking-wide">Four Factors</h3>
                    <button onClick={() => { setQsDraft({ quarter: (activeMatch.quarterStats || []).length + 1, nous: emptyQuarterTeamStats(), adverse: emptyQuarterTeamStats() }); setQsFormOpen(true); }}
                      className="text-xs font-semibold text-white px-3 py-1.5 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>
                      + Stats du quart-temps
                    </button>
                  </div>
                  {(activeMatch.quarterStats || []).length === 0 ? (
                    <p className="text-xs text-[#1B2A4A]/40">Aucune stat saisie pour l'instant.</p>
                  ) : (() => {
                    const nousTotal = sumQuarterStats("nous");
                    const advTotal = sumQuarterStats("adverse");
                    const nousFF = computeFourFactors(nousTotal, advTotal);
                    const advFF = computeFourFactors(advTotal, nousTotal);
                    // Pondération classique de Dean Oliver : eFG% pèse le plus dans le résultat
                    // (40%), puis pertes de balle (25%), rebonds offensifs (20%), lancers francs (15%).
                    const rows = [
                      { key: "eFG%", noun: "l'efficacité aux tirs", label: "eFG% (efficacité tirs)", nous: nousFF.efg, adv: advFF.efg, weight: 0.4 },
                      { key: "TOV%", noun: "la gestion du ballon", label: "TOV% (pertes de balle)", nous: nousFF.tovPct, adv: advFF.tovPct, lowerIsBetter: true, weight: 0.25 },
                      { key: "ORB%", noun: "les rebonds offensifs", label: "ORB% (rebonds offensifs)", nous: nousFF.orbPct, adv: advFF.orbPct, weight: 0.2 },
                      { key: "FT Rate", noun: "les lancers francs", label: "FT Rate (lancers francs)", nous: nousFF.ftRate, adv: advFF.ftRate, weight: 0.15 },
                    ].map(r => ({ ...r, nousBetter: r.lowerIsBetter ? r.nous < r.adv : r.nous > r.adv, advBetter: r.lowerIsBetter ? r.adv < r.nous : r.adv > r.nous }));

                    const nousWins = rows.filter(r => r.nousBetter);
                    const advWins = rows.filter(r => r.advBetter);
                    const nousScore = nousWins.reduce((s, r) => s + r.weight, 0);
                    const advScore = advWins.reduce((s, r) => s + r.weight, 0);
                    const listNouns = (list) => list.map(r => r.noun).join(", ").replace(/, ([^,]*)$/, " et $1");
                    let interpretation;
                    if (nousWins.length === 0 && advWins.length === 0) {
                      interpretation = "Statistiques trop proches ou incomplètes pour dégager une tendance claire.";
                    } else if (nousScore > advScore) {
                      interpretation = `Avantage à NOUS : meilleurs sur ${listNouns(nousWins) || "aucun facteur à égalité"}${advWins.length ? `, l'adversaire ne prend le dessus que sur ${listNouns(advWins)}` : ""} — et le facteur le plus déterminant (eFG%) penche ${rows[0].nousBetter ? "en notre faveur" : "du côté adverse"}.`;
                    } else if (advScore > nousScore) {
                      interpretation = `Avantage à L'ADVERSAIRE : meilleur sur ${listNouns(advWins) || "aucun facteur à égalité"}${nousWins.length ? `, nous ne prenons le dessus que sur ${listNouns(nousWins)}` : ""} — et le facteur le plus déterminant (eFG%) penche ${rows[0].advBetter ? "de leur côté" : "en notre faveur"}.`;
                    } else {
                      interpretation = "Match très équilibré sur les Four Factors — aucun camp ne domine clairement.";
                    }

                    return (
                      <div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5 px-1">
                          <span>Facteur</span><span className="text-center">Nous</span><span className="text-center">Adverse</span>
                        </div>
                        <div className="space-y-1">
                          {rows.map(r => (
                            <div key={r.label} className="grid grid-cols-3 gap-2 items-center bg-[#F2EDE4] rounded-lg px-2 py-1.5">
                              <span className="text-xs text-[#1B2A4A]">{r.label}</span>
                              <span className={`text-sm font-bold text-center ${r.nousBetter ? "text-green-600" : "text-[#1B2A4A]"}`}>{r.nous.toFixed(1)}%</span>
                              <span className={`text-sm font-bold text-center ${r.advBetter ? "text-red-600" : "text-[#1B2A4A]/60"}`}>{r.adv.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[#1B2A4A] bg-[#FF6B35]/8 border border-[#FF6B35]/20 rounded-lg px-3 py-2 mt-3">{interpretation}</p>
                        <p className="text-[10px] text-[#1B2A4A]/40 mt-2 mb-1">Cumul sur {activeMatch.quarterStats.length} quart(s)-temps saisi(s) :</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMatch.quarterStats.map(q => (
                            <span key={q.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1B2A4A]/8 text-[#1B2A4A]/70">
                              Q{q.quarter}
                              <button onClick={() => updateActiveMatch({ quarterStats: activeMatch.quarterStats.filter(x => x.id !== q.id) })}
                                className="hover:text-red-600"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {matchTypeOptions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Type</div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {matchTypeOptions.map(t => (
                        <button key={t} onClick={() => setMatchTypeFilters(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${matchTypeFilters.includes(t) ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                          style={matchTypeFilters.includes(t) ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                          {t}
                        </button>
                      ))}
                      {matchTypeFilters.length > 0 && (
                        <button onClick={() => setMatchTypeFilters([])} className="px-3 py-1.5 rounded-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A]">✕ Effacer</button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-3" id="match-tf-filters">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Temps fort observé</div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[...new Set([...tfOptions, ...tfFilters])].map(tf => (
                      <button key={tf} onClick={() => setTfFilters(f => f.includes(tf) ? f.filter(x => x !== tf) : [...f, tf])}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${tfFilters.includes(tf) ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                        style={tfFilters.includes(tf) ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                        {tf}
                      </button>
                    ))}
                    {tfFilters.length > 0 && (
                      <button onClick={() => setTfFilters([])} className="px-3 py-1.5 rounded-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A]">✕ Effacer</button>
                    )}
                    <input value={newTfInput} onChange={e => setNewTfInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newTfInput.trim()) {
                          e.preventDefault();
                          const tf = newTfInput.trim();
                          setTfFilters(f => f.includes(tf) ? f : [...f, tf]);
                          setNewTfInput("");
                        }
                      }}
                      placeholder="Rechercher ou + écrire un temps fort..." className="px-3 py-1.5 rounded-full text-sm border border-dashed border-[#1B2A4A]/30 outline-none focus:border-[#FF6B35] w-56" />
                    {(() => {
                      const q = newTfInput.trim().toLowerCase();
                      if (!q) return null;
                      const suggestions = usedTempsForts.filter(t => t.toLowerCase().includes(q) && !tfFilters.includes(t));
                      const exactMatch = usedTempsForts.some(t => t.toLowerCase() === q);
                      return (
                        <>
                          {suggestions.map(t => (
                            <button key={t} onClick={() => { setTfFilters(f => [...f, t]); setNewTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">
                              {t}
                            </button>
                          ))}
                          {!exactMatch && (
                            <button onClick={() => { const tf = newTfInput.trim(); setTfFilters(f => f.includes(tf) ? f : [...f, tf]); setNewTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
                              + Ajouter "{newTfInput.trim()}"
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">
                    {tfFilters.length > 0 ? `${filteredPlays.length} système${filteredPlays.length !== 1 ? "s" : ""} correspondant${filteredPlays.length !== 1 ? "s" : ""}` : "Tous les systèmes"}{activeMatch.bothScouted ? ` — ${activeMatch.scoutedTeam}` : ""}
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredPlays.map(p => {
                      const entry = activeMatch.tally?.[p.id];
                      const played = playedOf(entry), points = pointsOf(entry), possible = possibleOf(entry);
                      return (
                      <div key={p.id} className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => savePlays(plays.map(x => x.id === p.id ? { ...x, favorite: !x.favorite } : x))}
                                title={p.favorite ? "Retirer des favoris" : "Mettre en favori"} className="flex-shrink-0">
                                <Star size={15} fill={p.favorite ? "#FF6B35" : "none"} className={p.favorite ? "text-[#FF6B35]" : "text-[#1B2A4A]/25 hover:text-[#1B2A4A]/50"} />
                              </button>
                              <div className="font-semibold text-[#1B2A4A]">{p.titre}</div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tfOf(p).map((t, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A]/70">{t}</span>)}
                              {p.intention && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">{p.intention}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold" style={{ color: "var(--sport-accent)" }}>{played}</div>
                            {possible > 0 && <div className="text-[10px] text-[#1B2A4A]/40">{points}/{possible} pts</div>}
                            {played > 0 && <div className="text-[10px] font-semibold text-[#1B2A4A]/60">{(points / played).toFixed(2)} pts/poss.</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => recordOutcome(p.id, null)}
                            className="px-4 py-3 rounded-lg text-sm font-semibold border border-[#1B2A4A]/20 text-[#1B2A4A]/70 hover:bg-[#1B2A4A]/5 active:bg-[#1B2A4A]/10">Compter (sans tir)</button>
                          <span className="w-px h-9 bg-[#1B2A4A]/10 mx-1" />
                          {[-3, -2].map(v => (
                            <button key={v} onClick={() => requestMissContext(p.id, v)}
                              className="w-14 h-14 rounded-lg text-xl font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100">{v}</button>
                          ))}
                          <button onClick={() => recordOutcome(p.id, 1)} title="Tir manqué avec faute, lancer franc marqué : compte une nouvelle action"
                            className="w-14 h-14 rounded-lg text-sm font-bold border-2 border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100">LF1</button>
                          <button onClick={() => addBonusPoint(p.id, "&1")} title="Et-1 : panier marqué + faute, le lancer franc s'ajoute à la même action"
                            className="w-14 h-14 rounded-lg text-sm font-bold border-2 border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100">&amp;1</button>
                          {[2, 3].map(v => (
                            <button key={v} onClick={() => recordOutcome(p.id, v)}
                              className="w-14 h-14 rounded-lg text-xl font-bold border-2 border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100">+{v}</button>
                          ))}
                        </div>
                      </div>
                      );
                    })}
                    {filteredPlays.length === 0 && <p className="text-sm text-[#1B2A4A]/40">Aucun système ne correspond à ce filtre.</p>}
                  </div>
                </div>

                {newPlayOpen ? (
                  <div className="flex items-center gap-2 mb-6">
                    <input autoFocus value={newPlayName} onChange={e => setNewPlayName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newPlayName.trim()) {
                          const np = { id: uid(), titre: newPlayName.trim(), type: playTypes[0], scoutedTeam: activeMatch.scoutedTeam, tempsFort: tfFilters, intention: "", description: "", notes: "", tags: [], images: [], schemas: [], createdAt: new Date().toISOString() };
                          savePlays([...plays, np]);
                          recordOutcome(np.id, null);
                        }
                        if (e.key === "Escape") { setNewPlayOpen(false); setNewPlayName(""); }
                      }}
                      placeholder="Nom du nouveau système" className="flex-1 border border-[#FF6B35] rounded-md px-3 py-2 text-sm outline-none" />
                    <button onClick={() => {
                      if (!newPlayName.trim()) return;
                      const np = { id: uid(), titre: newPlayName.trim(), type: playTypes[0], scoutedTeam: activeMatch.scoutedTeam, tempsFort: tfFilters, intention: "", description: "", notes: "", tags: [], images: [], schemas: [], createdAt: new Date().toISOString() };
                      savePlays([...plays, np]);
                      recordOutcome(np.id, null);
                    }} className="text-sm font-semibold text-white px-3 py-2 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>Ajouter</button>
                    <button onClick={() => { setNewPlayOpen(false); setNewPlayName(""); }} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={18} /></button>
                  </div>
                ) : (
                  <button onClick={() => setNewPlayOpen(true)} className="mb-6 px-4 py-2 rounded-md text-sm font-semibold border-2 border-dashed border-[#FF6B35]/40 text-[#FF6B35] hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-colors">
                    + Nouveau play
                  </button>
                )}

                <div className="flex items-center justify-between border-t border-[#1B2A4A]/10 pt-4 flex-wrap gap-2">
                  <span className="text-xs text-[#1B2A4A]/40">Classement par fréquence : {sorted.filter(p => playedOf(activeMatch.tally?.[p.id]) > 0).map(p => `${p.titre} (${playedOf(activeMatch.tally[p.id])})`).join(", ") || "aucun système compté pour l'instant"}</span>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <button onClick={() => {
                      const rows = sorted.map(p => ({
                        titre: p.titre,
                        tempsFort: tfOf(p),
                        played: playedOf(activeMatch.tally?.[p.id]),
                        points: pointsOf(activeMatch.tally?.[p.id]),
                        possible: possibleOf(activeMatch.tally?.[p.id]),
                        openMisses: openMissesOf(activeMatch.tally?.[p.id]),
                        contestedMisses: contestedMissesOf(activeMatch.tally?.[p.id]),
                      })).filter(r => r.played > 0);
                      const scoreInfo = { homeLabel: "Locaux", awayLabel: "Visiteurs", homeTeamName, awayTeamName, scoreHome, scoreAway };
                      const html = buildMatchReportHtml(activeMatch, rows, scoreInfo);
                      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                      downloadBlob(blob, `${slugifyForFile(activeMatch.scoutedTeam || "match")}-${activeMatch.date || ""}.html`);
                    }} className="text-xs font-medium text-[#FF6B35] hover:underline">📤 Exporter les systèmes joués</button>
                    <button onClick={async () => {
                      const ok = await cpbAlert?.("Réinitialiser le comptage de ce match ? Les valeurs actuelles seront perdues.", { confirm: true });
                      if (ok) updateActiveMatch({ tally: {} });
                    }} className="text-xs text-red-500 hover:underline">Réinitialiser</button>
                  </div>
                </div>

                <MatchFavoritesPanel plays={plays.filter(p => (activeMatch.favoritePlayIds || []).includes(p.id))} onViewPlay={setViewingPlay} />

                {qsFormOpen && qsDraft && (() => {
                  const fields = [
                    { key: "fgm", label: "Tirs réussis" },
                    { key: "fga", label: "Tirs tentés" },
                    { key: "tpm", label: "dont 3pts réussis" },
                    { key: "tov", label: "Balles perdues" },
                    { key: "oreb", label: "Rebonds offensifs" },
                    { key: "dreb", label: "Rebonds défensifs" },
                    { key: "ftm", label: "LF réussis" },
                    { key: "fta", label: "LF tentés" },
                  ];
                  const setField = (side, key, val) => setQsDraft(d => ({ ...d, [side]: { ...d[side], [key]: val } }));
                  return (
                    <div className="fixed inset-0 z-[600] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setQsFormOpen(false)}>
                      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[#1B2A4A]/10 flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#1B2A4A]">Stats du quart-temps</span>
                          <input type="number" min={1} value={qsDraft.quarter}
                            onChange={e => setQsDraft(d => ({ ...d, quarter: Number(e.target.value) || 1 }))}
                            className="w-16 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                          <div className="grid grid-cols-2 gap-4">
                            {[{ side: "nous", label: "Nous" }, { side: "adverse", label: "Adverse" }].map(({ side, label }) => (
                              <div key={side}>
                                <div className="text-xs font-bold uppercase tracking-wide text-[#1B2A4A]/50 mb-2">{label}</div>
                                <div className="space-y-1.5">
                                  {fields.map(f => (
                                    <div key={f.key}>
                                      <div className="text-[10px] text-[#1B2A4A]/40">{f.label}</div>
                                      <input type="number" min={0} value={qsDraft[side][f.key]}
                                        onFocus={e => e.target.select()}
                                        onChange={e => setField(side, f.key, e.target.value)}
                                        className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-sm" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 border-t border-[#1B2A4A]/10 flex gap-2">
                          <button onClick={() => setQsFormOpen(false)} className="flex-1 border border-[#1B2A4A]/20 text-[#1B2A4A] py-2 rounded-lg text-sm">Annuler</button>
                          <button onClick={() => {
                            const entry = { id: uid(), ...qsDraft };
                            updateActiveMatch({ quarterStats: [...(activeMatch.quarterStats || []), entry] });
                            setQsFormOpen(false); setQsDraft(null);
                          }} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Enregistrer</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {scoresheetDraft && (
                  <div className="fixed inset-0 z-[600] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setScoresheetDraft(null)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      <div className="p-4 border-b border-[#1B2A4A]/10">
                        <div className="text-sm font-semibold text-[#1B2A4A]">Vérifie avant d'enregistrer</div>
                        <p className="text-[10px] text-[#1B2A4A]/40 mt-0.5">L'IA peut se tromper sur une écriture manuscrite — corrige ce qui ne va pas avant d'enregistrer.</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <div className="text-[10px] uppercase text-[#1B2A4A]/40 mb-1">Quart-temps</div>
                            <input type="number" min={1} value={scoresheetDraft.quartTemps ?? ""}
                              onChange={e => setScoresheetDraft(d => ({ ...d, quartTemps: e.target.value === "" ? null : Number(e.target.value) }))}
                              className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-[#1B2A4A]/40 mb-1">Score nous</div>
                            <input type="number" value={scoresheetDraft.scoreEquipe ?? ""}
                              onChange={e => setScoresheetDraft(d => ({ ...d, scoreEquipe: e.target.value === "" ? null : Number(e.target.value) }))}
                              className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-[#1B2A4A]/40 mb-1">Score adverse</div>
                            <input type="number" value={scoresheetDraft.scoreAdverse ?? ""}
                              onChange={e => setScoresheetDraft(d => ({ ...d, scoreAdverse: e.target.value === "" ? null : Number(e.target.value) }))}
                              className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm" />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-[#1B2A4A]/40 mb-1.5">Joueurs</div>
                          <div className="space-y-1.5">
                            {scoresheetDraft.joueurs.map((j, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <input value={j.numero}
                                  onChange={e => setScoresheetDraft(d => ({ ...d, joueurs: d.joueurs.map((x, xi) => xi === i ? { ...x, numero: e.target.value } : x) }))}
                                  placeholder="N°" className="w-14 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-xs" />
                                <input type="number" value={j.points}
                                  onChange={e => setScoresheetDraft(d => ({ ...d, joueurs: d.joueurs.map((x, xi) => xi === i ? { ...x, points: e.target.value } : x) }))}
                                  placeholder="Pts" className="flex-1 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-xs" />
                                <input type="number" value={j.fautes}
                                  onChange={e => setScoresheetDraft(d => ({ ...d, joueurs: d.joueurs.map((x, xi) => xi === i ? { ...x, fautes: e.target.value } : x) }))}
                                  placeholder="Fautes" className="flex-1 border border-[#1B2A4A]/20 rounded-md px-2 py-1 text-xs" />
                                <button onClick={() => setScoresheetDraft(d => ({ ...d, joueurs: d.joueurs.filter((_, xi) => xi !== i) }))}
                                  className="text-[#1B2A4A]/30 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
                              </div>
                            ))}
                            <button onClick={() => setScoresheetDraft(d => ({ ...d, joueurs: [...d.joueurs, { numero: "", points: "", fautes: "" }] }))}
                              className="text-xs text-[#FF6B35] hover:underline">+ Ajouter un joueur</button>
                          </div>
                        </div>
                        {scoresheetDraft.incertitudes && (
                          <p className="text-xs text-[#1B2A4A]/50 italic">⚠️ L'IA signale : {scoresheetDraft.incertitudes}</p>
                        )}
                      </div>
                      <div className="p-4 border-t border-[#1B2A4A]/10 flex gap-2">
                        <button onClick={() => setScoresheetDraft(null)} className="flex-1 border border-[#1B2A4A]/20 text-[#1B2A4A] py-2 rounded-lg text-sm">Annuler</button>
                        <button onClick={() => {
                          const entry = { id: uid(), ...scoresheetDraft, createdAt: new Date().toISOString() };
                          updateActiveMatch({ scoresheetStats: [...(activeMatch.scoresheetStats || []), entry] });
                          setScoresheetDraft(null);
                        }} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Enregistrer</button>
                      </div>
                    </div>
                  </div>
                )}

                {favPlayPickerOpen && (
                  <div className="fixed inset-0 z-[600] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setFavPlayPickerOpen(false)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      <div className="p-4 border-b border-[#1B2A4A]/10">
                        <div className="text-sm font-semibold text-[#1B2A4A] mb-2">Mes systèmes proposés au coach (max 4)</div>
                        <input value={favPlaySearch} onChange={e => setFavPlaySearch(e.target.value)} placeholder="Rechercher un play..."
                          className="w-full text-sm border border-[#1B2A4A]/20 rounded-lg px-3 py-2 bg-white/60 outline-none focus:border-[#FF6B35]" />
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {plays.filter(p => p.titre?.toLowerCase().includes(favPlaySearch.trim().toLowerCase())).map(p => {
                          const chosen = (activeMatch.favoritePlayIds || []).includes(p.id);
                          const maxed = (activeMatch.favoritePlayIds || []).length >= 4;
                          return (
                            <button key={p.id} disabled={!chosen && maxed}
                              onClick={() => {
                                const cur = activeMatch.favoritePlayIds || [];
                                updateActiveMatch({ favoritePlayIds: chosen ? cur.filter(id => id !== p.id) : [...cur, p.id] });
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-sm transition-colors ${chosen ? "bg-[#FF6B35]/10 border-[#FF6B35] text-[#1B2A4A]" : maxed ? "border-[#1B2A4A]/10 text-[#1B2A4A]/30 cursor-not-allowed" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:border-[#FF6B35]/40"}`}>
                              <span className="truncate">{p.titre}</span>
                              {chosen && <Check size={14} className="text-[#FF6B35] flex-shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-4 border-t border-[#1B2A4A]/10">
                        <button onClick={() => setFavPlayPickerOpen(false)} className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Fermer</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // ── Vue "liste des matchs" ──────────────────────────────────────────────
          return (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>MODE MATCH</h2>
            <p className="text-xs text-[#1B2A4A]/40 mb-5">Fonctionnalité en test, visible uniquement par toi (admin). Planifie un match, puis clique dessus pour activer la saisie en direct.</p>

            {newMatchOpen ? (
              <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Date du match</div>
                    <input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)}
                      className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Heure</div>
                    <input type="time" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)}
                      className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Championnat</div>
                  <input value={newMatchChampionnat} onChange={e => setNewMatchChampionnat(e.target.value)} placeholder="Ex: NM1"
                    className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                </div>
                {teams.length > 1 && (
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Rattacher à (stats internes)</div>
                    <select value={newMatchTeamId || activeTeamId || ""} onChange={e => setNewMatchTeamId(e.target.value)}
                      className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white">
                      {teams.map(t => <option key={t.id} value={t.id}>{t.nom}{t.niveau ? ` · ${t.niveau}` : ""}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Locaux</div>
                    <input value={newMatchTeamHome} onChange={e => setNewMatchTeamHome(e.target.value)} placeholder="Ex: Besançon"
                      list="scouted-teams-list" className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Visiteurs</div>
                    <input value={newMatchTeamAway} onChange={e => setNewMatchTeamAway(e.target.value)} placeholder="Ex: SCABB"
                      list="scouted-teams-list" className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                  </div>
                  <datalist id="scouted-teams-list">{scoutedTeams.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                {newMatchTeamHome.trim() && newMatchTeamAway.trim() && (
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Équipe que je scoute en direct</div>
                    <div className="flex gap-2">
                      {[{ v: "home", label: newMatchTeamHome.trim() }, { v: "away", label: newMatchTeamAway.trim() }, { v: "both", label: "Les deux" }].map(opt => (
                        <button key={opt.v} onClick={() => setNewMatchScoutTarget(opt.v)}
                          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium border ${newMatchScoutTarget === opt.v ? "text-white" : "border-[#1B2A4A]/20 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                          style={newMatchScoutTarget === opt.v ? { backgroundColor: "var(--sport-accent)", borderColor: "var(--sport-accent)" } : undefined}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {newMatchScoutTarget === "both" && (
                      <p className="text-[11px] text-[#1B2A4A]/40 mt-1.5">Un bouton dans l'écran de saisie permettra de basculer rapidement entre les deux Playbooks.</p>
                    )}
                  </div>
                )}
                {newMatchTeamHome.trim() && newMatchTeamAway.trim() && (
                  <p className="text-xs text-[#1B2A4A]/50 mb-3 italic">{newMatchTeamHome.trim()} vs {newMatchTeamAway.trim()}{newMatchTime ? ` · ${newMatchTime}` : ""}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (!newMatchTeamHome.trim() || !newMatchTeamAway.trim()) { cpbAlert?.("Indique le nom des deux équipes."); return; }
                    if (!newMatchScoutTarget) { cpbAlert?.("Choisis l'équipe que tu scoutes en direct."); return; }
                    const chosenTeam = teams.find(t => t.id === (newMatchTeamId || activeTeamId)) || team;
                    // "both" scoute d'abord l'équipe qui reçoit ; le bouton de bascule en direct
                    // échange ensuite scoutedTeam/ourTeam/homeAway (voir switchScoutSide).
                    const initialSide = newMatchScoutTarget === "away" ? "away" : "home";
                    const scoutedTeam = (initialSide === "home" ? newMatchTeamHome : newMatchTeamAway).trim();
                    const ourTeam = (initialSide === "home" ? newMatchTeamAway : newMatchTeamHome).trim();
                    const homeAway = initialSide === "home" ? "exterieur" : "domicile";
                    const m = {
                      id: uid(), date: newMatchDate, time: newMatchTime || null, championnat: newMatchChampionnat.trim(),
                      ourTeam, teamId: chosenTeam?.id || null, homeAway, bothScouted: newMatchScoutTarget === "both",
                      scoutedTeam, tally: {}, createdAt: new Date().toISOString(),
                    };
                    saveMatchSessions([...matchSessions, m]);
                    setNewMatchOpen(false); setNewMatchChampionnat(""); setNewMatchTime(""); setNewMatchTeamId(null);
                    setNewMatchTeamHome(""); setNewMatchTeamAway(""); setNewMatchScoutTarget("");
                    setActiveMatchId(m.id);
                  }} className="text-sm font-semibold text-white px-4 py-2 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>Créer le match</button>
                  <button onClick={() => setNewMatchOpen(false)} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A] px-4 py-2">Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewMatchOpen(true)} className="mb-5 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "var(--sport-accent)" }}>
                <Plus size={15} /> Nouveau match
              </button>
            )}

            <div className="flex flex-col gap-2">
              {[...matchSessions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map(m => {
                const playedOfEntry = (entry) => typeof entry === "number" ? entry : (entry?.played || 0);
                const topPlayId = Object.entries(m.tally || {}).sort((a, b) => playedOfEntry(b[1]) - playedOfEntry(a[1]))[0]?.[0];
                const topPlay = plays.find(p => p.id === topPlayId);
                const total = Object.values(m.tally || {}).reduce((s, e) => s + playedOfEntry(e), 0);
                return (
                  <div key={m.id} onClick={() => setActiveMatchId(m.id)}
                    className="flex items-center justify-between border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 cursor-pointer hover:border-[#FF6B35] hover:shadow-md transition-all">
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">
                        {m.homeAway === "exterieur" ? `${m.scoutedTeam} vs ${m.ourTeam || "Nous"}` : `${m.ourTeam || "Nous"} vs ${m.scoutedTeam}`}
                      </div>
                      <div className="text-xs text-[#1B2A4A]/50">{m.date ? new Date(m.date).toLocaleDateString("fr-FR") : "Date inconnue"}{m.time && ` · ${m.time}`}{m.championnat && ` · ${m.championnat}`}{total > 0 && ` · ${total} système${total !== 1 ? "s" : ""} comptabilisé${total !== 1 ? "s" : ""}`}{topPlay && ` · Le + joué : ${topPlay.titre}`}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); saveMatchSessions(matchSessions.filter(x => x.id !== m.id)); }}
                      className="text-[#1B2A4A]/30 hover:text-red-600 flex-shrink-0 ml-3"><Trash2 size={16} /></button>
                  </div>
                );
              })}
              {matchSessions.length === 0 && !newMatchOpen && <p className="text-sm text-[#1B2A4A]/40">Aucun match planifié pour l'instant.</p>}
            </div>
          </div>
          );
        })()}

        {view === "videoscout" && isAdmin && (() => {
          const tfOf = (p) => Array.isArray(p.tempsFort) ? p.tempsFort : (p.tempsFort ? [p.tempsFort] : []);
          const playedOf = (entry) => typeof entry === "number" ? entry : (entry?.played || 0);
          const pointsOf = (entry) => typeof entry === "number" ? 0 : (entry?.points || 0);
          const possibleOf = (entry) => typeof entry === "number" ? 0 : (entry?.possible || 0);
          const openMissesOf = (entry) => typeof entry === "number" ? 0 : (entry?.openMisses || 0);
          const contestedMissesOf = (entry) => typeof entry === "number" ? 0 : (entry?.contestedMisses || 0);
          const scoutedTeams = [...new Set(plays.map(p => p.scoutedTeam).filter(Boolean))].sort();
          // Suggestions réutilisées d'une session à l'autre (mêmes défenses souvent nommées pareil).
          const usedDefenses = [...new Set(videoScoutSessions.flatMap(s => Object.keys(s.defenses || {})))].sort();
          const activeVs = videoScoutSessions.find(s => s.id === activeVideoScoutId) || null;
          const updateActiveVs = (patch) => saveVideoScoutSessions(videoScoutSessions.map(s => s.id === activeVideoScoutId ? { ...s, ...patch } : s));
          const bumpDefense = (name, delta) => {
            const next = { ...(activeVs.defenses || {}) };
            const v = (next[name] || 0) + delta;
            if (v <= 0) delete next[name]; else next[name] = v;
            updateActiveVs({ defenses: next });
          };

          // ── Box score d'équipe (Excel .xlsx) ────────────────────────────────────────
          const handleBoxScoreFile = async (file) => {
            if (!file) return;
            try {
              if (/\.xls$/i.test(file.name)) throw new Error("ancien format .xls : ouvre-le dans Excel / Numbers et enregistre-le en .xlsx");
              const rows = await readXlsxFirstSheet(await file.arrayBuffer());
              // Fiche "Team comparison" (une stat par ligne, une colonne par équipe) ou box score match par match.
              const isBox = rows.some(r => r.some(c => /^(opponent|adversaire)$/i.test(String(c ?? "").trim())));
              if (!isBox) {
                const teams = parseTeamComparisonRows(rows);
                updateActiveVs({ comparison: { fileName: file.name, teams, importedAt: new Date().toISOString() } });
                cpbAlert?.(`Comparaison ${teams[0].name} / ${teams[1].name} importée — section « Face à face » ajoutée au récap.`);
                return;
              }
              const games = parseBoxScoreRows(rows);
              updateActiveVs({ boxScore: { fileName: file.name, games, importedAt: new Date().toISOString() } });
              cpbAlert?.(`${games.length} match${games.length > 1 ? "s" : ""} importé${games.length > 1 ? "s" : ""} — le profil statistique apparaît dans le récap.`);
            } catch (e) { cpbAlert?.("Import impossible : " + e.message); }
          };

          // ── Attaques importées depuis un XML Sportscode ────────────────────────────
          const handleXmlFile = async (file) => {
            if (!file) return;
            try {
              const { instances, ignored } = parseSportscodeXml(await file.text());
              const labelCounts = new Map(), codeCounts = new Map();
              instances.forEach(inst => {
                codeCounts.set(inst.code, (codeCounts.get(inst.code) || 0) + 1);
                inst.labels.filter(l => !isSportscodeResult(l)).forEach(l => {
                  const k = l.text.toLowerCase(), e = labelCounts.get(k) || { key: k, label: l.text, group: l.group, count: 0 };
                  e.count++; labelCounts.set(k, e);
                });
              });
              const codes = [...codeCounts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
              // Par défaut : les séquences d'attaque seulement (une défense taguée n'est pas une attaque).
              const hasAtt = codes.some(c => /att/i.test(c.code));
              setVsImportPreview({
                fileName: file.name, instances, ignored, codes,
                labels: [...labelCounts.values()].sort((a, b) => b.count - a.count),
                // Groupe dont le nom évoque une défense (DEF, DEFENSE PNR...) : ventilation par défaut.
                // Rôle de chaque groupe : celui choisi lors d'un import précédent (mémorisé), sinon
                // déduit du nom (DEF → défense adverse, joueur/player → ignoré).
                ...(() => {
                  let saved = {};
                  try { saved = JSON.parse(localStorage.getItem("cpb_vs_group_roles_v2") || "{}"); } catch {}
                  const names = [...new Set([...labelCounts.values()].map(l => l.group || "Libellés"))];
                  // Dans une ATTAQUE, les écrans / écrans non porteur / défense collective sont la défense
                  // ADVERSE rencontrée ; joueurs et marqueurs de montage ne définissent pas une attaque.
                  const autoRole = (g) => /joueur|player|nom\b|montage|tag ?up/i.test(g) ? "ignored" : /def|[eé]cran|porteur|post ?up/i.test(g) ? "defense" : "attack";
                  const roleOf = (g) => saved[g.toLowerCase()] || autoRole(g);
                  return { defenseGroups: names.filter(g => roleOf(g) === "defense"), ignoredGroups: names.filter(g => roleOf(g) === "ignored"), autoRoles: Object.fromEntries(names.map(g => [g.toLowerCase(), autoRole(g)])) };
                })(),
                // Tout ce que fait l'équipe en défense (écrans, écrans non porteur, post up, défense
                // collective, remises en jeu...) ; on écarte seulement l'intention (clé de lecture), les
                // joueurs, les marqueurs de montage et "tag up".
                defensePie: [...new Set(instances.filter(i => /^def/i.test(i.code)).flatMap(i => i.labels.filter(l => !isSportscodeResult(l)).map(l => l.group || "Libellés")))].filter(g => !/intention|joueur|player|nom\b|montage|tag ?up/i.test(g)),
                excluded: [], excludedCodes: hasAtt ? codes.filter(c => !/att/i.test(c.code)).map(c => c.code) : [],
              });
            } catch (e) { cpbAlert?.("Import impossible : " + e.message); }
          };
          const confirmXmlImport = () => {
            const groups = groupSportscodeInstances(vsImportPreview.instances, vsImportPreview.excluded, vsImportPreview.excludedCodes, vsImportPreview.defenseGroups, vsImportPreview.ignoredGroups);
            const prev = new Map((activeVs.attacks || []).map(a => [a.key, a]));
            // Mémorise le rôle choisi pour chaque groupe (joueurs ignorés, défense adverse...) : les
            // imports suivants repartent de ces choix sans avoir à tout recocher.
            try {
              // On ne retient que les choix qui s'écartent du réglage automatique : un défaut qui évolue
              // continue ainsi de s'appliquer aux groupes que tu n'as jamais touchés.
              const roles = {}, auto = vsImportPreview.autoRoles || {};
              [...new Set(vsImportPreview.labels.map(l => l.group || "Libellés"))].forEach(g => {
                const role = vsImportPreview.ignoredGroups.includes(g) ? "ignored" : vsImportPreview.defenseGroups.includes(g) ? "defense" : "attack";
                if (role !== auto[g.toLowerCase()]) roles[g.toLowerCase()] = role;
              });
              const prevRoles = JSON.parse(localStorage.getItem("cpb_vs_group_roles_v2") || "{}");
              [...new Set(vsImportPreview.labels.map(l => (l.group || "Libellés").toLowerCase()))].forEach(k => delete prevRoles[k]);
              localStorage.setItem("cpb_vs_group_roles_v2", JSON.stringify({ ...prevRoles, ...roles }));
            } catch {}
            updateActiveVs({ defenseInstances: collectSportscodeDefense(vsImportPreview.instances, vsImportPreview.ignoredGroups, vsImportPreview.excluded, vsImportPreview.defensePie), attacks: groups.map(g => ({ id: prev.get(g.key)?.id || uid(), key: g.key, labels: g.labels, count: g.count, xmlOutcomes: g.xmlOutcomes, xmlBonus: g.xmlBonus, byDefense: g.byDefense, outcomes: prev.get(g.key)?.outcomes || [], name: prev.get(g.key)?.name || "", sent: prev.get(g.key)?.sent || false })) });
            toast?.(`✓ ${groups.length} attaque${groups.length > 1 ? "s" : ""} importée${groups.length > 1 ? "s" : ""}`);
            setVsImportPreview(null);
          };
          const renameAttack = (id, name) => updateActiveVs({ attacks: (activeVs.attacks || []).map(a => a.id === id ? { ...a, name } : a) });
          // Envoie l'attaque dans le Playbook SANS l'y créer toute seule : ouvre le formulaire de play
          // pré-rempli pour que tu dessines le système puis l'enregistres (ou annules).
          const sendAttackToPlaybook = (a) => {
            const txt = (l) => typeof l === "string" ? l : l.text;
            const grp = (l) => typeof l === "string" ? "" : (l.group || "");
            const entries = a.labels.filter(l => /entr[ée]e/i.test(grp(l))).map(l => txt(l).replace(/^E_/i, ""));
            const intentions = a.labels.filter(l => /intention/i.test(grp(l))).map(txt);
            const others = a.labels.filter(l => !/entr[ée]e|intention/i.test(grp(l))).map(txt);
            const cat = attackCategoryOf(a);
            const wanted = cat === "Attaque placée" ? /syst[eè]me|offens|plac/i : new RegExp("^" + cat + "$", "i");
            const type = playTypes.find(t => wanted.test(t)) || playTypes[0];
            const st = attackStats(a);
            setEditingPlay({
              titre: a.name || [...entries, ...intentions].join(" / ") || "Attaque importée",
              type,
              scoutedTeam: activeVs.opponent,
              tags: [...new Set([...entries, ...intentions])],
              intention: intentions.join(" / "),
              description: entries.length > 1 ? "Déroulé : " + entries.join(" → ") : "",
              notes: `Importé de Sportscode (scouting vidéo ${activeVs.opponent}) — joué ${a.count}×` + (st.ppp !== null ? `, ${st.ppp.toFixed(2)} pts/possession` : "") + (others.length ? ` · ${others.join(", ")}` : ""),
              images: [], schemas: [],
              sourceAttackKeys: [a.key],
            });
            updateActiveVs({ attacks: (activeVs.attacks || []).map(x => x.id === a.id ? { ...x, sent: true } : x) });
            setPlaybookForm(true);
            setViewPersist("playbook");
          };
          const addAttackOutcome = (id, v) => updateActiveVs({ attacks: (activeVs.attacks || []).map(a => a.id === id ? { ...a, outcomes: [...(a.outcomes || []), v] } : a) });
          const undoAttackOutcome = (id) => updateActiveVs({ attacks: (activeVs.attacks || []).map(a => a.id === id ? { ...a, outcomes: (a.outcomes || []).slice(0, -1) } : a) });

          // Valide l'annonce en cours de saisie : retrouve le play existant (même titre pour
          // cette équipe, insensible à la casse) pour lui ajouter les temps forts éventuellement
          // manquants sans le dupliquer, ou en crée un nouveau si aucun ne correspond.
          const validateAnnounce = () => {
            const name = vsAnnounceName.trim();
            if (!name) return;
            const existing = plays.find(p => p.scoutedTeam === activeVs.opponent && p.titre?.trim().toLowerCase() === name.toLowerCase());
            let targetId;
            if (existing) {
              targetId = existing.id;
              const mergedTf = [...new Set([...(Array.isArray(existing.tempsFort) ? existing.tempsFort : (existing.tempsFort ? [existing.tempsFort] : [])), ...vsAnnounceTf])];
              savePlays(plays.map(p => p.id === existing.id ? { ...p, tempsFort: mergedTf } : p));
              toast?.(`✓ ${existing.titre} — temps forts mis à jour`);
            } else {
              const np = { id: uid(), titre: name, type: vsAnnounceType || playTypes[0], scoutedTeam: activeVs.opponent, tempsFort: vsAnnounceTf, intention: "", description: "", notes: "", tags: [], images: [], schemas: [], createdAt: new Date().toISOString() };
              targetId = np.id;
              savePlays([...plays, np]);
              toast?.(`✓ ${name} — nouveau système noté`);
            }
            setVsAnnounceName(""); setVsAnnounceTf([]); setVsAnnounceTfInput(""); setVsAnnounceType("");
            setVsTfFilters([]); setVsTypeFilters([]);
            setVsHighlightPlayId(targetId);
            setTimeout(() => document.getElementById(`vs-play-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
          };

          const recordVsOutcome = (playId, value, missContext = null) => {
            const cur = activeVs.tally?.[playId];
            const next = {
              played: playedOf(cur) + 1,
              points: pointsOf(cur) + (value > 0 ? value : 0),
              possible: possibleOf(cur) + (value ? Math.abs(value) : 0),
              openMisses: openMissesOf(cur) + (missContext === "ouvert" ? 1 : 0),
              contestedMisses: contestedMissesOf(cur) + (missContext === "conteste" ? 1 : 0),
            };
            updateActiveVs({ tally: { ...(activeVs.tally || {}), [playId]: next } });
            setVsHighlightPlayId(null);
            const playTitre = plays.find(p => p.id === playId)?.titre || "Système";
            const label = value ? (value > 0 ? `+${value}` : `${value}`) : "sans tir";
            const contextLabel = missContext === "ouvert" ? " (tir ouvert)" : missContext === "conteste" ? " (tir contesté)" : "";
            toast?.(`✓ ${playTitre} — ${label}${contextLabel}`);
          };
          const requestVsMissContext = (playId, value) => setVsPendingMiss({ playId, value });
          const resolveVsMissContext = (context) => {
            if (!vsPendingMiss) return;
            recordVsOutcome(vsPendingMiss.playId, vsPendingMiss.value, context);
            setVsPendingMiss(null);
          };

          if (activeVs) {
            const teamPlays = plays.filter(p => p.scoutedTeam === activeVs.opponent);
            const tfOptions = [...new Set(teamPlays.flatMap(tfOf))];
            // Toutes les catégories du Playbook (pas seulement celles déjà utilisées par cette
            // équipe) : utile pour filtrer par type avant même d'avoir noté un système dedans.
            const matchTypeOptions = playTypes;
            const filteredPlays = teamPlays
              .filter(p => vsTfFilters.every(f => tfOf(p).includes(f)))
              .filter(p => vsTypeFilters.length === 0 || vsTypeFilters.includes(p.type))
              .sort((a, b) => (b.id === vsHighlightPlayId ? 1 : 0) - (a.id === vsHighlightPlayId ? 1 : 0) || (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || playedOf(activeVs.tally?.[b.id]) - playedOf(activeVs.tally?.[a.id]));
            const sorted = [...teamPlays].sort((a, b) => playedOf(activeVs.tally?.[b.id]) - playedOf(activeVs.tally?.[a.id]));
            const totalTally = teamPlays.reduce((sum, p) => sum + playedOf(activeVs.tally?.[p.id]), 0);

            // Recherche dans les attaques importées : libellés cliqués (ET) + texte libre sur le nom
            // du play et les libellés (entrées, intentions...), défenses/joueurs/montage exclus.
            const atkLabels = (a) => a.labels.filter(l => typeof l === "string" || !ATTACK_HIDDEN_GROUP_RE.test(l.group || "")).map(attackLabelText);
            const atkQ = vsAtkQuery.trim().toLowerCase();
            const allAtks = [...(activeVs.attacks || [])].sort((a, b) => b.count - a.count);
            const visibleAttacks = allAtks.filter(a =>
              vsAtkFilters.every(f => atkLabels(a).some(t => t.toLowerCase() === f.toLowerCase())) &&
              (!atkQ || (a.name || "").toLowerCase().includes(atkQ) || atkLabels(a).some(t => t.toLowerCase().includes(atkQ))));
            const labelFreq = new Map();
            allAtks.forEach(a => atkLabels(a).forEach(t => { const k = t.toLowerCase(), e = labelFreq.get(k) || { label: t, count: 0 }; e.count += a.count; labelFreq.set(k, e); }));
            const atkChipPool = [...labelFreq.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "fr"));
            const atkChipsShown = [
              ...vsAtkFilters.map(f => ({ label: f })),
              ...(atkQ ? atkChipPool.filter(c => c.label.toLowerCase().includes(atkQ)) : atkChipPool).filter(c => !vsAtkFilters.some(f => f.toLowerCase() === c.label.toLowerCase())).slice(0, 18),
            ];

            return (
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <button onClick={() => { setActiveVideoScoutId(null); setVsTfFilters([]); setVsTypeFilters([]); setVsPendingMiss(null); setVsAnnounceName(""); setVsAnnounceTf([]); setVsHighlightPlayId(null); setVsAtkQuery(""); setVsAtkFilters([]); setVsGlobalOpen(false); }}
                    className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">← Retour au scouting vidéo</button>
                  <button onClick={() => {
                    // Tous les systèmes notés pour cette équipe, même sans action comptée : les
                    // avoir notés suffit à les juger importants pour le récap donné au coach.
                    const rows = sorted.map(p => ({
                      titre: p.titre,
                      type: p.type,
                      tempsFort: tfOf(p),
                      played: playedOf(activeVs.tally?.[p.id]),
                      points: pointsOf(activeVs.tally?.[p.id]),
                      possible: possibleOf(activeVs.tally?.[p.id]),
                      openMisses: openMissesOf(activeVs.tally?.[p.id]),
                      contestedMisses: contestedMissesOf(activeVs.tally?.[p.id]),
                    }));
                    try { exportVideoScoutReport(activeVs, rows, playTypes, sorted.map(p => p.id)); }
                    catch (e) { console.error("Export scouting vidéo", e); cpbAlert?.("Impossible de préparer l'export : " + (e?.message || e)); }
                  }} className="text-sm font-semibold text-white px-4 py-2 rounded-md" style={{ backgroundColor: "#2563EB" }}>📤 Exporter le récap</button>
                </div>
                {vsGlobalOpen && (() => {
                  // Même document que l'export (schémas du Playbook inclus ; photos chargées seulement à l'export).
                  let html = "";
                  try {
                    const rowsG = sorted.map(p => ({ titre: p.titre, type: p.type, tempsFort: tfOf(p), played: playedOf(activeVs.tally?.[p.id]), points: pointsOf(activeVs.tally?.[p.id]), possible: possibleOf(activeVs.tally?.[p.id]) }));
                    html = buildVideoScoutReportHtml(activeVs, rowsG, playTypes, clubLogo || null, sorted);
                  } catch (e) { html = `<p style="font-family:sans-serif;color:#b91c1c;padding:16px">Erreur d'affichage : ${String(e?.message || e).replace(/</g, "&lt;")}</p>`; }
                  return (
                    <div className="fixed inset-0 z-50 flex flex-col bg-[#F2EDE4]">
                      <div className="flex items-center justify-between gap-2 bg-[#1B2A4A] text-white px-4 py-2.5">
                        <span className="font-semibold" style={{ fontFamily: "Oswald, sans-serif" }}>VUE GLOBALE · {activeVs.opponent}</span>
                        <button onClick={() => setVsGlobalOpen(false)} className="p-1 hover:text-[#FF6B35]" title="Fermer"><X size={22} /></button>
                      </div>
                      <iframe title="Vue globale" srcDoc={html} className="flex-1 w-full border-0" />
                    </div>
                  );
                })()}
                <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>{activeVs.opponent}</h2>
                <p className="text-xs text-[#1B2A4A]/40 mb-4">
                  {activeVs.date ? new Date(activeVs.date).toLocaleDateString("fr-FR") : "Date non précisée"}{activeVs.note && ` · ${activeVs.note}`} — <strong className="text-[#1B2A4A]/60">{totalTally}</strong> système{totalTally !== 1 ? "s" : ""} noté{totalTally !== 1 ? "s" : ""}
                </p>

                <div className="sticky top-0 z-30 border-2 border-[#FF6B35]/30 rounded-xl bg-white shadow-md p-4 mb-4">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Noter une annonce</div>
                  <input value={vsAnnounceName} onChange={e => setVsAnnounceName(e.target.value)}
                    list="video-scout-announce-list" placeholder="Nom du play annoncé (ex: Ram 21)..."
                    className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF6B35] mb-2" />
                  <datalist id="video-scout-announce-list">{teamPlays.map(p => <option key={p.id} value={p.titre} />)}</datalist>
                  {(() => {
                    const q = vsAnnounceName.trim().toLowerCase();
                    const isExisting = teamPlays.some(p => p.titre?.trim().toLowerCase() === q);
                    // Suggestions visibles et cliquables (le <datalist> natif ne se voit pas
                    // pareil partout) : tout système dont le nom contient ce qui est tapé,
                    // triés pour mettre en avant ceux qui COMMENCENT pareil (ex: "FIST" avant
                    // "Anti-FIST"). N'a plus de raison d'être une fois le nom déjà exact.
                    const matches = !q || isExisting ? [] : teamPlays
                      .filter(p => p.titre?.toLowerCase().includes(q))
                      .sort((a, b) => a.titre.toLowerCase().indexOf(q) - b.titre.toLowerCase().indexOf(q))
                      .slice(0, 6);
                    return (
                      <>
                        <div className="text-[11px] text-[#1B2A4A]/40 mb-1">
                          {!q
                            ? "Tape le nom d'un système pour lui attacher des temps forts et valider."
                            : isExisting
                              ? "Système déjà noté — les temps forts choisis ci-dessous s'y ajouteront."
                              : "Nouveau système — choisis son type et ses temps forts avant de valider :"}
                        </div>
                        {matches.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {matches.map(p => {
                              const idx = p.titre.toLowerCase().indexOf(q);
                              return (
                                <button key={p.id} onClick={() => {
                                  setVsAnnounceName(p.titre);
                                  setVsTfFilters([]); setVsTypeFilters([]);
                                  setVsHighlightPlayId(p.id);
                                  setTimeout(() => document.getElementById(`vs-play-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
                                }}
                                  className="px-3 py-1.5 rounded-full text-sm bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">
                                  {p.titre.slice(0, idx)}<strong>{p.titre.slice(idx, idx + q.length)}</strong>{p.titre.slice(idx + q.length)}
                                  {p.type && <span className="text-[10px] text-[#1B2A4A]/40 ml-1">· {p.type}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {vsAnnounceName.trim() && !teamPlays.some(p => p.titre?.trim().toLowerCase() === vsAnnounceName.trim().toLowerCase()) && (
                    <div className="flex flex-wrap gap-1.5 items-center mb-2">
                      {playTypes.map(t => (
                        <button key={t} onClick={() => setVsAnnounceType(t)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${(vsAnnounceType || playTypes[0]) === t ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                          style={(vsAnnounceType || playTypes[0]) === t ? { backgroundColor: "#FF6B35", color: "#fff", borderColor: "#FF6B35" } : undefined}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 items-center mb-2">
                    {[...new Set([...tfOptions, ...vsAnnounceTf])].map(tf => (
                      <button key={tf} onClick={() => setVsAnnounceTf(f => f.includes(tf) ? f.filter(x => x !== tf) : [...f, tf])}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${vsAnnounceTf.includes(tf) ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                        style={vsAnnounceTf.includes(tf) ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                        {tf}
                      </button>
                    ))}
                    <input value={vsAnnounceTfInput} onChange={e => setVsAnnounceTfInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && vsAnnounceTfInput.trim()) {
                          e.preventDefault();
                          const tf = vsAnnounceTfInput.trim();
                          setVsAnnounceTf(f => f.includes(tf) ? f : [...f, tf]);
                          setVsAnnounceTfInput("");
                        }
                      }}
                      placeholder="+ temps fort..." className="px-3 py-1.5 rounded-full text-sm border border-dashed border-[#1B2A4A]/30 outline-none focus:border-[#FF6B35] w-40" />
                    {(() => {
                      const q = vsAnnounceTfInput.trim().toLowerCase();
                      if (!q) return null;
                      // Tous les temps forts déjà utilisés dans le Playbook (toutes équipes) — pour
                      // classer directement dans les catégories existantes, avec la bonne orthographe.
                      const usedTempsForts = [...new Set(plays.flatMap(p => tfOf(p)))];
                      const suggestions = usedTempsForts.filter(t => t.toLowerCase().includes(q) && !vsAnnounceTf.includes(t));
                      const exactMatch = usedTempsForts.some(t => t.toLowerCase() === q);
                      return (
                        <>
                          {suggestions.map(t => (
                            <button key={t} onClick={() => { setVsAnnounceTf(f => [...f, t]); setVsAnnounceTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">
                              {t}
                            </button>
                          ))}
                          {!exactMatch && (
                            <button onClick={() => { const tf = vsAnnounceTfInput.trim(); setVsAnnounceTf(f => f.includes(tf) ? f : [...f, tf]); setVsAnnounceTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
                              + Ajouter "{vsAnnounceTfInput.trim()}"
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={validateAnnounce} disabled={!vsAnnounceName.trim()}
                      className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-40"
                      style={{ backgroundColor: "var(--sport-accent)" }}>✓ Valider</button>
                    <button onClick={() => { setVsAnnounceName(""); setVsAnnounceTf([]); setVsAnnounceTfInput(""); setVsHighlightPlayId(null); }} className="px-4 py-2 rounded-md text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
                  </div>
                </div>

                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-4">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Défenses observées</div>
                  <div className="flex flex-wrap gap-1.5 items-center mb-3">
                    {Object.entries(activeVs.defenses || {}).length === 0 && (
                      <span className="text-xs text-[#1B2A4A]/30 italic">Aucune pour l'instant</span>
                    )}
                    {Object.entries(activeVs.defenses || {}).map(([name, count]) => (
                      <span key={name} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium bg-[#1B2A4A]/8 text-[#1B2A4A]">
                        {name} <strong>×{count}</strong>
                        <button onClick={() => bumpDefense(name, 1)} title="Encore une fois" className="w-5 h-5 rounded-full bg-white hover:bg-[#FF6B35] hover:text-white text-[#1B2A4A]/60 flex items-center justify-center text-xs font-bold">+</button>
                        <button onClick={() => bumpDefense(name, -count)} title="Retirer" className="w-5 h-5 rounded-full text-[#1B2A4A]/30 hover:text-red-600 flex items-center justify-center"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <input value={vsNewDefenseInput} onChange={e => setVsNewDefenseInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && vsNewDefenseInput.trim()) { bumpDefense(vsNewDefenseInput.trim(), 1); setVsNewDefenseInput(""); }
                      }}
                      placeholder="Ex: Zone 2-3, Homme à homme, Press..." className="px-3 py-1.5 rounded-full text-sm border border-dashed border-[#1B2A4A]/30 outline-none focus:border-[#FF6B35] w-56" />
                    {vsNewDefenseInput.trim() && usedDefenses.filter(d => d.toLowerCase().includes(vsNewDefenseInput.trim().toLowerCase()) && !(activeVs.defenses || {})[d]).map(d => (
                      <button key={d} onClick={() => { bumpDefense(d, 1); setVsNewDefenseInput(""); }}
                        className="px-3 py-1.5 rounded-full text-sm bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">{d}</button>
                    ))}
                    {vsNewDefenseInput.trim() && (
                      <button onClick={() => { bumpDefense(vsNewDefenseInput.trim(), 1); setVsNewDefenseInput(""); }}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
                        + Ajouter "{vsNewDefenseInput.trim()}"
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Notes</div>
                  <textarea value={activeVs.notes || ""} onChange={e => updateActiveVs({ notes: e.target.value })}
                    placeholder="Joueurs clés, habitudes, consignes à donner à l'équipe..."
                    className="w-full h-24 border border-[#1B2A4A]/20 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B35] resize-none bg-white/70" />
                </div>

                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold">Playbook de {activeVs.opponent} : les plus joués</div>
                    <button onClick={() => setVsGlobalOpen(true)} className="text-xs font-semibold text-white px-3 py-1.5 rounded-md" style={{ backgroundColor: "#1B2A4A" }}>👁 Vue globale</button>
                  </div>
                  {teamPlays.length === 0 ? (
                    <p className="text-xs text-[#1B2A4A]/40 italic">Aucun play dans le Playbook pour {activeVs.opponent} (champ « Équipe scoutée »).</p>
                  ) : (() => {
                    const ranked = matchPlaysToAttacks(teamPlays, mergeAttacksForDisplay(activeVs.attacks || []), activeVs.tally || {});
                    const seenTotal = ranked.reduce((n, r) => n + r.count, 0);
                    return (
                      <div className="flex flex-col">
                        {ranked.map((r, i) => (
                          <div key={r.play.id} className={`flex items-center gap-3 py-2 ${i > 0 ? "border-t border-[#1B2A4A]/10" : ""} ${r.count === 0 ? "opacity-50" : ""}`}>
                            <span className="w-6 text-center font-bold text-lg flex-shrink-0" style={{ color: i < 3 && r.count > 0 ? "#FF6B35" : "#1B2A4A55", fontFamily: "Oswald, sans-serif" }}>{i + 1}</span>
                            {r.play.schemas?.[0]
                              ? <img src={r.play.schemas[0]} alt="" className="w-20 h-14 object-contain rounded-md bg-white border border-[#1B2A4A]/10 flex-shrink-0" />
                              : <div className="w-20 h-14 rounded-md bg-[#1B2A4A]/5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-[#1B2A4A] truncate">{r.play.titre}</div>
                              <div className="text-[11px] text-[#1B2A4A]/50 truncate">
                                {[r.play.type, r.intentions[0] ? `${r.intentions[0].text} ${r.intentions[0].count}×` : "", r.intentions.length > 1 ? "aussi " + r.intentions.slice(1).map(x => `${x.text} ${x.count}×`).join(", ") : ""].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-bold" style={{ color: "var(--sport-accent)" }}>{r.count}×</div>
                              <div className="text-[10px] text-[#1B2A4A]/50">{seenTotal ? Math.round((r.count / seenTotal) * 100) : 0} %</div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 w-12 text-center ${r.ppp === null ? "bg-[#1B2A4A]/5 text-[#1B2A4A]/40" : r.ppp >= 1.2 ? "bg-green-100 text-green-700" : r.ppp >= 0.9 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {r.ppp === null ? "—" : r.ppp.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <p className="text-[11px] text-[#1B2A4A]/40 mt-2">Relié aux attaques importées par le nom du play ou par ses entrées (mots-clés), plus le comptage manuel. Pts/possession : vert ≥ 1,2, rouge sous 0,9.</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold">Stats d'équipe (Excel)</div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-white px-3 py-1.5 rounded-md cursor-pointer" style={{ backgroundColor: "#16a34a" }}>
                        📊 Importer un Excel
                        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; handleBoxScoreFile(f); }} />
                      </label>
                      {activeVs.boxScore && (
                        <button onClick={async () => {
                          const ok = await cpbAlert?.("Retirer les stats d'équipe de cette session ?", { confirm: true });
                          if (ok) updateActiveVs({ boxScore: null });
                        }} className="text-xs text-red-500 hover:underline">Retirer</button>
                      )}
                    </div>
                  </div>
                  {activeVs.comparison && (
                    <div className="flex items-center gap-2 flex-wrap mt-1 mb-2">
                      <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#2563EB]/10 text-[#1B2A4A]">
                        ⚖️ Face à face : {activeVs.comparison.teams.map(t => t.name).join(" / ")}
                        <button onClick={() => updateActiveVs({ comparison: null })} title="Retirer la comparaison" className="w-5 h-5 rounded-full text-[#1B2A4A]/40 hover:text-red-600 flex items-center justify-center"><X size={11} /></button>
                      </span>
                    </div>
                  )}
                  {!activeVs.boxScore ? (
                    <p className="text-xs text-[#1B2A4A]/40 italic">Box score de l'équipe (un match par ligne) ou fiche de comparaison avec ton équipe (Team comparison) — profil statistique et face à face dans le récap.</p>
                  ) : (() => {
                    const S = boxScoreSummary(activeVs.boxScore.games || []);
                    const pc = (x) => x === null ? "—" : Math.round(x * 100) + " %";
                    const nb = (x, d = 1) => x === null ? "—" : x.toFixed(d).replace(".", ",");
                    return (
                      <div className="mt-1">
                        <p className="text-xs text-[#1B2A4A]/50 mb-2">{activeVs.boxScore.fileName} · {S.n} match{S.n > 1 ? "s" : ""}{S.wins + S.losses ? ` · ${S.wins}V ${S.losses}D` : ""}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                          {[[nb(S.ptsPerGame), "pts / match"], [nb(S.ppp, 2), "pts / poss."], [pc(S.efg), "eFG%"], [pc(S.tovPct), "pertes / poss."]].map(([v, l]) => (
                            <div key={l} className="rounded-lg bg-[#1B2A4A]/5 px-3 py-2"><div className="font-bold text-[#1B2A4A]">{v}</div><div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/50">{l}</div></div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {S.perGame.map(({ g, m }, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded-full ${m.win === true ? "bg-green-100 text-green-800" : m.win === false ? "bg-red-100 text-red-700" : "bg-[#1B2A4A]/8 text-[#1B2A4A]"}`}>
                              {g.opponent} {g.score} · {g.tov} pertes
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold">Attaques importées (XML Sportscode)</div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-white px-3 py-1.5 rounded-md cursor-pointer" style={{ backgroundColor: "#2563EB" }}>
                        📥 Importer un XML
                        <input type="file" accept=".xml,text/xml,application/xml" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; handleXmlFile(f); }} />
                      </label>
                      {(activeVs.attacks || []).length > 0 && (
                        <button onClick={async () => {
                          const ok = await cpbAlert?.("Supprimer toutes les attaques importées de cette session (et leurs résultats) ?", { confirm: true });
                          if (ok) updateActiveVs({ attacks: [] });
                        }} className="text-xs text-red-500 hover:underline">Supprimer l'import</button>
                      )}
                    </div>
                  </div>
                  {(activeVs.attacks || []).length === 0 ? (
                    <p className="text-xs text-[#1B2A4A]/40 italic">Aucune pour l'instant — importe l'export XML de Sportscode : les possessions qui ont les mêmes libellés sont regroupées en une attaque.</p>
                  ) : (
                    <>
                    <div className="mt-2 mb-1">
                      <input value={vsAtkQuery} onChange={e => setVsAtkQuery(e.target.value)}
                        placeholder="🔍 Chercher un temps fort, une entrée, un nom de play…"
                        className="w-full border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF6B35] bg-white" />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {atkChipsShown.map(c => {
                          const on = vsAtkFilters.some(f => f.toLowerCase() === c.label.toLowerCase());
                          return <button key={c.label} onClick={() => setVsAtkFilters(f => on ? f.filter(x => x.toLowerCase() !== c.label.toLowerCase()) : [...f, c.label])}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border ${on ? "" : "border-[#1B2A4A]/25 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                            style={on ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>{c.label}</button>;
                        })}
                        {(vsAtkFilters.length > 0 || vsAtkQuery) && (
                          <button onClick={() => { setVsAtkFilters([]); setVsAtkQuery(""); }} className="px-2.5 py-1 rounded-full text-xs text-[#1B2A4A]/40 hover:text-[#1B2A4A]">✕ Effacer</button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#1B2A4A]/40 mt-1.5">{visibleAttacks.length}/{allAtks.length} attaque{allAtks.length > 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      {visibleAttacks.length === 0 && <p className="text-xs text-[#1B2A4A]/40 italic">Aucune attaque ne correspond.</p>}
                      {visibleAttacks.map(a => {
                        const st = attackStats(a);
                        return (
                          <div key={a.id} className="border border-[#1B2A4A]/15 rounded-xl bg-white p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <input value={a.name || ""} onChange={e => renameAttack(a.id, e.target.value)}
                                placeholder="Nom du play (si identifié)…" className="flex-1 min-w-0 text-sm font-semibold text-[#1B2A4A] border-b border-dashed border-[#1B2A4A]/25 focus:border-[#FF6B35] outline-none py-1 bg-transparent" />
                              <button onClick={() => sendAttackToPlaybook(a)} title="Ouvre le formulaire de play pré-rempli pour dessiner le système"
                                className="flex-shrink-0 text-xs font-semibold text-white px-2.5 py-1.5 rounded-md" style={{ backgroundColor: a.sent ? "#64748b" : "#2563EB" }}>
                                {a.sent ? "✓ Envoyé · renvoyer" : "➜ Playbook"}
                              </button>
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap gap-1">
                                {a.labels.map((l, i) => {
                                  const grp = typeof l === "string" ? "" : (l.group || "");
                                  const intention = /intention/i.test(grp);
                                  return <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                    style={intention ? { backgroundColor: "#FF6B35", color: "#fff" } : { backgroundColor: "rgba(27,42,74,0.08)", color: "#1B2A4A" }}>{attackLabelText(l)}</span>;
                                })}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl font-bold" style={{ color: "var(--sport-accent)" }}>{a.count}×</div>
                                <div className="text-[10px] text-[#1B2A4A]/40">{st.resolved}/{a.count} résultats</div>
                                {st.ppp !== null && <div className="text-[10px] font-semibold text-[#1B2A4A]/60">{st.points}/{st.possible} pts · {st.ppp.toFixed(2)} pts/poss.</div>}
                              </div>
                            </div>
                            {(a.byDefense || []).length > 0 && (
                              <div className="mb-2 rounded-lg bg-[#F2EDE4] px-3 py-2 space-y-0.5">
                                <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold">Selon la défense</div>
                                {a.byDefense.map(d => { const ds = defenseStats(d); return (
                                  <div key={d.label} className="flex items-center justify-between text-xs text-[#1B2A4A]">
                                    <span className="font-medium">🛡 {d.label}</span>
                                    <span className="text-[#1B2A4A]/60">{ds.count}× · <strong className="text-[#1B2A4A]">{ds.ppp === null ? "—" : ds.ppp.toFixed(2)}</strong> pts/poss.</span>
                                  </div>); })}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[-3, -2].map(v => <button key={v} onClick={() => addAttackOutcome(a.id, v)} className="w-11 h-11 rounded-lg text-base font-bold border-2 border-red-200 text-red-600 hover:bg-red-50">{v}</button>)}
                              {[1, 2, 3].map(v => <button key={v} onClick={() => addAttackOutcome(a.id, v)} className="w-11 h-11 rounded-lg text-base font-bold border-2 border-green-300 text-green-700 hover:bg-green-50">+{v}</button>)}
                              <button onClick={() => addAttackOutcome(a.id, 0)} title="Possession sans point (perte, faute offensive...). Un résultat ne crée jamais de possession en plus : il renseigne une possession sans résultat, ou s'ajoute en points une fois toutes renseignées." className="px-3 h-11 rounded-lg text-xs font-semibold border border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:bg-[#1B2A4A]/5">0 pt</button>
                              {(a.outcomes || []).length > 0 && <button onClick={() => undoAttackOutcome(a.id)} title="Annuler le dernier résultat" className="px-2 h-11 text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><Undo2 size={16} /></button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                </div>

                {vsImportPreview && (() => {
                  const pv = vsImportPreview;
                  const groups = groupSportscodeInstances(pv.instances, pv.excluded, pv.excludedCodes, pv.defenseGroups, pv.ignoredGroups);
                  const toggle = (k) => setVsImportPreview(x => ({ ...x, excluded: x.excluded.includes(k) ? x.excluded.filter(y => y !== k) : [...x.excluded, k] }));
                  // Rôle d'un groupe de libellés, en cycle : définit l'attaque → défense adverse → ignoré.
                  const toggleDefGroup = (g) => setVsImportPreview(x => {
                    const isDef = x.defenseGroups.includes(g), isIgn = x.ignoredGroups.includes(g);
                    if (isIgn) return { ...x, ignoredGroups: x.ignoredGroups.filter(y => y !== g) };
                    if (isDef) return { ...x, defenseGroups: x.defenseGroups.filter(y => y !== g), ignoredGroups: [...x.ignoredGroups, g] };
                    return { ...x, defenseGroups: [...x.defenseGroups, g] };
                  });
                  const toggleCode = (c) => setVsImportPreview(x => ({ ...x, excludedCodes: x.excludedCodes.includes(c) ? x.excludedCodes.filter(y => y !== c) : [...x.excludedCodes, c] }));
                  const used = pv.instances.filter(i => !pv.excludedCodes.includes(i.code) && !/^def/i.test(i.code));
                  const bonusOnly = used.filter(i => i.labels.every(isSportscodeResult)).length;
                  const lostBalls = groups.reduce((n, g) => n + g.xmlOutcomes.filter(v => v === 0).length, 0);
                  const liveLabels = (() => {
                    const m = new Map();
                    used.forEach(inst => inst.labels.filter(l => !isSportscodeResult(l)).forEach(l => {
                      const k = l.text.toLowerCase(), e = m.get(k) || { key: k, label: l.text, group: l.group, count: 0 };
                      e.count++; m.set(k, e);
                    }));
                    return [...m.values()].sort((a, b) => b.count - a.count);
                  })();
                  const labelGroups = [...new Set(liveLabels.map(l => l.group || "Libellés"))];
                  const defInst = collectSportscodeDefense(pv.instances, pv.ignoredGroups, pv.excluded, pv.defensePie);
                  const defGroupNames = [...new Set(defInst.flatMap(ls => ls.map(l => l.group)))].filter(g => !/intention/i.test(g));
                  // Tous les groupes disponibles dans les séquences DEFENSE (candidats aux camemberts)
                  const defAvail = [...new Set(pv.instances.filter(i => /^def/i.test(i.code)).flatMap(i => i.labels.filter(l => !isSportscodeResult(l)).map(l => l.group || "Libellés")))]
                    .filter(g => !/intention/i.test(g) && !pv.ignoredGroups.includes(g));
                  const toggleDefPie = (g) => setVsImportPreview(x => ({ ...x, defensePie: x.defensePie.includes(g) ? x.defensePie.filter(y => y !== g) : [...x.defensePie, g] }));
                  return (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setVsImportPreview(null)}>
                      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3">
                          <h3 className="font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>Importer {pv.fileName}</h3>
                          <p className="text-xs text-[#1B2A4A]/50 mt-1">
                            <strong>{used.length - bonusOnly}</strong> possession{used.length - bonusOnly > 1 ? "s" : ""} → <strong>{groups.length}</strong> attaque{groups.length > 1 ? "s" : ""} distincte{groups.length > 1 ? "s" : ""}
                            {lostBalls > 0 && <> · <strong>{lostBalls}</strong> sans point (perte de balle)</>}
                            {defInst.length > 0 && <> · <strong>{defInst.length}</strong> séquence{defInst.length > 1 ? "s" : ""} de défense lue{defInst.length > 1 ? "s" : ""} ({defGroupNames.join(", ") || "libellés"})</>}
                            {bonusOnly > 0 && <> · {bonusOnly} point{bonusOnly > 1 ? "s" : ""} seul{bonusOnly > 1 ? "s" : ""} rattaché{bonusOnly > 1 ? "s" : ""} à l'attaque précédente</>}
                            {pv.ignored > 0 && <> · {pv.ignored} instance{pv.ignored > 1 ? "s" : ""} sans libellé ignorée{pv.ignored > 1 ? "s" : ""}</>}
                          </p>
                        </div>
                        <div className="px-5 overflow-y-auto flex-1 pb-3">
                          {pv.codes.length > 1 && (
                            <>
                              <div className="text-[11px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold mb-1.5">Séquences d'attaque à importer</div>
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {pv.codes.map(c => {
                                  if (/^def/i.test(c.code)) return (
                                    <span key={c.code} title="Toujours analysée : tout ce que fait l'équipe en défense alimente la section « Défense de l'équipe »."
                                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#22c55e] bg-[#22c55e]/10 text-[#15803d]">🛡 {c.code} <span className="opacity-70">{c.count}</span> → défense de l'équipe</span>
                                  );
                                  const off = pv.excludedCodes.includes(c.code);
                                  return <button key={c.code} onClick={() => toggleCode(c.code)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${off ? "border-[#1B2A4A]/15 text-[#1B2A4A]/30 line-through" : "border-[#FF6B35] bg-[#FF6B35] text-white"}`}>{c.code} <span className="opacity-70">{c.count}</span></button>;
                                })}
                              </div>
                            </>
                          )}
                          {labelGroups.map(gr => (
                            <div key={gr} className="mb-3">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="text-[11px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold">{gr}</div>
                                <button onClick={() => toggleDefGroup(gr)}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pv.ignoredGroups.includes(gr) ? "border-[#1B2A4A]/15 text-[#1B2A4A]/30 line-through" : pv.defenseGroups.includes(gr) ? "border-[#22c55e] bg-[#22c55e] text-white" : "border-[#1B2A4A]/20 text-[#1B2A4A]/50"}`}>
                                  {pv.ignoredGroups.includes(gr) ? "Ignoré" : pv.defenseGroups.includes(gr) ? "🛡 Défense adverse (ventilation)" : "Définit l'attaque"}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {liveLabels.filter(l => (l.group || "Libellés") === gr).map(l => {
                                  const off = pv.excluded.includes(l.key);
                                  return <button key={l.key} onClick={() => toggle(l.key)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${off ? "border-[#1B2A4A]/15 text-[#1B2A4A]/30 line-through" : "border-[#2563EB] bg-[#2563EB] text-white"}`}>{l.label} <span className="opacity-60">{l.count}</span></button>;
                                })}
                              </div>
                            </div>
                          ))}
                          {defAvail.length > 0 && (
                            <div className="mt-4">
                              <div className="text-[11px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold mb-1.5">Défense de l'équipe — groupes à montrer en camembert (tout est analysé par défaut)</div>
                              <div className="flex flex-wrap gap-1.5">
                                {defAvail.map(g => {
                                  const on = pv.defensePie.includes(g);
                                  return <button key={g} onClick={() => toggleDefPie(g)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${on ? "border-[#22c55e] bg-[#22c55e] text-white" : "border-[#1B2A4A]/15 text-[#1B2A4A]/40"}`}>{g}</button>;
                                })}
                              </div>
                            </div>
                          )}
                          <div className="text-[11px] uppercase tracking-wide text-[#1B2A4A]/40 font-semibold mt-4 mb-1.5">Aperçu des attaques</div>
                          <div className="space-y-1">
                            {groups.slice(0, 10).map(g => (
                              <div key={g.key} className="flex items-center justify-between gap-2 text-sm bg-[#F2EDE4] rounded-lg px-3 py-1.5">
                                <span className="text-[#1B2A4A] font-medium truncate">{g.labels.map(l => l.text).join(" / ")}</span>
                                <span className="font-bold text-[#FF6B35] flex-shrink-0">{g.count}×</span>
                              </div>
                            ))}
                            {groups.length > 10 && <p className="text-[11px] text-[#1B2A4A]/40">+ {groups.length - 10} autre{groups.length - 10 > 1 ? "s" : ""}</p>}
                            {groups.length === 0 && <p className="text-xs text-red-500">Rien à importer — recoche au moins une séquence et un libellé.</p>}
                          </div>
                        </div>
                        <div className="px-5 py-4 border-t border-[#1B2A4A]/10 flex gap-2">
                          <button onClick={confirmXmlImport} disabled={groups.length === 0} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "var(--sport-accent)" }}>Importer {groups.length} attaque{groups.length > 1 ? "s" : ""}</button>
                          <button onClick={() => setVsImportPreview(null)} className="px-4 py-2.5 rounded-lg text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {vsPendingMiss && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVsPendingMiss(null)}>
                    <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                      <p className="text-sm font-semibold text-[#1B2A4A] mb-1">Tir à {vsPendingMiss.value} pts manqué</p>
                      <p className="text-xs text-[#1B2A4A]/50 mb-4">Le tir était-il ouvert ou contesté ?</p>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => resolveVsMissContext("ouvert")}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 border-green-300 text-green-700 hover:bg-green-50">🟢 Tir ouvert</button>
                        <button onClick={() => resolveVsMissContext("conteste")}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 border-red-300 text-red-700 hover:bg-red-50">🔴 Tir contesté</button>
                        <button onClick={() => setVsPendingMiss(null)}
                          className="w-full py-2 rounded-lg text-xs text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
                      </div>
                    </div>
                  </div>
                )}

                {matchTypeOptions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Type</div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {matchTypeOptions.map(t => (
                        <button key={t} onClick={() => setVsTypeFilters(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${vsTypeFilters.includes(t) ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                          style={vsTypeFilters.includes(t) ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                          {t}
                        </button>
                      ))}
                      {vsTypeFilters.length > 0 && (
                        <button onClick={() => setVsTypeFilters([])} className="px-3 py-1.5 rounded-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A]">✕ Effacer</button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Temps fort — pour retrouver un système déjà noté au lieu de le recréer</div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[...new Set([...tfOptions, ...vsTfFilters])].map(tf => (
                      <button key={tf} onClick={() => setVsTfFilters(f => f.includes(tf) ? f.filter(x => x !== tf) : [...f, tf])}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${vsTfFilters.includes(tf) ? "" : "border-[#1B2A4A]/30 text-[#1B2A4A] hover:border-[#1B2A4A]"}`}
                        style={vsTfFilters.includes(tf) ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                        {tf}
                      </button>
                    ))}
                    {vsTfFilters.length > 0 && (
                      <button onClick={() => setVsTfFilters([])} className="px-3 py-1.5 rounded-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A]">✕ Effacer</button>
                    )}
                    <input value={vsNewTfInput} onChange={e => setVsNewTfInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && vsNewTfInput.trim()) {
                          e.preventDefault();
                          const tf = vsNewTfInput.trim();
                          setVsTfFilters(f => f.includes(tf) ? f : [...f, tf]);
                          setVsNewTfInput("");
                        }
                      }}
                      placeholder="Rechercher ou + écrire un temps fort..." className="px-3 py-1.5 rounded-full text-sm border border-dashed border-[#1B2A4A]/30 outline-none focus:border-[#FF6B35] w-56" />
                    {(() => {
                      const q = vsNewTfInput.trim().toLowerCase();
                      if (!q) return null;
                      const usedTempsForts = [...new Set(plays.flatMap(p => tfOf(p)))];
                      const suggestions = usedTempsForts.filter(t => t.toLowerCase().includes(q) && !vsTfFilters.includes(t));
                      const exactMatch = usedTempsForts.some(t => t.toLowerCase() === q);
                      return (
                        <>
                          {suggestions.map(t => (
                            <button key={t} onClick={() => { setVsTfFilters(f => [...f, t]); setVsNewTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm bg-[#1B2A4A]/8 text-[#1B2A4A] hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] transition-colors">
                              {t}
                            </button>
                          ))}
                          {!exactMatch && (
                            <button onClick={() => { const tf = vsNewTfInput.trim(); setVsTfFilters(f => f.includes(tf) ? f : [...f, tf]); setVsNewTfInput(""); }}
                              className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>
                              + Ajouter "{vsNewTfInput.trim()}"
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">
                    {vsTfFilters.length > 0 || vsTypeFilters.length > 0 ? `${filteredPlays.length} système${filteredPlays.length !== 1 ? "s" : ""} correspondant${filteredPlays.length !== 1 ? "s" : ""}` : "Tous les systèmes déjà notés pour cette équipe"}
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredPlays.map(p => {
                      const entry = activeVs.tally?.[p.id];
                      const played = playedOf(entry), points = pointsOf(entry), possible = possibleOf(entry);
                      const isHighlighted = p.id === vsHighlightPlayId;
                      return (
                        <div key={p.id} id={`vs-play-${p.id}`}
                          className={`border rounded-xl bg-white/70 p-4 transition-colors ${isHighlighted ? "border-2 border-[#FF6B35] bg-[#FF6B35]/5" : "border-[#1B2A4A]/15"}`}>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div>
                              <div className="font-semibold text-[#1B2A4A]">{p.titre}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">{p.type}</span>}
                                {tfOf(p).map((t, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A]/70">{t}</span>)}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                              <div className="text-xl font-bold" style={{ color: "var(--sport-accent)" }}>{played}</div>
                              {possible > 0 && <div className="text-[10px] text-[#1B2A4A]/40">{points}/{possible} pts</div>}
                              {played > 0 && <div className="text-[10px] font-semibold text-[#1B2A4A]/60">{(points / played).toFixed(2)} pts/poss.</div>}
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => { setEditingPlay(p); setPlaybookForm(true); setViewPersist("playbook"); }}
                                  title="Modifier ce système" className="text-[#1B2A4A]/30 hover:text-[#1B2A4A]"><Pencil size={13} /></button>
                                <button onClick={async () => {
                                  const ok = await cpbAlert?.(`Supprimer "${p.titre}" du Playbook ? Cette action est définitive.`, { confirm: true });
                                  if (!ok) return;
                                  savePlays(plays.filter(x => x.id !== p.id));
                                  (p.images || []).forEach(img => { storage.delete(`playimg:${p.id}:${img.id}`).catch(() => {}); });
                                }} title="Supprimer ce système" className="text-[#1B2A4A]/30 hover:text-red-600"><Trash2 size={13} /></button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => recordVsOutcome(p.id, null)}
                              className="px-4 py-3 rounded-lg text-sm font-semibold border border-[#1B2A4A]/20 text-[#1B2A4A]/70 hover:bg-[#1B2A4A]/5 active:bg-[#1B2A4A]/10">Compter (sans tir)</button>
                            <span className="w-px h-9 bg-[#1B2A4A]/10 mx-1" />
                            {[-3, -2].map(v => (
                              <button key={v} onClick={() => requestVsMissContext(p.id, v)}
                                className="w-14 h-14 rounded-lg text-xl font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100">{v}</button>
                            ))}
                            {[2, 3].map(v => (
                              <button key={v} onClick={() => recordVsOutcome(p.id, v)}
                                className="w-14 h-14 rounded-lg text-xl font-bold border-2 border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100">+{v}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {filteredPlays.length === 0 && <p className="text-sm text-[#1B2A4A]/40">Aucun système ne correspond à ce filtre.</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#1B2A4A]/10 pt-4 flex-wrap gap-2">
                  <span className="text-xs text-[#1B2A4A]/40">Classement par fréquence : {sorted.filter(p => playedOf(activeVs.tally?.[p.id]) > 0).map(p => `${p.titre} (${playedOf(activeVs.tally[p.id])})`).join(", ") || "aucun système compté pour l'instant"}</span>
                  <button onClick={async () => {
                    const ok = await cpbAlert?.("Réinitialiser le comptage de cette session ? Les valeurs actuelles seront perdues.", { confirm: true });
                    if (ok) updateActiveVs({ tally: {} });
                  }} className="text-xs text-red-500 hover:underline">Réinitialiser</button>
                </div>
              </div>
            );
          }

          // ── Liste des sessions de scouting vidéo ────────────────────────────────
          return (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>SCOUTING VIDÉO</h2>
              <p className="text-xs text-[#1B2A4A]/40 mb-5">Dépouille un match adverse filmé avant la rencontre : retrouve un système déjà noté par ses temps forts au lieu de le retaper, et suis sa rentabilité (marqué/raté) au fil du montage.</p>

              {vsNewSessionOpen ? (
                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-5">
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Équipe adverse observée</div>
                    <input value={vsNewOpponent} onChange={e => setVsNewOpponent(e.target.value)} placeholder="Ex: SCABB"
                      list="video-scout-teams-list" className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                    <datalist id="video-scout-teams-list">{scoutedTeams.map(t => <option key={t} value={t} />)}</datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Date du match observé (facultatif)</div>
                      <input type="date" value={vsNewDate} onChange={e => setVsNewDate(e.target.value)}
                        className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 mb-1">Note (facultatif)</div>
                      <input value={vsNewNote} onChange={e => setVsNewNote(e.target.value)} placeholder="Ex: Montage vidéo semaine 12"
                        className="w-full border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white/60" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!vsNewOpponent.trim()) { cpbAlert?.("Indique l'équipe observée."); return; }
                      const s = { id: uid(), opponent: vsNewOpponent.trim(), date: vsNewDate || null, note: vsNewNote.trim(), tally: {}, createdAt: new Date().toISOString() };
                      saveVideoScoutSessions([...videoScoutSessions, s]);
                      setVsNewSessionOpen(false); setVsNewOpponent(""); setVsNewDate(""); setVsNewNote("");
                      setActiveVideoScoutId(s.id);
                    }} className="text-sm font-semibold text-white px-4 py-2 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>Créer la session</button>
                    <button onClick={() => setVsNewSessionOpen(false)} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A] px-4 py-2">Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setVsNewSessionOpen(true)} className="mb-5 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "var(--sport-accent)" }}>
                  <Plus size={15} /> Nouvelle session de scouting
                </button>
              )}

              <div className="flex flex-col gap-2">
                {[...videoScoutSessions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(s => {
                  const total = Object.values(s.tally || {}).reduce((sum, e) => sum + playedOf(e), 0);
                  return (
                    <div key={s.id} onClick={() => setActiveVideoScoutId(s.id)}
                      className="flex items-center justify-between border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 cursor-pointer hover:border-[#FF6B35] hover:shadow-md transition-all">
                      <div>
                        <div className="font-semibold text-[#1B2A4A]">{s.opponent}</div>
                        <div className="text-xs text-[#1B2A4A]/50">{s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "Date non précisée"}{s.note && ` · ${s.note}`}{total > 0 && ` · ${total} système${total !== 1 ? "s" : ""} noté${total !== 1 ? "s" : ""}`}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); saveVideoScoutSessions(videoScoutSessions.filter(x => x.id !== s.id)); }}
                        className="text-[#1B2A4A]/30 hover:text-red-600 flex-shrink-0 ml-3"><Trash2 size={16} /></button>
                    </div>
                  );
                })}
                {videoScoutSessions.length === 0 && !vsNewSessionOpen && <p className="text-sm text-[#1B2A4A]/40">Aucune session de scouting vidéo pour l'instant.</p>}
              </div>
            </div>
          );
        })()}

        {view === "myteam" && isAdmin && (() => {
          const activeTa = teamAnalyses.find(a => a.id === activeTeamAnalysisId) || null;
          const updateActiveTa = (patch) => saveTeamAnalyses(teamAnalyses.map(a => a.id === activeTeamAnalysisId ? { ...a, ...patch } : a));
          // Un seul bouton d'import : le type de fichier (cinq alignés ou box score) est reconnu
          // à ses colonnes ; un nouveau fichier remplace le précédent du même type.
          const handleTeamFile = async (file) => {
            if (!file) return;
            try {
              if (/\.xls$/i.test(file.name)) throw new Error("ancien format .xls : ouvre-le dans Excel / Numbers et enregistre-le en .xlsx");
              const rows = await readXlsxFirstSheet(await file.arrayBuffer());
              if (rows.some(r => r.some(c => /^(lineups?|cinq|composition)$/i.test(String(c ?? "").trim())))) {
                const lineups = parseLineupRows(rows);
                updateActiveTa({ lineups, lineupsFile: file.name });
                toast?.(`✓ ${lineups.length} cinq importés`);
              } else {
                const games = parseBoxScoreRows(rows);
                updateActiveTa({ boxScore: { fileName: file.name, games, importedAt: new Date().toISOString() } });
                toast?.(`✓ ${games.length} match${games.length > 1 ? "s" : ""} importé${games.length > 1 ? "s" : ""}`);
              }
            } catch (e) { cpbAlert?.("Import impossible : " + e.message); }
          };

          if (activeTa) {
            // Aperçu = le même document que l'export (notes exclues pour ne pas recharger à chaque frappe).
            let html = "";
            try { html = buildTeamReportHtml({ ...activeTa, notes: "" }, null); }
            catch (e) { html = `<p style="font-family:sans-serif;color:#b91c1c;padding:16px">Erreur d'affichage : ${String(e?.message || e).replace(/</g, "&lt;")}</p>`; }
            const fitFrame = (el) => { try { el.style.height = (el.contentDocument.documentElement.scrollHeight + 16) + "px"; } catch {} };
            return (
              <div className="max-w-4xl">
                <button onClick={() => setActiveTeamAnalysisId(null)} className="text-sm text-[#1B2A4A]/60 hover:text-[#1B2A4A] mb-3">← Mes analyses</button>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <input value={activeTa.name} onChange={e => updateActiveTa({ name: e.target.value })}
                    className="text-2xl font-bold text-[#1B2A4A] bg-transparent outline-none border-b border-transparent focus:border-[#FF6B35] min-w-0 flex-1"
                    style={{ fontFamily: "Oswald, sans-serif" }} />
                  <div className="flex gap-2 flex-wrap">
                    <label className="text-sm font-semibold text-white px-3 py-2 rounded-md cursor-pointer" style={{ backgroundColor: "#16a34a" }}>
                      📊 Importer un Excel
                      <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; handleTeamFile(f); }} />
                    </label>
                    <button onClick={() => setLogoExportPrompt({ analysis: activeTa, kind: "myteam" })}
                      className="text-sm font-semibold text-white px-3 py-2 rounded-md" style={{ backgroundColor: "#2563EB" }}>📤 Exporter l'analyse</button>
                  </div>
                </div>
                <p className="text-xs text-[#1B2A4A]/50 mb-2">Fichiers acceptés : <b>Lineups</b> (les cinq alignés, avec la ligne OPP) et <b>Games</b> (box score match par match). Un nouveau fichier remplace le précédent du même type.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {activeTa.lineupsFile && (
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#1B2A4A]/8 text-[#1B2A4A]">
                      👥 {activeTa.lineupsFile}
                      <button onClick={() => updateActiveTa({ lineups: [], lineupsFile: "" })} title="Retirer" className="w-5 h-5 rounded-full text-[#1B2A4A]/40 hover:text-red-600 flex items-center justify-center"><X size={11} /></button>
                    </span>
                  )}
                  {activeTa.boxScore && (
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#1B2A4A]/8 text-[#1B2A4A]">
                      📋 {activeTa.boxScore.fileName}
                      <button onClick={() => updateActiveTa({ boxScore: null })} title="Retirer" className="w-5 h-5 rounded-full text-[#1B2A4A]/40 hover:text-red-600 flex items-center justify-center"><X size={11} /></button>
                    </span>
                  )}
                </div>
                <textarea value={activeTa.notes || ""} onChange={e => updateActiveTa({ notes: e.target.value })}
                  placeholder="Notes (reprises dans l'export) : constats, axes de travail, rotations à tester..."
                  className="w-full h-20 border border-[#1B2A4A]/20 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B35] resize-none bg-white/70 mb-3" />
                <iframe title="Analyse de mon équipe" srcDoc={html} className="w-full rounded-xl border border-[#1B2A4A]/10"
                  style={{ height: 600, background: "#F2EDE4" }}
                  onLoad={e => { const el = e.currentTarget; fitFrame(el); setTimeout(() => fitFrame(el), 800); }} />
              </div>
            );
          }

          return (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>MON ÉQUIPE</h2>
              <p className="text-xs text-[#1B2A4A]/40 mb-5">Évalue ton équipe à partir des exports Excel de ton site de stats : les cinq qui fonctionnent ou pas, l'impact de chaque joueur, les meilleurs duos, le profil d'attaque et de défense.</p>
              <div className="flex gap-2 mb-5 flex-wrap">
                <input value={taNewName} onChange={e => setTaNewName(e.target.value)} placeholder="Ex: SABI II — saison 2026-27"
                  className="flex-1 min-w-0 border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm bg-white/70 outline-none focus:border-[#FF6B35]" />
                <button onClick={() => {
                  const name = taNewName.trim() || "Mon équipe";
                  const a = { id: uid(), name, lineups: [], lineupsFile: "", boxScore: null, notes: "", createdAt: new Date().toISOString() };
                  saveTeamAnalyses([...teamAnalyses, a]); setTaNewName(""); setActiveTeamAnalysisId(a.id);
                }} className="px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "var(--sport-accent)" }}>
                  <Plus size={15} /> Nouvelle analyse
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {[...teamAnalyses].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(a => (
                  <div key={a.id} onClick={() => setActiveTeamAnalysisId(a.id)}
                    className="flex items-center justify-between border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 cursor-pointer hover:border-[#FF6B35] hover:shadow-md transition-all">
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">{a.name}</div>
                      <div className="text-xs text-[#1B2A4A]/50">{[(a.lineups || []).length ? `${a.lineups.length} cinq` : "", a.boxScore ? `${(a.boxScore.games || []).length} matchs` : ""].filter(Boolean).join(" · ") || "Aucun fichier importé"}</div>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await cpbAlert?.(`Supprimer l'analyse « ${a.name} » ?`, { confirm: true });
                      if (ok) saveTeamAnalyses(teamAnalyses.filter(x => x.id !== a.id));
                    }} className="text-[#1B2A4A]/30 hover:text-red-600 flex-shrink-0 ml-3"><Trash2 size={16} /></button>
                  </div>
                ))}
                {teamAnalyses.length === 0 && <p className="text-sm text-[#1B2A4A]/40">Aucune analyse pour l'instant.</p>}
              </div>
            </div>
          );
        })()}

        {view === "wellness" && (isAdmin || canManageWellness) && (() => {
          const WELLNESS_FIELDS = [
            { key: "rpe", label: "RPE" }, { key: "sommeil", label: "Sommeil" }, { key: "fatigue", label: "Fatigue" },
            { key: "courbature", label: "Courbatures" }, { key: "stress", label: "Stress" }, { key: "humeur", label: "Humeur/Alim." },
          ];
          const openForm = wellnessForms.find(f => f.token === wellnessOpenFormId);

          if (wellnessOpenFormId) {
            const exportCsv = () => {
              const headers = ["Joueur", "Date", ...WELLNESS_FIELDS.map(f => f.label)];
              const rows = wellnessCheckins.map(c => [
                c.player_name, c.submitted_at ? new Date(c.submitted_at).toLocaleString("fr-FR") : "",
                ...WELLNESS_FIELDS.map(f => c[f.key] ?? ""),
              ]);
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
              const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `bien-etre-${(openForm?.title || "questionnaire").replace(/[^a-z0-9]+/gi, "_")}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            };
            return (
              <div className="max-w-4xl">
                <button onClick={() => setWellnessOpenFormId(null)} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A] mb-3">← Retour aux questionnaires</button>
                <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>{openForm?.title || "Questionnaire"}</h2>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm text-[#1B2A4A]/60">{wellnessCheckins.length} réponse{wellnessCheckins.length !== 1 ? "s" : ""}</span>
                  <div className="flex gap-2">
                    <button onClick={() => copyOrShow(`${window.location.origin}/api/wellness?token=${wellnessOpenFormId}`, "Lien copié !")}
                      className="text-xs font-medium text-[#1B2A4A] px-3 py-1.5 rounded-md border border-[#1B2A4A]/20 hover:bg-[#1B2A4A]/5">Copier le lien</button>
                    {wellnessCheckins.length > 0 && (
                      <button onClick={exportCsv} className="text-xs font-semibold text-white px-3 py-1.5 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>Exporter CSV</button>
                    )}
                  </div>
                </div>
                {wellnessCheckins.length === 0 ? (
                  <p className="text-sm text-[#1B2A4A]/40">Aucune réponse pour l'instant — partage le lien sur ton groupe WhatsApp.</p>
                ) : (
                  <div className="overflow-x-auto border border-[#1B2A4A]/15 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1B2A4A]/5 text-left">
                          <th className="px-3 py-2 font-semibold text-[#1B2A4A]">Joueur</th>
                          {WELLNESS_FIELDS.map(f => <th key={f.key} className="px-3 py-2 font-semibold text-[#1B2A4A] text-center">{f.label}</th>)}
                          <th className="px-3 py-2 font-semibold text-[#1B2A4A]/50">Envoyé</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wellnessCheckins.map(c => (
                          <tr key={c.id} className="border-t border-[#1B2A4A]/10">
                            <td className="px-3 py-2 font-medium text-[#1B2A4A]">{c.player_name}</td>
                            {WELLNESS_FIELDS.map(f => <td key={f.key} className="px-3 py-2 text-center">{c[f.key] ?? "—"}</td>)}
                            <td className="px-3 py-2 text-[#1B2A4A]/40 text-xs">{c.submitted_at ? new Date(c.submitted_at).toLocaleString("fr-FR") : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>BIEN-ÊTRE JOUEURS</h2>
              <p className="text-xs text-[#1B2A4A]/40 mb-5">Crée un questionnaire, partage le lien sur WhatsApp — tes joueurs le remplissent sans compte, tu retrouves toutes les réponses ici.</p>

              {wellnessNewOpen ? (
                <div className="border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 mb-5">
                  <input autoFocus value={wellnessNewTitle} onChange={e => setWellnessNewTitle(e.target.value)}
                    placeholder="Ex: Post-match Besançon 05/09" className="w-full border border-[#FF6B35] rounded-md px-3 py-2 text-sm outline-none mb-3" />
                  <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1.5">Joueurs concernés</div>
                  {players.length === 0 && <p className="text-xs text-[#1B2A4A]/40 mb-2">Aucun joueur enregistré sur ce compte — ajoute-les ci-dessous (une seule fois, ils resteront disponibles ensuite).</p>}
                  <div className="flex flex-wrap gap-1.5 items-center mb-3">
                    {players.map(p => {
                      const on = (wellnessNewPlayerIds ?? players.map(x => x.id)).includes(p.id);
                      return (
                        <button key={p.id} type="button"
                          onClick={() => {
                            const current = wellnessNewPlayerIds ?? players.map(x => x.id);
                            setWellnessNewPlayerIds(current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id]);
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${on ? "" : "border-[#1B2A4A]/25 text-[#1B2A4A]/60"}`}
                          style={on ? { backgroundColor: "#2563EB", color: "#fff", borderColor: "#2563EB" } : undefined}>
                          {p.nom}
                        </button>
                      );
                    })}
                    {newPlayerOpen ? (
                      <div className="flex items-center gap-1">
                        <input autoFocus value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newPlayerName.trim()) {
                              const p = { id: uid(), nom: newPlayerName.trim() };
                              savePlayers([...players, p]);
                              setWellnessNewPlayerIds(current => [...(current ?? players.map(x => x.id)), p.id]);
                              setNewPlayerName(""); setNewPlayerOpen(false);
                            }
                            if (e.key === "Escape") { setNewPlayerOpen(false); setNewPlayerName(""); }
                          }}
                          placeholder="Prénom Nom" className="px-2.5 py-1 rounded-full text-xs border border-[#FF6B35] outline-none w-32" />
                        <button onClick={() => {
                          if (!newPlayerName.trim()) return;
                          const p = { id: uid(), nom: newPlayerName.trim() };
                          savePlayers([...players, p]);
                          setWellnessNewPlayerIds(current => [...(current ?? players.map(x => x.id)), p.id]);
                          setNewPlayerName(""); setNewPlayerOpen(false);
                        }} className="text-xs font-semibold text-[#FF6B35]">OK</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setNewPlayerOpen(true)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-[#FF6B35]/50 text-[#FF6B35] flex items-center gap-1"><Plus size={12} /> Ajouter un joueur</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      if (!wellnessNewTitle.trim()) return;
                      const selectedIds = wellnessNewPlayerIds ?? players.map(p => p.id);
                      const selectedPlayers = players.filter(p => selectedIds.includes(p.id)).map(p => ({ nom: p.nom }));
                      const token = crypto.randomUUID().replace(/-/g, "");
                      const { error } = await supabase.from("wellness_forms").insert({ token, title: wellnessNewTitle.trim(), created_by: session.user.id, players: selectedPlayers });
                      if (error) { cpbAlert?.("Erreur : " + error.message); return; }
                      setWellnessForms(f => [{ token, title: wellnessNewTitle.trim(), created_at: new Date().toISOString() }, ...f]);
                      setWellnessNewTitle(""); setWellnessNewOpen(false); setWellnessNewPlayerIds(null);
                      await copyOrShow(`${window.location.origin}/api/wellness?token=${token}`, "Questionnaire créé, lien copié !");
                    }} className="text-sm font-semibold text-white px-4 py-2 rounded-md" style={{ backgroundColor: "var(--sport-accent)" }}>Créer</button>
                    <button onClick={() => { setWellnessNewOpen(false); setWellnessNewPlayerIds(null); }} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A] px-4 py-2">Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setWellnessNewOpen(true)} className="mb-5 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "var(--sport-accent)" }}>
                  <Plus size={15} /> Nouveau questionnaire
                </button>
              )}

              {wellnessLoading ? (
                <p className="text-sm text-[#1B2A4A]/40">Chargement...</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {wellnessForms.map(f => (
                    <div key={f.token} onClick={() => setWellnessOpenFormId(f.token)}
                      className="flex items-center justify-between border border-[#1B2A4A]/15 rounded-xl bg-white/70 p-4 cursor-pointer hover:border-[#FF6B35] hover:shadow-md transition-all">
                      <div>
                        <div className="font-semibold text-[#1B2A4A]">{f.title}</div>
                        <div className="text-xs text-[#1B2A4A]/50">{f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : ""}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button onClick={(e) => { e.stopPropagation(); copyOrShow(`${window.location.origin}/api/wellness?token=${f.token}`, "Lien copié !"); }}
                          className="text-xs font-medium text-[#1B2A4A] px-3 py-1.5 rounded-md border border-[#1B2A4A]/20 hover:bg-white">Copier le lien</button>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await cpbAlert?.(`Supprimer le questionnaire "${f.title}" et toutes ses réponses ?`, { confirm: true });
                          if (!ok) return;
                          const { error } = await supabase.from("wellness_forms").delete().eq("token", f.token);
                          if (error) { cpbAlert?.("Erreur : " + error.message); return; }
                          setWellnessForms(list => list.filter(x => x.token !== f.token));
                        }} className="text-[#1B2A4A]/30 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {wellnessForms.length === 0 && !wellnessNewOpen && <p className="text-sm text-[#1B2A4A]/40">Aucun questionnaire créé pour l'instant.</p>}
                </div>
              )}
            </div>
          );
        })()}

        {view === "stats" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-5" style={{ fontFamily: "Oswald, sans-serif" }}>STATISTIQUES</h2>

            <div className="space-y-2 mb-6">
              {teams.length > 1 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#1B2A4A]/40 w-20">Équipe :</span>
                  <Tag active={statsTeamFilter === "all"} onClick={() => { setStatsTeamFilter("all"); setStatsSeasonFilter(null); setStatsMonthFilter([]); }}>Toutes</Tag>
                  {teams.map(t => (
                    <Tag key={t.id} active={statsTeamFilter === t.id} onClick={() => { setStatsTeamFilter(t.id); setStatsSeasonFilter(null); setStatsMonthFilter([]); }}>{t.nom || "Sans nom"}</Tag>
                  ))}
                </div>
              )}
              {statsSeasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#1B2A4A]/40 w-20">Saison :</span>
                  {statsSeasons.map(s => (
                    <Tag key={s} active={statsActiveSeason === s} onClick={() => { setStatsSeasonFilter(s); setStatsMonthFilter([]); }}>{s}</Tag>
                  ))}
                </div>
              )}
              {statsMonthLabels.length > 1 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#1B2A4A]/40 w-20">Mois :</span>
                  <Tag active={statsActiveMonths.length === 0} onClick={() => setStatsMonthFilter([])}>Toute la saison</Tag>
                  {statsMonthLabels.map(m => (
                    <Tag key={m} active={statsMonthFilter.includes(m)}
                      onClick={() => setStatsMonthFilter(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}>{m}</Tag>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[#1B2A4A]/40 w-20">Catégorie :</span>
                {SPORT_CATEGORIES.map(c => (
                  <Tag key={c} active={statsCatFilter.includes(c)} onClick={() => setStatsCatFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}>{c}</Tag>
                ))}
              </div>
            </div>

            {statsSessions.length === 0 ? (
              <div className="text-center py-16 text-[#1B2A4A]/40">Aucune séance pour ces filtres.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Séances", value: statsSessions.length },
                    { label: "Temps total", value: `${Math.floor(statsTotalMin / 60)}h${String(statsTotalMin % 60).padStart(2, "0")}` },
                    { label: "Moy. min/séance", value: statsAvgMin },
                    { label: "Exercices", value: statsExCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-4 text-center">
                      <div className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>{value}</div>
                      <div className="text-xs text-[#1B2A4A]/50 uppercase tracking-wide mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-[#1B2A4A]/70 uppercase tracking-wide mb-3">Répartition par thème</h3>
                {statsThemeRows.length === 0 ? (
                  <p className="text-sm text-[#1B2A4A]/40">Aucun exercice catégorisé par thème.</p>
                ) : (
                  <div className="space-y-3">
                    {statsThemeRows.map(([t, min]) => {
                      const themeTotal = statsThemeRows.reduce((s, [, m]) => s + m, 0);
                      const pct = themeTotal ? Math.round((min / themeTotal) * 100) : 0;
                      const h = Math.floor(min / 60), m = min % 60;
                      return (
                        <div key={t}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-[#1B2A4A] font-medium">{t}</span>
                            <span className="text-[#1B2A4A]/50">{h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`} · {pct}%</span>
                          </div>
                          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#1B2A4A1A" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: "var(--sport-accent)" }} />
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

        {view === "account" && (
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6" style={{ fontFamily: "Oswald, sans-serif" }}>MON COMPTE</h2>

            {isAdmin && (
              <div className="bg-white/70 border border-[#1B2A4A]/15 rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1">Réparer les visuels manquants</div>
                <p className="text-xs text-[#1B2A4A]/50 mb-3">Si des photos ou schémas d'exercices ont disparu récemment (bug corrigé le 20/07/2026), clique ici pour vérifier et les restaurer — tes données n'ont pas été supprimées, juste "perdues de vue".</p>
                <button onClick={repairMissingVisuals} disabled={repairingVisuals}
                  className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>
                  {repairingVisuals ? "Vérification en cours..." : "Vérifier et réparer"}
                </button>
              </div>
            )}

            {isAdmin && (
              <div className="bg-white/70 border border-[#1B2A4A]/15 rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1">Nettoyer les fichiers orphelins</div>
                <p className="text-xs text-[#1B2A4A]/50 mb-3">Supprime les photos/schémas d'exercices et de plays déjà supprimés qui traînaient encore en base (bug corrigé le 04/08/2026) — libère de l'espace si tu es proche de la limite de ton plan Supabase.</p>
                <button onClick={cleanupOrphanFiles} disabled={cleaningOrphans}
                  className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50 bg-red-500 hover:bg-red-600">
                  {cleaningOrphans ? "Nettoyage en cours..." : "Nettoyer maintenant"}
                </button>
              </div>
            )}

            {isAdmin && (
              <div className="bg-white/70 border border-[#1B2A4A]/15 rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1">Déplacer les photos vers Supabase Storage</div>
                <p className="text-xs text-[#1B2A4A]/50 mb-3">Copie tes photos/schémas vers un stockage séparé (hors quota "Database Size"). Étape 1 : copie sans rien supprimer. Étape 2 ("Finaliser"), à faire seulement une fois que tu as vérifié que tes photos s'affichent bien : supprime les anciennes copies pour libérer l'espace en base.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={migrateToStorage} disabled={migratingStorage}
                    className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>
                    {migratingStorage ? "Copie en cours..." : "1. Copier vers Storage"}
                  </button>
                  <button onClick={finalizeStorageMigration} disabled={finalizingStorage}
                    className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50 bg-red-500 hover:bg-red-600">
                    {finalizingStorage ? "Finalisation en cours..." : "2. Finaliser (supprimer les anciennes copies)"}
                  </button>
                </div>
                {migrateStorageResult && (
                  <p className="text-xs text-[#1B2A4A]/50 mt-2">{migrateStorageResult.migrated}/{migrateStorageResult.total} copiés{migrateStorageResult.failed > 0 ? `, ${migrateStorageResult.failed} échec(s)` : ""}.</p>
                )}
              </div>
            )}

            {isAdmin && <AnnouncementAdminPanel currentMessage={announcement?.message} onPublish={publishAnnouncement} onDeactivate={deactivateAnnouncement} cpbAlert={cpbAlert} />}

            {isAdmin && (
              <div className="bg-white/70 border border-[#1B2A4A]/15 rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold mb-1">Cahier technique (admin)</div>
                <p className="text-xs text-[#1B2A4A]/50 mb-3">Choisis les exercices à inclure ({bookletSelectedIds.length}/{exercises.length} sélectionné{bookletSelectedIds.length !== 1 ? "s" : ""}) puis exporte en cahier PDF prêt à imprimer/vendre.</p>
                <button onClick={() => setBookletPickerOpen(o => !o)}
                  className="text-sm font-medium text-[#1B2A4A] px-4 py-2 rounded-md border border-[#1B2A4A]/20 mb-3 hover:bg-[#1B2A4A]/5">
                  {bookletPickerOpen ? "Masquer la liste" : "Choisir les exercices"}
                </button>
                {bookletPickerOpen && (
                  <div className="border border-[#1B2A4A]/15 rounded-lg mb-3 max-h-72 overflow-y-auto">
                    <div className="sticky top-0 bg-[#F2EDE4] px-3 py-2 border-b border-[#1B2A4A]/15">
                      <button onClick={() => setBookletSelection(bookletSelectedIds.length === exercises.length ? [] : exercises.map(e => e.id))}
                        className="text-xs font-semibold text-[#FF6B35]">
                        {bookletSelectedIds.length === exercises.length ? "Tout désélectionner" : "Tout sélectionner"} ({exercises.length})
                      </button>
                    </div>
                    {exercises.map(ex => (
                      <label key={ex.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#1B2A4A]/5 last:border-0 text-sm cursor-pointer hover:bg-[#1B2A4A]/5">
                        <input type="checkbox" checked={bookletSelectedIds.includes(ex.id)} onChange={() => toggleBookletExercise(ex.id)} />
                        <span className="flex-1 truncate">{ex.titre}</span>
                        {ex.themes?.length > 0 && <span className="text-[10px] text-[#1B2A4A]/40 shrink-0">{ex.themes[0]}</span>}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={() => downloadExerciseBooklet(exercises.filter(e => bookletSelectedIds.includes(e.id)), { clubLogo, sport, coachName: "Coaching Pro Boost" })}
                    disabled={bookletSelectedIds.length === 0}
                    className="text-sm font-medium text-white px-4 py-2 rounded-md disabled:opacity-50" style={{ backgroundColor: "var(--sport-accent)" }}>
                    Exporter le cahier technique ({bookletSelectedIds.length})
                  </button>
                  <button onClick={async () => {
                      setCanvaExporting(true); setCanvaProgress({ done: 0, total: bookletSelectedIds.length });
                      try {
                        await exportExercisesForCanva(exercises.filter(e => bookletSelectedIds.includes(e.id)), { sport, onProgress: (done, total) => setCanvaProgress({ done, total }) });
                      } catch (e) { await cpbAlert("Erreur lors de l'export : " + e.message); }
                      setCanvaExporting(false); setCanvaProgress(null);
                    }}
                    disabled={bookletSelectedIds.length === 0 || canvaExporting}
                    className="text-sm font-medium text-[#1B2A4A] px-4 py-2 rounded-md border border-[#1B2A4A]/20 disabled:opacity-50 hover:bg-[#1B2A4A]/5">
                    {canvaExporting ? `Export en cours... (${canvaProgress?.done || 0}/${canvaProgress?.total || 0})` : `Exporter pour Canva (dossier ZIP)`}
                  </button>
                </div>
                <p className="text-[11px] text-[#1B2A4A]/40 mt-2">Un dossier .zip avec, pour chaque exercice : le(s) terrain(s) en PNG, un fichier explications.txt, et un QR code (lien permanent d'import dans l'app). Un QR code supplémentaire à la racine (qrcode-tout-le-cahier.png) permet d'importer tous les exercices du cahier en une fois.</p>
              </div>
            )}

            {/* Statut abonnement */}
            <div className={`rounded-2xl p-5 mb-4 ${isPremium ? "bg-[#FF6B35]" : "bg-[#1B2A4A]"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/70 text-xs uppercase tracking-wide">Abonnement</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPremium ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>
                  {isPremium ? "✓ PREMIUM" : "GRATUIT"}
                </span>
              </div>
              <div className="text-white font-bold text-lg" style={{ fontFamily: "Oswald, sans-serif" }}>
                {isPremium ? "Accès illimité activé" : "Version limitée"}
              </div>
              <div className="text-white/60 text-xs mt-1">
                {isPremium ? "Merci pour ton soutien !" : `${exercises.length}/${FREE_MAX_EXERCISES} exercices · ${sessions.length}/${FREE_MAX_SESSIONS} séances`}
              </div>
            </div>


            {/* Actions abonnement */}
            <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
              {isPremium ? (
                <>
                  <button onClick={async () => { try { await openBillingPortal(); } catch(e) { await cpbAlert(e.message); } }}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors border-b border-[#1B2A4A]/8">
                    <span>Gérer mon abonnement</span>
                    <ChevronRight size={16} className="text-[#1B2A4A]/40" />
                  </button>
                  <button onClick={async () => { try { await openBillingPortal(); } catch(e) { await cpbAlert(e.message); } }}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors border-b border-[#1B2A4A]/8">
                    <span>Mes factures</span>
                    <ChevronRight size={16} className="text-[#1B2A4A]/40" />
                  </button>
                  <button onClick={async () => { try { await openBillingPortal(); } catch(e) { await cpbAlert(e.message); } }}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm text-red-500 font-medium hover:bg-red-50 transition-colors">
                    <span>Résilier mon abonnement</span>
                    <ChevronRight size={16} className="text-red-400" />
                  </button>
                </>
              ) : (
                <button onClick={() => setPaywallReason("Passez en Premium pour accéder à toutes les fonctionnalités.")}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#FF6B35] font-bold hover:bg-[#FF6B35]/5 transition-colors">
                  <span>Passer en Premium — 4,99€/mois</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Sync abonnement */}
            <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
              <button onClick={async () => {
                const userId = session?.user?.id;
                if (!userId) return;
                try {
                  const res = await fetch("/api/sync-premium", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                  });
                  const text = await res.text();
                  if (!text) { await cpbAlert("✓ Ton abonnement Premium est déjà actif."); return; }
                  const data = JSON.parse(text);
                  if (data.isPremium) {
                    if (isPremium) { await cpbAlert("✓ Ton abonnement Premium est déjà actif."); return; }
                    await cpbAlert("✓ Abonnement Premium activé ! L'app va se recharger."); window.location.reload();
                  } else await cpbAlert("Aucun abonnement actif trouvé dans Stripe. Si tu viens de payer, attends 10 secondes et réessaie.");
                } catch (e) { await cpbAlert("Erreur : " + e.message); }
              }} className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors">
                <span>Synchroniser mon abonnement</span>
                <ChevronRight size={16} className="text-[#1B2A4A]/40" />
              </button>
            </div>

            {/* Communauté WhatsApp — Premium uniquement */}
            {isPremium && <a href="https://chat.whatsapp.com/DVnQxY6nO4yITFDGqgF3MM?s=cl&p=a&ilr=4&amv=1" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 bg-[#25D366] rounded-2xl px-5 py-4 mb-4 hover:bg-[#1eb556] transition-colors">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.477 2 2 6.477 2 12.004c0 1.773.465 3.484 1.348 4.99L2 22l5.145-1.33A9.954 9.954 0 0012.004 22C17.53 22 22 17.523 22 11.996 22 6.477 17.53 2 12.004 2zm0 18.214a8.21 8.21 0 01-4.196-1.15l-.3-.178-3.054.79.813-2.967-.196-.305A8.186 8.186 0 013.786 12c0-4.534 3.688-8.222 8.222-8.222 4.534 0 8.218 3.688 8.218 8.218 0 4.538-3.684 8.218-8.222 8.218z"/></svg>
              <div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>REJOINDRE LA COMMUNAUTÉ</div>
                <div className="text-white/80 text-xs mt-0.5">Basket · évolutions de l'app · échanges entre coachs</div>
              </div>
            </a>}

            {/* Sélecteur de sport */}
            <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-[#1B2A4A]/50 uppercase tracking-wide mb-3">Sport</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SPORTS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setSport(key)}
                      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium border transition-colors ${sport === key ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#1B2A4A]/15 text-[#1B2A4A] hover:border-[#1B2A4A]/40 bg-white/50"}`}>
                      <span className="text-xl">{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Changer mot de passe */}
            <ChangePasswordBlock />

            {/* Infos compte */}
            <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A4A]/8">
                <span className="text-sm text-[#1B2A4A]/50">Email</span>
                <span className="text-sm text-[#1B2A4A] font-medium truncate max-w-[200px]">{session?.user?.email}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A4A]/8">
                <span className="text-sm text-[#1B2A4A]/50">Exercices créés</span>
                <span className="text-sm text-[#1B2A4A] font-medium">{exercises.length}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A4A]/8">
                <span className="text-sm text-[#1B2A4A]/50">Séances créées</span>
                <span className="text-sm text-[#1B2A4A] font-medium">{sessions.length}</span>
              </div>
              <button onClick={async () => {
                try {
                  const exercisesWithFiles = await Promise.all(exercises.map(async (ex) => {
                    if (!ex.file || ex.file.data) return ex;
                    try {
                      const r = await storage.get(`file:${ex.id}`);
                      if (r) return { ...ex, file: JSON.parse(r.value) };
                    } catch {}
                    return ex;
                  }));
                  const backup = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    exercises: exercisesWithFiles,
                    sessions,
                    themes,
                    teams,
                    plays,
                  };
                  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `cpb-backup-${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch(e) { await cpbAlert("Erreur lors de l'export : " + e.message); }
              }} className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors border-b border-[#1B2A4A]/8">
                <span>Exporter une sauvegarde</span>
                <ChevronRight size={16} className="text-[#1B2A4A]/40" />
              </button>
              <input type="file" accept=".json" className="hidden" id="cpb-import-input" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                try {
                  const text = await file.text();
                  const backup = JSON.parse(text);
                  if (!backup.version || !backup.exercises) throw new Error("Fichier de sauvegarde invalide.");
                  const confirmed = await cpbAlert(
                    `Cette restauration va remplacer toutes tes données actuelles par celles du ${new Date(backup.exportedAt).toLocaleDateString("fr-FR")} (${backup.exercises.length} exercices, ${backup.sessions?.length || 0} séances). Continuer ?`,
                    { confirm: true }
                  );
                  if (!confirmed) return;
                  // Restaurer exercices avec leurs fichiers
                  const cleanExercises = backup.exercises.map(ex => {
                    if (ex.file?.data) {
                      storage.set(`file:${ex.id}`, JSON.stringify(ex.file)).catch(() => {});
                      return { ...ex, file: { name: ex.file.name, type: ex.file.type, data: null } };
                    }
                    return ex;
                  });
                  saveExercises(cleanExercises);
                  if (backup.sessions) saveSessions(backup.sessions);
                  if (backup.themes) saveThemes(backup.themes);
                  if (backup.teams) saveTeams(backup.teams);
                  if (backup.plays) savePlays(backup.plays);
                  await cpbAlert("✓ Sauvegarde restaurée avec succès !");
                } catch(e) { await cpbAlert("Erreur lors de l'import : " + e.message); }
              }} />
              <button onClick={() => document.getElementById("cpb-import-input").click()}
                className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors border-b border-[#1B2A4A]/8">
                <span>Restaurer une sauvegarde</span>
                <ChevronRight size={16} className="text-[#1B2A4A]/40" />
              </button>
              <button onClick={() => setShowHistoryRestore(true)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#1B2A4A] font-medium hover:bg-[#1B2A4A]/5 transition-colors">
                <span>Restaurer une version antérieure</span>
                <ChevronRight size={16} className="text-[#1B2A4A]/40" />
              </button>
            </div>

            {/* Installer l'app */}
            {!window.matchMedia("(display-mode: standalone)").matches && !window.navigator.standalone && (
              <div className="bg-white/70 rounded-2xl overflow-hidden mb-4">
                <div className="px-5 py-3 border-b border-[#1B2A4A]/8 flex items-center gap-2">
                  <span>📲</span>
                  <span className="text-xs uppercase tracking-wide text-[#1B2A4A]/50 font-semibold">Installer l'application</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🍎</span>
                      <span className="text-sm font-semibold text-[#1B2A4A]">iPhone / iPad (Safari)</span>
                    </div>
                    <ol className="space-y-1.5 pl-1">
                      {["Ouvre l'app dans Safari", "Appuie sur le bouton Partager ⎋ en bas de l'écran", "Fais défiler et appuie sur \"Sur l'écran d'accueil\"", "Appuie sur \"Ajouter\""].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1B2A4A]/70">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="border-t border-[#1B2A4A]/8 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🤖</span>
                      <span className="text-sm font-semibold text-[#1B2A4A]">Android (Chrome)</span>
                    </div>
                    <ol className="space-y-1.5 pl-1">
                      {["Ouvre l'app dans Chrome", "Appuie sur les 3 points ⋮ en haut à droite", "Appuie sur \"Ajouter à l'écran d'accueil\"", "Appuie sur \"Ajouter\""].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1B2A4A]/70">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Déconnexion */}
            <button onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-2xl py-3.5 text-sm font-medium hover:bg-red-50 transition-colors mb-4">
              <LogOut size={16} /> Se déconnecter
            </button>

            {/* Mentions légales */}
            <div className="text-center">
              <a href="/mentions-legales.html" target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#1B2A4A]/40 hover:text-[#1B2A4A]/70 underline transition-colors">
                Mentions légales &amp; CGU
              </a>
              <span className="text-xs text-[#1B2A4A]/20 mx-2">·</span>
              <span className="text-xs text-[#1B2A4A]/30">v1.0</span>
            </div>
          </div>
        )}

        {pendingPerspectivePhoto && (
          <PerspectiveCorrectionView
            imageData={pendingPerspectivePhoto}
            onConfirm={confirmSessionPhoto}
            onSkip={(finalImage) => confirmSessionPhoto(finalImage || pendingPerspectivePhoto)} />
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
          <DrawSheetView processing={drawProcessing} onCancel={() => setViewPersist("sessions")} onValidate={processDrawnSheet} onAddDirect={addDrawnSheetDirect} courtType={SPORT_COURT} />
        )}

        {viewingPlay && (
          <PlayViewer play={viewingPlay} onClose={() => setViewingPlay(null)}
            onEdit={() => { setEditingPlay(viewingPlay); setPlaybookForm(true); setViewingPlay(null); }}
            onUpdatePlay={(updatedPlay) => { savePlays(plays.map(p => p.id === updatedPlay.id ? updatedPlay : p)); setViewingPlay(updatedPlay); }}
            showSocialExport={isAdmin} />
        )}

        {playbookStatsOpen && (() => {
          const title = filterScoutedTeam || "Tous les plays";
          const stats = computePlaybookStats(filteredPlays, playTypes);
          return <PlaybookStatsView stats={stats} title={title} onClose={() => setPlaybookStatsOpen(false)} onExport={() => exportPlaybookStats(stats, title)} />;
        })()}

        {playsBoard && (
          <div className="fixed inset-0 z-[500] bg-[#0F1729] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#1B2A4A] flex-shrink-0">
              <div className="text-white font-bold text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>
                PLANCHE DES SYSTÈMES — {playsBoard.length} sélectionné{playsBoard.length > 1 ? "s" : ""}
              </div>
              <button onClick={() => setPlaysBoard(null)} className="text-white/60 hover:text-white"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {playsBoard.map(play => (
                  <button key={play.id} onClick={() => { setViewingPlay(play); setPlaysBoard(null); }}
                    className="bg-white rounded-xl p-3 text-left hover:ring-2 hover:ring-[#FF6B35] transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {play.type && <div className="text-[10px] font-bold uppercase tracking-wide text-[#FF6B35]">{play.type}</div>}
                        <div className="font-bold text-[#1B2A4A] leading-tight" style={{ fontFamily: "Oswald, sans-serif" }}>{play.titre || "Sans titre"}</div>
                      </div>
                    </div>
                    {(play.tempsFort?.length || play.tags?.length) > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {[...(play.tempsFort || []), ...(play.tags || [])].map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B2A4A]/8 text-[#1B2A4A]/70">{t}</span>
                        ))}
                      </div>
                    )}
                    {play._images.length > 0 ? (
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: play._images.length > 1 ? "1fr 1fr" : "1fr" }}>
                        {play._images.slice(0, 4).map((img, i) => (
                          <div key={i} className="relative bg-[#F2EDE4] rounded-lg overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                            <img src={img.data} alt="" className="w-full h-full object-contain" />
                            {i === 3 && play._images.length > 4 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">+{play._images.length - 4}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#1B2A4A]/40 italic py-4 text-center">Aucun visuel</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {logoExportPrompt && (
          <div className="fixed inset-0 z-[650] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => runLogoExportPrompt(clubLogo || null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-[#1B2A4A] mb-3" style={{ fontFamily: "Oswald, sans-serif" }}>Logo du club</h3>
              {clubLogo ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={clubLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-[#1B2A4A]/10 bg-[#F2EDE4] flex-shrink-0" />
                    <p className="text-xs text-[#1B2A4A]/60">Ajouter ce logo en en-tête du document ?</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => runLogoExportPrompt(clubLogo)} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Oui, ajouter</button>
                    <button onClick={() => runLogoExportPrompt(null)} className="w-full py-2 rounded-lg text-sm text-[#1B2A4A]/60 border border-[#1B2A4A]/15 hover:bg-[#1B2A4A]/5">Non merci</button>
                    <button onClick={() => logoExportInputRef.current?.click()} className="text-xs text-[#FF6B35] hover:underline mt-1">Utiliser un autre logo</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#1B2A4A]/60 mb-4">Aucun logo de club enregistré pour l'instant. Tu peux en choisir un maintenant — il sera aussi réutilisé pour les prochains exports.</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => logoExportInputRef.current?.click()} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>Choisir un logo</button>
                    <button onClick={() => runLogoExportPrompt(null)} className="w-full py-2 rounded-lg text-sm text-[#1B2A4A]/60 border border-[#1B2A4A]/15 hover:bg-[#1B2A4A]/5">Non merci</button>
                  </div>
                </>
              )}
              <input ref={logoExportInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const dataUrl = await readImageAsPng(file, 400);
                  await saveClubLogo(dataUrl);
                  runLogoExportPrompt(dataUrl);
                } catch { cpbAlert?.("Impossible de lire cette image, essaie un autre fichier (PNG, JPEG, WEBP...)."); }
              }} />
            </div>
          </div>
        )}

        {viewingExercise && (
          <ExerciseViewer ex={viewingExercise} onClose={() => setViewingExercise(null)}
            onEdit={() => { setEditing(viewingExercise); setShowForm(true); setViewingExercise(null); }}
            showSocialExport={isAdmin} />
        )}

        {view === "sessions" && !reviewItems && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "Oswald, sans-serif" }}>SÉANCES</h2>
              <div className="flex gap-2 flex-wrap justify-end">
                <button data-tour="session-draw" onClick={() => setView("draw")} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 text-[#1B2A4A] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#1B2A4A]/5"><Pencil size={16} /> Dessiner</button>
                {newTeamOpen ? (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                      placeholder="Nom de l'équipe"
                      onKeyDown={e => { if (e.key === "Enter" && newTeamName.trim()) { createTeam(newTeamName.trim()); setNewTeamName(""); setNewTeamOpen(false); } if (e.key === "Escape") { setNewTeamOpen(false); setNewTeamName(""); } }}
                      className="border border-[#1B2A4A]/20 rounded-md px-3 py-2 text-sm w-36 focus:outline-none focus:border-[#FF6B35]" />
                    <button onClick={() => { if (newTeamName.trim()) { createTeam(newTeamName.trim()); setNewTeamName(""); } setNewTeamOpen(false); }}
                      className="bg-[#1B2A4A] text-white px-3 py-2 rounded-md text-sm">OK</button>
                    <button onClick={() => { setNewTeamOpen(false); setNewTeamName(""); }} className="text-[#1B2A4A]/40 px-2 py-2 text-sm">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setNewTeamOpen(true)} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 text-[#1B2A4A] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#1B2A4A]/5"><Users size={16} /> Nouvelle équipe</button>
                )}
                <button data-tour="new-session" onClick={handleNewSession} className="flex items-center gap-1.5 text-white px-3 py-2 rounded-md text-sm font-medium hover:brightness-90 transition-[filter]" style={{ backgroundColor: "var(--sport-accent)" }}><Plus size={16} /> Nouvelle séance</button>
              </div>
            </div>

            {teamPickerOpen && (
              <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                  <h3 className="font-bold text-[#1B2A4A] text-lg mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>POUR QUELLE ÉQUIPE ?</h3>
                  <div className="space-y-2">
                    {teams.map(t => (
                      <button key={t.id} onClick={() => { setTeamPickerOpen(false); newSession(t.id); }}
                        className="w-full text-left px-4 py-3 rounded-lg border border-[#1B2A4A]/15 hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-colors">
                        <span className="font-semibold text-[#1B2A4A]">{t.nom}</span>
                        {t.niveau && <span className="text-xs text-[#1B2A4A]/40 ml-2">{t.niveau}</span>}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setTeamPickerOpen(false)} className="mt-4 w-full text-sm text-[#1B2A4A]/40 hover:text-[#1B2A4A]">Annuler</button>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {[...teams, ...(sessions.some(s => !s.teamId) ? [{ id: null, nom: "Sans équipe", niveau: "" }] : [])].map(t => {
                const tSessions = sessions.filter(s => (s.teamId || null) === (t.id || null));
                const tSeasons = [...new Set(tSessions.map(s => getSeason(s.date)))].sort().reverse();
                return (
                  <div key={t.id || "no-team"}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-[#1B2A4A]/10" />
                      <span className="font-bold text-[#1B2A4A] text-sm uppercase tracking-wider px-2">{t.nom || "Sans équipe"}{t.niveau ? ` — ${t.niveau}` : ""}</span>
                      {t.id && (
                        <button onClick={() => { if (window.confirm(`Supprimer l'équipe "${t.nom}" ?`)) deleteTeam(t.id); }}
                          className="text-[#1B2A4A]/25 hover:text-red-500 transition-colors" title="Supprimer l'équipe">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <div className="h-px flex-1 bg-[#1B2A4A]/10" />
                    </div>
                    {tSessions.length === 0 ? (
                      <p className="text-sm text-[#1B2A4A]/30 text-center py-3">Aucune séance pour le moment</p>
                    ) : (
                      tSeasons.map(season => {
                        const sSessions = tSessions.filter(s => getSeason(s.date) === season).sort((a, b) => new Date(b.date) - new Date(a.date));
                        const mGroups = sSessions.reduce((acc, s) => {
                          const d = new Date(s.date);
                          const label = isNaN(d) ? "Sans date" : `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
                          (acc[label] = acc[label] || []).push(s);
                          return acc;
                        }, {});
                        return (
                          <div key={season} className="mb-4">
                            <div className="text-xs uppercase tracking-widest font-semibold mb-2 ml-1" style={{ color: "var(--sport-accent)" }}>{season}</div>
                            <div className="space-y-1.5">
                              {Object.entries(mGroups).map(([month, mSessions]) => (
                                <MonthRow key={month} month={month} monthSessions={mSessions} totalDuree={totalDuree}
                                  onOpen={(s) => { setActiveSession(s); setView("session"); history.pushState({ view: "session" }, "", "#session"); }}
                                  onRename={(s, titre) => saveSessions(sessions.map(x => x.id === s.id ? { ...x, titre } : x))}
                                  onDelete={(s) => saveSessions(sessions.filter(x => x.id !== s.id))} />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
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
                <ImportReviewCard key={item.id} item={item} themes={themes} sportFormats={SPORT_FORMATS}
                  onChange={(next) => setReviewItems(reviewItems.map(r => r.id === item.id ? next : r))}
                  onRemove={() => setReviewItems(reviewItems.filter(r => r.id !== item.id))} />
              ))}
            </div>
          </div>
        )}

        {view === "session" && activeSession && (
          <div>
            <div className="flex items-center justify-between mb-5 no-print">
              <button onClick={() => setViewPersist("sessions")} className="text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">← Retour aux séances</button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSessionDrawer(true)} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 px-3 py-1.5 rounded-md text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5"><Pencil size={14} /> {currentSessionPhoto ? "Modifier le dessin" : "Dessiner la séance"}</button>
                <button onClick={() => setShowSessionOrganizer(true)} className="flex items-center gap-1.5 border border-[#1B2A4A]/20 px-3 py-1.5 rounded-md text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5"><Printer size={14} /> Aperçu / Imprimer</button>
                <button onClick={() => isPremium ? shareSession(activeSession) : setPaywallReason("Le partage de séances est une fonctionnalité Premium.")}
                  className="flex items-center gap-1.5 border border-[#1B2A4A]/20 px-3 py-1.5 rounded-md text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5">
                  <Share2 size={14} /> Partager
                </button>
              </div>
            </div>
            <div className="flex items-start gap-4 mb-4">
              {clubLogo && <img src={clubLogo} alt="Logo club" className="w-16 h-16 object-contain flex-shrink-0 rounded" />}
              <div className="flex-1 min-w-0">
                <input value={activeSession.titre} onChange={e => updateSession({ ...activeSession, titre: e.target.value })}
                  className="text-2xl font-bold text-[#1B2A4A] bg-transparent border-b-2 border-transparent focus:border-[#FF6B35] outline-none w-full mb-3"
                  style={{ fontFamily: "Oswald, sans-serif" }} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Date</div>
                    <input type="date" value={activeSession.date}
                      onChange={e => updateSession({ ...activeSession, date: e.target.value })}
                      className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Équipe</div>
                    <select value={activeSession.teamId || ""}
                      onChange={e => updateSession({ ...activeSession, teamId: e.target.value || null })}
                      className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]">
                      <option value="">Sans équipe</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.nom}{t.niveau ? ` (${t.niveau})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Lieu</div>
                    <input value={activeSession.lieu || ""}
                      onChange={e => updateSession({ ...activeSession, lieu: e.target.value })}
                      placeholder="Gymnase, salle..."
                      className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">
                      Joueurs présents{teams.find(t => t.id === activeSession.teamId)?.nbJoueurs ? ` / ${teams.find(t => t.id === activeSession.teamId).nbJoueurs}` : ""}
                    </div>
                    <input type="number" min={0} value={activeSession.presents ?? ""}
                      placeholder="—"
                      onChange={e => updateSession({ ...activeSession, presents: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>
              </div>
            </div>
            {sport === "handball" && (
              <div className="grid grid-cols-2 gap-3 mb-4 no-print">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Objectif séance</div>
                  <input value={activeSession.objectif || ""} onChange={e => updateSession({ ...activeSession, objectif: e.target.value })}
                    placeholder="Objectif principal..."
                    className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Cycle</div>
                  <input value={activeSession.cycle || ""} onChange={e => updateSession({ ...activeSession, cycle: e.target.value })}
                    placeholder="Ex: Semaine 3, Cycle 1..."
                    className="w-full text-sm text-[#1B2A4A] bg-white/60 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 outline-none focus:border-[#FF6B35]" />
                </div>
              </div>
            )}
            <div className="mb-6 no-print">
              <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-1.5">Thèmes de la séance</div>
              <input value={sessionThemeSearch} onChange={e => setSessionThemeSearch(e.target.value)}
                placeholder="Rechercher ou + nouveau thème..."
                className="w-full mb-2 text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1.5 bg-white/60 outline-none focus:border-[#FF6B35]"
                onKeyDown={e => {
                  if (e.key !== "Enter" || !sessionThemeSearch.trim()) return;
                  const t = sessionThemeSearch.trim();
                  if (!themes.some(x => x.toLowerCase() === t.toLowerCase())) saveThemes([...themes, t]);
                  const cur = activeSession.themes || [];
                  if (!cur.includes(t)) updateSession({ ...activeSession, themes: [...cur, t] });
                  setSessionThemeSearch("");
                }} />
              <div className="flex flex-wrap gap-1.5">
                {themes
                  .filter(t => t.toLowerCase().includes(sessionThemeSearch.trim().toLowerCase()))
                  .map(t => (
                    <Tag key={t} color="orange" active={(activeSession.themes || []).includes(t)}
                      onClick={() => {
                        const cur = activeSession.themes || [];
                        updateSession({ ...activeSession, themes: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
                      }}>{t}</Tag>
                  ))}
                {sessionThemeSearch.trim() && !themes.some(t => t.toLowerCase().includes(sessionThemeSearch.trim().toLowerCase())) && (
                  <p className="text-xs text-[#1B2A4A]/40 w-full">Aucun thème existant ne correspond — Entrée pour l'ajouter.</p>
                )}
              </div>
            </div>
            <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-2 no-print">Durée totale : {totalDuree(activeSession)} min</div>

            {/* Photo de séance */}
            <div className="mb-6 no-print">
              <input ref={sessionPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleSessionPhotoFile} />
              <input ref={sessionCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSessionPhotoFile} />
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
                  <img src={currentSessionPhoto} alt="" onClick={() => setViewSessionPhotoFull(true)}
                    className="w-full rounded-lg border border-[#1B2A4A]/10 object-contain max-h-80 cursor-zoom-in" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => sessionCameraRef.current.click()}
                    className="border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-4 flex flex-col items-center justify-center gap-2 text-sm text-[#1B2A4A]/50 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                    <Camera size={18} /><span className="text-xs">Prendre une photo</span>
                  </button>
                  <button onClick={() => sessionPhotoInputRef.current.click()}
                    className="border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-4 flex flex-col items-center justify-center gap-2 text-sm text-[#1B2A4A]/50 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                    <ImageIcon size={18} /><span className="text-xs">Galerie</span>
                  </button>
                </div>
              )}
            </div>

            {/* Liste exercices */}
            <div className="space-y-2 mb-8">
              {activeSession.exerciseIds.length === 0 && <p className="text-[#1B2A4A]/40 text-sm">Ajoute des exercices depuis la bibliothèque ci-dessous.</p>}
              {activeSession.exerciseIds.map((id) => {
                const ex = exercises.find(e => e.id === id);
                if (!ex) return null;
                return (
                  <div key={id} className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setViewingSessionExercise(ex)}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#1B2A4A] truncate">{ex.titre}</div>
                      <div className="text-xs text-[#1B2A4A]/50">{ex.duree} min · {ex.format}{ex.themes?.length ? " · " + ex.themes.slice(0, 2).join(", ") : ""}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); updateSession({ ...activeSession, exerciseIds: activeSession.exerciseIds.filter(x => x !== id) }); }}
                      className="text-[#1B2A4A]/40 hover:text-red-600 no-print ml-3 flex-shrink-0"><X size={16} /></button>
                  </div>
                );
              })}
            </div>

            {/* Blocs texte : du contenu de séance (ex: "5c5 sur un play, 10 min") sans créer
                un exercice réutilisable dans la bibliothèque — compté dans la durée et les
                stats par thème comme un exercice, mais jamais dans exercises/la bibliothèque. */}
            <div className="mb-8">
              {(activeSession.notes || []).length > 0 && (
                <div className="space-y-2 mb-2">
                  {activeSession.notes.map((n) => (
                    <div key={n.id} className="border border-dashed border-[#1B2A4A]/25 rounded-lg bg-[#1B2A4A]/[0.03] p-3 flex items-center justify-between cursor-pointer hover:bg-[#1B2A4A]/[0.06] transition-colors"
                      onClick={() => {
                        setEditingNoteId(n.id);
                        setNoteTitre(n.titre);
                        setNoteDuree(n.duree);
                        setNoteTheme(n.theme || "");
                        setNoteFormOpen(true);
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#1B2A4A] truncate">{n.titre}</div>
                        <div className="text-xs text-[#1B2A4A]/50">{n.duree} min{n.theme ? ` · ${n.theme}` : ""} · hors bibliothèque</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); updateSession({ ...activeSession, notes: activeSession.notes.filter(x => x.id !== n.id) }); }}
                        className="text-[#1B2A4A]/40 hover:text-red-600 no-print ml-3 flex-shrink-0"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              {noteFormOpen ? (
                <div className="border border-[#1B2A4A]/15 rounded-lg p-3 space-y-2 no-print">
                  <input autoFocus value={noteTitre} onChange={e => setNoteTitre(e.target.value)}
                    placeholder="Ex: 5c5 sur un play" className="w-full border border-[#1B2A4A]/20 rounded-md px-2.5 py-1.5 text-sm bg-white" />
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={noteDuree} onFocus={e => e.target.select()}
                      onChange={e => setNoteDuree(e.target.value === "" ? "" : Number(e.target.value))}
                      onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) setNoteDuree(1); }}
                      className="w-20 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white" />
                    <span className="text-xs text-[#1B2A4A]/40">min</span>
                    <select value={noteTheme} onChange={e => setNoteTheme(e.target.value)}
                      className="flex-1 border border-[#1B2A4A]/20 rounded-md px-2 py-1.5 text-sm bg-white">
                      <option value="">Sans thème</option>
                      {themes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!noteTitre.trim()) return;
                      if (editingNoteId) {
                        updateSession({
                          ...activeSession,
                          notes: activeSession.notes.map(x => x.id === editingNoteId
                            ? { ...x, titre: noteTitre.trim(), duree: noteDuree || 1, theme: noteTheme || null }
                            : x),
                        });
                      } else {
                        const note = { id: uid(), titre: noteTitre.trim(), duree: noteDuree || 1, theme: noteTheme || null };
                        updateSession({ ...activeSession, notes: [...(activeSession.notes || []), note] });
                      }
                      setNoteTitre(""); setNoteDuree(10); setNoteTheme(""); setNoteFormOpen(false); setEditingNoteId(null);
                    }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: "var(--sport-accent)" }}>{editingNoteId ? "Enregistrer" : "Ajouter"}</button>
                    <button onClick={() => { setNoteFormOpen(false); setNoteTitre(""); setEditingNoteId(null); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1B2A4A]/20 text-[#1B2A4A]/60">Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditingNoteId(null); setNoteTitre(""); setNoteDuree(10); setNoteTheme(""); setNoteFormOpen(true); }}
                  className="w-full border-2 border-dashed border-[#1B2A4A]/20 rounded-lg py-2.5 text-xs font-semibold text-[#1B2A4A]/50 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors no-print">
                  + Ajouter un bloc texte (hors bibliothèque)
                </button>
              )}
            </div>

            {/* Suggestions */}
            <div className="no-print mb-8">
              {(() => {
                const sessionThemes = activeSession.themes || [];
                const notInSession = exercises.filter(e => !activeSession.exerciseIds.includes(e.id));
                const filtered = addExerciseThemeFilter.length > 0
                  ? notInSession.filter(e => (e.themes || []).some(t => addExerciseThemeFilter.includes(t)))
                  : sessionThemes.length > 0
                    ? notInSession.filter(e => (e.themes || []).some(t => sessionThemes.includes(t)))
                    : notInSession;
                const suggested = filtered.slice(0, addExerciseThemeFilter.length > 0 ? 30 : 8);
                return (
                  <>
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#1B2A4A]/60 uppercase tracking-wide">Suggestions</h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {addExerciseThemeFilter.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">
                            {t}
                            <button type="button" onClick={() => setAddExerciseThemeFilter(f => f.filter(x => x !== t))} className="hover:text-red-600"><X size={9} /></button>
                          </span>
                        ))}
                        <div className="relative">
                          <input value={addExerciseThemeSearch} onChange={e => setAddExerciseThemeSearch(e.target.value)}
                            placeholder="Rechercher par thème..." className="text-xs border border-[#1B2A4A]/20 rounded-full px-3 py-1 w-40 bg-white/60 outline-none focus:border-[#FF6B35]" />
                          {addExerciseThemeSearch.trim() && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-[#1B2A4A]/10 py-1 w-52 max-h-48 overflow-y-auto">
                              {themes.filter(t => t.toLowerCase().includes(addExerciseThemeSearch.trim().toLowerCase()) && !addExerciseThemeFilter.includes(t)).length === 0 ? (
                                <p className="text-xs text-[#1B2A4A]/40 px-3 py-2">Aucun thème ne correspond.</p>
                              ) : themes.filter(t => t.toLowerCase().includes(addExerciseThemeSearch.trim().toLowerCase()) && !addExerciseThemeFilter.includes(t)).map(t => (
                                <button key={t} type="button"
                                  onClick={() => { setAddExerciseThemeFilter(f => [...f, t]); setAddExerciseThemeSearch(""); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#1B2A4A] hover:bg-[#FF6B35]/5">{t}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {suggested.length === 0 ? (
                      <p className="text-xs text-[#1B2A4A]/40">
                        {addExerciseThemeFilter.length > 0 ? "Aucun exercice avec ce(s) thème(s)." : "Aucune suggestion — tous les exercices sont déjà dans la séance."}
                      </p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {suggested.map(ex => (
                          <div key={ex.id} onClick={() => addToSession(ex.id)}
                            className="flex-shrink-0 w-40 border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3 cursor-pointer hover:shadow-md hover:border-[#FF6B35]/40 transition-all">
                            <div className="font-medium text-[#1B2A4A] text-sm leading-tight mb-1 line-clamp-2">{ex.titre}</div>
                            <div className="text-xs text-[#1B2A4A]/50">{ex.duree} min · {ex.format}</div>
                            {ex.themes?.[0] && <div className="text-[10px] text-[#FF6B35] mt-1 truncate">{ex.themes[0]}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Plays */}
            {plays.length > 0 && (
              <div className="no-print mb-8">
                {(activeSession.playIds || []).length > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-2">Plays de la séance</div>
                    {(activeSession.playIds || []).map(id => {
                      const play = plays.find(p => p.id === id);
                      if (!play) return null;
                      return (
                        <div key={id} className="border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#1B2A4A] truncate">{play.titre}</div>
                            <div className="text-xs font-medium mt-0.5" style={{ color: "var(--sport-accent)" }}>{play.type}</div>
                          </div>
                          <button onClick={() => updateSession({ ...activeSession, playIds: (activeSession.playIds || []).filter(x => x !== id) })}
                            className="text-[#1B2A4A]/40 hover:text-red-600 no-print ml-2 flex-shrink-0"><X size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <h3 className="text-sm font-semibold text-[#1B2A4A]/60 uppercase tracking-wide mb-2">Ajouter depuis le Play Book</h3>
                <div className="relative mb-2">
                  <input value={sessionPlaySearch} onChange={e => setSessionPlaySearch(e.target.value)}
                    placeholder="Rechercher un play par titre, mot-clé, type..."
                    className="w-full text-sm border border-[#1B2A4A]/20 rounded-lg pl-9 pr-8 py-2 bg-white/60 outline-none focus:border-[#FF6B35]" />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" /></svg>
                  {sessionPlaySearch && (
                    <button onClick={() => setSessionPlaySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={14} /></button>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {(() => {
                    const q = sessionPlaySearch.trim().toLowerCase();
                    const available = plays.filter(p => !(activeSession.playIds || []).includes(p.id));
                    const matching = q
                      ? available.filter(p => p.titre?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)))
                      : available;
                    if (matching.length === 0) return <p className="text-xs text-[#1B2A4A]/40">Aucun play ne correspond.</p>;
                    return matching.map(play => (
                      <div key={play.id} onClick={() => updateSession({ ...activeSession, playIds: [...(activeSession.playIds || []), play.id] })}
                        className="flex-shrink-0 w-40 border border-[#1B2A4A]/15 rounded-lg bg-white/70 p-3 cursor-pointer hover:shadow-md hover:border-[#FF6B35]/40 transition-all">
                        <div className="font-medium text-[#1B2A4A] text-sm leading-tight mb-1 line-clamp-2">{play.titre}</div>
                        <div className="text-xs font-medium" style={{ color: "var(--sport-accent)" }}>{play.type}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Fullscreen photo séance */}
        {viewSessionPhotoFull && currentSessionPhoto && (
          <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center" onClick={() => setViewSessionPhotoFull(false)}>
            <img src={currentSessionPhoto} alt="" className="max-w-full max-h-full object-contain" />
            <button onClick={() => setViewSessionPhotoFull(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/30 rounded-full p-2"><X size={22} /></button>
          </div>
        )}

        {/* Visualiseur exercice depuis séance */}
        {viewingSessionExercise && (
          <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={() => setViewingSessionExercise(null)}>
            <div className="bg-[#F2EDE4] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-[#1B2A4A]/10">
                <h2 className="font-bold text-[#1B2A4A] text-lg leading-tight" style={{ fontFamily: "Oswald, sans-serif" }}>{viewingSessionExercise.titre}</h2>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button onClick={() => { setEditing(viewingSessionExercise); setShowForm(true); setViewingSessionExercise(null); setViewPersist("library"); }}
                    className="flex items-center gap-1 text-xs text-[#FF6B35] border border-[#FF6B35]/30 px-2.5 py-1 rounded-lg hover:bg-[#FF6B35]/5">
                    <Pencil size={12} /> Modifier
                  </button>
                  <button onClick={() => setViewingSessionExercise(null)} className="text-[#1B2A4A]/40 hover:text-[#1B2A4A]"><X size={20} /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-[#1B2A4A]/60">
                  <span className="flex items-center gap-1"><Clock size={12} />{viewingSessionExercise.duree} min</span>
                  <span>{viewingSessionExercise.format}</span>
                  <span>{viewingSessionExercise.niveau}</span>
                  {catList(viewingSessionExercise).length > 0 && <span className="px-2 py-0.5 rounded bg-[#1B2A4A]/8">{catList(viewingSessionExercise).join(", ")}</span>}
                </div>
                {viewingSessionExercise.themes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingSessionExercise.themes.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35]">{t}</span>)}
                  </div>
                )}
                {viewingSessionExercise.diagram ? (
                  <CourtDiagram players={viewingSessionExercise.diagram.players} paths={viewingSessionExercise.diagram.paths} screens={viewingSessionExercise.diagram.screens} />
                ) : viewingSessionExercise.file ? (
                  <ExerciseFormImagePreview ex={viewingSessionExercise} />
                ) : null}
                {viewingSessionExercise.objectif && (
                  <div><div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Objectif</div><p className="text-sm text-[#1B2A4A]">{viewingSessionExercise.objectif}</p></div>
                )}
                {viewingSessionExercise.notes && (
                  <div><div className="text-xs uppercase tracking-wide text-[#1B2A4A]/40 mb-1">Consignes</div><p className="text-sm text-[#1B2A4A] whitespace-pre-wrap">{viewingSessionExercise.notes}</p></div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
      <ScrollToTopButton />

      <input ref={quickAddCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleQuickAddPhoto} />

      <nav className="fixed bottom-0 left-0 right-0 z-[400] bg-white border-t border-[#1B2A4A]/10 shadow-[0_-2px_12px_rgba(27,42,74,0.08)] no-print"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 pt-1.5 pb-1.5">
          {[
            { key: "library", label: "Bibliothèque", icon: Library },
            { key: "sessions", label: "Séances", icon: ListPlus, alsoActive: "session" },
          ].map(item => {
            const active = view === item.key || view === item.alsoActive;
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => setViewPersist(item.key)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg"
                style={{ color: active ? SPORT_COLOR : "#1B2A4A80" }}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setQuickAddOpen(true)}
            className="-mt-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center border-4 border-white hover:brightness-90 transition-[filter]"
            style={{ backgroundColor: SPORT_COLOR }} aria-label="Ajouter avec une photo">
            <Camera size={24} />
          </button>
          {[
            { key: "playbook", label: "Play Book", icon: BookOpen },
          ].map(item => {
            const active = view === item.key;
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => setViewPersist(item.key)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg"
                style={{ color: active ? SPORT_COLOR : "#1B2A4A80" }}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setQuickCreateOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg" style={{ color: "#1B2A4A80" }}>
            <Plus size={20} />
            <span className="text-[10px] font-medium">Créer</span>
          </button>
        </div>
      </nav>

      {quickAddOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setQuickAddOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="text-center text-sm font-semibold text-[#1B2A4A]/70 mb-3">Ajouter une photo pour...</div>
            <div className="space-y-2">
              {[
                { key: "exercise", label: "Un exercice", icon: Library },
                { key: "play", label: "Un play", icon: BookOpen },
                { key: "session", label: "Une séance", icon: ListPlus },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key}
                    onClick={() => { setQuickAddTarget(opt.key); setQuickAddOpen(false); quickAddCameraRef.current?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1B2A4A]/10 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-colors text-left">
                    <Icon size={20} className="text-[#FF6B35]" />
                    <span className="font-medium text-[#1B2A4A]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setQuickAddOpen(false)} className="w-full mt-3 py-2 text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
          </div>
        </div>
      )}
      {quickCreateOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setQuickCreateOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="text-center text-sm font-semibold text-[#1B2A4A]/70 mb-3">Créer avec le dessinateur pour...</div>
            <div className="space-y-2">
              <button onClick={() => { setAutoOpenDrawForNew(true); setEditing(null); setShowForm(true); setViewPersist("library"); setQuickCreateOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1B2A4A]/10 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-colors text-left">
                <Library size={20} className="text-[#FF6B35]" />
                <span className="font-medium text-[#1B2A4A]">Un exercice</span>
              </button>
              <button onClick={() => { setAutoOpenDrawForNew(true); setEditingPlay(null); setPlaybookForm(true); setViewPersist("playbook"); setQuickCreateOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1B2A4A]/10 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-colors text-left">
                <BookOpen size={20} className="text-[#FF6B35]" />
                <span className="font-medium text-[#1B2A4A]">Un play</span>
              </button>
            </div>
            <button onClick={() => setQuickCreateOpen(false)} className="w-full mt-3 py-2 text-sm text-[#1B2A4A]/50 hover:text-[#1B2A4A]">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Minimum 6 caractères."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => onDone(), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Nouveau mot de passe</h2>
        <p className="text-sm text-[#1B2A4A]/50 mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
        {done ? (
          <p className="text-green-600 text-sm">✅ Mot de passe mis à jour ! Redirection...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="password" placeholder="Nouveau mot de passe" value={password} onChange={e => setPassword(e.target.value)} required className="border border-[#1B2A4A]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B2A4A]" />
            <input type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} required className="border border-[#1B2A4A]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B2A4A]" />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="bg-[#1B2A4A] text-white rounded-xl py-3 text-sm font-medium">
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SharedPlayPublicView({ token }) {
  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imported, setImported] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    supabase.from("shared_plays").select("play_data, expires_at").eq("token", token).maybeSingle()
      .then(({ data }) => {
        if (!data) { setError("Lien invalide ou expiré."); }
        else if (data.expires_at && new Date(data.expires_at) < new Date()) { setError("Ce lien a expiré."); }
        else { setPlay(data.play_data); }
        setLoading(false);
      });
  }, [token]);

  if (showLogin) return <AuthScreen />;

  if (loading) return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <div className="text-[#1B2A4A]/50 text-sm">Chargement du play...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🏀</div>
        <div className="text-[#1B2A4A] font-bold mb-2">{error}</div>
        <a href="/" className="text-[#FF6B35] text-sm underline">Aller sur Coaching Pro Boost</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2EDE4] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#FF6B35", textTransform: "uppercase", marginBottom: 6 }}>Coaching Pro Boost</div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 26, fontWeight: 800, color: "#1B2A4A" }}>Un coach partage</div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 26, fontWeight: 800, color: "#FF6B35" }}>ce système avec toi</div>
        </div>

        {/* Play card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg mb-4">
          <div className="bg-[#1B2A4A] px-5 py-4">
            {play.type && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#FF6B35", textTransform: "uppercase", marginBottom: 4 }}>{play.type}</div>}
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 22, fontWeight: 800, color: "white" }}>{play.titre}</div>
            {play.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{play.description}</p>}
            {(play.tags || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {play.tags.map(t => <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,107,53,0.2)", color: "#FF6B35", borderRadius: 20 }}>{t}</span>)}
              </div>
            )}
          </div>

          {/* Schemas */}
          {play.schemas?.length > 0 && (
            <div className="p-4 flex flex-col gap-3">
              {play.schemas.map((s, i) => (
                <img key={i} src={s} className="w-full rounded-xl border border-[#1B2A4A]/10" alt={`Schéma ${i+1}`} />
              ))}
            </div>
          )}

          {play.notes && (
            <div className="px-5 pb-4">
              <p style={{ fontSize: 13, color: "#1B2A4A", opacity: 0.6, fontStyle: "italic" }}>{play.notes}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
          <div style={{ fontSize: 13, color: "#1B2A4A", opacity: 0.6, marginBottom: 16 }}>
            Importe ce système directement dans ton application pour l'utiliser dans ton playbook.
          </div>
          <button onClick={() => setShowLogin(true)}
            style={{ display: "block", width: "100%", background: "#FF6B35", color: "white", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 16, padding: "14px 20px", borderRadius: 14, border: "none", cursor: "pointer", marginBottom: 12 }}>
            📥 IMPORTER CE SYSTÈME
          </button>
          <a href="/" style={{ display: "block", fontSize: 12, color: "#1B2A4A", opacity: 0.4, textDecoration: "none" }}>
            Ouvrir Coaching Pro Boost
          </a>
        </div>
      </div>
    </div>
  );
}

function SharedPlayCollectionPublicView({ token }) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    supabase.from("shared_play_collections").select("title, plays, expires_at").eq("token", token).maybeSingle()
      .then(({ data }) => {
        if (!data) { setError("Lien invalide ou expiré."); }
        else if (data.expires_at && new Date(data.expires_at) < new Date()) { setError("Ce lien a expiré."); }
        else { setCollection(data); }
        setLoading(false);
      });
  }, [token]);

  if (showLogin) return <AuthScreen />;

  if (loading) return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <div className="text-[#1B2A4A]/50 text-sm">Chargement du scouting report...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🏀</div>
        <div className="text-[#1B2A4A] font-bold mb-2">{error}</div>
        <a href="/" className="text-[#FF6B35] text-sm underline">Aller sur Coaching Pro Boost</a>
      </div>
    </div>
  );

  const plays = collection.plays || [];

  return (
    <div className="min-h-screen bg-[#F2EDE4] px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#FF6B35", textTransform: "uppercase", marginBottom: 6 }}>Coaching Pro Boost</div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 26, fontWeight: 800, color: "#1B2A4A" }}>Un coach partage</div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 26, fontWeight: 800, color: "#FF6B35" }}>{plays.length} play{plays.length > 1 ? "s" : ""} avec toi</div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-lg mb-4">
          <div className="bg-[#1B2A4A] px-5 py-4">
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 22, fontWeight: 800, color: "white" }}>{collection.title || "Scouting Report"}</div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {plays.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#F2EDE4]">
                <div style={{ background: "#1B2A4A", color: "#fff", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, fontFamily: "Oswald, sans-serif", flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div className="text-sm font-bold text-[#1B2A4A]">{p.titre || "Sans titre"}</div>
                  {p.type && <div className="text-xs" style={{ color: "#FF6B35" }}>{p.type}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
          <div style={{ fontSize: 13, color: "#1B2A4A", opacity: 0.6, marginBottom: 16 }}>
            Importe ces {plays.length} play{plays.length > 1 ? "s" : ""} directement dans ton application pour les utiliser dans ton playbook.
          </div>
          <button onClick={() => setShowLogin(true)}
            style={{ display: "block", width: "100%", background: "#FF6B35", color: "white", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 16, padding: "14px 20px", borderRadius: 14, border: "none", cursor: "pointer", marginBottom: 12 }}>
            📥 IMPORTER CES PLAYS
          </button>
          <a href="/" style={{ display: "block", fontSize: 12, color: "#1B2A4A", opacity: 0.4, textDecoration: "none" }}>
            Ouvrir Coaching Pro Boost
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isPasswordRecoveryUrl);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "USER_UPDATED") {
        setIsPasswordRecovery(false);
      }
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Revalidation périodique : détecte rapidement une session révoquée côté serveur
  // (connexion sur un autre appareil = déconnexion des autres, voir "scope: others" plus haut)
  // au lieu d'attendre jusqu'à 1h le renouvellement naturel du jeton JWT.
  useEffect(() => {
    if (!session) return;
    const check = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) await supabase.auth.signOut();
    };
    const id = setInterval(check, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [session]);

  const shareplayToken = new URLSearchParams(window.location.search).get("shareplay");
  const scoutingToken = new URLSearchParams(window.location.search).get("scoutingtoken");

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <div className="text-[#1B2A4A]/50 text-sm">Chargement...</div>
      </div>
    );
  }
  if (isPasswordRecovery) return <ResetPasswordScreen onDone={() => { setIsPasswordRecovery(false); supabase.auth.signOut(); }} />;
  if (!session && shareplayToken) return <SharedPlayPublicView token={shareplayToken} />;
  if (!session && scoutingToken) return <SharedPlayCollectionPublicView token={scoutingToken} />;
  if (!session) return <AuthScreen />;
  return <AlertProvider><ToastProvider><CoachingProBoost key={session.user.id} session={session} /></ToastProvider></AlertProvider>;
}

