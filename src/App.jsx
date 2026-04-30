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

// ═══════════════════════════════════════════════════════════════════
// COLAB COMPLETION CODE
// Paste this after your existing ColabView, replacing everything from
// "handleStartupCreated" onward through the end of the file.
// ═══════════════════════════════════════════════════════════════════

// ─── COLAB MAIN VIEW ─────────────────────────────────────────────
function ColabView({ me, dk, profiles, onProfile, addNotif }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStartup, setActiveStartup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.get("rs_startups", "order=created_at.desc&limit=50");
    setStartups(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStartupCreated = s => {
    if (s) {
      setStartups(ss => [s, ...ss.filter(x => x.id !== s.id)]);
      setActiveStartup(s);
    }
  };

  const handleJoinSuccess = s => {
    addNotif({ type: "sandbox", msg: `🚀 Join request sent to ${s.name}!` });
  };

  if (activeStartup) {
    return (
      <StartupDetail
        startup={activeStartup}
        me={me}
        profiles={profiles}
        dk={dk}
        onBack={() => setActiveStartup(null)}
        onProfile={onProfile}
      />
    );
  }

  const myStartups = startups.filter(s =>
    s.created_by === me || (s.founders || []).includes(me)
  );
  const otherStartups = startups.filter(s =>
    s.created_by !== me && !(s.founders || []).includes(me)
  );
  const filtered = [...myStartups, ...otherStartups].filter(s =>
    !search.trim() ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {showCreate && (
        <CreateStartupModal
          me={me}
          myProfile={profiles[me]}
          existing={null}
          onClose={() => setShowCreate(false)}
          onSave={handleStartupCreated}
          dk={dk}
        />
      )}
      {showReferral && (
        <ReferralJoinModal
          me={me}
          onClose={() => setShowReferral(false)}
          onSuccess={handleJoinSuccess}
          dk={dk}
        />
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#5b21b6)", borderRadius: 18, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: "#fff" }}>🚀 Colab</h2>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, margin: 0 }}>
              Build startups together · {startups.length} active startup{startups.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowReferral(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              <Link size={13} /> Join via Code
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", color: "#1e3a8a", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
            >
              <Plus size={14} /> Create Startup
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search startups…"
          style={{ width: "100%", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "9px 12px 9px 36px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }}
        />
      </div>

      {/* My Startups section */}
      {myStartups.length > 0 && !search && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5, marginBottom: 8 }}>YOUR STARTUPS</div>
          {myStartups.map(s => <StartupCard key={s.id} startup={s} me={me} profiles={profiles} dk={dk} onClick={() => setActiveStartup(s)} isOwner />)}
          {otherStartups.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5, margin: "16px 0 8px" }}>DISCOVER STARTUPS</div>}
        </div>
      )}

      {/* All startups */}
      {loading ? <Spin dk={dk} msg="Loading startups…" /> : (
        (search ? filtered : otherStartups).length === 0 && myStartups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 56, color: th.txt3 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <h3 style={{ fontWeight: 700, color: th.txt, margin: "0 0 8px" }}>No startups yet</h3>
            <p style={{ fontSize: 14, margin: "0 0 20px" }}>Be the first to create one, or join with a referral code.</p>
            <button onClick={() => setShowCreate(true)} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Create First Startup
            </button>
          </div>
        ) : (
          (search ? filtered : otherStartups).map(s => (
            <StartupCard key={s.id} startup={s} me={me} profiles={profiles} dk={dk} onClick={() => setActiveStartup(s)} />
          ))
        )
      )}
    </div>
  );
}

// ─── STARTUP CARD (used in ColabView list) ────────────────────────
function StartupCard({ startup, me, profiles, dk, onClick, isOwner }) {
  const th = T(dk);
  const founders = (startup.founders || [startup.created_by]).map(id => profiles[id]).filter(Boolean);

  return (
    <Card dk={dk} style={{ cursor: "pointer", transition: "all .2s" }} anim={false}>
      <div onClick={onClick} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
          {startup.logo || "🚀"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: th.txt }}>{startup.name}</span>
                {isOwner && (
                  <span style={{ background: "#3b82f618", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>FOUNDER</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: th.txt2, margin: "4px 0 8px", lineHeight: 1.5 }}>
                {(startup.description || "").slice(0, 100)}{startup.description?.length > 100 ? "…" : ""}
              </p>
            </div>
          </div>
          {/* Stacked founder avatars */}
          {founders.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <StackedAvatars uids={founders.map(f => f.id)} profiles={profiles} size={24} max={4} />
              <span style={{ fontSize: 12, color: th.txt3 }}>
                {founders.slice(0, 2).map(f => f.name?.split(" ")[0]).join(", ")}
                {founders.length > 2 ? ` +${founders.length - 2}` : ""}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {startup.website && (
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <Globe size={10} /> Website
              </span>
            )}
            {startup.referral_code && isOwner && (
              <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, fontFamily: "monospace", letterSpacing: 0.5 }}>
                {startup.referral_code}
              </span>
            )}
            <span style={{ fontSize: 11, color: th.txt3 }}>→ View pages</span>
          </div>
        </div>
      </div>
    </Card>
  );
}



// ─── ONBOARDING SCREEN ────────────────────────────────────────────
function OnboardingScreen({ me, onDone, dk }) {
  const th = T(dk);
  const [step, setStep] = useState(0); // 0=who, 1=interests, 2=done
  const [who, setWho] = useState("");
  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = id => {
    setInterests(is => is.includes(id) ? is.filter(x => x !== id) : [...is, id]);
  };

  const save = async () => {
    if (!who) return;
    setSaving(true);
    const name = "New Member";
    const handle = genHandle(name);
    const refCode = genRefCode(name);
    await db.upsert("rs_user_profiles", {
      id: me,
      name,
      handle,
      ref_code: refCode,
      who,
      interests,
      hue: strColor(me),
      onboarded: true,
    });
    await db.upsert("rs_token_balances", { uid: me, balance: 5 });
    await db.post("rs_token_txns", { uid: me, type: "earn", amount: 5, description: "Welcome bonus" });
    setSaving(false);
    onDone({ id: me, name, handle, ref_code: refCode, who, interests, hue: strColor(me), onboarded: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: th.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <RightSignalLogo size={42} dk={dk} />
        </div>

        <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 28 }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "#3b82f6" : th.bdr, transition: "all .3s" }} />
            ))}
          </div>

          {step === 0 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: th.txt, margin: "0 0 6px" }}>Who are you?</h2>
              <p style={{ color: th.txt2, fontSize: 13, margin: "0 0 20px" }}>Help us personalize your RightSignal experience.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {WHO_OPTS.map(o => (
                  <button key={o.id} onClick={() => setWho(o.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 14, border: `1.5px solid ${who === o.id ? o.c : th.bdr}`, background: who === o.id ? o.c + "18" : "transparent", cursor: "pointer", transition: "all .15s" }}>
                    <span style={{ fontSize: 22 }}>{o.e}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: who === o.id ? o.c : th.txt2 }}>{o.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => who && setStep(1)} disabled={!who} style={{ width: "100%", marginTop: 20, padding: "11px", background: who ? "#3b82f6" : th.surf2, border: "none", borderRadius: 12, color: who ? "#fff" : th.txt3, fontSize: 14, fontWeight: 700, cursor: who ? "pointer" : "default" }}>
                Continue →
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: th.txt, margin: "0 0 6px" }}>What interests you?</h2>
              <p style={{ color: th.txt2, fontSize: 13, margin: "0 0 20px" }}>Pick at least 3 topics (choose as many as you like).</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {INT_OPTS.map(o => (
                  <button key={o.id} onClick={() => toggleInterest(o.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${interests.includes(o.id) ? o.c : th.bdr}`, background: interests.includes(o.id) ? o.c + "15" : "transparent", cursor: "pointer", transition: "all .15s" }}>
                    <span style={{ fontSize: 18 }}>{o.e}</span>
                    <span style={{ fontSize: 12, fontWeight: interests.includes(o.id) ? 700 : 500, color: interests.includes(o.id) ? o.c : th.txt2, flex: 1, textAlign: "left" }}>{o.label}</span>
                    {interests.includes(o.id) && <Check size={13} color={o.c} />}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(0)} style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Back</button>
                <button onClick={save} disabled={interests.length < 1 || saving} style={{ flex: 1, padding: "11px", background: interests.length >= 1 ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : th.surf2, border: "none", borderRadius: 12, color: interests.length >= 1 ? "#fff" : th.txt3, fontSize: 14, fontWeight: 700, cursor: interests.length >= 1 ? "pointer" : "default" }}>
                  {saving ? "Setting up…" : "🎉 Enter RightSignal (+5 SGN)"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN APP ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [dk, setDk] = useState(() => localStorage.getItem("rs_dk") !== "0");
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [bals, setBals] = useState({});
  const [view, setView] = useState("feed");
  const [profileUid, setProfileUid] = useState(null);
  const [msgUid, setMsgUid] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [tokenPop, setTokenPop] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const notifRef = useRef();

  const th = T(dk);

  // ── Dark mode persistence
  useEffect(() => { localStorage.setItem("rs_dk", dk ? "1" : "0"); }, [dk]);

  // ── Close notif panel on outside click
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Session bootstrap
  useEffect(() => {
    (async () => {
      // Check OAuth return
      const oauthReturn = sessionStorage.getItem("rs_oauth_return");
      if (oauthReturn) {
        sessionStorage.removeItem("rs_oauth_return");
        const sess = JSON.parse(oauthReturn);
        await loadSession(sess);
        return;
      }
      // Check stored session
      const stored = localStorage.getItem("rs_session");
      if (stored) {
        try {
          const sess = JSON.parse(stored);
          if (sess?.access_token) { await loadSession(sess); return; }
        } catch {}
      }
      setAuthLoading(false);
    })();
  }, []);

  const loadSession = async sess => {
    const user = await sbAuth.getUser(sess.access_token);
    if (!user?.id) { localStorage.removeItem("rs_session"); setAuthLoading(false); return; }
    localStorage.setItem("rs_session", JSON.stringify(sess));
    setSession(sess);
    setMe(user.id);
    await loadAllData(user.id);
    setAuthLoading(false);
  };

  const loadAllData = async uid => {
    const [profRows, balRows, bkRows] = await Promise.all([
      db.get("rs_user_profiles", "select=*"),
      db.get("rs_token_balances", "select=*"),
      db.get("rs_bookmarks", `uid=eq.${uid}&select=post_id`),
    ]);
    const pMap = {};
    (profRows || []).forEach(p => { pMap[p.id] = p; });
    setProfiles(pMap);
    setMyProfile(pMap[uid] || null);
    const bMap = {};
    (balRows || []).forEach(b => { bMap[b.uid] = b.balance || 0; });
    setBals(bMap);
    setBookmarks((bkRows || []).map(b => b.post_id));
  };

  const addNotif = useCallback(n => {
    const id = genId();
    setNotifs(ns => [{ ...n, id, ts: Date.now(), read: false }, ...ns].slice(0, 50));
    if (n.type === "token") setTokenPop({ amount: n.amount, id });
  }, []);

  const handleBookmark = async postId => {
    const on = bookmarks.includes(postId);
    setBookmarks(bk => on ? bk.filter(x => x !== postId) : [...bk, postId]);
    if (on) await db.del("rs_bookmarks", `uid=eq.${me}&post_id=eq.${postId}`);
    else await db.upsert("rs_bookmarks", { uid: me, post_id: postId });
  };

  const handleProfile = uid => { setProfileUid(uid); setView("profile"); };
  const handleMessage = uid => { setMsgUid(uid); setView("messages"); };

  const handleSignOut = async () => {
    if (session) await sbAuth.signOut(session.access_token);
    localStorage.removeItem("rs_session");
    setSession(null); setMe(null); setMyProfile(null); setProfiles({}); setBals({});
    setView("feed"); setNotifs([]);
  };

  const unread = notifs.filter(n => !n.read).length;

  // ── Loading state
  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg }}>
      <GlobalCSS dk={dk} />
      <div style={{ textAlign: "center" }}>
        <RightSignalLogo size={48} dk={dk} />
        <Spin dk={dk} msg="Starting up…" />
      </div>
    </div>
  );

  // ── Not logged in
  if (!me) return (
    <>
      <GlobalCSS dk={dk} />
      <AuthScreen onAuth={loadSession} dk={dk} />
    </>
  );

  // ── Needs onboarding
  if (myProfile && !myProfile.onboarded) return (
    <>
      <GlobalCSS dk={dk} />
      <OnboardingScreen me={me} onDone={p => { setMyProfile(p); setProfiles(prev => ({ ...prev, [me]: p })); }} dk={dk} />
    </>
  );

  if (!myProfile) return (
    <>
      <GlobalCSS dk={dk} />
      <OnboardingScreen me={me} onDone={p => { setMyProfile(p); setProfiles(prev => ({ ...prev, [me]: p })); }} dk={dk} />
    </>
  );

  // ── Main app
  const renderView = () => {
    switch (view) {
      case "feed":
        return <FeedView me={me} dk={dk} myProfile={myProfile} onProfile={handleProfile} bals={bals} profiles={profiles} addNotif={addNotif} bookmarks={bookmarks} onBookmark={handleBookmark} />;
      case "network":
        return <NetworkView me={me} dk={dk} onProfile={handleProfile} bals={bals} profiles={profiles} addNotif={addNotif} />;
      case "messages":
        return <MessengerView me={me} dk={dk} profiles={profiles} initialUid={msgUid} />;
      case "colab":
        return <ColabView me={me} dk={dk} profiles={profiles} onProfile={handleProfile} addNotif={addNotif} />;
      case "events":
        return <EventsView dk={dk} addNotif={addNotif} />;
      case "sandbox":
        return <SandboxView me={me} dk={dk} />;
      case "contribute":
        return <ContributeView me={me} dk={dk} />;
      case "wallet":
        return <WalletView me={me} bals={bals} setBals={setBals} dk={dk} myProfile={myProfile} />;
      case "ads":
        return isAdmin(myProfile) || canManageAds(myProfile) ? <AdsManagerView me={me} dk={dk} myProfile={myProfile} /> : <FeedView me={me} dk={dk} myProfile={myProfile} onProfile={handleProfile} bals={bals} profiles={profiles} addNotif={addNotif} bookmarks={bookmarks} onBookmark={handleBookmark} />;
      case "profile":
        return <ProfileView uid={profileUid || me} me={me} dk={dk} onBack={() => setView("feed")} bals={bals} profiles={profiles} setBals={setBals} onMessage={handleMessage} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: th.bg, color: th.txt }}>
      <GlobalCSS dk={dk} />
      {tokenPop && <TokenPop amount={tokenPop.amount} onDone={() => setTokenPop(null)} />}

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", minHeight: "100vh" }}>

        {/* Sidebar */}
        <Sidebar view={view} setView={v => { setView(v); if (v !== "messages") setMsgUid(null); if (v !== "profile") setProfileUid(null); }} me={me} dk={dk} bals={bals} myProfile={myProfile} />

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Topbar */}
          <div style={{ position: "sticky", top: 0, zIndex: 50, background: th.top, backdropFilter: "blur(12px)", borderBottom: `1px solid ${th.bdr}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <SearchBar dk={dk} profiles={profiles} onProfile={handleProfile} onTag={tag => setView("feed")} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <button onClick={() => setDk(x => !x)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center" }}>
                {dk ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <div ref={notifRef} style={{ position: "relative" }}>
                <button onClick={() => setShowNotifs(x => !x)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center", position: "relative" }}>
                  <Bell size={15} />
                  {unread > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>{unread > 9 ? "9+" : unread}</div>
                  )}
                </button>
                {showNotifs && <NotifPanel notifs={notifs} setNotifs={setNotifs} onClose={() => setShowNotifs(false)} dk={dk} />}
              </div>
              <button onClick={handleSignOut} title="Sign out" style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center" }}>
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: "flex", gap: 16, padding: "16px 16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {renderView()}
            </div>

            {/* Right panel — only show on feed/network */}
            {["feed", "network", "contribute"].includes(view) && (
              <RightPanel
                dk={dk}
                myProfile={myProfile}
                onProfile={handleProfile}
                bals={bals}
                onWallet={() => setView("wallet")}
                profiles={profiles}
                onTag={tag => setView("feed")}
              />
            )}
          </div>
        </div>
      </div>
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
      expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get("expires_in") || "0")
    };

    localStorage.setItem("rs_session", JSON.stringify(sess));
    window.history.replaceState({}, "", window.location.pathname);

    await trySession(sess);
  }

})();   // ✅ ✅ ADD THIS LINE

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