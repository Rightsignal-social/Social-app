// src/App.jsx — RightSignal Complete Production App v2.0
// Features: RBAC, Google OAuth, Messaging, Bookmarks, Share, Search, Ads Management, Trending, etc.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Users, Calendar, Lightbulb, Bell, Heart, MessageCircle,
  Repeat2, Share2, X, TrendingUp, Award, FileText, ThumbsUp, ThumbsDown,
  Send, Check, Clock, ExternalLink, Zap, Shield, ChevronRight, ChevronLeft,
  Plus, Globe, Search, Bookmark, Moon, Sun, Edit3, ArrowLeft, Copy, Wallet,
  Gift, Link, Eye, EyeOff, AlertCircle, RefreshCw, LogOut, User, Mail, Lock,
  Image, Mic, MicOff, Smile, MapPin, Users2, Trash2, Hash, Video,
  MessageSquare, Twitter, Linkedin, Instagram, Phone, Star, Filter,
  MoreHorizontal, ChevronDown, Settings, Flag, BarChart2,
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────
const SB_URL = "https://kzdjzasopqwzctwebiap.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZGp6YXNvcHF3emN0d2ViaWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjM1NTgsImV4cCI6MjA5MjA5OTU1OH0.VqGDt7JVvkP413tl40EIh3IFqtyhX1OMrv3iCGaMvls";
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const ADMIN_EMAIL = "jjatan220@gmail.com";

// ─── OAUTH TOKEN DETECTION (runs before React) ────────────────────
// Detect Google OAuth return immediately — before any component mounts.
// Supabase returns tokens in the URL hash: #access_token=...
// We grab it here and store in sessionStorage so the App component can read it.
(function detectOAuthReturn() {
  try {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const token = params.get("access_token");
      const refresh = params.get("refresh_token") || "";
      const expiresIn = parseInt(params.get("expires_in") || "3600", 10);
      if (token) {
        const sess = {
          access_token: token,
          refresh_token: refresh,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        };
        sessionStorage.setItem("rs_oauth_return", JSON.stringify(sess));
        localStorage.setItem("rs_session", JSON.stringify(sess));
        // Clean the URL immediately so hash is gone before React reads it
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  } catch {}
})();

// ─── ROLES ───────────────────────────────────────────────────────
const ROLES = {
  admin: "Admin",
  management: "Management Team",
  ops: "Ops Team",
  growth_catalyst: "Growth Catalyst",
  community_manager: "Community Manager",
  country_head: "Country Head",
  continental_head: "Continental Head",
  user: "Regular User",
};

// ─── SUPABASE AUTH ────────────────────────────────────────────────
const sbAuth = {
  signUp: (email, password, name) =>
    fetch(`${SB_URL}/auth/v1/signup`, { method: "POST", headers: H, body: JSON.stringify({ email, password, data: { name } }) }).then(r => r.json()),
  signIn: (email, password) =>
    fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email, password }) }).then(r => r.json()),
  signOut: token =>
    fetch(`${SB_URL}/auth/v1/logout`, { method: "POST", headers: { ...H, Authorization: `Bearer ${token}` } }),
  getUser: token =>
    fetch(`${SB_URL}/auth/v1/user`, { headers: { ...H, Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
  googleOAuth: () => {
    const redirectTo = "https://social-app-omega-brown.vercel.app";
    sessionStorage.setItem("rs_oauth_pending", "1");
    window.location.href = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&scopes=email%20profile`;
  },
};

// ─── SUPABASE DB ──────────────────────────────────────────────────
const db = {
  get: async (t, q = "") => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}${q ? "?" + q : ""}`, { headers: H });
      return r.ok ? r.json() : [];
    } catch { return []; }
  },
  post: async (t, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) });
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  },
  postMany: async (t, rows) => {
    if (!rows?.length) return [];
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(rows) });
      return r.ok ? r.json() : [];
    } catch { return []; }
  },
  patch: async (t, q, body) => {
    try { await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "PATCH", headers: H, body: JSON.stringify(body) }); } catch {}
  },
  del: async (t, q) => {
    try { await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "DELETE", headers: H }); } catch {}
  },
  upsert: async (t, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) });
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  },
};

// ─── UTILS ───────────────────────────────────────────────────────
const ago = d => { const s = (Date.now() - d) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${~~(s / 60)}m`; if (s < 86400) return `${~~(s / 3600)}h`; return `${~~(s / 86400)}d`; };
const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtDate = t => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const genId = () => Math.random().toString(36).slice(2, 10);
const hexStr = n => Array.from({ length: n }, () => "0123456789abcdef"[~~(Math.random() * 16)]).join("");
const strColor = s => { const c = ["#3b82f6","#10b981","#8b5cf6","#f97316","#f43f5e","#06b6d4","#ec4899","#f59e0b"]; let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff; return c[Math.abs(h) % c.length]; };
const genHandle = n => n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + genId().slice(0, 4);
const genRefCode = n => n.toUpperCase().replace(/\s+/g, "").slice(0, 5) + "-" + hexStr(4).toUpperCase();
const callAI = async prompt => {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] }) });
    const d = await r.json();
    return d.content?.[0]?.text || "No response.";
  } catch { return "AI unavailable."; }
};
const extractTags = t => (t.match(/#[a-zA-Z0-9_]+/g) || []).map(h => h.toLowerCase());
const fileToB64 = (file, maxMB = 3) => new Promise((res, rej) => {
  if (file.size > maxMB * 1024 * 1024) { rej(new Error(`Max ${maxMB}MB`)); return; }
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// RBAC helpers
const hasRole = (profile, ...roles) => roles.includes(profile?.system_role) || profile?.is_admin;
const isAdmin = p => p?.is_admin || p?.system_role === "admin";
const canManageAds = p => isAdmin(p) || ["growth_catalyst", "management"].includes(p?.system_role);

// ─── THEME ───────────────────────────────────────────────────────
const T = dk => ({
  bg: dk ? "#080d18" : "#f0f2f8", surf: dk ? "#0e1525" : "#fff", surf2: dk ? "#131d30" : "#f4f6fb",
  bdr: dk ? "#1c2d47" : "#e2e8f0", txt: dk ? "#e8eeff" : "#0f172a", txt2: dk ? "#7a93c0" : "#475569",
  txt3: dk ? "#3d5278" : "#94a3b8", inp: dk ? "#131d30" : "#f8fafc", inpB: dk ? "#1c2d47" : "#cbd5e1",
  side: dk ? "#080d18" : "#fff", top: dk ? "rgba(8,13,24,.96)" : "rgba(255,255,255,.96)",
});

// ─── GLOBAL CSS ───────────────────────────────────────────────────
const GlobalCSS = ({ dk }) => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin     { to   { transform:rotate(360deg); } }
    @keyframes floatUp  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
    @keyframes glow     { 0%,100% { box-shadow:0 0 8px rgba(245,158,11,.4); } 50% { box-shadow:0 0 22px rgba(245,158,11,.9); } }
    @keyframes popIn    { 0% { transform:scale(.7); opacity:0; } 80% { transform:scale(1.1); } 100% { transform:scale(1); opacity:1; } }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${dk ? "#1c2d47" : "#d1d5db"}; border-radius: 99px; }
    input::placeholder, textarea::placeholder { color: ${dk ? "#3d5278" : "#94a3b8"}; }
    a { text-decoration: none; }
    button { font-family: inherit; }
  `}</style>
);

// ─── STATIC DATA ─────────────────────────────────────────────────
const WHO_OPTS = [
  { id: "founder", label: "Founder", e: "🚀", c: "#f97316" },
  { id: "investor", label: "Investor", e: "💰", c: "#10b981" },
  { id: "professional", label: "Professional", e: "💼", c: "#3b82f6" },
  { id: "entrepreneur", label: "Entrepreneur", e: "⚡", c: "#8b5cf6" },
  { id: "developer", label: "Developer", e: "👾", c: "#06b6d4" },
  { id: "designer", label: "Designer", e: "🎨", c: "#ec4899" },
  { id: "diplomat", label: "Diplomat", e: "🌐", c: "#f59e0b" },
  { id: "selfemployed", label: "Self-Employed", e: "🧠", c: "#ef4444" },
  { id: "student", label: "Student", e: "🎓", c: "#84cc16" },
  { id: "researcher", label: "Researcher", e: "🔬", c: "#6366f1" },
  { id: "creator", label: "Creator", e: "✨", c: "#f43f5e" },
  { id: "executive", label: "Executive", e: "🏛️", c: "#0ea5e9" },
];
const INT_OPTS = [
  { id: "tech", label: "Technology", e: "💻", c: "#3b82f6" }, { id: "startups", label: "Startups", e: "🚀", c: "#f97316" },
  { id: "ai", label: "AI", e: "🤖", c: "#8b5cf6" }, { id: "finance", label: "Finance & VC", e: "📈", c: "#10b981" },
  { id: "news", label: "Global News", e: "🌍", c: "#06b6d4" }, { id: "sports", label: "Sports", e: "⚽", c: "#ef4444" },
  { id: "music", label: "Music", e: "🎵", c: "#ec4899" }, { id: "design", label: "Design & UX", e: "🎨", c: "#f59e0b" },
  { id: "science", label: "Science", e: "🔬", c: "#84cc16" }, { id: "crypto", label: "Web3 & Crypto", e: "⛓️", c: "#f43f5e" },
  { id: "health", label: "Health", e: "🧬", c: "#0ea5e9" }, { id: "gaming", label: "Gaming", e: "🎮", c: "#7c3aed" },
  { id: "travel", label: "Travel", e: "✈️", c: "#059669" }, { id: "fun", label: "Fun & Memes", e: "😂", c: "#dc2626" },
];
const EMOJIS = ["😀","😂","🥰","😎","🤔","🚀","💡","🔥","👍","❤️","🎉","💪","🙏","✨","🌟","💰","🤝","👏","🎯","💼","🌍","⚡","🛠️","📊","🎨","😮","🤯","👀","💯","🏆"];
const TAGS = ["#SignalTokens","#StartupSandbox","#BuildInPublic","#AlignNotFollow","#AIStartups","#RightSignal","#Founders","#VentureCapital"];
const PHASES = ["week1","week2","week3","week4","hackathon"];
const PH_LABEL = { week1:"Idea Eval", week2:"Interviews", week3:"Refinement", week4:"Final", hackathon:"Hackathon" };
const ST_LABEL = { submitted:"Pending", shortlisted_50:"Week 1 ✓", shortlisted_30:"Week 2 ✓", shortlisted_15:"Week 3 ✓", finalist_10:"Top 10 Finalist", winner:"Winner 🏆", rejected:"Not Selected" };
const SB_CYCLE = { title: "Sandbox Cohort 3", phase: "week2" };
const CAT_COLORS = { Technology:"#3b82f6", Product:"#10b981", Developer:"#06b6d4", Leadership:"#8b5cf6", Design:"#ec4899", Startup:"#f97316", General:"#6b7280" };
const TYP_COLORS = { article:"#3b82f6", tool:"#10b981", idea:"#f59e0b" };

const SEED_POSTS = [
  { uid:"seed", text:"🚀 Just launched RightSignal — a platform for founders, investors and builders to share signal over noise. #RightSignal #Founders #BuildInPublic", like_count:47, repost_count:12, media:[], hashtags:["#rightsignal","#founders","#buildinpublic"] },
  { uid:"seed", text:"The best time to start was yesterday. The second best time is now. Stop overthinking and ship it. 💡 #BuildInPublic #Startups", like_count:89, repost_count:23, media:[], hashtags:["#buildinpublic","#startups"] },
  { uid:"seed", text:"Hot take: Most startup failures are not due to bad products. Founders solve problems that dont exist at scale. Always validate first. #StartupSandbox", like_count:134, repost_count:45, media:[], hashtags:["#startupsandbox"] },
];
const SEED_EVENTS = [
  { title:"Global AI & Startup Summit 2025", description:"5,000+ founders, investors & builders online. 100% free.", category:"Technology", event_date:new Date(Date.now()+259200000).toISOString(), timezone:"UTC", source:"Eventbrite", url:"#", is_free:true, popularity:4200 },
  { title:"Product-Led Growth Masterclass", description:"PLG from Notion, Figma & Calendly leaders. Live Q&A.", category:"Product", event_date:new Date(Date.now()+604800000).toISOString(), timezone:"IST", source:"Meetup", url:"#", is_free:true, popularity:1800 },
  { title:"Open Source Contributors Meetup", description:"Monthly gathering. Find collaborators & get feedback.", category:"Developer", event_date:new Date(Date.now()+172800000).toISOString(), timezone:"EST", source:"Meetup", url:"#", is_free:true, popularity:890 },
];
const SEED_SANDBOX = [
  { uid:"seed", title:"SkillSwap", problem:"Freelancers pay 20–30% fees.", solution:"P2P skill exchange, zero commission.", audience:"Freelancers", status:"finalist_10", score_w1:9.6, score_w2:9.2, score_w3:9.0 },
  { uid:"seed", title:"MindBridge", problem:"Mental health resources are fragmented.", solution:"AI platform with culturally-matched counselors.", audience:"Young adults", status:"shortlisted_30", score_w1:9.1, score_w2:8.7, score_w3:null },
];
const SEED_CONTRIBS = [
  { uid:"seed", type:"article", title:"Why Most Startup Ideas Fail in Year One", body:"After analyzing 200+ failed startups: founders solve problems that don't exist at scale.", upvotes:234, downvotes:12 },
  { uid:"seed", type:"tool", title:"Open Source Rate Limiter for NestJS", body:"Battle-tested Redis-backed rate limiting middleware. MIT licensed.", upvotes:156, downvotes:8 },
];

// ─── ATOMS ───────────────────────────────────────────────────────
function Av({ profile = {}, size = 36, bal }) {
  const name = profile.name || "?";
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = profile.hue || strColor(name);
  const ring = bal > 0 ? "2px solid #f59e0b" : "none";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: profile.avatar ? "transparent" : `linear-gradient(135deg,${hue},${hue}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, color: "#fff", flexShrink: 0, overflow: "hidden", border: ring, boxSizing: "border-box" }}>
      {profile.avatar ? <img src={profile.avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
    </div>
  );
}

function SGN({ n, size = "sm", pulse = false }) {
  const sizes = { sm: { f: 10, p: "1px 6px" }, md: { f: 11, p: "3px 8px" }, lg: { f: 14, p: "5px 12px" } };
  const s = sizes[size];
  if (!n) return null;
  return (
    <span style={{ background: "linear-gradient(135deg,#78350f,#d97706)", color: "#fff", fontSize: s.f, fontWeight: 800, padding: s.p, borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 3, animation: pulse ? "glow 2s ease-in-out infinite" : "none", flexShrink: 0 }}>
      ◈ {n} SGN
    </span>
  );
}

function Spin({ size = 32, dk = false, msg = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32 }}>
      <div style={{ width: size, height: size, border: `3px solid ${dk ? "#1c2d47" : "#e2e8f0"}`, borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      {msg && <span style={{ fontSize: 13, color: dk ? "#7a93c0" : "#64748b" }}>{msg}</span>}
    </div>
  );
}

function CopyBtn({ text, label = "Copy" }) {
  const [ok, setOk] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(text); } catch {} setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 4, background: ok ? "#10b98118" : "rgba(59,130,246,.12)", border: `1px solid ${ok ? "#10b98140" : "rgba(59,130,246,.3)"}`, borderRadius: 7, padding: "3px 10px", cursor: "pointer", color: ok ? "#10b981" : "#3b82f6", fontSize: 11, fontWeight: 700 }}>
      {ok ? <><Check size={10} />Copied!</> : <><Copy size={10} />{label}</>}
    </button>
  );
}

function TokenPop({ amount, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, background: "linear-gradient(135deg,#78350f,#d97706)", borderRadius: 16, padding: "16px 24px", zIndex: 9999, boxShadow: "0 8px 30px rgba(245,158,11,.4)", animation: "popIn .4s ease", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 28 }}>◈</span>
      <div><div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>+{amount} SGN Earned!</div><div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>Signal Token reward</div></div>
    </div>
  );
}

function Card({ children, dk, style: ext = {}, anim = true }) {
  const th = T(dk);
  return (
    <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: 16, marginBottom: 12, animation: anim ? "fadeUp .3s ease" : "none", ...ext }}>
      {children}
    </div>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────
function RightSignalLogo({ size = 32, showText = true, dk = false }) {
  const th = T(dk);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.3, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(59,130,246,.4)", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: size * 0.5 }}>R</span>
      </div>
      {showText && (
        <div>
          <div style={{ fontWeight: 800, fontSize: size * 0.47, color: th.txt, lineHeight: 1 }}>RightSignal</div>
          <div style={{ fontSize: size * 0.22, color: th.txt3, fontWeight: 600, letterSpacing: 0.5 }}>SIGNAL OVER NOISE</div>
        </div>
      )}
    </div>
  );
}

// ─── SHARE MODAL ─────────────────────────────────────────────────
function ShareModal({ post, onClose, dk }) {
  const th = T(dk);
  const text = encodeURIComponent(`${(post.text || "").slice(0, 100)} — RightSignal`);
  const url = encodeURIComponent(window.location.href);
  const [copied, setCopied] = useState(false);

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "RightSignal Post", text: post.text || "", url: window.location.href }); } catch {}
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: th.txt }}>Share Post</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "WhatsApp", color: "#25d366", icon: "💬", action: shareWhatsApp },
            { label: "Telegram", color: "#2aabee", icon: "✈️", action: shareTelegram },
            { label: copied ? "Copied!" : "Copy Link", color: "#6b7280", icon: "🔗", action: copyLink },
            { label: "Share", color: "#8b5cf6", icon: "📤", action: nativeShare },
          ].map(({ label, color, icon, action }) => (
            <button key={label} onClick={action} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 14, cursor: "pointer", color }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE REPOST MODAL ───────────────────────────────────────────
function QuoteRepostModal({ post, me, myProfile, profiles, onQuotePost, onSimpleRepost, onClose, dk }) {
  const th = T(dk);
  const [thought, setThought] = useState("");
  const [mode, setMode] = useState("choice"); // choice | quote

  if (mode === "choice") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 300 }}>
        <h3 style={{ margin: "0 0 16px", color: th.txt, fontSize: 16, fontWeight: 700 }}>Repost Options</h3>
        <button onClick={() => { onSimpleRepost(post); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", marginBottom: 10, color: th.txt }}>
          <Repeat2 size={18} color="#10b981" /><div style={{ textAlign: "left" }}><div style={{ fontWeight: 600, fontSize: 14 }}>Repost</div><div style={{ fontSize: 12, color: th.txt3 }}>Instantly repost to followers</div></div>
        </button>
        <button onClick={() => setMode("quote")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt }}>
          <Edit3 size={18} color="#3b82f6" /><div style={{ textAlign: "left" }}><div style={{ fontWeight: 600, fontSize: 14 }}>Quote Repost</div><div style={{ fontSize: 12, color: th.txt3 }}>Add your thoughts</div></div>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 380 }}>
        <h3 style={{ margin: "0 0 14px", color: th.txt, fontSize: 16, fontWeight: 700 }}>Quote Repost</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <Av profile={myProfile || {}} size={32} />
          <textarea value={thought} onChange={e => setThought(e.target.value)} placeholder="Add your thoughts..." rows={3} style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 12px", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", color: th.txt }} />
        </div>
        <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: th.txt3, marginBottom: 4 }}>{profiles[post.uid]?.name || "User"}</div>
          <p style={{ margin: 0, fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{(post.text || "").slice(0, 120)}{post.text?.length > 120 ? "…" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
          <button onClick={() => { onQuotePost(post, thought); onClose(); }} style={{ flex: 1, padding: "9px", background: "#3b82f6", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Quote Repost</button>
        </div>
      </div>
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────
function PostCard({ post, me, onLike, onRepost, onQuoteRepost, onComment, onBookmark, dk, onProfile, bals, profiles, onTag, bookmarks = [] }) {
  const th = T(dk);
  const [showCmt, setShowCmt] = useState(false);
  const [cmt, setCmt] = useState("");
  const [mediaIdx, setMediaIdx] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const auth = profiles[post.uid] || { name: "RightSignal User", hue: "#6b7280" };
  const bal = bals[post.uid] ?? 0;
  const mediaItems = post.media || [];
  const isBookmarked = bookmarks.includes(post.id);

  const submit = () => { if (cmt.trim()) { onComment(post.id, cmt); setCmt(""); setShowCmt(false); } };
  const handleRepostClick = () => setShowRepostMenu(true);

  return (
    <>
      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} dk={dk} />}
      {showRepostMenu && (
        <QuoteRepostModal
          post={post} me={me} myProfile={profiles[me]} profiles={profiles}
          onSimpleRepost={onRepost} onQuotePost={onQuoteRepost}
          onClose={() => setShowRepostMenu(false)} dk={dk}
        />
      )}
      <Card dk={dk}>
        {post.reposted_by && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: th.txt3, marginBottom: 8 }}>
            <Repeat2 size={12} />
            <span>{profiles[post.reposted_by]?.name || "Someone"} reposted</span>
            {post.quote_text && <span style={{ color: th.txt2 }}>with comment</span>}
          </div>
        )}
        {post.quote_text && (
          <div style={{ background: "linear-gradient(135deg,#3b82f610,#8b5cf610)", border: "1px solid #3b82f630", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: th.txt, lineHeight: 1.5, fontStyle: "italic" }}>"{post.quote_text}"</p>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={() => onProfile(post.uid)} style={{ cursor: "pointer" }}><Av profile={auth} bal={bal} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span onClick={() => onProfile(post.uid)} style={{ fontWeight: 700, fontSize: 14, color: th.txt, cursor: "pointer" }}>{auth.name}</span>
              {auth.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
              {auth.system_role && auth.system_role !== "user" && (
                <span style={{ color: th.txt3, fontSize: 10, background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>{ROLES[auth.system_role] || auth.system_role}</span>
              )}
              {bal > 0 && <SGN n={bal} size="sm" />}
              <span style={{ color: th.txt3, fontSize: 11, marginLeft: "auto" }}>{ago(post.ts)}</span>
            </div>
            {post.text && (
              <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.75, color: th.txt, whiteSpace: "pre-wrap" }}>
                {post.text.split(/(\*\*[^*]+\*\*|#[a-zA-Z0-9_]+)/g).map((p, i) => {
                  if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
                  if (p.startsWith("#")) return <span key={i} style={{ color: "#3b82f6", fontWeight: 600, cursor: "pointer" }} onClick={() => onTag?.(p.toLowerCase())}>{p}</span>;
                  return <span key={i}>{p}</span>;
                })}
              </p>
            )}
            {post.hashtags?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {post.hashtags.map((h, i) => (
                  <span key={i} onClick={() => onTag?.(h)} style={{ fontSize: 12, background: "#3b82f618", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, cursor: "pointer", fontWeight: 600 }}>{h}</span>
                ))}
              </div>
            )}
            {mediaItems.length > 0 && (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 10 }}>
                {mediaItems[mediaIdx]?.type === "audio"
                  ? <div style={{ height: 60, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
                      <Mic size={20} color="#fff" />
                      <audio src={mediaItems[mediaIdx].url} controls style={{ flex: 1, height: 36 }} />
                    </div>
                  : mediaItems[mediaIdx]?.type?.startsWith("video")
                    ? <video src={mediaItems[mediaIdx].url} controls style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
                    : <img src={mediaItems[mediaIdx]?.url} alt="post" style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} />
                }
                {mediaItems.length > 1 && (
                  <>
                    <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                      {mediaItems.map((_, i) => <div key={i} onClick={() => setMediaIdx(i)} style={{ width: i === mediaIdx ? 16 : 6, height: 6, borderRadius: 99, background: i === mediaIdx ? "#fff" : "rgba(255,255,255,.5)", cursor: "pointer", transition: "all .2s" }} />)}
                    </div>
                    {mediaIdx > 0 && <button onClick={() => setMediaIdx(i => i - 1)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ChevronLeft size={14} /></button>}
                    {mediaIdx < mediaItems.length - 1 && <button onClick={() => setMediaIdx(i => i + 1)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ChevronRight size={14} /></button>}
                  </>
                )}
              </div>
            )}
            {post.is_sponsored && (
              <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, background: "#f59e0b15", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 6 }}>SPONSORED</div>
            )}
            {post.comments?.length > 0 && (
              <div style={{ background: th.surf2, borderRadius: 10, padding: 10, marginBottom: 8, border: `1px solid ${th.bdr}` }}>
                {post.comments.slice(0, 3).map(c => {
                  const cp = profiles[c.uid] || { name: "User" };
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 7, marginBottom: 6 }}>
                      <div onClick={() => onProfile(c.uid)} style={{ cursor: "pointer" }}><Av profile={cp} size={22} /></div>
                      <div style={{ flex: 1, background: th.surf, borderRadius: 8, padding: "5px 10px", border: `1px solid ${th.bdr}` }}>
                        <span onClick={() => onProfile(c.uid)} style={{ fontWeight: 600, fontSize: 12, color: th.txt, cursor: "pointer" }}>{cp.name} </span>
                        <span style={{ fontSize: 12, color: th.txt2 }}>{c.text}</span>
                      </div>
                    </div>
                  );
                })}
                {post.comments.length > 3 && <p style={{ fontSize: 11, color: th.txt3, margin: "4px 0 0" }}>+{post.comments.length - 3} more</p>}
              </div>
            )}
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 4 }}>
              <button onClick={() => onLike(post.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: post.liked ? "#ef444418" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: post.liked ? "#ef4444" : th.txt3, fontSize: 13, fontWeight: post.liked ? 700 : 400 }}>
                <Heart size={14} fill={post.liked ? "#ef4444" : "none"} /> {fmt(post.likes)}
              </button>
              <button onClick={() => setShowCmt(x => !x)} style={{ display: "flex", alignItems: "center", gap: 4, background: showCmt ? "#3b82f618" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: showCmt ? "#3b82f6" : th.txt3, fontSize: 13 }}>
                <MessageCircle size={14} /> {post.comments?.length || ""}
              </button>
              <button onClick={handleRepostClick} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: th.txt3, fontSize: 13 }}>
                <Repeat2 size={14} /> {fmt(post.reposts)}
              </button>
              <button onClick={() => setShowShare(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: th.txt3, fontSize: 13 }}>
                <Share2 size={14} />
              </button>
              <button onClick={() => onBookmark?.(post.id)} style={{ display: "flex", alignItems: "center", background: isBookmarked ? "#3b82f618" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: isBookmarked ? "#3b82f6" : th.txt3, marginLeft: "auto" }}>
                <Bookmark size={14} fill={isBookmarked ? "#3b82f6" : "none"} />
              </button>
            </div>
            {showCmt && (
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <Av profile={profiles[me] || {}} size={28} />
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <input value={cmt} onChange={e => setCmt(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Write a reply..." style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, outline: "none", color: th.txt }} />
                  <button onClick={submit} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 12px", cursor: "pointer", color: "#fff" }}><Send size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

// ─── COMPOSER ─────────────────────────────────────────────────────
function Composer({ me, onPost, dk, myProfile }) {
  const th = T(dk);
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recDur, setRecDur] = useState(0);
  const [loc, setLoc] = useState(null);
  const [fetchLoc, setFetchLoc] = useState(false);
  const [mediaErr, setMediaErr] = useState("");
  const fileRef = useRef();
  const recRef = useRef();
  const timerRef = useRef();
  const tags = extractTags(text);
  const canPost = text.trim() || media.length > 0;

  const addMedia = async files => {
    setMediaErr("");
    const newItems = [];
    for (const f of files) {
      try {
        const b64 = await fileToB64(f);
        newItems.push({ type: f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image", url: b64, name: f.name });
      } catch (e) { setMediaErr(e.message); }
    }
    setMedia(m => [...m, ...newItems].slice(0, 4));
  };

  const insertBold = () => {
    const sel = window.getSelection?.()?.toString();
    if (sel) setText(t => t.replace(sel, `**${sel}**`));
    else setText(t => t + "****");
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setMedia(m => [...m, { type: "audio", url: reader.result, name: "voice.webm" }]);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setRecDur(0);
      timerRef.current = setInterval(() => setRecDur(d => d + 1), 1000);
    } catch {}
  };

  const stopRec = () => { recRef.current?.stop(); setRecording(false); clearInterval(timerRef.current); };

  const getLoc = () => {
    setFetchLoc(true);
    navigator.geolocation?.getCurrentPosition(
      p => { setLoc({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); setFetchLoc(false); },
      () => setFetchLoc(false)
    );
  };

  const doPost = () => {
    if (!canPost) return;
    onPost(text.trim(), media, loc, tags);
    setText(""); setMedia([]); setLoc(null); setShowEmoji(false);
  };

  return (
    <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Av profile={myProfile || {}} size={38} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What's your signal today?" rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 15, lineHeight: 1.6, resize: "none", fontFamily: "inherit", color: T(dk).txt, boxSizing: "border-box" }} />
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {tags.map((t, i) => <span key={i} style={{ fontSize: 12, background: "#3b82f618", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{t}</span>)}
            </div>
          )}
          {media.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid #3b82f640" }}>
                  {m.type === "image" ? <img src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : m.type === "audio" ? <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mic size={20} color="#fff" /></div>
                    : <div style={{ width: "100%", height: "100%", background: "#1c2d47", display: "flex", alignItems: "center", justifyContent: "center" }}><Video size={20} color="#7a93c0" /></div>}
                  <button onClick={() => setMedia(m => m.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.6)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          {loc && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#10b981", marginBottom: 8 }}>
              <MapPin size={12} />📍 {loc.lat}, {loc.lng}
              <button onClick={() => setLoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, marginLeft: 4 }}><X size={10} /></button>
            </div>
          )}
          {mediaErr && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 8px" }}>{mediaErr}</p>}
          {showEmoji && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: T(dk).surf2, borderRadius: 10, padding: 10, marginBottom: 10, border: `1px solid ${T(dk).bdr}` }}>
              {EMOJIS.map(e => <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>{e}</button>)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${T(dk).bdr}`, paddingTop: 10, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { icon: <Image size={16} />, tip: "Photo/Video", action: () => fileRef.current?.click() },
                { icon: recording ? <MicOff size={16} /> : <Mic size={16} />, tip: recording ? `Stop (${recDur}s)` : "Voice", action: recording ? stopRec : startRec },
                { icon: <Smile size={16} />, tip: "Emoji", action: () => setShowEmoji(x => !x) },
                { icon: <MapPin size={16} />, tip: "Location", action: getLoc },
              ].map(({ icon, tip, action }) => (
                <button key={tip} onClick={action} title={tip} style={{ background: "transparent", border: "none", cursor: "pointer", color: recording && tip.includes("Stop") ? "#ef4444" : T(dk).txt3, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }}>{icon}</button>
              ))}
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={e => addMedia([...e.target.files])} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {text.length > 0 && <span style={{ fontSize: 12, color: text.length > 500 ? "#ef4444" : T(dk).txt3 }}>{text.length}/500</span>}
              <button onClick={doPost} disabled={!canPost} style={{ background: canPost ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "transparent", border: `1px solid ${canPost ? "transparent" : T(dk).bdr}`, borderRadius: 10, padding: "7px 20px", color: canPost ? "#fff" : T(dk).txt3, fontSize: 13, fontWeight: 700, cursor: canPost ? "pointer" : "default", boxShadow: canPost ? "0 0 14px rgba(59,130,246,.3)" : "none", transition: "all .2s" }}>
                Post Signal
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────
function SearchBar({ dk, profiles, onProfile, onTag }) {
  const th = T(dk);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ users: [], tags: [] });
  const ref = useRef();

  useEffect(() => {
    if (!q.trim()) { setResults({ users: [], tags: [] }); setOpen(false); return; }
    const lower = q.toLowerCase();
    const users = Object.values(profiles).filter(p => p.name?.toLowerCase().includes(lower) || p.handle?.toLowerCase().includes(lower) || p.bio?.toLowerCase().includes(lower)).slice(0, 5);
    const tagPool = ["#rightsignal","#startupsandbox","#buildinpublic","#founders","#ai","#tech","#startups","#finance","#crypto","#design"];
    const tags = tagPool.filter(t => t.includes(lower) && lower.startsWith("#")).slice(0, 4);
    setResults({ users, tags });
    setOpen(true);
  }, [q, profiles]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, maxWidth: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: th.inp, borderRadius: 10, padding: "7px 12px", border: `1px solid ${th.inpB}` }}>
        <Search size={13} style={{ color: th.txt3, flexShrink: 0 }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder="Search users, posts, hashtags…"
          style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: th.txt, width: "100%" }}
        />
        {q && <button onClick={() => { setQ(""); setOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 0 }}><X size={12} /></button>}
      </div>
      {open && (results.users.length > 0 || results.tags.length > 0) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, boxShadow: `0 10px 40px rgba(0,0,0,${dk ? .5 : .12})`, zIndex: 200, maxHeight: 320, overflowY: "auto", marginTop: 4 }}>
          {results.users.length > 0 && (
            <>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5 }}>PEOPLE</div>
              {results.users.map(u => (
                <div key={u.id} onClick={() => { onProfile(u.id); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderRadius: 8 }}>
                  <Av profile={u} size={32} />
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: th.txt }}>{u.name}</div><div style={{ fontSize: 11, color: th.txt3 }}>{u.handle ? `@${u.handle}` : u.email}</div></div>
                </div>
              ))}
            </>
          )}
          {results.tags.length > 0 && (
            <>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5 }}>HASHTAGS</div>
              {results.tags.map(t => (
                <div key={t} onClick={() => { onTag?.(t); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer" }}>
                  <Hash size={14} color="#3b82f6" />
                  <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FEED VIEW ────────────────────────────────────────────────────
function FeedView({ me, dk, myProfile, onProfile, bals, profiles, addNotif, bookmarks, onBookmark }) {
  const th = T(dk);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("For You");
  const [activeTag, setActiveTag] = useState(null);

  const load = useCallback(async () => {
    const [rp, ml, ac] = await Promise.all([
      db.get("rs_posts", "order=created_at.desc&limit=80"),
      db.get("rs_post_likes", `uid=eq.${me}`),
      db.get("rs_comments", "order=created_at.asc"),
    ]);
    const ls = new Set((ml || []).map(l => l.post_id));
    let rows = rp || [];
    if (!rows.length) { await db.postMany("rs_posts", SEED_POSTS); rows = await db.get("rs_posts", "order=created_at.desc&limit=80") || []; }
    setPosts(rows.map(p => ({
      id: p.id, uid: p.uid, text: p.text, media: p.media || [],
      hashtags: p.hashtags || [], location: p.location,
      likes: p.like_count || 0, reposts: p.repost_count || 0,
      liked: ls.has(p.id), comments: (ac || []).filter(c => c.post_id === p.id),
      ts: new Date(p.created_at).getTime(), reposted_by: p.reposted_by,
      quote_text: p.quote_text, is_sponsored: p.is_sponsored,
    })));
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  const addPost = async (text, media, location, hashtags) => {
    const saved = await db.post("rs_posts", { uid: me, text, media, location, hashtags, like_count: 0, repost_count: 0 });
    if (saved) setPosts(ps => [{ id: saved.id, uid: me, text, media, location, hashtags, likes: 0, reposts: 0, liked: false, comments: [], ts: Date.now() }, ...ps]);
  };

  const toggleLike = async id => {
    const p = posts.find(x => x.id === id); if (!p) return;
    const nl = !p.liked, lc = nl ? p.likes + 1 : p.likes - 1;
    setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: nl, likes: lc } : x));
    if (nl) { await db.post("rs_post_likes", { post_id: id, uid: me }); if (p.uid !== me) addNotif({ type: "like", msg: "❤ Someone liked your post" }); }
    else await db.del("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
    await db.patch("rs_posts", `id=eq.${id}`, { like_count: lc });
  };

  const doRepost = async orig => {
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, comments: [], ts: Date.now(), reposted_by: me };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc } : x)]);
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    await db.post("rs_posts", { uid: orig.uid, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me });
    addNotif({ type: "comment", msg: "🔁 You reposted a signal" });
  };

  const doQuoteRepost = async (orig, quoteText) => {
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, comments: [], ts: Date.now(), reposted_by: me, quote_text: quoteText };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc } : x)]);
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, quote_text: quoteText });
    addNotif({ type: "comment", msg: "💬 You quote reposted a signal" });
  };

  const addComment = async (id, text) => {
    const saved = await db.post("rs_comments", { post_id: id, uid: me, text });
    if (saved) setPosts(ps => ps.map(x => x.id === id ? { ...x, comments: [...x.comments, { ...saved, uid: me }] } : x));
  };

  const getFiltered = () => {
    let filtered = posts;
    if (activeTag) return filtered.filter(p => p.hashtags?.includes(activeTag) || p.text?.toLowerCase().includes(activeTag));
    if (tab === "Trending") return [...filtered].sort((a, b) => (b.likes + b.reposts * 2) - (a.likes + a.reposts * 2));
    if (tab === "Following") return filtered.filter(p => p.uid === me);
    if (tab === "Bookmarks") return filtered.filter(p => bookmarks.includes(p.id));
    return filtered;
  };

  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);

  return (
    <div>
      {whoOpt && (
        <div style={{ background: dk ? `linear-gradient(135deg,${whoOpt.c}18,transparent)` : `${whoOpt.c}10`, border: `1px solid ${whoOpt.c}30`, borderRadius: 16, padding: 12, marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>{whoOpt.e}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Welcome back, {myProfile?.name?.split(" ")[0]}!</div>
            <div style={{ fontSize: 12, color: th.txt2 }}>Curated for {myProfile?.interests?.slice(0, 3).map(id => INT_OPTS.find(x => x.id === id)?.label).filter(Boolean).join(", ")}</div>
          </div>
        </div>
      )}
      <Composer me={me} onPost={addPost} dk={dk} myProfile={myProfile} />
      {activeTag && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#3b82f618", border: "1px solid #3b82f640", borderRadius: 10, padding: "8px 14px" }}>
          <Hash size={14} style={{ color: "#3b82f6" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>{activeTag}</span>
          <button onClick={() => setActiveTag(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#3b82f6", display: "flex" }}><X size={14} /></button>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["For You", "Trending", "Following", "Bookmarks"].map(t => (
          <button key={t} onClick={() => { setTab(t); setActiveTag(null); }} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t && !activeTag ? "#3b82f6" : "transparent", color: tab === t && !activeTag ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>{t}</button>
        ))}
      </div>
      {loading ? <Spin dk={dk} msg="Loading feed..." /> : getFiltered().length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{tab === "Bookmarks" ? "🔖" : "✨"}</div>
          <p style={{ fontSize: 15 }}>{tab === "Bookmarks" ? "No bookmarks yet. Save posts to see them here." : activeTag ? `No posts with ${activeTag}` : "No posts yet. Be the first!"}</p>
        </div>
      ) : getFiltered().map(p => (
        <PostCard key={p.id + p.ts} post={p} me={me} onLike={toggleLike} onRepost={doRepost} onQuoteRepost={doQuoteRepost} onComment={addComment} onBookmark={onBookmark} dk={dk} onProfile={onProfile} bals={bals} profiles={profiles} onTag={setActiveTag} bookmarks={bookmarks} />
      ))}
    </div>
  );
}

// ─── NETWORK VIEW ─────────────────────────────────────────────────
function NetworkView({ me, dk, onProfile, bals, profiles, addNotif }) {
  const th = T(dk);
  const [aligned, setAligned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const others = Object.values(profiles).filter(p => p.id !== me);
  const myProfile = profiles[me];

  useEffect(() => {
    db.get("rs_alignments", `follower_uid=eq.${me}`).then(d => { setAligned((d || []).map(r => r.following_uid)); setLoading(false); });
  }, [me]);

  const toggle = async uid => {
    const on = aligned.includes(uid);
    setAligned(a => on ? a.filter(x => x !== uid) : [...a, uid]);
    if (on) await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`);
    else { await db.upsert("rs_alignments", { follower_uid: me, following_uid: uid }); addNotif?.({ type: "follow", msg: `👤 You aligned with ${profiles[uid]?.name || "a member"}` }); }
  };

  const getFiltered = () => {
    if (filter === "aligned") return others.filter(u => aligned.includes(u.id));
    if (filter === "suggested") return others.filter(u => !aligned.includes(u.id) && u.interests?.some(i => myProfile?.interests?.includes(i)));
    return others;
  };

  if (loading) return <Spin dk={dk} msg="Loading network…" />;

  const filtered = getFiltered();

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>People on RightSignal</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 12px" }}>{others.length} member{others.length !== 1 ? "s" : ""} · Discover and align globally</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["all", "All"], ["aligned", "Aligned"], ["suggested", "Suggested"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f6" : "transparent", color: filter === id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 32 }}>No members in this category yet.</p>}
      {filtered.map(u => {
        const bal = bals[u.id] ?? 0;
        const on = aligned.includes(u.id);
        const sharedInterests = u.interests?.filter(i => myProfile?.interests?.includes(i)) || [];
        return (
          <Card dk={dk} key={u.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div onClick={() => onProfile(u.id)} style={{ cursor: "pointer" }}><Av profile={u} size={48} bal={bal} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span onClick={() => onProfile(u.id)} style={{ fontWeight: 700, fontSize: 15, color: th.txt, cursor: "pointer" }}>{u.name}</span>
                      {u.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
                      {u.system_role && u.system_role !== "user" && <span style={{ background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{ROLES[u.system_role]}</span>}
                      {bal > 0 && <SGN n={bal} size="sm" />}
                    </div>
                    {u.handle && <div style={{ fontSize: 12, color: th.txt3 }}>@{u.handle}</div>}
                    {u.bio && <div style={{ fontSize: 13, color: th.txt, marginTop: 3 }}>{u.bio}</div>}
                    {sharedInterests.length > 0 && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>✓ {sharedInterests.length} shared interest{sharedInterests.length > 1 ? "s" : ""}</div>}
                  </div>
                  <button onClick={() => toggle(u.id)} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${on ? "#555" : "#111"}`, background: on ? "#fff" : "#111", color: on ? "#111" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{on ? "Aligned" : "Align"}</button>
                </div>
                {u.interests?.length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                    {u.interests.slice(0, 4).map(id => { const opt = INT_OPTS.find(x => x.id === id); return opt ? <span key={id} style={{ background: `${opt.c}18`, color: opt.c, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{opt.e} {opt.label}</span> : null; })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── EVENTS VIEW ─────────────────────────────────────────────────
function EventsView({ dk, addNotif }) {
  const th = T(dk);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const cats = ["All", "Technology", "Product", "Developer", "Leadership", "Design", "Startup"];

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_events", "order=event_date.asc");
      if (!data?.length) { await db.postMany("rs_events", SEED_EVENTS); data = await db.get("rs_events", "order=event_date.asc") || []; }
      setEvents(data); setLoading(false);
    })();
  }, []);

  const filtered = filter === "All" ? events : events.filter(e => e.category === filter);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>Events</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 14px" }}>Curated global events for the RightSignal community</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filter === c ? CAT_COLORS[c] || "#3b82f6" : th.bdr}`, background: filter === c ? (CAT_COLORS[c] || "#3b82f6") + "18" : "transparent", color: filter === c ? (CAT_COLORS[c] || "#3b82f6") : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}
      </div>
      {loading ? <Spin dk={dk} msg="Loading events…" /> : filtered.map(ev => (
        <Card dk={dk} key={ev.id}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <span style={{ background: (CAT_COLORS[ev.category] || "#6b7280") + "18", color: CAT_COLORS[ev.category] || "#6b7280", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.category}</span>
            <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.is_free ? "FREE" : "PAID"}</span>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: th.txt }}>{ev.title}</h3>
          <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 10px", lineHeight: 1.5 }}>{ev.description}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: th.txt3 }}>
              <span>📅 {fmtDate(ev.event_date)}</span>
              <span>🌐 {ev.timezone}</span>
              {ev.popularity && <span>👥 {fmt(ev.popularity)}+</span>}
            </div>
            <button onClick={() => { addNotif({ type: "sandbox", msg: `📅 Registered for ${ev.title}` }); }} style={{ background: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Register Free</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── SANDBOX VIEW ─────────────────────────────────────────────────
function SandboxView({ me, dk }) {
  const th = T(dk);
  const [tab, setTab] = useState("overview");
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiLoad, setAiLoad] = useState(false);
  const [aiFb, setAiFb] = useState("");
  const [form, setForm] = useState({ title: "", problem: "", solution: "", audience: "", link: "" });
  const phaseIdx = PHASES.indexOf(SB_CYCLE.phase);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const canSubmit = form.title.trim() && form.problem.trim() && form.solution.trim();

  const load = useCallback(async () => {
    setLoading(true);
    let data = await db.get("rs_sandbox", "order=created_at.desc&limit=50");
    if (!data?.length) { await db.postMany("rs_sandbox", SEED_SANDBOX); data = await db.get("rs_sandbox", "order=created_at.desc&limit=50"); }
    setSubs(data || []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const saved = await db.post("rs_sandbox", { uid: me, title: form.title.trim(), problem: form.problem.trim(), solution: form.solution.trim(), audience: form.audience.trim(), link: form.link.trim(), status: "submitted" });
    if (saved) { setSubs(p => [saved, ...p]); setForm({ title: "", problem: "", solution: "", audience: "", link: "" }); setAiFb(""); setSubmitted(true); setTab("leaderboard"); }
    setSubmitting(false);
  };

  const getAIReview = async () => {
    if (!form.title.trim() || !form.problem.trim()) return;
    setAiLoad(true);
    setAiFb(await callAI(`Analyze this startup idea in exactly 3 sections labeled "✅ Strengths:", "⚠️ Risks:", "💡 Improvements:". Be specific.\n\nTitle: ${form.title}\nProblem: ${form.problem}\nSolution: ${form.solution}\nAudience: ${form.audience}`));
    setAiLoad(false);
  };

  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt };

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#5b21b6)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div><h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 2px", color: "#fff" }}>{SB_CYCLE.title}</h2><p style={{ color: "rgba(255,255,255,.55)", fontSize: 13, margin: 0 }}>4-week global startup incubation</p></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,.55)" }}>PHASE</div><div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Week {phaseIdx + 1}</div></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["overview", "submit", "leaderboard"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { e: "📋", t: "Week 1 — Idea Evaluation", d: "Scored on clarity, originality & feasibility. Top 50 advance.", ok: phaseIdx >= 0 },
            { e: "🗣️", t: "Week 2 — Interviews", d: "Top 50 pitch to interviewers. Top 20–30 selected.", ok: phaseIdx >= 1 },
            { e: "🔨", t: "Week 3 — Refinement", d: "Mentor feedback. Top 15 selected.", ok: phaseIdx >= 2 },
            { e: "🏆", t: "Week 4 — Final Selection", d: "Panel review. Top 10 finalists announced.", ok: phaseIdx >= 3 },
            { e: "⚡", t: "Hackathon Day — 24h Build", d: "Build a working prototype.", ok: phaseIdx >= 4 },
          ].map((s, i) => (
            <div key={i} style={{ background: s.ok ? th.surf : th.surf2, border: `1px solid ${s.ok ? "#3b82f630" : th.bdr}`, borderRadius: 14, padding: 14, opacity: s.ok ? 1 : .55 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>{s.e}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{s.t}</div><div style={{ fontSize: 13, color: th.txt2 }}>{s.d}</div></div>
                {i === phaseIdx && <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", background: "#3b82f618", padding: "2px 7px", borderRadius: 99 }}>ACTIVE</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "submit" && (submitted ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: th.txt }}>Idea Submitted!</h3>
          <p style={{ color: th.txt2, fontSize: 14 }}>Saved successfully. Admin will review your submission.</p>
          <button onClick={() => { setSubmitted(false); setTab("leaderboard"); }} style={{ marginTop: 16, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600 }}>View Leaderboard →</button>
        </div>
      ) : (
        <Card dk={dk} anim={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: th.txt }}>Submit Your Startup Idea</h3>
          {[
            { k: "title", l: "Idea Title *", p: "e.g. FarmLedger", m: false },
            { k: "problem", l: "Problem Statement *", p: "What problem are you solving?", m: true },
            { k: "solution", l: "Your Solution *", p: "How does your product solve it?", m: true },
            { k: "audience", l: "Target Audience", p: "Who are your primary users?", m: false },
            { k: "link", l: "Pitch Deck / Links (opt)", p: "https://…", m: false },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{f.l}</label>
              {f.m ? <textarea value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} /> : <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={inp} />}
            </div>
          ))}
          {aiFb && <div style={{ background: dk ? "rgba(6,182,212,.08)" : "#f0f9ff", border: "1px solid #06b6d430", borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.8, color: dk ? "#67e8f9" : "#0c4a6e", whiteSpace: "pre-wrap" }}>{aiFb}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ background: canSubmit ? "#3b82f6" : "transparent", border: `1px solid ${canSubmit ? "transparent" : th.bdr}`, borderRadius: 10, padding: "8px 20px", color: canSubmit ? "#fff" : th.txt3, fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "default" }}>
              {submitting ? "Saving…" : "Submit Idea"}
            </button>
            <button onClick={getAIReview} disabled={!form.title.trim() || !form.problem.trim() || aiLoad} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!form.title.trim() || !form.problem.trim()) ? .45 : 1 }}>
              <Zap size={13} />{aiLoad ? "Analysing…" : "✨ AI Review"}
            </button>
          </div>
        </Card>
      ))}
      {tab === "leaderboard" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: th.txt }}>All Submissions ({subs.length})</h3>
            <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: th.txt2 }}><RefreshCw size={12} />Refresh</button>
          </div>
          {loading ? <Spin dk={dk} /> : subs.map((s, i) => {
            const medals = ["#fbbf24","#94a3b8","#cd7f32"];
            return (
              <Card dk={dk} key={s.id}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: medals[i] || th.bdr, display: "flex", alignItems: "center", justifyContent: "center", color: i < 3 ? "#fff" : th.txt2, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{s.title}</span>
                      <span style={{ background: "#3b82f618", color: "#3b82f6", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{ST_LABEL[s.status] || s.status}</span>
                    </div>
                    <p style={{ fontSize: 13, color: th.txt2, margin: "4px 0 0", lineHeight: 1.5 }}>{s.problem}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CONTRIBUTE VIEW ──────────────────────────────────────────────
function ContributeView({ me, dk }) {
  const th = T(dk);
  const [contribs, setContribs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("browse");
  const [form, setForm] = useState({ type: "article", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    let data = await db.get("rs_contributions", "order=upvotes.desc&limit=50");
    if (!data?.length) { await db.postMany("rs_contributions", SEED_CONTRIBS); data = await db.get("rs_contributions", "order=upvotes.desc&limit=50") || []; }
    setContribs(data); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const vote = async (id, type) => {
    const c = contribs.find(x => x.id === id); if (!c) return;
    const field = type === "up" ? "upvotes" : "downvotes";
    const nv = (c[field] || 0) + 1;
    setContribs(cs => cs.map(x => x.id === id ? { ...x, [field]: nv } : x));
    await db.patch("rs_contributions", `id=eq.${id}`, { [field]: nv });
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSubmitting(true);
    const saved = await db.post("rs_contributions", { uid: me, type: form.type, title: form.title.trim(), body: form.body.trim(), upvotes: 0, downvotes: 0 });
    if (saved) { setContribs(cs => [saved, ...cs]); setForm({ type: "article", title: "", body: "" }); setTab("browse"); }
    setSubmitting(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>Contribute</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 14px" }}>Share articles, tools, and ideas with the community</p>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["browse", "submit"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      {tab === "browse" && (loading ? <Spin dk={dk} /> : contribs.map(c => (
        <Card dk={dk} key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={{ background: (TYP_COLORS[c.type] || "#6b7280") + "18", color: TYP_COLORS[c.type] || "#6b7280", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, textTransform: "capitalize" }}>{c.type}</span>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px", color: th.txt }}>{c.title}</h3>
          <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 10px", lineHeight: 1.5 }}>{c.body.slice(0, 160)}{c.body.length > 160 ? "…" : ""}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => vote(c.id, "up")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#10b98118", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#10b981", fontSize: 12, fontWeight: 600 }}><ThumbsUp size={13} /> {c.upvotes || 0}</button>
            <button onClick={() => vote(c.id, "down")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#ef444418", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 600 }}><ThumbsDown size={13} /> {c.downvotes || 0}</button>
          </div>
        </Card>
      )))}
      {tab === "submit" && (
        <Card dk={dk} anim={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: th.txt }}>Share Your Knowledge</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["article","tool","idea"].map(t => <button key={t} onClick={() => setF("type", t)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${form.type === t ? (TYP_COLORS[t] || "#3b82f6") : th.bdr}`, background: form.type === t ? (TYP_COLORS[t] || "#3b82f6") + "18" : "transparent", color: form.type === t ? (TYP_COLORS[t] || "#3b82f6") : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>)}
            </div>
          </div>
          {[{ k: "title", l: "Title *", p: "Give it a great title", m: false }, { k: "body", l: "Content *", p: "Share your insights…", m: true }].map(f => (
            <div key={f.k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{f.l}</label>
              {f.m ? <textarea value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} rows={5} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, resize: "vertical", fontFamily: "inherit" }} /> : <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt }} />}
            </div>
          ))}
          <button onClick={handleSubmit} disabled={submitting || !form.title.trim() || !form.body.trim()} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "9px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{submitting ? "Submitting…" : "Publish"}</button>
        </Card>
      )}
    </div>
  );
}

// ─── WALLET VIEW ─────────────────────────────────────────────────
function WalletView({ me, bals, setBals, dk, myProfile }) {
  const th = T(dk);
  const myBal = bals[me] ?? 0;
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.get("rs_token_txns", `uid=eq.${me}&order=created_at.desc&limit=30`).then(d => { setTxns(d || []); setLoading(false); });
  }, [me]);

  const claim = async (amount, desc) => {
    const newBal = myBal + amount;
    await db.upsert("rs_token_balances", { uid: me, balance: newBal });
    await db.post("rs_token_txns", { uid: me, type: "earn", amount, description: desc });
    setBals(b => ({ ...b, [me]: newBal }));
    setTxns(ts => [{ id: genId(), uid: me, type: "earn", amount, description: desc, created_at: new Date().toISOString() }, ...ts]);
  };

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#78350f,#d97706)", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 4px 30px rgba(245,158,11,.25)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1, marginBottom: 8 }}>SIGNAL TOKEN BALANCE</div>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 4 }}>◈ {myBal}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)" }}>SGN · RightSignal Network</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ l: "Daily Streak", e: "🔥", amount: 1, desc: "Daily login reward" }, { l: "Share Referral", e: "🔗", amount: 2, desc: "Referral link shared" }, { l: "Post Content", e: "📝", amount: 1, desc: "Content contribution" }, { l: "Engage", e: "💬", amount: 1, desc: "Community engagement" }].map(a => (
          <button key={a.l} onClick={() => claim(a.amount, a.desc)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 16, cursor: "pointer" }}>
            <span style={{ fontSize: 28 }}>{a.e}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: th.txt }}>{a.l}</span>
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>+{a.amount} SGN</span>
          </button>
        ))}
      </div>
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: th.txt }}>Transaction History</h3>
        {loading ? <Spin dk={dk} size={24} /> : txns.length === 0 ? <p style={{ color: th.txt3, textAlign: "center", padding: 16 }}>No transactions yet.</p> : txns.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${th.bdr}` }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: th.txt }}>{t.description}</div><div style={{ fontSize: 11, color: th.txt3 }}>{fmtDate(t.created_at)}</div></div>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.type === "earn" ? "#10b981" : "#ef4444" }}>{t.type === "earn" ? "+" : "-"}◈ {t.amount}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── MESSENGER VIEW ───────────────────────────────────────────────
function MessengerView({ me, dk, profiles, initialUid }) {
  const th = T(dk);
  const [convos, setConvos] = useState([]);
  const [activeUid, setActiveUid] = useState(initialUid || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const msgEndRef = useRef();
  const pollRef = useRef();

  const others = Object.values(profiles).filter(p => p.id !== me);

  const loadConvos = useCallback(async () => {
    const sent = await db.get("rs_messages", `sender_uid=eq.${me}&order=created_at.desc`);
    const recv = await db.get("rs_messages", `receiver_uid=eq.${me}&order=created_at.desc`);
    const all = [...(sent || []), ...(recv || [])];
    const map = {};
    all.forEach(m => {
      const other = m.sender_uid === me ? m.receiver_uid : m.sender_uid;
      if (!map[other] || new Date(m.created_at) > new Date(map[other].created_at)) map[other] = m;
    });
    setConvos(Object.entries(map).map(([uid, last]) => ({ uid, last })).sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at)));
    setLoading(false);
  }, [me]);

  const loadMessages = useCallback(async uid => {
    setLoadingMsgs(true);
    const [sent, recv] = await Promise.all([
      db.get("rs_messages", `sender_uid=eq.${me}&receiver_uid=eq.${uid}&order=created_at.asc`),
      db.get("rs_messages", `sender_uid=eq.${uid}&receiver_uid=eq.${me}&order=created_at.asc`),
    ]);
    const combined = [...(sent || []), ...(recv || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setMessages(combined);
    setLoadingMsgs(false);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [me]);

  useEffect(() => { setLoading(true); loadConvos(); }, [loadConvos]);

  useEffect(() => {
    if (!activeUid) return;
    loadMessages(activeUid);
    pollRef.current = setInterval(() => loadMessages(activeUid), 5000);
    return () => clearInterval(pollRef.current);
  }, [activeUid, loadMessages]);

  const sendMsg = async () => {
    if (!text.trim() || !activeUid) return;
    const msg = { sender_uid: me, receiver_uid: activeUid, text: text.trim() };
    const saved = await db.post("rs_messages", msg);
    if (saved) { setMessages(m => [...m, saved]); setText(""); setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); loadConvos(); }
  };

  const startConvo = uid => { setActiveUid(uid); if (!convos.find(c => c.uid === uid)) setConvos(cs => [{ uid, last: { text: "New conversation", created_at: new Date().toISOString() } }, ...cs]); };

  const activePerson = activeUid ? (profiles[activeUid] || { name: "User" }) : null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 14 }}>
      {/* Conversation list */}
      <div style={{ width: 240, background: th.surf, borderRadius: 16, border: `1px solid ${th.bdr}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "14px 12px", borderBottom: `1px solid ${th.bdr}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: th.txt, marginBottom: 10 }}>Messages</div>
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
            <input placeholder="Find or start chat…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 8, padding: "6px 8px 6px 26px", fontSize: 12, outline: "none", color: th.txt, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <Spin dk={dk} size={20} /> : (
            <>
              {convos.map(({ uid, last }) => {
                const p = profiles[uid] || { name: "User" };
                return (
                  <div key={uid} onClick={() => setActiveUid(uid)} style={{ display: "flex", gap: 10, padding: "10px 12px", cursor: "pointer", background: activeUid === uid ? dk ? "rgba(59,130,246,.1)" : "#eff6ff" : "transparent", borderLeft: activeUid === uid ? "3px solid #3b82f6" : "3px solid transparent" }}>
                    <Av profile={p} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last.text?.slice(0, 30)}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${th.bdr}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 6, letterSpacing: 0.5 }}>START NEW CHAT</div>
                {others.slice(0, 6).map(u => (
                  <div key={u.id} onClick={() => startConvo(u.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                    <Av profile={u} size={24} />
                    <span style={{ fontSize: 12, color: th.txt2 }}>{u.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, background: th.surf, borderRadius: 16, border: `1px solid ${th.bdr}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeUid ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: th.txt3, flexDirection: "column", gap: 12 }}>
            <MessageSquare size={40} />
            <p style={{ margin: 0, fontSize: 14 }}>Select a conversation or start a new one</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${th.bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
              <Av profile={activePerson} size={36} />
              <div><div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{activePerson.name}</div><div style={{ fontSize: 11, color: "#10b981" }}>● Active</div></div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {loadingMsgs ? <Spin dk={dk} size={24} /> : messages.map(m => {
                const isMe = m.sender_uid === me;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    <div style={{ maxWidth: "70%", background: isMe ? "#3b82f6" : th.surf2, color: isMe ? "#fff" : th.txt, borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 14px", fontSize: 13, lineHeight: 1.5 }}>
                      {m.text}
                      <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,.6)" : th.txt3, marginTop: 4, textAlign: "right" }}>{m.created_at ? ago(new Date(m.created_at).getTime()) : ""}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${th.bdr}`, display: "flex", gap: 10 }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Type a message…" style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 12, padding: "9px 14px", fontSize: 13, outline: "none", color: th.txt }} />
              <button onClick={sendMsg} disabled={!text.trim()} style={{ background: text.trim() ? "#3b82f6" : th.surf2, border: "none", borderRadius: 12, padding: "0 16px", cursor: text.trim() ? "pointer" : "default", color: text.trim() ? "#fff" : th.txt3, display: "flex", alignItems: "center" }}>
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────
function ProfileView({ uid: userId, me, dk, onBack, bals, profiles, setBals, onMessage }) {
  const th = T(dk);
  const p = profiles[userId] || { name: "User", bio: "", role: "Member" };
  const isMe = userId === me;
  const balance = bals[userId] ?? 0;
  const refCode = p.ref_code || "";
  const refLink = `${window.location.origin}?ref=${refCode}`;
  const [aligned, setAligned] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(p.bio || "");
  const [website, setWebsite] = useState(p.website || "");
  const [socialLinks, setSocialLinks] = useState(p.social_links || {});
  const [posts, setPosts] = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [avatar, setAvatar] = useState(p.avatar || "");
  const avatarRef = useRef();

  useEffect(() => {
    (async () => {
      const [ps, al, flrs, flng] = await Promise.all([
        db.get("rs_posts", `uid=eq.${userId}&order=created_at.desc&limit=20`),
        isMe ? Promise.resolve([]) : db.get("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${userId}`),
        db.get("rs_alignments", `following_uid=eq.${userId}`),
        db.get("rs_alignments", `follower_uid=eq.${userId}`),
      ]);
      setPosts((ps || []).map(x => ({ ...x, ts: new Date(x.created_at).getTime() })));
      if (!isMe) setAligned((al || []).length > 0);
      setFollowers((flrs || []).length);
      setFollowing((flng || []).length);
      setLoadingP(false);
    })();
  }, [userId, me, isMe]);

  const saveEdit = async () => {
    const updates = { bio: bio.trim(), website: website.trim(), social_links: socialLinks, updated_at: new Date().toISOString() };
    if (avatar) updates.avatar = avatar;
    await db.patch("rs_user_profiles", `id=eq.${userId}`, updates);
    setEditing(false);
  };

  const handleAvatarUpload = async files => {
    if (!files[0]) return;
    try { const b64 = await fileToB64(files[0], 2); setAvatar(b64); } catch {}
  };

  const toggleAlign = async () => {
    const now = !aligned; setAligned(now);
    if (now) { await db.upsert("rs_alignments", { follower_uid: me, following_uid: userId }); setFollowers(f => f + 1); }
    else { await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${userId}`); setFollowers(f => f - 1); }
  };

  const socialIcons = { twitter: <Twitter size={14} />, linkedin: <Linkedin size={14} />, instagram: <Instagram size={14} />, website: <Globe size={14} /> };
  const socialColors = { twitter: "#1da1f2", linkedin: "#0a66c2", instagram: "#e1306c", website: "#6b7280" };

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 12px" }}><ArrowLeft size={15} /> Back</button>
      <div style={{ background: `linear-gradient(135deg,${p.hue || "#3b82f6"}cc,${p.hue || "#3b82f6"}44,transparent)`, borderRadius: 16, height: 110, position: "relative", marginBottom: 44, border: `1px solid ${th.bdr}` }}>
        <div style={{ position: "absolute", bottom: -32, left: 16 }}>
          <div style={{ position: "relative" }}>
            <Av profile={{ ...p, avatar }} size={72} />
            {isMe && editing && (
              <>
                <button onClick={() => avatarRef.current?.click()} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Image size={16} /></button>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleAvatarUpload(e.target.files)} />
              </>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", top: 10, right: 12 }}><SGN n={balance} size="md" pulse={balance > 0} /></div>
        <div style={{ position: "absolute", bottom: 10, right: 12 }}>
          {isMe ? (
            <button onClick={() => setEditing(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Edit3 size={12} />Edit Profile</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={toggleAlign} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${aligned ? "#555" : "#111"}`, background: aligned ? "#fff" : "#111", color: aligned ? "#111" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{aligned ? "Aligned" : "Align"}</button>
              <button onClick={() => onMessage?.(userId)} style={{ padding: "7px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><MessageSquare size={14} /></button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: th.txt }}>{p.name}</span>
              {p.verified && <span style={{ background: "#3b82f618", color: "#3b82f6", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>✓ Verified</span>}
            </div>
            <div style={{ fontSize: 13, color: th.txt3 }}>{p.handle ? `@${p.handle}` : ""}{p.role ? ` · ${p.role}` : ""}</div>
          </div>
          <SGN n={balance} size="lg" />
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: 18, color: th.txt }}>{followers}</div><div style={{ fontSize: 11, color: th.txt3 }}>Followers</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: 18, color: th.txt }}>{following}</div><div style={{ fontSize: 11, color: th.txt3 }}>Aligned</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: 18, color: th.txt }}>{posts.length}</div><div style={{ fontSize: 11, color: th.txt3 }}>Posts</div></div>
        </div>

        {editing && isMe ? (
          <Card dk={dk} anim={false} style={{ marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: th.txt }}>Edit Profile</h4>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: th.txt }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Website</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Social Links</label>
              {["twitter", "linkedin", "instagram"].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: socialColors[s], width: 20 }}>{socialIcons[s]}</span>
                  <input value={socialLinks[s] || ""} onChange={e => setSocialLinks(l => ({ ...l, [s]: e.target.value }))} placeholder={`${s.charAt(0).toUpperCase() + s.slice(1)} URL`} style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none", color: th.txt }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEdit} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", color: th.txt }}>Cancel</button>
            </div>
          </Card>
        ) : (
          <>
            {bio && <p style={{ fontSize: 14, color: th.txt2, margin: "0 0 10px", lineHeight: 1.6 }}>{bio}</p>}
            {(website || Object.values(p.social_links || {}).some(Boolean)) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: th.txt2, fontWeight: 600 }}><Globe size={12} />Website</a>}
                {Object.entries(p.social_links || {}).map(([s, url]) => url ? <a key={s} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: socialColors[s] + "15", border: `1px solid ${socialColors[s]}40`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: socialColors[s], fontWeight: 600 }}>{socialIcons[s]}{s}</a> : null)}
              </div>
            )}
          </>
        )}

        {p.interests?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {p.interests.map(id => { const opt = INT_OPTS.find(x => x.id === id); return opt ? <span key={id} style={{ background: `${opt.c}18`, color: opt.c, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{opt.e} {opt.label}</span> : null; })}
          </div>
        )}

        {/* Referral card - only visible to self */}
        {refCode && isMe && (
          <Card dk={dk} style={{ border: "1px solid #f59e0b30" }} anim={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span>◈</span><span style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>Your Referral (Private)</span></div>
                <div style={{ fontSize: 12, color: th.txt2, marginBottom: 6 }}>Only visible to you — share the link to earn SGN</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ background: "#f59e0b18", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 8, letterSpacing: 1, fontFamily: "monospace" }}>{refCode}</span>
                  <CopyBtn text={refLink} label="Copy Link" />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b", lineHeight: 1 }}>◈ {balance}</div>
                <div style={{ fontSize: 11, color: th.txt3 }}>SGN earned</div>
              </div>
            </div>
          </Card>
        )}

        {/* Posts */}
        <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>Posts & Reposts ({posts.length})</h3>
          {loadingP ? <Spin size={24} dk={dk} /> : posts.length === 0 ? <p style={{ color: th.txt3, fontSize: 14, textAlign: "center", padding: 16 }}>No posts yet.</p> : posts.map(post => (
            <div key={post.id} style={{ background: th.surf2, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${th.bdr}` }}>
              {post.reposted_by && <div style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}><Repeat2 size={10} />Reposted</div>}
              <p style={{ fontSize: 13, color: th.txt, margin: "0 0 8px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.text}</p>
              {post.media?.length > 0 && post.media[0]?.type === "image" && <img src={post.media[0].url} alt="post" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: th.txt3 }}><span>❤ {fmt(post.like_count || 0)}</span><span>🔁 {fmt(post.repost_count || 0)}</span><span>{ago(post.ts)}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADS MANAGER (Growth Catalyst / Admin) ───────────────────────
function AdsManagerView({ me, dk, myProfile }) {
  const th = T(dk);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ headline: "", body: "", cta: "", type: "feed", target_interests: [], gradient: "linear-gradient(135deg,#3b82f6,#8b5cf6)", image_url: "" });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    db.get("rs_sponsored_ads", "order=created_at.desc").then(d => { setAds(d || []); setLoading(false); });
  }, []);

  const save = async () => {
    const data = { ...form, uid: me, status: "active", target_interests: form.target_interests };
    if (editing) { await db.patch("rs_sponsored_ads", `id=eq.${editing}`, data); setAds(as => as.map(a => a.id === editing ? { ...a, ...data } : a)); }
    else { const saved = await db.post("rs_sponsored_ads", data); if (saved) setAds(as => [saved, ...as]); }
    setShowForm(false); setEditing(null); setForm({ headline: "", body: "", cta: "", type: "feed", target_interests: [], gradient: "linear-gradient(135deg,#3b82f6,#8b5cf6)", image_url: "" });
  };

  const del = async id => { await db.del("rs_sponsored_ads", `id=eq.${id}`); setAds(as => as.filter(a => a.id !== id)); };

  const toggleInt = id => setF("target_interests", form.target_interests.includes(id) ? form.target_interests.filter(x => x !== id) : [...form.target_interests, id]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>Ads Manager</h2><p style={{ color: th.txt2, fontSize: 14, margin: 0 }}>Create and manage sponsored content</p></div>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#3b82f6", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={14} />Create Ad</button>
      </div>
      {showForm && (
        <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: th.txt }}>{editing ? "Edit Ad" : "New Sponsored Ad"}</h3>
          {[{ k: "headline", l: "Headline *", p: "Catchy headline" }, { k: "body", l: "Body Text *", p: "Ad description" }, { k: "cta", l: "CTA Button Text *", p: "Learn More" }, { k: "image_url", l: "Image URL (opt)", p: "https://…" }].map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{f.l}</label>
              <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt }} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Placement</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["feed", "sidebar"].map(t => <button key={t} onClick={() => setF("type", t)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${form.type === t ? "#3b82f6" : th.bdr}`, background: form.type === t ? "#3b82f618" : "transparent", color: form.type === t ? "#3b82f6" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Target Interests</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {INT_OPTS.slice(0, 8).map(o => <button key={o.id} onClick={() => toggleInt(o.id)} style={{ background: form.target_interests.includes(o.id) ? `${o.c}18` : "transparent", border: `1px solid ${form.target_interests.includes(o.id) ? o.c : th.bdr}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: form.target_interests.includes(o.id) ? o.c : th.txt2, cursor: "pointer", fontWeight: 600 }}>{o.e} {o.label}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editing ? "Update" : "Publish Ad"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: th.txt }}>Cancel</button>
          </div>
        </Card>
      )}
      {loading ? <Spin dk={dk} /> : ads.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}><BarChart2 size={40} style={{ marginBottom: 12 }} /><p>No ads yet. Create your first sponsored campaign.</p></div>
      ) : ads.map(a => (
        <Card dk={dk} key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>SPONSORED</span>
                <span style={{ background: "#3b82f618", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{a.type?.toUpperCase()}</span>
                <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{a.status?.toUpperCase()}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>{a.headline}</h3>
              <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 8px" }}>{a.body}</p>
              {a.target_interests?.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>Targeting:</span>
                  {a.target_interests.map(id => { const o = INT_OPTS.find(x => x.id === id); return o ? <span key={id} style={{ fontSize: 10, color: o.c, background: `${o.c}15`, padding: "1px 7px", borderRadius: 99 }}>{o.e} {o.label}</span> : null; })}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setEditing(a.id); setForm({ headline: a.headline, body: a.body, cta: a.cta, type: a.type || "feed", target_interests: a.target_interests || [], gradient: a.gradient || "", image_url: a.image_url || "" }); setShowForm(true); }} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center" }}><Edit3 size={13} /></button>
              <button onClick={() => del(a.id)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────
function RightPanel({ dk, myProfile, onProfile, bals, onWallet, profiles, onTag }) {
  const th = T(dk);
  const [adIdx, setAdIdx] = useState(0);
  const [sidebarAds, setSidebarAds] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  useEffect(() => { const t = setInterval(() => setAdIdx(i => (i + 1) % Math.max(1, sidebarAds.length || 3)), 4500); return () => clearInterval(t); }, [sidebarAds]);

  const defaultAds = [
    { headline: "Launch Your Startup Fast", body: "AWS Activate for startups.", cta: "Apply Now", gradient: "linear-gradient(135deg,#f97316,#facc15)" },
    { headline: "Design Without Limits", body: "Figma Pro. Unlimited projects.", cta: "Try Free", gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
    { headline: "Scale Your API", body: "35,000+ APIs on RapidAPI.", cta: "Explore", gradient: "linear-gradient(135deg,#3b82f6,#06b6d4)" },
  ];

  useEffect(() => {
    (async () => {
      const [ads, posts] = await Promise.all([
        db.get("rs_sponsored_ads", "type=eq.sidebar&status=eq.active&order=created_at.desc&limit=3"),
        db.get("rs_posts", "order=created_at.desc&limit=50"),
      ]);
      setSidebarAds(ads || []);
      const tagCount = {};
      (posts || []).forEach(p => (p.hashtags || []).forEach(h => { tagCount[h] = (tagCount[h] || 0) + (p.like_count || 0) + (p.repost_count || 0) + 1; }));
      const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));
      setTrendingTags(sorted.length ? sorted : ["#SignalTokens","#StartupSandbox","#BuildInPublic","#AlignNotFollow","#AIStartups","#RightSignal"].map((tag, i) => ({ tag, count: 900 - i * 143 })));
    })();
  }, []);

  const myBal = bals[myProfile?.id || ""] ?? 0;
  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);
  const others = Object.values(profiles).filter(p => p.id !== myProfile?.id);
  const suggestions = others.filter(u => u.interests?.some(i => myProfile?.interests?.includes(i))).slice(0, 4);
  const displaySuggestions = suggestions.length ? suggestions : others.slice(0, 4);

  const displayAds = sidebarAds.length ? sidebarAds : defaultAds;
  const ad = displayAds[adIdx % displayAds.length];

  return (
    <div style={{ width: 230, flexShrink: 0 }}>
      <div onClick={onWallet} style={{ background: "linear-gradient(135deg,#78350f,#d97706)", borderRadius: 14, padding: 12, marginBottom: 12, cursor: "pointer", boxShadow: "0 4px 20px rgba(245,158,11,.25)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1, marginBottom: 4 }}>YOUR SIGNAL TOKENS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 26 }}>◈</span>
          <div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{myBal} SGN</div><div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>Tap to open wallet ↗</div></div>
        </div>
      </div>

      {whoOpt && (
        <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 7 }}>YOUR SIGNAL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 20 }}>{whoOpt.e}</span><div><div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{whoOpt.label}</div><div style={{ fontSize: 10, color: th.txt3 }}>Role</div></div></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {myProfile?.interests?.slice(0, 6).map(id => { const opt = INT_OPTS.find(x => x.id === id); return opt ? <span key={id} style={{ background: `${opt.c}18`, color: opt.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99 }}>{opt.e}</span> : null; })}
          </div>
        </div>
      )}

      {/* Sponsored ad */}
      <div style={{ background: ad.gradient || ad.gradient, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1, marginBottom: 4 }}>SPONSORED</div>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: "#fff" }}>{ad.headline}</div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.8)", margin: "0 0 10px", lineHeight: 1.5 }}>{ad.body}</p>
        <button style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 8, padding: "4px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{ad.cta}</button>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>{displayAds.map((_, i) => <div key={i} style={{ width: i === adIdx % displayAds.length ? 14 : 5, height: 4, borderRadius: 99, background: i === adIdx % displayAds.length ? "#fff" : "rgba(255,255,255,.35)", transition: "all .3s" }} />)}</div>
      </div>

      {/* Trending - dynamic */}
      <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: th.txt, display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} color="#f97316" />🔥 Trending (24h)</div>
        {trendingTags.map(({ tag, count }, i) => (
          <div key={i} onClick={() => onTag?.(tag)} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < trendingTags.length - 1 ? `1px solid ${th.bdr}` : "none", cursor: "pointer" }}>
            <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>{tag}</span>
            <span style={{ fontSize: 10, color: th.txt3 }}>{fmt(count)}</span>
          </div>
        ))}
      </div>

      {/* Who to Align With */}
      <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: th.txt }}>Who to Align with</div>
        {displaySuggestions.length === 0 ? <p style={{ fontSize: 12, color: th.txt3, textAlign: "center", padding: "8px 0" }}>Invite friends!</p> : displaySuggestions.map(u => {
          const bal = bals[u.id] ?? 0;
          const sharedInts = u.interests?.filter(i => myProfile?.interests?.includes(i)) || [];
          return (
            <div key={u.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div onClick={() => onProfile(u.id)} style={{ cursor: "pointer" }}><Av profile={u} size={30} bal={bal} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => onProfile(u.id)} style={{ fontSize: 12, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{u.name}</div>
                <div style={{ fontSize: 10, color: th.txt3 }}>{sharedInts.length ? <span style={{ color: "#10b981" }}>✓ {sharedInts.length} shared</span> : bal > 0 ? <span style={{ color: "#f59e0b" }}>◈ {bal} SGN</span> : u.role}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NOTIF PANEL ─────────────────────────────────────────────────
function NotifPanel({ notifs, setNotifs, onClose, dk }) {
  const th = T(dk);
  const icons = { like: "❤", follow: "👤", comment: "💬", sandbox: "🌱", mention: "@", token: "◈" };
  return (
    <div style={{ position: "absolute", top: 52, right: 0, width: 300, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, boxShadow: `0 20px 60px rgba(0,0,0,${dk ? .5 : .12})`, zIndex: 100, backdropFilter: "blur(12px)", maxHeight: 400, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${th.bdr}`, position: "sticky", top: 0, background: th.surf }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Notifications</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setNotifs(ns => ns.map(n => ({ ...n, read: true })))} style={{ fontSize: 12, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Mark all read</button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}><X size={14} /></button>
        </div>
      </div>
      {notifs.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 20, fontSize: 13 }}>No notifications yet.</p>}
      {notifs.map(n => (
        <div key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${th.bdr}`, background: n.read ? "transparent" : dk ? "rgba(59,130,246,.07)" : "#eff6ff", cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: n.type === "token" ? "#f59e0b18" : th.surf2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{icons[n.type] || "🔔"}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: th.txt }}>{n.msg}</div><div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{ago(n.ts)}</div></div>
          {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", marginTop: 5, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────
function Sidebar({ view, setView, me, dk, bals, myProfile }) {
  const th = T(dk);
  const bal = bals[me] ?? 0;
  const links = [
    { id: "feed", e: "🏠", l: "Feed" },
    { id: "network", e: "👥", l: "Network" },
    { id: "messages", e: "💬", l: "Messages" },
    { id: "colab", e: "🚀", l: "Colab" },
    { id: "events", e: "📅", l: "Events" },
    { id: "sandbox", e: "💡", l: "Sandbox" },
    { id: "contribute", e: "📝", l: "Contribute" },
    { id: "wallet", e: "◈", l: "Wallet", badge: bal },
    ...(canManageAds(myProfile) ? [{ id: "ads", e: "📢", l: "Ads Manager" }] : []),
  ];
  return (
    <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${th.bdr}`, height: "100vh", position: "sticky", top: 0, background: th.side }}>
      <div style={{ padding: "14px 12px", borderBottom: `1px solid ${th.bdr}` }}>
        <RightSignalLogo size={32} dk={dk} />
      </div>
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setView(l.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: view === l.id ? dk ? "rgba(59,130,246,.15)" : "#eff6ff" : "transparent", color: view === l.id ? l.id === "wallet" ? "#f59e0b" : "#3b82f6" : th.txt2, fontSize: 13, fontWeight: view === l.id ? 700 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: view === l.id ? `2px solid ${l.id === "wallet" ? "#f59e0b" : "#3b82f6"}` : "2px solid transparent", transition: "all .15s" }}>
            <span style={{ fontSize: 15 }}>{l.e}</span>
            <span style={{ flex: 1 }}>{l.l}</span>
            {l.badge !== undefined && <span style={{ background: "#f59e0b20", color: "#f59e0b", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99, border: "1px solid #f59e0b44" }}>{l.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: "10px 8px", borderTop: `1px solid ${th.bdr}` }}>
        <button onClick={() => setView("profile")} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer" }}>
          <Av profile={myProfile || {}} size={28} bal={bal} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile?.name || "User"}</div>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>◈ {bal} SGN</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [showPass, setShowPass] = useState(false);

  const iS = { width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "10px 12px 10px 36px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#fff" };
  const ic = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.35)", pointerEvents: "none" };

  const submit = async () => {
    setErr(""); setInfo(""); setBusy(true);
    if (tab === "signup") {
      if (!name.trim()) { setErr("Name is required"); setBusy(false); return; }
      const res = await sbAuth.signUp(email.trim(), pass, name.trim());
      if (res.user) { setInfo("Account created! You can now sign in."); setTab("login"); }
      else setErr(res.error_description || res.msg || "Signup failed");
    } else {
      const res = await sbAuth.signIn(email.trim(), pass);
      if (res.access_token) { const u = await sbAuth.getUser(res.access_token); if (u) onAuth(res, u, false, ""); else setErr("Could not load user."); }
      else setErr(res.error_description || res.msg || "Invalid email or password");
    }
    setBusy(false);
  };

  const orb = (t, l, s, c, d) => <div key={l} style={{ position: "fixed", top: t, left: l, width: s, height: s, borderRadius: "50%", background: c, filter: "blur(60px)", animation: `floatUp ${d}s ease-in-out infinite`, pointerEvents: "none" }} />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#040a14,#0c1929,#080d18)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <GlobalCSS dk={true} />
      {[["10%","5%","420px","rgba(59,130,246,.15)","7"],["60%","75%","380px","rgba(139,92,246,.12)","9"],["35%","45%","300px","rgba(16,185,129,.1)","11"]].map(a => orb(...a))}
      <div style={{ width: "100%", maxWidth: 420, zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(59,130,246,.5)" }}><span style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>R</span></div>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>RightSignal</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", letterSpacing: 1 }}>SIGNAL OVER NOISE</div></div>
          </div>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: 0 }}>Where founders & investors meet</p>
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 28 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 4 }}>
            {["login", "signup"].map(t => <button key={t} onClick={() => { setTab(t); setErr(""); setInfo(""); }} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", background: tab === t ? "rgba(59,130,246,.8)" : "transparent", color: "#fff", fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: "pointer", transition: "all .2s", textTransform: "capitalize" }}>{t === "login" ? "Sign In" : "Sign Up"}</button>)}
          </div>

          {/* Google OAuth button */}
          <button onClick={sbAuth.googleOAuth} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "signup" && (
              <div style={{ position: "relative" }}>
                <User size={15} style={ic} />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={iS} />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <Mail size={15} style={ic} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Email address" style={iS} />
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={ic} />
              <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Password" style={{ ...iS, paddingRight: 36 }} />
              <button onClick={() => setShowPass(x => !x)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", display: "flex" }}>{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>

          {err && <div style={{ marginTop: 12, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#fca5a5", display: "flex", gap: 7, alignItems: "center" }}><AlertCircle size={14} />{err}</div>}
          {info && <div style={{ marginTop: 12, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#6ee7b7", display: "flex", gap: 7, alignItems: "center" }}><Check size={14} />{info}</div>}

          <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 18, padding: "12px", background: busy ? "rgba(59,130,246,.4)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", boxShadow: busy ? "none" : "0 0 20px rgba(59,130,246,.4)", transition: "all .2s" }}>
            {busy ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState(null);
  const [ints, setInts] = useState([]);
  const [code, setCode] = useState("");
  const [codeOk, setCodeOk] = useState(null);
  const [refMap, setRefMap] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.get("rs_user_profiles", "select=id,ref_code&ref_code=not.is.null").then(rows => {
      const m = {};
      (rows || []).forEach(r => { if (r.ref_code) m[r.ref_code] = r.id; });
      setRefMap(m);
    });
  }, []);

  const validRef = codeOk === true;
  const checkCode = v => setCodeOk(v ? (!!refMap[v.toUpperCase()] && refMap[v.toUpperCase()] !== user?.id) : null);
  const toggleInt = id => setInts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const finish = async () => { setBusy(true); await onComplete({ who, ints, refCode: validRef ? code.toUpperCase() : null, refUid: validRef ? refMap[code.toUpperCase()] : null }); };

  const cardSt = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 22, backdropFilter: "blur(16px)" };
  const nextBtn = (label, action, disabled) => (
    <button onClick={action} disabled={disabled} style={{ width: "100%", padding: "12px", marginTop: 16, background: disabled ? "rgba(59,130,246,.3)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", boxShadow: disabled ? "none" : "0 0 20px rgba(59,130,246,.3)" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#040a14,#0c1929,#080d18)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalCSS dk={true} />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <RightSignalLogo size={36} showText dk />
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 99, background: i === step ? "#3b82f6" : "rgba(255,255,255,.2)", transition: "all .3s" }} />)}
          </div>
        </div>
        {step === 0 && (
          <div style={cardSt}>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Who are you, {user.name?.split(" ")[0]}?</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: "0 0 20px" }}>This helps us personalize your experience</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {WHO_OPTS.map(o => {
                const sel = who === o.id;
                return <button key={o.id} onClick={() => setWho(o.id)} style={{ background: sel ? `${o.c}20` : "rgba(255,255,255,.04)", border: `1.5px solid ${sel ? o.c : "rgba(255,255,255,.1)"}`, borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{o.e}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sel ? o.c : "#fff" }}>{o.label}</div>
                </button>;
              })}
            </div>
            {nextBtn("Next →", () => setStep(1), !who)}
          </div>
        )}
        {step === 1 && (
          <div style={cardSt}>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Your interests</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: "0 0 20px" }}>Select at least 3 topics ({ints.length} selected)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {INT_OPTS.map(o => { const sel = ints.includes(o.id); return <button key={o.id} onClick={() => toggleInt(o.id)} style={{ background: sel ? `${o.c}20` : "rgba(255,255,255,.04)", border: `1.5px solid ${sel ? o.c : "rgba(255,255,255,.1)"}`, borderRadius: 12, padding: "10px", cursor: "pointer", textAlign: "left" }}><div style={{ fontSize: 18, marginBottom: 2 }}>{o.e}</div><div style={{ fontSize: 12, fontWeight: 600, color: sel ? o.c : "rgba(255,255,255,.7)" }}>{o.label}</div></button>; })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: "11px", marginTop: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              {nextBtn("Next →", () => setStep(2), ints.length < 3)}
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={cardSt}>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Referral Code (Optional)</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: "0 0 20px" }}>Enter a referral code to earn bonus SGN tokens</p>
            <div style={{ position: "relative" }}>
              <input value={code} onChange={e => { const v = e.target.value; setCode(v); checkCode(v); }} placeholder="Enter code e.g. ALICE-3FA2" style={{ width: "100%", background: "rgba(255,255,255,.06)", border: `1px solid ${codeOk === true ? "#10b981" : codeOk === false ? "#ef4444" : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "10px 36px 10px 12px", fontSize: 14, outline: "none", color: "#fff", boxSizing: "border-box", fontFamily: "monospace" }} />
              {codeOk === true && <Check size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981" }} />}
              {codeOk === false && <X size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444" }} />}
            </div>
            {codeOk === true && <p style={{ color: "#6ee7b7", fontSize: 13, margin: "8px 0 0" }}>✓ Valid! You'll both earn ◈ 1 SGN</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "11px", marginTop: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              <button onClick={finish} disabled={busy} style={{ flex: 2, padding: "11px", marginTop: 16, background: busy ? "rgba(59,130,246,.4)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>{busy ? "Setting up…" : "Enter RightSignal 🚀"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// COLAB v3 — STARTUP OPERATING SYSTEM (Production Ready)
// ═══════════════════════════════════════════════════════════════

const genStartupCode = name =>
  name.toUpperCase().replace(/\s+/g,"").replace(/[^A-Z0-9]/g,"").slice(0,5).padEnd(3,"X") +
  "-" + Math.random().toString(36).slice(2,6).toUpperCase();

// ─── PAGE TYPES ───────────────────────────────────────────────────
const CPAGE_TYPES = [
  { id:"investor",    label:"Investor",    e:"💰", c:"#10b981", desc:"Investors & advisors — pitch decks, funding updates, traction" },
  { id:"tech",        label:"Tech",        e:"👾", c:"#3b82f6", desc:"Engineers — dev logs, architecture, code discussions" },
  { id:"marketing",   label:"Marketing",   e:"📣", c:"#f97316", desc:"Growth team — campaigns, content strategy, analytics" },
  { id:"community",   label:"Community",   e:"🌐", c:"#8b5cf6", desc:"Public audience — announcements, community engagement" },
  { id:"operations",  label:"Operations",  e:"⚙️", c:"#06b6d4", desc:"Ops & bizdev — processes, partnerships, logistics" },
  { id:"design",      label:"Design",      e:"🎨", c:"#ec4899", desc:"Designers — UI/UX, brand, creatives" },
];

const DEFAULT_CPAGE_TYPES = ["investor","tech","marketing","community"];

const JOIN_ROLES = [
  { id:"investor",  label:"Investor",        e:"💰", desc:"Looking to invest or advise", maps:["investor"] },
  { id:"tech",      label:"Tech / Developer", e:"👾", desc:"Engineering, product, design", maps:["tech"] },
  { id:"marketing", label:"Marketing",        e:"📣", desc:"Growth, content, community",  maps:["marketing","community"] },
  { id:"design",    label:"Designer",         e:"🎨", desc:"UI/UX, brand, visual",        maps:["design"] },
  { id:"intern",    label:"Student / Intern", e:"🎓", desc:"Learning and contributing",   maps:["community"] },
  { id:"general",   label:"General Audience", e:"🌐", desc:"Following the journey",       maps:["community"] },
];

const CTASK_STATUS = [
  { id:"pending",    label:"Pending",     c:"#f59e0b" },
  { id:"inprogress", label:"In Progress", c:"#3b82f6" },
  { id:"completed",  label:"Completed",   c:"#10b981" },
];

// ─── UTILITY: page type lookup ────────────────────────────────────
const cpt = pg => CPAGE_TYPES.find(x =>
  pg?.type_id === x.id ||
  pg?.name?.toLowerCase().includes(x.id)
) || CPAGE_TYPES[3];

// ─── STACKED AVATARS ─────────────────────────────────────────────
function StackedAvatars({ userIds = [], profiles = {}, onProfile, max = 5, size = 26 }) {
  const shown = userIds.slice(0, max);
  const extra = userIds.length - max;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ display:"flex" }}>
        {shown.map((id, i) => (
          <div key={id} onClick={e => { e.stopPropagation(); onProfile?.(id); }}
            title={(profiles[id]||{}).name}
            style={{ marginLeft:i>0?-8:0, zIndex:shown.length-i, border:"2px solid transparent", borderRadius:"50%", cursor:"pointer" }}>
            <Av profile={profiles[id]||{name:"?"}} size={size} />
          </div>
        ))}
        {extra > 0 && (
          <div style={{ marginLeft:-8, width:size, height:size, borderRadius:"50%", background:"#3b82f6", border:"2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:700, color:"#fff" }}>
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE HOVER CARD ──────────────────────────────────────────
function ProfileHoverCard({ uid, profiles, bals, dk, onProfile, children }) {
  const th = T(dk);
  const [show, setShow] = useState(false);
  const p = profiles[uid] || { name:"User" };
  const bal = bals?.[uid] ?? 0;
  return (
    <div style={{ position:"relative", display:"inline-block" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position:"absolute", top:"100%", left:0, zIndex:600, background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, padding:14, width:220, boxShadow:`0 12px 40px rgba(0,0,0,${dk?.5:.15})`, animation:"fadeUp .15s ease", marginTop:4 }}>
          <div style={{ display:"flex", gap:10, marginBottom:8 }}>
            <Av profile={p} size={38} bal={bal} />
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:th.txt }}>{p.name}</div>
              <div style={{ fontSize:11, color:th.txt3 }}>{p.handle?`@${p.handle}`:""}</div>
              {p.role && <div style={{ fontSize:11, color:th.txt2 }}>{p.role}</div>}
            </div>
          </div>
          {p.bio && <div style={{ fontSize:12, color:th.txt2, lineHeight:1.5, marginBottom:8 }}>{p.bio.slice(0,80)}{p.bio.length>80?"…":""}</div>}
          {bal > 0 && <div style={{ marginBottom:8 }}><SGN n={bal} size="sm" /></div>}
          <button onClick={() => onProfile?.(uid)} style={{ width:"100%", background:"#3b82f6", border:"none", borderRadius:8, padding:"6px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>View Profile</button>
        </div>
      )}
    </div>
  );
}

// ─── PAGE CHAT ───────────────────────────────────────────────────
function CPageChat({ pageId, me, profiles, bals, dk, onProfile }) {
  const th = T(dk);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [attach, setAttach] = useState(null);
  const bottomRef = useRef();
  const fileRef = useRef();
  const pollRef = useRef();

  const load = useCallback(async () => {
    const d = await db.get("rs_page_chat", `page_id=eq.${pageId}&order=created_at.asc&limit=100`);
    setMsgs(d || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 60);
  }, [pageId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const attachFile = async files => {
    if (!files[0]) return;
    try { const b64 = await fileToB64(files[0], 3); setAttach({ url:b64, type:files[0].type, name:files[0].name }); }
    catch(e) { alert(e.message); }
  };

  const send = async () => {
    if (!text.trim() && !attach) return;
    setSending(true);
    const saved = await db.post("rs_page_chat", {
      page_id:pageId, sender_uid:me,
      text: text.trim() || null,
      media: attach || null,
      reply_to: replyTo?.id || null,
      reply_preview: replyTo?.text?.slice(0,60) || null,
    });
    if (saved) { setMsgs(m => [...m, saved]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 50); }
    setText(""); setAttach(null); setReplyTo(null); setSending(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:460, background:th.surf2, borderRadius:14, border:`1px solid ${th.bdr}`, overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        {msgs.length === 0 && <p style={{ color:th.txt3, fontSize:13, textAlign:"center", margin:"auto" }}>No messages yet. Start the conversation!</p>}
        {msgs.map(m => {
          const isMe = m.sender_uid === me;
          const author = profiles[m.sender_uid] || { name:"Member" };
          return (
            <div key={m.id} style={{ display:"flex", gap:8, flexDirection:isMe?"row-reverse":"row", alignItems:"flex-end" }}>
              {!isMe && (
                <ProfileHoverCard uid={m.sender_uid} profiles={profiles} bals={bals} dk={dk} onProfile={onProfile}>
                  <div style={{ cursor:"pointer", flexShrink:0 }}><Av profile={author} size={28} /></div>
                </ProfileHoverCard>
              )}
              <div style={{ maxWidth:"72%" }}>
                {!isMe && <div style={{ fontSize:11, color:th.txt3, marginBottom:3, marginLeft:2 }}>{author.name}</div>}
                {m.reply_preview && (
                  <div style={{ background:isMe?"rgba(255,255,255,.15)":th.surf, borderLeft:`3px solid ${isMe?"rgba(255,255,255,.5)":"#3b82f6"}`, borderRadius:6, padding:"4px 8px", fontSize:11, color:isMe?"rgba(255,255,255,.8)":th.txt3, marginBottom:4 }}>
                    ↩ {m.reply_preview}
                  </div>
                )}
                <div style={{ background:isMe?"#3b82f6":th.surf, borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"9px 13px" }}>
                  {m.text && <div style={{ fontSize:13, color:isMe?"#fff":th.txt, lineHeight:1.55, wordBreak:"break-word" }}>{m.text}</div>}
                  {m.media?.url && (
                    m.media.type?.startsWith("image") ? <img src={m.media.url} alt="media" style={{ maxWidth:200, maxHeight:200, borderRadius:8, marginTop:m.text?6:0, display:"block" }} /> :
                    m.media.type?.startsWith("audio") ? <audio src={m.media.url} controls style={{ marginTop:m.text?6:0, width:160, height:32 }} /> :
                    <video src={m.media.url} controls style={{ maxWidth:200, borderRadius:8, marginTop:m.text?6:0 }} />
                  )}
                  <div style={{ fontSize:10, color:isMe?"rgba(255,255,255,.55)":th.txt3, marginTop:4, textAlign:"right" }}>{m.created_at ? ago(new Date(m.created_at).getTime()) : ""}</div>
                </div>
                <button onClick={() => setReplyTo(m)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:th.txt3, padding:"2px 0", marginTop:1 }}>↩ Reply</button>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {replyTo && (
        <div style={{ padding:"6px 14px", background:dk?"rgba(59,130,246,.1)":"#eff6ff", borderTop:`1px solid ${th.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#3b82f6" }}>↩ Replying: "{replyTo.text?.slice(0,50)}"</span>
          <button onClick={() => setReplyTo(null)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={12} /></button>
        </div>
      )}
      {attach && (
        <div style={{ padding:"6px 14px", background:th.surf, borderTop:`1px solid ${th.bdr}`, display:"flex", alignItems:"center", gap:8 }}>
          {attach.type?.startsWith("image") ? <img src={attach.url} style={{ height:36, borderRadius:6, objectFit:"cover" }} alt="preview" /> : <div style={{ fontSize:12, color:th.txt2 }}>📎 {attach.name}</div>}
          <button onClick={() => setAttach(null)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={12} /></button>
        </div>
      )}
      <div style={{ padding:"10px 14px", borderTop:`1px solid ${th.bdr}`, background:th.surf, display:"flex", gap:8, alignItems:"flex-end" }}>
        <div style={{ display:"flex", gap:4, flexShrink:0 }}>
          <button onClick={() => fileRef.current?.click()} title="Attach image/audio/video" style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, display:"flex", padding:4 }}><Image size={15} /></button>
          <button onClick={() => fileRef.current?.click()} title="Voice note" style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, display:"flex", padding:4 }}><Mic size={15} /></button>
          <input ref={fileRef} type="file" accept="image/*,audio/*,video/*" style={{ display:"none" }} onChange={e => attachFile(e.target.files)} />
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          rows={1} style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", color:th.txt, maxHeight:80 }} />
        <button onClick={send} disabled={(!text.trim() && !attach) || sending}
          style={{ background:(text.trim()||attach)&&!sending?"#3b82f6":th.surf2, border:"none", borderRadius:10, padding:"8px 14px", cursor:(text.trim()||attach)&&!sending?"pointer":"default", color:(text.trim()||attach)&&!sending?"#fff":th.txt3, display:"flex", alignItems:"center", flexShrink:0 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── TASK PANEL ───────────────────────────────────────────────────
function CTaskPanel({ pageId, me, profiles, members, dk }) {
  const th = T(dk);
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:"", assignee:"", status:"pending", priority:"medium" });
  const [saving, setSaving] = useState(false);
  const setF = (k,v) => setForm(p => ({...p,[k]:v}));

  useEffect(() => {
    db.get("rs_page_tasks", `page_id=eq.${pageId}&order=created_at.desc`)
      .then(d => setTasks(d||[]));
  }, [pageId]);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const saved = await db.post("rs_page_tasks", {
      page_id:pageId, title:form.title.trim(),
      assignee_id:form.assignee||null, status:form.status,
      priority:form.priority, created_by:me,
    });
    if (saved) setTasks(t => [saved,...t]);
    setForm({ title:"", assignee:"", status:"pending", priority:"medium" });
    setShowForm(false); setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await db.patch("rs_page_tasks", `id=eq.${id}`, { status });
    setTasks(ts => ts.map(t => t.id===id ? {...t,status} : t));
  };

  const del = async id => {
    await db.del("rs_page_tasks", `id=eq.${id}`);
    setTasks(ts => ts.filter(t => t.id!==id));
  };

  const priorities = { high:"🔴", medium:"🟡", low:"🟢" };
  const grouped = { pending:[], inprogress:[], completed:[] };
  tasks.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); else grouped.pending.push(t); });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontWeight:700, fontSize:14, color:th.txt }}>📋 Tasks ({tasks.length})</span>
        <button onClick={() => setShowForm(x=>!x)} style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          <Plus size={12} />New Task
        </button>
      </div>
      {showForm && (
        <div style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:14, marginBottom:14 }}>
          <input value={form.title} onChange={e => setF("title",e.target.value)} placeholder="Task title *"
            style={{ width:"100%", background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"8px 10px", fontSize:13, outline:"none", color:th.txt, boxSizing:"border-box", marginBottom:8 }} />
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <select value={form.assignee} onChange={e => setF("assignee",e.target.value)}
              style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"7px 10px", fontSize:12, color:th.txt, outline:"none" }}>
              <option value="">Assign to…</option>
              {members.map(m => { const p=profiles[m.user_id]||{name:"Member"}; return <option key={m.user_id} value={m.user_id}>{p.name}</option>; })}
            </select>
            <select value={form.priority} onChange={e => setF("priority",e.target.value)}
              style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"7px 10px", fontSize:12, color:th.txt, outline:"none" }}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"7px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:8, cursor:"pointer", color:th.txt2, fontSize:12 }}>Cancel</button>
            <button onClick={save} disabled={saving||!form.title.trim()} style={{ flex:2, padding:"7px", background:form.title.trim()?"#3b82f6":th.surf2, border:"none", borderRadius:8, cursor:form.title.trim()?"pointer":"default", color:form.title.trim()?"#fff":th.txt3, fontWeight:700, fontSize:12 }}>
              {saving?"Creating…":"Create Task"}
            </button>
          </div>
        </div>
      )}
      {CTASK_STATUS.map(s => {
        const group = grouped[s.id] || [];
        if (group.length === 0) return null;
        return (
          <div key={s.id} style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:s.c, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:s.c }} />
              {s.label} ({group.length})
            </div>
            {group.map(task => {
              const assignee = profiles[task.assignee_id] || null;
              return (
                <div key={task.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:10, marginBottom:6 }}>
                  <span style={{ fontSize:12 }}>{priorities[task.priority]||"🟡"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:task.status==="completed"?th.txt3:th.txt, fontWeight:600, textDecoration:task.status==="completed"?"line-through":"none" }}>{task.title}</div>
                    {assignee && <div style={{ fontSize:11, color:th.txt3, marginTop:1 }}>→ {assignee.name}</div>}
                  </div>
                  <select value={task.status} onChange={e => updateStatus(task.id,e.target.value)}
                    style={{ background:`${s.c}18`, border:`1px solid ${s.c}40`, borderRadius:6, padding:"3px 7px", fontSize:11, color:s.c, fontWeight:700, cursor:"pointer", outline:"none" }}>
                    {CTASK_STATUS.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                  </select>
                  <button onClick={() => del(task.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, display:"flex", padding:2 }}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        );
      })}
      {tasks.length === 0 && <p style={{ fontSize:13, color:th.txt3, textAlign:"center", padding:"20px 0" }}>No tasks yet. Create the first one!</p>}
    </div>
  );
}

// ─── FILE MANAGER ────────────────────────────────────────────────
function CFileManager({ pageId, me, profiles, dk }) {
  const th = T(dk);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    db.get("rs_page_files", `page_id=eq.${pageId}&order=created_at.desc`).then(d => setFiles(d||[]));
  }, [pageId]);

  const upload = async fileList => {
    setUploading(true);
    for (const f of fileList) {
      try {
        const b64 = await fileToB64(f, 5);
        const saved = await db.post("rs_page_files", { page_id:pageId, uploaded_by:me, name:f.name, type:f.type, size:f.size, data_url:b64 });
        if (saved) setFiles(fs => [saved,...fs]);
      } catch(e) { alert(e.message); }
    }
    setUploading(false);
  };

  const del = async id => {
    await db.del("rs_page_files", `id=eq.${id}`);
    setFiles(fs => fs.filter(f => f.id!==id));
  };

  const fmt = b => b>1048576?`${(b/1048576).toFixed(1)}MB`:b>1024?`${(b/1024).toFixed(0)}KB`:`${b}B`;
  const icon = t => t?.startsWith("image")?"🖼️":t?.startsWith("video")?"🎥":t?.startsWith("audio")?"🎵":t?.includes("pdf")?"📄":"📁";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontWeight:700, fontSize:14, color:th.txt }}>📁 Files ({files.length})</span>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:700, cursor:uploading?"default":"pointer" }}>
          <Plus size={12} />{uploading?"Uploading…":"Upload File"}
        </button>
        <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e => upload([...e.target.files])} />
      </div>
      {files.length === 0
        ? <p style={{ fontSize:13, color:th.txt3, textAlign:"center", padding:"20px 0" }}>No files yet.</p>
        : files.map(f => {
          const uploader = profiles[f.uploaded_by] || { name:"Member" };
          const isImg = f.type?.startsWith("image");
          return (
            <div key={f.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 12px", background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:10, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:8, background:th.surf2, border:`1px solid ${th.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, overflow:"hidden" }}>
                {isImg ? <img src={f.data_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="thumb" /> : icon(f.type)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:th.txt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                <div style={{ fontSize:11, color:th.txt3 }}>{fmt(f.size||0)} · {uploader.name} · {ago(new Date(f.created_at).getTime())}</div>
              </div>
              {f.data_url && <a href={f.data_url} download={f.name} style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:7, padding:"5px 10px", fontSize:11, color:th.txt2, fontWeight:600, textDecoration:"none", flexShrink:0 }}>↓ Download</a>}
              <button onClick={() => del(f.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, display:"flex", padding:2, flexShrink:0 }}><Trash2 size={13} /></button>
            </div>
          );
        })
      }
    </div>
  );
}

// ─── MEETING PANEL ────────────────────────────────────────────────
function CMeetingPanel({ pageId, startupId, me, profiles, members, dk, compact=false }) {
  const th = T(dk);
  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:"", date:"", time:"", platform:"google_meet", link:"", note:"" });
  const [saving, setSaving] = useState(false);
  const setF = (k,v) => setForm(p => ({...p,[k]:v}));

  useEffect(() => {
    const q = pageId
      ? `page_id=eq.${pageId}&order=scheduled_at.asc`
      : `startup_id=eq.${startupId}&room_id=is.null&order=scheduled_at.asc`;
    db.get("rs_page_meetings", q).then(d => setMeetings(d||[]));
  }, [pageId, startupId]);

  const save = async () => {
    if (!form.title || !form.date || !form.time) return;
    setSaving(true);
    const saved = await db.post("rs_page_meetings", {
      page_id:pageId||null, startup_id:startupId, created_by:me,
      title:form.title, scheduled_at:`${form.date}T${form.time}:00`,
      platform:form.platform, link:form.link, note:form.note,
    });
    if (saved) setMeetings(m => [...m, saved]);
    setForm({ title:"", date:"", time:"", platform:"google_meet", link:"", note:"" });
    setShowForm(false); setSaving(false);
  };

  const del = async id => {
    await db.del("rs_page_meetings", `id=eq.${id}`);
    setMeetings(ms => ms.filter(m => m.id!==id));
  };

  const inp = { width:"100%", background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"7px 10px", fontSize:compact?11:12, outline:"none", color:th.txt, boxSizing:"border-box" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:compact?8:12 }}>
        <span style={{ fontWeight:700, fontSize:compact?12:14, color:th.txt }}>📅 Meetings ({meetings.length})</span>
        <button onClick={() => setShowForm(x=>!x)}
          style={{ display:"flex", alignItems:"center", gap:4, background:"#3b82f6", border:"none", borderRadius:8, padding:compact?"4px 8px":"6px 12px", color:"#fff", fontSize:compact?11:12, fontWeight:700, cursor:"pointer" }}>
          <Plus size={compact?10:12} />Book
        </button>
      </div>
      {showForm && (
        <div style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:14, marginBottom:12 }}>
          <input value={form.title} onChange={e => setF("title",e.target.value)} placeholder="Meeting title *" style={{...inp,marginBottom:8}} />
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input type="date" value={form.date} onChange={e => setF("date",e.target.value)} style={{...inp,flex:1}} />
            <input type="time" value={form.time} onChange={e => setF("time",e.target.value)} style={{...inp,flex:1}} />
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            {[{id:"google_meet",e:"🎥",l:"Google Meet"},{id:"zoom",e:"💻",l:"Zoom"}].map(p => (
              <button key={p.id} onClick={() => setF("platform",p.id)}
                style={{ flex:1, padding:"6px", borderRadius:8, border:`1.5px solid ${form.platform===p.id?"#3b82f6":th.bdr}`, background:form.platform===p.id?"#3b82f615":"transparent", cursor:"pointer", fontSize:12, color:form.platform===p.id?"#3b82f6":th.txt2, fontWeight:600 }}>
                {p.e} {p.l}
              </button>
            ))}
          </div>
          <input value={form.link} onChange={e => setF("link",e.target.value)} placeholder="Meeting link (optional)" style={{...inp,marginBottom:8}} />
          <textarea value={form.note} onChange={e => setF("note",e.target.value)} placeholder="Agenda (optional)" rows={2}
            style={{...inp,resize:"none",fontFamily:"inherit",marginBottom:8}} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"7px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:8, cursor:"pointer", color:th.txt2, fontSize:12 }}>Cancel</button>
            <button onClick={save} disabled={saving||!form.title||!form.date||!form.time}
              style={{ flex:2, padding:"7px", background:form.title&&form.date&&form.time?"#3b82f6":th.surf2, border:"none", borderRadius:8, cursor:"pointer", color:form.title&&form.date&&form.time?"#fff":th.txt3, fontWeight:700, fontSize:12 }}>
              {saving?"Scheduling…":"Schedule"}
            </button>
          </div>
        </div>
      )}
      {meetings.length === 0
        ? <p style={{ fontSize:12, color:th.txt3, textAlign:"center", padding:"10px 0" }}>No meetings scheduled.</p>
        : meetings.map(m => (
          <div key={m.id} style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:10, padding:compact?"8px 10px":"10px 14px", marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:compact?11:13, fontWeight:700, color:th.txt }}>{m.title}</div>
                <div style={{ fontSize:11, color:th.txt3, marginTop:2 }}>
                  {m.platform==="zoom"?"💻 Zoom":"🎥 Google Meet"} · {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                </div>
                {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#3b82f6", fontWeight:600, marginTop:2, display:"block" }}>Join Meeting →</a>}
                {m.note && <div style={{ fontSize:11, color:th.txt3, marginTop:2, fontStyle:"italic" }}>{m.note}</div>}
              </div>
              <button onClick={() => del(m.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, padding:2 }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── ACTIVITY FEED ────────────────────────────────────────────────
function CActivityFeed({ pageId, startupId, me, profiles, dk }) {
  const th = T(dk);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const [updates, tasks, files, meetings] = await Promise.all([
        db.get("rs_startup_updates", `${pageId?`room_id=eq.${pageId}`:`startup_id=eq.${startupId}&room_id=is.null`}&order=created_at.desc&limit=10`),
        db.get("rs_page_tasks", pageId?`page_id=eq.${pageId}&order=created_at.desc&limit=5`:`startup_id=eq.${startupId}&order=created_at.desc&limit=5`),
        db.get("rs_page_files", pageId?`page_id=eq.${pageId}&order=created_at.desc&limit=5`:"rs_page_files?startup_id=eq."+startupId+"&limit=5"),
        db.get("rs_page_meetings", pageId?`page_id=eq.${pageId}&order=created_at.desc&limit=5`:`startup_id=eq.${startupId}&order=created_at.desc&limit=5`),
      ]);
      const all = [
        ...(updates||[]).map(x=>({...x,_type:"update",_ts:x.created_at})),
        ...(tasks||[]).map(x=>({...x,_type:"task",_ts:x.created_at})),
        ...(files||[]).map(x=>({...x,_type:"file",_ts:x.created_at})),
        ...(meetings||[]).map(x=>({...x,_type:"meeting",_ts:x.created_at})),
      ].sort((a,b) => new Date(b._ts)-new Date(a._ts)).slice(0,20);
      setItems(all);
    })();
  }, [pageId, startupId]);

  const icons = { update:"📢", task:"📋", file:"📁", meeting:"📅" };
  const labels = {
    update: x => `posted an update`,
    task:   x => `created task: "${x.title?.slice(0,40)}"`,
    file:   x => `uploaded "${x.name?.slice(0,40)}"`,
    meeting:x => `scheduled meeting: "${x.title?.slice(0,40)}"`,
  };
  const uid = x => x.created_by||x.uploaded_by||me;

  return (
    <div>
      <div style={{ fontWeight:700, fontSize:14, color:th.txt, marginBottom:12 }}>⚡ Activity</div>
      {items.length === 0
        ? <p style={{ fontSize:13, color:th.txt3, textAlign:"center", padding:"20px 0" }}>No activity yet.</p>
        : items.map((item,i) => {
          const author = profiles[uid(item)] || { name:"Member" };
          return (
            <div key={item.id||i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${th.bdr}` }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:th.surf2, border:`1px solid ${th.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{icons[item._type]}</div>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, fontSize:12, color:th.txt }}>{author.name} </span>
                <span style={{ fontSize:12, color:th.txt2 }}>{labels[item._type]?.(item)}</span>
                <div style={{ fontSize:11, color:th.txt3, marginTop:1 }}>{ago(new Date(item._ts).getTime())}</div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ─── FEEDBACK SECTION ─────────────────────────────────────────────
function CColabFeedback({ startupId, me, profiles, isFounder, dk }) {
  const th = T(dk);
  const [feedbacks, setFeedbacks] = useState([]);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editMsg, setEditMsg] = useState("");
  const [attach, setAttach] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    db.get("rs_startup_feedback", `startup_id=eq.${startupId}&order=created_at.desc&limit=50`)
      .then(d => setFeedbacks(d||[]));
  }, [startupId]);

  const attachMedia = async files => {
    if (!files[0]) return;
    try { const b64 = await fileToB64(files[0],3); setAttach({ url:b64, type:files[0].type }); }
    catch(e) { alert(e.message); }
  };

  const post = async () => {
    if (!msg.trim() && !attach) return;
    setPosting(true);
    const saved = await db.post("rs_startup_feedback", { startup_id:startupId, user_id:me, message:msg.trim(), media:attach||null });
    if (saved) setFeedbacks(f => [saved,...f]);
    setMsg(""); setAttach(null); setPosting(false);
  };

  const del = async id => {
    await db.del("rs_startup_feedback", `id=eq.${id}`);
    setFeedbacks(f => f.filter(x => x.id!==id));
  };

  const saveEdit = async id => {
    await db.patch("rs_startup_feedback", `id=eq.${id}`, { message:editMsg });
    setFeedbacks(f => f.map(x => x.id===id ? {...x,message:editMsg} : x));
    setEditId(null);
  };

  return (
    <div style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, padding:16, marginTop:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", marginBottom:open?14:0 }}
        onClick={() => setOpen(x=>!x)}>
        <span style={{ fontWeight:700, fontSize:14, color:th.txt }}>💬 Feedback ({feedbacks.length})</span>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"#3b82f618", border:"1px solid #3b82f640", display:"flex", alignItems:"center", justifyContent:"center", color:"#3b82f6", fontWeight:800, fontSize:18, transition:"all .2s", transform:open?"rotate(45deg)":"none" }}>+</div>
      </div>
      {open && (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <Av profile={profiles[me]||{}} size={30} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:8, marginBottom:attach?6:0 }}>
                <input value={msg} onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && post()}
                  placeholder="Share your feedback…"
                  style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", color:th.txt }} />
                <button onClick={() => fileRef.current?.click()} style={{ background:"none", border:`1px solid ${th.bdr}`, borderRadius:8, padding:"0 10px", cursor:"pointer", color:th.txt3 }}><Image size={14} /></button>
                <button onClick={post} disabled={(!msg.trim()&&!attach)||posting}
                  style={{ background:(msg.trim()||attach)?"#3b82f6":th.surf2, border:"none", borderRadius:10, padding:"0 14px", color:(msg.trim()||attach)?"#fff":th.txt3, cursor:(msg.trim()||attach)?"pointer":"default", fontWeight:700, fontSize:13, flexShrink:0 }}>
                  {posting?"…":"Send"}
                </button>
                <input ref={fileRef} type="file" accept="image/*,audio/*" style={{ display:"none" }} onChange={e => attachMedia(e.target.files)} />
              </div>
              {attach && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                  {attach.type?.startsWith("image") ? <img src={attach.url} style={{ height:32, borderRadius:6, objectFit:"cover" }} alt="preview" /> : <span style={{ fontSize:11, color:th.txt2 }}>🎵 Audio</span>}
                  <button onClick={() => setAttach(null)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={11} /></button>
                </div>
              )}
            </div>
          </div>
          {feedbacks.length === 0
            ? <p style={{ fontSize:13, color:th.txt3, textAlign:"center", padding:"8px 0" }}>No feedback yet. Be first!</p>
            : feedbacks.map(fb => {
              const author = profiles[fb.user_id] || { name:"User" };
              const canEdit = isFounder || fb.user_id===me;
              return (
                <div key={fb.id} style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <Av profile={author} size={28} />
                  <div style={{ flex:1, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:10, padding:"8px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:12, color:th.txt }}>{author.name} <span style={{ fontWeight:400, color:th.txt3 }}>{ago(new Date(fb.created_at).getTime())}</span></span>
                      {canEdit && (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={() => { setEditId(fb.id); setEditMsg(fb.message); }} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3, padding:0 }}><Edit3 size={11} /></button>
                          <button onClick={() => del(fb.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:0 }}><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                    {editId===fb.id
                      ? <div style={{ display:"flex", gap:6 }}>
                          <input value={editMsg} onChange={e => setEditMsg(e.target.value)}
                            style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:7, padding:"5px 8px", fontSize:12, outline:"none", color:th.txt }} />
                          <button onClick={() => saveEdit(fb.id)} style={{ background:"#3b82f6", border:"none", borderRadius:7, padding:"4px 10px", color:"#fff", fontSize:11, cursor:"pointer" }}>Save</button>
                          <button onClick={() => setEditId(null)} style={{ background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:7, padding:"4px 8px", color:th.txt2, fontSize:11, cursor:"pointer" }}>✕</button>
                        </div>
                      : <>
                          <div style={{ fontSize:13, color:th.txt2, lineHeight:1.5 }}>{fb.message}</div>
                          {fb.media?.url && (
                            fb.media.type?.startsWith("image")
                              ? <img src={fb.media.url} style={{ maxWidth:180, borderRadius:8, marginTop:6 }} alt="feedback" />
                              : <audio src={fb.media.url} controls style={{ marginTop:6, width:160, height:28 }} />
                          )}
                        </>
                    }
                  </div>
                </div>
              );
            })
          }
        </>
      )}
    </div>
  );
}

// ─── PAGE WORKSPACE ───────────────────────────────────────────────
function CPageWorkspace({ page, startup, me, profiles, bals, dk, onBack, onProfile, isFounder }) {
  const th = T(dk);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState("chat");
  const pt = cpt(page);

  useEffect(() => {
    db.get("rs_page_access", `page_id=eq.${page.id}&status=eq.approved`)
      .then(d => setMembers(d||[]));
  }, [page.id]);

  const tabs = [
    { id:"chat",     label:"Chat",     e:"💬" },
    { id:"tasks",    label:"Tasks",    e:"📋" },
    { id:"files",    label:"Files",    e:"📁" },
    { id:"meetings", label:"Meetings", e:"📅" },
    { id:"activity", label:"Activity", e:"⚡" },
    { id:"members",  label:"Members",  e:"👥" },
  ];

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.txt2, fontSize:13, fontWeight:600, padding:"0 0 14px" }}>
        <ArrowLeft size={15} /> Back to {startup.name}
      </button>
      <div style={{ background:`linear-gradient(135deg,${pt.c}22,${pt.c}08)`, border:`1px solid ${pt.c}30`, borderRadius:16, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:`${pt.c}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{pt.e}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:17, color:th.txt }}>{page.name}</div>
            <div style={{ fontSize:13, color:th.txt2 }}>{page.description||pt.desc}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <StackedAvatars userIds={members.map(m=>m.user_id)} profiles={profiles} onProfile={onProfile} max={4} size={24} />
            <span style={{ fontSize:12, color:th.txt3 }}>{members.length} member{members.length!==1?"s":""}</span>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:16, background:th.surf2, borderRadius:12, padding:4, border:`1px solid ${th.bdr}`, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink:0, padding:"7px 12px", borderRadius:9, border:"none", background:tab===t.id?pt.c:"transparent", color:tab===t.id?"#fff":th.txt2, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s", whiteSpace:"nowrap" }}>
            {t.e} {t.label}
          </button>
        ))}
      </div>
      {tab==="chat"     && <CPageChat pageId={page.id} me={me} profiles={profiles} bals={bals} dk={dk} onProfile={onProfile} />}
      {tab==="tasks"    && <CTaskPanel pageId={page.id} me={me} profiles={profiles} members={members} dk={dk} />}
      {tab==="files"    && <CFileManager pageId={page.id} me={me} profiles={profiles} dk={dk} />}
      {tab==="meetings" && <CMeetingPanel pageId={page.id} startupId={startup.id} me={me} profiles={profiles} members={members} dk={dk} />}
      {tab==="activity" && <CActivityFeed pageId={page.id} startupId={startup.id} me={me} profiles={profiles} dk={dk} />}
      {tab==="members"  && (
        <div>
          {members.length === 0
            ? <p style={{ textAlign:"center", color:th.txt3, padding:32 }}>No approved members yet.</p>
            : members.map(m => {
              const p = profiles[m.user_id] || { name:"Member" };
              return (
                <Card dk={dk} key={m.id}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <ProfileHoverCard uid={m.user_id} profiles={profiles} bals={bals} dk={dk} onProfile={onProfile}>
                      <Av profile={p} size={40} />
                    </ProfileHoverCard>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                      <div style={{ fontSize:12, color:th.txt3 }}>{p.handle?`@${p.handle}`:p.email}</div>
                    </div>
                    <span style={{ background:`${pt.c}18`, color:pt.c, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>✓ Member</span>
                  </div>
                </Card>
              );
            })
          }
        </div>
      )}
    </div>
  );
}

// ─── JOIN MODAL ───────────────────────────────────────────────────
function CJoinModal({ startup, me, onClose, onSubmit, dk }) {
  const th = T(dk);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  const submit = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    const pageTypeIds = [...new Set(selected.flatMap(r => JOIN_ROLES.find(x=>x.id===r)?.maps||[]))];
    await onSubmit({ startup_id:startup.id, user_id:me, selected_roles:selected, page_type_ids:pageTypeIds, message, status:"pending" });
    setSubmitting(false);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:th.surf, borderRadius:20, padding:24, width:"100%", maxWidth:420, animation:"fadeUp .25s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:th.txt }}>Join {startup.name}</h3>
            <p style={{ margin:"4px 0 0", fontSize:13, color:th.txt3 }}>Tell us who you are — select all that apply</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {JOIN_ROLES.map(r => {
            const sel = selected.includes(r.id);
            return (
              <button key={r.id} onClick={() => toggle(r.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, border:`1.5px solid ${sel?"#3b82f6":th.bdr}`, background:sel?"#3b82f615":"transparent", cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{r.e}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:sel?"#3b82f6":th.txt }}>{r.label}</div>
                  <div style={{ fontSize:11, color:th.txt3 }}>{r.desc}</div>
                </div>
                {sel && <Check size={14} color="#3b82f6" />}
              </button>
            );
          })}
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12, fontWeight:700, color:th.txt2, display:"block", marginBottom:6, letterSpacing:.4 }}>MESSAGE (OPTIONAL)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Introduce yourself — why do you want to join?"
            rows={3} style={{ width:"100%", background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", color:th.txt, boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:12, cursor:"pointer", color:th.txt2, fontWeight:600, fontSize:13 }}>Cancel</button>
          <button onClick={submit} disabled={submitting||!selected.length}
            style={{ flex:2, padding:"10px", background:selected.length?"linear-gradient(135deg,#3b82f6,#8b5cf6)":th.surf2, border:"none", borderRadius:12, cursor:selected.length?"pointer":"default", color:selected.length?"#fff":th.txt3, fontWeight:700, fontSize:13 }}>
            {submitting?"Sending…":`Request Access (${selected.length} role${selected.length!==1?"s":""})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REFERRAL JOIN ────────────────────────────────────────────────
function CReferralModal({ me, onClose, onSuccess, dk }) {
  const th = T(dk);
  const [code, setCode] = useState("");
  const [startup, setStartup] = useState(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const checkCode = async () => {
    if (!code.trim()) return;
    setChecking(true); setErr(""); setStartup(null);
    const rows = await db.get("rs_startups", `referral_code=eq.${code.trim().toUpperCase()}`);
    if (!rows?.length) { setErr("Invalid code. Check and try again."); setChecking(false); return; }
    setStartup(rows[0]);
    setChecking(false);
  };

  const handleSubmit = async data => {
    const saved = await db.post("rs_page_access_requests", data);
    if (saved) { onSuccess(startup); onClose(); }
  };

  if (showJoin && startup) return <CJoinModal startup={startup} me={me} onClose={onClose} onSubmit={handleSubmit} dk={dk} />;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:th.surf, borderRadius:20, padding:24, width:"100%", maxWidth:360, animation:"fadeUp .25s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:th.txt }}>Join via Code</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); setStartup(null); }}
            onKeyDown={e => e.key==="Enter" && checkCode()}
            placeholder="e.g. SKILL-A3B2"
            style={{ flex:1, background:th.inp, border:`1.5px solid ${err?"#ef4444":startup?"#10b981":th.inpB}`, borderRadius:10, padding:"9px 12px", fontSize:14, outline:"none", color:th.txt, fontFamily:"monospace", letterSpacing:1 }} />
          <button onClick={checkCode} disabled={checking||!code.trim()}
            style={{ background:"#3b82f6", border:"none", borderRadius:10, padding:"0 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {checking?"…":"Check"}
          </button>
        </div>
        {err && <p style={{ fontSize:13, color:"#ef4444", margin:"0 0 12px", display:"flex", alignItems:"center", gap:5 }}><AlertCircle size={13} />{err}</p>}
        {startup && (
          <div style={{ background:th.surf2, borderRadius:14, padding:14, marginBottom:16, border:"1px solid #10b98130" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, overflow:"hidden", flexShrink:0 }}>
                {startup.logo?.startsWith("data:")?<img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" />:startup.logo||"🚀"}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:15, color:th.txt }}>{startup.name}</div>
                <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>✓ Valid startup</div>
              </div>
            </div>
            <p style={{ fontSize:13, color:th.txt2, margin:0, lineHeight:1.5 }}>{startup.description?.slice(0,100)}{startup.description?.length>100?"…":""}</p>
          </div>
        )}
        {startup && (
          <button onClick={() => setShowJoin(true)} style={{ width:"100%", padding:"11px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            Continue to Join →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CREATE / EDIT STARTUP ────────────────────────────────────────
function CCreateStartupModal({ me, existing, onClose, onSave, dk }) {
  const th = T(dk);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: existing?.name||"",
    logo: existing?.logo||"",
    description: existing?.description||"",
    website: existing?.website||"",
    github_link: existing?.github_link||"",
    twitter: existing?.social_links?.twitter||"",
    linkedin: existing?.social_links?.linkedin||"",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const logoRef = useRef();
  const setF = (k,v) => setForm(p => ({...p,[k]:v}));
  const canNext = form.name.trim() && form.description.trim();

  const handleLogoUpload = async files => {
    if (!files[0]) return;
    try { const b64 = await fileToB64(files[0],2); setLogoFile(b64); }
    catch(e) { alert(e.message); }
  };

  const handleSave = async () => {
    if (!canNext) return;
    setSubmitting(true);
    const logoVal = logoFile || (form.logo?.startsWith("data:") ? form.logo : null) || form.logo || "🚀";
    const payload = {
      name:form.name.trim(), logo:logoVal, description:form.description.trim(),
      website:form.website.trim(), github_link:form.github_link.trim(),
      social_links:{ twitter:form.twitter, linkedin:form.linkedin },
      created_by:me, founders:existing?.founders||[me],
      referral_code:existing?.referral_code||genStartupCode(form.name),
    };
    let saved;
    if (existing?.id) {
      await db.patch("rs_startups", `id=eq.${existing.id}`, payload);
      saved = {...existing,...payload};
    } else {
      saved = await db.post("rs_startups", payload);
      if (saved?.id) {
        const defaultPages = DEFAULT_CPAGE_TYPES.map(tid => {
          const pt = CPAGE_TYPES.find(p=>p.id===tid);
          return { startup_id:saved.id, name:pt.label, description:pt.desc, type_id:tid };
        });
        await db.postMany("rs_startup_pages", defaultPages);
      }
    }
    setSubmitting(false);
    onSave(saved);
    onClose();
  };

  const inp = { width:"100%", background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:10, padding:"9px 12px", fontSize:13, outline:"none", boxSizing:"border-box", color:th.txt };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:th.surf, borderRadius:20, padding:24, width:"100%", maxWidth:460, animation:"fadeUp .25s ease", margin:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:th.txt }}>{existing?"Edit Startup":`Create Startup ${!existing?`— Step ${step}/2`:""}`}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><X size={18} /></button>
        </div>
        {!existing && (
          <div style={{ display:"flex", gap:4, marginBottom:20 }}>
            {[1,2].map(s => <div key={s} style={{ flex:1, height:3, borderRadius:99, background:s<=step?"#3b82f6":th.bdr, transition:"all .3s" }} />)}
          </div>
        )}

        {step===1 && (
          <>
            {/* Logo */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}>
              <div style={{ position:"relative" }}>
                <div onClick={() => logoRef.current?.click()}
                  style={{ width:80, height:80, borderRadius:20, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, overflow:"hidden", cursor:"pointer", border:"3px dashed rgba(59,130,246,.4)" }}>
                  {(logoFile||existing?.logo)?.startsWith("data:")
                    ? <img src={logoFile||existing?.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" />
                    : <span>{form.logo||"🚀"}</span>
                  }
                </div>
                <div style={{ position:"absolute", bottom:-4, right:-4, width:26, height:26, borderRadius:"50%", background:"#3b82f6", border:"2px solid white", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                  onClick={() => logoRef.current?.click()}>
                  <Image size={12} color="#fff" />
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleLogoUpload(e.target.files)} />
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, fontWeight:600, color:th.txt2, display:"block", marginBottom:4 }}>Or use emoji</label>
              <input value={form.logo} onChange={e=>setF("logo",e.target.value)} placeholder="🚀" style={{...inp,width:70}} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:th.txt2, display:"block", marginBottom:4 }}>Startup Name *</label>
              <input value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. SkillSwap" style={inp} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:th.txt2, display:"block", marginBottom:4 }}>Problem & Solution *</label>
              <textarea value={form.description} onChange={e=>setF("description",e.target.value)}
                placeholder="What problem are you solving and how?" rows={4}
                style={{...inp,resize:"vertical",fontFamily:"inherit"}} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:12, cursor:"pointer", color:th.txt2, fontWeight:600 }}>Cancel</button>
              <button onClick={() => existing?handleSave():setStep(2)} disabled={!canNext}
                style={{ flex:2, padding:"10px", background:canNext?"#3b82f6":th.surf2, border:"none", borderRadius:12, cursor:canNext?"pointer":"default", color:canNext?"#fff":th.txt3, fontWeight:700, fontSize:14 }}>
                {existing?(submitting?"Saving…":"Save Changes"):"Next: Links →"}
              </button>
            </div>
          </>
        )}

        {step===2 && (
          <>
            {[
              { k:"website",     l:"Website",    p:"https://…" },
              { k:"github_link", l:"GitHub",     p:"https://github.com/…" },
              { k:"twitter",     l:"Twitter / X",p:"https://twitter.com/…" },
              { k:"linkedin",    l:"LinkedIn",   p:"https://linkedin.com/company/…" },
            ].map(f => (
              <div key={f.k} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:th.txt2, display:"block", marginBottom:4 }}>{f.l}</label>
                <input value={form[f.k]} onChange={e=>setF(f.k,e.target.value)} placeholder={f.p} style={inp} />
              </div>
            ))}
            <div style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:12, marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:th.txt, marginBottom:6 }}>📄 Auto-created Pages:</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {DEFAULT_CPAGE_TYPES.map(id => { const pt=CPAGE_TYPES.find(p=>p.id===id); return pt?<span key={id} style={{ background:`${pt.c}18`, color:pt.c, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99 }}>{pt.e} {pt.label}</span>:null; })}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:12, cursor:"pointer", color:th.txt2, fontWeight:600 }}>← Back</button>
              <button onClick={handleSave} disabled={submitting}
                style={{ flex:2, padding:"10px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:12, cursor:"pointer", color:"#fff", fontWeight:700, fontSize:14 }}>
                {submitting?"Launching…":"Launch Startup 🚀"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── FOUNDER DASHBOARD ───────────────────────────────────────────
function CFounderDashboard({ startup, me, profiles, bals, dk, onBack, onStartupUpdated, onProfile }) {
  const th = T(dk);
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageType, setNewPageType] = useState("community");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(null);
  const [shareLink, setShareLink] = useState("");

  const load = useCallback(async () => {
    const [rq,pg,ms,us] = await Promise.all([
      db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&order=created_at.desc`),
      db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
      db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
      db.get("rs_startup_updates", `startup_id=eq.${startup.id}&room_id=is.null&order=created_at.desc&limit=20`),
    ]);
    setRequests(rq||[]); setPages(pg||[]); setMembers(ms||[]); setUpdates(us||[]);
    setLoading(false);
  },[startup.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setShareLink(`${window.location.origin}?join=${startup.referral_code}`); },[startup.referral_code]);

  // Open a page workspace from founder dashboard
  if (activePage) return (
    <CPageWorkspace page={activePage} startup={startup} me={me} profiles={profiles} bals={bals} dk={dk}
      onBack={() => setActivePage(null)} onProfile={onProfile} isFounder={true} />
  );

  const approveForPage = async (req, pageTypeId) => {
    const page = pages.find(p => p.type_id===pageTypeId);
    if (!page) return;
    await db.upsert("rs_page_access", { startup_id:req.startup_id, page_id:page.id, user_id:req.user_id, status:"approved" });
    setMembers(ms => [...ms.filter(m=>!(m.page_id===page.id&&m.user_id===req.user_id)), { page_id:page.id, user_id:req.user_id, status:"approved" }]);
  };

  const resolveRequest = async (req, status) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status });
    setRequests(rs => rs.map(r => r.id===req.id?{...r,status}:r));
  };

  const removeFromPage = async (pageId, userId) => {
    await db.del("rs_page_access", `page_id=eq.${pageId}&user_id=eq.${userId}`);
    setMembers(ms => ms.filter(m=>!(m.page_id===pageId&&m.user_id===userId)));
  };

  const addPage = async () => {
    if (!newPageName.trim()) return;
    const pt = CPAGE_TYPES.find(p=>p.id===newPageType)||CPAGE_TYPES[3];
    const saved = await db.post("rs_startup_pages", { startup_id:startup.id, name:newPageName.trim(), description:pt.desc, type_id:newPageType });
    if (saved) setPages(p=>[...p,saved]);
    setNewPageName(""); setShowAddPage(false);
  };

  const delPage = async id => {
    await db.del("rs_startup_pages", `id=eq.${id}`);
    setPages(p=>p.filter(x=>x.id!==id));
  };

  const postUpdate = async () => {
    if (!newUpdate.trim()) return;
    setPosting(true);
    const saved = await db.post("rs_startup_updates", { startup_id:startup.id, content:newUpdate.trim(), created_by:me });
    if (saved) setUpdates(us=>[saved,...us]);
    setNewUpdate(""); setPosting(false);
  };

  const delUpdate = async id => {
    await db.del("rs_startup_updates", `id=eq.${id}`);
    setUpdates(us=>us.filter(u=>u.id!==id));
  };

  const pending = requests.filter(r=>r.status==="pending");
  const uniqueMembers = [...new Map(members.map(m=>[m.user_id,m])).values()];

  const dashTabs = [
    { id:"overview",  label:"Overview" },
    { id:"requests",  label:`Requests${pending.length?` (${pending.length})`:""}`},
    { id:"pages",     label:"Pages" },
    { id:"members",   label:"Members" },
    { id:"meetings",  label:"Meetings" },
    { id:"updates",   label:"Updates" },
    { id:"feedback",  label:"Feedback" },
  ];

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      {showEdit && <CCreateStartupModal me={me} existing={startup} onClose={()=>setShowEdit(false)} onSave={onStartupUpdated} dk={dk} />}

      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.txt2, fontSize:13, fontWeight:600, padding:"0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* Dashboard header */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a22,#5b21b622)", border:"1px solid #3b82f630", borderRadius:16, padding:18, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:56, height:56, borderRadius:15, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, overflow:"hidden", flexShrink:0 }}>
              {startup.logo?.startsWith("data:") ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" /> : startup.logo||"🚀"}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:th.txt }}>{startup.name}</div>
              <div style={{ fontSize:12, color:th.txt3 }}>Founder Dashboard · {pages.length} Pages · {uniqueMembers.length} Members</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ background:"#f59e0b18", border:"1px solid #f59e0b40", borderRadius:10, padding:"6px 14px" }}>
              <div style={{ fontSize:10, color:"#f59e0b", fontWeight:700 }}>REFERRAL CODE</div>
              <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#f59e0b", letterSpacing:1 }}>{startup.referral_code}</div>
            </div>
            <CopyBtn text={startup.referral_code} label="Copy Code" />
            <CopyBtn text={shareLink} label="Copy Link" />
            <button onClick={() => setShowEdit(true)} style={{ display:"flex", alignItems:"center", gap:5, background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:10, padding:"6px 12px", cursor:"pointer", color:th.txt2, fontSize:12, fontWeight:600 }}>
              <Edit3 size={12} />Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:th.surf2, borderRadius:12, padding:4, border:`1px solid ${th.bdr}`, overflowX:"auto" }}>
        {dashTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink:0, padding:"7px 12px", borderRadius:9, border:"none", background:tab===t.id?"#3b82f6":"transparent", color:tab===t.id?"#fff":th.txt2, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spin dk={dk} msg="Loading dashboard…" /> : (
        <>
          {/* OVERVIEW */}
          {tab==="overview" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { l:"Total Members", v:uniqueMembers.length, c:"#3b82f6", e:"👥" },
                  { l:"Pages", v:pages.length, c:"#8b5cf6", e:"📄" },
                  { l:"Pending Requests", v:pending.length, c:"#f59e0b", e:"📬" },
                ].map(s => (
                  <div key={s.l} style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, padding:"14px 16px" }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{s.e}</div>
                    <div style={{ fontSize:26, fontWeight:800, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:11, color:th.txt3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <CActivityFeed startupId={startup.id} me={me} profiles={profiles} dk={dk} />
            </div>
          )}

          {/* REQUESTS */}
          {tab==="requests" && (
            <div>
              {requests.length === 0
                ? <div style={{ textAlign:"center", padding:40, color:th.txt3 }}><Users size={36} style={{ marginBottom:10 }} /><p>No join requests yet.</p></div>
                : requests.map(req => {
                  const p = profiles[req.user_id] || { name:"Applicant" };
                  const roles = req.selected_roles||[];
                  const pageTypeIds = req.page_type_ids||[];
                  return (
                    <Card dk={dk} key={req.id} anim={false}>
                      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        <ProfileHoverCard uid={req.user_id} profiles={profiles} bals={bals} dk={dk} onProfile={onProfile}>
                          <Av profile={p} size={44} />
                        </ProfileHoverCard>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:6 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                              <div style={{ fontSize:12, color:th.txt3 }}>{p.handle?`@${p.handle}`:p.email}</div>
                            </div>
                            <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:req.status==="approved"?"#10b98118":req.status==="rejected"?"#ef444418":"#f59e0b18", color:req.status==="approved"?"#10b981":req.status==="rejected"?"#ef4444":"#f59e0b" }}>{req.status?.toUpperCase()}</span>
                          </div>
                          {roles.length > 0 && (
                            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
                              {roles.map(r => { const jr=JOIN_ROLES.find(x=>x.id===r); return jr?<span key={r} style={{ background:"#3b82f618", color:"#3b82f6", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99 }}>{jr.e} {jr.label}</span>:null; })}
                            </div>
                          )}
                          {req.message && <p style={{ fontSize:12, color:th.txt2, margin:"0 0 8px", fontStyle:"italic" }}>"{req.message}"</p>}
                          {req.status==="pending" && (
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                              {pageTypeIds.map(ptid => {
                                const pt = CPAGE_TYPES.find(x=>x.id===ptid)||CPAGE_TYPES[3];
                                return (
                                  <button key={ptid} onClick={() => approveForPage(req, ptid)}
                                    style={{ display:"flex", alignItems:"center", gap:4, background:`${pt.c}18`, border:`1px solid ${pt.c}40`, borderRadius:8, padding:"5px 10px", cursor:"pointer", color:pt.c, fontSize:11, fontWeight:700 }}>
                                    {pt.e} Approve {pt.label}
                                  </button>
                                );
                              })}
                              <button onClick={() => { pageTypeIds.forEach(ptid=>approveForPage(req,ptid)); resolveRequest(req,"approved"); }}
                                style={{ display:"flex", alignItems:"center", gap:4, background:"#10b98118", border:"1px solid #10b98140", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#10b981", fontSize:11, fontWeight:700 }}>
                                <Check size={10} />All
                              </button>
                              <button onClick={() => resolveRequest(req,"rejected")}
                                style={{ display:"flex", alignItems:"center", gap:4, background:"#ef444418", border:"1px solid #ef444440", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#ef4444", fontSize:11, fontWeight:700 }}>
                                <X size={10} />Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              }
            </div>
          )}

          {/* PAGES */}
          {tab==="pages" && (
            <div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                <button onClick={() => setShowAddPage(x=>!x)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  <Plus size={13} />Add Page
                </button>
              </div>
              {showAddPage && (
                <div style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:14, marginBottom:14 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input value={newPageName} onChange={e=>setNewPageName(e.target.value)} placeholder="Page name"
                      style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"7px 10px", fontSize:13, outline:"none", color:th.txt }} />
                    <select value={newPageType} onChange={e=>setNewPageType(e.target.value)}
                      style={{ background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:8, padding:"7px 10px", fontSize:12, color:th.txt, outline:"none" }}>
                      {CPAGE_TYPES.map(p => <option key={p.id} value={p.id}>{p.e} {p.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setShowAddPage(false)} style={{ flex:1, padding:"7px", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:8, cursor:"pointer", color:th.txt2, fontSize:12 }}>Cancel</button>
                    <button onClick={addPage} style={{ flex:2, padding:"7px", background:"#3b82f6", border:"none", borderRadius:8, cursor:"pointer", color:"#fff", fontWeight:700, fontSize:12 }}>Create Page</button>
                  </div>
                </div>
              )}
              {pages.map(pg => {
                const pt = cpt(pg);
                const pgMembers = members.filter(m=>m.page_id===pg.id);
                return (
                  <Card dk={dk} key={pg.id} anim={false}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:`${pt.c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{pt.e}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{pg.name}</div>
                        <div style={{ fontSize:12, color:th.txt3 }}>{pgMembers.length} member{pgMembers.length!==1?"s":""} · {pg.description}</div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setActivePage(pg)} style={{ background:`${pt.c}18`, border:`1px solid ${pt.c}40`, borderRadius:8, padding:"5px 10px", cursor:"pointer", color:pt.c, fontSize:11, fontWeight:700 }}>Enter</button>
                        <button onClick={() => delPage(pg.id)} style={{ background:"#ef444415", border:"1px solid #ef444430", borderRadius:8, padding:"5px 8px", cursor:"pointer", color:"#ef4444", display:"flex" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* MEMBERS */}
          {tab==="members" && (
            <div>
              {uniqueMembers.length === 0
                ? <p style={{ textAlign:"center", color:th.txt3, padding:32 }}>No members yet.</p>
                : uniqueMembers.map(m => {
                  const p = profiles[m.user_id] || { name:"Member" };
                  const userPages = members.filter(x=>x.user_id===m.user_id).map(x=>pages.find(pg=>pg.id===x.page_id)).filter(Boolean);
                  return (
                    <Card dk={dk} key={m.user_id} anim={false}>
                      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        <ProfileHoverCard uid={m.user_id} profiles={profiles} bals={bals} dk={dk} onProfile={onProfile}>
                          <Av profile={p} size={42} />
                        </ProfileHoverCard>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                          <div style={{ fontSize:12, color:th.txt3, marginBottom:6 }}>{p.handle?`@${p.handle}`:p.email}</div>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                            {userPages.map(pg => {
                              const pt = cpt(pg);
                              return (
                                <div key={pg.id} style={{ display:"flex", alignItems:"center", gap:3, background:`${pt.c}15`, border:`1px solid ${pt.c}30`, borderRadius:20, padding:"2px 8px 2px 6px" }}>
                                  <span style={{ fontSize:11 }}>{pt.e}</span>
                                  <span style={{ fontSize:11, color:pt.c, fontWeight:600 }}>{pg.name}</span>
                                  <button onClick={() => removeFromPage(pg.id,m.user_id)} style={{ background:"none", border:"none", cursor:"pointer", color:pt.c, padding:0, marginLeft:2, display:"flex" }}><X size={9} /></button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              }
            </div>
          )}

          {/* MEETINGS — global */}
          {tab==="meetings" && (
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:th.txt, marginBottom:14 }}>All Meetings Across Pages</div>
              {pages.length === 0 ? <p style={{ color:th.txt3, textAlign:"center", padding:24 }}>No pages yet.</p>
                : pages.map(pg => {
                  const pt = cpt(pg);
                  return (
                    <div key={pg.id} style={{ marginBottom:20 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:pt.c, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                        {pt.e} {pg.name}
                      </div>
                      <CMeetingPanel pageId={pg.id} startupId={startup.id} me={me} profiles={profiles} members={[]} dk={dk} compact />
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* UPDATES */}
          {tab==="updates" && (
            <div>
              <Card dk={dk} anim={false} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", gap:10 }}>
                  <Av profile={profiles[me]||{}} size={34} />
                  <div style={{ flex:1 }}>
                    <textarea value={newUpdate} onChange={e=>setNewUpdate(e.target.value)}
                      placeholder="Post a startup update visible to all…" rows={3}
                      style={{ width:"100%", background:"transparent", border:"none", outline:"none", fontSize:14, lineHeight:1.6, resize:"none", fontFamily:"inherit", color:th.txt, boxSizing:"border-box" }} />
                    <div style={{ display:"flex", justifyContent:"flex-end", borderTop:`1px solid ${th.bdr}`, paddingTop:8 }}>
                      <button onClick={postUpdate} disabled={!newUpdate.trim()||posting}
                        style={{ background:newUpdate.trim()?"#3b82f6":"transparent", border:`1px solid ${newUpdate.trim()?"transparent":th.bdr}`, borderRadius:10, padding:"7px 20px", color:newUpdate.trim()?"#fff":th.txt3, fontSize:13, fontWeight:700, cursor:newUpdate.trim()?"pointer":"default" }}>
                        {posting?"Posting…":"Post Update"}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
              {updates.map(u => {
                const author = profiles[u.created_by] || { name:"Founder" };
                return (
                  <Card dk={dk} key={u.id}>
                    <div style={{ display:"flex", gap:10 }}>
                      <Av profile={author} size={34} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <span style={{ fontWeight:700, fontSize:13, color:th.txt }}>{author.name}</span>
                            <span style={{ fontSize:11, color:th.txt3, marginLeft:6 }}>{ago(new Date(u.created_at).getTime())}</span>
                          </div>
                          {(isFounder||u.created_by===me) && (
                            <button onClick={() => delUpdate(u.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.txt3 }}><Trash2 size={13} /></button>
                          )}
                        </div>
                        <p style={{ margin:"6px 0 0", fontSize:14, color:th.txt, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{u.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FEEDBACK */}
          {tab==="feedback" && (
            <CColabFeedback startupId={startup.id} me={me} profiles={profiles} isFounder={true} dk={dk} />
          )}
        </>
      )}
    </div>
  );
}

// ─── STARTUP DETAIL ───────────────────────────────────────────────
function CStartupDetail({ startup:init, me, profiles, bals, dk, onBack, onProfile }) {
  const th = T(dk);
  const [startup, setStartup] = useState(init);
  const [pages, setPages] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [myPageIds, setMyPageIds] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFounder = startup.created_by===me||(startup.founders||[]).includes(me);

  useEffect(() => {
    (async () => {
      const [pg,us,rq,acc,bk] = await Promise.all([
        db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
        db.get("rs_startup_updates", `startup_id=eq.${startup.id}&room_id=is.null&order=created_at.desc&limit=10`),
        db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}&order=created_at.desc&limit=1`),
        db.get("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${me}&status=eq.approved`),
        db.get("rs_startup_bookmarks", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
      ]);
      setPages(pg||[]); setUpdates(us||[]);
      setMyRequest(rq?.[0]||null);
      setMyPageIds((acc||[]).map(a=>a.page_id));
      setBookmarked((bk||[]).length>0);
      setLoading(false);
    })();
  },[startup.id,me]);

  const toggleBookmark = async () => {
    if (bookmarked) {
      await db.del("rs_startup_bookmarks", `startup_id=eq.${startup.id}&user_id=eq.${me}`);
      setBookmarked(false);
    } else {
      await db.upsert("rs_startup_bookmarks", { startup_id:startup.id, user_id:me });
      setBookmarked(true);
    }
  };

  const handleJoinSubmit = async data => {
    const saved = await db.post("rs_page_access_requests", data);
    if (saved) setMyRequest(saved);
  };

  if (isFounder) return <CFounderDashboard startup={startup} me={me} profiles={profiles} bals={bals} dk={dk} onBack={onBack} onStartupUpdated={s=>setStartup(s)} onProfile={onProfile} />;
  if (activePage) return <CPageWorkspace page={activePage} startup={startup} me={me} profiles={profiles} bals={bals} dk={dk} onBack={()=>setActivePage(null)} onProfile={onProfile} isFounder={false} />;

  const founders = (startup.founders||[startup.created_by]).filter(Boolean);
  const isFounder2 = false; // already handled above

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      {showJoin && <CJoinModal startup={startup} me={me} onClose={()=>setShowJoin(false)} onSubmit={handleJoinSubmit} dk={dk} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.txt2, fontSize:13, fontWeight:600, padding:0 }}>
          <ArrowLeft size={15} /> Back to Colab
        </button>
        <button onClick={toggleBookmark}
          style={{ display:"flex", alignItems:"center", gap:5, background:bookmarked?"#3b82f618":"transparent", border:`1px solid ${bookmarked?"#3b82f640":th.bdr}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", color:bookmarked?"#3b82f6":th.txt3, fontSize:12, fontWeight:600 }}>
          <Bookmark size={13} fill={bookmarked?"#3b82f6":"none"} />{bookmarked?"Saved":"Save"}
        </button>
      </div>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a18,#5b21b618)", border:"1px solid #3b82f628", borderRadius:20, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ width:68, height:68, borderRadius:18, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, flexShrink:0, overflow:"hidden" }}>
            {startup.logo?.startsWith("data:") ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" /> : startup.logo||"🚀"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:th.txt }}>{startup.name}</h2>
            <p style={{ margin:"0 0 10px", fontSize:14, color:th.txt2, lineHeight:1.6 }}>{startup.description}</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
              {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"4px 10px", fontSize:12, color:th.txt2, fontWeight:600 }}><Globe size={11} />Website</a>}
              {startup.github_link && <a href={startup.github_link} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"4px 10px", fontSize:12, color:th.txt2, fontWeight:600 }}>⚡ GitHub</a>}
              {startup.social_links?.twitter && <a href={startup.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:"#1da1f215", border:"1px solid #1da1f230", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#1da1f2", fontWeight:600 }}><Twitter size={11} /></a>}
              {startup.social_links?.linkedin && <a href={startup.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:"#0a66c215", border:"1px solid #0a66c230", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#0a66c2", fontWeight:600 }}><Linkedin size={11} /></a>}
            </div>
            {founders.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <StackedAvatars userIds={founders} profiles={profiles} onProfile={onProfile} max={5} />
                <span style={{ fontSize:12, color:th.txt3 }}>
                  {founders.slice(0,2).map(id=>profiles[id]?.name?.split(" ")[0]).filter(Boolean).join(", ")}
                  {founders.length>2?` +${founders.length-2} more`:""}
                </span>
              </div>
            )}
          </div>
          <div style={{ flexShrink:0 }}>
            {myRequest && myRequest.status!=="rejected"
              ? <span style={{ background:myRequest.status==="approved"?"#10b98118":"#f59e0b18", color:myRequest.status==="approved"?"#10b981":"#f59e0b", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:99, border:"1px solid currentColor", display:"block" }}>
                  {myRequest.status==="approved"?"✓ Approved":"⏳ Pending"}
                </span>
              : <button onClick={()=>setShowJoin(true)}
                  style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 22px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 0 20px rgba(59,130,246,.3)" }}>
                  {myRequest?.status==="rejected"?"Re-apply":"Join Startup"}
                </button>
            }
          </div>
        </div>
      </div>

      {loading ? <Spin dk={dk} /> : (
        <>
          {/* Pages */}
          <div style={{ fontWeight:700, fontSize:15, color:th.txt, marginBottom:10 }}>📄 Pages</div>
          {pages.map(pg => {
            const pt = cpt(pg);
            const isApproved = myPageIds.includes(pg.id);
            return (
              <Card dk={dk} key={pg.id} anim={false} style={{ position:"relative", overflow:"hidden" }}>
                {!isApproved && <div style={{ position:"absolute", inset:0, backdropFilter:"blur(1.5px)", background:"rgba(0,0,0,.03)", zIndex:1, borderRadius:16 }} />}
                <div style={{ display:"flex", gap:12, alignItems:"center", position:"relative", zIndex:2 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${pt.c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{pt.e}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{pg.name}</div>
                    <div style={{ fontSize:12, color:th.txt3 }}>{pg.description}</div>
                  </div>
                  {isApproved
                    ? <button onClick={()=>setActivePage(pg)} style={{ background:pt.c, border:"none", borderRadius:10, padding:"7px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Enter →</button>
                    : <span style={{ fontSize:11, color:th.txt3, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"5px 10px" }}>🔒 Locked</span>
                  }
                </div>
              </Card>
            );
          })}

          {myPageIds.length < pages.length && myRequest?.status !== "pending" && (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <button onClick={()=>setShowJoin(true)} style={{ background:"transparent", border:"1.5px dashed #3b82f660", borderRadius:12, padding:"10px 24px", color:"#3b82f6", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                + Request access to more pages
              </button>
            </div>
          )}

          {/* Updates */}
          {updates.length > 0 && (
            <>
              <div style={{ fontWeight:700, fontSize:15, color:th.txt, margin:"20px 0 10px" }}>📢 Updates</div>
              {updates.map(u => {
                const author = profiles[u.created_by] || { name:"Founder" };
                return (
                  <Card dk={dk} key={u.id}>
                    <div style={{ display:"flex", gap:10 }}>
                      <Av profile={author} size={32} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:5 }}>
                          <span style={{ fontWeight:700, fontSize:13, color:th.txt }}>{author.name}</span>
                          <span style={{ fontSize:11, color:th.txt3 }}>{ago(new Date(u.created_at).getTime())}</span>
                        </div>
                        <p style={{ margin:0, fontSize:14, color:th.txt, lineHeight:1.65 }}>{u.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}

          {/* Feedback */}
          <CColabFeedback startupId={startup.id} me={me} profiles={profiles} isFounder={false} dk={dk} />
        </>
      )}
    </div>
  );
}

// ─── COLAB LISTING ────────────────────────────────────────────────
function ColabView({ me, dk, profiles, bals, onProfile, addNotif }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [search, setSearch] = useState("");
  const [updateMap, setUpdateMap] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [filterBookmarked, setFilterBookmarked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.get("rs_startups", "order=created_at.desc&limit=60");
    setStartups(data||[]);
    if (data?.length) {
      const ids = data.map(s=>s.id);
      const idStr = ids.join(",");
      const [us,fb,bk] = await Promise.all([
        db.get("rs_startup_updates", `startup_id=in.(${idStr})&room_id=is.null&order=created_at.desc`),
        db.get("rs_startup_feedback", `startup_id=in.(${idStr})&order=created_at.desc`),
        db.get("rs_startup_bookmarks", `user_id=eq.${me}`),
      ]);
      const um={}; (us||[]).forEach(u=>{if(!um[u.startup_id])um[u.startup_id]=u;});
      const fm={}; (fb||[]).forEach(f=>{if(!fm[f.startup_id])fm[f.startup_id]=[];fm[f.startup_id].push(f);});
      setUpdateMap(um);
      setFeedbackMap(fm);
      setBookmarkedIds((bk||[]).map(b=>b.startup_id));
    }
    setLoading(false);
  },[me]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = s => {
    if (s) { setStartups(ss=>[s,...ss.filter(x=>x.id!==s.id)]); setActive(s); }
  };

  let filtered = startups.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
  );
  if (filterBookmarked) filtered = filtered.filter(s=>bookmarkedIds.includes(s.id));

  if (active) return (
    <CStartupDetail startup={active} me={me} profiles={profiles} bals={bals} dk={dk}
      onBack={()=>{setActive(null);load();}} onProfile={onProfile} />
  );

  return (
    <div>
      {showCreate && <CCreateStartupModal me={me} onClose={()=>setShowCreate(false)} onSave={handleCreated} dk={dk} />}
      {showReferral && <CReferralModal me={me} onClose={()=>setShowReferral(false)} onSuccess={s=>{addNotif({type:"sandbox",msg:`🚀 Request sent to join ${s.name}`});}} dk={dk} />}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a,#312e81)", borderRadius:20, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14, marginBottom:16 }}>
          <div>
            <h2 style={{ margin:"0 0 4px", fontSize:24, fontWeight:900, color:"#fff" }}>🚀 Colab</h2>
            <p style={{ margin:0, fontSize:14, color:"rgba(255,255,255,.55)" }}>Startup OS · Discover · Collaborate · Build</p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>setShowReferral(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:10, padding:"8px 14px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              <Hash size={13} />Enter Code
            </button>
            <button onClick={()=>setShowCreate(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"none", borderRadius:10, padding:"8px 16px", color:"#1e3a8a", fontSize:13, fontWeight:800, cursor:"pointer" }}>
              <Plus size={13} />Create Startup
            </button>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ position:"relative", flex:1 }}>
            <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,.4)" }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search startups…"
              style={{ width:"100%", background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", borderRadius:10, padding:"9px 12px 9px 34px", fontSize:13, outline:"none", color:"#fff", boxSizing:"border-box" }} />
          </div>
          <button onClick={()=>setFilterBookmarked(x=>!x)}
            style={{ background:filterBookmarked?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)", border:`1px solid ${filterBookmarked?"rgba(255,255,255,.4)":"rgba(255,255,255,.15)"}`, borderRadius:10, padding:"0 14px", color:"#fff", cursor:"pointer", flexShrink:0, fontSize:12, fontWeight:600 }}>
            🔖 {filterBookmarked?"All":"Saved"}
          </button>
        </div>
      </div>

      {loading ? <Spin dk={dk} msg="Loading startups…" /> : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:th.txt3 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🚀</div>
          <p style={{ fontSize:16, fontWeight:600, margin:"0 0 6px", color:th.txt }}>{filterBookmarked?"No saved startups":"No startups yet"}</p>
          <p style={{ fontSize:14, margin:"0 0 20px" }}>{filterBookmarked?"Save startups to see them here":"Be the first to create one!"}</p>
          {!filterBookmarked && <button onClick={()=>setShowCreate(true)} style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 24px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>Create Startup</button>}
        </div>
      ) : filtered.map(s => {
        const isFounder = s.created_by===me||(s.founders||[]).includes(me);
        const founders = (s.founders||[s.created_by]).filter(Boolean);
        const latestUpdate = updateMap[s.id];
        const fbCount = (feedbackMap[s.id]||[]).length;
        const isBookmarked = bookmarkedIds.includes(s.id);
        return (
          <Card dk={dk} key={s.id}>
            <div onClick={()=>setActive(s)} style={{ cursor:"pointer" }}>
              <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, overflow:"hidden" }}>
                  {s.logo?.startsWith("data:") ? <img src={s.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" /> : s.logo||"🚀"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4 }}>
                    <div style={{ fontWeight:800, fontSize:16, color:th.txt }}>{s.name}</div>
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      {isBookmarked && <span style={{ fontSize:12, color:"#3b82f6" }}>🔖</span>}
                      {isFounder && <span style={{ background:"#f59e0b18", color:"#f59e0b", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, border:"1px solid #f59e0b40" }}>OWNER</span>}
                    </div>
                  </div>
                  <p style={{ margin:"0 0 8px", fontSize:13, color:th.txt2, lineHeight:1.55 }}>{s.description?.slice(0,120)}{s.description?.length>120?"…":""}</p>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                    {s.website && <a href={s.website} onClick={e=>e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:3, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:6, padding:"2px 7px", fontSize:11, color:th.txt2, fontWeight:600 }}><Globe size={10} />Web</a>}
                    {s.github_link && <a href={s.github_link} onClick={e=>e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:3, background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:6, padding:"2px 7px", fontSize:11, color:th.txt2, fontWeight:600 }}>⚡ Git</a>}
                    {s.social_links?.twitter && <a href={s.social_links.twitter} onClick={e=>e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", background:"#1da1f215", border:"1px solid #1da1f230", borderRadius:6, padding:"2px 7px", fontSize:11, color:"#1da1f2" }}><Twitter size={10} /></a>}
                    {s.social_links?.linkedin && <a href={s.social_links.linkedin} onClick={e=>e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", background:"#0a66c215", border:"1px solid #0a66c230", borderRadius:6, padding:"2px 7px", fontSize:11, color:"#0a66c2" }}><Linkedin size={10} /></a>}
                  </div>
                  {founders.length > 0 && (
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <StackedAvatars userIds={founders} profiles={profiles} onProfile={onProfile} max={4} size={22} />
                      <span style={{ fontSize:11, color:th.txt3 }}>{founders.length} founder{founders.length!==1?"s":""}</span>
                    </div>
                  )}
                </div>
              </div>
              {latestUpdate && (
                <div style={{ background:th.surf2, border:`1px solid ${th.bdr}`, borderRadius:10, padding:"8px 12px", marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:th.txt3, marginBottom:2 }}>📢 LATEST UPDATE</div>
                  <div style={{ fontSize:12, color:th.txt2, lineHeight:1.5 }}>{latestUpdate.content?.slice(0,130)}{latestUpdate.content?.length>130?"…":""}</div>
                </div>
              )}
              {fbCount > 0 && <div style={{ fontSize:11, color:th.txt3, display:"flex", alignItems:"center", gap:4 }}><MessageCircle size={11} />{fbCount} feedback</div>}
            </div>
            <div style={{ borderTop:`1px solid ${th.bdr}`, marginTop:12, paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:th.txt3 }}>{s.created_at?ago(new Date(s.created_at).getTime())+" ago":""}</span>
              <button onClick={()=>setActive(s)} style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:10, padding:"7px 18px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {isFounder?"Manage →":"Join →"}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// ─── ADMIN PORTAL ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function AdminSidebar({ view, setView, dk }) {
  const th = T(dk);
  const links = [
    { id: "a_dash", e: "📊", l: "Dashboard" },
    { id: "a_users", e: "👥", l: "Users & Roles" },
    { id: "a_sandbox", e: "💡", l: "Submissions" },
    { id: "a_events", e: "📅", l: "Events" },
    { id: "a_posts", e: "📝", l: "Posts" },
    { id: "a_tokens", e: "◈", l: "Tokens" },
    { id: "a_ads", e: "📢", l: "Ads" },
  ];
  return (
    <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${th.bdr}`, height: "100vh", position: "sticky", top: 0, background: th.side }}>
      <div style={{ padding: "14px 12px", borderBottom: `1px solid ${th.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#ef4444,#f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={16} color="#fff" /></div>
          <div><div style={{ fontWeight: 800, fontSize: 14, color: th.txt }}>Admin Portal</div><div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: .5 }}>RIGHTSIGNAL</div></div>
        </div>
      </div>
      <div style={{ padding: "8px", flex: 1 }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setView(l.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: view === l.id ? dk ? "rgba(239,68,68,.15)" : "#fff5f5" : "transparent", color: view === l.id ? "#ef4444" : th.txt2, fontSize: 13, fontWeight: view === l.id ? 700 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: view === l.id ? "2px solid #ef4444" : "2px solid transparent" }}>
            <span style={{ fontSize: 15 }}>{l.e}</span><span>{l.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminDash({ dk, bals, profiles }) {
  const th = T(dk);
  const [stats, setStats] = useState({ posts: 0, sandbox: 0, contribs: 0, events: 0, alignments: 0 });
  const total = Object.values(bals).reduce((s, v) => s + v, 0);
  useEffect(() => {
    Promise.all([db.get("rs_posts","select=id"), db.get("rs_sandbox","select=id"), db.get("rs_contributions","select=id"), db.get("rs_events","select=id"), db.get("rs_alignments","select=id")])
      .then(([p,s,c,e,a]) => setStats({ posts: p.length, sandbox: s.length, contribs: c.length, events: e.length, alignments: a.length }));
  }, []);
  const sorted = Object.values(profiles).sort((a, b) => (bals[b.id] ?? 0) - (bals[a.id] ?? 0));
  const medals = ["🥇","🥈","🥉"];
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: th.txt }}>Dashboard</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 20px" }}>Live platform overview</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total Users", v: Object.keys(profiles).length, c: "#3b82f6", e: "👥" }, { l: "Total Posts", v: stats.posts, c: "#10b981", e: "📝" }, { l: "Sandbox Ideas", v: stats.sandbox, c: "#8b5cf6", e: "💡" }, { l: "Contributions", v: stats.contribs, c: "#f97316", e: "📚" }, { l: "Alignments", v: stats.alignments, c: "#06b6d4", e: "🤝" }, { l: "SGN Distributed", v: `◈ ${total}`, c: "#f59e0b", e: "◈" }].map(t => (
          <div key={t.l} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: th.txt2 }}>{t.l}</span><span style={{ fontSize: 20 }}>{t.e}</span></div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.c }}>{t.v}</div>
          </div>
        ))}
      </div>
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: th.txt }}>◈ SGN Token Leaderboard</h3>
        {sorted.length === 0 ? <p style={{ color: th.txt3, textAlign: "center", padding: 16 }}>No users yet.</p> : sorted.map((u, i) => {
          const bal = bals[u.id] ?? 0;
          return (
            <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${th.bdr}` }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{medals[i] || `${i + 1}`}</span>
              <Av profile={u} size={32} bal={bal} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13, color: th.txt }}>{u.name}</div><div style={{ fontSize: 11, color: th.txt3 }}>{u.email || u.handle} · {ROLES[u.system_role] || "User"}</div></div>
              <SGN n={bal} size="md" />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function AdminUsers({ dk, bals, profiles }) {
  const th = T(dk);
  const [search, setSearch] = useState("");
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const users = Object.values(profiles).filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const updateRole = async (uid, role) => {
    await db.patch("rs_user_profiles", `id=eq.${uid}`, { system_role: role });
    setEditingRole(null);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", color: th.txt }}>Users & Roles ({Object.keys(profiles).length})</h2>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 12px 8px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
      </div>
      {users.map(u => (
        <Card dk={dk} key={u.id} anim={false}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Av profile={u} size={42} bal={bals[u.id] ?? 0} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{u.name}</span>
                {u.is_admin && <span style={{ background: "#ef444418", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>ADMIN</span>}
              </div>
              <div style={{ fontSize: 12, color: th.txt3 }}>{u.email} · {u.handle ? `@${u.handle}` : ""}</div>
              <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, marginTop: 2 }}>{ROLES[u.system_role] || "Regular User"}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <SGN n={bals[u.id] ?? 0} size="sm" />
              {editingRole === u.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: th.txt, outline: "none" }}>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => updateRole(u.id, selectedRole)} style={{ background: "#10b981", border: "none", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 12, cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditingRole(null)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 8px", color: th.txt2, fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditingRole(u.id); setSelectedRole(u.system_role || "user"); }} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: th.txt2, fontSize: 12, fontWeight: 600 }}>Change Role</button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminSandbox({ dk }) {
  const th = T(dk);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.get("rs_sandbox", "order=created_at.desc&limit=100").then(d => { setSubs(d || []); setLoading(false); }); }, []);

  const updateStatus = async (id, status) => {
    await db.patch("rs_sandbox", `id=eq.${id}`, { status });
    setSubs(ss => ss.map(s => s.id === id ? { ...s, status } : s));
  };

  if (loading) return <Spin dk={dk} />;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: th.txt }}>Sandbox Submissions</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 20px" }}>Review, approve, or reject startup ideas</p>
      {subs.map(s => (
        <Card dk={dk} key={s.id} anim={false}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <div><span style={{ fontWeight: 700, fontSize: 15, color: th.txt }}>{s.title}</span></div>
            <span style={{ background: "#3b82f618", color: "#3b82f6", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99 }}>{ST_LABEL[s.status] || s.status}</span>
          </div>
          <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 6px" }}><strong>Problem:</strong> {s.problem}</p>
          <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 12px" }}><strong>Solution:</strong> {s.solution}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "✓ Approve", status: "shortlisted_50", color: "#10b981" },
              { label: "Top 30", status: "shortlisted_30", color: "#3b82f6" },
              { label: "Finalist", status: "finalist_10", color: "#8b5cf6" },
              { label: "Winner 🏆", status: "winner", color: "#f59e0b" },
              { label: "✗ Reject", status: "rejected", color: "#ef4444" },
            ].map(({ label, status, color }) => (
              <button key={status} onClick={() => updateStatus(s.id, status)} style={{ background: s.status === status ? color : `${color}15`, border: `1px solid ${color}40`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: s.status === status ? "#fff" : color, fontSize: 12, fontWeight: 600 }}>{label}</button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminEvents({ dk }) {
  const th = T(dk);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Technology", event_date: "", timezone: "IST", mode: "Online", url: "", is_free: true });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_events", "order=event_date.asc");
      if (!data?.length) { await db.postMany("rs_events", SEED_EVENTS); data = await db.get("rs_events", "order=event_date.asc") || []; }
      setEvents(data); setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (editing) { await db.patch("rs_events", `id=eq.${editing}`, form); setEvents(es => es.map(e => e.id === editing ? { ...e, ...form } : e)); }
    else { const saved = await db.post("rs_events", form); if (saved) setEvents(es => [saved, ...es]); }
    setEditing(null); setForm({ title: "", description: "", category: "Technology", event_date: "", timezone: "IST", mode: "Online", url: "", is_free: true });
  };

  const del = async id => { await db.del("rs_events", `id=eq.${id}`); setEvents(es => es.filter(e => e.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: th.txt }}>Events ({events.length})</h2>
        <button onClick={() => setEditing("new")} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} />Add Event</button>
      </div>
      {(editing === "new" || (editing && editing !== "new")) && (
        <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: th.txt }}>{editing === "new" ? "Add Event" : "Edit Event"}</h3>
          {[{ k: "title", l: "Title *", p: "Event title" }, { k: "description", l: "Description", p: "Short description" }, { k: "url", l: "URL", p: "https://…" }].map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{f.l}</label>
              <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Date *</label>
              <input type="datetime-local" value={form.event_date} onChange={e => setF("event_date", e.target.value)} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Category</label>
              <select value={form.category} onChange={e => setF("category", e.target.value)} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", color: th.txt }}>
                {Object.keys(CAT_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditing(null)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: th.txt }}>Cancel</button>
          </div>
        </Card>
      )}
      {loading ? <Spin dk={dk} /> : events.map(ev => (
        <Card dk={dk} key={ev.id} anim={false}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: th.txt, marginBottom: 4 }}>{ev.title}</div>
              <div style={{ fontSize: 12, color: th.txt3 }}>{fmtDate(ev.event_date)} · {ev.category}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setEditing(ev.id); setForm({ title: ev.title, description: ev.description, category: ev.category, event_date: ev.event_date?.slice(0, 16), timezone: ev.timezone, mode: ev.mode || "Online", url: ev.url, is_free: ev.is_free }); }} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center" }}><Edit3 size={13} /></button>
              <button onClick={() => del(ev.id)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminPosts({ dk }) {
  const th = T(dk);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { db.get("rs_posts", "order=created_at.desc&limit=50").then(d => { setPosts(d || []); setLoading(false); }); }, []);
  const del = async id => { await db.del("rs_posts", `id=eq.${id}`); setPosts(ps => ps.filter(p => p.id !== id)); };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", color: th.txt }}>Posts ({posts.length})</h2>
      {loading ? <Spin dk={dk} /> : posts.map(p => (
        <Card dk={dk} key={p.id} anim={false}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: th.txt, margin: "0 0 6px", lineHeight: 1.5 }}>{p.text?.slice(0, 160)}{p.text?.length > 160 ? "…" : ""}</p>
              <div style={{ fontSize: 11, color: th.txt3 }}>❤ {p.like_count || 0} · 🔁 {p.repost_count || 0} · {fmtDate(p.created_at)}</div>
            </div>
            <button onClick={() => del(p.id)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#ef4444", flexShrink: 0, display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminTokens({ dk, bals }) {
  const th = T(dk);
  const total = Object.values(bals).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(bals).sort((a, b) => b[1] - a[1]).slice(0, 20);
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: th.txt }}>Token Overview</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 20px" }}>◈ {total} SGN distributed across {Object.keys(bals).length} users</p>
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: th.txt }}>Top Earners</h3>
        {sorted.map(([uid, bal], i) => (
          <div key={uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${th.bdr}` }}>
            <span style={{ fontSize: 13, color: th.txt, fontWeight: 500 }}>{i + 1}. {uid.slice(0, 12)}…</span>
            <SGN n={bal} size="sm" />
          </div>
        ))}
      </Card>
    </div>
  );
}

function AdminAds({ dk }) {
  const th = T(dk);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { db.get("rs_sponsored_ads", "order=created_at.desc").then(d => { setAds(d || []); setLoading(false); }); }, []);
  const toggleStatus = async (id, current) => {
    const newStatus = current === "active" ? "paused" : "active";
    await db.patch("rs_sponsored_ads", `id=eq.${id}`, { status: newStatus });
    setAds(as => as.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };
  const del = async id => { await db.del("rs_sponsored_ads", `id=eq.${id}`); setAds(as => as.filter(a => a.id !== id)); };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", color: th.txt }}>Sponsored Ads ({ads.length})</h2>
      {loading ? <Spin dk={dk} /> : ads.length === 0 ? <p style={{ color: th.txt3, textAlign: "center", padding: 32 }}>No ads created yet.</p> : ads.map(a => (
        <Card dk={dk} key={a.id} anim={false}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{a.type?.toUpperCase()}</span>
                <span style={{ background: a.status === "active" ? "#10b98118" : "#6b728018", color: a.status === "active" ? "#10b981" : "#6b7280", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{a.status?.toUpperCase()}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{a.headline}</div>
              <div style={{ fontSize: 12, color: th.txt2 }}>{a.body?.slice(0, 80)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toggleStatus(a.id, a.status)} style={{ background: a.status === "active" ? "#f59e0b18" : "#10b98118", border: `1px solid ${a.status === "active" ? "#f59e0b40" : "#10b98140"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: a.status === "active" ? "#f59e0b" : "#10b981", fontSize: 12, fontWeight: 600 }}>{a.status === "active" ? "Pause" : "Activate"}</button>
              <button onClick={() => del(a.id)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminApp({ me, myProfile, bals, profiles, dk, setDk, onSignOut }) {
  const th = T(dk);
  const [view, setView] = useState("a_dash");
  const renderAdmin = () => {
    switch (view) {
      case "a_dash": return <AdminDash dk={dk} bals={bals} profiles={profiles} />;
      case "a_users": return <AdminUsers dk={dk} bals={bals} profiles={profiles} />;
      case "a_sandbox": return <AdminSandbox dk={dk} />;
      case "a_events": return <AdminEvents dk={dk} />;
      case "a_posts": return <AdminPosts dk={dk} />;
      case "a_tokens": return <AdminTokens dk={dk} bals={bals} />;
      case "a_ads": return <AdminAds dk={dk} />;
      default: return <AdminDash dk={dk} bals={bals} profiles={profiles} />;
    }
  };
  return (
    <div style={{ display: "flex", height: "100vh", background: th.bg, overflow: "hidden" }}>
      <GlobalCSS dk={dk} />
      <AdminSidebar view={view} setView={setView} dk={dk} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: th.top, borderBottom: `1px solid ${th.bdr}`, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backdropFilter: "blur(14px)", zIndex: 50 }}>
          <span style={{ background: "#ef444418", color: "#ef4444", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}><Shield size={11} />Admin Mode · {ROLES[myProfile?.system_role] || "Admin"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setDk(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(59,130,246,.15)" : th.inp, border: `1px solid ${dk ? "#3b82f640" : th.inpB}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: dk ? "#3b82f6" : th.txt2 }}>
              {dk ? <Sun size={14} /> : <Moon size={14} />}<span style={{ fontSize: 12, fontWeight: 600 }}>{dk ? "Light" : "Dark"}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: th.surf2, borderRadius: 10, padding: "6px 12px", border: `1px solid ${th.bdr}` }}>
              <Av profile={myProfile || {}} size={24} />
              <span style={{ fontSize: 13, fontWeight: 600, color: th.txt }}>{myProfile?.name}</span>
            </div>
            <button onClick={onSignOut} style={{ background: "none", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt3, display: "flex", alignItems: "center" }}><LogOut size={14} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>{renderAdmin()}</div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  // Start in "loading" state if we detect an OAuth return or stored session
  // so the login form never flashes during auto-login
  const hasStoredSession = (() => {
    try {
      if (sessionStorage.getItem("rs_oauth_return")) return true;
      const s = JSON.parse(localStorage.getItem("rs_session") || "null");
      return s?.access_token && s?.expires_at > Math.floor(Date.now() / 1000);
    } catch { return false; }
  })();
  const [screen, setScreen] = useState(hasStoredSession ? "loading" : "auth");
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [bals, setBals] = useState({});
  const [dk, setDk] = useState(false);
  const [view, setView] = useState("feed");
  const [profUid, setProfUid] = useState(null);
  const [notifs, setNotifs] = useState([{ id: "n0", type: "token", msg: "◈ Welcome to RightSignal!", ts: Date.now() - 60000, read: false }]);
  const [showN, setShowN] = useState(false);
  const [tokenPop, setTokenPop] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const addNotif = useCallback(n => { setNotifs(ns => [{ id: genId(), ...n, ts: Date.now(), read: false }, ...ns]); }, []);
  const unread = notifs.filter(n => !n.read).length;
  const urlRef = useRef(new URLSearchParams(window.location.search).get("ref") || "");

  const strToColor = s => strColor(s);

  const loadProfiles = async () => {
    const rows = await db.get("rs_user_profiles", "order=created_at.desc");
    const map = {};
    (rows || []).forEach(r => { map[r.id] = { ...r, hue: strToColor(r.name || "?") }; });
    setProfiles(map);
    return map;
  };

  const loadBals = async () => {
    const rows = await db.get("rs_token_balances");
    const map = {};
    (rows || []).forEach(r => { map[r.uid] = r.balance; });
    setBals(map);
  };

  const seedIfNeeded = async () => {
    const [evs, sbx, ctb, pts] = await Promise.all([db.get("rs_events","select=id&limit=1"), db.get("rs_sandbox","select=id&limit=1"), db.get("rs_contributions","select=id&limit=1"), db.get("rs_posts","select=id&limit=1")]);
    if (!evs?.length) await db.postMany("rs_events", SEED_EVENTS);
    if (!sbx?.length) await db.postMany("rs_sandbox", SEED_SANDBOX);
    if (!ctb?.length) await db.postMany("rs_contributions", SEED_CONTRIBS);
    if (!pts?.length) await db.postMany("rs_posts", SEED_POSTS);
  };

  // Seed admin account if it doesn't exist
  const seedAdmin = async () => {
    try {
      const existing = await db.get("rs_user_profiles", `email=eq.${ADMIN_EMAIL}&select=id`);
      if (existing?.length) {
        await db.patch("rs_user_profiles", `email=eq.${ADMIN_EMAIL}`, { is_admin: true, system_role: "admin" });
      }
    } catch {}
  };

  const handleAuth = async (sess, authUser, isNewUser, name) => {
    setSession(sess);
    setMe(authUser.id);
    // Persist session so page refresh keeps user logged in
    if (sess?.access_token) {
      const toStore = { ...sess, expires_at: sess.expires_at || Math.floor(Date.now() / 1000) + 3600 };
      localStorage.setItem("rs_session", JSON.stringify(toStore));
    }
    seedIfNeeded();
    seedAdmin();

    const prof = await db.get("rs_user_profiles", `id=eq.${authUser.id}`);
    if (prof?.[0]) {
      const p = { ...prof[0], hue: strToColor(prof[0].name || "?") };
      setMyProfile(p);
      await Promise.all([loadProfiles(), loadBals()]);
      if (p.is_admin || p.system_role === "admin") setScreen("admin");
      else setScreen("app");
    } else {
      const displayName = name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "New User";
      const isAdminEmail = authUser.email === ADMIN_EMAIL;
      setMyProfile({ id: authUser.id, email: authUser.email, name: displayName, is_admin: isAdminEmail, system_role: isAdminEmail ? "admin" : "user" });
      if (isAdminEmail) {
        // Auto-create admin profile
        const handle = genHandle(displayName);
        const ref_code = genRefCode(displayName);
        await db.upsert("rs_user_profiles", { id: authUser.id, email: authUser.email, name: displayName, handle, bio: "", role: "Admin", who: "executive", interests: [], ref_code, is_admin: true, system_role: "admin" });
        await Promise.all([loadProfiles(), loadBals()]);
        setScreen("admin");
      } else {
        setScreen("onboarding");
      }
    }
  };

  const handleOnboardingDone = async ({ who, ints, refCode, refUid }) => {
    const nameToUse = myProfile?.name || "User";
    const handle = genHandle(nameToUse);
    const myRefCode = genRefCode(nameToUse);
    const isAdminEmail = myProfile?.email === ADMIN_EMAIL;

    const profileRow = { id: me, email: myProfile?.email || "", name: nameToUse, handle, bio: "", role: WHO_OPTS.find(w => w.id === who)?.label || "Member", who, interests: ints, ref_code: myRefCode, referred_by: refUid || null, is_admin: isAdminEmail, system_role: isAdminEmail ? "admin" : "user" };
    await db.upsert("rs_user_profiles", profileRow);

    let myBal = 0;
    if (refUid) {
      const refBalRows = await db.get("rs_token_balances", `uid=eq.${refUid}`);
      const refBal = (refBalRows[0]?.balance || 0) + 2;
      myBal = 1;
      await Promise.all([
        db.upsert("rs_token_balances", { uid: me, balance: 1 }),
        db.upsert("rs_token_balances", { uid: refUid, balance: refBal }),
        db.post("rs_token_txns", { uid: me, type: "earn", amount: 1, description: "Joined via referral" }),
        db.post("rs_token_txns", { uid: refUid, type: "earn", amount: 2, description: `${nameToUse} joined via your referral` }),
        db.post("rs_referrals", { referrer_uid: refUid, referee_uid: me, code_used: refCode }),
      ]);
      setBals(b => ({ ...b, [me]: 1, [refUid]: refBal }));
    } else {
      await db.upsert("rs_token_balances", { uid: me, balance: 0 });
      setBals(b => ({ ...b, [me]: 0 }));
    }

    const fullProfile = { ...profileRow, hue: strToColor(nameToUse) };
    setMyProfile(fullProfile);
    setProfiles(p => ({ ...p, [me]: fullProfile }));
    if (myBal > 0) { setNotifs(ns => [{ id: genId(), type: "token", msg: "◈ +1 SGN — Welcome referral bonus!", ts: Date.now(), read: false }, ...ns]); setTokenPop(myBal); }

    await Promise.all([loadProfiles(), loadBals()]);
    window.history.replaceState({}, "", window.location.pathname);
    if (isAdminEmail) setScreen("admin");
    else setScreen("app");
  };

  const handleSignOut = async () => {
    if (session?.access_token) await sbAuth.signOut(session.access_token);
    localStorage.removeItem("rs_session");
    sessionStorage.removeItem("rs_oauth_pending");
    sessionStorage.removeItem("rs_pkce_verifier");
    setSession(null); setMe(null); setMyProfile(null); setProfiles({}); setBals({}); setView("feed"); setScreen("auth");
  };

  const toggleBookmark = postId => {
    setBookmarks(bs => bs.includes(postId) ? bs.filter(b => b !== postId) : [...bs, postId]);
  };

  const navTo = v => { setView(v); setShowN(false); setProfUid(null); };
  const openProfile = id => { setProfUid(id); setView("profile"); setShowN(false); };
  const sidebarNav = v => { if (v === "profile") openProfile(me); else navTo(v); };
  const openMessage = uid => { setProfUid(uid); navTo("messages"); };
  const handleTag = tag => { setActiveTag(tag); navTo("feed"); };

  // Restore session from localStorage on mount
  useEffect(() => {
    let cancelled = false;

    const trySession = async (sess) => {
      if (!sess?.access_token) return false;
      if (sess.expires_at && sess.expires_at < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem("rs_session");
        sessionStorage.removeItem("rs_oauth_return");
        return false;
      }
      try {
        const u = await sbAuth.getUser(sess.access_token);
        if (!cancelled && u && u.id) {
          await handleAuth(sess, u, false, "");
          return true;
        }
      } catch {}
      localStorage.removeItem("rs_session");
      sessionStorage.removeItem("rs_oauth_return");
      return false;
    };

    (async () => {
      // Priority 1: Fresh OAuth return (detected before React mounted)
      const oauthReturn = sessionStorage.getItem("rs_oauth_return");
      if (oauthReturn) {
        sessionStorage.removeItem("rs_oauth_return");
        try {
          const sess = JSON.parse(oauthReturn);
          if (await trySession(sess)) return;
        } catch {}
      }

      // Priority 2: Existing valid session in localStorage
      const stored = localStorage.getItem("rs_session");
      if (stored) {
        try {
          const sess = JSON.parse(stored);
          if (await trySession(sess)) return;
        } catch {}
        localStorage.removeItem("rs_session");
      }

      // Priority 3: Check URL hash directly (fallback)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const token = params.get("access_token");
        if (token) {
          const sess = {
            access_token: token,
            refresh_token: params.get("refresh_token") || "",
            expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get("expires_in") || "3600", 10),
          };
          localStorage.setItem("rs_session", JSON.stringify(sess));
          window.history.replaceState({}, "", window.location.pathname);
          await trySession(sess);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#040a14,#0c1929)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <GlobalCSS dk={true} />
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(59,130,246,.5)" }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 26 }}>R</span>
      </div>
      <div style={{ width: 32, height: 32, border: "3px solid #1c2d47", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Signing you in…</span>
    </div>
  );
  if (screen === "auth") return <><GlobalCSS dk={false} /><AuthScreen onAuth={handleAuth} /></>;
  if (screen === "onboarding") return <><GlobalCSS dk={false} /><Onboarding user={myProfile || {}} onComplete={handleOnboardingDone} /></>;
  if (screen === "admin") return <AdminApp me={me} myProfile={myProfile} bals={bals} profiles={profiles} dk={dk} setDk={setDk} onSignOut={handleSignOut} />;

  const th = T(dk);

  const renderMain = () => {
    const common = { me, dk, bals, profiles, addNotif };
    switch (view) {
      case "profile": return <ProfileView uid={profUid || me} me={me} dk={dk} bals={bals} profiles={profiles} onBack={() => setView("feed")} setBals={setBals} onMessage={openMessage} />;
      case "wallet": return <WalletView me={me} dk={dk} bals={bals} setBals={setBals} myProfile={myProfile} />;
      case "messages": return <MessengerView me={me} dk={dk} profiles={profiles} initialUid={profUid} />;
      case "ads": return <AdsManagerView me={me} dk={dk} myProfile={myProfile} />;
      case "feed": return <FeedView {...common} myProfile={myProfile} onProfile={openProfile} bookmarks={bookmarks} onBookmark={toggleBookmark} />;
      case "network": return <NetworkView {...common} onProfile={openProfile} />;
      case "events": return <EventsView dk={dk} addNotif={addNotif} />;
      case "sandbox": return <SandboxView me={me} dk={dk} />;
      case "contribute": return <ContributeView me={me} dk={dk} />;
      case "colab": return <ColabView me={me} dk={dk} profiles={profiles} onProfile={openProfile} addNotif={addNotif} />;
      default: return <FeedView {...common} myProfile={myProfile} onProfile={openProfile} bookmarks={bookmarks} onBookmark={toggleBookmark} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: th.bg, overflow: "hidden" }}>
      <GlobalCSS dk={dk} />
      {tokenPop && <TokenPop amount={tokenPop} onDone={() => setTokenPop(null)} />}
      <Sidebar view={view} setView={sidebarNav} me={me} dk={dk} bals={bals} myProfile={myProfile} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: th.top, borderBottom: `1px solid ${th.bdr}`, padding: "8px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, backdropFilter: "blur(14px)", zIndex: 50 }}>
          <SearchBar dk={dk} profiles={profiles} onProfile={openProfile} onTag={handleTag} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <button onClick={() => navTo("wallet")} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#78350f,#d97706)", border: "none", borderRadius: 10, padding: "5px 12px", cursor: "pointer", boxShadow: "0 0 12px rgba(245,158,11,.3)" }}>
              <span style={{ fontSize: 14, color: "#fff" }}>◈</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{bals[me] ?? 0} SGN</span>
            </button>
            <button onClick={() => setDk(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(59,130,246,.15)" : th.inp, border: `1px solid ${dk ? "#3b82f640" : th.inpB}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: dk ? "#3b82f6" : th.txt2 }}>
              {dk ? <Sun size={14} /> : <Moon size={14} />}
              <span style={{ fontSize: 12, fontWeight: 600 }}>{dk ? "Light" : "Dark"}</span>
            </button>
            <button onClick={() => setShowN(x => !x)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: th.txt2, padding: 6 }}>
              <Bell size={18} />
              {unread > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 6px #ef4444" }}>{unread}</span>}
            </button>
            {showN && <NotifPanel notifs={notifs} setNotifs={setNotifs} onClose={() => setShowN(false)} dk={dk} />}
            <div onClick={() => openProfile(me)} style={{ cursor: "pointer" }}><Av profile={myProfile || {}} size={30} bal={bals[me] ?? 0} /></div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: "none", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt3, display: "flex", alignItems: "center" }}><LogOut size={14} /></button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>{renderMain()}</div>
          </div>
          {!["messages", "ads"].includes(view) && (
            <div style={{ overflowY: "auto", padding: "18px 14px 18px 0", flexShrink: 0 }}>
              <RightPanel dk={dk} myProfile={myProfile} onProfile={openProfile} bals={bals} onWallet={() => navTo("wallet")} profiles={profiles} onTag={handleTag} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
