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
// ============================================================
// Colab.jsx — RightSignal Startup Operating System
// Full-stack: Supabase DB + Realtime + Complete UI
// Usage in App.jsx:
//   import ColabView from './Colab';
//   case "colab": return <ColabView me={me} dk={dk} profiles={profiles}
//     myProfile={myProfile} addNotif={addNotif} onProfile={onProfile} />;
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Plus, X, Check, Search, Send, Edit3, Trash2, Globe,
  Mic, MicOff, Image, Video, Download, Calendar, Users, MessageCircle,
  Bell, Bookmark, BookmarkCheck, Clock, AlertCircle, CheckCircle2,
  Circle, Link, Twitter, Linkedin, Github, Paperclip, Upload, Star,
  TrendingUp, Zap, RefreshCw, Eye, Phone, Copy, File, ChevronRight,
  MoreHorizontal, Settings, AtSign, Hash, Filter,
} from "lucide-react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────
const SB_URL = "https://kzdjzasopqwzctwebiap.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZGp6YXNvcHF3emN0d2ViaWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjM1NTgsImV4cCI6MjA5MjA5OTU1OH0.VqGDt7JVvkP413tl40EIh3IFqtyhX1OMrv3iCGaMvls";
const H  = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const WS = SB_URL.replace("https", "wss");

// ─── REST BACKEND LAYER ───────────────────────────────────────
// Every DB call goes through this. No direct supabase-js needed.
const api = {
  get: async (table, query = "") => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}${query ? "?" + query : ""}`, { headers: H });
      if (!r.ok) return [];
      return r.json();
    } catch { return []; }
  },
  post: async (table, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: "POST", headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  },
  postMany: async (table, rows) => {
    if (!rows?.length) return [];
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: "POST", headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(rows),
      });
      return r.ok ? r.json() : [];
    } catch { return []; }
  },
  patch: async (table, query, body) => {
    try {
      await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
        method: "PATCH", headers: H, body: JSON.stringify(body),
      });
    } catch {}
  },
  del: async (table, query) => {
    try {
      await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { method: "DELETE", headers: H });
    } catch {}
  },
  upsert: async (table, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  },
};

// ─── REALTIME SUBSCRIPTION ────────────────────────────────────
// Uses Supabase Realtime over WebSocket
function useRealtime(table, filter, onEvent) {
  useEffect(() => {
    if (!table) return;
    let ws;
    let heartbeat;
    const channel = `realtime:public:${table}${filter ? `:${filter}` : ""}`;

    const connect = () => {
      ws = new WebSocket(`${WS}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ topic: "realtime:*", event: "phx_join", payload: {}, ref: "1" }));
        ws.send(JSON.stringify({
          topic: channel, event: "phx_join",
          payload: { config: { broadcast: { ack: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table }] } },
          ref: "2",
        }));
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
        }, 25000);
      };

      ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === "postgres_changes" && msg.payload?.data) {
            onEvent(msg.payload.data);
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval(heartbeat);
        setTimeout(connect, 3000); // reconnect
      };
    };

    connect();
    return () => { clearInterval(heartbeat); ws?.close(); };
  }, [table, filter]);
}

// ─── SERVER ACTIONS (backend logic layer) ─────────────────────
const Actions = {
  // Push notification to a user
  notify: async (userId, startupId, type, title, body, data = {}) => {
    await api.post("rs_startup_notifications", { user_id: userId, startup_id: startupId, type, title, body, data, is_read: false });
  },

  // Log activity
  log: async (startupId, pageId, actorId, type, description, data = {}) => {
    await api.post("rs_startup_activity", { startup_id: startupId, page_id: pageId, actor_id: actorId, type, description, data });
  },

  // Create startup with default pages
  createStartup: async (payload, me) => {
    const startup = await api.post("rs_startups", { ...payload, created_by: me, founders: [me] });
    if (!startup?.id) return null;

    const defaultPages = [
      { startup_id: startup.id, name: "Investor Page",  page_type: "investor",   description: "Pitch deck, funding & traction",  position: 0 },
      { startup_id: startup.id, name: "Tech Page",       page_type: "tech",       description: "Dev logs, code & tech updates",    position: 1 },
      { startup_id: startup.id, name: "Marketing Page",  page_type: "marketing",  description: "Campaigns, content & growth",      position: 2 },
      { startup_id: startup.id, name: "Community Page",  page_type: "community",  description: "Public updates & engagement",      position: 3 },
    ];

    const pages = await api.postMany("rs_startup_pages", defaultPages);

    if (pages?.length) {
      await api.postMany("rs_page_access", pages.map(pg => ({
        startup_id: startup.id, page_id: pg.id, user_id: me,
        role_type: "founder", is_admin: true, status: "approved",
      })));
    }

    await Actions.log(startup.id, null, me, "startup_created", `Startup "${startup.name}" created`);
    return { startup, pages };
  },

  // Approve a specific page request
  approvePageRequest: async (req, pageId, startup, profiles) => {
    await api.upsert("rs_page_access", {
      startup_id: req.startup_id, page_id: pageId,
      user_id: req.user_id, role_type: req.selected_roles?.[0] || "other",
      is_admin: false, status: "approved",
    });

    const updatedStatuses = { ...(req.page_statuses || {}), [pageId]: "approved" };
    const allDecided = (req.requested_pages || []).every(pid => updatedStatuses[pid]);
    const overallStatus = allDecided
      ? (Object.values(updatedStatuses).every(s => s === "approved") ? "approved" : "partial")
      : "pending";

    await api.patch("rs_page_access_requests", `id=eq.${req.id}`, { page_statuses: updatedStatuses, status: overallStatus });

    await Actions.notify(req.user_id, req.startup_id, "request_approved",
      "Access Granted! 🎉", `You've been approved to join ${startup?.name || "the startup"}`,
      { startup_id: req.startup_id, page_id: pageId }
    );

    await Actions.log(req.startup_id, pageId, req.user_id, "member_joined",
      `${profiles[req.user_id]?.name || "A member"} joined a page`
    );

    return { updatedStatuses, overallStatus };
  },

  // Reject a specific page request
  rejectPageRequest: async (req, pageId) => {
    const updatedStatuses = { ...(req.page_statuses || {}), [pageId]: "rejected" };
    const allDecided = (req.requested_pages || []).every(pid => updatedStatuses[pid]);
    const overallStatus = allDecided
      ? (Object.values(updatedStatuses).some(s => s === "approved") ? "partial" : "rejected")
      : "pending";

    await api.patch("rs_page_access_requests", `id=eq.${req.id}`, { page_statuses: updatedStatuses, status: overallStatus });
    return { updatedStatuses, overallStatus };
  },
};

// ─── UTILS ───────────────────────────────────────────────────
const ago = d => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${~~(s / 60)}m`;
  if (s < 86400) return `${~~(s / 3600)}h`;
  return `${~~(s / 86400)}d`;
};
const fmtDate = t => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtDT   = t => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const genId   = () => Math.random().toString(36).slice(2, 10);
const genCode = n => n.toUpperCase().replace(/\s+/g,"").slice(0,5) + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
const strClr  = s => { const c=["#3b82f6","#10b981","#8b5cf6","#f97316","#f43f5e","#06b6d4","#ec4899","#f59e0b"]; let h=0; for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))&0xffffff; return c[Math.abs(h)%c.length]; };
const toB64   = (file, maxMB = 8) => new Promise((res, rej) => {
  if (file.size > maxMB * 1024 * 1024) { rej(new Error(`Max ${maxMB}MB`)); return; }
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

// ─── CONSTANTS ────────────────────────────────────────────────
const PAGE_TYPES = [
  { id:"investor",   label:"Investor",   e:"💰", c:"#10b981", desc:"Pitch deck, funding & traction" },
  { id:"tech",       label:"Tech",       e:"👾", c:"#3b82f6", desc:"Dev logs, code & tech updates" },
  { id:"marketing",  label:"Marketing",  e:"📣", c:"#f97316", desc:"Campaigns, content & growth" },
  { id:"community",  label:"Community",  e:"🌐", c:"#8b5cf6", desc:"Public updates & engagement" },
  { id:"operations", label:"Operations", e:"⚙️", c:"#06b6d4", desc:"Ops, BD & partnerships" },
  { id:"design",     label:"Design",     e:"🎨", c:"#ec4899", desc:"UI/UX & brand assets" },
  { id:"general",    label:"General",    e:"📋", c:"#6b7280", desc:"General workspace" },
];

const JOIN_ROLES = [
  { id:"investor",  label:"Investor",        e:"💰", pages:["investor"] },
  { id:"tech",      label:"Tech / Dev",      e:"👾", pages:["tech"] },
  { id:"marketing", label:"Marketing",       e:"📣", pages:["marketing"] },
  { id:"design",    label:"Designer",        e:"🎨", pages:["design"] },
  { id:"operations",label:"Operations / BD", e:"⚙️", pages:["operations"] },
  { id:"intern",    label:"Student/Intern",  e:"🎓", pages:["community","general"] },
  { id:"general",   label:"General Audience",e:"🌐", pages:["community","general"] },
];

const TASK_STATUS = {
  pending:    { label:"Pending",     c:"#f59e0b", Icon:Circle },
  inprogress: { label:"In Progress", c:"#3b82f6", Icon:Clock },
  completed:  { label:"Completed",   c:"#10b981", Icon:CheckCircle2 },
};

const PRIORITY_COLORS = { low:"#10b981", medium:"#f59e0b", high:"#ef4444" };
const EMOJIS = ["😀","😂","🥰","😎","🤔","🚀","💡","🔥","👍","❤️","💪","🙏","✨","💰","🤝","👏","🎯","⚡","🛠️","📊","🎨","😮","🤯","💯","🏆"];

// ─── THEME ───────────────────────────────────────────────────
const T = dk => ({
  bg:   dk?"#080d18":"#f0f2f8",   surf: dk?"#0e1525":"#ffffff",
  sf2:  dk?"#131d30":"#f4f6fb",   bdr:  dk?"#1c2d47":"#e2e8f0",
  txt:  dk?"#e8eeff":"#0f172a",   tx2:  dk?"#7a93c0":"#475569",
  tx3:  dk?"#3d5278":"#94a3b8",   inp:  dk?"#131d30":"#f8fafc",
  inpB: dk?"#1c2d47":"#cbd5e1",
});

// ─── ATOMS ───────────────────────────────────────────────────
function Av({ p = {}, size = 36 }) {
  const name = p.name || "?";
  const ini  = name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const hue  = p.hue || strClr(name);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:p.avatar?"transparent":`linear-gradient(135deg,${hue},${hue}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*.35, color:"#fff", flexShrink:0, overflow:"hidden" }}>
      {p.avatar ? <img src={p.avatar} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : ini}
    </div>
  );
}

function StackedAv({ uids=[], profiles={}, size=24, max=5 }) {
  const vis = uids.slice(0, max); const extra = uids.length - max;
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {vis.map((uid, i) => (
        <div key={uid} style={{ marginLeft:i>0?-(size*.3):0, zIndex:max-i, borderRadius:"50%", border:"2px solid transparent" }}>
          <Av p={profiles[uid]||{name:"?"}} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{ marginLeft:-(size*.3), width:size, height:size, borderRadius:"50%", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.28, fontWeight:800, color:"#fff" }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

function Spin({ dk = false, size = 28 }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:32 }}>
      <div style={{ width:size, height:size, border:`3px solid ${dk?"#1c2d47":"#e2e8f0"}`, borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
    </div>
  );
}

function Badge({ label, color="#3b82f6", size="sm" }) {
  const fs = size === "sm" ? 10 : 12;
  return (
    <span style={{ background:color+"18", color, fontSize:fs, fontWeight:700, padding:"2px 8px", borderRadius:99, border:`1px solid ${color}28`, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, color="#3b82f6", variant="solid", size="md", disabled=false, full=false, style:ext={} }) {
  const pad = size==="sm" ? "5px 12px" : "9px 18px";
  const fs  = size==="sm" ? 12 : 13;
  const bg  = variant==="solid" ? (disabled?"#374151":color) : "transparent";
  const bdr = variant==="outline" ? `1.5px solid ${color}` : "none";
  const clr = variant==="solid" ? "#fff" : color;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:5, padding:pad, background:bg, border:bdr, borderRadius:10, color:clr, fontSize:fs, fontWeight:700, cursor:disabled?"default":"pointer", opacity:disabled?.5:1, fontFamily:"inherit", transition:"all .15s", width:full?"100%":"auto", justifyContent:"center", ...ext }}>
      {children}
    </button>
  );
}

function Inp({ value, onChange, placeholder, type="text", style:ext={}, rows, onKeyDown }) {
  const s = { background:"#131d30", border:"1px solid #1c2d47", borderRadius:10, padding:"9px 12px", fontSize:13, outline:"none", color:"#e8eeff", fontFamily:"inherit", width:"100%", boxSizing:"border-box", ...ext };
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} onKeyDown={onKeyDown} style={{ ...s, resize:"vertical" }} />;
  return <input value={value} onChange={onChange} placeholder={placeholder} type={type} onKeyDown={onKeyDown} style={s} />;
}

function Card({ children, dk, style:ext={} }) {
  const th = T(dk);
  return (
    <div style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, padding:16, marginBottom:10, ...ext }}>
      {children}
    </div>
  );
}

function Modal({ children, onClose, title, width=480, dk=true }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#0e1525", border:"1px solid #1c2d47", borderRadius:20, padding:24, width:"100%", maxWidth:width, animation:"fadeUp .25s ease", margin:"auto" }}>
        {title && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:"#e8eeff" }}>{title}</h3>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#3d5278", display:"flex" }}><X size={18}/></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:"#7a93c0", marginBottom:5, letterSpacing:.5 }}>{children}</div>;
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#7a93c0", letterSpacing:.5 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────
function NotifBell({ me, dk, startupId }) {
  const th = T(dk);
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const load = useCallback(async () => {
    const q = startupId
      ? `user_id=eq.${me}&startup_id=eq.${startupId}&order=created_at.desc&limit=20`
      : `user_id=eq.${me}&order=created_at.desc&limit=20`;
    const data = await api.get("rs_startup_notifications", q);
    setNotifs(data || []);
  }, [me, startupId]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useRealtime("rs_startup_notifications", null, evt => {
    if (evt.record?.user_id === me) load();
  });

  const unread = notifs.filter(n => !n.is_read).length;

  const markRead = async id => {
    await api.patch("rs_startup_notifications", `id=eq.${id}`, { is_read: true });
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await api.patch("rs_startup_notifications", `user_id=eq.${me}&is_read=eq.false`, { is_read: true });
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const icons = { request_approved:"🎉", request_received:"👤", new_message:"💬", task_assigned:"✅", meeting_scheduled:"📅" };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(x => !x)} style={{ position:"relative", background:"transparent", border:`1px solid ${th.bdr}`, borderRadius:8, padding:"7px 8px", cursor:"pointer", color:th.tx2, display:"flex" }}>
        <Bell size={16}/>
        {unread > 0 && (
          <div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff" }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, width:300, background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, boxShadow:"0 20px 60px rgba(0,0,0,.4)", zIndex:200, maxHeight:380, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:`1px solid ${th.bdr}` }}>
            <span style={{ fontWeight:700, fontSize:14, color:th.txt }}>Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ background:"none", border:"none", cursor:"pointer", color:"#3b82f6", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>Mark all read</button>}
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            {notifs.length === 0 ? <p style={{ textAlign:"center", color:th.tx3, padding:20, fontSize:13 }}>No notifications</p>
            : notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)} style={{ display:"flex", gap:10, padding:"10px 14px", borderBottom:`1px solid ${th.bdr}`, background:n.is_read?"transparent":dk?"rgba(59,130,246,.06)":"#eff6ff", cursor:"pointer" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:th.sf2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{icons[n.type]||"🔔"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:th.txt }}>{n.title}</div>
                  <div style={{ fontSize:11, color:th.tx2 }}>{n.body}</div>
                  <div style={{ fontSize:10, color:th.tx3, marginTop:2 }}>{ago(n.created_at)}</div>
                </div>
                {!n.is_read && <div style={{ width:7, height:7, borderRadius:"50%", background:"#3b82f6", marginTop:4, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MEDIA RECORDER HOOK ──────────────────────────────────────
function useVoiceRecorder(onDone) {
  const [recording, setRecording] = useState(false);
  const [dur, setDur] = useState(0);
  const recRef = useRef(); const timerRef = useRef();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type:"audio/webm" });
        const reader = new FileReader();
        reader.onload = () => onDone({ type:"audio", url:reader.result, name:"voice.webm" });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); recRef.current = mr;
      setRecording(true); setDur(0);
      timerRef.current = setInterval(() => setDur(d => d + 1), 1000);
    } catch {}
  };

  const stop = () => { recRef.current?.stop(); setRecording(false); clearInterval(timerRef.current); };
  return { recording, dur, start, stop };
}

// ─── FILE UPLOAD HELPER ───────────────────────────────────────
async function pickFiles(accept, multiple = true) {
  return new Promise(res => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept; inp.multiple = multiple;
    inp.onchange = () => res([...inp.files]);
    inp.click();
  });
}

async function filesToMedia(files, maxMB = 8) {
  const result = [];
  for (const f of files) {
    try {
      const url = await toB64(f, maxMB);
      const type = f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image";
      result.push({ type, url, name: f.name });
    } catch {}
  }
  return result;
}

// ─── CREATE STARTUP MODAL ─────────────────────────────────────
function CreateStartupModal({ me, myProfile, existing, onClose, onSave }) {
  const [form, setForm] = useState({
    name: existing?.name||"", logo: existing?.logo||"", description: existing?.description||"",
    website: existing?.website||"", github_link: existing?.github_link||"",
    twitter: existing?.social_links?.twitter||"", linkedin: existing?.social_links?.linkedin||"",
  });
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(existing?.logo||null);
  const setF = (k,v) => setForm(p => ({ ...p, [k]:v }));
  const canSave = form.name.trim() && form.description.trim();

  const handleLogo = async () => {
    const files = await pickFiles("image/*", false);
    if (!files[0]) return;
    try { const b64 = await toB64(files[0], 2); setLogoPreview(b64); setF("logo", b64); } catch {}
  };

  const save = async () => {
    if (!canSave) return; setSaving(true);
    const payload = {
      name: form.name.trim(), logo: form.logo, description: form.description.trim(),
      website: form.website.trim(), github_link: form.github_link.trim(),
      social_links: { twitter: form.twitter, linkedin: form.linkedin },
      referral_code: existing?.referral_code || genCode(form.name),
    };
    let result;
    if (existing?.id) {
      await api.patch("rs_startups", `id=eq.${existing.id}`, payload);
      result = { startup: { ...existing, ...payload }, pages: [] };
    } else {
      result = await Actions.createStartup(payload, me);
    }
    setSaving(false);
    if (result) onSave(result);
    onClose();
  };

  return (
    <Modal title={existing ? "Edit Startup" : "Create Your Startup"} onClose={onClose} width={500}>
      {/* Logo */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
        <div onClick={handleLogo} style={{ width:80, height:80, borderRadius:20, background:"#1c2d47", border:"2px dashed #3b82f640", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden" }}>
          {logoPreview
            ? <img src={logoPreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo"/>
            : <div style={{ textAlign:"center" }}><Upload size={20} color="#3b82f6"/><div style={{ fontSize:10, color:"#7a93c0", marginTop:4 }}>Upload Logo</div></div>}
        </div>
      </div>

      <div style={{ display:"grid", gap:12 }}>
        {[
          { k:"name",        l:"STARTUP NAME *",       p:"e.g. SkillSwap" },
          { k:"website",     l:"WEBSITE",              p:"https://…" },
          { k:"github_link", l:"GITHUB",               p:"https://github.com/…" },
          { k:"twitter",     l:"TWITTER / X",          p:"https://twitter.com/…" },
          { k:"linkedin",    l:"LINKEDIN",             p:"https://linkedin.com/company/…" },
        ].map(f => (
          <div key={f.k}><Label>{f.l}</Label><Inp value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p}/></div>
        ))}
        <div>
          <Label>DESCRIPTION — PROBLEM & SOLUTION *</Label>
          <Inp value={form.description} onChange={e => setF("description", e.target.value)} placeholder="What problem are you solving and how?" rows={4}/>
        </div>
      </div>

      {!existing && (
        <div style={{ background:"#3b82f618", border:"1px solid #3b82f630", borderRadius:10, padding:"10px 14px", marginTop:14 }}>
          <div style={{ fontSize:12, color:"#3b82f6", fontWeight:600, marginBottom:6 }}>✨ Auto-created pages:</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {["💰 Investor","👾 Tech","📣 Marketing","🌐 Community"].map(p => <Badge key={p} label={p} color="#3b82f6"/>)}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <Btn onClick={onClose} variant="outline" color="#7a93c0" full>Cancel</Btn>
        <Btn onClick={save} disabled={!canSave||saving} full>
          {saving ? "Saving…" : existing ? "Save Changes" : "Create Startup 🚀"}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── JOIN MODAL ───────────────────────────────────────────────
function JoinModal({ startup, pages, me, myProfile, existingAccess, onClose, onDone }) {
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toggle = id => setRoles(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);

  const submit = async () => {
    if (!roles.length) return; setSubmitting(true);
    const pageTypeIds = [...new Set(roles.flatMap(rid => JOIN_ROLES.find(r => r.id === rid)?.pages || []))];
    const mappedPageIds = pages.filter(pg => pageTypeIds.includes(pg.page_type) && !existingAccess.includes(pg.id)).map(p => p.id);
    const pageStatuses = {}; mappedPageIds.forEach(pid => { pageStatuses[pid] = "pending"; });

    const saved = await api.post("rs_page_access_requests", {
      startup_id: startup.id, user_id: me, selected_roles: roles,
      requested_pages: mappedPageIds, page_statuses: pageStatuses,
      message, status: "pending",
    });

    if (saved) {
      // Notify founders
      const founders = startup.founders || [startup.created_by];
      for (const fid of founders) {
        await Actions.notify(fid, startup.id, "request_received",
          "New Join Request 👤", `${myProfile?.name || "Someone"} wants to join ${startup.name}`,
          { request_id: saved.id, user_id: me }
        );
      }
      onDone(saved);
    }
    setSubmitting(false); onClose();
  };

  return (
    <Modal title={`Join ${startup.name}`} onClose={onClose}>
      <p style={{ fontSize:13, color:"#7a93c0", margin:"0 0 18px" }}>Tell us about yourself — we'll match you to the right spaces.</p>
      <Label>I AM A… (SELECT ALL THAT APPLY)</Label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
        {JOIN_ROLES.map(r => {
          const sel = roles.includes(r.id);
          return (
            <button key={r.id} onClick={() => toggle(r.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel?"#3b82f6":"#1c2d47"}`, background:sel?"#3b82f618":"transparent", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
              <span style={{ fontSize:22 }}>{r.e}</span>
              <span style={{ fontSize:13, fontWeight:700, color:sel?"#3b82f6":"#e8eeff", flex:1 }}>{r.label}</span>
              {sel && <Check size={14} color="#3b82f6"/>}
            </button>
          );
        })}
      </div>
      <div style={{ marginBottom:18 }}>
        <Label>WHY DO YOU WANT TO JOIN? (OPTIONAL)</Label>
        <Inp value={message} onChange={e => setMessage(e.target.value)} placeholder="Share your background & what you can contribute…" rows={3}/>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn onClick={onClose} variant="outline" color="#7a93c0" full>Cancel</Btn>
        <Btn onClick={submit} disabled={submitting||!roles.length} full>
          {submitting ? "Sending…" : "Request to Join →"}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── REFERRAL CODE MODAL ──────────────────────────────────────
function ReferralModal({ me, myProfile, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [startup, setStartup] = useState(null);
  const [pages, setPages] = useState([]);
  const [myAccess, setMyAccess] = useState([]);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const check = async () => {
    if (!code.trim()) return;
    setChecking(true); setErr(""); setStartup(null);
    const rows = await api.get("rs_startups", `referral_code=eq.${code.trim().toUpperCase()}`);
    if (!rows?.length) { setErr("Invalid code. Please check and try again."); setChecking(false); return; }
    const s = rows[0];
    const [pg, acc] = await Promise.all([
      api.get("rs_startup_pages", `startup_id=eq.${s.id}&order=position.asc`),
      api.get("rs_page_access", `startup_id=eq.${s.id}&user_id=eq.${me}&status=eq.approved`),
    ]);
    setStartup(s); setPages(pg||[]); setMyAccess((acc||[]).map(a => a.page_id));
    setChecking(false);
  };

  if (showJoin && startup) return (
    <JoinModal startup={startup} pages={pages} me={me} myProfile={myProfile}
      existingAccess={myAccess} onClose={onClose}
      onDone={req => { onSuccess(startup); }}
    />
  );

  return (
    <Modal title="Join via Referral Code" onClose={onClose} width={400}>
      <p style={{ fontSize:13, color:"#7a93c0", margin:"0 0 16px" }}>Enter the code shared by a startup founder.</p>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <Inp value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); setStartup(null); }}
          onKeyDown={e => e.key==="Enter" && check()} placeholder="e.g. SKILL-A3B2"
          style={{ fontFamily:"monospace", letterSpacing:1.5, fontSize:15 }}/>
        <Btn onClick={check} disabled={checking||!code.trim()}>{checking?"…":"Check"}</Btn>
      </div>
      {err && (
        <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 12px", background:"#ef444418", border:"1px solid #ef444440", borderRadius:8, marginBottom:12 }}>
          <AlertCircle size={13} color="#ef4444"/><span style={{ fontSize:12, color:"#ef4444" }}>{err}</span>
        </div>
      )}
      {startup && (
        <div style={{ background:"#131d30", border:"1px solid #10b98130", borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {startup.logo ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:22 }}>🚀</span>}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"#e8eeff" }}>{startup.name}</div>
              <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>✓ Valid startup found · {pages.length} pages</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:"#7a93c0", margin:0, lineHeight:1.5 }}>{startup.description?.slice(0,120)}{startup.description?.length>120?"…":""}</p>
        </div>
      )}
      {startup && <Btn onClick={() => setShowJoin(true)} full>Select Role & Join →</Btn>}
    </Modal>
  );
}

// ─── BOOK MEETING MODAL ───────────────────────────────────────
function BookMeetingModal({ startup, page, me, profiles, pageMembers, onClose, onSave }) {
  const allMembers = pageMembers || [];
  const [form, setForm] = useState({
    title:"Team Meeting", platform:"google_meet", meeting_link:"",
    date:"", time:"", duration_mins:60, note:"",
    participants: allMembers.map(m => m.user_id).filter(Boolean),
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const setF = (k,v) => setForm(p => ({ ...p, [k]:v }));
  const canSave = form.title.trim() && form.date && form.time;

  const save = async () => {
    setSaving(true);
    const link = form.meeting_link.trim() || `https://${form.platform==="zoom"?"zoom.us/j/":"meet.google.com/"}${genId()}`;
    const saved = await api.post("rs_startup_meetings", {
      startup_id: startup.id, page_id: page?.id||null, created_by: me,
      title: form.title, platform: form.platform, meeting_link: link,
      scheduled_at: new Date(`${form.date}T${form.time}`).toISOString(),
      duration_mins: form.duration_mins, participants: form.participants,
      note: form.note, status:"scheduled",
    });
    if (saved) {
      await Actions.log(startup.id, page?.id||null, me, "meeting_scheduled", `Meeting scheduled: ${form.title}`);
      for (const uid of form.participants) {
        if (uid !== me) await Actions.notify(uid, startup.id, "meeting_scheduled", "Meeting Scheduled 📅",
          `${form.title} — ${fmtDT(saved.scheduled_at)}`, { meeting_id: saved.id }
        );
      }
      onSave(saved);
    }
    setSaving(false); setDone(true); setTimeout(onClose, 2000);
  };

  if (done) return (
    <Modal onClose={onClose} width={360}>
      <div style={{ textAlign:"center", padding:"20px 0" }}>
        <div style={{ fontSize:52, marginBottom:12 }}>📅</div>
        <h3 style={{ color:"#e8eeff", fontWeight:800, margin:"0 0 6px" }}>Meeting Scheduled!</h3>
        <p style={{ color:"#7a93c0", fontSize:13 }}>All participants have been notified.</p>
      </div>
    </Modal>
  );

  return (
    <Modal title="Book a Meeting" onClose={onClose} width={460}>
      <div style={{ display:"grid", gap:12 }}>
        <div><Label>MEETING TITLE</Label><Inp value={form.title} onChange={e => setF("title",e.target.value)}/></div>
        <div>
          <Label>PLATFORM</Label>
          <div style={{ display:"flex", gap:8 }}>
            {[["google_meet","🟢 Google Meet"],["zoom","🔵 Zoom"]].map(([id,label]) => (
              <button key={id} onClick={() => setF("platform",id)}
                style={{ flex:1, padding:"10px", borderRadius:10, border:`1.5px solid ${form.platform===id?"#3b82f6":"#1c2d47"}`, background:form.platform===id?"#3b82f618":"transparent", color:form.platform===id?"#3b82f6":"#7a93c0", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><Label>DATE *</Label><Inp type="date" value={form.date} onChange={e => setF("date",e.target.value)}/></div>
          <div><Label>TIME *</Label><Inp type="time" value={form.time} onChange={e => setF("time",e.target.value)}/></div>
        </div>
        <div>
          <Label>DURATION</Label>
          <select value={form.duration_mins} onChange={e => setF("duration_mins",+e.target.value)}
            style={{ width:"100%", background:"#131d30", border:"1px solid #1c2d47", borderRadius:10, padding:"9px 12px", fontSize:13, outline:"none", color:"#e8eeff", fontFamily:"inherit" }}>
            {[30,45,60,90,120].map(m => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
        <div><Label>MEETING LINK (auto-generated if blank)</Label><Inp value={form.meeting_link} onChange={e => setF("meeting_link",e.target.value)} placeholder="https://…"/></div>
        {allMembers.length > 0 && (
          <div>
            <Label>PARTICIPANTS ({form.participants.length} selected)</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:160, overflowY:"auto" }}>
              {allMembers.filter(m => m.user_id).map(m => {
                const prof = profiles[m.user_id]||{name:"Member"};
                const sel = form.participants.includes(m.user_id);
                return (
                  <div key={m.user_id} onClick={() => setF("participants", sel ? form.participants.filter(x=>x!==m.user_id) : [...form.participants,m.user_id])}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, border:`1px solid ${sel?"#3b82f640":"#1c2d47"}`, background:sel?"#3b82f610":"transparent", cursor:"pointer" }}>
                    <Av p={prof} size={28}/>
                    <span style={{ fontSize:13, color:"#e8eeff", flex:1 }}>{prof.name}</span>
                    {sel && <Check size={13} color="#3b82f6"/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div><Label>AGENDA / NOTE</Label><Inp value={form.note} onChange={e => setF("note",e.target.value)} placeholder="What's the agenda?" rows={2}/></div>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <Btn onClick={onClose} variant="outline" color="#7a93c0" full>Cancel</Btn>
        <Btn onClick={save} disabled={saving||!canSave} full>{saving?"Scheduling…":"Schedule Meeting"}</Btn>
      </div>
    </Modal>
  );
}

// ─── PAGE CHAT (REALTIME) ─────────────────────────────────────
function PageChat({ startup, page, me, profiles, members, dk }) {
  const th = T(dk);
  const pt = PAGE_TYPES.find(x => x.id===page.page_type)||PAGE_TYPES[6];
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef();
  const { recording, dur, start: startRec, stop: stopRec } = useVoiceRecorder(m => setMedia(ms => [...ms, m]));

  const load = useCallback(async () => {
    const data = await api.get("rs_page_messages", `page_id=eq.${page.id}&order=created_at.asc&limit=100`);
    setMessages(data||[]); setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  }, [page.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime chat
  useRealtime("rs_page_messages", null, evt => {
    if (evt.record?.page_id === page.id) {
      if (evt.type === "INSERT") setMessages(ms => [...ms, evt.record]);
      if (evt.type === "DELETE") setMessages(ms => ms.filter(m => m.id !== evt.old_record?.id));
      if (evt.type === "UPDATE") setMessages(ms => ms.map(m => m.id===evt.record.id ? evt.record : m));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
    }
  });

  const addFiles = async () => {
    const files = await pickFiles("image/*,video/*,audio/*");
    const items = await filesToMedia(files);
    setMedia(m => [...m, ...items].slice(0,4));
  };

  const send = async () => {
    if (!text.trim() && !media.length) return;
    const optimistic = { id:`tmp-${genId()}`, page_id:page.id, startup_id:startup.id, sender_id:me, content:text.trim(), media, reply_to:replyTo?.id||null, created_at:new Date().toISOString() };
    setMessages(ms => [...ms, optimistic]);
    setText(""); setMedia([]); setReplyTo(null); setShowEmoji(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 50);

    const saved = await api.post("rs_page_messages", {
      page_id:page.id, startup_id:startup.id, sender_id:me,
      content:optimistic.content, media:optimistic.media,
      reply_to:optimistic.reply_to, mentions:[],
    });
    if (saved) {
      setMessages(ms => ms.map(m => m.id===optimistic.id ? saved : m));
      await Actions.log(startup.id, page.id, me, "message", `Message in ${page.name}`);
    }
  };

  const deleteMsg = async id => {
    setMessages(ms => ms.filter(m => m.id !== id));
    await api.del("rs_page_messages", `id=eq.${id}`);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"62vh", minHeight:380 }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
        {loading ? <Spin dk={dk}/> : messages.length===0 ? (
          <div style={{ textAlign:"center", padding:40, color:th.tx3 }}>
            <MessageCircle size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No messages yet. Say hi! 👋</p>
          </div>
        ) : messages.map((m, idx) => {
          const isMe = m.sender_id === me;
          const sender = profiles[m.sender_id]||{name:"Member"};
          const prevMsg = messages[idx-1];
          const showName = !prevMsg || prevMsg.sender_id !== m.sender_id;
          const replyMsg = m.reply_to ? messages.find(x => x.id===m.reply_to) : null;
          return (
            <div key={m.id} style={{ display:"flex", flexDirection:isMe?"row-reverse":"row", gap:8, marginBottom:showName?10:4, alignItems:"flex-end", padding:"0 4px" }}>
              {!isMe && (showName ? <Av p={sender} size={28}/> : <div style={{ width:28 }}/>)}
              <div style={{ maxWidth:"72%" }}>
                {showName && !isMe && <div style={{ fontSize:11, fontWeight:700, color:pt.c, marginBottom:3 }}>{sender.name}</div>}
                {replyMsg && (
                  <div style={{ background:"rgba(255,255,255,.06)", borderLeft:`3px solid ${pt.c}`, padding:"4px 8px", borderRadius:6, marginBottom:4, fontSize:11, color:th.tx3 }}>
                    ↩ {profiles[replyMsg.sender_id]?.name}: {replyMsg.content?.slice(0,60)}
                  </div>
                )}
                <div style={{ background:isMe?pt.c:th.sf2, borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"9px 13px", border:`1px solid ${isMe?"transparent":th.bdr}`, position:"relative", cursor:"pointer" }}
                  onClick={() => setReplyTo(m)}>
                  {m.content && <p style={{ margin:0, fontSize:13, color:isMe?"#fff":th.txt, lineHeight:1.5, whiteSpace:"pre-wrap" }}>{m.content}</p>}
                  {(m.media||[]).map((med, i) => (
                    <div key={i} style={{ marginTop:m.content?6:0 }}>
                      {med.type==="image" && <img src={med.url} style={{ maxWidth:200, borderRadius:8, display:"block" }} alt=""/>}
                      {med.type==="video" && <video src={med.url} controls style={{ maxWidth:200, borderRadius:8 }}/>}
                      {med.type==="audio" && <audio src={med.url} controls style={{ maxWidth:180 }}/>}
                    </div>
                  ))}
                  <div style={{ fontSize:10, color:isMe?"rgba(255,255,255,.5)":th.tx3, marginTop:4, textAlign:isMe?"right":"left" }}>
                    {ago(m.created_at)}
                    {m.is_edited && <span style={{ marginLeft:4 }}>· edited</span>}
                  </div>
                </div>
                {isMe && (
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:2 }}>
                    <button onClick={() => deleteMsg(m.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex", padding:0 }}><Trash2 size={10}/></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div style={{ background:th.sf2, borderLeft:`3px solid ${pt.c}`, padding:"6px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:th.tx3 }}>
          <span>↩ Replying to {profiles[replyTo.sender_id]?.name}: {replyTo.content?.slice(0,50)}</span>
          <button onClick={() => setReplyTo(null)} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex" }}><X size={13}/></button>
        </div>
      )}

      {/* Media preview */}
      {media.length > 0 && (
        <div style={{ display:"flex", gap:6, padding:"8px 0", flexWrap:"wrap" }}>
          {media.map((m,i) => (
            <div key={i} style={{ position:"relative", width:52, height:52, borderRadius:8, overflow:"hidden", border:`1px solid ${th.bdr}` }}>
              {m.type==="image" && <img src={m.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>}
              {m.type==="audio" && <div style={{ width:"100%", height:"100%", background:"#8b5cf618", display:"flex", alignItems:"center", justifyContent:"center" }}><Mic size={16} color="#8b5cf6"/></div>}
              {m.type==="video" && <div style={{ width:"100%", height:"100%", background:"#3b82f618", display:"flex", alignItems:"center", justifyContent:"center" }}><Video size={16} color="#3b82f6"/></div>}
              <button onClick={() => setMedia(m => m.filter((_,j)=>j!==i))} style={{ position:"absolute", top:1, right:1, background:"rgba(0,0,0,.6)", border:"none", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}><X size={8}/></button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji */}
      {showEmoji && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, background:th.sf2, borderRadius:10, padding:8, border:`1px solid ${th.bdr}` }}>
          {EMOJIS.map(e => <button key={e} onClick={() => { setText(t=>t+e); setShowEmoji(false); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18 }}>{e}</button>)}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display:"flex", gap:8, alignItems:"flex-end", borderTop:`1px solid ${th.bdr}`, paddingTop:10, marginTop:4 }}>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={addFiles} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex", padding:4 }}><Image size={16}/></button>
          <button onClick={() => setShowEmoji(x=>!x)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, padding:4 }}>😊</button>
          <button onClick={recording?stopRec:startRec} style={{ background:"none", border:"none", cursor:"pointer", color:recording?"#ef4444":th.tx3, display:"flex", alignItems:"center", gap:3, padding:4 }}>
            {recording ? <><MicOff size={16}/><span style={{ fontSize:11, color:"#ef4444" }}>{dur}s</span></> : <Mic size={16}/>}
          </button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
          placeholder={`Message ${page.name}… (Enter to send, Shift+Enter for newline)`} rows={1}
          style={{ flex:1, background:th.inp, border:`1px solid ${th.inpB}`, borderRadius:12, padding:"9px 12px", fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", color:th.txt, maxHeight:80 }}/>
        <button onClick={send} disabled={!text.trim()&&!media.length}
          style={{ background:(text.trim()||media.length)?pt.c:th.sf2, border:"none", borderRadius:10, padding:"9px 14px", cursor:(text.trim()||media.length)?"pointer":"default", color:"#fff", display:"flex", alignItems:"center" }}>
          <Send size={15}/>
        </button>
      </div>
    </div>
  );
}

// ─── TASK BOARD ───────────────────────────────────────────────
function TaskBoard({ startup, page, me, profiles, members, dk }) {
  const th = T(dk);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title:"", description:"", assigned_to:"", priority:"medium", due_date:"" });
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const load = useCallback(async () => {
    const data = await api.get("rs_startup_tasks", `page_id=eq.${page.id}&order=created_at.desc`);
    setTasks(data||[]); setLoading(false);
  }, [page.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime tasks
  useRealtime("rs_startup_tasks", null, evt => {
    if (evt.record?.page_id === page.id) {
      if (evt.type==="INSERT") setTasks(ts => [evt.record,...ts]);
      if (evt.type==="UPDATE") setTasks(ts => ts.map(t => t.id===evt.record.id?evt.record:t));
      if (evt.type==="DELETE") setTasks(ts => ts.filter(t => t.id!==evt.old_record?.id));
    }
  });

  const create = async () => {
    if (!form.title.trim()) return;
    const saved = await api.post("rs_startup_tasks", { ...form, startup_id:startup.id, page_id:page.id, created_by:me, status:"pending" });
    if (saved) {
      setTasks(ts => [saved,...ts]);
      setForm({ title:"", description:"", assigned_to:"", priority:"medium", due_date:"" });
      setShowForm(false);
      if (form.assigned_to) {
        await Actions.notify(form.assigned_to, startup.id, "task_assigned", "Task Assigned ✅", `New task: ${form.title}`, { task_id:saved.id });
      }
      await Actions.log(startup.id, page.id, me, "task_created", `Task created: ${form.title}`);
    }
  };

  const cycleStatus = async t => {
    const next = t.status==="pending"?"inprogress":t.status==="inprogress"?"completed":"pending";
    setTasks(ts => ts.map(x => x.id===t.id?{...x,status:next}:x));
    await api.patch("rs_startup_tasks", `id=eq.${t.id}`, { status:next });
    if (next==="completed") await Actions.log(startup.id, page.id, me, "task_completed", `Task completed: ${t.title}`);
  };

  const del = async id => { setTasks(ts=>ts.filter(t=>t.id!==id)); await api.del("rs_startup_tasks",`id=eq.${id}`); };

  const filtered = filter==="all" ? tasks : tasks.filter(t=>t.status===filter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {["all","pending","inprogress","completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"5px 11px", borderRadius:20, border:`1px solid ${filter===f?"#3b82f6":th.bdr}`, background:filter===f?"#3b82f618":"transparent", color:filter===f?"#3b82f6":th.tx2, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
              {f==="all"?`All (${tasks.length})`:f}
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowForm(x=>!x)} size="sm"><Plus size={13}/> New Task</Btn>
      </div>

      {showForm && (
        <Card dk={dk} style={{ marginBottom:12 }}>
          <div style={{ display:"grid", gap:10 }}>
            <div><Label>TASK TITLE *</Label><Inp value={form.title} onChange={e=>setF("title",e.target.value)} placeholder="e.g. Set up CI/CD pipeline"/></div>
            <div><Label>DESCRIPTION</Label><Inp value={form.description} onChange={e=>setF("description",e.target.value)} placeholder="Details…" rows={2}/></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div>
                <Label>ASSIGN TO</Label>
                <select value={form.assigned_to} onChange={e=>setF("assigned_to",e.target.value)}
                  style={{ width:"100%", background:"#131d30", border:"1px solid #1c2d47", borderRadius:10, padding:"9px 10px", fontSize:12, outline:"none", color:"#e8eeff", fontFamily:"inherit" }}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{profiles[m.user_id]?.name||m.user_id}</option>)}
                </select>
              </div>
              <div>
                <Label>PRIORITY</Label>
                <select value={form.priority} onChange={e=>setF("priority",e.target.value)}
                  style={{ width:"100%", background:"#131d30", border:"1px solid #1c2d47", borderRadius:10, padding:"9px 10px", fontSize:12, outline:"none", color:"#e8eeff", fontFamily:"inherit" }}>
                  {["low","medium","high"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div><Label>DUE DATE</Label><Inp type="date" value={form.due_date} onChange={e=>setF("due_date",e.target.value)}/></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={create} disabled={!form.title.trim()} size="sm">Create Task</Btn>
              <Btn onClick={() => setShowForm(false)} variant="outline" color="#7a93c0" size="sm">Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {loading ? <Spin dk={dk}/> : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:40, color:th.tx3 }}><CheckCircle2 size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No tasks yet.</p></div>
      ) : filtered.map(task => {
        const st = TASK_STATUS[task.status]||TASK_STATUS.pending;
        const { Icon } = st;
        const assignee = task.assigned_to ? (profiles[task.assigned_to]||null) : null;
        return (
          <div key={task.id} style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:12, padding:"12px 14px", marginBottom:8, display:"flex", gap:12, alignItems:"flex-start" }}>
            <button onClick={() => cycleStatus(task)} style={{ background:"none", border:"none", cursor:"pointer", color:st.c, flexShrink:0, marginTop:2, display:"flex" }}><Icon size={18}/></button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, color:task.status==="completed"?th.tx3:th.txt, textDecoration:task.status==="completed"?"line-through":"none" }}>{task.title}</div>
              {task.description && <p style={{ fontSize:12, color:th.tx3, margin:"3px 0 6px", lineHeight:1.4 }}>{task.description}</p>}
              <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                <span style={{ fontSize:10, fontWeight:700, color:PRIORITY_COLORS[task.priority]||"#f59e0b", background:(PRIORITY_COLORS[task.priority]||"#f59e0b")+"15", padding:"2px 7px", borderRadius:99 }}>{task.priority?.toUpperCase()}</span>
                <Badge label={st.label} color={st.c}/>
                {assignee && <div style={{ display:"flex", alignItems:"center", gap:4 }}><Av p={assignee} size={16}/><span style={{ fontSize:11, color:th.tx3 }}>{assignee.name?.split(" ")[0]}</span></div>}
                {task.due_date && <span style={{ fontSize:11, color:th.tx3 }}>📅 Due {fmtDate(task.due_date)}</span>}
              </div>
            </div>
            {(task.created_by===me) && <button onClick={() => del(task.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex", flexShrink:0 }}><Trash2 size={13}/></button>}
          </div>
        );
      })}
    </div>
  );
}

// ─── FILE MANAGER ─────────────────────────────────────────────
function FileManager({ startup, page, me, profiles, dk }) {
  const th = T(dk);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get("rs_page_files", `page_id=eq.${page.id}&order=created_at.desc`).then(d => { setFiles(d||[]); setLoading(false); });
  }, [page.id]);

  const upload = async () => {
    const selected = await pickFiles("image/*,video/*,application/pdf,.doc,.docx,.txt,.zip");
    if (!selected.length) return;
    setUploading(true);
    for (const f of selected) {
      try {
        const url = await toB64(f, 10);
        const type = f.type.startsWith("image")?"image":f.type.startsWith("video")?"video":f.type==="application/pdf"?"pdf":"other";
        const saved = await api.post("rs_page_files", { startup_id:startup.id, page_id:page.id, uploaded_by:me, name:f.name, file_type:type, url, size_bytes:f.size });
        if (saved) {
          setFiles(fs => [saved,...fs]);
          await Actions.log(startup.id, page.id, me, "file_uploaded", `Uploaded: ${f.name}`);
        }
      } catch {}
    }
    setUploading(false);
  };

  const del = async id => { setFiles(fs=>fs.filter(f=>f.id!==id)); await api.del("rs_page_files",`id=eq.${id}`); };

  const fileIcons = { image:"🖼️", video:"🎬", pdf:"📄", other:"📎" };
  const fmtSz = b => b>1024*1024?`${(b/1024/1024).toFixed(1)}MB`:`${(b/1024).toFixed(0)}KB`;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:13, fontWeight:700, color:th.txt }}>{files.length} file{files.length!==1?"s":""}</span>
        <Btn onClick={upload} size="sm" disabled={uploading}><Upload size={13}/>{uploading?"Uploading…":"Upload Files"}</Btn>
      </div>
      {loading ? <Spin dk={dk}/> : files.length===0 ? (
        <div onClick={upload} style={{ textAlign:"center", padding:40, color:th.tx3, border:`2px dashed ${th.bdr}`, borderRadius:14, cursor:"pointer" }}>
          <Upload size={32} style={{ marginBottom:10, opacity:.4 }}/><p>Click to upload files</p><p style={{ fontSize:12 }}>Images, videos, PDFs, docs up to 10MB</p>
        </div>
      ) : (
        <div style={{ display:"grid", gap:8 }}>
          {files.map(f => {
            const uploader = profiles[f.uploaded_by]||{name:"Member"};
            return (
              <div key={f.id} style={{ display:"flex", gap:12, alignItems:"center", background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:12, padding:"10px 14px" }}>
                <span style={{ fontSize:24, flexShrink:0 }}>{fileIcons[f.file_type]||"📎"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:th.txt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                  <div style={{ fontSize:11, color:th.tx3 }}>{fmtSz(f.size_bytes||0)} · {uploader.name} · {ago(f.created_at)}</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <a href={f.url} download={f.name} style={{ display:"flex", alignItems:"center", background:"#3b82f618", border:"1px solid #3b82f630", borderRadius:8, padding:"5px 8px", color:"#3b82f6" }}><Download size={13}/></a>
                  {f.uploaded_by===me && <button onClick={() => del(f.id)} style={{ display:"flex", alignItems:"center", background:"#ef444418", border:"1px solid #ef444430", borderRadius:8, padding:"5px 8px", color:"#ef4444", cursor:"pointer" }}><Trash2 size={13}/></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── INVESTOR PANEL ───────────────────────────────────────────
function InvestorPanel({ startup, me, dk, isFounder }) {
  const th = T(dk);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ stage:"pre-seed", funding_goal:0, raised_so_far:0, one_liner:"", traction:{ mrr:0, users:0, growth_rate:0 }, pitch_deck_url:"" });
  const [pitchDeck, setPitchDeck] = useState(null);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  const setTr = (k,v) => setForm(p=>({...p,traction:{...p.traction,[k]:v}}));

  useEffect(() => {
    api.get("rs_startup_investor_data", `startup_id=eq.${startup.id}`).then(d => {
      if (d?.[0]) { setData(d[0]); setForm({ stage:d[0].stage||"pre-seed", funding_goal:d[0].funding_goal||0, raised_so_far:d[0].raised_so_far||0, one_liner:d[0].one_liner||"", traction:d[0].traction||{mrr:0,users:0,growth_rate:0}, pitch_deck_url:d[0].pitch_deck_url||"" }); }
    });
  }, [startup.id]);

  const handlePitchUpload = async () => {
    const files = await pickFiles("application/pdf,image/*,.pptx", false);
    if (!files[0]) return;
    try { const b64 = await toB64(files[0], 20); setPitchDeck(b64); setF("pitch_deck_url", b64); } catch {}
  };

  const save = async () => {
    const saved = await api.upsert("rs_startup_investor_data", { startup_id:startup.id, ...form, pitch_deck_url: pitchDeck||form.pitch_deck_url });
    if (saved) { setData(saved); setEditing(false); }
  };

  const stages = ["pre-seed","seed","series-a","series-b","growth"];
  const fmtUSD = n => n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;
  const pct = data && data.funding_goal > 0 ? Math.min(100, Math.round((data.raised_so_far/data.funding_goal)*100)) : 0;

  if (editing && isFounder) return (
    <div style={{ display:"grid", gap:14 }}>
      <div>
        <Label>STAGE</Label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {stages.map(s => <button key={s} onClick={() => setF("stage",s)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${form.stage===s?"#10b981":th.bdr}`, background:form.stage===s?"#10b98118":"transparent", color:form.stage===s?"#10b981":th.tx3, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{s}</button>)}
        </div>
      </div>
      <div><Label>ONE LINER</Label><Inp value={form.one_liner} onChange={e=>setF("one_liner",e.target.value)} placeholder="We help X do Y by Z"/></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div><Label>FUNDING GOAL (USD)</Label><Inp type="number" value={form.funding_goal} onChange={e=>setF("funding_goal",+e.target.value)}/></div>
        <div><Label>RAISED SO FAR (USD)</Label><Inp type="number" value={form.raised_so_far} onChange={e=>setF("raised_so_far",+e.target.value)}/></div>
      </div>
      <div>
        <Label>TRACTION METRICS</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["mrr","MRR ($)"],["users","Total Users"],["growth_rate","Growth Rate (%)"]].map(([k,l])=>(
            <div key={k}><div style={{ fontSize:10, color:th.tx3, marginBottom:4 }}>{l}</div><Inp type="number" value={form.traction[k]||0} onChange={e=>setTr(k,+e.target.value)}/></div>
          ))}
        </div>
      </div>
      <div>
        <Label>PITCH DECK</Label>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={handlePitchUpload} variant="outline" color="#3b82f6" size="sm"><Upload size={12}/>Upload Deck</Btn>
          {(pitchDeck||form.pitch_deck_url) && <Badge label="✓ Deck attached" color="#10b981"/>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}><Btn onClick={save} size="sm">Save</Btn><Btn onClick={()=>setEditing(false)} variant="outline" color="#7a93c0" size="sm">Cancel</Btn></div>
    </div>
  );

  if (!data) return (
    <div style={{ textAlign:"center", padding:48, color:th.tx3 }}>
      <Star size={36} style={{ marginBottom:12, opacity:.4 }}/>
      <p>{isFounder?"Add investor information to attract funding.":"No investor data published yet."}</p>
      {isFounder && <Btn onClick={() => setEditing(true)} size="sm"><Edit3 size={12}/> Add Info</Btn>}
    </div>
  );

  return (
    <div>
      {isFounder && <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}><Btn onClick={()=>setEditing(true)} variant="outline" color="#3b82f6" size="sm"><Edit3 size={12}/>Edit</Btn></div>}
      <div style={{ display:"grid", gap:12 }}>
        <div style={{ background:"linear-gradient(135deg,#10b98118,#3b82f618)", border:"1px solid #10b98130", borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, color:"#10b981", fontWeight:700, marginBottom:4 }}>STAGE · {data.stage?.toUpperCase()}</div>
          {data.one_liner && <p style={{ fontSize:14, color:th.txt, margin:"6px 0 0", lineHeight:1.5, fontWeight:600 }}>{data.one_liner}</p>}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["Funding Goal",fmtUSD(data.funding_goal||0)],["Raised So Far",fmtUSD(data.raised_so_far||0)]].map(([l,v])=>(
            <div key={l} style={{ background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:th.tx3, fontWeight:700 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:th.txt, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
        {data.funding_goal > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:th.tx3, marginBottom:6 }}>
              <span>Funding Progress</span><span style={{ fontWeight:700, color:"#10b981" }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:th.sf2, borderRadius:99, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#3b82f6)", borderRadius:99, transition:"width .5s" }}/>
            </div>
          </div>
        )}
        {data.traction && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[["MRR",`$${data.traction.mrr||0}`],["Users",(data.traction.users||0).toLocaleString()],["Growth",`${data.traction.growth_rate||0}%`]].map(([l,v])=>(
              <div key={l} style={{ background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:12, padding:12, textAlign:"center" }}>
                <div style={{ fontSize:11, color:th.tx3, fontWeight:700 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#10b981", marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {(data.pitch_deck_url) && (
          <div style={{ background:"#3b82f618", border:"1px solid #3b82f630", borderRadius:12, padding:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}><File size={18} color="#3b82f6"/><div><div style={{ fontSize:13, fontWeight:700, color:th.txt }}>Pitch Deck</div><div style={{ fontSize:11, color:th.tx3 }}>Available for review</div></div></div>
            <a href={data.pitch_deck_url} download="pitch_deck" style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", border:"none", borderRadius:8, padding:"7px 14px", color:"#fff", fontSize:12, fontWeight:700 }}><Download size={12}/>Download</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE DETAIL ──────────────────────────────────────────────
function PageDetail({ startup, page, me, profiles, dk, onBack, isFounder }) {
  const th = T(dk);
  const pt = PAGE_TYPES.find(x => x.id===page.page_type)||PAGE_TYPES[6];
  const [tab, setTab] = useState("chat");
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [showMeeting, setShowMeeting] = useState(false);

  useEffect(() => {
    (async () => {
      const [ms, mts] = await Promise.all([
        api.get("rs_page_access", `page_id=eq.${page.id}&status=eq.approved`),
        api.get("rs_startup_meetings", `page_id=eq.${page.id}&order=scheduled_at.asc`),
      ]);
      setMembers(ms||[]); setMeetings(mts||[]);
    })();
  }, [page.id]);

  const tabs = [
    { id:"chat",    label:"Chat",          icon:MessageCircle },
    { id:"tasks",   label:"Tasks",         icon:CheckCircle2 },
    { id:"files",   label:"Files",         icon:File },
    { id:"meetings",label:"Meetings",      icon:Calendar },
    ...(page.page_type==="investor"?[{ id:"investor", label:"Investor Info", icon:TrendingUp }]:[]),
    { id:"members", label:"Members",       icon:Users },
  ];

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      {showMeeting && <BookMeetingModal startup={startup} page={page} me={me} profiles={profiles} pageMembers={members} onClose={() => setShowMeeting(false)} onSave={m => setMeetings(ms=>[m,...ms])}/>}

      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.tx2, fontSize:13, fontWeight:600, padding:"0 0 14px", fontFamily:"inherit" }}>
        <ArrowLeft size={15}/> Back to {startup.name}
      </button>

      {/* Page Header */}
      <div style={{ background:`linear-gradient(135deg,${pt.c}22,${pt.c}08)`, border:`1px solid ${pt.c}30`, borderRadius:16, padding:18, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:46, height:46, borderRadius:12, background:pt.c+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{pt.e}</div>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:th.txt }}>{page.name}</div>
              <div style={{ fontSize:12, color:th.tx2 }}>{page.description||pt.desc}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <StackedAv uids={members.map(m=>m.user_id)} profiles={profiles} size={24}/>
            <span style={{ fontSize:12, color:th.tx3 }}>{members.length} member{members.length!==1?"s":""}</span>
            <Btn onClick={() => setShowMeeting(true)} size="sm" color={pt.c}><Calendar size={12}/>Book Meeting</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:16, background:th.sf2, borderRadius:12, padding:4, border:`1px solid ${th.bdr}`, overflowX:"auto" }}>
        {tabs.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display:"flex", alignItems:"center", gap:5, flex:"0 0 auto", padding:"7px 12px", borderRadius:9, border:"none", background:tab===id?pt.c:"transparent", color:tab===id?"#fff":th.tx2, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit", transition:"all .2s" }}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {tab==="chat"     && <PageChat startup={startup} page={page} me={me} profiles={profiles} members={members} dk={dk}/>}
      {tab==="tasks"    && <TaskBoard startup={startup} page={page} me={me} profiles={profiles} members={members} dk={dk}/>}
      {tab==="files"    && <FileManager startup={startup} page={page} me={me} profiles={profiles} dk={dk}/>}
      {tab==="investor" && <InvestorPanel startup={startup} me={me} dk={dk} isFounder={isFounder}/>}

      {tab==="meetings" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <Btn onClick={() => setShowMeeting(true)} size="sm"><Plus size={13}/>Schedule</Btn>
          </div>
          {meetings.length===0
            ? <div style={{ textAlign:"center", padding:40, color:th.tx3 }}><Calendar size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No meetings scheduled.</p></div>
            : meetings.map(m => (
              <Card dk={dk} key={m.id}>
                <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{m.title}</div>
                    <div style={{ fontSize:12, color:th.tx3, marginTop:3 }}>📅 {fmtDT(m.scheduled_at)} · {m.duration_mins}min · {m.platform==="zoom"?"🔵 Zoom":"🟢 Google Meet"}</div>
                    {m.note && <p style={{ fontSize:12, color:th.tx2, margin:"5px 0 8px", lineHeight:1.4 }}>{m.note}</p>}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                      <StackedAv uids={m.participants||[]} profiles={profiles} size={20}/>
                      <span style={{ fontSize:11, color:th.tx3 }}>{(m.participants||[]).length} participants</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", borderRadius:8, padding:"7px 14px", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                      <Phone size={12}/>Join
                    </a>
                    <button onClick={() => { try { navigator.clipboard.writeText(m.meeting_link); } catch {} }}
                      style={{ display:"flex", alignItems:"center", gap:5, background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"5px 10px", color:th.tx3, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                      <Copy size={11}/>Copy Link
                    </button>
                  </div>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {tab==="members" && (
        <div>
          {members.length===0
            ? <div style={{ textAlign:"center", padding:40, color:th.tx3 }}><Users size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No members yet.</p></div>
            : members.map(m => {
              const p = profiles[m.user_id]||{name:"Member"};
              return (
                <Card dk={dk} key={m.id}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <Av p={p} size={42}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                      <div style={{ fontSize:12, color:th.tx3 }}>{p.handle?`@${p.handle}`:""}</div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      {m.is_admin && <Badge label="Page Admin" color="#f59e0b"/>}
                      <Badge label={m.role_type} color={pt.c}/>
                    </div>
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

// ─── FEEDBACK SECTION ─────────────────────────────────────────
function FeedbackSection({ startup, me, profiles, dk, isFounder }) {
  const th = T(dk);
  const [feedbacks, setFeedbacks] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { recording, dur, start:startRec, stop:stopRec } = useVoiceRecorder(m => setMedia(ms=>[...ms,m]));

  useEffect(() => {
    api.get("rs_startup_feedback", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`).then(d => { setFeedbacks(d||[]); setLoading(false); });
  }, [startup.id]);

  const submit = async () => {
    if (!text.trim()&&!media.length) return; setSubmitting(true);
    const saved = await api.post("rs_startup_feedback", { startup_id:startup.id, user_id:me, message:text.trim(), media });
    if (saved) { setFeedbacks(fb=>[saved,...fb]); setText(""); setMedia([]); setExpanded(false); }
    setSubmitting(false);
  };

  const del = async id => { setFeedbacks(fb=>fb.filter(f=>f.id!==id)); await api.del("rs_startup_feedback",`id=eq.${id}`); };

  const editFeedback = async (id, newMsg) => {
    await api.patch("rs_startup_feedback", `id=eq.${id}`, { message:newMsg });
    setFeedbacks(fb => fb.map(f => f.id===id?{...f,message:newMsg}:f));
  };

  return (
    <div style={{ borderTop:`1px solid ${th.bdr}`, paddingTop:20, marginTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15, color:th.txt, display:"flex", alignItems:"center", gap:6 }}>
          <MessageCircle size={16} color="#3b82f6"/>Feedback <span style={{ fontSize:12, color:th.tx3, fontWeight:400 }}>({feedbacks.length})</span>
        </div>
        <button onClick={() => setExpanded(x=>!x)}
          style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f618", border:"1px solid #3b82f630", borderRadius:8, padding:"5px 12px", cursor:"pointer", color:"#3b82f6", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
          {expanded ? <><X size={12}/>Close</> : <><Plus size={12}/>Add Feedback</>}
        </button>
      </div>

      {expanded && (
        <Card dk={dk} style={{ marginBottom:14 }}>
          <div style={{ display:"flex", gap:10 }}>
            <Av p={profiles[me]||{}} size={32}/>
            <div style={{ flex:1 }}>
              <Inp value={text} onChange={e=>setText(e.target.value)} placeholder="Share your thoughts…" rows={3}/>
              {media.length>0 && (
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  {media.map((m,i) => (
                    <div key={i} style={{ position:"relative", width:48, height:48, borderRadius:8, overflow:"hidden", border:`1px solid ${th.bdr}` }}>
                      {m.type==="image"&&<img src={m.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>}
                      {m.type==="audio"&&<div style={{ width:"100%", height:"100%", background:"#8b5cf618", display:"flex", alignItems:"center", justifyContent:"center" }}><Mic size={14} color="#8b5cf6"/></div>}
                      <button onClick={() => setMedia(m=>m.filter((_,j)=>j!==i))} style={{ position:"absolute", top:1, right:1, background:"rgba(0,0,0,.6)", border:"none", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}><X size={8}/></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={async () => { const files = await pickFiles("image/*",false); const items = await filesToMedia(files,3); setMedia(m=>[...m,...items]); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex" }}><Image size={15}/></button>
                  <button onClick={recording?stopRec:startRec} style={{ background:"none", border:"none", cursor:"pointer", color:recording?"#ef4444":th.tx3, display:"flex", alignItems:"center", gap:3 }}>
                    {recording?<><MicOff size={15}/><span style={{ fontSize:11, color:"#ef4444" }}>{dur}s</span></>:<Mic size={15}/>}
                  </button>
                </div>
                <Btn onClick={submit} disabled={submitting||(!text.trim()&&!media.length)} size="sm">
                  {submitting?"Posting…":"Post Feedback"}
                </Btn>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? <Spin dk={dk} size={20}/> : feedbacks.length===0
        ? <p style={{ color:th.tx3, fontSize:13, textAlign:"center", padding:"12px 0" }}>No feedback yet. Be the first!</p>
        : feedbacks.map(fb => {
          const author = profiles[fb.user_id]||{name:"Member"};
          const canDel = isFounder || fb.user_id===me;
          return (
            <FeedbackItem key={fb.id} fb={fb} author={author} canDel={canDel} canEdit={fb.user_id===me} dk={dk} th={th} onDel={() => del(fb.id)} onEdit={newMsg => editFeedback(fb.id, newMsg)}/>
          );
        })
      }
    </div>
  );
}

function FeedbackItem({ fb, author, canDel, canEdit, dk, th, onDel, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(fb.message||"");

  const save = async () => { await onEdit(editText); setEditing(false); };

  return (
    <div style={{ display:"flex", gap:10, marginBottom:12 }}>
      <Av p={author} size={32}/>
      <div style={{ flex:1, background:th.sf2, borderRadius:12, padding:"10px 12px", border:`1px solid ${th.bdr}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:12, color:th.txt }}>{author.name}</span>
            <span style={{ fontSize:11, color:th.tx3 }}>{ago(fb.created_at)}</span>
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {canEdit && !editing && <button onClick={() => setEditing(true)} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex" }}><Edit3 size={12}/></button>}
            {canDel && <button onClick={onDel} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex" }}><Trash2 size={12}/></button>}
          </div>
        </div>
        {editing ? (
          <div>
            <Inp value={editText} onChange={e=>setEditText(e.target.value)} rows={2}/>
            <div style={{ display:"flex", gap:6, marginTop:6 }}>
              <Btn onClick={save} size="sm">Save</Btn>
              <Btn onClick={() => setEditing(false)} variant="outline" color="#7a93c0" size="sm">Cancel</Btn>
            </div>
          </div>
        ) : (
          <>
            {fb.message && <p style={{ margin:0, fontSize:13, color:th.txt, lineHeight:1.5 }}>{fb.message}</p>}
            {(fb.media||[]).map((m,i) => (
              <div key={i} style={{ marginTop:8 }}>
                {m.type==="image"&&<img src={m.url} style={{ maxWidth:200, borderRadius:8 }} alt=""/>}
                {m.type==="audio"&&<audio src={m.url} controls style={{ maxWidth:200 }}/>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── FOUNDER DASHBOARD ────────────────────────────────────────
function FounderDashboard({ startup, me, myProfile, profiles, dk, onBack, onStartupUpdated }) {
  const th = T(dk);
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [pages, setPages] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [activity, setActivity] = useState([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditStartup, setShowEditStartup] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [newPage, setNewPage] = useState({ name:"", type:"general" });

  const load = useCallback(async () => {
    const [rq, pg, acc, mts, us, act] = await Promise.all([
      api.get("rs_page_access_requests", `startup_id=eq.${startup.id}&order=created_at.desc`),
      api.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=position.asc`),
      api.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
      api.get("rs_startup_meetings", `startup_id=eq.${startup.id}&order=scheduled_at.asc&limit=30`),
      api.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=30`),
      api.get("rs_startup_activity", `startup_id=eq.${startup.id}&order=created_at.desc&limit=40`),
    ]);
    setRequests(rq||[]); setPages(pg||[]); setAllMembers(acc||[]);
    setMeetings(mts||[]); setUpdates(us||[]); setActivity(act||[]);
    setLoading(false);
  }, [startup.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime notifications
  useRealtime("rs_page_access_requests", null, evt => {
    if (evt.record?.startup_id===startup.id) load();
  });

  const handleApprove = async (req, pageId) => {
    const { updatedStatuses, overallStatus } = await Actions.approvePageRequest(req, pageId, startup, profiles);
    setRequests(rs => rs.map(r => r.id===req.id ? { ...r, page_statuses:updatedStatuses, status:overallStatus } : r));
  };

  const handleReject = async (req, pageId) => {
    const { updatedStatuses, overallStatus } = await Actions.rejectPageRequest(req, pageId);
    setRequests(rs => rs.map(r => r.id===req.id ? { ...r, page_statuses:updatedStatuses, status:overallStatus } : r));
  };

  const addPage = async () => {
    if (!newPage.name.trim()) return;
    const saved = await api.post("rs_startup_pages", { startup_id:startup.id, name:newPage.name.trim(), page_type:newPage.type, position:pages.length });
    if (saved) {
      setPages(ps=>[...ps,saved]);
      await api.post("rs_page_access", { startup_id:startup.id, page_id:saved.id, user_id:me, role_type:"founder", is_admin:true, status:"approved" });
      setNewPage({ name:"", type:"general" }); setShowAddPage(false);
    }
  };

  const deletePage = async id => {
    if (!window.confirm("Delete this page? All messages, files, and tasks inside will be permanently deleted.")) return;
    setPages(ps=>ps.filter(p=>p.id!==id));
    await api.del("rs_startup_pages", `id=eq.${id}`);
  };

  const removeMember = async (pageId, userId) => {
    setAllMembers(ms=>ms.filter(m=>!(m.page_id===pageId&&m.user_id===userId)));
    await api.del("rs_page_access", `page_id=eq.${pageId}&user_id=eq.${userId}`);
  };

  const promoteAdmin = async (accessId, is_admin) => {
    setAllMembers(ms=>ms.map(m=>m.id===accessId?{...m,is_admin}:m));
    await api.patch("rs_page_access", `id=eq.${accessId}`, { is_admin });
  };

  const postUpdate = async () => {
    if (!newUpdate.trim()) return; setPosting(true);
    const saved = await api.post("rs_startup_updates", { startup_id:startup.id, content:newUpdate.trim(), created_by:me });
    if (saved) { setUpdates(us=>[saved,...us]); setNewUpdate(""); await Actions.log(startup.id, null, me, "update_posted","Update posted"); }
    setPosting(false);
  };

  const delUpdate = async id => { setUpdates(us=>us.filter(u=>u.id!==id)); await api.del("rs_startup_updates",`id=eq.${id}`); };

  const pending = requests.filter(r=>r.status==="pending");
  const uniqueMembers = [...new Map(allMembers.map(m=>[m.user_id,m])).values()];

  const TABS = [
    { id:"requests", label:`Requests${pending.length?` (${pending.length})`:""}`},
    { id:"pages",    label:"Pages" },
    { id:"members",  label:"Members" },
    { id:"meetings", label:"All Meetings" },
    { id:"updates",  label:"Updates" },
    { id:"activity", label:"Activity" },
  ];

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      {showEditStartup && (
        <CreateStartupModal me={me} myProfile={myProfile} existing={startup} onClose={() => setShowEditStartup(false)}
          onSave={({ startup:s }) => { onStartupUpdated(s); setShowEditStartup(false); }}/>
      )}
      {showMeeting && (
        <BookMeetingModal startup={startup} page={null} me={me} profiles={profiles}
          pageMembers={uniqueMembers.map(m=>({ user_id:m.user_id }))}
          onClose={() => setShowMeeting(false)} onSave={m => setMeetings(ms=>[m,...ms])}/>
      )}

      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.tx2, fontSize:13, fontWeight:600, padding:"0 0 14px", fontFamily:"inherit" }}>
        <ArrowLeft size={15}/> Back to Colab
      </button>

      {/* Startup Header */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a22,#5b21b622)", border:"1px solid #3b82f630", borderRadius:18, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {startup.logo ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:26 }}>🚀</span>}
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:20, color:th.txt }}>{startup.name}</div>
              <div style={{ fontSize:12, color:th.tx3 }}>Founder Dashboard · {pages.length} pages · {uniqueMembers.length} members</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <NotifBell me={me} dk={dk} startupId={startup.id}/>
            <div style={{ background:"#f59e0b18", border:"1px solid #f59e0b40", borderRadius:10, padding:"6px 14px" }}>
              <div style={{ fontSize:10, color:"#f59e0b", fontWeight:700 }}>REFERRAL CODE</div>
              <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#f59e0b", letterSpacing:1 }}>{startup.referral_code}</div>
            </div>
            <button onClick={() => { try { navigator.clipboard.writeText(startup.referral_code); } catch {} }}
              style={{ background:"#f59e0b18", border:"1px solid #f59e0b40", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"#f59e0b", display:"flex", alignItems:"center" }}>
              <Copy size={13}/>
            </button>
            <Btn onClick={() => setShowMeeting(true)} size="sm" variant="outline" color="#3b82f6"><Calendar size={12}/>Meeting</Btn>
            <Btn onClick={() => setShowEditStartup(true)} size="sm" variant="outline" color="#7a93c0"><Edit3 size={12}/>Edit</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:th.sf2, borderRadius:12, padding:4, border:`1px solid ${th.bdr}`, overflowX:"auto" }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:"0 0 auto", padding:"7px 14px", borderRadius:9, border:"none", background:tab===id?"#3b82f6":"transparent", color:tab===id?"#fff":th.tx2, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spin dk={dk}/> : (
        <>
          {/* REQUESTS */}
          {tab==="requests" && (
            <div>
              {requests.length===0
                ? <div style={{ textAlign:"center", padding:48, color:th.tx3 }}><Users size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No join requests yet.</p></div>
                : requests.map(req => {
                  const p = profiles[req.user_id]||{name:"Applicant"};
                  const reqPages = (req.requested_pages||[]).map(pid=>pages.find(pg=>pg.id===pid)).filter(Boolean);
                  return (
                    <Card dk={dk} key={req.id}>
                      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        <Av p={p} size={44}/>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                              <div style={{ fontSize:12, color:th.tx3, marginBottom:6 }}>{p.handle?`@${p.handle}`:""} · {ago(req.created_at)}</div>
                              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                                {(req.selected_roles||[]).map(r => { const ro=JOIN_ROLES.find(x=>x.id===r); return ro?<Badge key={r} label={`${ro.e} ${ro.label}`} color="#8b5cf6"/>:null; })}
                              </div>
                              {req.message && <p style={{ fontSize:12, color:th.tx2, margin:"0 0 10px", fontStyle:"italic", lineHeight:1.4 }}>"{req.message}"</p>}
                              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                                {reqPages.map(pg => {
                                  const pt = PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6];
                                  const ps = req.page_statuses?.[pg.id];
                                  return (
                                    <div key={pg.id} style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                      <span style={{ fontSize:14 }}>{pt.e}</span>
                                      <span style={{ fontSize:12, color:th.txt, flex:1, fontWeight:600 }}>{pg.name}</span>
                                      {ps ? (
                                        <Badge label={ps==="approved"?"✓ Approved":"✗ Rejected"} color={ps==="approved"?"#10b981":"#ef4444"}/>
                                      ) : (
                                        <div style={{ display:"flex", gap:6 }}>
                                          <button onClick={() => handleApprove(req, pg.id)}
                                            style={{ background:"#10b981", border:"none", borderRadius:7, padding:"4px 12px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>
                                            ✓ Approve
                                          </button>
                                          <button onClick={() => handleReject(req, pg.id)}
                                            style={{ background:"#ef4444", border:"none", borderRadius:7, padding:"4px 12px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>
                                            ✗ Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <Badge label={req.status?.toUpperCase()} color={req.status==="approved"?"#10b981":req.status==="rejected"?"#ef4444":req.status==="partial"?"#3b82f6":"#f59e0b"}/>
                          </div>
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
                <Btn onClick={() => setShowAddPage(x=>!x)} size="sm"><Plus size={13}/>Add Page</Btn>
              </div>
              {showAddPage && (
                <Card dk={dk} style={{ marginBottom:14 }}>
                  <div style={{ display:"grid", gap:10 }}>
                    <div><Label>PAGE NAME</Label><Inp value={newPage.name} onChange={e=>setNewPage(p=>({...p,name:e.target.value}))} placeholder="e.g. Sales, Design, Legal"/></div>
                    <div>
                      <Label>PAGE TYPE</Label>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {PAGE_TYPES.map(pt => (
                          <button key={pt.id} onClick={() => setNewPage(p=>({...p,type:pt.id}))}
                            style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:20, border:`1px solid ${newPage.type===pt.id?pt.c:th.bdr}`, background:newPage.type===pt.id?pt.c+"18":"transparent", color:newPage.type===pt.id?pt.c:th.tx3, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                            {pt.e} {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={addPage} disabled={!newPage.name.trim()} size="sm">Create Page</Btn>
                      <Btn onClick={() => setShowAddPage(false)} variant="outline" color="#7a93c0" size="sm">Cancel</Btn>
                    </div>
                  </div>
                </Card>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {pages.map(pg => {
                  const pt = PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6];
                  const count = allMembers.filter(m=>m.page_id===pg.id).length;
                  return (
                    <Card dk={dk} key={pg.id}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:pt.c+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{pt.e}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:th.txt }}>{pg.name}</div>
                          <div style={{ fontSize:11, color:th.tx3 }}>{count} member{count!==1?"s":""}</div>
                        </div>
                      </div>
                      <button onClick={() => deletePage(pg.id)}
                        style={{ display:"flex", alignItems:"center", gap:5, background:"#ef444418", border:"1px solid #ef444430", borderRadius:8, padding:"4px 10px", cursor:"pointer", color:"#ef4444", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>
                        <Trash2 size={11}/>Delete
                      </button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {tab==="members" && (
            <div>
              <div style={{ fontSize:13, color:th.tx3, marginBottom:12 }}>{uniqueMembers.length} total member{uniqueMembers.length!==1?"s":""} across all pages</div>
              {uniqueMembers.map(m => {
                const p = profiles[m.user_id]||{name:"Member"};
                const memberPages = allMembers.filter(acc=>acc.user_id===m.user_id);
                return (
                  <Card dk={dk} key={m.user_id}>
                    <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                      <Av p={p} size={44}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{p.name}</div>
                        <div style={{ fontSize:12, color:th.tx3 }}>{p.handle?`@${p.handle}`:""}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                      {memberPages.map(mp => {
                        const pg = pages.find(x=>x.id===mp.page_id); if (!pg) return null;
                        const pt = PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6];
                        return (
                          <div key={mp.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ background:pt.c+"15", color:pt.c, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99, display:"flex", alignItems:"center", gap:3 }}>
                              {pt.e} {pg.name}
                              {mp.is_admin && <span style={{ background:"#f59e0b30", color:"#f59e0b", fontSize:9, padding:"1px 4px", borderRadius:4 }}>Admin</span>}
                            </span>
                            <button onClick={() => promoteAdmin(mp.id, !mp.is_admin)} title={mp.is_admin?"Remove admin":"Make admin"}
                              style={{ background:"none", border:"none", cursor:"pointer", color:mp.is_admin?"#f59e0b":th.tx3, display:"flex", padding:0 }}>
                              <Star size={11}/>
                            </button>
                            <button onClick={() => removeMember(mp.page_id, m.user_id)}
                              style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex", padding:0 }}>
                              <X size={10}/>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* GLOBAL MEETINGS */}
          {tab==="meetings" && (
            <div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                <Btn onClick={() => setShowMeeting(true)} size="sm"><Plus size={13}/>Schedule Meeting</Btn>
              </div>
              {meetings.length===0
                ? <div style={{ textAlign:"center", padding:48, color:th.tx3 }}><Calendar size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No meetings yet.</p></div>
                : meetings.map(m => {
                  const pg = pages.find(x=>x.id===m.page_id);
                  const pt = pg?(PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6]):null;
                  return (
                    <Card dk={dk} key={m.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                            <div style={{ fontWeight:700, fontSize:14, color:th.txt }}>{m.title}</div>
                            {pt && <Badge label={`${pt.e} ${pg.name}`} color={pt.c}/>}
                            <Badge label={m.status} color={m.status==="completed"?"#10b981":m.status==="cancelled"?"#ef4444":"#3b82f6"}/>
                          </div>
                          <div style={{ fontSize:12, color:th.tx3 }}>📅 {fmtDT(m.scheduled_at)} · {m.duration_mins}min · {m.platform==="zoom"?"🔵 Zoom":"🟢 Meet"}</div>
                          {m.note && <p style={{ fontSize:12, color:th.tx2, margin:"5px 0 8px" }}>{m.note}</p>}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                            <StackedAv uids={m.participants||[]} profiles={profiles} size={20}/>
                            <span style={{ fontSize:11, color:th.tx3 }}>{(m.participants||[]).length} participants</span>
                          </div>
                        </div>
                        <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                          style={{ display:"flex", alignItems:"center", gap:5, background:"#3b82f6", borderRadius:8, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", height:"fit-content" }}>
                          <Phone size={12}/>Join
                        </a>
                      </div>
                    </Card>
                  );
                })
              }
            </div>
          )}

          {/* UPDATES */}
          {tab==="updates" && (
            <div>
              <Card dk={dk} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", gap:10 }}>
                  <Av p={profiles[me]||{}} size={34}/>
                  <div style={{ flex:1 }}>
                    <Inp value={newUpdate} onChange={e=>setNewUpdate(e.target.value)} placeholder="Post a startup-wide update for all members…" rows={3}/>
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                      <Btn onClick={postUpdate} disabled={!newUpdate.trim()||posting} size="sm">{posting?"Posting…":"Post Update"}</Btn>
                    </div>
                  </div>
                </div>
              </Card>
              {updates.map(u => {
                const author = profiles[u.created_by]||{name:"Founder"};
                return (
                  <Card dk={dk} key={u.id}>
                    <div style={{ display:"flex", gap:10 }}>
                      <Av p={author} size={34}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <span style={{ fontWeight:700, fontSize:13, color:th.txt }}>{author.name}</span>
                            <span style={{ fontSize:11, color:th.tx3 }}>{ago(u.created_at)}</span>
                          </div>
                          <button onClick={() => delUpdate(u.id)} style={{ background:"none", border:"none", cursor:"pointer", color:th.tx3, display:"flex" }}><Trash2 size={13}/></button>
                        </div>
                        <p style={{ margin:0, fontSize:14, color:th.txt, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{u.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ACTIVITY */}
          {tab==="activity" && (
            <div>
              {activity.length===0
                ? <div style={{ textAlign:"center", padding:48, color:th.tx3 }}><Zap size={36} style={{ marginBottom:10, opacity:.4 }}/><p>No activity yet.</p></div>
                : (
                  <div>
                    {activity.map(a => {
                      const actor = profiles[a.actor_id]||{name:"Member"};
                      const icons = { message:"💬", task_created:"✅", task_completed:"🏆", file_uploaded:"📎", member_joined:"👤", meeting_scheduled:"📅", update_posted:"📢", startup_created:"🚀" };
                      return (
                        <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 0", borderBottom:`1px solid ${th.bdr}` }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:th.sf2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{icons[a.type]||"⚡"}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, color:th.txt }}>{a.description}</div>
                            <div style={{ fontSize:11, color:th.tx3, marginTop:2 }}>{actor.name} · {ago(a.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── STARTUP DETAIL ───────────────────────────────────────────
function StartupDetail({ startup: init, me, myProfile, profiles, dk, onBack }) {
  const th = T(dk);
  const [startup, setStartup] = useState(init);
  const [pages, setPages] = useState([]);
  const [myAccess, setMyAccess] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFounder = startup.created_by===me||(startup.founders||[]).includes(me);

  const loadData = useCallback(async () => {
    const [pg, acc, rq, us, bk] = await Promise.all([
      api.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=position.asc`),
      api.get("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${me}&status=eq.approved`),
      api.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}&order=created_at.desc&limit=1`),
      api.get("rs_startup_updates", `startup_id=eq.${startup.id}&page_id=is.null&order=created_at.desc&limit=5`),
      api.get("rs_startup_bookmarks", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
    ]);
    setPages(pg||[]); setMyAccess((acc||[]).map(a=>a.page_id));
    setMyRequest(rq?.[0]||null); setUpdates(us||[]);
    setBookmarked((bk||[]).length>0); setLoading(false);
  }, [startup.id, me]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresh when request approved
  useRealtime("rs_page_access", null, evt => {
    if (evt.record?.startup_id===startup.id && evt.record?.user_id===me) loadData();
  });

  if (isFounder) return <FounderDashboard startup={startup} me={me} myProfile={myProfile} profiles={profiles} dk={dk} onBack={onBack} onStartupUpdated={s => setStartup(s)}/>;
  if (activePage) return <PageDetail startup={startup} page={activePage} me={me} profiles={profiles} dk={dk} onBack={() => setActivePage(null)} isFounder={false}/>;

  const handleJoinDone = req => { setMyRequest(req); };
  const toggleBookmark = async () => {
    if (bookmarked) { await api.del("rs_startup_bookmarks",`startup_id=eq.${startup.id}&user_id=eq.${me}`); setBookmarked(false); }
    else { await api.upsert("rs_startup_bookmarks",{ user_id:me, startup_id:startup.id }); setBookmarked(true); }
  };

  const founders = (startup.founders||[startup.created_by]).map(id=>profiles[id]).filter(Boolean);
  const accessiblePages = pages.filter(p=>myAccess.includes(p.id));
  const lockedPages = pages.filter(p=>!myAccess.includes(p.id));
  const allRequested = myRequest && pages.every(p=>(myRequest.requested_pages||[]).includes(p.id)||myAccess.includes(p.id));

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      {showJoin && <JoinModal startup={startup} pages={pages} me={me} myProfile={myProfile} existingAccess={myAccess} onClose={() => setShowJoin(false)} onDone={handleJoinDone}/>}
      {showMeeting && <BookMeetingModal startup={startup} page={null} me={me} profiles={profiles} pageMembers={[]} onClose={() => setShowMeeting(false)} onSave={() => {}}/>}

      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", color:th.tx2, fontSize:13, fontWeight:600, padding:"0 0 14px", fontFamily:"inherit" }}>
        <ArrowLeft size={15}/> Back to Colab
      </button>

      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a18,#5b21b618)", border:"1px solid #3b82f628", borderRadius:20, padding:22, marginBottom:16 }}>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {startup.logo ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:30 }}>🚀</span>}
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <h2 style={{ margin:"0 0 6px", fontSize:22, fontWeight:900, color:th.txt }}>{startup.name}</h2>
            <p style={{ margin:"0 0 12px", fontSize:14, color:th.tx2, lineHeight:1.6 }}>{startup.description}</p>
            {founders.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <StackedAv uids={founders.map(f=>f.id)} profiles={profiles} size={26}/>
                <span style={{ fontSize:13, color:th.tx3 }}>by {founders.slice(0,2).map(f=>f.name?.split(" ")[0]).join(", ")}{founders.length>2?` +${founders.length-2}`:""}</span>
              </div>
            )}
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"4px 10px", fontSize:12, color:th.tx2, fontWeight:600 }}><Globe size={11}/>Website</a>}
              {startup.github_link && <a href={startup.github_link} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"4px 10px", fontSize:12, color:th.tx2, fontWeight:600 }}><Github size={11}/>GitHub</a>}
              {startup.social_links?.twitter && <a href={startup.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:"#1da1f215", border:"1px solid #1da1f230", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#1da1f2", fontWeight:600 }}><Twitter size={11}/>Twitter</a>}
              {startup.social_links?.linkedin && <a href={startup.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, background:"#0a66c215", border:"1px solid #0a66c230", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#0a66c2", fontWeight:600 }}><Linkedin size={11}/>LinkedIn</a>}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
            {!allRequested && !myAccess.length
              ? <Btn onClick={() => setShowJoin(true)} style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow:"0 0 20px rgba(59,130,246,.3)" }}>Join Startup →</Btn>
              : myAccess.length > 0 && !allRequested
                ? <Btn onClick={() => setShowJoin(true)} variant="outline" color="#3b82f6">Join More Pages</Btn>
                : myRequest?.status==="pending"
                  ? <span style={{ background:"#f59e0b18", color:"#f59e0b", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:10, border:"1px solid #f59e0b40", textAlign:"center" }}>⏳ Pending Approval</span>
                  : myAccess.length > 0
                    ? <span style={{ background:"#10b98118", color:"#10b981", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:10, border:"1px solid #10b98140", textAlign:"center" }}>✓ Member</span>
                    : null
            }
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={toggleBookmark}
                style={{ display:"flex", alignItems:"center", gap:5, background:bookmarked?"#3b82f618":th.sf2, border:`1px solid ${bookmarked?"#3b82f640":th.bdr}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", color:bookmarked?"#3b82f6":th.tx3, fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
                {bookmarked?<><BookmarkCheck size={13}/>Saved</>:<><Bookmark size={13}/>Save</>}
              </button>
              <button onClick={() => setShowMeeting(true)}
                style={{ display:"flex", alignItems:"center", gap:5, background:th.sf2, border:`1px solid ${th.bdr}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", color:th.tx2, fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
                <Calendar size={13}/>Meeting
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <Spin dk={dk}/> : (
        <>
          {/* Accessible pages */}
          {accessiblePages.length > 0 && (
            <Section title={`YOUR PAGES (${accessiblePages.length})`}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                {accessiblePages.map(pg => {
                  const pt = PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6];
                  return (
                    <div key={pg.id} onClick={() => setActivePage(pg)}
                      style={{ background:pt.c+"10", border:`1.5px solid ${pt.c}40`, borderRadius:14, padding:14, cursor:"pointer", transition:"all .2s" }}
                      onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
                      onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:pt.c+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{pt.e}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:pt.c }}>{pg.name}</div>
                          <div style={{ fontSize:11, color:th.tx3 }}>{pg.description||pt.desc}</div>
                        </div>
                      </div>
                      <div style={{ background:pt.c, borderRadius:8, padding:"6px 0", color:"#fff", fontSize:12, fontWeight:700, textAlign:"center" }}>Enter →</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Locked pages */}
          {lockedPages.length > 0 && (
            <Section title={`ALL PAGES (${pages.length})`}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                {lockedPages.map(pg => {
                  const pt = PAGE_TYPES.find(x=>x.id===pg.page_type)||PAGE_TYPES[6];
                  const reqStatus = myRequest?.page_statuses?.[pg.id];
                  return (
                    <div key={pg.id} style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:14, padding:14, opacity:0.65 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:th.sf2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{pt.e}</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:th.txt }}>{pg.name}</div>
                          <div style={{ fontSize:10, fontWeight:700, color:reqStatus==="pending"?"#f59e0b":reqStatus==="rejected"?"#ef4444":th.tx3 }}>
                            {reqStatus==="pending"?"⏳ Pending":reqStatus==="rejected"?"✗ Rejected":"🔒 Members only"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Latest updates */}
          {updates.length > 0 && (
            <Section title="📢 LATEST UPDATES">
              {updates.map(u => {
                const author = profiles[u.created_by]||{name:"Founder"};
                return (
                  <Card dk={dk} key={u.id}>
                    <div style={{ display:"flex", gap:10 }}>
                      <Av p={author} size={32}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:5 }}>
                          <span style={{ fontWeight:700, fontSize:13, color:th.txt }}>{author.name}</span>
                          <span style={{ fontSize:11, color:th.tx3 }}>{ago(u.created_at)}</span>
                        </div>
                        <p style={{ margin:0, fontSize:14, color:th.txt, lineHeight:1.65 }}>{u.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </Section>
          )}

          <FeedbackSection startup={startup} me={me} profiles={profiles} dk={dk} isFounder={false}/>
        </>
      )}
    </div>
  );
}

// ─── STARTUP CARD ─────────────────────────────────────────────
function StartupCard({ startup, me, profiles, dk, onClick, isOwner }) {
  const th = T(dk);
  const founders = (startup.founders||[startup.created_by]).map(id=>profiles[id]).filter(Boolean);
  return (
    <div onClick={onClick}
      style={{ background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:16, padding:16, marginBottom:10, cursor:"pointer", transition:"all .2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f640"; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=th.bdr; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
        <div style={{ width:54, height:54, borderRadius:14, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {startup.logo ? <img src={startup.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:26 }}>🚀</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4 }}>
            <div style={{ fontWeight:800, fontSize:15, color:th.txt }}>{startup.name}</div>
            {isOwner && <Badge label="FOUNDER" color="#3b82f6"/>}
          </div>
          <p style={{ fontSize:13, color:th.tx2, margin:"0 0 10px", lineHeight:1.5 }}>{(startup.description||"").slice(0,100)}{startup.description?.length>100?"…":""}</p>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {founders.length > 0 && <>
              <StackedAv uids={founders.map(f=>f.id)} profiles={profiles} size={22}/>
              <span style={{ fontSize:12, color:th.tx3 }}>{founders.slice(0,2).map(f=>f.name?.split(" ")[0]).join(", ")}{founders.length>2?` +${founders.length-2}`:""}</span>
            </>}
            <span style={{ fontSize:11, color:"#3b82f6", marginLeft:"auto", fontWeight:600 }}>View →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SMART RECOMMENDATIONS ────────────────────────────────────
function Recommendations({ me, myProfile, profiles, startups, onOpen, dk }) {
  const th = T(dk);
  if (!myProfile?.interests?.length) return null;
  // Suggest startups that match user interests (via description keywords)
  const keywords = myProfile.interests || [];
  const relevant = startups.filter(s =>
    s.created_by !== me && !(s.founders||[]).includes(me) &&
    keywords.some(k => s.description?.toLowerCase().includes(k) || s.name?.toLowerCase().includes(k))
  ).slice(0, 3);
  if (!relevant.length) return null;
  return (
    <div style={{ background:`linear-gradient(135deg,#8b5cf618,#3b82f618)`, border:`1px solid #8b5cf630`, borderRadius:14, padding:14, marginBottom:16 }}>
      <div style={{ fontWeight:700, fontSize:13, color:th.txt, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={14} color="#8b5cf6"/>Recommended for you
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
        {relevant.map(s => (
          <div key={s.id} onClick={() => onOpen(s)}
            style={{ flex:"0 0 160px", background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:12, padding:12, cursor:"pointer" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
              {s.logo ? <img src={s.logo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:18 }}>🚀</span>}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:th.txt, marginBottom:4 }}>{s.name}</div>
            <div style={{ fontSize:11, color:th.tx3, lineHeight:1.4 }}>{(s.description||"").slice(0,50)}…</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COLAB VIEW ──────────────────────────────────────────
export default function ColabView({ me, dk, profiles, myProfile, addNotif, onProfile }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStartup, setActiveStartup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [search, setSearch] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [tab, setTab] = useState("discover"); // discover | mine | saved

  const load = useCallback(async () => {
    setLoading(true);
    const [data, bk] = await Promise.all([
      api.get("rs_startups", "order=created_at.desc&limit=60"),
      api.get("rs_startup_bookmarks", `user_id=eq.${me}&select=startup_id`),
    ]);
    setStartups(data||[]);
    setBookmarkedIds((bk||[]).map(b=>b.startup_id));
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = ({ startup: s }) => {
    if (!s) return;
    setStartups(ss=>[s,...ss.filter(x=>x.id!==s.id)]);
    setActiveStartup(s);
  };

  const handleJoinSuccess = s => {
    addNotif?.({ type:"sandbox", msg:`🚀 Join request sent to ${s.name}!` });
  };

  const myStartups = startups.filter(s=>s.created_by===me||(s.founders||[]).includes(me));
  const otherStartups = startups.filter(s=>s.created_by!==me&&!(s.founders||[]).includes(me));
  const savedStartups = otherStartups.filter(s=>bookmarkedIds.includes(s.id));
  const sf = s => !search.trim()||s.name?.toLowerCase().includes(search.toLowerCase())||s.description?.toLowerCase().includes(search.toLowerCase());

  if (activeStartup) return (
    <StartupDetail startup={activeStartup} me={me} myProfile={myProfile} profiles={profiles} dk={dk}
      onBack={() => { setActiveStartup(null); load(); }}/>
  );

  const displayList = tab==="mine" ? myStartups.filter(sf) : tab==="saved" ? savedStartups.filter(sf) : otherStartups.filter(sf);

  return (
    <div>
      {showCreate && <CreateStartupModal me={me} myProfile={myProfile} existing={null} onClose={() => setShowCreate(false)} onSave={handleCreated}/>}
      {showReferral && <ReferralModal me={me} myProfile={myProfile} onClose={() => setShowReferral(false)} onSuccess={handleJoinSuccess}/>}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#5b21b6)", borderRadius:20, padding:24, marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14, marginBottom:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <span style={{ fontSize:28 }}>🚀</span>
              <h2 style={{ margin:0, fontSize:24, fontWeight:900, color:"#fff" }}>Colab</h2>
            </div>
            <p style={{ color:"rgba(255,255,255,.6)", fontSize:13, margin:0 }}>Build startups · Collaborate · Grow</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowReferral(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)", borderRadius:11, padding:"9px 16px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              <Link size={14}/>Join via Code
            </button>
            <button onClick={() => setShowCreate(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"none", borderRadius:11, padding:"9px 18px", color:"#1e3a8a", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
              <Plus size={14}/>Create Startup
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[["Total Startups", startups.length],["Your Startups", myStartups.length],["Saved", savedStartups.length]].map(([l,v])=>(
            <div key={l} style={{ background:"rgba(255,255,255,.08)", borderRadius:12, padding:"10px 14px" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", fontWeight:700 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#fff", marginTop:3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:14 }}>
        <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:th.tx3 }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search startups by name or description…"
          style={{ width:"100%", background:th.surf, border:`1px solid ${th.bdr}`, borderRadius:12, padding:"9px 12px 9px 36px", fontSize:13, outline:"none", color:th.txt, boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>

      {/* Tabs */}
      {!search && (
        <div style={{ display:"flex", gap:4, marginBottom:16, background:th.sf2, borderRadius:12, padding:4, border:`1px solid ${th.bdr}` }}>
          {[["discover","🌍 Discover"],["mine","🚀 My Startups"],["saved","🔖 Saved"]].map(([id,label])=>(
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:"7px", borderRadius:9, border:"none", background:tab===id?"#3b82f6":"transparent", color:tab===id?"#fff":th.tx2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {tab==="discover" && !search && (
        <Recommendations me={me} myProfile={myProfile} profiles={profiles} startups={otherStartups} onOpen={s=>setActiveStartup(s)} dk={dk}/>
      )}

      {loading ? <Spin dk={dk}/> : displayList.length===0 ? (
        <div style={{ textAlign:"center", padding:56, color:th.tx3 }}>
          <div style={{ fontSize:52, marginBottom:14 }}>🚀</div>
          <h3 style={{ fontWeight:700, color:th.txt, margin:"0 0 8px" }}>
            {tab==="mine"?"No startups yet":tab==="saved"?"Nothing saved yet":"No startups found"}
          </h3>
          <p style={{ fontSize:14, margin:"0 0 20px" }}>
            {tab==="mine"?"Create your first startup to get started.":tab==="saved"?"Bookmark startups to save them here.":search?"Try a different search term.":"Create one or join with a referral code."}
          </p>
          {tab!=="saved" && (
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <Btn onClick={() => setShowCreate(true)}>Create Startup</Btn>
              <Btn onClick={() => setShowReferral(true)} variant="outline" color="#3b82f6">Join via Code</Btn>
            </div>
          )}
        </div>
      ) : displayList.map(s => (
        <StartupCard key={s.id} startup={s} me={me} profiles={profiles} dk={dk} onClick={() => setActiveStartup(s)} isOwner={s.created_by===me||(s.founders||[]).includes(me)}/>
      ))}
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
