// src/App.jsx — RightSignal v2 — All Features Functional
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Users, Calendar, Lightbulb, Bell, Heart, MessageCircle,
  Repeat2, Share2, X, TrendingUp, Award, FileText, ThumbsUp, ThumbsDown,
  Send, Check, Clock, ExternalLink, Zap, Shield, ChevronRight, ChevronLeft,
  Plus, Globe, Search, Bookmark, Moon, Sun, Edit3, ArrowLeft, Copy, Wallet,
  Gift, Link, Eye, EyeOff, AlertCircle, RefreshCw, LogOut, User, Mail, Lock,
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────
const SB_URL = "https://kzdjzasopqwzctwebiap.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZGp6YXNvcHF3emN0d2ViaWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjM1NTgsImV4cCI6MjA5MjA5OTU1OH0.VqGDt7JVvkP413tl40EIh3IFqtyhX1OMrv3iCGaMvls";
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

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
  { id: "founder",      label: "Founder",       e: "🚀", c: "#f97316" },
  { id: "investor",     label: "Investor",       e: "💰", c: "#10b981" },
  { id: "professional", label: "Professional",   e: "💼", c: "#3b82f6" },
  { id: "entrepreneur", label: "Entrepreneur",   e: "⚡", c: "#8b5cf6" },
  { id: "developer",    label: "Developer",      e: "👾", c: "#06b6d4" },
  { id: "designer",     label: "Designer",       e: "🎨", c: "#ec4899" },
  { id: "diplomat",     label: "Diplomat",       e: "🌐", c: "#f59e0b" },
  { id: "selfemployed", label: "Self-Employed",  e: "🧠", c: "#ef4444" },
  { id: "student",      label: "Student",        e: "🎓", c: "#84cc16" },
  { id: "researcher",   label: "Researcher",     e: "🔬", c: "#6366f1" },
  { id: "creator",      label: "Creator",        e: "✨", c: "#f43f5e" },
  { id: "executive",    label: "Executive",      e: "🏛️", c: "#0ea5e9" },
];
const INT_OPTS = [
  { id: "tech",     label: "Technology",    e: "💻", c: "#3b82f6" }, { id: "startups", label: "Startups",      e: "🚀", c: "#f97316" },
  { id: "ai",       label: "AI",            e: "🤖", c: "#8b5cf6" }, { id: "finance",  label: "Finance & VC",  e: "📈", c: "#10b981" },
  { id: "news",     label: "Global News",   e: "🌍", c: "#06b6d4" }, { id: "sports",   label: "Sports",        e: "⚽", c: "#ef4444" },
  { id: "music",    label: "Music",         e: "🎵", c: "#ec4899" }, { id: "design",   label: "Design & UX",   e: "🎨", c: "#f59e0b" },
  { id: "science",  label: "Science",       e: "🔬", c: "#84cc16" }, { id: "crypto",   label: "Web3 & Crypto", e: "⛓️", c: "#f43f5e" },
  { id: "health",   label: "Health",        e: "🧬", c: "#0ea5e9" }, { id: "gaming",   label: "Gaming",        e: "🎮", c: "#7c3aed" },
  { id: "travel",   label: "Travel",        e: "✈️", c: "#059669" }, { id: "fun",      label: "Fun & Memes",   e: "😂", c: "#dc2626" },
];
const ADS = [
  { h: "Launch Your Startup Fast", b: "AWS Activate for startups.", cta: "Apply Now", g: "linear-gradient(135deg,#f97316,#facc15)" },
  { h: "Design Without Limits",    b: "Figma Pro. Unlimited projects.", cta: "Try Free",  g: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
  { h: "Scale Your API",           b: "35,000+ APIs on RapidAPI.",     cta: "Explore",   g: "linear-gradient(135deg,#3b82f6,#06b6d4)" },
];
const TRENDING   = ["#SignalTokens","#StartupSandbox","#BuildInPublic","#AlignNotFollow","#AIStartups","#RightSignal"];
const PHASES     = ["week1","week2","week3","week4","hackathon"];
const PH_LABEL   = { week1:"Idea Eval", week2:"Interviews", week3:"Refinement", week4:"Final", hackathon:"Hackathon" };
const ST_LABEL   = { submitted:"Pending", shortlisted_50:"Week 1 ✓", shortlisted_30:"Week 2 ✓", shortlisted_15:"Week 3 ✓", finalist_10:"Top 10 Finalist", winner:"Winner 🏆", rejected:"Not Selected" };
const SB_CYCLE   = { title: "Sandbox Cohort 3", phase: "week2" };
const CAT_COLORS = { Technology:"#3b82f6", Product:"#10b981", Developer:"#06b6d4", Leadership:"#8b5cf6", Design:"#ec4899", Startup:"#f97316", General:"#6b7280" };
const TYP_COLORS = { article:"#3b82f6", tool:"#10b981", idea:"#f59e0b" };

// ─── SEED DATA ────────────────────────────────────────────────────
const SEED_EVENTS = [
  { title:"Global AI & Startup Summit 2025", description:"5,000+ founders, investors & builders online. 100% free.", category:"Technology", event_date:new Date(Date.now()+259200000).toISOString(), timezone:"UTC", source:"Eventbrite", url:"https://eventbrite.com", is_free:true, popularity:4200 },
  { title:"Product-Led Growth Masterclass",  description:"PLG from Notion, Figma & Calendly leaders. Live Q&A.",   category:"Product",    event_date:new Date(Date.now()+604800000).toISOString(), timezone:"IST", source:"Meetup",     url:"https://meetup.com", is_free:true, popularity:1800 },
  { title:"Open Source Contributors Meetup", description:"Monthly gathering. Find collaborators & get feedback.",   category:"Developer",  event_date:new Date(Date.now()+172800000).toISOString(), timezone:"EST", source:"Meetup",     url:"https://meetup.com", is_free:true, popularity:890  },
  { title:"Women in Tech: Leadership Panel", description:"Inspiring stories from women leading globally. Free.",    category:"Leadership", event_date:new Date(Date.now()+864000000).toISOString(), timezone:"PST", source:"Eventbrite", url:"https://eventbrite.com", is_free:true, popularity:3100 },
  { title:"UX Research Methods Workshop",    description:"Usability testing, user interviews, synthesis methods.",  category:"Design",     event_date:new Date(Date.now()+432000000).toISOString(), timezone:"GMT", source:"Eventbrite", url:"https://eventbrite.com", is_free:true, popularity:760  },
  { title:"Founder Stories: 0 to $1M ARR",  description:"5 founders share their first million. Real numbers.",     category:"Startup",    event_date:new Date(Date.now()+1209600000).toISOString(),timezone:"UTC", source:"Meetup",     url:"https://meetup.com", is_free:true, popularity:2300 },
];
const SEED_SANDBOX = [
  { uid:"seed", title:"SkillSwap",  problem:"Freelancers pay 20–30% fees.",          solution:"P2P skill exchange, zero commission.",             audience:"Freelancers",   status:"finalist_10",    score_w1:9.6, score_w2:9.2, score_w3:9.0 },
  { uid:"seed", title:"MindBridge", problem:"Mental health resources are fragmented.", solution:"AI platform with culturally-matched counselors.",  audience:"Young adults",  status:"shortlisted_30", score_w1:9.1, score_w2:8.7, score_w3:null },
  { uid:"seed", title:"FarmLedger", problem:"Farmers lose 40% to middlemen.",         solution:"Blockchain ledger connecting farmers to buyers.",  audience:"Small farmers", status:"shortlisted_50", score_w1:8.4, score_w2:7.9, score_w3:null },
];
const SEED_CONTRIBS = [
  { uid:"seed", type:"article", title:"Why Most Startup Ideas Fail in Year One",       body:"After analyzing 200+ failed startups: founders solve problems that don't exist at scale. Here are 5 avoidable mistakes.",      upvotes:234, downvotes:12 },
  { uid:"seed", type:"tool",    title:"Open Source Rate Limiter for NestJS",           body:"Battle-tested Redis-backed rate limiting middleware. MIT licensed, 95% test coverage. 800+ GitHub stars.",                        upvotes:156, downvotes:8  },
  { uid:"seed", type:"article", title:"The Hidden Danger in Modern AI Systems",        body:"The alignment problem isn't about robots — it's subtle compounding misalignment in everyday systems.",                           upvotes:412, downvotes:23 },
  { uid:"seed", type:"idea",    title:"Decentralized Peer Review for Academic Papers", body:"Token-incentivized decentralized review to dramatically improve research quality. Looking for collaborators.",                    upvotes:89,  downvotes:15 },
  { uid:"seed", type:"tool",    title:"ContentOS — Free Content Planning Dashboard",   body:"Free Notion template for content creators. Weekly calendar, idea vault, analytics tracker. 5,000+ creators using it.",          upvotes:567, downvotes:31 },
];
const SEED_POSTS = [
  { uid:"seed", text:"🚀 Just launched RightSignal — a platform for founders, investors and builders to share signal over noise. Excited to see what this community builds!", like_count:47, repost_count:12 },
  { uid:"seed", text:"The best time to start was yesterday. The second best time is now. Stop overthinking and ship it. 💡 #BuildInPublic", like_count:89, repost_count:23 },
  { uid:"seed", text:"Hot take: Most startup failures aren't due to bad products — they're due to founders solving problems that don't exist at scale. Always validate before building.", like_count:134, repost_count:45 },
];

// ─── ATOMS ───────────────────────────────────────────────────────
function Av({ profile = {}, size = 36, bal }) {
  const name = profile.name || "?";
  const ini  = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue  = profile.hue || strColor(name);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={ini} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${hue},${hue}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size > 40 ? 16 : size > 28 ? 13 : 10 }}>{ini}</div>
      }
      {bal > 0 && <span style={{ position: "absolute", bottom: -2, right: -2, background: "#f59e0b", color: "#fff", fontSize: 8, fontWeight: 800, borderRadius: 99, padding: "1px 4px", border: "1px solid #fff", lineHeight: 1.4 }}>◈{bal}</span>}
    </div>
  );
}

function SGN({ n, size = "sm", pulse = false }) {
  const fs = size === "lg" ? 15 : size === "md" ? 13 : 11;
  const pd = size === "lg" ? "8px 16px" : size === "md" ? "5px 12px" : "3px 8px";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#f59e0b22,#f9731622)", border: "1px solid #f59e0b44", borderRadius: 99, padding: pd, animation: pulse ? "glow 2s ease-in-out infinite" : "none" }}>
      <span style={{ fontSize: fs, color: "#f59e0b" }}>◈</span>
      <span style={{ fontSize: fs, fontWeight: 800, color: "#f59e0b" }}>{n}</span>
      <span style={{ fontSize: fs - 1, fontWeight: 600, color: "#d97706" }}>SGN</span>
    </span>
  );
}

function Spin({ size = 32, dk = false, msg = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: size > 20 ? 32 : 4, gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", border: `3px solid ${T(dk).bdr}`, borderTopColor: "#3b82f6", animation: "spin .8s linear infinite" }} />
      {msg && <p style={{ color: T(dk).txt2, fontSize: 13, margin: 0 }}>{msg}</p>}
    </div>
  );
}

function TokenPop({ amount, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 80, right: 24, background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", borderRadius: 14, padding: "10px 18px", fontWeight: 800, fontSize: 15, zIndex: 9999, animation: "popIn .4s ease", boxShadow: "0 8px 30px rgba(245,158,11,.5)", display: "flex", alignItems: "center", gap: 8 }}>
      ◈ +{amount} SGN earned!
    </div>
  );
}

function CopyBtn({ text, label = "Copy" }) {
  const [ok, setOk] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(text); } catch {} setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, background: ok ? "#10b98120" : "transparent", border: `1px solid ${ok ? "#10b981" : "#d1d5db"}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: ok ? "#10b981" : "#6b7280", transition: "all .2s" }}>
      {ok ? <><Check size={12} />Copied!</> : <><Copy size={12} />{label}</>}
    </button>
  );
}

function Card({ children, dk, style: ext = {}, anim = true }) {
  const th = T(dk);
  return <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: dk ? "0 4px 20px rgba(0,0,0,.35)" : "0 2px 8px rgba(0,0,0,.04)", animation: anim ? "fadeUp .3s ease" : "none", ...ext }}>{children}</div>;
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab,   setTab]   = useState("login");
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState("");
  const [info,  setInfo]  = useState("");

  const iS = { width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "10px 12px 10px 36px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#fff" };
  const ic = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.35)", pointerEvents: "none" };

  const submit = async () => {
    setErr(""); setInfo("");
    if (!email.trim() || !pass.trim()) { setErr("Email and password are required."); return; }
    if (tab === "register" && !name.trim()) { setErr("Name is required."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    if (tab === "register") {
      const res = await sbAuth.signUp(email.trim(), pass, name.trim());
      if (res.error) { setErr(res.error.message || "Sign-up failed."); }
      else if (res.session) { await onAuth(res.session, res.user, true, name.trim()); }
      else if (res.user) {
        // Try immediate sign in
        const login = await sbAuth.signIn(email.trim(), pass);
        if (login.access_token) { await onAuth(login, login.user, true, name.trim()); }
        else { setInfo("✓ Account created! Sign in below."); setTab("login"); }
      } else { setErr("Sign-up failed. Please try again."); }
    } else {
      const res = await sbAuth.signIn(email.trim(), pass);
      if (res.error) { setErr(res.error.message || "Invalid credentials."); }
      else if (res.access_token) { await onAuth(res, res.user, false, ""); }
    }
    setBusy(false);
  };

  const orb = (t, l, s, c, d) => <div key={l} style={{ position: "fixed", top: t, left: l, width: s, height: s, borderRadius: "50%", background: c, filter: "blur(60px)", animation: `floatUp ${d}s ease-in-out infinite`, pointerEvents: "none" }} />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#060b17,#0d1b3e,#130825)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {orb("8%","15%","300px","rgba(99,102,241,.07)",4)}
      {orb("75%","70%","320px","rgba(236,72,153,.05)",5)}
      <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, backdropFilter: "blur(16px)", animation: "fadeUp .5s ease", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 0 36px rgba(59,130,246,.5)" }}><span style={{ color: "#fff", fontWeight: 900, fontSize: 26 }}>R</span></div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>RightSignal</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Signal over noise. Always.</p>
        </div>

        <div style={{ display: "flex", background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); setInfo(""); }} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: tab === t ? "rgba(255,255,255,.12)" : "transparent", color: tab === t ? "#fff" : "rgba(255,255,255,.4)", fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer" }}>
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {tab === "register" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", display: "block", marginBottom: 4 }}>Full Name</label>
            <div style={{ position: "relative" }}>
              <User size={14} style={ic} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma" style={iS} />
            </div>
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", display: "block", marginBottom: 4 }}>Email</label>
          <div style={{ position: "relative" }}>
            <Mail size={14} style={ic} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="you@example.com" style={iS} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", display: "block", marginBottom: 4 }}>
            Password <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(min 6 chars)</span>
          </label>
          <div style={{ position: "relative" }}>
            <Lock size={14} style={ic} />
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" style={iS} />
          </div>
        </div>

        {err  && <div style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.4)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#fca5a5" }}>{err}</div>}
        {info && <div style={{ background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.4)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#6ee7b7" }}>{info}</div>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? .7 : 1, boxShadow: "0 0 22px rgba(59,130,246,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {busy ? <><Spin size={16} /> Processing…</> : tab === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div style={{ marginTop: 14, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", margin: 0, textAlign: "center" }}>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>◈ Earn Signal tokens</span> — 1 SGN on signup, +1 if invited via referral
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step,   setStep]   = useState(0);
  const [who,    setWho]    = useState(null);
  const [ints,   setInts]   = useState([]);
  const [code,   setCode]   = useState("");
  const [codeOk, setCodeOk] = useState(null);
  const [refMap, setRefMap] = useState({});
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    db.get("rs_user_profiles", "select=id,ref_code").then(rows => {
      const m = {};
      (rows || []).forEach(r => { if (r.ref_code) m[r.ref_code] = r.id; });
      setRefMap(m);
    });
  }, []);

  const checkCode  = v => setCodeOk(v ? (!!refMap[v.toUpperCase()] && refMap[v.toUpperCase()] !== user?.id) : null);
  const toggleInt  = id => setInts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const validRef   = codeOk === true;
  const finish     = async () => { setBusy(true); await onComplete({ who, ints, refCode: validRef ? code.toUpperCase() : null, refUid: validRef ? refMap[code.toUpperCase()] : null }); };

  const cardSt = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 22, backdropFilter: "blur(16px)" };
  const nextBtn = (label, action, disabled) => (
    <button onClick={action} disabled={disabled || busy} style={{ background: disabled || busy ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 10, padding: "8px 20px", color: disabled || busy ? "rgba(255,255,255,.3)" : "#fff", fontSize: 14, fontWeight: 700, cursor: disabled || busy ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
      {busy ? <><Spin size={14} />Saving…</> : <>{label} <ChevronRight size={15} /></>}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#060b17,#0d1b3e,#130825)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <style>{`.owho:hover{transform:translateY(-3px) scale(1.04)!important} .oint:hover{transform:scale(1.06)}`}</style>
      <div style={{ width: "100%", maxWidth: 620, position: "relative", zIndex: 1, animation: "fadeUp .5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><span style={{ color: "#fff", fontWeight: 900, fontSize: 26 }}>R</span></div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: "0 0 4px" }}>Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: 0 }}>Set up your profile in 3 quick steps</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          {["Who are you?", "Interests", "Referral"].map((lbl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: i < step ? "#3b82f6" : i === step ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i <= step ? "#fff" : "rgba(255,255,255,.3)" }}>{i < step ? <Check size={11} /> : i + 1}</div>
                <span style={{ fontSize: 9, color: i === step ? "#fff" : "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>{lbl}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 1, background: i < step ? "rgba(59,130,246,.6)" : "rgba(255,255,255,.1)", margin: "0 6px", marginBottom: 18 }} />}
            </div>
          ))}
        </div>

        <div style={cardSt}>
          {step === 0 && (
            <>
              <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Who are you?</h2>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 16px" }}>Choose the role that best describes you</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {WHO_OPTS.map(o => (
                  <button key={o.id} className="owho" onClick={() => setWho(o.id)} style={{ background: who === o.id ? `${o.c}28` : "rgba(255,255,255,.04)", border: `1.5px solid ${who === o.id ? o.c : "rgba(255,255,255,.08)"}`, borderRadius: 14, padding: "10px 6px", cursor: "pointer", textAlign: "center", transition: "all .2s" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{o.e}</div>
                    <div style={{ color: who === o.id ? o.c : "#fff", fontWeight: 600, fontSize: 10 }}>{o.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>{nextBtn("Continue", () => setStep(1), !who)}</div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <button onClick={() => setStep(0)} style={{ background: "rgba(255,255,255,.08)", border: "none", borderRadius: 7, padding: "4px 7px", cursor: "pointer", color: "rgba(255,255,255,.6)", display: "flex" }}><ChevronLeft size={13} /></button>
                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Your Interests</h2>
              </div>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 14px" }}>Pick at least 3 to personalise your feed</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {INT_OPTS.map(o => { const sel = ints.includes(o.id); return (
                  <button key={o.id} onClick={() => toggleInt(o.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: sel ? `${o.c}28` : "rgba(255,255,255,.05)", border: `1.5px solid ${sel ? o.c : "rgba(255,255,255,.1)"}`, borderRadius: 99, padding: "6px 12px", cursor: "pointer", color: sel ? o.c : "rgba(255,255,255,.65)", fontSize: 12, fontWeight: sel ? 700 : 400, transition: "all .15s" }}>{o.e} {o.label}{sel && <Check size={10} />}</button>
                ); })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>{ints.length} selected {ints.length < 3 && <span style={{ color: "#f59e0b" }}>· need 3+</span>}</span>
                {nextBtn("Continue", () => setStep(2), ints.length < 3)}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <button onClick={() => setStep(1)} style={{ background: "rgba(255,255,255,.08)", border: "none", borderRadius: 7, padding: "4px 7px", cursor: "pointer", color: "rgba(255,255,255,.6)", display: "flex" }}><ChevronLeft size={13} /></button>
                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Referral Code</h2>
              </div>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 14px" }}>Have a friend's code? Both of you earn ◈ Signal tokens!</p>
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); checkCode(e.target.value); }} placeholder="Enter referral code (optional)" style={{ width: "100%", background: "rgba(255,255,255,.06)", border: `1px solid ${codeOk === true ? "#10b981" : codeOk === false && code ? "#ef4444" : "rgba(255,255,255,.1)"}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none", color: "#fff", letterSpacing: 1, fontWeight: 600, boxSizing: "border-box", marginBottom: 8 }} />
              {codeOk === true  && <p style={{ fontSize: 12, color: "#10b981", margin: "0 0 8px" }}>✓ Valid! You'll both earn +1 SGN.</p>}
              {codeOk === false && code && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 8px" }}>✗ Invalid referral code</p>}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button onClick={() => finish()} disabled={busy} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "8px 16px", color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer" }}>Skip & Enter</button>
                {nextBtn("Enter RightSignal", finish, false)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────
function PostCard({ post, me, onLike, onRepost, onComment, dk, onProfile, bals, profiles }) {
  const th = T(dk);
  const [showCmt, setShowCmt] = useState(false);
  const [cmt, setCmt] = useState("");
  const auth = profiles[post.uid] || { name: "RightSignal User", hue: "#6b7280" };
  const bal = bals[post.uid] ?? 0;

  const submit = () => { if (cmt.trim()) { onComment(post.id, cmt); setCmt(""); setShowCmt(false); } };

  return (
    <Card dk={dk}>
      <div style={{ display: "flex", gap: 10 }}>
        <div onClick={() => onProfile(post.uid)} style={{ cursor: "pointer" }}><Av profile={auth} bal={bal} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span onClick={() => onProfile(post.uid)} style={{ fontWeight: 700, fontSize: 14, color: th.txt, cursor: "pointer" }}>{auth.name}</span>
            {auth.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
            {auth.role && <span style={{ color: th.txt3, fontSize: 10, background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>{auth.role}</span>}
            {bal > 0 && <SGN n={bal} size="sm" />}
            <span style={{ color: th.txt3, fontSize: 11, marginLeft: "auto" }}>{ago(post.ts)}</span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.7, color: th.txt, whiteSpace: "pre-wrap" }}>{post.text}</p>
          {post.comments?.length > 0 && (
            <div style={{ background: th.surf2, borderRadius: 10, padding: 10, marginBottom: 8, border: `1px solid ${th.bdr}` }}>
              {post.comments.map(c => {
                const cp = profiles[c.uid] || { name: "User" };
                return (
                  <div key={c.id} style={{ display: "flex", gap: 7, marginBottom: 5 }}>
                    <div onClick={() => onProfile(c.uid)} style={{ cursor: "pointer" }}><Av profile={cp} size={20} /></div>
                    <div><span onClick={() => onProfile(c.uid)} style={{ fontWeight: 600, fontSize: 12, color: th.txt, cursor: "pointer" }}>{cp.name}: </span><span style={{ fontSize: 12, color: th.txt2 }}>{c.text}</span></div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {[
              { i: <Heart size={14} fill={post.liked ? "#ef4444" : "none"} />, v: fmt(post.likes),   a: post.liked, c: "#ef4444", fn: () => onLike(post.id)    },
              { i: <MessageCircle size={14} />,                               v: post.comments?.length || "", a: showCmt, c: "#3b82f6", fn: () => setShowCmt(x => !x) },
              { i: <Repeat2 size={14} />,                                     v: fmt(post.reposts),  a: false, c: "#10b981", fn: () => onRepost(post.id) },
              { i: <Share2 size={14} />,                                      v: "",                 a: false, c: "#8b5cf6", fn: () => { try { navigator.clipboard.writeText(window.location.href); } catch {} } },
            ].map((x, i) => (
              <button key={i} onClick={x.fn} style={{ display: "flex", alignItems: "center", gap: 4, background: x.a ? `${x.c}18` : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: x.a ? x.c : th.txt3, fontSize: 13, fontWeight: x.a ? 700 : 400 }}>{x.i}{x.v}</button>
            ))}
            <button style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: th.txt3, marginLeft: "auto" }}><Bookmark size={14} /></button>
          </div>
          {showCmt && (
            <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
              <Av profile={profiles[me] || {}} size={24} />
              <div style={{ flex: 1, display: "flex", gap: 6 }}>
                <input value={cmt} onChange={e => setCmt(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Reply…" style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "6px 10px", fontSize: 13, outline: "none", color: th.txt }} />
                <button onClick={submit} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 11px", cursor: "pointer", color: "#fff" }}><Send size={13} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── COMPOSER ────────────────────────────────────────────────────
function Composer({ me, onPost, dk, myProfile }) {
  const th = T(dk);
  const [text,    setText]    = useState("");
  const [aiMode,  setAiMode]  = useState(false);
  const [topic,   setTopic]   = useState("");
  const [aiLoad,  setAiLoad]  = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX = 280;

  const genAI = async () => {
    if (!topic.trim()) return;
    setAiLoad(true);
    const result = await callAI(`Write a compelling professional social media post about: "${topic}". Under 180 words, engaging hook, key insight, call to action. No markdown formatting.`);
    setText(result.slice(0, MAX));
    setCharCount(result.slice(0, MAX).length);
    setAiLoad(false); setAiMode(false); setTopic("");
  };
  const doPost = () => { if (text.trim()) { onPost(text); setText(""); setCharCount(0); } };
  const handleChange = e => { const v = e.target.value.slice(0, MAX); setText(v); setCharCount(v.length); };

  return (
    <Card dk={dk}>
      <div style={{ display: "flex", gap: 10 }}>
        <Av profile={myProfile || {}} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={handleChange} onKeyDown={e => e.key === "Enter" && e.metaKey && doPost()} placeholder="What signal are you sending today?" rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 12px", fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", color: th.txt, boxSizing: "border-box" }} />
          {aiMode && (
            <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
              <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && genAI()} placeholder="Topic for AI to write about…" style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "7px 10px", fontSize: 13, outline: "none", color: th.txt }} />
              <button onClick={genAI} disabled={aiLoad} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{aiLoad ? "…" : "Gen"}</button>
              <button onClick={() => setAiMode(false)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "7px 10px", fontSize: 13, cursor: "pointer", color: th.txt }}>✕</button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setAiMode(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Zap size={13} />✨ AI Write</button>
              <span style={{ fontSize: 11, color: charCount > MAX * 0.9 ? "#ef4444" : th.txt3 }}>{charCount}/{MAX}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>+1 SGN</span>
              <button onClick={doPost} disabled={!text.trim()} style={{ background: text.trim() ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "transparent", border: `1px solid ${text.trim() ? "transparent" : th.bdr}`, borderRadius: 10, padding: "6px 20px", color: text.trim() ? "#fff" : th.txt3, fontSize: 14, fontWeight: 700, cursor: text.trim() ? "pointer" : "default" }}>Post</button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── FEED VIEW ───────────────────────────────────────────────────
function FeedView({ me, dk, myProfile, onProfile, bals, profiles, earnToken, addNotif }) {
  const th = T(dk);
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("For You");

  useEffect(() => {
    (async () => {
      const [rp, ml, ac] = await Promise.all([
        db.get("rs_posts", "order=created_at.desc&limit=50"),
        db.get("rs_post_likes", `uid=eq.${me}`),
        db.get("rs_comments", "order=created_at.asc"),
      ]);
      const ls = new Set((ml || []).map(l => l.post_id));
      let rows = rp || [];
      if (!rows.length) {
        await db.postMany("rs_posts", SEED_POSTS);
        rows = await db.get("rs_posts", "order=created_at.desc&limit=50") || [];
      }
      setPosts(rows.map(p => ({ id: p.id, uid: p.uid, text: p.text, likes: p.like_count || 0, reposts: p.repost_count || 0, liked: ls.has(p.id), comments: (ac || []).filter(c => c.post_id === p.id), ts: new Date(p.created_at).getTime() })));
      setLoading(false);
    })();
  }, [me]);

  const addPost = async text => {
    const saved = await db.post("rs_posts", { uid: me, text, like_count: 0, repost_count: 0 });
    if (saved) {
      setPosts(ps => [{ id: saved.id, uid: me, text, likes: 0, reposts: 0, liked: false, comments: [], ts: Date.now() }, ...ps]);
      await earnToken(me, 1, "Posted a signal");
      addNotif({ type: "token", msg: "◈ +1 SGN — You posted a signal!" });
    }
  };

  const toggleLike = async id => {
    const p = posts.find(x => x.id === id); if (!p) return;
    const nl = !p.liked, lc = nl ? p.likes + 1 : p.likes - 1;
    setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: nl, likes: lc } : x));
    if (nl) {
      await db.post("rs_post_likes", { post_id: id, uid: me });
      // Give token to post author when liked (not self-like)
      if (p.uid !== me && p.uid !== "seed") {
        await earnToken(p.uid, 1, `${myProfile?.name || "Someone"} liked your post`);
        addNotif({ type: "like", msg: `❤ ${profiles[p.uid]?.name || "Someone"}'s post was liked — they earned ◈ +1 SGN` });
      }
    } else {
      await db.del("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
    }
    await db.patch("rs_posts", `id=eq.${id}`, { like_count: lc });
  };

  const doRepost = async id => {
    const p = posts.find(x => x.id === id); if (!p) return;
    const nc = p.reposts + 1;
    setPosts(ps => ps.map(x => x.id === id ? { ...x, reposts: nc } : x));
    await db.patch("rs_posts", `id=eq.${id}`, { repost_count: nc });
    addNotif({ type: "comment", msg: `🔁 You reposted a signal` });
  };

  const addComment = async (id, text) => {
    const saved = await db.post("rs_comments", { post_id: id, uid: me, text });
    if (saved) {
      setPosts(ps => ps.map(x => x.id === id ? { ...x, comments: [...x.comments, { ...saved, uid: me }] } : x));
      addNotif({ type: "comment", msg: `💬 You commented on a post` });
    }
  };

  const filteredPosts = tab === "Following"
    ? posts.filter(p => p.uid === me)
    : tab === "Trending"
    ? [...posts].sort((a, b) => b.likes - a.likes)
    : posts;

  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);
  return (
    <div>
      {whoOpt && (
        <div style={{ background: dk ? `linear-gradient(135deg,${whoOpt.c}18,transparent)` : `${whoOpt.c}10`, border: `1px solid ${whoOpt.c}30`, borderRadius: 16, padding: 12, marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>{whoOpt.e}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Welcome back, {myProfile.name?.split(" ")[0]}!</div>
            <div style={{ fontSize: 12, color: th.txt2 }}>Curated for {myProfile.interests?.slice(0, 3).map(id => INT_OPTS.find(x => x.id === id)?.label).filter(Boolean).join(", ")}</div>
          </div>
          <div style={{ marginLeft: "auto" }}><SGN n={bals[me] ?? 0} size="md" pulse /></div>
        </div>
      )}
      <Composer me={me} onPost={addPost} dk={dk} myProfile={myProfile} />
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["For You", "Trending", "Following"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>{t}</button>
        ))}
      </div>
      {loading ? <Spin dk={dk} msg="Loading feed…" /> : filteredPosts.length === 0 ? <p style={{ textAlign: "center", color: th.txt3, padding: 32 }}>No posts yet. Be the first! ✨</p> : filteredPosts.map(p => <PostCard key={p.id} post={p} me={me} onLike={toggleLike} onRepost={doRepost} onComment={addComment} dk={dk} onProfile={onProfile} bals={bals} profiles={profiles} />)}
    </div>
  );
}

// ─── NETWORK VIEW ────────────────────────────────────────────────
function NetworkView({ me, dk, onProfile, bals, profiles, earnToken, addNotif }) {
  const th = T(dk);
  const [aligned,  setAligned]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const others = Object.values(profiles).filter(p => p.id !== me);

  useEffect(() => {
    db.get("rs_alignments", `follower_uid=eq.${me}`).then(d => { setAligned((d || []).map(r => r.following_uid)); setLoading(false); });
  }, [me]);

  const toggle = async uid => {
    const on = aligned.includes(uid);
    setAligned(a => on ? a.filter(x => x !== uid) : [...a, uid]);
    if (on) {
      await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`);
    } else {
      await db.upsert("rs_alignments", { follower_uid: me, following_uid: uid });
      await earnToken(me, 1, `Aligned with ${profiles[uid]?.name || "someone"}`);
      addNotif({ type: "follow", msg: `👤 You aligned with ${profiles[uid]?.name || "a member"} — ◈ +1 SGN` });
    }
  };

  const filtered = others.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.handle?.toLowerCase().includes(search.toLowerCase()) || u.bio?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spin dk={dk} msg="Loading network…" />;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>People on RightSignal</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 12px" }}>{others.length} member{others.length !== 1 ? "s" : ""} · Aligning earns ◈ +1 SGN</p>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, handle, bio…" style={{ width: "100%", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
      </div>

      {filtered.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 32 }}>No members found. Invite friends using your referral link!</p>}
      {filtered.map(u => {
        const bal = bals[u.id] ?? 0;
        const on  = aligned.includes(u.id);
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
                      {u.role && <span style={{ background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{u.role}</span>}
                      {bal > 0 && <SGN n={bal} size="sm" />}
                    </div>
                    {u.handle && <div style={{ fontSize: 12, color: th.txt3 }}>@{u.handle}</div>}
                    {u.bio && <div style={{ fontSize: 13, color: th.txt, marginTop: 3 }}>{u.bio}</div>}
                  </div>
                  <button onClick={() => toggle(u.id)} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${on ? "#3b82f6" : "#111"}`, background: on ? "#3b82f618" : "#111", color: on ? "#3b82f6" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
                    {on ? <><Check size={12} />Aligned</> : "Align +◈"}
                  </button>
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
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [cat,      setCat]      = useState("All");
  const [rsvpd,    setRsvpd]    = useState(new Set());
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_events", "order=event_date.asc");
      if (!data?.length) {
        await db.postMany("rs_events", SEED_EVENTS);
        data = await db.get("rs_events", "order=event_date.asc");
      }
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  const cats  = ["All", ...new Set(events.map(e => e.category).filter(Boolean))];
  const shown = events
    .filter(e => cat === "All" || e.category === cat)
    .filter(e => !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));

  const toggleRsvp = (id, title) => {
    setRsvpd(s => {
      const next = new Set(s);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); addNotif({ type: "sandbox", msg: `📅 RSVP confirmed for: ${title}` }); }
      return next;
    });
  };

  if (loading) return <Spin dk={dk} msg="Loading events…" />;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>Free Online Events</h2>
      <p style={{ color: th.txt2, fontSize: 13, margin: "0 0 12px" }}>Curated global events · RSVP to save your spot</p>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" style={{ width: "100%", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {cats.map(c => { const col = CAT_COLORS[c] || "#6b7280"; return <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 14px", borderRadius: 99, border: `1px solid ${cat === c ? col : th.bdr}`, background: cat === c ? `${col}20` : "transparent", color: cat === c ? col : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>{c}</button>; })}
      </div>

      {shown.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 24 }}>No events found.</p>}
      {shown.map(e => {
        const col = CAT_COLORS[e.category] || "#6b7280";
        const ts  = e.event_date ? new Date(e.event_date).getTime() : Date.now();
        const isRsvp = rsvpd.has(e.id);
        return (
          <Card dk={dk} key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ background: `${col}20`, color: col, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{e.category}</span>
                  {e.is_free && <span style={{ background: "#10b98120", color: "#10b981", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>🆓 Free</span>}
                  {isRsvp && <span style={{ background: "#3b82f620", color: "#3b82f6", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>✓ RSVP'd</span>}
                  <span style={{ color: th.txt3, fontSize: 11 }}>{e.source}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>{e.title}</h3>
                <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 8px", lineHeight: 1.5 }}>{e.description}</p>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: th.txt3, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} />{fmtDate(ts)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Globe size={11} />{e.timezone}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={11} />{fmt(e.popularity || 0)} interested</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleRsvp(e.id, e.title)} style={{ background: isRsvp ? "#3b82f618" : "#3b82f6", color: isRsvp ? "#3b82f6" : "#fff", border: `1px solid ${isRsvp ? "#3b82f6" : "transparent"}`, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: isRsvp ? "none" : "0 0 12px rgba(59,130,246,.3)" }}>
                  {isRsvp ? "✓ RSVP'd" : "RSVP"}
                </button>
                <a href={e.url || "#"} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "transparent", color: th.txt2, border: `1px solid ${th.bdr}`, padding: "5px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                  Info <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── SANDBOX VIEW ────────────────────────────────────────────────
function SandboxView({ me, dk, earnToken, addNotif }) {
  const th = T(dk);
  const [tab,        setTab]        = useState("overview");
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [aiLoad,     setAiLoad]     = useState(false);
  const [aiFb,       setAiFb]       = useState("");
  const [form,       setForm]       = useState({ title: "", problem: "", solution: "", audience: "", link: "" });
  const [filter,     setFilter]     = useState("all");
  const phaseIdx = PHASES.indexOf(SB_CYCLE.phase);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const canSubmit = form.title.trim() && form.problem.trim() && form.solution.trim();

  const load = useCallback(async () => {
    setLoading(true);
    let data = await db.get("rs_sandbox", "order=created_at.desc&limit=50");
    if (!data?.length) {
      await db.postMany("rs_sandbox", SEED_SANDBOX);
      data = await db.get("rs_sandbox", "order=created_at.desc&limit=50");
    }
    setSubs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const saved = await db.post("rs_sandbox", { uid: me, title: form.title.trim(), problem: form.problem.trim(), solution: form.solution.trim(), audience: form.audience.trim(), link: form.link.trim(), status: "submitted" });
    if (saved) {
      setSubs(p => [saved, ...p]);
      setForm({ title: "", problem: "", solution: "", audience: "", link: "" });
      setAiFb("");
      setSubmitted(true);
      await earnToken(me, 3, "Submitted startup idea to Sandbox");
      addNotif({ type: "sandbox", msg: "💡 Sandbox idea submitted — ◈ +3 SGN earned!" });
      setTab("leaderboard");
    }
    setSubmitting(false);
  };

  const getAIReview = async () => {
    if (!form.title.trim() || !form.problem.trim()) return;
    setAiLoad(true);
    setAiFb(await callAI(`Analyze this startup idea in exactly 3 sections labeled "✅ Strengths:", "⚠️ Risks:", "💡 Improvements:". Be specific and actionable.\n\nTitle: ${form.title}\nProblem: ${form.problem}\nSolution: ${form.solution}\nAudience: ${form.audience}`));
    setAiLoad(false);
  };

  const statusColors = { submitted:"#6b7280", shortlisted_50:"#3b82f6", shortlisted_30:"#8b5cf6", shortlisted_15:"#f59e0b", finalist_10:"#10b981", winner:"#f97316", rejected:"#ef4444" };
  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt };

  const filtered = filter === "all" ? subs : subs.filter(s => s.status === filter);

  return (
    <div>
      {/* Banner */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#5b21b6)", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 0 40px rgba(91,33,182,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}><Award size={17} style={{ color: "rgba(255,255,255,.8)" }} /><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1 }}>ACTIVE PROGRAM</span></div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 2px", color: "#fff" }}>{SB_CYCLE.title}</h2>
            <p style={{ color: "rgba(255,255,255,.55)", fontSize: 13, margin: 0 }}>Submit your idea · Earn ◈ +3 SGN · Win prizes</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.55)" }}>PHASE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Week {phaseIdx + 1}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{PH_LABEL[SB_CYCLE.phase]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
          {PHASES.map((p, i) => (
            <div key={p} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ flex: 1, height: 2, background: i <= phaseIdx ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.2)", borderRadius: 2 }} />
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= phaseIdx ? "#fff" : "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: i < phaseIdx ? "#5b21b6" : "#1e3a8a", fontWeight: 700, fontSize: 9 }}>{i < phaseIdx ? <Check size={10} /> : i + 1}</div>
            </div>
          ))}
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,.2)", borderRadius: 2 }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["overview", "submit", "leaderboard"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all .2s" }}>
            {t}{t === "leaderboard" && subs.length > 0 ? ` (${subs.length})` : ""}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { e: "📋", t: "Week 1 — Idea Evaluation",  d: "Scored on clarity, originality & feasibility. Top 50 advance.",  ok: phaseIdx >= 0 },
            { e: "🗣️", t: "Week 2 — Interviews",       d: "Top 50 pitch to interviewers. Top 20–30 selected.",               ok: phaseIdx >= 1 },
            { e: "🔨", t: "Week 3 — Refinement",       d: "Mentor feedback. Participants improve. Top 15 selected.",          ok: phaseIdx >= 2 },
            { e: "🏆", t: "Week 4 — Final Selection",  d: "Panel review of top 15. Top 10 finalists announced.",              ok: phaseIdx >= 3 },
            { e: "⚡", t: "Hackathon Day — 24h Build",  d: "Build a working prototype. Judged on completeness & innovation.", ok: phaseIdx >= 4 },
          ].map((s, i) => (
            <div key={i} style={{ background: s.ok ? th.surf : th.surf2, border: `1px solid ${s.ok ? "#3b82f630" : th.bdr}`, borderRadius: 14, padding: 14, opacity: s.ok ? 1 : .55 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>{s.e}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, color: th.txt, marginBottom: 2 }}>{s.t}</div><div style={{ fontSize: 13, color: th.txt2 }}>{s.d}</div></div>
                {i < phaseIdx && <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />}
                {i === phaseIdx && <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", background: "#3b82f618", padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>ACTIVE</span>}
              </div>
            </div>
          ))}
          <button onClick={() => setTab("submit")} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 20px rgba(59,130,246,.3)" }}>
            Submit Your Idea → Earn ◈ +3 SGN
          </button>
        </div>
      )}

      {/* Submit */}
      {tab === "submit" && (
        submitted ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: th.txt }}>Idea Submitted!</h3>
            <p style={{ color: th.txt2, fontSize: 14 }}>Saved to Supabase. You earned ◈ +3 SGN!</p>
            <button onClick={() => { setSubmitted(false); setTab("leaderboard"); }} style={{ marginTop: 16, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600 }}>View Leaderboard →</button>
          </div>
        ) : (
          <Card dk={dk} anim={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: th.txt }}>Submit Your Startup Idea</h3>
              <span style={{ background: "#10b98118", color: "#10b981", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>◈ +3 SGN reward</span>
            </div>
            {[
              { k: "title",    l: "Idea Title *",             p: "e.g. FarmLedger",              m: false },
              { k: "problem",  l: "Problem Statement *",      p: "What problem are you solving?", m: true  },
              { k: "solution", l: "Your Solution *",          p: "How does your product solve it?",m: true  },
              { k: "audience", l: "Target Audience",          p: "Who are your primary users?",   m: false },
              { k: "link",     l: "Pitch Deck / Links (opt)", p: "https://…",                     m: false },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{f.l}</label>
                {f.m ? <textarea value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} /> : <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={inp} />}
              </div>
            ))}
            {aiFb && <div style={{ background: dk ? "rgba(6,182,212,.08)" : "#f0f9ff", border: "1px solid #06b6d430", borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.8, color: dk ? "#67e8f9" : "#0c4a6e", whiteSpace: "pre-wrap" }}>{aiFb}</div>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ background: canSubmit && !submitting ? "#3b82f6" : "transparent", border: `1px solid ${canSubmit && !submitting ? "transparent" : th.bdr}`, borderRadius: 10, padding: "8px 20px", color: canSubmit && !submitting ? "#fff" : th.txt3, fontSize: 14, fontWeight: 600, cursor: canSubmit && !submitting ? "pointer" : "default", display: "flex", alignItems: "center", gap: 8 }}>
                {submitting ? <><Spin size={14} />Saving…</> : "Submit Idea"}
              </button>
              <button onClick={getAIReview} disabled={!form.title.trim() || !form.problem.trim() || aiLoad} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!form.title.trim() || !form.problem.trim()) ? .45 : 1 }}>
                <Zap size={13} />{aiLoad ? "Analysing…" : "✨ AI Review"}
              </button>
            </div>
          </Card>
        )
      )}

      {/* Leaderboard */}
      {tab === "leaderboard" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: th.txt }}>All Submissions {subs.length > 0 && `(${subs.length})`}</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {["all","submitted","finalist_10","winner"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 10px", borderRadius: 99, border: `1px solid ${filter === f ? "#3b82f6" : th.bdr}`, background: filter === f ? "#3b82f620" : "transparent", color: filter === f ? "#3b82f6" : th.txt2, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {f === "all" ? "All" : f === "submitted" ? "Pending" : f === "finalist_10" ? "Finalists" : "Winners"}
                </button>
              ))}
              <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: th.txt2 }}><RefreshCw size={11} /></button>
            </div>
          </div>
          {loading ? <Spin dk={dk} msg="Loading…" /> : filtered.length === 0 ? <p style={{ color: th.txt3, textAlign: "center", padding: 32 }}>No submissions.</p> : filtered.map((s, i) => {
            const sc = s.score_w3 || s.score_w2 || s.score_w1 || null;
            const medals = ["#fbbf24","#94a3b8","#cd7f32"];
            const stCol = statusColors[s.status] || "#6b7280";
            return (
              <Card dk={dk} key={s.id} style={{ border: `1px solid ${i === 0 ? "#fbbf2440" : th.bdr}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: medals[i] || th.bdr, display: "flex", alignItems: "center", justifyContent: "center", color: i < 3 ? "#fff" : th.txt2, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{s.title}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {sc && <span style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>⭐{parseFloat(sc).toFixed(1)}</span>}
                        <span style={{ background: `${stCol}18`, color: stCol, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{ST_LABEL[s.status] || s.status}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 4px", lineHeight: 1.5 }}>{s.problem}</p>
                    {s.solution && <p style={{ fontSize: 12, color: th.txt3, margin: 0, lineHeight: 1.4 }}>💡 {s.solution}</p>}
                    {(s.score_w1 || s.score_w2 || s.score_w3) && (
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: th.txt3, marginTop: 6 }}>
                        {s.score_w1 && <span>W1: {s.score_w1}</span>}{s.score_w2 && <span>W2: {s.score_w2}</span>}{s.score_w3 && <span>W3: {s.score_w3}</span>}
                      </div>
                    )}
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
function ContributeView({ me, dk, earnToken, addNotif }) {
  const th = T(dk);
  const [contribs, setContribs] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [sort,     setSort]     = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ type: "article", title: "", body: "" });
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [cs, mv] = await Promise.all([db.get("rs_contributions", "order=created_at.desc&limit=50"), db.get("rs_contrib_votes", `uid=eq.${me}`)]);
    const vmap = {};
    (mv || []).forEach(v => { vmap[v.contribution_id] = v.vote_type; });
    let rows = cs || [];
    if (!rows.length) {
      await db.postMany("rs_contributions", SEED_CONTRIBS);
      rows = await db.get("rs_contributions", "order=created_at.desc&limit=50") || [];
    }
    setContribs(rows.map(c => ({ ...c, voted: vmap[c.id] || null })));
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  const vote = async (id, dir) => {
    const c = contribs.find(x => x.id === id); if (!c) return;
    const prev = c.voted, next = prev === dir ? null : dir;
    let u = c.upvotes || 0, d = c.downvotes || 0;
    if (prev === "up")   u--; if (prev === "down") d--;
    if (next === "up")   u++; if (next === "down") d++;
    setContribs(cs => cs.map(x => x.id === id ? { ...x, voted: next, upvotes: u, downvotes: d } : x));
    if (next === null) await db.del("rs_contrib_votes", `contribution_id=eq.${id}&uid=eq.${me}`);
    else               await db.upsert("rs_contrib_votes", { contribution_id: id, uid: me, vote_type: next });
    await db.patch("rs_contributions", `id=eq.${id}`, { upvotes: u, downvotes: d });
    if (next === "up" && c.uid !== me && c.uid !== "seed") {
      await earnToken(c.uid, 1, "Your contribution was upvoted");
    }
  };

  const submit = async () => {
    setFormErr("");
    if (!form.title.trim()) { setFormErr("Title is required."); return; }
    if (!form.body.trim())  { setFormErr("Description is required."); return; }
    setSaving(true);
    const saved = await db.post("rs_contributions", { uid: me, type: form.type, title: form.title.trim(), body: form.body.trim(), upvotes: 0, downvotes: 0 });
    if (saved) {
      setContribs(cs => [{ ...saved, voted: null }, ...cs]);
      setForm({ type: "article", title: "", body: "" });
      setShowForm(false);
      await earnToken(me, 2, `Published a ${form.type}`);
      addNotif({ type: "token", msg: `◈ +2 SGN — Published a ${form.type}!` });
    } else { setFormErr("Failed to save. Please try again."); }
    setSaving(false);
  };

  let shown = filter === "all" ? contribs : contribs.filter(c => c.type === filter);
  shown = [...shown].sort((a, b) => sort === "top" ? ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0)) : new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 2px", color: th.txt }}>Contributions</h2>
          <p style={{ color: th.txt2, fontSize: 13, margin: 0 }}>Publish articles, tools & ideas · Earn ◈ +2 SGN</p>
        </div>
        <button onClick={() => { setShowForm(x => !x); setFormErr(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: showForm ? th.surf2 : "#3b82f6", color: showForm ? th.txt : "#fff", border: `1px solid ${showForm ? th.bdr : "transparent"}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? <><X size={13} />Cancel</> : <><Plus size={13} />Contribute</>}
        </button>
      </div>

      {showForm && (
        <Card dk={dk} style={{ marginBottom: 16 }} anim={false}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: th.txt }}>New Contribution</h3>
            <span style={{ background: "#10b98118", color: "#10b981", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>◈ +2 SGN</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["article","tool","idea"].map(t => { const col = TYP_COLORS[t]; return <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))} style={{ padding: "6px 16px", borderRadius: 99, border: `1.5px solid ${form.type === t ? col : th.bdr}`, background: form.type === t ? `${col}20` : "transparent", color: form.type === t ? col : th.txt2, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", transition: "all .15s" }}>{t}</button>; })}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter a descriptive title…" style={{ width: "100%", background: th.inp, border: `1px solid ${!form.title.trim() && formErr ? "#ef4444" : th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", color: th.txt }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Description *</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Describe your contribution in detail…" rows={5} style={{ width: "100%", background: th.inp, border: `1px solid ${!form.body.trim() && formErr ? "#ef4444" : th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: th.txt }} />
          </div>
          {formErr && <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 10px" }}>{formErr}</p>}
          <button onClick={submit} disabled={saving} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "9px 22px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? .7 : 1 }}>
            {saving ? <><Spin size={14} />Saving…</> : "Publish Contribution"}
          </button>
        </Card>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, flex: 1, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
          {["all","article","tool","idea"].map(f => { const col = TYP_COLORS[f] || "#3b82f6"; return <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px", borderRadius: 9, border: "none", background: filter === f ? `${col}22` : "transparent", color: filter === f ? col : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all .2s" }}>{f === "all" ? "All" : f}</button>; })}
        </div>
        <div style={{ display: "flex", gap: 4, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
          {["newest","top"].map(s => <button key={s} onClick={() => setSort(s)} style={{ padding: "6px 12px", borderRadius: 9, border: "none", background: sort === s ? "#3b82f6" : "transparent", color: sort === s ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{s}</button>)}
        </div>
      </div>

      {loading ? <Spin dk={dk} msg="Loading…" /> : shown.length === 0 ? <p style={{ textAlign: "center", color: th.txt3, padding: 32 }}>No contributions yet.</p> : shown.map(c => {
        const col = TYP_COLORS[c.type] || "#3b82f6";
        const score = (c.upvotes || 0) - (c.downvotes || 0);
        return (
          <Card dk={dk} key={c.id}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 36 }}>
                <button onClick={() => vote(c.id, "up")} style={{ background: c.voted === "up" ? "#10b98118" : "none", border: "none", cursor: "pointer", color: c.voted === "up" ? "#10b981" : th.txt3, padding: "4px", borderRadius: 6, display: "flex" }}><ThumbsUp size={15} fill={c.voted === "up" ? "currentColor" : "none"} /></button>
                <span style={{ fontSize: 14, fontWeight: 700, color: score > 0 ? "#10b981" : score < 0 ? "#ef4444" : th.txt, lineHeight: 1 }}>{score}</span>
                <button onClick={() => vote(c.id, "down")} style={{ background: c.voted === "down" ? "#ef444418" : "none", border: "none", cursor: "pointer", color: c.voted === "down" ? "#ef4444" : th.txt3, padding: "4px", borderRadius: 6, display: "flex" }}><ThumbsDown size={15} fill={c.voted === "down" ? "currentColor" : "none"} /></button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ background: `${col}20`, color: col, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, textTransform: "capitalize" }}>{c.type}</span>
                  {c.created_at && <span style={{ fontSize: 11, color: th.txt3 }}>· {ago(new Date(c.created_at).getTime())}</span>}
                  {c.uid !== "seed" && <span style={{ fontSize: 10, color: "#10b981" }}>◈ community</span>}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 5px", color: th.txt, lineHeight: 1.3 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: th.txt2, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── WALLET VIEW ──────────────────────────────────────────────────
function WalletView({ me, bals, setBals, dk, myProfile }) {
  const th = T(dk);
  const balance  = bals[me] ?? 0;
  const refCode  = myProfile?.ref_code || "";
  const refLink  = `${window.location.origin}?ref=${refCode}`;
  const [wallet,    setWallet]    = useState(null);
  const [loadW,     setLoadW]     = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [showKey,   setShowKey]   = useState(false);
  const [txs,       setTxs]       = useState([]);
  const [redAmt,    setRedAmt]    = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg,       setMsg]       = useState("");

  useEffect(() => {
    (async () => {
      const [w, t] = await Promise.all([db.get("rs_wallets", `uid=eq.${me}`), db.get("rs_token_txns", `uid=eq.${me}&order=created_at.desc&limit=20`)]);
      setWallet(w?.[0] || null);
      setTxs(t || []);
      setLoadW(false);
    })();
  }, [me]);

  const createWallet = async () => {
    setCreating(true);
    const addr = "0x" + hexStr(40), pk = hexStr(64);
    const saved = await db.upsert("rs_wallets", { uid: me, address: addr, private_key: pk });
    if (saved) setWallet(saved);
    setCreating(false);
  };

  const redeem = async () => {
    const amt = parseInt(redAmt);
    if (!amt || amt <= 0 || amt > balance || !wallet) return;
    setRedeeming(true); setMsg("");
    const nb = balance - amt;
    await Promise.all([
      db.upsert("rs_token_balances", { uid: me, balance: nb }),
      db.post("rs_token_txns", { uid: me, type: "redeem", amount: -amt, description: `Redeemed to ${wallet.address.slice(0, 10)}…` }),
    ]);
    setBals(b => ({ ...b, [me]: nb }));
    setTxs(t => [{ id: genId(), type: "redeem", amount: -amt, description: `Redeemed to ${wallet.address.slice(0, 10)}…`, created_at: new Date().toISOString() }, ...t]);
    setMsg(`✓ ${amt} SGN redeemed successfully!`);
    setRedAmt(""); setRedeeming(false);
  };

  const earnedTotal = txs.filter(t => t.type === "earn").reduce((s, t) => s + (t.amount || 0), 0);
  const redeemedTotal = txs.filter(t => t.type === "redeem").reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(245,158,11,.4)", fontSize: 24 }}>◈</div>
        <div><h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 2px", color: th.txt }}>Signal Wallet</h2><p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>Earn SGN by posting, contributing, aligning & more</p></div>
      </div>

      {/* Balance Card */}
      <div style={{ background: "linear-gradient(135deg,#78350f,#b45309,#d97706)", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 0 40px rgba(245,158,11,.25)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1, marginBottom: 4 }}>TOTAL BALANCE</div>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 4 }}>◈ {balance} <span style={{ fontSize: 18, opacity: .7 }}>SGN</span></div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          {[{ l: "Balance", v: balance }, { l: "Redeemed", v: redeemedTotal }, { l: "Earned", v: earnedTotal }].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn */}
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>◈ How to Earn SGN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { e: "📝", l: "Post a signal", v: "+1 SGN" },
            { e: "👥", l: "Align with someone", v: "+1 SGN" },
            { e: "📚", l: "Publish contribution", v: "+2 SGN" },
            { e: "💡", l: "Submit sandbox idea", v: "+3 SGN" },
            { e: "❤", l: "Your post gets liked", v: "+1 SGN" },
            { e: "👍", l: "Your contrib upvoted", v: "+1 SGN" },
            { e: "🔗", l: "Refer a friend", v: "+1 SGN" },
            { e: "🎁", l: "Signup bonus", v: "+1 SGN" },
          ].map((r, i) => (
            <div key={i} style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{r.e}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: th.txt, fontWeight: 600 }}>{r.l}</div></div>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{r.v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral */}
      <Card dk={dk} anim={false}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Gift size={15} style={{ color: "#f59e0b" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Your Referral Link</span>
          <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>◈ +1 SGN each</span>
        </div>
        <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 10px" }}>Share your link — <strong style={{ color: th.txt }}>you both earn 1 SGN</strong> when they join.</p>
        <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Link size={12} style={{ color: th.txt3, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: th.txt2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{refLink}</span>
          <CopyBtn text={refLink} label="Copy Link" />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: th.txt3 }}>Your code:</span>
          <span style={{ background: "#f59e0b18", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 8, letterSpacing: 1, fontFamily: "monospace" }}>{refCode || "—"}</span>
          {refCode && <CopyBtn text={refCode} />}
        </div>
      </Card>

      {/* Wallet */}
      <Card dk={dk} anim={false}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Wallet size={15} style={{ color: "#3b82f6" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>On-Chain Wallet</span>
          {wallet && <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>● Connected</span>}
        </div>
        {loadW ? <Spin size={24} dk={dk} /> : !wallet ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
            <p style={{ fontSize: 14, color: th.txt2, margin: "0 0 4px" }}>Create a wallet to redeem your Signal tokens</p>
            <button onClick={createWallet} disabled={creating} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 10, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, opacity: creating ? .7 : 1 }}>
              {creating ? <><Spin size={15} />Creating…</> : <><Wallet size={15} />Create Signal Wallet</>}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>WALLET ADDRESS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#10b981", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wallet.address}</span>
                <CopyBtn text={wallet.address} />
              </div>
            </div>
            <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3 }}>PRIVATE KEY</div>
                <button onClick={() => setShowKey(x => !x)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}>{showKey ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              </div>
              {showKey ? <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "monospace", wordBreak: "break-all" }}>{wallet.private_key}</span> : <span style={{ fontSize: 12, color: th.txt3 }}>••••••••••••••••••••••••••••••••</span>}
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6 }}><AlertCircle size={11} style={{ color: "#f59e0b" }} /><span style={{ fontSize: 11, color: "#f59e0b" }}>Never share your private key</span></div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Redeem SGN · Balance: <strong style={{ color: "#f59e0b" }}>◈ {balance}</strong></label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input type="number" value={redAmt} onChange={e => setRedAmt(e.target.value)} placeholder="Amount" min="1" max={balance} style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 14, outline: "none", color: th.txt }} />
              <button onClick={redeem} disabled={redeeming || !redAmt || parseInt(redAmt) <= 0 || parseInt(redAmt) > balance} style={{ background: (!redAmt || parseInt(redAmt) <= 0 || parseInt(redAmt) > balance) ? "transparent" : "linear-gradient(135deg,#f59e0b,#f97316)", border: `1px solid ${(!redAmt || parseInt(redAmt) <= 0 || parseInt(redAmt) > balance) ? "#f59e0b44" : "transparent"}`, borderRadius: 10, padding: "8px 18px", color: (!redAmt || parseInt(redAmt) <= 0 || parseInt(redAmt) > balance) ? "#f59e0b" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: 90 }}>
                {redeeming ? <Spin size={14} /> : "Redeem"}
              </button>
            </div>
            {msg && <p style={{ fontSize: 12, color: msg.startsWith("✓") ? "#10b981" : "#ef4444", margin: 0 }}>{msg}</p>}
          </div>
        )}
      </Card>

      {/* Tx History */}
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>Transaction History</h3>
        {txs.length === 0 ? <p style={{ color: th.txt3, fontSize: 13, textAlign: "center", padding: 16 }}>No transactions yet. Start earning!</p> : txs.map(tx => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T(dk).bdr}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: tx.type === "earn" ? "#10b98118" : "#ef444418", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{tx.type === "earn" ? "◈" : "↑"}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: T(dk).txt }}>{tx.description}</div><div style={{ fontSize: 11, color: T(dk).txt3 }}>{ago(new Date(tx.created_at).getTime())}</div></div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: tx.amount > 0 ? "#10b981" : "#ef4444" }}>{tx.amount > 0 ? "+" : ""}{tx.amount} SGN</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── PROFILE VIEW ────────────────────────────────────────────────
function ProfileView({ uid: userId, me, dk, onBack, bals, profiles, setBals }) {
  const th = T(dk);
  const p       = profiles[userId] || { name: "User", bio: "", role: "Member" };
  const isMe    = userId === me;
  const balance = bals[userId] ?? 0;
  const refCode = p.ref_code || "";
  const refLink = `${window.location.origin}?ref=${refCode}`;
  const [aligned,  setAligned]  = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [bio,      setBio]      = useState(p.bio || "");
  const [posts,    setPosts]    = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [ps, al] = await Promise.all([
        db.get("rs_posts", `uid=eq.${userId}&order=created_at.desc&limit=10`),
        isMe ? Promise.resolve([]) : db.get("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${userId}`),
      ]);
      const mapped = (ps || []).map(x => ({ ...x, ts: new Date(x.created_at).getTime() }));
      setPosts(mapped);
      setPostCount(mapped.length);
      if (!isMe) setAligned((al || []).length > 0);
      setLoadingP(false);
    })();
  }, [userId, me, isMe]);

  const saveEdit = async () => {
    await db.patch("rs_user_profiles", `id=eq.${userId}`, { bio: bio.trim(), updated_at: new Date().toISOString() });
    setEditing(false);
  };
  const toggleAlign = async () => {
    const now = !aligned; setAligned(now);
    if (now) await db.upsert("rs_alignments", { follower_uid: me, following_uid: userId });
    else     await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${userId}`);
  };

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 12px" }}><ArrowLeft size={15} /> Back</button>
      <div style={{ background: `linear-gradient(135deg,${p.hue || "#3b82f6"}cc,${p.hue || "#3b82f6"}44,transparent)`, borderRadius: 16, height: 110, position: "relative", marginBottom: 44, border: `1px solid ${th.bdr}` }}>
        <div style={{ position: "absolute", bottom: -32, left: 16 }}><Av profile={p} size={72} /></div>
        <div style={{ position: "absolute", top: 10, right: 12 }}><SGN n={balance} size="md" pulse={balance > 0} /></div>
        <div style={{ position: "absolute", bottom: 10, right: 12 }}>
          {isMe ? (
            <button onClick={() => setEditing(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Edit3 size={12} />Edit Bio</button>
          ) : (
            <button onClick={toggleAlign} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${aligned ? "#3b82f6" : "#111"}`, background: aligned ? "#3b82f618" : "#111", color: aligned ? "#3b82f6" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              {aligned ? <><Check size={12} />Aligned</> : "Align"}
            </button>
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

        <div style={{ background: "linear-gradient(135deg,#92400e18,#d9770618)", border: "1px solid #f59e0b30", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex" }}>
          {[
            { l: "Balance", v: `◈ ${balance} SGN`, c: "#f59e0b" },
            { l: "Posts", v: postCount, c: "#3b82f6" },
            { l: "Joined", v: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—", c: "#10b981" }
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid #f59e0b20" : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: th.txt3, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {editing && isMe ? (
          <div style={{ marginBottom: 12 }}>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Write a short bio…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 10px", fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: th.txt, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEdit} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: th.txt }}>Cancel</button>
            </div>
          </div>
        ) : <p style={{ fontSize: 14, color: th.txt2, margin: "0 0 8px", lineHeight: 1.6 }}>{bio || (isMe ? "Add a bio to tell people about yourself." : "No bio yet.")}</p>}

        {p.who && (() => { const wo = WHO_OPTS.find(w => w.id === p.who); return wo ? <div style={{ marginBottom: 10 }}><span style={{ background: `${wo.c}18`, border: `1px solid ${wo.c}30`, color: wo.c, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>{wo.e} {wo.label}</span></div> : null; })()}

        {p.interests?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {p.interests.map(id => { const opt = INT_OPTS.find(x => x.id === id); return opt ? <span key={id} style={{ background: `${opt.c}18`, color: opt.c, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{opt.e} {opt.label}</span> : null; })}
          </div>
        )}

        {refCode && isMe && (
          <Card dk={dk} style={{ border: "1px solid #f59e0b30" }} anim={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: th.txt, marginBottom: 4 }}>◈ Your Referral Code</div>
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

        <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>Posts {posts.length > 0 && `(${posts.length})`}</h3>
          {loadingP ? <Spin size={24} dk={dk} /> : posts.length === 0 ? <p style={{ color: th.txt3, fontSize: 14, textAlign: "center", padding: 16 }}>No posts yet.</p> : posts.map(post => (
            <div key={post.id} style={{ background: th.surf2, borderRadius: 12, padding: 12, marginBottom: 10, border: `1px solid ${th.bdr}` }}>
              <p style={{ fontSize: 13, color: th.txt, margin: "0 0 8px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.text.length > 200 ? post.text.slice(0, 200) + "…" : post.text}</p>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: th.txt3 }}><span>❤ {fmt(post.like_count || 0)}</span><span>🔁 {fmt(post.repost_count || 0)}</span><span>{ago(post.ts)}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────
function AdminView({ dk, bals, profiles }) {
  const th = T(dk);
  const [stats, setStats] = useState({ posts: 0, sandbox: 0, contribs: 0, events: 0, alignments: 0, txns: 0 });
  const total = Object.values(bals).reduce((s, v) => s + v, 0);

  useEffect(() => {
    Promise.all([
      db.get("rs_posts","select=id"), db.get("rs_sandbox","select=id"),
      db.get("rs_contributions","select=id"), db.get("rs_events","select=id"),
      db.get("rs_alignments","select=id"), db.get("rs_token_txns","select=id"),
    ]).then(([p,s,c,e,a,t]) => setStats({ posts: p.length, sandbox: s.length, contribs: c.length, events: e.length, alignments: a.length, txns: t.length }));
  }, []);

  const sortedProfiles = Object.values(profiles).sort((a, b) => (bals[b.id] ?? 0) - (bals[a.id] ?? 0));
  const medals = ["🥇","🥈","🥉"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 2px", color: th.txt }}>Admin Dashboard</h2><p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>Live platform overview · Supabase</p></div>
        <span style={{ background: "#f59e0b18", color: "#f59e0b", padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Shield size={11} />Admin</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Registered Users", v: Object.keys(profiles).length, c: "#3b82f6", e: "👥" },
          { l: "Posts", v: stats.posts, c: "#10b981", e: "📝" },
          { l: "Sandbox Ideas", v: stats.sandbox, c: "#8b5cf6", e: "💡" },
          { l: "Contributions", v: stats.contribs, c: "#f97316", e: "📚" },
          { l: "Alignments", v: stats.alignments, c: "#06b6d4", e: "👥" },
          { l: "SGN Distributed", v: `◈ ${total}`, c: "#f59e0b", e: "◈" },
        ].map(t => (
          <div key={t.l} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14, boxShadow: dk ? `0 0 20px ${t.c}15` : "0 2px 8px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: th.txt2 }}>{t.l}</span><span style={{ fontSize: 18 }}>{t.e}</span></div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.c }}>{t.v}</div>
          </div>
        ))}
      </div>
      <Card dk={dk} anim={false}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>◈ SGN Token Leaderboard</h3>
        {sortedProfiles.length === 0 ? <p style={{ color: th.txt3, textAlign: "center", padding: 16 }}>No registered users yet.</p> : sortedProfiles.map((u, i) => {
          const bal = bals[u.id] ?? 0;
          return (
            <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${th.bdr}` }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{medals[i] || `${i + 1}`}</span>
              <Av profile={u} size={32} bal={bal} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13, color: th.txt }}>{u.name}</div><div style={{ fontSize: 11, color: th.txt3 }}>{u.email || u.handle}</div></div>
              <SGN n={bal} size="md" />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────
function RightPanel({ dk, myProfile, onProfile, bals, onWallet, profiles, me, earnToken, addNotif }) {
  const th = T(dk);
  const [adIdx,    setAdIdx]    = useState(0);
  const [aligned,  setAligned]  = useState([]);
  const [loadingA, setLoadingA] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setAdIdx(i => (i + 1) % ADS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    db.get("rs_alignments", `follower_uid=eq.${me}`).then(d => {
      setAligned((d || []).map(r => r.following_uid));
      setLoadingA(false);
    });
  }, [me]);

  const toggleAlign = async uid => {
    const on = aligned.includes(uid);
    setAligned(a => on ? a.filter(x => x !== uid) : [...a, uid]);
    if (on) {
      await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`);
    } else {
      await db.upsert("rs_alignments", { follower_uid: me, following_uid: uid });
      await earnToken(me, 1, `Aligned with ${profiles[uid]?.name || "someone"}`);
      addNotif({ type: "follow", msg: `👤 Aligned with ${profiles[uid]?.name || "a member"} — ◈ +1 SGN` });
    }
  };

  const ad     = ADS[adIdx];
  const myBal  = bals[myProfile?.id || ""] ?? 0;
  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);
  const others = Object.values(profiles).filter(p => p.id !== me).slice(0, 5);

  return (
    <div style={{ width: 226, flexShrink: 0 }}>
      {/* Token widget */}
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

      {/* Ad */}
      <div style={{ background: ad.g, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: 1, marginBottom: 4 }}>SPONSORED</div>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: "#fff" }}>{ad.h}</div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.8)", margin: "0 0 10px", lineHeight: 1.5 }}>{ad.b}</p>
        <button style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 8, padding: "4px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{ad.cta}</button>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>{ADS.map((_, i) => <div key={i} style={{ width: i === adIdx ? 14 : 5, height: 4, borderRadius: 99, background: i === adIdx ? "#fff" : "rgba(255,255,255,.35)", transition: "all .3s" }} />)}</div>
      </div>

      {/* Trending */}
      <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: th.txt }}>🔥 Trending</div>
        {TRENDING.map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < TRENDING.length - 1 ? `1px solid ${th.bdr}` : "none" }}>
            <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>{t}</span>
            <span style={{ fontSize: 10, color: th.txt3 }}>{(i + 1) * 143 + 57}</span>
          </div>
        ))}
      </div>

      {/* Who to align */}
      <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: th.txt }}>Who to Align with</div>
        {others.length === 0 ? <p style={{ fontSize: 12, color: th.txt3, textAlign: "center", padding: "8px 0" }}>Invite friends to grow the network!</p> : others.map(u => {
          const bal = bals[u.id] ?? 0;
          const on  = aligned.includes(u.id);
          return (
            <div key={u.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div onClick={() => onProfile(u.id)} style={{ cursor: "pointer" }}><Av profile={u} size={30} bal={bal} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => onProfile(u.id)} style={{ fontSize: 12, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{u.name}</div>
                <div style={{ fontSize: 10, color: th.txt3 }}>{bal > 0 ? <span style={{ color: "#f59e0b" }}>◈ {bal} SGN</span> : u.role}</div>
              </div>
              <button onClick={() => toggleAlign(u.id)} style={{ background: on ? "#3b82f618" : "#111", color: on ? "#3b82f6" : "#fff", border: `1.5px solid ${on ? "#3b82f6" : "#111"}`, borderRadius: 7, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{on ? "✓" : "Align"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NOTIF PANEL ─────────────────────────────────────────────────
function NotifPanel({ notifs, setNotifs, onClose, dk }) {
  const th    = T(dk);
  const icons = { like: "❤", follow: "👤", comment: "💬", sandbox: "💡", mention: "@", token: "◈" };
  return (
    <div style={{ position: "absolute", top: 52, right: 0, width: 300, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, boxShadow: `0 20px 60px rgba(0,0,0,${dk ? .5 : .12})`, zIndex: 100, backdropFilter: "blur(12px)", maxHeight: 420, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${th.bdr}`, position: "sticky", top: 0, background: th.surf }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Notifications</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setNotifs(ns => ns.map(n => ({ ...n, read: true })))} style={{ fontSize: 12, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Mark all read</button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}><X size={14} /></button>
        </div>
      </div>
      {notifs.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 20, fontSize: 13 }}>No notifications yet. Start engaging!</p>}
      {notifs.map(n => (
        <div key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${th.bdr}`, background: n.read ? "transparent" : dk ? "rgba(59,130,246,.07)" : "#eff6ff", cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: n.type === "token" ? "#f59e0b18" : th.surf2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{icons[n.type] || "🔔"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: th.txt }}>{n.msg}</div>
            <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{ago(n.ts)}</div>
          </div>
          {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", marginTop: 5, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────
function Sidebar({ view, setView, me, dk, bals, myProfile }) {
  const th  = T(dk);
  const bal = bals[me] ?? 0;
  const links = [
    { id: "feed",       e: "🏠", l: "Feed"        },
    { id: "network",    e: "👥", l: "Network"     },
    { id: "events",     e: "📅", l: "Events"      },
    { id: "sandbox",    e: "💡", l: "Sandbox"     },
    { id: "contribute", e: "📝", l: "Contribute"  },
    { id: "wallet",     e: "◈",  l: "Wallet", badge: bal },
    { id: "admin",      e: "🛡️", l: "Admin"       },
  ];
  return (
    <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${th.bdr}`, height: "100vh", position: "sticky", top: 0, background: th.side }}>
      <div style={{ padding: "14px 12px", borderBottom: `1px solid ${th.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(59,130,246,.4)" }}><span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>R</span></div>
          <div><div style={{ fontWeight: 800, fontSize: 15, color: th.txt, lineHeight: 1 }}>RightSignal</div><div style={{ fontSize: 8, color: th.txt3, fontWeight: 600, letterSpacing: .5 }}>SIGNAL OVER NOISE</div></div>
        </div>
      </div>
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setView(l.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: view === l.id ? dk ? "rgba(59,130,246,.15)" : "#eff6ff" : "transparent", color: view === l.id ? l.id === "wallet" ? "#f59e0b" : "#3b82f6" : th.txt2, fontSize: 13, fontWeight: view === l.id ? 700 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: view === l.id ? `2px solid ${l.id === "wallet" ? "#f59e0b" : "#3b82f6"}` : "2px solid transparent", transition: "all .15s" }}>
            <span style={{ fontSize: 15 }}>{l.e}</span>
            <span style={{ flex: 1 }}>{l.l}</span>
            {l.badge !== undefined && l.badge > 0 && <span style={{ background: "#f59e0b20", color: "#f59e0b", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99, border: "1px solid #f59e0b44" }}>{l.badge}</span>}
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

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [screen,    setScreen]    = useState("auth");
  const [session,   setSession]   = useState(null);
  const [me,        setMe]        = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [profiles,  setProfiles]  = useState({});
  const [bals,      setBals]      = useState({});
  const [dk,        setDk]        = useState(false);
  const [view,      setView]      = useState("feed");
  const [profUid,   setProfUid]   = useState(null);
  const [notifs,    setNotifs]    = useState([{ id: "n0", type: "token", msg: "◈ Welcome to RightSignal!", ts: Date.now() - 60000, read: false }]);
  const [showN,     setShowN]     = useState(false);
  const [tokenPop,  setTokenPop]  = useState(null);
  const unread = notifs.filter(n => !n.read).length;

  // ── Core helpers ──────────────────────────────────────────────
  const earnToken = useCallback(async (uid, amount, description) => {
    const rows = await db.get("rs_token_balances", `uid=eq.${uid}`);
    const current = rows?.[0]?.balance || 0;
    const newBal  = current + amount;
    await Promise.all([
      db.upsert("rs_token_balances", { uid, balance: newBal }),
      db.post("rs_token_txns", { uid, type: "earn", amount, description }),
    ]);
    setBals(b => ({ ...b, [uid]: newBal }));
    // Show pop animation only for current user
    if (uid === me) setTokenPop(amount);
  }, [me]);

  const addNotif = useCallback((n) => {
    setNotifs(ns => [{ id: genId(), ...n, ts: Date.now(), read: false }, ...ns]);
  }, []);

  const loadProfiles = async () => {
    const rows = await db.get("rs_user_profiles", "order=created_at.desc");
    const map  = {};
    (rows || []).forEach(r => { map[r.id] = { ...r, hue: strColor(r.name || "?") }; });
    setProfiles(map);
    return map;
  };

  const loadBals = async () => {
    const rows = await db.get("rs_token_balances");
    const map  = {};
    (rows || []).forEach(r => { map[r.uid] = r.balance; });
    setBals(map);
  };

  const seedIfNeeded = async () => {
    const [evs, sbx, ctb] = await Promise.all([db.get("rs_events","select=id&limit=1"), db.get("rs_sandbox","select=id&limit=1"), db.get("rs_contributions","select=id&limit=1")]);
    if (!evs?.length)  await db.postMany("rs_events", SEED_EVENTS);
    if (!sbx?.length)  await db.postMany("rs_sandbox", SEED_SANDBOX);
    if (!ctb?.length)  await db.postMany("rs_contributions", SEED_CONTRIBS);
  };

  const handleAuth = async (sess, authUser, isNewUser, name) => {
    setSession(sess);
    setMe(authUser.id);
    seedIfNeeded();
    if (isNewUser) {
      const displayName = name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "New User";
      setMyProfile({ id: authUser.id, email: authUser.email, name: displayName });
      setScreen("onboarding");
    } else {
      const prof = await db.get("rs_user_profiles", `id=eq.${authUser.id}`);
      if (prof?.[0]) {
        const p = { ...prof[0], hue: strColor(prof[0].name || "?") };
        setMyProfile(p);
        await Promise.all([loadProfiles(), loadBals()]);
        setScreen("app");
      } else {
        setMyProfile({ id: authUser.id, email: authUser.email, name: authUser.email?.split("@")[0] || "User" });
        setScreen("onboarding");
      }
    }
  };

  const handleOnboardingDone = async ({ who, ints, refCode, refUid }) => {
    const nameToUse = myProfile?.name || "User";
    const handle    = genHandle(nameToUse);
    const myRefCode = genRefCode(nameToUse);
    const profileRow = { id: me, email: myProfile?.email || "", name: nameToUse, handle, bio: "", role: WHO_OPTS.find(w => w.id === who)?.label || "Member", who, interests: ints, ref_code: myRefCode, referred_by: refUid || null };
    await db.upsert("rs_user_profiles", profileRow);
    let myBal = 1;
    await Promise.all([
      db.upsert("rs_token_balances", { uid: me, balance: myBal }),
      db.post("rs_token_txns", { uid: me, type: "earn", amount: 1, description: "Welcome signup bonus" }),
    ]);
    if (refUid) {
      const refBalRows = await db.get("rs_token_balances", `uid=eq.${refUid}`);
      const refBal = (refBalRows?.[0]?.balance || 0) + 1;
      myBal += 1;
      await Promise.all([
        db.upsert("rs_token_balances", { uid: me, balance: myBal }),
        db.upsert("rs_token_balances", { uid: refUid, balance: refBal }),
        db.post("rs_token_txns", { uid: me, type: "earn", amount: 1, description: "Referral bonus" }),
        db.post("rs_token_txns", { uid: refUid, type: "earn", amount: 1, description: `${nameToUse} joined via your referral` }),
        db.post("rs_referrals", { referrer_uid: refUid, referee_uid: me, code_used: refCode }),
      ]);
      setBals(b => ({ ...b, [me]: myBal, [refUid]: refBal }));
    } else {
      setBals(b => ({ ...b, [me]: myBal }));
    }
    const fullProfile = { ...profileRow, hue: strColor(nameToUse) };
    setMyProfile(fullProfile);
    setProfiles(p => ({ ...p, [me]: fullProfile }));
    setNotifs(ns => [{ id: genId(), type: "token", msg: `◈ You earned ${myBal} SGN — welcome${refUid ? " + referral bonus!" : "!"}`, ts: Date.now(), read: false }, ...ns]);
    await Promise.all([loadProfiles(), loadBals()]);
    window.history.replaceState({}, "", window.location.pathname);
    setScreen("app");
  };

  const handleSignOut = async () => {
    if (session?.access_token) await sbAuth.signOut(session.access_token);
    setSession(null); setMe(null); setMyProfile(null); setProfiles({}); setBals({}); setView("feed"); setScreen("auth");
  };

  const navTo       = v  => { setView(v);  setShowN(false); setProfUid(null); };
  const openProfile = id => { setProfUid(id); setView("profile"); setShowN(false); };
  const sidebarNav  = v  => { if (v === "profile") openProfile(me); else navTo(v); };

  if (screen === "auth")       return <><GlobalCSS dk={false} /><AuthScreen onAuth={handleAuth} /></>;
  if (screen === "onboarding") return <><GlobalCSS dk={false} /><Onboarding user={myProfile || {}} onComplete={handleOnboardingDone} /></>;

  const th = T(dk);
  const sharedProps = { me, dk, bals, profiles, earnToken, addNotif };

  const renderMain = () => {
    switch (view) {
      case "profile":    return <ProfileView    uid={profUid || me} me={me} dk={dk} bals={bals} profiles={profiles} onBack={() => setView("feed")} setBals={setBals} />;
      case "wallet":     return <WalletView     me={me} dk={dk} bals={bals} setBals={setBals} myProfile={myProfile} />;
      case "feed":       return <FeedView       {...sharedProps} myProfile={myProfile} onProfile={openProfile} />;
      case "network":    return <NetworkView    {...sharedProps} onProfile={openProfile} />;
      case "events":     return <EventsView     dk={dk} addNotif={addNotif} />;
      case "sandbox":    return <SandboxView    me={me} dk={dk} earnToken={earnToken} addNotif={addNotif} />;
      case "contribute": return <ContributeView me={me} dk={dk} earnToken={earnToken} addNotif={addNotif} />;
      case "admin":      return <AdminView      dk={dk} bals={bals} profiles={profiles} />;
      default:           return <FeedView       {...sharedProps} myProfile={myProfile} onProfile={openProfile} />;
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
          <div style={{ flex: 1, maxWidth: 280, display: "flex", alignItems: "center", gap: 8, background: th.inp, borderRadius: 10, padding: "7px 12px", border: `1px solid ${th.inpB}` }}>
            <Search size={13} style={{ color: th.txt3, flexShrink: 0 }} />
            <input placeholder="Search…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: th.txt, width: "100%" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <button onClick={() => navTo("wallet")} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#78350f,#d97706)", border: "none", borderRadius: 10, padding: "5px 12px", cursor: "pointer", boxShadow: "0 0 12px rgba(245,158,11,.3)", animation: "glow 3s ease-in-out infinite" }}>
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

        {/* Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ maxWidth: 620, margin: "0 auto" }}>{renderMain()}</div>
          </div>
          <div style={{ overflowY: "auto", padding: "18px 14px 18px 0", flexShrink: 0 }}>
            <RightPanel dk={dk} myProfile={myProfile} onProfile={openProfile} bals={bals} onWallet={() => navTo("wallet")} profiles={profiles} me={me} earnToken={earnToken} addNotif={addNotif} />
          </div>
        </div>
      </div>
    </div>
  );
}