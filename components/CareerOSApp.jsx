"use client";
import { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import {
  Upload, FileText, Sparkles, Target, Briefcase, Home, TrendingUp,
  ChevronRight, ChevronLeft, ChevronDown, Check, ArrowUpRight, Shield, Award,
  Wand2, MapPin, Globe, ArrowRight, Lightbulb, X, Download, Copy, Loader2,
  AlertCircle, Search, Pencil, Bookmark, BookmarkCheck, Send, MessageSquare,
  RefreshCw, AlertTriangle, Zap, RotateCcw, CheckCircle2, Flame, Gauge,
  DollarSign, CalendarClock, Sparkle, ListChecks, SlidersHorizontal,
  Handshake, Mic, PlayCircle, BarChart3, Activity, Clock, TrendingUp as TrendUp, CheckCircle, Zap as ZapIcon, Plus
} from "lucide-react";
import { usePersistence, persist } from "../lib/usePersistence";
import { auth } from "../lib/data";
import { extractText, parseResumeText, mergeProfiles } from "../lib/resumeParser";
import { scoreResumeLocal, estimateSalaryLocal, matchJobLocal, readinessLocal } from "../lib/localEngine";

/* ====== CONFIG ======
   Set JOB_PROXY_URL to your backend (see career-os-job-proxy.js) to get LIVE jobs
   everywhere — including inside this sandbox. Example: "https://api.yourdomain.com/jobs"
   The proxy should accept ?titles=&city=&state=&remote=&radius= and return
   { jobs: [{ title, company, location, workType, salary, source, posted, url, applyUrl }] }.
   When empty, the app shows a real empty state — never sample jobs. */
// In production these resolve to internal Next.js API routes, which proxy to the
// deployed job backend and to the AI provider using SERVER-side keys.
const JOB_PROXY_URL = process.env.NEXT_PUBLIC_JOB_PROXY_URL || "/api/jobs";
const AI_ENDPOINT = "/api/ai";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true"; // dev-only panels

/* ============ STYLES ============ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
.cos { --paper:#F4F0E7; --card:#FFFFFF; --ink:#18211C; --muted:#6C766C; --line:#ECE6DA;
  --primary:#0E5C4A; --primary-deep:#0B3E32; --primary-soft:#E4EFE9; --accent:#D4602E;
  --accent-soft:#FAE7DC; --gold:#C28A2B; --blue:#2C6E8F; --blue-soft:#E1EDF2; --red:#C0492E;
  font-family:'Hanken Grotesk',sans-serif; color:var(--ink); background:var(--paper);
  width:100%; max-width:440px; margin:0 auto; height:800px; border-radius:30px; overflow:hidden;
  position:relative; box-shadow:0 30px 80px -30px rgba(0,0,0,.4); border:1px solid var(--line);
  -webkit-font-smoothing:antialiased; display:flex; flex-direction:column; }
.cos * { box-sizing:border-box; }
.cos .serif { font-family:'Fraunces',serif; }
.cos-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:0 16px 24px; position:relative; }
.cos-scroll::-webkit-scrollbar { width:0; }
.cos-ptr { display:flex; align-items:center; justify-content:center; gap:8px; color:var(--muted); font-size:12.5px; font-weight:600; overflow:hidden; transition:height .2s ease; }

.cos-appbar { padding:18px 18px 12px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--paper); z-index:10; }
.cos-appbar h1 { font-size:23px; font-weight:600; margin:0; letter-spacing:-.02em; }
.cos-appbar .sub { font-size:12.5px; color:var(--muted); margin-top:2px; }
.cos-avatar { width:38px; height:38px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; }

.cos-tabbar { display:flex; background:var(--card); border-top:1px solid var(--line); padding:8px 6px calc(8px + env(safe-area-inset-bottom)); flex-shrink:0; }
.cos-tab { flex:1; background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 2px; color:var(--muted); font-family:inherit; font-size:10px; font-weight:700; transition:.15s; }
.cos-tab.on { color:var(--primary); }
.cos-tab .ico { width:46px; height:30px; border-radius:99px; display:flex; align-items:center; justify-content:center; transition:.18s; }
.cos-tab.on .ico { background:var(--primary-soft); }

.cos-btn { font-family:inherit; font-weight:700; font-size:14.5px; border:none; cursor:pointer; border-radius:14px; padding:14px 20px; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:.18s; text-decoration:none; }
.cos-btn:active { transform:scale(.97); } .cos-btn:disabled { opacity:.5; }
.cos-btn-primary { background:var(--primary); color:#fff; } .cos-btn-accent { background:var(--accent); color:#fff; }
.cos-btn-ghost { background:var(--card); color:var(--ink); border:1.5px solid var(--line); }
.cos-btn-soft { background:var(--primary-soft); color:var(--primary); }
.cos-btn-sm { padding:9px 13px; font-size:12.5px; border-radius:11px; } .cos-btn-block { width:100%; }

.cos-card { background:var(--card); border-radius:20px; padding:18px; margin-bottom:13px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.cos-card.flat { box-shadow:none; border:1px solid var(--line); }
.cos-reveal { animation: rise .42s cubic-bezier(.2,.7,.2,1) both; }
.cos-sec { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); font-weight:700; margin:0 4px 10px; }

.cos-chips { display:flex; gap:8px; overflow-x:auto; padding:2px 0 6px; }
.cos-chips::-webkit-scrollbar { height:0; }
.cos-chip { flex-shrink:0; font-family:inherit; font-size:13px; font-weight:600; padding:9px 15px; border-radius:99px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; transition:.15s; white-space:nowrap; }
.cos-chip.on { background:var(--primary); color:#fff; border-color:var(--primary); }

.cos-input, .cos-sel { width:100%; font-family:inherit; font-size:15px; padding:14px 15px; border:1.5px solid var(--line); border-radius:14px; background:var(--card); color:var(--ink); outline:none; }
.cos-input:focus { border-color:var(--primary); }
.cos-label { font-size:12.5px; font-weight:700; color:var(--muted); margin:0 0 7px 4px; display:block; }

.cos-onb { flex:1; display:flex; flex-direction:column; padding:28px 22px calc(22px + env(safe-area-inset-bottom)); overflow-y:auto; }
.cos-dots { display:flex; gap:5px; margin-bottom:20px; }
.cos-dots i { height:5px; flex:1; border-radius:9px; background:var(--line); } .cos-dots i.on { background:var(--primary); }
.cos-onb h1 { font-size:27px; font-weight:600; letter-spacing:-.02em; margin:0 0 8px; line-height:1.12; }
.cos-onb p.lead { color:var(--muted); font-size:15px; line-height:1.5; margin:0 0 24px; }
.cos-dropic { width:58px; height:58px; border-radius:17px; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.cos-grow { flex:1; }

.cos-hero { background:linear-gradient(160deg, var(--primary-deep), var(--primary)); border-radius:24px; padding:22px; color:#F4F0E7; margin-bottom:14px; }
.cos-hero-row { display:flex; align-items:center; gap:18px; }
.cos-pillrow { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.cos-pill { font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:99px; background:rgba(255,255,255,.16); }

.cos-job { background:var(--card); border-radius:18px; padding:16px; margin-bottom:11px; box-shadow:0 1px 3px rgba(0,0,0,.04); position:relative; overflow:hidden; }
.cos-job-top { display:flex; justify-content:space-between; gap:12px; }
.cos-job-title { font-size:15.5px; font-weight:700; line-height:1.25; }
.cos-job-co { font-size:12.5px; color:var(--muted); margin-top:2px; }
.cos-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800; padding:5px 10px; border-radius:99px; margin-top:7px; }
.cos-scores { display:flex; gap:8px; margin:11px 0; }
.cos-score-box { flex:1; border-radius:13px; padding:10px 12px; cursor:pointer; transition:.15s; }
.cos-score-box:active { transform:scale(.98); }
.cos-score-box .lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; opacity:.8; display:flex; align-items:center; gap:4px; }
.cos-score-box .v { font-size:22px; font-weight:800; line-height:1.1; margin-top:2px; }
.cos-job-meta { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 10px; }
.cos-jm { font-size:11.5px; color:var(--muted); background:var(--paper); padding:5px 9px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; }
.cos-whyfit { background:var(--primary-soft); border-radius:11px; padding:10px 12px; margin-bottom:10px; }
.cos-whyfit .h { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--primary); margin-bottom:5px; }
.cos-whyfit .l { font-size:12.5px; display:flex; gap:6px; margin-bottom:3px; line-height:1.35; }
.cos-job-acts { display:flex; gap:7px; margin-top:4px; }
.cos-swipehint { position:absolute; right:-2px; top:0; bottom:0; width:64px; background:linear-gradient(90deg, transparent, var(--primary-soft)); display:flex; align-items:center; justify-content:flex-end; padding-right:12px; opacity:0; pointer-events:none; transition:opacity .15s; }

.cos-bucket { display:flex; align-items:center; gap:8px; margin:16px 4px 10px; }
.cos-bucket .bdot { width:9px; height:9px; border-radius:50%; }
.cos-bucket h3 { font-size:14px; font-weight:700; margin:0; } .cos-bucket .ct { font-size:12px; color:var(--muted); font-weight:600; }

.cos-empty { text-align:center; padding:30px 18px; }
.cos-empty-ic { width:56px; height:56px; border-radius:17px; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.cos-empty-acts { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:18px; }

.cos-banner { display:flex; gap:9px; align-items:flex-start; padding:11px 13px; border-radius:13px; font-size:12.5px; line-height:1.4; margin-bottom:12px; }
.cos-banner.warn { background:#FBF3DF; color:#7A5912; } .cos-banner.info { background:var(--blue-soft); color:#1E4F66; } .cos-banner.ok { background:var(--primary-soft); color:var(--primary); }
.cos-toast { position:absolute; left:16px; right:16px; bottom:84px; background:var(--ink); color:#fff; padding:13px 16px; border-radius:14px; font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:9px; z-index:80; box-shadow:0 18px 40px -12px rgba(0,0,0,.5); animation: rise .3s ease both; }

.cos-feedrow { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--line); cursor:pointer; }
.cos-feedrow:last-child { border-bottom:none; }
.cos-feedrow .rank { width:26px; height:26px; border-radius:8px; background:var(--paper); font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--muted); }
.cos-feedrow .pct { font-weight:800; font-size:14px; flex-shrink:0; }

/* coach */
.cos-coachwrap { flex:1; display:flex; flex-direction:column; min-height:0; }
.cos-msgs { flex:1; overflow-y:auto; padding:4px 2px 12px; display:flex; flex-direction:column; gap:10px; }
.cos-bubble { max-width:86%; padding:11px 14px; border-radius:16px; font-size:13.5px; line-height:1.5; white-space:pre-wrap; }
.cos-bubble.you { align-self:flex-end; background:var(--primary); color:#fff; border-bottom-right-radius:5px; }
.cos-bubble.ai { align-self:flex-start; background:var(--card); border:1px solid var(--line); border-bottom-left-radius:5px; }
.cos-explain { align-self:flex-start; font-size:12px; font-weight:700; color:var(--primary); background:var(--primary-soft); border:none; padding:7px 12px; border-radius:99px; cursor:pointer; margin-top:-4px; }
.cos-suggest { display:flex; flex-wrap:wrap; gap:7px; padding:6px 0 10px; }
.cos-suggest button { font-size:12px; font-weight:600; padding:8px 12px; border-radius:99px; border:1.5px solid var(--line); background:var(--card); cursor:pointer; color:var(--ink); }
.cos-ask { display:flex; gap:8px; padding:8px 0 2px; }
.cos-typing { display:flex; gap:4px; padding:11px 14px; background:var(--card); border:1px solid var(--line); border-radius:16px; align-self:flex-start; }
.cos-typing i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation: blink 1.2s infinite; }
.cos-typing i:nth-child(2){ animation-delay:.2s } .cos-typing i:nth-child(3){ animation-delay:.4s }

.cos-preview { background:var(--paper); border-radius:14px; padding:16px; white-space:pre-wrap; font-size:12px; line-height:1.55; max-height:300px; overflow-y:auto; }
.cos-sheet { position:absolute; inset:0; background:var(--paper); z-index:70; display:flex; flex-direction:column; animation: slideup .28s cubic-bezier(.2,.8,.2,1) both; }
.cos-sheet.modal { top:auto; max-height:82%; border-radius:24px 24px 0 0; box-shadow:0 -20px 50px -12px rgba(0,0,0,.4); }
.cos-sheet-grab { width:40px; height:5px; border-radius:9px; background:var(--line); margin:9px auto 2px; }
.cos-sheet-head { padding:12px 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); background:var(--card); }
.cos-sheet-body { flex:1; overflow-y:auto; padding:18px; }
.cos-sheet-foot { padding:13px 16px calc(13px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); background:var(--card); display:flex; gap:8px; flex-wrap:wrap; }
.cos-gen-text { white-space:pre-wrap; font-size:13.5px; line-height:1.6; }

.cos-ac { position:relative; }
.cos-ac-list { position:absolute; top:100%; left:0; right:0; background:var(--card); border:1px solid var(--line); border-radius:14px; margin-top:5px; box-shadow:0 18px 40px -16px rgba(0,0,0,.35); z-index:30; max-height:230px; overflow-y:auto; }
.cos-ac-item { padding:12px 14px; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:9px; }
.cos-ac-item:active, .cos-ac-item.hl { background:var(--paper); }
.cos-ac-item .meta { font-size:11.5px; color:var(--muted); margin-left:auto; }
.cos-editrow { display:flex; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); } .cos-editrow:last-child { border-bottom:none; }
.cos-editrow .k { width:90px; font-size:12px; color:var(--muted); font-weight:700; flex-shrink:0; }
.cos-field { margin-bottom:16px; } .cos-field > .cos-label { display:flex; align-items:center; gap:6px; }
.cos-pills { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:8px; }
.cos-pill-tag { display:inline-flex; align-items:center; gap:6px; background:var(--primary-soft); color:var(--primary); font-size:12.5px; font-weight:700; padding:7px 10px 7px 12px; border-radius:99px; }
.cos-pill-tag button { background:none; border:none; color:var(--primary); cursor:pointer; display:flex; padding:0; opacity:.7; }
.cos-pill-tag button:hover { opacity:1; }
.cos-sugg { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.cos-sugg button { font-size:12px; font-weight:600; padding:6px 11px; border-radius:99px; border:1.5px dashed var(--line); background:var(--card); color:var(--muted); cursor:pointer; }
.cos-sugg button:hover { border-color:var(--primary); color:var(--primary); }
.cos-certcard { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 13px; margin-bottom:9px; }
.cos-certcard .top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.cos-certcard .nm { font-weight:700; font-size:14px; }
.cos-certcard .row { display:flex; gap:8px; margin-top:9px; }
.cos-certcard .row input { flex:1; font-size:12.5px; padding:8px 10px; border:1.5px solid var(--line); border-radius:10px; outline:none; font-family:inherit; }
.cos-wiz { flex:1; display:flex; flex-direction:column; padding:0; overflow:hidden; }
.cos-wiz-top { padding:16px 20px 10px; }
.cos-wiz-bar { height:6px; border-radius:99px; background:var(--line); overflow:hidden; }
.cos-wiz-bar i { display:block; height:100%; background:linear-gradient(90deg,var(--primary),var(--primary-deep)); border-radius:99px; transition:width .45s cubic-bezier(.2,.8,.2,1); }
.cos-wiz-meta { display:flex; justify-content:space-between; align-items:center; margin-top:9px; font-size:12px; color:var(--muted); font-weight:700; }
.cos-wiz-save { display:inline-flex; align-items:center; gap:5px; color:var(--primary); opacity:.9; }
.cos-wiz-body { flex:1; overflow-y:auto; padding:6px 20px 12px; }
.cos-wiz-body::-webkit-scrollbar { width:0; }
.cos-wiz-h { font-family:'Fraunces',serif; font-size:25px; font-weight:600; letter-spacing:-.02em; margin:6px 0 6px; line-height:1.12; }
.cos-wiz-lead { color:var(--muted); font-size:14.5px; line-height:1.5; margin:0 0 18px; }
.cos-wiz-foot { padding:13px 20px calc(14px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); background:var(--card); display:flex; gap:10px; }
.cos-step { animation: stepIn .34s cubic-bezier(.2,.8,.2,1) both; }
@keyframes stepIn { from { opacity:0; transform:translateX(14px);} to { opacity:1; transform:none; } }
.cos-expcard { background:var(--card); border:1px solid var(--line); border-radius:15px; padding:13px; margin-bottom:10px; }
.cos-expcard input, .cos-expcard textarea { width:100%; font-family:inherit; font-size:13.5px; padding:9px 11px; border:1.5px solid var(--line); border-radius:10px; outline:none; margin-bottom:8px; box-sizing:border-box; }
.cos-expcard textarea { resize:vertical; min-height:52px; }
.cos-seg { display:flex; gap:8px; flex-wrap:wrap; }
.cos-toggle { display:flex; align-items:center; justify-content:space-between; padding:13px 15px; border:1.5px solid var(--line); border-radius:13px; margin-bottom:10px; font-size:14px; font-weight:600; cursor:pointer; }
.cos-toggle.on { border-color:var(--primary); background:var(--primary-soft); color:var(--primary); }
.cos-toggle .knob { width:42px; height:24px; border-radius:99px; background:var(--line); position:relative; transition:.2s; flex-shrink:0; }
.cos-toggle.on .knob { background:var(--primary); }
.cos-toggle .knob i { position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:.2s; }
.cos-toggle.on .knob i { left:21px; }

.cos-crm { display:flex; align-items:center; gap:11px; padding:13px; border-radius:15px; background:var(--card); border:1px solid var(--line); margin-bottom:9px; }
.cos-crm .st { margin-left:auto; }
.cos-stsel { font-family:inherit; font-size:12px; font-weight:700; padding:7px 10px; border-radius:9px; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); }
.cos-mbreak { display:flex; flex-direction:column; gap:6px; }
.cos-mb-line { display:flex; gap:8px; font-size:13.5px; line-height:1.4; align-items:flex-start; padding:7px 0; border-bottom:1px solid var(--line); }
.cos-mb-line:last-child { border-bottom:none; }

.cos-spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg);} }
@keyframes rise { from {opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
@keyframes slideup { from {transform:translateY(100%);} to {transform:none;} }
@keyframes blink { 0%,60%,100%{opacity:.3} 30%{opacity:1} }
.cos-skel { animation: shimmer 1.3s infinite; } @keyframes shimmer { 0%{opacity:.5} 50%{opacity:.9} 100%{opacity:.5} }
.cos-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-bottom:13px; }
.cos-metric { background:var(--card); border-radius:15px; padding:12px 10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.cos-metric .mv { font-family:'Fraunces',serif; font-size:22px; font-weight:600; line-height:1; }
.cos-metric .ml { font-size:10.5px; color:var(--muted); font-weight:700; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px; }
.cos-progress { height:9px; border-radius:99px; background:var(--line); overflow:hidden; } .cos-progress i { display:block; height:100%; background:linear-gradient(90deg,var(--gold),var(--accent)); border-radius:99px; transition:width .6s ease; }
.cos-applyask { position:absolute; left:16px; right:16px; bottom:84px; background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; z-index:80; box-shadow:0 24px 50px -16px rgba(0,0,0,.45); animation: rise .25s ease both; }
.cos-overlay { position:absolute; inset:0; background:rgba(15,20,16,.32); z-index:75; }
`;

/* ============ DATA: cities w/ duplicate names, metros, ZIPs ============ */
const US_CITIES = [
  ["Atlanta","GA","30303","metro"],["Atlanta","TX","75551",""],["Atlanta","MI","49709",""],
  ["Savannah","GA","31401",""],["Augusta","GA","30901",""],["Columbus","GA","31901",""],["Macon","GA","31201",""],["Marietta","GA","30060",""],["Athens","GA","30601",""],
  ["Austin","TX","78701","metro"],["Dallas","TX","75201","metro"],["Houston","TX","77002","metro"],["San Antonio","TX","78205",""],["Fort Worth","TX","76102",""],
  ["Springfield","IL","62701",""],["Springfield","MO","65806",""],["Springfield","MA","01103",""],
  ["Columbus","OH","43215","metro"],["Cleveland","OH","44113",""],["Cincinnati","OH","45202",""],
  ["Tampa","FL","33602","metro"],["Miami","FL","33101","metro"],["Orlando","FL","32801",""],["Jacksonville","FL","32202",""],["Tallahassee","FL","32301",""],
  ["Charlotte","NC","28202",""],["Raleigh","NC","27601",""],["Durham","NC","27701",""],["Charleston","SC","29401",""],["Columbia","SC","29201",""],["Greenville","SC","29601",""],
  ["Nashville","TN","37203",""],["Memphis","TN","38103",""],["Knoxville","TN","37902",""],["Chattanooga","TN","37402",""],
  ["Washington","DC","20001","metro"],["Arlington","VA","22201",""],["Alexandria","VA","22301",""],["Richmond","VA","23219",""],["Norfolk","VA","23510",""],["Reston","VA","20190",""],
  ["New York","NY","10001","metro"],["Brooklyn","NY","11201",""],["Boston","MA","02108","metro"],["Cambridge","MA","02139",""],["Philadelphia","PA","19103","metro"],["Pittsburgh","PA","15222",""],
  ["Chicago","IL","60601","metro"],["Denver","CO","80202","metro"],["Boulder","CO","80301",""],["Colorado Springs","CO","80903",""],["Seattle","WA","98101","metro"],["Bellevue","WA","98004",""],
  ["San Francisco","CA","94103","metro"],["Los Angeles","CA","90012","metro"],["San Diego","CA","92101",""],["San Jose","CA","95113",""],["Sacramento","CA","95814",""],["Oakland","CA","94607",""],["Irvine","CA","92602",""],
  ["Portland","OR","97204",""],["Phoenix","AZ","85004","metro"],["Tucson","AZ","85701",""],["Scottsdale","AZ","85251",""],["Las Vegas","NV","89101",""],["Salt Lake City","UT","84101",""],
  ["Minneapolis","MN","55401","metro"],["Detroit","MI","48226","metro"],["Indianapolis","IN","46204",""],["Kansas City","MO","64106",""],["St. Louis","MO","63101",""],["Baltimore","MD","21202",""],["Bethesda","MD","20814",""],
  ["New Orleans","LA","70112",""],["Birmingham","AL","35203",""],["Huntsville","AL","35801",""],["Oklahoma City","OK","73102",""],["Louisville","KY","40202",""],["Milwaukee","WI","53202",""],
];
const SE_STATES = ["GA","FL","SC","NC","TN","AL","VA"];
const SALARY_OPTIONS = ["$60k","$75k","$90k","$100k","$120k","$150k","$175k","$200k+"];
const stateName = a => ({GA:"georgia",FL:"florida",SC:"south carolina",NC:"north carolina",TN:"tennessee",AL:"alabama",VA:"virginia",TX:"texas",CA:"california",NY:"new york",WA:"washington",CO:"colorado",DC:"washington",OH:"ohio",IL:"illinois",MA:"massachusetts",MO:"missouri"}[a]||"___");

const CRM_STAGES = ["Saved","Applied","Interview Scheduled","Interview Completed","Offer Received","Accepted","Rejected","Withdrawn"];
const ACTIVE_STAGES = ["Applied","Interview Scheduled","Interview Completed","Offer Received","Accepted"];
function badge(m) {
  if (m >= 90) return { label:"Excellent Match", note:"Apply immediately", color:"var(--primary)", bg:"var(--primary-soft)", dot:"🟢" };
  if (m >= 75) return { label:"Strong Match", note:"Highly recommended", color:"var(--primary)", bg:"var(--primary-soft)", dot:"🟢" };
  if (m >= 60) return { label:"Good Match", note:"Worth applying", color:"#8A6512", bg:"#FBF3DF", dot:"🟡" };
  return { label:"Stretch Role", note:"Apply if interested", color:"var(--red)", bg:"var(--accent-soft)", dot:"🔴" };
}

/* ============ AI LAYER ============ */
async function callClaude(messages, { webSearch = false, maxTokens = 1000, timeoutMs = 0 } = {}) {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages };
  if (webSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const ctrl = new AbortController();
  const timer = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(AI_ENDPOINT, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body), signal: ctrl.signal });
  } catch (e) { if (e.name === "AbortError") throw new Error("TIMEOUT"); throw new Error("NETWORK"); }
  finally { if (timer) clearTimeout(timer); }
  if (!res.ok) {
    let detail = "";
    try { const err = await res.json(); detail = err?.error || err?.detail || ""; } catch {}
    console.error("[CareerOS] /api/ai error", res.status, detail);
    if (res.status === 401 || res.status === 403) throw new Error("AI_AUTH");
    if (res.status === 503) throw new Error(detail || "AI not configured");
    throw new Error(detail || ("AI_HTTP_" + res.status));
  }
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}
function parseJSON(text) {
  if (!text) return null;
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const sObj = t.indexOf("{"), sArr = t.indexOf("[");
  let start = sArr !== -1 && (sArr < sObj || sObj === -1) ? sArr : sObj;
  if (start === -1) { try { return JSON.parse(t); } catch { return null; } }
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  try { return JSON.parse(t.slice(start, end + 1)); } catch { try { return JSON.parse(t); } catch { return null; } }
}
const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
const stripHtml = (s="") => s.replace(/<[^>]+>/g," ").replace(/&[a-z]+;/gi," ").replace(/\s+/g," ").trim();

const EXTRACT_PROMPT = `Extract structured data from this resume. Return ONLY valid JSON, no fences:
{"name":"","email":"","phone":"","city":"","state":"","summary":"","skills":[],"technicalSkills":[],"certifications":[],"workHistory":[{"title":"","company":"","dates":"","highlights":[]}],"education":[{"degree":"","school":"","year":""}],"projects":[],"leadership":[],"clearance":""}`;

// LOCAL-FIRST: always returns a usable profile from on-device text extraction +
// heuristic parsing. AI is never required here.
async function extractProfile(file) {
  const text = await extractText(file);           // PDF/DOCX/TXT → text (no network)
  const local = parseResumeText(text);            // heuristics → structured profile
  // If we got essentially nothing usable, treat as a parse failure (no fake data).
  const nothing = !local.name && !local.email && (local.skills||[]).length === 0 && (local.workHistory||[]).length === 0;
  if (nothing) throw new Error("PARSE_FAILED");
  return { profile: local, text };                // ready to use immediately
}

// OPTIONAL: enhance a locally-parsed profile with AI. If the AI provider is
// unavailable for any reason, we simply keep the local result.
async function enhanceProfileWithAI(localProfile, text) {
  try {
    const ai = parseJSON(await callClaude([{ role: "user", content: EXTRACT_PROMPT + "\n\nResume text:\n" + text.slice(0, 12000) }], { timeoutMs: 30000 }));
    if (!ai) return localProfile;
    return mergeProfiles(localProfile, ai);
  } catch (e) {
    console.warn("[CareerOS] AI enhancement skipped:", e?.message);
    return localProfile; // graceful — local data stands on its own
  }
}
// LOCAL-FIRST: always returns a score with no AI. AI refines if available.
async function scoreResume(profile) {
  const local = scoreResumeLocal(profile);
  try {
    const ai = parseJSON(await callClaude([{ role:"user", content:
      `Score this resume 0-100. Return ONLY JSON: {"score":0,"potentialScore":0,"strengths":["","",""],"weaknesses":["","",""],"topFixes":["","",""]}
3 short phrases each. Resume:\n` + JSON.stringify(profile) }], { timeoutMs: 20000 }));
    return ai && typeof ai.score === "number" ? { ...ai, _source: "local+ai" } : local;
  } catch { return local; }
}
// Recommend target job titles. Falls back to local heuristics if AI is unavailable.
function recommendTitlesLocal(profile) {
  // Clean, title-like roles already extracted by the parser take priority.
  const out = [...(profile.targetRoles || [])];
  const roles = (profile.workHistory || []).map(w => w.title).filter(Boolean);
  out.push(...roles);
  const sk = [...(profile.skills||[]), ...(profile.technicalSkills||[])].map(s=>String(s).toLowerCase());
  const has = (k) => sk.some(s => s.includes(k));
  if (has("security") || has("cyber") || /ts\/sci|secret/i.test(profile.clearance||"")) out.push("Cybersecurity Analyst", "Security Operations Analyst");
  if (has("network") || has("ccna")) out.push("Network Engineer");
  if (has("cloud") || has("aws") || has("azure")) out.push("Cloud Engineer");
  if (has("product")) out.push("Product Manager");
  if (has("project") || has("program")) out.push("Technical Program Manager");
  if (out.length < 3) out.push("Operations Manager", "Project Manager");
  return [...new Set(out)].slice(0, 7);
}
async function recommendTitles(profile) {
  try {
    const out = await callClaude([{ role:"user", content:
      `Based on this resume, recommend 5-7 realistic target job titles (mix of direct fits and strong adjacent roles). Consider clearance/certs (e.g. TS/SCI, Security+, CCNA → cleared/cyber/network roles). Return ONLY JSON: {"titles":["",""]}.
Resume:\n` + JSON.stringify({ skills:profile.skills, tech:profile.technicalSkills, certs:profile.certifications, clearance:profile.clearance, roles:(profile.workHistory||[]).map(w=>w.title) }) }], { maxTokens:300, timeoutMs:15000 });
    const t = parseJSON(out)?.titles;
    return (t && t.length) ? t : recommendTitlesLocal(profile);
  } catch { return recommendTitlesLocal(profile); }
}
// LOCAL-FIRST salary: heuristic estimate always; AI (with web search) refines if available.
async function fetchSalary(profile, prefs) {
  const local = estimateSalaryLocal(profile, prefs);
  try {
    const role = (prefs.titles||[])[0] || profile.workHistory?.[0]?.title || "professional";
    const loc = prefs.remoteOnly ? "remote (US)" : `${prefs.city||profile.city||""}, ${prefs.state||profile.state||""}`;
    const ai = parseJSON(await callClaude([{ role:"user", content:
      `Estimate US comp for ${role} ${loc}. Target:${prefs.salaryTarget||"n/a"}. Certs:${certNames(profile.certifications).join(", ")||"none"}. Clearance:${profile.clearance||"none"} (TS/SCI + Security+/Cloud+/CCNA raise cleared/cyber ceilings — reflect it). Return ONLY JSON:
{"marketLow":"$0k","expectedLow":"$0k","expectedHigh":"$0k","marketHigh":"$0k","potentialLow":"$0k","potentialHigh":"$0k","targetVerdict":"encouraging-honest sentence","bestTitles":["","",""],"recommendedCerts":[""]}` }], { webSearch:true, timeoutMs: 20000 }));
    return (ai && ai.marketLow) ? { ...ai, _source: "local+ai" } : local;
  } catch { return local; }
}

/* ---- LIVE job sources (proxy preferred; keyless direct fallback). NO sample data. ---- */
async function fromProxy(profile, prefs) {
  const role = (prefs.titles||[]).join(",") || "";
  const skills = (profile?.skills||[]).concat(profile?.technicalSkills||[]).slice(0,15).join(",");
  const u = new URL(JOB_PROXY_URL, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  u.searchParams.set("titles", role);
  u.searchParams.set("city", prefs.city||"");
  u.searchParams.set("state", prefs.state||"");
  u.searchParams.set("remote", prefs.remoteOnly ? "1" : "0");
  u.searchParams.set("workType", (prefs.workTypes||[]).join(",")||"Any");
  u.searchParams.set("radius", String(prefs.radius||50));
  u.searchParams.set("salaryTarget", prefs.salaryTarget||"");
  u.searchParams.set("country", prefs.country || "us");
  if (skills) u.searchParams.set("skills", skills);
  console.log("[CareerOS] → jobs request:", u.toString());
  const r = await fetch(u.toString());
  console.log("[CareerOS] ← jobs status:", r.status);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  console.log("[CareerOS] ← jobs response:", d, "| count:", (d.jobs||[]).length);
  return (d.jobs||[]).map(j => ({ ...j, applyUrl: j.applyUrl || j.url }));
}
function locationTier(job, prefs) {
  const loc = (job.location||"").toLowerCase(); const remote = loc.includes("remote") || job.workType === "Remote";
  if (prefs.remoteOnly) return remote ? 0 : 4;
  const city=(prefs.city||"").toLowerCase(), st=(prefs.state||"").toLowerCase();
  if (city && loc.includes(city)) return 0;
  if (st && (loc.includes(st) || loc.includes(stateName(prefs.state)))) return 1;
  if (SE_STATES.includes(prefs.state) && SE_STATES.some(s => loc.includes(s.toLowerCase())||loc.includes(stateName(s)))) return 2;
  if (remote) return 3;
  return 4;
}
// Non-US location signals — used to hard-exclude foreign jobs for US searches.
const FOREIGN_HINTS = ["germany","berlin","munich","united kingdom","london","england","france","paris","spain","madrid","netherlands","amsterdam","ireland","dublin","canada","toronto","australia","sydney","india","bangalore","poland","warsaw","portugal","lisbon","sweden","switzerland","zurich","austria","vienna","italy","rome","belgium","brussels","denmark","norway","finland","singapore","dubai","uae","brazil","mexico city","europe","emea","apac"," gmbh"," ltd "];
const US_STATE_SET = new Set(("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC").split(" "));
function looksUS(loc) {
  const l = (loc||"").toLowerCase();
  if (/\b(usa|united states|u\.s\.|us)\b/.test(l)) return true;
  // ", XX" state abbreviation
  const m = (loc||"").match(/,\s*([A-Z]{2})\b/);
  if (m && US_STATE_SET.has(m[1])) return true;
  return false;
}
// HARD gate: returns true only if a job is allowed for the user's location filter.
function passesLocation(job, prefs) {
  const loc = (job.location||"").toLowerCase();
  const remote = loc.includes("remote") || job.workType === "Remote";
  // Remote/Anywhere searches accept remote roles regardless of country.
  if (prefs.remoteOnly || prefs.radius === "remote") return remote || looksUS(job.location);
  // Otherwise: must NOT look foreign, and should look US (or be remote-US).
  if (FOREIGN_HINTS.some(h => loc.includes(h)) && !looksUS(job.location)) return false;
  return looksUS(job.location) || remote || loc === "" ? true : false;
}
function estMatch(profile, job) {
  const text=(job.title+" "+(job.description||"")).toLowerCase(); const sk=(profile.skills||[]).concat(profile.technicalSkills||[]);
  const hits=sk.filter(s=>s&&text.includes(s.toLowerCase())).length; return Math.max(52, Math.min(95, 58+hits*6));
}
async function annotateJobs(profile, prefs, raw) {
  // LOCAL FIRST: every job gets a real match/interview score with no AI.
  const base = raw.slice(0,10).map(j => matchJobLocal(profile, prefs, j));
  try {
    const slim = base.map((j,i) => ({ i, title:j.title, company:j.company, location:j.location, desc:j.description }));
    const out = await callClaude([{ role:"user", content:
      `Score each REAL job vs this candidate. Be generous; show stretch fits too. Return ONLY JSON array, same "i":
[{"i":0,"match":0,"interview":0,"why":["",""],"strengths":["",""],"missing":[""],"improve":["",""],"futureMatch":0}]
match=resume fit %, interview=interview-probability % (market competitiveness + resume strength + required quals — distinct from match), why=2-3 short "matches X" fit reasons, strengths=detailed matched requirements, missing=missing requirements, improve=concrete steps, futureMatch=match % after improvements.
Skills:${(profile.skills||[]).concat(profile.technicalSkills||[]).join(", ")} | Certs:${certNames(profile.certifications).join(", ")||"none"} | Clearance:${profile.clearance||"none"} | Edu:${(profile.education||[]).map(e=>e.degree).join(", ")||"none"}
Roles:${(profile.workHistory||[]).slice(0,3).map(w=>w.title).join(", ")} | Targets:${(prefs.titles||[]).join(", ")}
Jobs:\n${JSON.stringify(slim)}` }], { maxTokens:1900, timeoutMs: 25000 });
    const ann = parseJSON(out); if (!ann) return base;
    const by={}; ann.forEach(a=>by[a.i]=a);
    // AI ENRICHES local scores; local values remain the floor/fallback.
    return base.map((j,i)=> by[i] ? { ...j,
      match: by[i].match ?? j.match, interview: by[i].interview ?? j.interview,
      why: by[i].why?.length ? by[i].why : j.why, strengths: by[i].strengths?.length ? by[i].strengths : j.strengths,
      missing: by[i].missing?.length ? by[i].missing : j.missing, improve: by[i].improve?.length ? by[i].improve : j.improve,
      futureMatch: by[i].futureMatch ?? j.futureMatch, _source: "local+ai" } : j);
  } catch {
    return base; // AI unavailable → local match scores stand on their own
  }
}
// PROXY ONLY (calls /api/jobs → BACKEND_JOB_URL). No browser-side job APIs, no samples.
async function getJobs(profile, prefs) {
  const selected = (prefs.titles || []).filter(Boolean);
  const resumeRoles = (profile.workHistory || []).slice(0, 2).map(w => w.title).filter(Boolean);
  const searchTitles = [...new Set([...selected, ...resumeRoles])].slice(0, 6);
  const errors = []; let raw = [];
  const debug = { connected: true, source: "proxy", endpoint: JOB_PROXY_URL,
    roles: searchTitles, location: prefs.remoteOnly ? "Remote" : `${prefs.city||"—"}, ${prefs.state||""}`.trim(),
    radius: String(prefs.radius || 50), returned: 0, error: "" };
  try {
    raw = await fromProxy({ ...profile, _titles: searchTitles }, { ...prefs, titles: searchTitles });
  } catch (e) {
    debug.error = "Could not reach the job service (" + (e?.message || "error") + ").";
    return { jobs: [], errors: ["backend_unreachable"], source: "proxy", debug };
  }
  const seen = new Set(); raw = raw.filter(j => { const k = (j.title + j.company).toLowerCase().replace(/\s+/g, ""); if (seen.has(k)) return false; seen.add(k); return true; });
  // HARD FILTERS (points 4/6/9): every job must have a valid apply URL AND pass the
  // location gate (no foreign jobs for a US city search unless Remote/Anywhere).
  raw = raw.filter(j => {
    const link = j.applyUrl || j.url;
    if (!link || !/^https?:\/\//i.test(link)) return false;
    if (!passesLocation(j, prefs)) return false;
    return true;
  });
  debug.returned = raw.length;
  if (raw.length === 0) { debug.error = "Connected, but no results matched your location and filters."; return { jobs: [], errors, source: "proxy", debug }; }
  let scoped = []; for (let c = 0; c <= 4 && scoped.length < 6; c++) scoped = raw.filter(j => locationTier(j, prefs) <= c);
  if (scoped.length === 0) scoped = raw;
  scoped.sort((a, b) => locationTier(a, prefs) - locationTier(b, prefs)); scoped = scoped.slice(0, 10);
  let jobs; try { jobs = await annotateJobs(profile, prefs, scoped); }
  catch { jobs = scoped.map(j => matchJobLocal(profile, prefs, j)); }
  jobs.sort((a, b) => (b.match || 0) - (a.match || 0));
  console.log("[CareerOS] jobs reaching UI:", jobs.length);
  debug.returned = jobs.length;
  return { jobs, errors, source: "proxy", debug };
}
function localInsights(profile, jobs, score, prefs) {
  const out = [];
  const top = jobs[0];
  if (top) out.push(`Your strongest match right now is ${top.title}${top.company?` at ${top.company}`:""} (${top.match}%). Tailor your resume to it before applying.`);
  const fixes = score?.topFixes || [];
  if (fixes[0]) out.push(`Quickest win to raise your score: ${fixes[0].toLowerCase()}.`);
  if (prefs?.salaryTarget) out.push(`For your ${prefs.salaryTarget} target, prioritize senior/lead${profile?.clearance && !/none/i.test(profile.clearance)?" or cleared":""} roles — they get you there fastest.`);
  if (out.length < 3) out.push("Apply to your top 5 matches this week — consistency drives interviews.");
  return out.slice(0, 3);
}
async function coachInsights(profile, jobs, score, prefs) {
  try {
  const out = await callClaude([{ role:"user", content:
    `Encouraging-but-honest advisor. 3 one-sentence insights. Never say a target is "unrealistic" — name role types that reach it. Return ONLY JSON {"insights":["","",""]}.
Target:${prefs.salaryTarget||"n/a"} Clearance:${profile.clearance||"none"} Certs:${certNames(profile.certifications).join(", ")||"none"} Score:${score?.score??"n/a"} Jobs:${jobs.length} Top:${jobs[0]?.title||"none"}` }], { maxTokens:380, timeoutMs:18000 });
  const ins = parseJSON(out)?.insights;
  return (ins && ins.length) ? ins : localInsights(profile, jobs, score, prefs);
  } catch { return localInsights(profile, jobs, score, prefs); }
}
const D = { s:"===SUMMARY===", b:"===BULLETS===", k:"===KEYWORDS===", sk:"===SKILLS===", r:"===FULL_RESUME===", e:"===END===" };
function parseOpt(t){ if(!t)return null; const grab=(a,b)=>{const i=t.indexOf(a);if(i===-1)return"";const f=i+a.length;const j=b?t.indexOf(b,f):-1;return t.slice(f,j===-1?undefined:j).trim();};
  const lines=s=>s.split("\n").map(l=>l.replace(/^[-•*\d.\s]+/,"").trim()).filter(Boolean);
  const o={summary:grab(D.s,D.b),bullets:lines(grab(D.b,D.k)),keywords:lines(grab(D.k,D.sk)),skills:lines(grab(D.sk,D.r)),fullResume:grab(D.r,D.e)};
  return (o.summary||o.bullets.length||o.fullResume)?o:null; }
function fallbackOpt(p){ const sk=(p.skills||[]).concat(p.technicalSkills||[]);
  const full=localResumeText(p);
  return { _fallback:true, summary:p.summary||"", bullets:["Add measurable outcomes (numbers, %, $).","Open bullets with strong verbs.","Tie each bullet to a result."], keywords:sk.slice(0,5), skills:["Group by category.","List certs near the top."], fullResume:full }; }
async function optimize(profile, job, onStage){ onStage("Analyzing resume…"); await new Promise(r=>setTimeout(r,300)); onStage("Rewriting bullet points…");
  const jc=job?`\nTailor to ${job.title} at ${job.company}. Keywords: ${(job.missing||[]).join(", ")}.`:"";
  const prompt=`Rewrite this resume stronger, truthful, ATS-friendly.${jc}
Output PLAIN TEXT with EXACTLY these markers, no markdown:
${D.s}\n<summary>\n${D.b}\n<one bullet per line, 4-7>\n${D.k}\n<one keyword per line>\n${D.sk}\n<one skills tip per line>\n${D.r}\n<full optimized resume plain text>\n${D.e}
Resume:\n${JSON.stringify(profile)}`;
  let parsed=null;
  try { const out=await callClaude([{role:"user",content:prompt}],{maxTokens:1900, timeoutMs:25000}); onStage("Generating optimized resume…"); parsed=parseOpt(out); }
  catch(e){ if(e?.message==="AI_AUTH") throw e; }
  return parsed||fallbackOpt(profile); }
// Professional, ATS-friendly plain-text resume from the profile (no AI).
function localResumeText(p){
  const L=[];
  const sk=[...(p.skills||[]),...(p.technicalSkills||[])];
  if(p.name) L.push(p.name.toUpperCase());
  const contact=[p.email,p.phone,[p.city,p.state].filter(Boolean).join(", "),p.clearance&&!/none/i.test(p.clearance)?`${p.clearance} Clearance`:""].filter(Boolean).join("  |  ");
  if(contact) L.push(contact);
  L.push("");
  L.push("PROFESSIONAL SUMMARY");
  L.push(p.summary||`${(p.workHistory||[])[0]?.title||"Experienced professional"} with a background in ${sk.slice(0,4).join(", ")||"multiple disciplines"}.${p.clearance&&!/none/i.test(p.clearance)?` Holds an active ${p.clearance} clearance.`:""} Proven record of delivering measurable results and leading cross-functional efforts.`);
  if(sk.length){ L.push(""); L.push("CORE SKILLS"); L.push(sk.join("  •  ")); }
  if((p.workHistory||[]).length){ L.push(""); L.push("PROFESSIONAL EXPERIENCE");
    p.workHistory.forEach(w=>{ L.push(""); L.push(`${w.title||"Role"}${w.company?` — ${w.company}`:""}${w.dates?`   (${w.dates})`:""}`);
      (w.highlights&&w.highlights.length?w.highlights:["Delivered results aligned to team and organizational goals."]).forEach(h=>L.push(`  • ${h}`)); }); }
  if(certNames(p.certifications).length){ L.push(""); L.push("CERTIFICATIONS"); certNames(p.certifications).forEach(c=>L.push(`  • ${c}`)); }
  if((p.education||[]).length){ L.push(""); L.push("EDUCATION"); p.education.forEach(e=>L.push(`  • ${e.degree||"Degree"}${e.school?`, ${e.school}`:""}${e.year?` (${e.year})`:""}`)); }
  if(p.military){ L.push(""); L.push("MILITARY SERVICE"); L.push(`  • ${p.branch||"U.S. Armed Forces"}${p.yearsServed?` — ${p.yearsServed} years`:""}`); }
  return L.join("\n");
}
// LOCAL document templates — used when AI is unavailable so a real, usable
// document is always produced (never "unavailable").
function localDoc(kind, p, job){
  const nm=p.name||"";
  const contact=[p.email,p.phone,[p.city,p.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const sk=[...(p.skills||[]),...(p.technicalSkills||[])];
  const top=(p.workHistory||[])[0]||{};
  const role=job?.title||top.title||"the role";
  const co=job?.company||"your company";
  switch(kind){
    case "cover": return `${nm}\n${contact}\n\nDear Hiring Team,\n\nI'm excited to apply for the ${role} position${job?` at ${co}`:""}. With experience as ${top.title||"a professional"}${top.company?` at ${top.company}`:""} and strengths in ${sk.slice(0,4).join(", ")||"my field"}, I'm confident I can contribute quickly.\n\nIn my recent work I ${(top.highlights||[])[0]||"delivered measurable results and led key initiatives"}. ${p.clearance&&!/none/i.test(p.clearance)?`I also hold a ${p.clearance} clearance. `:""}I'd welcome the chance to discuss how my background fits your needs.\n\nSincerely,\n${nm}`;
    case "outreach": return `Hi — I came across the ${role} opening${job?` at ${co}`:""} and it lines up closely with my background in ${sk.slice(0,3).join(", ")||"this field"}. I have ${(p.workHistory||[]).length||"several"} years of relevant experience${p.clearance&&!/none/i.test(p.clearance)?` and an active ${p.clearance} clearance`:""}. Would you be open to a quick conversation?\n\n— ${nm}`;
    case "linkedin": return `Hi! I'm exploring ${role} opportunities and your work${job?` at ${co}`:""} stood out. I'd love to connect — my background is in ${sk.slice(0,2).join(" & ")||"this space"}. Thanks!`;
    case "followup": return `Subject: Following up — ${role}${job?` at ${co}`:""}\n\nHi,\n\nI recently applied for the ${role} role and wanted to reiterate my strong interest. My experience in ${sk.slice(0,3).join(", ")||"the field"} aligns well with what you're looking for, and I'd be glad to provide anything else helpful.\n\nThank you for your time,\n${nm}`;
    case "tailored": return localResumeText(p);
    case "interview": return `INTERVIEW PREP — ${role}${job?` at ${co}`:""}\n\nCOMPANY-SPECIFIC QUESTIONS\n1. Why ${co}?\n2. What do you know about our products/mission?\n3. How would you contribute in your first 90 days?\n4. What interests you about this team?\n\nTECHNICAL QUESTIONS\n${sk.slice(0,5).map((s,i)=>`${i+1}. Walk through a project where you used ${s}.`).join("\n")||"1. Describe a technically challenging project."}\n\nBEHAVIORAL QUESTIONS\n1. Tell me about a time you led under pressure.\n2. Describe a conflict you resolved.\n3. A time you failed and what you learned.\n4. How do you prioritize competing deadlines?\n\nSTAR EXAMPLES (from your experience)\n${(p.workHistory||[]).slice(0,3).map(w=>`• ${w.title||"Role"}${w.company?` at ${w.company}`:""}: ${(w.highlights||[])[0]||"describe situation, task, action, result"}`).join("\n")||"• Use your real roles to build Situation-Task-Action-Result stories."}\n\nQUESTIONS TO ASK\n1. What does success look like in 6 months?\n2. How is the team structured?\n3. What are the biggest challenges right now?\n4. What's the path for growth?\n5. What are the next steps?`;
    case "negotiation": return `SALARY NEGOTIATION SCRIPT — ${role}${job?` at ${co}`:""}\n\n"Thank you for the offer — I'm very excited about joining ${co}. Based on my experience in ${sk.slice(0,3).join(", ")||"this field"}${p.clearance&&!/none/i.test(p.clearance)?` and my ${p.clearance} clearance`:""}, and the market range for this role, I was targeting ${p._target||"a higher base"}. Is there flexibility to get closer to that number?"\n\nThen pause and let them respond. Stay warm, specific, and confident.`;
    case "counter": return `Subject: ${role} Offer\n\nHi,\n\nThank you for the offer — I'm genuinely excited about ${co}. Given my background in ${sk.slice(0,3).join(", ")||"the field"}${p.clearance&&!/none/i.test(p.clearance)?` and active ${p.clearance} clearance`:""}, I'd like to discuss the base compensation. Based on market data and the value I'll bring, would you be able to move toward ${p._target||"a higher figure"}? I'm confident we can find a number that works for both of us.\n\nBest,\n${nm}`;
    case "talkingpoints": return `SALARY TALKING POINTS\n• My experience in ${sk.slice(0,3).join(", ")||"key areas"} directly maps to this role.\n${p.clearance&&!/none/i.test(p.clearance)?`• Active ${p.clearance} clearance — a scarce, high-value asset.\n`:""}• ${(p.certifications||[]).length?`Certifications: ${certNames(p.certifications).join(", ")}.`:"Proven track record of measurable results."}\n• Market range supports a higher figure for this scope.\n• I'm ready to start and fully committed to the team's goals.`;
    default: return localResumeText(p);
  }
}
async function genDoc(kind, profile, job){
  const map={
    cover:"a tailored cover letter",
    outreach:"a short recruiter outreach message",
    linkedin:"a LinkedIn connection request under 300 chars",
    followup:"a polite follow-up email after applying",
    tailored:"a complete resume tailored to the job, plain text",
    interview:"a full interview prep package with clear sections: COMPANY-SPECIFIC QUESTIONS (4), TECHNICAL QUESTIONS (5), BEHAVIORAL QUESTIONS (4), STAR EXAMPLES drawn from their real experience (3), and QUESTIONS TO ASK THE INTERVIEWER (5)",
    negotiation:"a confident, professional salary negotiation phone/meeting script the candidate can read aloud, anchored on the target number",
    counter:"a polished counter-offer email that respectfully asks for a higher figure with justification from their experience",
    talkingpoints:"5-7 concise salary negotiation talking points (bullet style) the candidate can reference live",
  };
  const jc=job?`\nJob: ${job.title} at ${job.company}, ${job.location}. ${job.salary?`Listed pay: ${job.salary}.`:""}`:"";
  try {
    const out = await callClaude([{role:"user",content:`Write ${map[kind]} for this candidate. Real details, professional, specific. Output only the document text.${jc}\n\nCandidate:\n`+JSON.stringify(profile)}], { maxTokens:1500, timeoutMs:25000 });
    return (out && out.trim().length > 40) ? out : localDoc(kind, profile, job);
  } catch { return localDoc(kind, profile, job); } // AI down → real local document
}
// Per-job optimization engine: what to add and the match increase each unlocks
async function optimizeForJob(profile, job){
  try {
    const out=await callClaude([{role:"user",content:
      `For this candidate applying to "${job.title}" at ${job.company}, return ONLY JSON:
{"currentMatch":${job.match||70},"missingSkills":["",""],"missingKeywords":["",""],"changes":["concrete resume change",""],"upgrades":[{"action":"Add AWS Certification","newMatch":81},{"action":"Add Splunk experience","newMatch":87}]}
upgrades: 2-4 specific actions, each with the realistic match % it would unlock (ascending, max 97). Base on the gap between candidate and job.
Candidate skills:${(profile.skills||[]).concat(profile.technicalSkills||[]).join(", ")} | Certs:${certNames(profile.certifications).join(", ")||"none"} | Clearance:${profile.clearance||"none"}
Job:${job.title} — ${(job.missing||[]).join(", ")||job.description||""}` }], { maxTokens:700, timeoutMs:20000 });
    return parseJSON(out) || localOptimize(job);
  } catch { return localOptimize(job); }
}
function localOptimize(job){
  const miss=(job.missing||[]).slice(0,3);
  const base=job.match||70;
  return { currentMatch:base, missingSkills:miss, missingKeywords:miss,
    changes:miss.map(m=>`Add "${m}" to your skills and a bullet showing it in action.`).concat(["Mirror the job title and key phrases from the posting.","Quantify your top 3 achievements with numbers."]).slice(0,4),
    upgrades:miss.map((m,i)=>({action:`Add ${m}`,newMatch:Math.min(97,base+(i+1)*5)})) };
}
// Salary negotiation numbers
async function negotiationNumbers(profile, job){
  try {
    const out=await callClaude([{role:"user",content:
      `Estimate negotiation figures for ${job.title} at ${job.company} (${job.location||"US"}). Listed: ${job.salary||"unlisted"}. Candidate clearance:${profile.clearance||"none"}, certs:${certNames(profile.certifications).join(", ")||"none"}. Return ONLY JSON:
{"market":"$0k–$0k","expectedOffer":"$0k–$0k","negotiationTarget":"$0k","rationale":"one sentence on why the target is justified"}` }], { maxTokens:300, timeoutMs:18000 });
    return parseJSON(out) || localNegotiation(profile, job);
  } catch { return localNegotiation(profile, job); }
}
function localNegotiation(profile, job){
  const est=estimateSalaryLocal(profile,{titles:[job?.title].filter(Boolean),city:job?.location});
  return { market:`${est.marketLow}–${est.marketHigh}`, expectedOffer:`${est.expectedLow}–${est.expectedHigh}`,
    negotiationTarget:est.expectedHigh, rationale:`Your${profile.clearance&&!/none/i.test(profile.clearance)?` ${profile.clearance} clearance and`:""} experience supports the upper end of the range.` };
}
// Mock interview turn: one question + feedback on the previous answer
const MOCK_QUESTIONS=["Tell me about yourself and your background.","Why are you interested in this role?","Describe a challenging project and how you handled it.","Tell me about a time you led a team under pressure.","How do you prioritize competing deadlines?","Describe a time you resolved a conflict.","What's a technical problem you're proud of solving?","Where do you see yourself growing in this role?"];
async function mockInterviewTurn(profile, job, history, answer){
  try {
    const out=await callClaude([{role:"user",content:
      `You are interviewing this candidate for ${job?.title||"a role"}${job?` at ${job.company}`:""}. ${answer?`Their answer to the last question: "${answer}". Give ONE line of brief constructive feedback, then ask the NEXT question.`:"Ask the FIRST interview question."} Keep it to 2-3 sentences. Mix behavioral + technical across the session. Already asked: ${history.map(h=>h.q).join(" | ")||"none"}.
Candidate: ${(profile?.workHistory||[]).slice(0,2).map(w=>w.title).join(", ")}, skills ${(profile?.skills||[]).slice(0,6).join(", ")}.` }], { maxTokens:280, timeoutMs:18000 });
    if(out && out.trim()) return out;
    throw new Error("empty");
  } catch {
    // Local fallback: acknowledge the answer and ask the next unused question.
    const asked=history.map(h=>h.q);
    const next=MOCK_QUESTIONS.find(q=>!asked.includes(q))||"Thanks — that wraps our practice session. Review your answers and refine your STAR stories.";
    return (answer?"Good — be specific with measurable results and keep it concise.\n\n":"")+next;
  }
}

/* ============ helpers ============ */
function humanError(e){ const m=e?.message||"";
  if(m==="AI_AUTH")return "AI service not connected (check ANTHROPIC_API_KEY in Vercel).";
  if(m==="TIMEOUT")return "This is taking longer than expected. Please try again.";
  if(m==="NETWORK")return "Couldn't reach the AI service. Please try again.";
  if(m==="PARSE")return "Couldn't read the AI response. Try again.";
  if(m==="EMPTY")return "That file looks empty.";
  if(m==="UNSUPPORTED")return "Use PDF, DOCX, or TXT.";
  if(m.startsWith("AI_HTTP"))return "AI service error ("+m.replace("AI_HTTP_","HTTP ")+"). Please try again.";
  // Otherwise it's the real upstream message (e.g. model/credit/key issue) — show it.
  return m || "Something went wrong."; }
const certNames=(arr=[])=>arr.map(c=>typeof c==="string"?c:(c?.name||"")).filter(Boolean);
const slug=t=>t.replace(/[^a-z0-9]+/gi,"_").toLowerCase().replace(/^_+|_+$/g,"")||"document";
function saveBlob(blob,name){ const url=URL.createObjectURL(blob);
  try{const a=document.createElement("a");a.href=url;a.download=name;a.style.display="none";document.body.appendChild(a);a.click();document.body.removeChild(a);}catch{window.open(url,"_blank");}
  setTimeout(()=>URL.revokeObjectURL(url),60000); }
const downloadDoc=(t,x)=>{ const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const body=x.split("\n").map(l=>l.trim()?`<p style="margin:0 0 6px;font-family:Calibri,Arial;font-size:11pt">${esc(l)}</p>`:"<br/>").join("");
  saveBlob(new Blob(["\ufeff",`<html xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>${body}</body></html>`],{type:"application/msword"}),slug(t)+".doc"); };
function openPrintable(t,x){ const w=window.open("","_blank"); if(!w)return; const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const body=x.split("\n").map(l=>l.trim()?`<p>${esc(l)}</p>`:"<br/>").join("");
  w.document.write(`<!doctype html><meta charset='utf-8'><title>${esc(t)}</title><style>body{font-family:Calibri,Arial;font-size:12pt;line-height:1.5;max-width:720px;margin:36px auto;padding:0 22px}p{margin:0 0 6px}.b{position:sticky;top:0;background:#0E5C4A;color:#fff;padding:10px 16px;margin:-36px -22px 22px;display:flex;gap:10px}button{font:inherit;font-weight:700;border:none;border-radius:8px;padding:8px 14px;background:#fff;color:#0E5C4A;cursor:pointer}@media print{.b{display:none}body{margin:0}}</style><div class='b'><span style='flex:1;font-weight:700'>${esc(t)}</span><button onclick='print()'>Save as PDF</button></div>${body}`); w.document.close(); }

const Spin=({label})=><div style={{display:"flex",alignItems:"center",gap:9,color:"var(--muted)",fontSize:14,padding:"26px 0",justifyContent:"center"}}><Loader2 size={17} className="cos-spin"/> {label}</div>;
function HeroRing({value}){ const size=92,stroke=9,r=(size-stroke)/2,c=2*Math.PI*r; const [n,setN]=useState(0);
  useEffect(()=>{let raf;const s=performance.now();const tick=t=>{const p=Math.min(1,(t-s)/800);setN(Math.round(value*(1-Math.pow(1-p,3))));if(p<1)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[value]);
  return (<div style={{position:"relative",width:size,height:size,flexShrink:0}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c-(n/100)*c} style={{transition:"stroke-dashoffset .1s"}}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff"}}><div className="serif" style={{fontSize:30,fontWeight:600,lineHeight:1}}>{n}</div><div style={{fontSize:10,opacity:.8,fontWeight:700}}>/100</div></div></div>); }
function LocAuto({value,onPick,onRemote}){
  const [q,setQ]=useState(value||""); const [open,setOpen]=useState(false); const [hl,setHl]=useState(0);
  useEffect(()=>{setQ(value||"");},[value]);
  const matches=(()=>{ const s=q.trim().toLowerCase(); const base=[["Remote","ANY","",""],...US_CITIES];
    if(!s) return base.slice(0,8);
    return base.filter(([c,st,zip,m])=>(`${c}, ${st}`).toLowerCase().includes(s)||c.toLowerCase().startsWith(s)||(zip&&zip.startsWith(s))||(m&&"metro".includes(s)&&s.length>2)).slice(0,8); })();
  const choose=(c,st)=>{ if(c==="Remote"){onRemote();setQ("Remote");}else{onPick(c,st);setQ(`${c}, ${st}`);} setOpen(false); };
  return (<div className="cos-ac"><span className="cos-label">Location</span>
    <input className="cos-input" placeholder="Type city, state, or ZIP — e.g. Atl" value={q} onChange={e=>{setQ(e.target.value);setOpen(true);setHl(0);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),160)}
      onKeyDown={e=>{if(e.key==="ArrowDown")setHl(h=>Math.min(h+1,matches.length-1));else if(e.key==="ArrowUp")setHl(h=>Math.max(h-1,0));else if(e.key==="Enter"&&matches[hl])choose(matches[hl][0],matches[hl][1]);}}/>
    {open&&matches.length>0&&<div className="cos-ac-list">{matches.map(([c,st,zip,m],i)=>(
      <div key={c+st+zip} className={`cos-ac-item ${i===hl?"hl":""}`} onMouseDown={()=>choose(c,st)}>{c==="Remote"?<Globe size={15} style={{color:"var(--primary)"}}/>:<MapPin size={15} style={{color:"var(--muted)"}}/>}{c==="Remote"?"Remote (anywhere)":`${c}, ${st}`}{zip&&<span className="meta">{m==="metro"?"Metro · ":""}{zip}</span>}</div>))}</div>}
  </div>); }

/* ============ MAIN ============ */
export default function CareerOS() {
  const [flow,setFlow]=useState("welcome"); const [tab,setTab]=useState("home"); const [error,setError]=useState("");
  const empty=()=>({name:"",email:"",phone:"",city:"",state:"",summary:"",skills:[],technicalSkills:[],certifications:[],workHistory:[],education:[],projects:[],leadership:[],clearance:""});
  const [profile,setProfile]=useState(null);
  const [prefs,setPrefs]=useState({titles:[],city:"",state:"",radius:50,remoteOnly:false,openToRelocate:false,workTypes:[],salaryTarget:""});
  const [customSal,setCustomSal]=useState("");
  const [jobs,setJobs]=useState([]); const [jobErrors,setJobErrors]=useState([]); const [jobDebug,setJobDebug]=useState(null);
  const [score,setScore]=useState(null); const [prevScore,setPrevScore]=useState(null);
  const [salary,setSalary]=useState(null); const [insights,setInsights]=useState([]);
  const [recommended,setRecommended]=useState([]);
  const [tracker,setTracker]=useState([]); const [selJob,setSelJob]=useState(null);
  const [buildMsg,setBuildMsg]=useState(""); const [parsing,setParsing]=useState(false); const [reupload,setReupload]=useState(false); const [enhancing,setEnhancing]=useState(false); const [fromResume,setFromResume]=useState(false);
  const [jobsLoading,setJobsLoading]=useState(false); const [opt,setOpt]=useState({status:"idle",stage:"",data:null,error:""});
  const [sheet,setSheet]=useState(null); const [mbreak,setMbreak]=useState(null); const [toast,setToast]=useState("");
  const [filterSheet,setFilterSheet]=useState(false);
  const [applyPrompt,setApplyPrompt]=useState(null); // {job} → "Did you apply?"
  const [negotiate,setNegotiate]=useState(null); // {job, loading, data}
  const [mock,setMock]=useState(null); // {job, history:[{q,a}], busy, current}
  const [jobOpt,setJobOpt]=useState(null); // {job, loading, data} optimization engine
  // per-section loading for instant dashboard shell
  const [loading,setLoading]=useState({ score:false, jobs:false, coach:false, salary:false });
  const analyzedSig=useRef(null); // cache: skip re-analysis unless resume changes
  const [ptr,setPtr]=useState(0); const ptrStart=useRef(null);
  const fileRef=useRef(null); const reRef=useRef(null); const scrollRef=useRef(null);

  // ---- PRODUCTION PERSISTENCE: hydrate from Supabase + write settings through ----
  // Additive only: if Supabase isn't configured, every call no-ops and the app
  // behaves exactly like the in-memory prototype.
  usePersistence({ tracker, setTracker, prefs, setPrefs, profile, setProfile });
  // NOTE: we intentionally do NOT auto-jump to the dashboard just because a name
  // exists. The dashboard is gated on a complete profile (see profileComplete).

  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),3500);return()=>clearTimeout(t);},[toast]);
  const initials=(profile?.name||"").trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join("").toUpperCase()||"·";
  const toggle=(k,v)=>setPrefs(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const effSal=prefs.salaryTarget||customSal;
  // Single source of truth: is the profile real enough to unlock the dashboard?
  const profileComplete = !!(
    profile && profile.name && String(profile.name).trim().split(/\s+/).length >= 2 &&
    (prefs.remoteOnly || prefs.city) && effSal &&
    (prefs.titles||[]).length > 0 &&
    ((profile.skills||[]).length >= 3) &&
    ((profile.workHistory||[]).length >= 1 || (profile.summary||"").length > 20)
  );
  const missingFields = (()=>{ const m=[];
    if(!(profile?.name && String(profile.name).trim().split(/\s+/).length>=2)) m.push("Full name");
    if(!(prefs.remoteOnly||prefs.city)) m.push("Location");
    if(!effSal) m.push("Salary target");
    if(!((prefs.titles||[]).length>0)) m.push("Desired roles");
    if(!((profile?.skills||[]).length>=3)) m.push("At least 3 skills");
    if(!((profile?.workHistory||[]).length>=1 || (profile?.summary||"").length>20)) m.push("Experience");
    return m; })();

  const onFile=async e=>{const f=e.target.files?.[0];if(!f)return;setParsing(true);setError("");
    try{
      const { profile:local, text }=await extractProfile(f);   // local extraction, no AI
      const np={...empty(),...local};
      setProfile(np);
      setFromResume(true);
      setFlow("wizard");                                       // show wizard immediately
      setParsing(false);
      // Background, optional: AI enhancement + role suggestions. Failures are silent.
      setEnhancing(true);
      enhanceProfileWithAI(np, text)
        .then(better=>{ setProfile(prev=>({ ...empty(), ...mergeProfiles(prev, better) })); })
        .catch(()=>{})
        .finally(()=>setEnhancing(false));
      recommendTitles(np).then(t=>{ if(t?.length){ setRecommended(t); setPrefs(pr=>pr.titles.length?pr:{...pr,titles:t.slice(0,3)}); } }).catch(()=>{});
    }catch(err){
      // Only true extraction failures land here (empty/scanned/unsupported file).
      const m=err?.message;
      setError(m==="PARSE_FAILED"?"Resume could not be parsed. Please upload another file or enter manually.":m==="EMPTY"?"We couldn't read text from that file — it may be a scanned image. Please upload another file or enter manually.":m==="UNSUPPORTED"?"Use a PDF, DOCX, or TXT file — or build manually.":"Resume could not be parsed. Please upload another file or enter manually.");
      setParsing(false);
    }};

  const sigOf=p=>JSON.stringify({n:p?.name,s:p?.skills,c:p?.certifications,w:(p?.workHistory||[]).map(x=>x.title)});

  // Instant shell: enter app immediately, load each section in the background with skeletons.
  const runAnalysis=async(p,pr,{force=false}={})=>{
    const sig=sigOf(p)+"|"+JSON.stringify(pr.titles)+"|"+pr.city+pr.state+pr.remoteOnly+pr.radius;
    if(!force && analyzedSig.current===sig) return; // cached — don't redo
    const resumeChanged = !analyzedSig.current || analyzedSig.current.split("|")[0]!==sigOf(p);
    analyzedSig.current=sig;
    // resume score + salary only when the resume itself changed (cache otherwise)
    if(force || resumeChanged){
      setLoading(l=>({...l,score:true,salary:true}));
      scoreResume(p).then(s=>{setScore(s); persist.resume({ filePath:null, fileName:p?.name||"resume", parsed:p, score:s }); }).catch(()=>{}).finally(()=>setLoading(l=>({...l,score:false})));
      fetchSalary(p,pr).then(s=>setSalary(s)).catch(()=>{}).finally(()=>setLoading(l=>({...l,salary:false})));
    }
    // jobs + coach always refresh (depend on filters too)
    setLoading(l=>({...l,jobs:true,coach:true}));
    getJobs(p,pr).then(jr=>{setJobs(jr.jobs);setJobErrors(jr.errors);setJobDebug(jr.debug);
      coachInsights(p,jr.jobs,null,pr).then(ins=>setInsights(ins)).catch(()=>{}).finally(()=>setLoading(l=>({...l,coach:false})));
    }).catch(()=>{setJobDebug({connected:!!JOB_PROXY_URL,error:"Unexpected error",returned:0});}).finally(()=>setLoading(l=>({...l,jobs:false})));
  };

  const build=()=>{ setFlow("building"); setBuildMsg("Finding your matches…");
    // enter the app quickly; sections stream in with skeletons (local engine is instant)
    setTimeout(()=>{ setFlow("app"); setTab("home"); runAnalysis(profile,prefs,{force:true}); }, 350); };

  const refreshJobs=async(override)=>{setJobsLoading(true);const p={...prefs,...(override||{})};if(override)setPrefs(p);setLoading(l=>({...l,jobs:true}));
    try{const jr=await getJobs(profile,p);setJobs(jr.jobs);setJobErrors(jr.errors);setJobDebug(jr.debug);}
    finally{setJobsLoading(false);setLoading(l=>({...l,jobs:false}));}};

  const onReupload=async e=>{const f=e.target.files?.[0];if(!f)return;setReupload(true);
    try{const { profile:local, text }=await extractProfile(f);const np={...empty(),...local};setProfile(np);setPrevScore(score?.score??null);
      analyzedSig.current=null; // invalidate cache so everything recomputes
      enhanceProfileWithAI(np,text).then(better=>setProfile(prev=>({...empty(),...mergeProfiles(prev,better)}))).catch(()=>{});
      recommendTitles(np).then(t=>{if(t?.length)setRecommended(t);}).catch(()=>{});
      await runAnalysis(np,prefs,{force:true});
      setToast("Resume updated. Everything refreshed.");}
    catch(err){const m=err?.message;setToast(m==="EMPTY"?"Couldn't read text from that file (maybe scanned).":m==="UNSUPPORTED"?"Use PDF, DOCX, or TXT.":"Couldn't read that file.");}finally{setReupload(false);}};

  const runOpt=async job=>{if(!profile){setOpt({status:"error",stage:"",data:null,error:"No resume found. Upload one first."});return;}
    setPrevScore(score?.score??null);setOpt({status:"running",stage:"Analyzing resume…",data:null,error:""});
    try{const data=await optimize(profile,job,st=>setOpt(o=>({...o,stage:st})));const newScore=Math.min(98,(score?.potentialScore||(score?.score||70)+8));setOpt({status:"done",stage:"",data:{...data,newScore},error:""});}
    catch(e){setOpt({status:"error",stage:"",data:null,error:e?.message==="AI_AUTH"?"Optimization failed: AI service not connected (API key missing).":"Optimization failed. "+humanError(e)});}};

  // Interview prep + other docs with 10s timeout guard, never infinite
  const openGen=async(kind,label,job)=>{
    if(!profile){setSheet({title:label,loading:false,text:"No resume found. Upload one first."});return;}
    if(["cover","outreach","linkedin","followup","interview","tailored"].includes(kind)&&!job){setSheet({title:label,loading:false,text:"Select or save a job first."});return;}
    setSheet({title:label,loading:true,text:"",kind});
    try{const text=await genDoc(kind,profile,job);setSheet({title:label,loading:false,text,kind,job});}
    catch(e){const m=e?.message;setSheet({title:label,loading:false,text:m==="TIMEOUT"?`${label} is taking longer than expected. Please try again.`:`${label} unavailable. Please try again.`});}};

  const saveJob=(job,stage="Saved")=>{const found=tracker.find(t=>t.title===job.title&&t.company===job.company);
    if(found){ if(stage!=="Saved"){ setStage(found.id,stage); } else { setToast("Already saved"); } return found.id; }
    const id="t"+Date.now()+Math.random().toString(36).slice(2,5);
    setTracker(t=>[...t,{...job,id,stage,savedAt:new Date().toLocaleDateString(),appliedAt:stage==="Applied"?new Date().toLocaleDateString():null}]);
    persist.application(job,stage); persist.savedMatch(job); // → Supabase (no-op if unconfigured)
    setToast(stage==="Applied"?"Moved to Applications · Applied":stage==="Not Interested"?"Marked not interested":"Saved to Applications");return id;};
  const setStage=(id,stage)=>{ setTracker(ts=>ts.map(t=>t.id===id?{...t,stage,
    appliedAt:(stage==="Applied"&&!t.appliedAt)?new Date().toLocaleDateString():t.appliedAt,
    interviewAt:(stage==="Interview Scheduled"&&!t.interviewAt)?new Date().toLocaleDateString():t.interviewAt}:t));
    if(!String(id).startsWith("t")) persist.setStage(id,stage); }; // persist if it's a DB row id
  // Apply Now → open employer page, then prompt "Did you apply?"
  const handleApply=job=>{ if(job.applyUrl){ try{ window.open(job.applyUrl,"_blank","noopener,noreferrer"); }catch{} setTimeout(()=>setApplyPrompt(job),400); } else { setToast("This listing has no application link yet"); setApplyPrompt(job); } };
  const resolveApply=(job,choice)=>{ setApplyPrompt(null);
    if(choice==="Applied") saveJob(job,"Applied");
    else if(choice==="Save for Later") saveJob(job,"Saved");
    else if(choice==="Not Interested") saveJob(job,"Not Interested"); };

  // pull-to-refresh (Jobs/Home)
  const onTouchStart=e=>{if(scrollRef.current?.scrollTop<=0)ptrStart.current=e.touches[0].clientY;};
  const onTouchMove=e=>{if(ptrStart.current==null)return;const d=e.touches[0].clientY-ptrStart.current;if(d>0)setPtr(Math.min(70,d*.5));};
  const onTouchEnd=()=>{if(ptr>50&&(tab==="jobs"||tab==="home")){refreshJobs(false);setToast("Refreshing…");}setPtr(0);ptrStart.current=null;};

  /* ---------- ONBOARDING ---------- */
  if(flow!=="app"){
    return (<div className="cos"><style>{STYLES}</style>
      {flow==="welcome"&&(<div className="cos-onb" style={{justifyContent:"center",textAlign:"center"}}>
        <div className="cos-dropic" style={{width:64,height:64,borderRadius:20,margin:"0 auto 20px"}}><Globe size={28}/></div>
        <h1 style={{fontSize:30}} className="serif">Welcome to<br/>Career OS</h1>
        <p className="lead" style={{maxWidth:300,margin:"10px auto 26px"}}>Build your profile in a few quick steps. Upload a resume to autofill, or build it yourself.</p>
        {error&&<div className="cos-banner warn" style={{textAlign:"left"}}><AlertTriangle size={15} style={{flexShrink:0}}/>{error}</div>}
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={onFile}/>
        <button className="cos-btn cos-btn-primary cos-btn-block" disabled={parsing} onClick={()=>fileRef.current?.click()}>{parsing?<><Loader2 size={16} className="cos-spin"/> Reading…</>:<><Upload size={16}/> Upload Resume</>}</button>
        <button className="cos-btn cos-btn-ghost cos-btn-block" style={{marginTop:10}} disabled={parsing} onClick={()=>{setProfile(empty());setFromResume(false);setFlow("wizard");}}><Pencil size={15}/> Build Manually</button>
        <div style={{marginTop:16,fontSize:12,color:"var(--muted)"}}>PDF, DOCX, or TXT · works without AI</div></div>)}

      {flow==="wizard"&&profile&&(
        <Onboarding
          profile={profile} setProfile={setProfile}
          prefs={prefs} setPrefs={setPrefs}
          customSal={customSal} setCustomSal={setCustomSal}
          recommended={recommended} enhancing={enhancing}
          onExit={()=>setFlow("welcome")}
          onFinish={build}
          initialStep={fromResume?1:0}
        />)}

      {flow==="building"&&(<div className="cos-onb" style={{justifyContent:"center",alignItems:"center",textAlign:"center",background:"var(--primary-deep)",color:"#F4F0E7",borderRadius:30}}>
        <Loader2 size={42} className="cos-spin"/><div className="serif" style={{fontSize:24,fontWeight:600,marginTop:20}}>Building your dashboard</div><div style={{opacity:.8,fontSize:15,marginTop:8}}>{buildMsg||"Finding your matches…"}</div></div>)}
    </div>);
  }

  /* ---------- APP ---------- */
  const TABS=[["home","Home",Home],["resume","Resume",FileText],["jobs","Jobs",Target],["coach","Coach",MessageSquare],["apps","Applications",Briefcase]];
  const buckets={strong:jobs.filter(j=>(j.match||0)>=75),good:jobs.filter(j=>(j.match||0)>=60&&(j.match||0)<75),stretch:jobs.filter(j=>(j.match||0)<60)};
  // mission-control metrics
  const applied=tracker.filter(t=>ACTIVE_STAGES.includes(t.stage));
  const interviewing=tracker.filter(t=>t.stage==="Interview Scheduled"||t.stage==="Interview Completed");
  const offers=tracker.filter(t=>t.stage==="Offer Received"||t.stage==="Accepted");
  const interviewRate=applied.length?Math.round((interviewing.length/applied.length)*100):0;
  const avgMatch=jobs.length?Math.round(jobs.reduce((s,j)=>s+(j.match||0),0)/jobs.length):0;
  const salaryTargetNum=parseInt(String(effSal).replace(/[^0-9]/g,""))||0;
  const salaryCurNum=parseInt(String(salary?.expectedHigh||salary?.marketHigh||"").replace(/[^0-9]/g,""))*( /k/i.test(salary?.expectedHigh||salary?.marketHigh||"")?1000:1)||0;
  const salaryPct=salaryTargetNum&&salaryCurNum?Math.min(100,Math.round((salaryCurNum/(salaryTargetNum>1000?salaryTargetNum:salaryTargetNum*1000))*100)):0;
  // daily feed buckets (no posted-date for sample/keyless; treat all current results as "this week")
  const today=jobs.filter(j=>{const d=j.posted&&new Date(j.posted);return d&&((Date.now()-d.getTime())/864e5)<=1;});
  const highMatch=jobs.filter(j=>(j.match||0)>=85);
  const recent=tracker.slice(-4).reverse();

  return (<div className="cos"><style>{STYLES}</style>
    <div className="cos-appbar">
      <div><h1 className="serif">{tab==="home"?`Hi, ${profile?.name?.split(" ")[0]||"there"}`:TABS.find(t=>t[0]===tab)[1]}</h1>
        <div className="sub">{prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:"")} · Target {effSal||"—"}</div></div>
      <button className="cos-avatar" title={auth?.configured?"Sign out":"Profile"} style={{border:"none",cursor:auth?.configured?"pointer":"default"}}
        onClick={async()=>{ if(auth?.configured){ try{ await auth.signOut(); }catch{} location.reload(); } }}>{initials}</button></div>

    <div className="cos-scroll" ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="cos-ptr" style={{height:ptr}}>{ptr>50?<><RefreshCw size={14} className="cos-spin"/> Release to refresh</>:ptr>0?<><RefreshCw size={14}/> Pull to refresh</>:null}</div>

      {/* GATE: nothing unlocks until the profile is genuinely complete */}
      {!profileComplete?(<div className="cos-reveal" style={{paddingTop:30}}>
        <div className="cos-card cos-empty">
          <div className="cos-empty-ic"><FileText size={24}/></div>
          <div style={{fontWeight:700,fontSize:17}}>Finish your profile first</div>
          <p style={{color:"var(--muted)",fontSize:13.5,margin:"8px auto 0",lineHeight:1.5,maxWidth:300}}>We need a bit more before we can score your resume and match real jobs.</p>
          <div style={{textAlign:"left",background:"var(--paper)",borderRadius:13,padding:"13px 15px",margin:"16px 0",fontSize:13.5,lineHeight:1.9}}>
            <div className="cos-sec" style={{margin:"0 0 6px"}}>Still needed</div>
            {missingFields.map(f=>(<div key={f} style={{display:"flex",alignItems:"center",gap:8}}><X size={14} style={{color:"var(--accent)",flexShrink:0}}/>{f}</div>))}
          </div>
          <button className="cos-btn cos-btn-primary cos-btn-block" onClick={()=>{setFromResume(false);setFlow("wizard");}}><Pencil size={15}/> Complete my profile</button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={onFile}/>
          <button className="cos-btn cos-btn-ghost cos-btn-block" style={{marginTop:10}} disabled={parsing} onClick={()=>fileRef.current?.click()}>{parsing?<><Loader2 size={15} className="cos-spin"/> Reading…</>:<><Upload size={15}/> Upload Resume</>}</button>
        </div>
      </div>):(<>
      {/* HOME = Mission Control */}
      {tab==="home"&&(<div className="cos-reveal">
        {loading.score&&!score?(<div className="cos-hero" style={{opacity:.7}}><div className="cos-hero-row"><div style={{width:92,height:92,borderRadius:"50%",background:"rgba(255,255,255,.15)"}} className="cos-skel"/><div style={{flex:1}}><div className="cos-skel" style={{height:13,width:"50%",background:"rgba(255,255,255,.2)",borderRadius:6}}/><div className="cos-skel" style={{height:20,width:"70%",background:"rgba(255,255,255,.2)",borderRadius:6,marginTop:10}}/></div></div></div>)
        :score&&(<div className="cos-hero"><div className="cos-hero-row"><HeroRing value={score.score||0}/>
          <div style={{flex:1}}><div style={{fontSize:13,opacity:.8,fontWeight:600}}>Resume Score</div>
            <div className="serif" style={{fontSize:21,fontWeight:600,margin:"2px 0 8px"}}>{score.score>=90?"Excellent":score.score>=75?"Strong":score.score>=60?"Solid start":"Needs work"}</div>
            <div className="cos-pillrow">{score.potentialScore>score.score&&<span className="cos-pill">↑ {score.potentialScore} potential</span>}<span className="cos-pill">{jobs.length} matches</span></div></div></div></div>)}

        {/* Metrics grid */}
        <div className="cos-metrics">
          <div className="cos-metric"><div className="mv">{loading.jobs?"…":jobs.length}</div><div className="ml"><Target size={11}/> Jobs found</div></div>
          <div className="cos-metric"><div className="mv">{applied.length}</div><div className="ml"><CheckCircle size={11}/> Applied</div></div>
          <div className="cos-metric"><div className="mv">{interviewRate}%</div><div className="ml"><Activity size={11}/> Interview rate</div></div>
          <div className="cos-metric"><div className="mv">{loading.jobs?"…":avgMatch+"%"}</div><div className="ml"><Gauge size={11}/> Avg match</div></div>
          <div className="cos-metric"><div className="mv">{interviewing.length}</div><div className="ml"><CalendarClock size={11}/> Interviews</div></div>
          <div className="cos-metric"><div className="mv">{offers.length}</div><div className="ml"><Handshake size={11}/> Offers</div></div>
        </div>

        {/* Career Readiness Score */}
        {score&&(()=>{const r=readinessLocal(profile,score);return(
          <div className="cos-card" style={{padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{position:"relative",width:62,height:62,flexShrink:0}}>
                <svg width="62" height="62" style={{transform:"rotate(-90deg)"}}><circle cx="31" cy="31" r="26" fill="none" stroke="var(--line)" strokeWidth="7"/><circle cx="31" cy="31" r="26" fill="none" stroke="var(--primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={2*Math.PI*26} strokeDashoffset={2*Math.PI*26*(1-r.overall/100)}/></svg>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:600}}>{r.overall}</div>
              </div>
              <div><div style={{fontWeight:800,fontSize:15}}>Career Readiness</div><div style={{fontSize:12.5,color:"var(--muted)"}}>{r.overall>=80?"You're interview-ready":r.overall>=60?"Solid — a few gaps to close":"Build out your profile to improve"}</div></div>
            </div>
            {Object.entries(r.breakdown).map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:9,marginBottom:7,fontSize:12.5}}>
              <span style={{width:118,flexShrink:0,color:"var(--muted)",fontWeight:600}}>{k}</span>
              <div className="cos-progress" style={{flex:1}}><i style={{width:`${v}%`}}/></div>
              <span style={{fontWeight:800,width:30,textAlign:"right"}}>{v}</span></div>))}
            <div className="cos-banner ok" style={{marginTop:11}}><Lightbulb size={15} style={{flexShrink:0}}/>Fastest way to improve: {r.tip}</div>
          </div>);})()}

        {/* Salary target progress */}
        {effSal&&(<div className="cos-card" style={{padding:"15px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <div style={{fontWeight:700,fontSize:14}}>Salary target progress</div>
            <div style={{fontSize:12.5,color:"var(--muted)"}}>{salary?.expectedHigh||"—"} / {effSal}</div></div>
          <div className="cos-progress"><i style={{width:`${salaryPct||6}%`}}/></div>
          <div style={{fontSize:11.5,color:"var(--muted)",marginTop:7}}>{salaryPct?`You're tracking ~${salaryPct}% to your target. ${salary?.targetVerdict||""}`:"Add salary data to track progress."}</div>
        </div>)}

        {/* Daily AI Feed */}
        <div className="cos-card">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Sparkle size={17} style={{color:"var(--accent)"}}/><div style={{fontWeight:800,fontSize:16}}>New jobs for you</div></div>
          <div className="cos-chips" style={{marginBottom:10}}>
            <span className="cos-chip on" style={{padding:"6px 12px",fontSize:12}}>New today · {today.length}</span>
            <span className="cos-chip" style={{padding:"6px 12px",fontSize:12}}>This week · {jobs.length}</span>
            <span className="cos-chip" style={{padding:"6px 12px",fontSize:12}}>High match · {highMatch.length}</span>
          </div>
          {loading.jobs?[0,1,2].map(i=><div key={i} className="cos-feedrow"><span className="rank cos-skel" style={{background:"var(--line)"}}/><div style={{flex:1}}><div className="cos-skel" style={{height:13,width:"60%",background:"var(--line)",borderRadius:6}}/><div className="cos-skel" style={{height:11,width:"35%",background:"var(--line)",borderRadius:6,marginTop:6}}/></div></div>)
          :jobs.length===0?(<div style={{fontSize:13.5,color:"var(--muted)",padding:"10px 0"}}>No active jobs yet. Open Jobs to search or connect your job service.</div>)
          :(highMatch.length?highMatch:jobs).slice(0,5).map((j,i)=>{const b=badge(j.match||0);return(
            <div key={i} className="cos-feedrow" onClick={()=>{setSelJob(j);setTab("jobs");}}>
              <span className="rank">{i+1}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{j.title}</div><div style={{fontSize:12,color:"var(--muted)"}}>{j.company}</div></div>
              <span className="pct" style={{color:b.color}}>{j.match??"—"}%</span></div>);})}
          <button className="cos-btn cos-btn-soft cos-btn-block" style={{marginTop:12}} onClick={()=>setTab("jobs")}><Target size={15}/> View all matches</button>
        </div>

        {/* Recent activity */}
        {recent.length>0&&(<div className="cos-card"><div className="cos-sec">Recent activity</div>
          {recent.map(t=>(<div key={t.id} className="cos-feedrow" style={{cursor:"default"}}><span className="rank" style={{background:"var(--primary-soft)",color:"var(--primary)"}}><Clock size={12}/></span>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div><div style={{fontSize:11.5,color:"var(--muted)"}}>{t.company}</div></div>
            <span className="cos-jm" style={{fontWeight:700}}>{t.stage}</span></div>))}</div>)}

        {/* Coach insight */}
        {loading.coach&&!insights.length?<div className="cos-card flat" style={{display:"flex",gap:10,padding:"13px 15px"}}><Lightbulb size={16} style={{color:"var(--accent)",flexShrink:0}}/><div className="cos-skel" style={{height:14,flex:1,background:"var(--line)",borderRadius:6}}/></div>
        :insights.length>0&&(<div className="cos-card flat" style={{display:"flex",gap:10,padding:"13px 15px"}}><Lightbulb size={16} style={{color:"var(--accent)",flexShrink:0,marginTop:1}}/><div style={{flex:1}}><span style={{fontSize:13.5,lineHeight:1.45}}>{insights[0]}</span><button className="cos-explain" style={{marginTop:8}} onClick={()=>setTab("coach")}>Ask your coach →</button></div></div>)}
      </div>)}

      {/* RESUME */}
      {tab==="resume"&&(<div className="cos-reveal">
        <input ref={reRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={onReupload}/>
        <button className="cos-btn cos-btn-ghost cos-btn-block" style={{marginBottom:13}} disabled={reupload} onClick={()=>reRef.current?.click()}>{reupload?<><Loader2 size={15} className="cos-spin"/> Updating everything…</>:<><RotateCcw size={15}/> Upload new resume / Re-analyze</>}</button>
        {!score?<div className="cos-card"><Spin label="No score yet."/></div>:(<>
          <div className="cos-hero"><div className="cos-hero-row"><HeroRing value={score.score||0}/><div style={{flex:1}}><div style={{fontSize:13,opacity:.8,fontWeight:600}}>Current score</div>
            {prevScore!=null&&prevScore!==score.score&&<div className="cos-pill" style={{marginTop:6}}>{score.score>prevScore?"↑":"↓"} from {prevScore}</div>}
            {score.potentialScore>score.score&&<div className="serif" style={{fontSize:18,marginTop:8}}>Reach {score.potentialScore} with fixes ↓</div>}</div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
            <div className="cos-card flat"><div className="cos-sec" style={{display:"flex",alignItems:"center",gap:6}}><CheckCircle2 size={13} style={{color:"var(--primary)"}}/> Strengths</div>{(score.strengths||[]).map(s=><div key={s} style={{fontSize:13,display:"flex",gap:7,marginBottom:7,lineHeight:1.35}}><Check size={14} style={{color:"var(--primary)",flexShrink:0,marginTop:1}}/>{s}</div>)}</div>
            <div className="cos-card flat"><div className="cos-sec" style={{display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={13} style={{color:"var(--accent)"}}/> Weak spots</div>{(score.weaknesses||[]).map(s=><div key={s} style={{fontSize:13,display:"flex",gap:7,marginBottom:7,lineHeight:1.35}}><X size={14} style={{color:"var(--accent)",flexShrink:0,marginTop:1}}/>{s}</div>)}</div></div>
          <div className="cos-card" style={{marginTop:2}}><div className="cos-sec" style={{display:"flex",alignItems:"center",gap:6}}><Zap size={13} style={{color:"var(--gold)"}}/> Top 3 fixes</div>{(score.topFixes||[]).slice(0,3).map((f,i)=><div key={i} style={{display:"flex",gap:11,padding:"9px 0",borderBottom:i<2?"1px solid var(--line)":"none"}}><span style={{width:24,height:24,borderRadius:8,background:"var(--primary)",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span><span style={{fontSize:13.5,lineHeight:1.4}}>{f}</span></div>)}</div>
          <div className="cos-sec" style={{marginTop:16}}>Optimize resume</div>
          <button className="cos-btn cos-btn-primary cos-btn-block" disabled={opt.status==="running"} onClick={()=>runOpt(null)}>{opt.status==="running"?<><Loader2 size={15} className="cos-spin"/> {opt.stage}</>:<><Wand2 size={15}/> Optimize my resume</>}</button>
          {opt.status==="error"&&<div className="cos-banner warn" style={{marginTop:12}}><AlertCircle size={15} style={{flexShrink:0}}/>{opt.error}</div>}
          {opt.status==="done"&&opt.data&&(<div className="cos-card cos-reveal" style={{marginTop:13}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",marginBottom:14,textAlign:"center"}}>
              <div><div className="cos-sec" style={{margin:0}}>Original</div><div className="serif" style={{fontSize:30,fontWeight:600,color:"var(--muted)"}}>{prevScore??score.score}</div></div><ArrowRight size={22} style={{color:"var(--accent)"}}/>
              <div><div className="cos-sec" style={{margin:0,color:"var(--primary)"}}>New est.</div><div className="serif" style={{fontSize:30,fontWeight:600,color:"var(--primary)"}}>{opt.data.newScore}</div></div></div>
            {opt.data._fallback&&<div className="cos-banner warn"><AlertTriangle size={14} style={{flexShrink:0}}/>AI rewrite unavailable — showing rule-based suggestions. Try again for a full rewrite.</div>}
            {opt.data.summary&&<div style={{marginBottom:11}}><div className="cos-sec">Improved summary</div><div style={{fontSize:13,lineHeight:1.5}}>{opt.data.summary}</div></div>}
            {opt.data.bullets?.length>0&&<div style={{marginBottom:11}}><div className="cos-sec">Stronger bullets</div>{opt.data.bullets.map((b,i)=><div key={i} style={{fontSize:13,lineHeight:1.45,marginBottom:5,display:"flex",gap:7}}><span style={{color:"var(--primary)"}}>•</span>{b}</div>)}</div>}
            {opt.data.fullResume&&<div><div className="cos-sec">Preview</div><div className="cos-preview">{opt.data.fullResume}</div></div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:13}}><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>openPrintable("Optimized Resume",opt.data.fullResume)}><FileText size={13}/> Open / PDF</button><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>{downloadDoc("optimized_resume",opt.data.fullResume);setToast("Saved Word doc");}}><Download size={13}/> Word</button><button className="cos-btn cos-btn-primary cos-btn-sm" style={{flex:1}} onClick={()=>{refreshJobs(false);setToast("Re-running matches…");}}><RefreshCw size={13}/> Re-run match</button></div>
          </div>)}</>)}</div>)}

      {/* JOBS */}
      {tab==="jobs"&&(<div className="cos-reveal">
        {DEBUG&&!JOB_PROXY_URL&&(<div className="cos-banner warn" style={{alignItems:"center"}}>
          <AlertTriangle size={16} style={{flexShrink:0}}/>
          <div><b>Job API not connected (dev mode).</b> The front end is working — only the backend job service is missing. Deploy the proxy and set <code style={{fontSize:11}}>JOB_PROXY_URL</code> to load real jobs. Until then, live listings can't load in-browser.</div>
        </div>)}
        {/* What roles are you after? — editable, drives matching */}
        <div className="cos-card flat" style={{padding:"14px 15px",marginBottom:12}}>
          <div className="cos-sec" style={{marginBottom:8}}>What roles are you after?</div>
          {recommended.length>0&&<div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Recommended from your resume — tap to add:</div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>
            {[...new Set([...prefs.titles,...recommended])].map(t=>{const on=prefs.titles.includes(t);return(
              <button key={t} className={`cos-chip ${on?"on":""}`} style={{padding:"7px 12px",fontSize:12}} onClick={()=>toggle("titles",t)}>{on?"✓ ":"+ "}{t}</button>);})}
          </div>
          <input className="cos-input" style={{padding:"10px 13px",fontSize:13.5}} placeholder="Add a custom title + Enter" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){toggle("titles",e.target.value.trim());e.target.value="";}}}/>
        </div>
        <LocAuto value={prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:"")} onPick={(c,st)=>setPrefs({...prefs,city:c,state:st,remoteOnly:false})} onRemote={()=>setPrefs({...prefs,remoteOnly:true})}/>
        <div className="cos-chips" style={{margin:"6px 0 4px"}}>{[{v:10,l:"10mi"},{v:25,l:"25mi"},{v:50,l:"50mi"},{v:100,l:"100mi"},{v:250,l:"250mi"},{v:"remote",l:"Anywhere"}].map(r=>(<button key={r.l} className={`cos-chip ${prefs.radius===r.v?"on":""}`} onClick={()=>setPrefs({...prefs,radius:r.v})}>{r.l}</button>))}</div>
        <div className="cos-chips" style={{marginBottom:8}}>{["Remote","Hybrid","On-Site","Any"].map(w=><button key={w} className={`cos-chip ${prefs.workTypes.includes(w)?"on":""}`} onClick={()=>toggle("workTypes",w)}>{w}</button>)}</div>
        <div style={{display:"flex",gap:8,marginBottom:13}}>
          <button className="cos-btn cos-btn-primary" style={{flex:1}} onClick={()=>{if(!prefs.titles.length){setToast("Add at least one target role");return;}if(!prefs.remoteOnly&&!prefs.city){setToast("Pick a location or go Remote");return;}refreshJobs(false);}} disabled={jobsLoading||loading.jobs}>{(jobsLoading||loading.jobs)?<><Loader2 size={15} className="cos-spin"/> Searching…</>:<><Search size={15}/> Search jobs</>}</button>
          <button className="cos-btn cos-btn-ghost" onClick={()=>setFilterSheet(true)}><SlidersHorizontal size={15}/></button>
        </div>

        {DEBUG&&jobDebug&&(<details className="cos-card flat" style={{padding:"12px 14px",marginBottom:12}}>
          <summary style={{fontSize:12,fontWeight:700,color:"var(--muted)",cursor:"pointer"}}>🛠 Debug · job search</summary>
          <div style={{fontSize:11.5,lineHeight:1.7,marginTop:8,fontFamily:"ui-monospace,monospace",color:"var(--ink)"}}>
            <div>API connected: <b style={{color:jobDebug.connected?"var(--primary)":"var(--red)"}}>{jobDebug.connected?"yes (proxy)":"no — using direct keyless sources"}</b></div>
            <div>Source: {jobDebug.source}</div>
            <div>Roles searched: {(jobDebug.roles||[]).join(", ")||"—"}</div>
            <div>Location sent: {jobDebug.location}</div>
            <div>Radius sent: {jobDebug.radius}</div>
            <div>Jobs returned: <b>{jobDebug.returned}</b></div>
            {jobDebug.error&&<div style={{color:"var(--red)"}}>Error: {jobDebug.error}</div>}
          </div></details>)}

        {jobErrors.length>0&&jobs.length>0&&<div className="cos-banner warn"><AlertTriangle size={14} style={{flexShrink:0}}/>Some sources unreachable; showing the rest. Search widens automatically: city → state → region → remote.</div>}

        {(jobsLoading||loading.jobs)?(<><JobSkeleton/><JobSkeleton/><JobSkeleton/></>)
        :jobs.length===0?(<div className="cos-card cos-empty"><div className="cos-empty-ic"><Search size={24}/></div>
          <div style={{fontWeight:700,fontSize:16}}>No jobs found yet</div>
          <p style={{color:"var(--muted)",fontSize:13.5,margin:"7px auto 0",lineHeight:1.45,maxWidth:300}}>Try widening your search or switching to remote.</p>
          <div style={{textAlign:"left",background:"var(--paper)",borderRadius:13,padding:"12px 14px",margin:"14px 0",fontSize:12.5,lineHeight:1.7}}>
            <div className="cos-sec" style={{margin:"0 0 6px"}}>Current filters</div>
            <div>Roles: <b>{prefs.titles.join(", ")||"none"}</b></div>
            <div>Location: <b>{prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:"none")}</b></div>
            <div>Radius: <b>{prefs.radius==="remote"?"Anywhere":prefs.radius+" mi"}</b></div>
            <div>Work type: <b>{prefs.workTypes.join(", ")||"Any"}</b></div>
            <div>Salary target: <b>{effSal||"—"}</b></div>
          </div>
          {DEBUG&&<div style={{textAlign:"left",fontSize:11.5,color:"var(--muted)",marginBottom:8,fontFamily:"ui-monospace,monospace"}}>🛠 {jobDebug?.error||(JOB_PROXY_URL?"Connected · no results for these filters.":"Dev: JOB_PROXY_URL not set.")}</div>}
          <div className="cos-empty-acts">
            <button className="cos-btn cos-btn-primary cos-btn-sm" onClick={()=>refreshJobs(false)}><RefreshCw size={13}/> Try Again</button>
            <button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>{const next=prefs.radius==="remote"?"remote":prefs.radius>=250?"remote":prefs.radius>=100?250:prefs.radius>=50?100:prefs.radius>=25?50:25;refreshJobs({radius:next,workTypes:["Any"]});setToast("Widened search");}}><Globe size={13}/> Widen Search</button>
            <button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>{refreshJobs({remoteOnly:true,workTypes:["Remote"]});setToast("Searching remote");}}><MapPin size={13}/> Go Remote</button>
            <button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>{scrollRef.current?.scrollTo({top:0,behavior:"smooth"});setFilterSheet(true);}}><SlidersHorizontal size={13}/> Change Filters</button>
          </div></div>)
        :["strong","good","stretch"].map(bk=>buckets[bk].length>0&&(<div key={bk}>
          <div className="cos-bucket"><span className="bdot" style={{background:bk==="strong"?"var(--primary)":bk==="good"?"var(--gold)":"var(--red)"}}/><h3>{bk==="strong"?"Strong Match":bk==="good"?"Good Match":"Stretch Role"}</h3><span className="ct">{buckets[bk].length}</span></div>
          {buckets[bk].map((j,i)=>{const b=badge(j.match||0);return(
            <div key={i} className="cos-job cos-reveal" style={{animationDelay:`${i*40}ms`}}>
              <div className="cos-job-top"><div style={{flex:1}}><div className="cos-job-title">{j.title}</div><div className="cos-job-co">{j.company}{j.location?` · ${j.location}`:""}</div>
                <span className="cos-badge" style={{background:b.bg,color:b.color}}>{b.dot} {b.label} · {b.note}</span></div></div>
              <div className="cos-job-meta" style={{marginTop:10}}>{j.salary&&<span className="cos-jm"><DollarSign size={11}/>{j.salary}</span>}{j.workType&&<span className="cos-jm"><Globe size={11}/>{j.workType}</span>}{j.source&&<span className="cos-jm">{j.source}</span>}{j.posted&&<span className="cos-jm">{j.posted}</span>}</div>
              <div className="cos-scores">
                <div className="cos-score-box" style={{background:"var(--primary-soft)",color:"var(--primary)"}} onClick={()=>setMbreak(j)}><div className="lbl"><Gauge size={12}/> Resume match</div><div className="v">{j.match??"—"}%</div></div>
                {j.interview!=null&&<div className="cos-score-box" style={{background:"var(--blue-soft)",color:"var(--blue)"}} onClick={()=>setMbreak(j)}><div className="lbl"><Flame size={12}/> Interview prob.</div><div className="v">{j.interview}%</div></div>}
              </div>
              {j.why?.length>0&&(<div className="cos-whyfit"><div className="h">Why this job fits</div>{j.why.slice(0,4).map((w,x)=><div key={x} className="l"><Check size={13} style={{color:"var(--primary)",flexShrink:0,marginTop:1}}/>{w}</div>)}</div>)}
              <div className="cos-job-acts">
                <button className="cos-btn cos-btn-primary cos-btn-sm" style={{flex:1}} onClick={()=>handleApply(j)}><ArrowUpRight size={13}/> Apply Now</button>
                <button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>saveJob(j)}>{tracker.find(t=>t.title===j.title&&t.company===j.company)?<BookmarkCheck size={14}/>:<Bookmark size={14}/>}</button>
                <button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setMbreak(j)}><ChevronDown size={14}/></button>
              </div></div>);})}</div>))}
      </div>)}

      {/* COACH */}
      {tab==="coach"&&<Coach profile={profile} jobs={jobs} saved={tracker} score={score} prefs={prefs} salaryTarget={effSal} insights={insights}/>}

      {/* APPLICATIONS = CRM + generators */}
      {tab==="apps"&&(<div className="cos-reveal">
        {tracker.length>0&&(<>
          <div className="cos-metrics" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            <div className="cos-metric"><div className="mv">{applied.length}</div><div className="ml">Applied</div></div>
            <div className="cos-metric"><div className="mv">{interviewing.length}</div><div className="ml">Interviews</div></div>
            <div className="cos-metric"><div className="mv">{offers.length}</div><div className="ml">Offers</div></div>
            <div className="cos-metric"><div className="mv">{interviewRate}%</div><div className="ml">Int. rate</div></div>
          </div>
          <div className="cos-sec">Pipeline ({tracker.length})</div>
          {tracker.map(t=>(<div key={t.id} className="cos-crm"><Bookmark size={16} style={{color:"var(--primary)",flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div><div style={{fontSize:11.5,color:"var(--muted)"}}>{t.company}{t.appliedAt?` · applied ${t.appliedAt}`:` · saved ${t.savedAt}`}{t.match!=null?` · ${t.match}%`:""}</div></div>
            <select className="cos-stsel st" value={t.stage} onChange={e=>setStage(t.id,e.target.value)}>{CRM_STAGES.map(s=><option key={s}>{s}</option>)}</select></div>))}</>)}
        <div className="cos-sec" style={{marginTop:tracker.length?16:0}}>Application toolkit</div>
        {!(selJob||tracker[0]||jobs[0])?(<div className="cos-card cos-empty"><div className="cos-empty-ic"><Sparkles size={24}/></div><div style={{fontWeight:700,fontSize:16}}>Pick a job first</div><p style={{color:"var(--muted)",fontSize:13.5,margin:"7px 0 16px"}}>Save or apply to a job from Jobs to unlock tailored documents, negotiation, and interview prep.</p><button className="cos-btn cos-btn-primary cos-btn-sm" onClick={()=>setTab("jobs")}><Target size={14}/> Browse jobs</button></div>)
        :(()=>{const aj=selJob||tracker[0]||jobs[0];const all=[...new Map([...tracker,...jobs].map(j=>[j.title+j.company,j])).values()];return(<>
          <div className="cos-card" style={{padding:"14px 16px"}}><div className="cos-sec" style={{marginBottom:6}}>Working on</div><div style={{fontWeight:700,fontSize:15}}>{aj.title}</div><div style={{fontSize:12.5,color:"var(--muted)"}}>{aj.company}</div>
            {all.length>1&&<select className="cos-sel" style={{marginTop:10,fontSize:13,padding:"10px 12px"}} value={`${aj.title}@@${aj.company}`} onChange={e=>{const [t,c]=e.target.value.split("@@");setSelJob(all.find(j=>j.title===t&&j.company===c));}}>{all.map((j,i)=><option key={i} value={`${j.title}@@${j.company}`}>{j.title} · {j.company}</option>)}</select>}</div>
          {[["tailored","Tailored Resume","ATS-tuned to this job",FileText],["cover","Cover Letter","Role-specific & professional",Sparkles],["outreach","Recruiter Message","Warm outreach",Briefcase],["linkedin","LinkedIn Message","Connection note",Globe],["followup","Follow-Up Email","After applying",Send]].map(([k,t,d,Ic])=>(
            <button key={k} className="cos-card flat" style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:13,padding:"15px 16px"}} onClick={()=>openGen(k,t+" — "+aj.title,aj)}>
              <div style={{width:38,height:38,borderRadius:11,background:"var(--primary-soft)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic size={18}/></div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14.5}}>{t}</div><div style={{fontSize:12,color:"var(--muted)"}}>{d}</div></div><ChevronRight size={18} style={{color:"var(--muted)"}}/></button>))}
          {/* Interview prep + practice */}
          <button className="cos-card flat" style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:13,padding:"15px 16px"}} onClick={()=>openGen("interview","Interview Prep — "+aj.title,aj)}>
            <div style={{width:38,height:38,borderRadius:11,background:"var(--blue-soft)",color:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Target size={18}/></div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14.5}}>Interview Prep</div><div style={{fontSize:12,color:"var(--muted)"}}>Company, technical, behavioral, STAR & questions to ask</div></div><ChevronRight size={18} style={{color:"var(--muted)"}}/></button>
          <button className="cos-card flat" style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:13,padding:"15px 16px"}} onClick={()=>{setMock({job:aj,history:[],busy:true,current:""});mockInterviewTurn(profile,aj,[],null).then(q=>setMock(m=>m&&{...m,busy:false,current:q})).catch(()=>setMock(m=>m&&{...m,busy:false,current:"Couldn't start. Try again."}));}}>
            <div style={{width:38,height:38,borderRadius:11,background:"var(--accent-soft)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><PlayCircle size={18}/></div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14.5}}>Practice Interview <span style={{fontSize:10,fontWeight:700,background:"var(--accent-soft)",color:"var(--accent)",padding:"2px 7px",borderRadius:99,marginLeft:4}}>MOCK</span></div><div style={{fontSize:12,color:"var(--muted)"}}>Live Q&A with feedback · voice mode coming soon</div></div><ChevronRight size={18} style={{color:"var(--muted)"}}/></button>
          {/* Salary negotiation */}
          <button className="cos-card flat" style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:13,padding:"15px 16px"}} onClick={()=>{setNegotiate({job:aj,loading:true,data:null});negotiationNumbers(profile,aj).then(d=>setNegotiate(n=>n&&{...n,loading:false,data:d})).catch(()=>setNegotiate(n=>n&&{...n,loading:false,data:null}));}}>
            <div style={{width:38,height:38,borderRadius:11,background:"#EAF2E9",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Handshake size={18}/></div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14.5}}>Salary Negotiation</div><div style={{fontSize:12,color:"var(--muted)"}}>Targets, script, counter-offer & talking points</div></div><ChevronRight size={18} style={{color:"var(--muted)"}}/></button>
        </>);})()}
      </div>)}
      </>)}
    </div>

    <div className="cos-tabbar">{TABS.map(([id,label,Ic])=>(<button key={id} className={`cos-tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}><div className="ico"><Ic size={20}/></div>{label}</button>))}</div>

    {toast&&<div className="cos-toast"><CheckCircle2 size={17}/>{toast}</div>}

    {/* "Did you apply?" prompt */}
    {applyPrompt&&(<><div className="cos-overlay" onClick={()=>setApplyPrompt(null)}/>
      <div className="cos-applyask">
        <div style={{fontWeight:800,fontSize:16,marginBottom:3}}>Did you apply?</div>
        <div style={{fontSize:12.5,color:"var(--muted)",marginBottom:13}}>{applyPrompt.title} · {applyPrompt.company}</div>
        <button className="cos-btn cos-btn-primary cos-btn-block" style={{marginBottom:8}} onClick={()=>resolveApply(applyPrompt,"Applied")}><CheckCircle size={15}/> Yes, I applied</button>
        <button className="cos-btn cos-btn-ghost cos-btn-block" style={{marginBottom:8}} onClick={()=>resolveApply(applyPrompt,"Save for Later")}><Bookmark size={15}/> Save for later</button>
        <button className="cos-btn cos-btn-ghost cos-btn-block" onClick={()=>resolveApply(applyPrompt,"Not Interested")}><X size={15}/> Not interested</button>
      </div></>)}

    {/* Salary Negotiation sheet */}
    {negotiate&&(<div className="cos-sheet modal"><div className="cos-sheet-grab"/>
      <div className="cos-sheet-head"><div><div style={{fontWeight:800,fontSize:15.5}}>Salary Negotiation</div><div style={{fontSize:12,color:"var(--muted)"}}>{negotiate.job.title} · {negotiate.job.company}</div></div><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>setNegotiate(null)}><X size={16}/></button></div>
      <div className="cos-sheet-body">
        {negotiate.loading?<Spin label="Analyzing market & your leverage…"/>:negotiate.data?(<>
          <div className="cos-card flat" style={{display:"flex",justifyContent:"space-around",textAlign:"center",padding:"16px 12px"}}>
            <div><div className="cos-sec" style={{margin:0}}>Market</div><div style={{fontWeight:800,fontSize:15,marginTop:4}}>{negotiate.data.market}</div></div>
            <div><div className="cos-sec" style={{margin:0,color:"var(--blue)"}}>Expected offer</div><div style={{fontWeight:800,fontSize:15,marginTop:4,color:"var(--blue)"}}>{negotiate.data.expectedOffer}</div></div>
            <div><div className="cos-sec" style={{margin:0,color:"var(--primary)"}}>Your target</div><div style={{fontWeight:800,fontSize:17,marginTop:4,color:"var(--primary)"}}>{negotiate.data.negotiationTarget}</div></div>
          </div>
          {negotiate.data.rationale&&<div className="cos-banner ok" style={{marginTop:12}}><Lightbulb size={15} style={{flexShrink:0}}/>{negotiate.data.rationale}</div>}
          <div className="cos-sec" style={{marginTop:16}}>Generate</div>
          {[["negotiation","Negotiation Script","Read-aloud script anchored on your target",Mic],["counter","Counter-Offer Email","Respectful ask for a higher figure",Send],["talkingpoints","Salary Talking Points","Quick bullets for the live conversation",ListChecks]].map(([k,t,d,Ic])=>(
            <button key={k} className="cos-card flat" style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:13,padding:"14px 15px"}} onClick={()=>{const j=negotiate.job;setNegotiate(null);openGen(k,t+" — "+j.title,j);}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#EAF2E9",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic size={17}/></div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{t}</div><div style={{fontSize:11.5,color:"var(--muted)"}}>{d}</div></div><ChevronRight size={17} style={{color:"var(--muted)"}}/></button>))}
        </>):<div style={{fontSize:13.5,color:"var(--muted)",padding:"16px 0"}}>Couldn't load negotiation figures. Please try again.</div>}
      </div></div>)}

    {/* Practice / Mock interview */}
    {mock&&(<div className="cos-sheet modal" style={{maxHeight:"88%"}}><div className="cos-sheet-grab"/>
      <div className="cos-sheet-head"><div><div style={{fontWeight:800,fontSize:15.5}}>Practice Interview</div><div style={{fontSize:12,color:"var(--muted)"}}>{mock.job?.title} · {mock.job?.company}</div></div><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>setMock(null)}><X size={16}/></button></div>
      <div className="cos-sheet-body">
        {mock.history.map((h,i)=>(<div key={i} style={{marginBottom:14}}>
          <div className="cos-bubble ai" style={{maxWidth:"100%"}}>{h.q}</div>
          {h.a&&<div className="cos-bubble you" style={{maxWidth:"100%",marginTop:8,marginLeft:"auto"}}>{h.a}</div>}
        </div>))}
        {mock.busy?<div className="cos-typing"><i/><i/><i/></div>:mock.current&&<div className="cos-bubble ai" style={{maxWidth:"100%"}}>{mock.current}</div>}
        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:14}}><Mic size={11} style={{verticalAlign:"-2px"}}/> Voice interview mode coming soon</div>
      </div>
      <div className="cos-sheet-foot" style={{flexDirection:"column",gap:8}}>
        <textarea className="cos-input" id="mockans" rows={2} placeholder="Type your answer…" style={{resize:"none",fontSize:14}} disabled={mock.busy}/>
        <button className="cos-btn cos-btn-primary cos-btn-block" disabled={mock.busy} onClick={()=>{const el=document.getElementById("mockans");const a=el?.value?.trim();if(!a)return;const q=mock.current;el.value="";setMock(m=>({...m,busy:true,current:"",history:[...m.history,{q,a}]}));mockInterviewTurn(profile,mock.job,[...mock.history,{q,a}],a).then(nq=>setMock(m=>m&&{...m,busy:false,current:nq})).catch(()=>setMock(m=>m&&{...m,busy:false,current:"Couldn't continue. Try again."}));}}>{mock.busy?<><Loader2 size={15} className="cos-spin"/> Thinking…</>:<><Send size={15}/> Submit answer</>}</button>
      </div></div>)}

    {/* Match breakdown bottom sheet */}
    {mbreak&&(<div className="cos-sheet modal"><div className="cos-sheet-grab"/>
      <div className="cos-sheet-head"><div><div style={{fontWeight:800,fontSize:15.5}}>{mbreak.title}</div><div style={{fontSize:12,color:"var(--muted)"}}>{mbreak.company}</div></div><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>setMbreak(null)}><X size={16}/></button></div>
      <div className="cos-sheet-body">
        <div className="cos-scores" style={{marginTop:0}}>
          <div className="cos-score-box" style={{background:"var(--primary-soft)",color:"var(--primary)",cursor:"default"}}><div className="lbl"><Gauge size={12}/> Resume match</div><div className="v">{mbreak.match??"—"}%</div></div>
          {mbreak.interview!=null&&<div className="cos-score-box" style={{background:"var(--blue-soft)",color:"var(--blue)",cursor:"default"}}><div className="lbl"><Flame size={12}/> Interview prob.</div><div className="v">{mbreak.interview}%</div></div>}
        </div>
        {mbreak.strengths?.length>0&&(<><div className="cos-sec" style={{marginTop:14}}>Strengths</div><div className="cos-mbreak">{mbreak.strengths.map((s,i)=><div key={i} className="cos-mb-line"><Check size={15} style={{color:"var(--primary)",flexShrink:0,marginTop:1}}/>{s}</div>)}</div></>)}
        {mbreak.missing?.length>0&&(<><div className="cos-sec" style={{marginTop:14}}>Missing requirements</div><div className="cos-mbreak">{mbreak.missing.map((s,i)=><div key={i} className="cos-mb-line"><AlertTriangle size={15} style={{color:"var(--accent)",flexShrink:0,marginTop:1}}/>{s}</div>)}</div></>)}
        {mbreak.improve?.length>0&&(<><div className="cos-sec" style={{marginTop:14}}>Recommended improvements</div><div className="cos-mbreak">{mbreak.improve.map((s,i)=><div key={i} className="cos-mb-line"><ArrowUpRight size={15} style={{color:"var(--blue)",flexShrink:0,marginTop:1}}/>{s}</div>)}</div></>)}
        {mbreak.futureMatch!=null&&(<div className="cos-card flat" style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-around",textAlign:"center"}}>
          <div><div className="cos-sec" style={{margin:0}}>Current</div><div className="serif" style={{fontSize:26,fontWeight:600,color:"var(--muted)"}}>{mbreak.match}%</div></div><ArrowRight size={20} style={{color:"var(--accent)"}}/>
          <div><div className="cos-sec" style={{margin:0,color:"var(--primary)"}}>After fixes</div><div className="serif" style={{fontSize:26,fontWeight:600,color:"var(--primary)"}}>{mbreak.futureMatch}%</div></div></div>)}
        {!(mbreak.strengths?.length||mbreak.missing?.length||mbreak.improve?.length)&&<div style={{fontSize:13.5,color:"var(--muted)",padding:"16px 0"}}>Detailed breakdown wasn't available for this listing. Tap "Optimization plan" below.</div>}
        {/* Optimization engine: dynamic match increases */}
        <button className="cos-btn cos-btn-soft cos-btn-block" style={{marginTop:14}} onClick={()=>{setJobOpt({job:mbreak,loading:true,data:null});optimizeForJob(profile,mbreak).then(d=>setJobOpt(o=>o&&{...o,loading:false,data:d})).catch(()=>setJobOpt(o=>o&&{...o,loading:false,data:null}));}}><ZapIcon size={14}/> Optimization plan: how to raise this match</button>
        {jobOpt&&jobOpt.job===mbreak&&(<div className="cos-card flat" style={{marginTop:12}}>
          {jobOpt.loading?<Spin label="Calculating match increases…"/>:jobOpt.data?(<>
            {jobOpt.data.missingSkills?.length>0&&<div style={{marginBottom:10}}><div className="cos-sec">Missing skills</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{jobOpt.data.missingSkills.map((s,i)=><span key={i} className="cos-tagchip cos-tag-n">{s}</span>)}</div></div>}
            {jobOpt.data.missingKeywords?.length>0&&<div style={{marginBottom:10}}><div className="cos-sec">Missing keywords</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{jobOpt.data.missingKeywords.map((s,i)=><span key={i} className="cos-tagchip" style={{background:"var(--paper)",color:"var(--muted)"}}>{s}</span>)}</div></div>}
            {jobOpt.data.changes?.length>0&&<div style={{marginBottom:10}}><div className="cos-sec">Recommended resume changes</div>{jobOpt.data.changes.map((c,i)=><div key={i} style={{fontSize:13,display:"flex",gap:7,marginBottom:5,lineHeight:1.4}}><Pencil size={13} style={{color:"var(--primary)",flexShrink:0,marginTop:2}}/>{c}</div>)}</div>}
            <div className="cos-sec">Expected match increase</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13}}><span style={{fontWeight:700}}>Current</span><div className="cos-progress" style={{flex:1}}><i style={{width:`${jobOpt.data.currentMatch||mbreak.match||60}%`,background:"var(--muted)"}}/></div><span style={{fontWeight:800,color:"var(--muted)"}}>{jobOpt.data.currentMatch||mbreak.match}%</span></div>
            {(jobOpt.data.upgrades||[]).map((u,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13}}><span style={{flex:"0 0 44%",lineHeight:1.3}}>{u.action}</span><div className="cos-progress" style={{flex:1}}><i style={{width:`${u.newMatch}%`}}/></div><span style={{fontWeight:800,color:"var(--primary)"}}>{u.newMatch}%</span></div>))}
            <button className="cos-btn cos-btn-primary cos-btn-block" style={{marginTop:8}} onClick={()=>{setMbreak(null);setJobOpt(null);setSelJob(mbreak);setTab("apps");}}><Wand2 size={14}/> Optimize my resume for this job</button>
          </>):<div style={{fontSize:13,color:"var(--muted)",padding:"12px 0"}}>Couldn't build the plan. Try again.</div>}
        </div>)}
      </div>
      <div className="cos-sheet-foot">
        <button className="cos-btn cos-btn-primary" style={{flex:1}} onClick={()=>{const j=mbreak;setMbreak(null);handleApply(j);}}><ArrowUpRight size={14}/> Apply Now</button>
        <button className="cos-btn cos-btn-ghost" onClick={()=>{saveJob(mbreak);}}><Bookmark size={14}/> Save</button>
      </div></div>)}

    {/* doc sheet */}
    {sheet&&(<div className="cos-sheet"><div className="cos-sheet-grab"/>
      <div className="cos-sheet-head"><div style={{fontWeight:700,fontSize:15}}>{sheet.title}</div><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>setSheet(null)}><X size={16}/></button></div>
      <div className="cos-sheet-body">{sheet.loading?<Spin label="Generating with AI…"/>:<div className="cos-gen-text">{sheet.text}</div>}</div>
      {!sheet.loading&&sheet.kind&&(<div className="cos-sheet-foot"><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>{navigator.clipboard?.writeText(sheet.text);setToast("Copied");}}><Copy size={13}/> Copy</button><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>openPrintable(sheet.title,sheet.text)}><FileText size={13}/> Open / PDF</button><button className="cos-btn cos-btn-primary cos-btn-sm" style={{flex:1}} onClick={()=>{downloadDoc(sheet.title,sheet.text);setToast("Saved Word doc");}}><Download size={13}/> Word</button></div>)}
    </div>)}

    {/* Change Filters sheet */}
    {filterSheet&&(<div className="cos-sheet modal"><div className="cos-sheet-grab"/>
      <div className="cos-sheet-head"><div style={{fontWeight:800,fontSize:15.5}}>Change filters</div><button className="cos-btn cos-btn-ghost cos-btn-sm" onClick={()=>setFilterSheet(false)}><X size={16}/></button></div>
      <div className="cos-sheet-body">
        <div style={{marginBottom:14}}><LocAuto value={prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:"")} onPick={(c,st)=>setPrefs({...prefs,city:c,state:st,remoteOnly:false})} onRemote={()=>setPrefs({...prefs,remoteOnly:true})}/></div>
        <span className="cos-label">Radius</span><div className="cos-chips" style={{marginBottom:12}}>{[{v:10,l:"10mi"},{v:25,l:"25mi"},{v:50,l:"50mi"},{v:100,l:"100mi"},{v:250,l:"250mi"},{v:"remote",l:"Anywhere"}].map(r=>(<button key={r.l} className={`cos-chip ${prefs.radius===r.v?"on":""}`} onClick={()=>setPrefs({...prefs,radius:r.v})}>{r.l}</button>))}</div>
        <span className="cos-label">Work type</span><div className="cos-chips" style={{marginBottom:12}}>{["Remote","Hybrid","On-Site","Any"].map(w=><button key={w} className={`cos-chip ${prefs.workTypes.includes(w)?"on":""}`} onClick={()=>toggle("workTypes",w)}>{w}</button>)}</div>
        <span className="cos-label">Salary target</span><div className="cos-chips" style={{marginBottom:12}}>{SALARY_OPTIONS.map(s=><button key={s} className={`cos-chip ${prefs.salaryTarget===s?"on":""}`} onClick={()=>{setPrefs({...prefs,salaryTarget:s});setCustomSal("");}}>{s}</button>)}</div>
        <span className="cos-label">Experience level</span><div className="cos-chips" style={{marginBottom:12}}>{["Entry","Mid","Senior","Executive"].map(x=><button key={x} className={`cos-chip ${prefs.experience===x?"on":""}`} onClick={()=>setPrefs({...prefs,experience:x})}>{x}</button>)}</div>
        <span className="cos-label">Clearance</span><div className="cos-chips" style={{marginBottom:12}}>{["Any","None","Public Trust","Secret","TS/SCI"].map(x=><button key={x} className={`cos-chip ${prefs.clearancePref===x?"on":""}`} onClick={()=>setPrefs({...prefs,clearancePref:x})}>{x}</button>)}</div>
        <span className="cos-label">Industry</span><div className="cos-chips">{["Any","Technology","Defense/Gov","Finance","Healthcare","Manufacturing"].map(x=><button key={x} className={`cos-chip ${prefs.industry===x?"on":""}`} onClick={()=>setPrefs({...prefs,industry:x})}>{x}</button>)}</div>
        <span className="cos-label" style={{marginTop:14}}>Target roles</span>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{[...new Set([...prefs.titles,...recommended])].map(t=>{const on=prefs.titles.includes(t);return(<button key={t} className={`cos-chip ${on?"on":""}`} style={{padding:"7px 12px",fontSize:12}} onClick={()=>toggle("titles",t)}>{on?"✓ ":"+ "}{t}</button>);})}</div>
        <input className="cos-input" style={{marginTop:10,padding:"10px 13px",fontSize:13.5}} placeholder="Add a role + Enter" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){toggle("titles",e.target.value.trim());e.target.value="";}}}/>
      </div>
      <div className="cos-sheet-foot"><button className="cos-btn cos-btn-primary cos-btn-block" onClick={()=>{setFilterSheet(false);refreshJobs(false);setToast("Filters applied");}}><Search size={15}/> Apply & search</button></div>
    </div>)}
  </div>);
}

function JobSkeleton(){
  return (<div className="cos-job"><div className="cos-skel" style={{height:15,width:"70%",background:"var(--line)",borderRadius:6}}/>
    <div className="cos-skel" style={{height:12,width:"45%",background:"var(--line)",borderRadius:6,marginTop:8}}/>
    <div style={{display:"flex",gap:8,marginTop:14}}><div className="cos-skel" style={{height:52,flex:1,background:"var(--line)",borderRadius:13}}/><div className="cos-skel" style={{height:52,flex:1,background:"var(--line)",borderRadius:13}}/></div>
    <div className="cos-skel" style={{height:40,background:"var(--line)",borderRadius:11,marginTop:12}}/></div>);
}

const SKILL_SUGGESTIONS = ["Project Management","Leadership","Python","SQL","Excel","Cybersecurity","Network Operations","Cloud (AWS)","Cloud (Azure)","Linux","Communication","Data Analysis","Agile/Scrum","Risk Management","Splunk","SIEM","Incident Response","Stakeholder Management","Product Strategy","Customer Success"];
const CLEARANCE_OPTIONS = ["None","Public Trust","Secret","Top Secret","TS/SCI","Other"];

// Searchable, suggested, removable skill pills (LinkedIn-style)
function SkillPills({ value=[], onChange, label="Skills", suggestions=SKILL_SUGGESTIONS }){
  const [q,setQ]=useState("");
  const add=s=>{ const v=s.trim(); if(!v||value.includes(v))return; onChange([...value,v]); setQ(""); };
  const remove=s=>onChange(value.filter(x=>x!==s));
  const sugg=suggestions.filter(s=>!value.includes(s) && (!q || s.toLowerCase().includes(q.toLowerCase()))).slice(0,8);
  return (<div className="cos-field"><span className="cos-label">{label}</span>
    {value.length>0&&<div className="cos-pills">{value.map(s=>(<span key={s} className="cos-pill-tag">{s}<button onClick={()=>remove(s)} aria-label={"Remove "+s}><X size={13}/></button></span>))}</div>}
    <input className="cos-input" style={{padding:"11px 13px",fontSize:14}} placeholder={`Search or type a skill, press Enter`} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(q);}}}/>
    {sugg.length>0&&<div className="cos-sugg">{sugg.map(s=><button key={s} onClick={()=>add(s)}>+ {s}</button>)}</div>}
  </div>);
}

// Certification cards: name + issuer + earned + expires
function CertCards({ value=[], onChange }){
  const items = value.map(c => typeof c === "string" ? { name:c, issuer:"", earned:"", expires:"" } : c);
  const [nm,setNm]=useState("");
  const add=()=>{ const v=nm.trim(); if(!v)return; onChange([...items,{name:v,issuer:"",earned:"",expires:""}]); setNm(""); };
  const upd=(i,k,val)=>{ const next=items.map((c,x)=>x===i?{...c,[k]:val}:c); onChange(next); };
  const remove=i=>onChange(items.filter((_,x)=>x!==i));
  return (<div className="cos-field"><span className="cos-label">Certifications</span>
    {items.map((c,i)=>(<div key={i} className="cos-certcard">
      <div className="top"><span className="nm">{c.name}</span><button style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}} onClick={()=>remove(i)}><X size={15}/></button></div>
      <div className="row"><input placeholder="Issuer (e.g. CompTIA)" value={c.issuer||""} onChange={e=>upd(i,"issuer",e.target.value)}/></div>
      <div className="row"><input placeholder="Earned (e.g. 2023)" value={c.earned||""} onChange={e=>upd(i,"earned",e.target.value)}/><input placeholder="Expires (or —)" value={c.expires||""} onChange={e=>upd(i,"expires",e.target.value)}/></div>
    </div>))}
    <div style={{display:"flex",gap:8}}><input className="cos-input" style={{padding:"11px 13px",fontSize:14,flex:1}} placeholder="Add a certification (e.g. Security+)" value={nm} onChange={e=>setNm(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}}/>
      <button className="cos-btn cos-btn-soft cos-btn-sm" onClick={add}>Add</button></div>
  </div>);
}

function ClearanceSelect({ value, onChange, openTo, onToggleOpen }){
  return (<div className="cos-field"><span className="cos-label"><Shield size={13}/> Security clearance</span>
    <select className="cos-sel" value={value||"None"} onChange={e=>onChange(e.target.value)}>{CLEARANCE_OPTIONS.map(o=><option key={o}>{o}</option>)}</select>
    <label style={{display:"flex",alignItems:"center",gap:9,marginTop:11,fontSize:13.5}}><input type="checkbox" checked={!!openTo} onChange={e=>onToggleOpen(e.target.checked)}/> Open to cleared roles</label>
  </div>);
}

// Experience cards (company / title / dates / achievements)
function ExperienceCards({ value=[], onChange }){
  const items = value.length ? value : [];
  const add=()=>onChange([...items,{title:"",company:"",dates:"",highlights:[]}]);
  const upd=(i,k,v)=>onChange(items.map((w,x)=>x===i?{...w,[k]:v}:w));
  const updHl=(i,v)=>onChange(items.map((w,x)=>x===i?{...w,highlights:v.split("\n").map(s=>s.replace(/^[-•\s]+/,"").trim()).filter(Boolean)}:w));
  const remove=i=>onChange(items.filter((_,x)=>x!==i));
  return (<div>
    {items.map((w,i)=>(<div key={i} className="cos-expcard">
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><button style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}} onClick={()=>remove(i)}><X size={15}/></button></div>
      <input placeholder="Job title" value={w.title||""} onChange={e=>upd(i,"title",e.target.value)}/>
      <input placeholder="Company" value={w.company||""} onChange={e=>upd(i,"company",e.target.value)}/>
      <input placeholder="Dates (e.g. 2021 – Present)" value={w.dates||""} onChange={e=>upd(i,"dates",e.target.value)}/>
      <textarea placeholder="Key achievements (one per line)" value={(w.highlights||[]).join("\n")} onChange={e=>updHl(i,e.target.value)}/>
    </div>))}
    <button className="cos-btn cos-btn-ghost cos-btn-block" onClick={add}><Plus size={15}/> Add experience</button>
  </div>);
}

// EducationCards (degree / school / year)
function EducationCards({ value=[], onChange }){
  const items=value;
  const add=()=>onChange([...items,{degree:"",school:"",year:""}]);
  const upd=(i,k,v)=>onChange(items.map((e,x)=>x===i?{...e,[k]:v}:e));
  const remove=i=>onChange(items.filter((_,x)=>x!==i));
  return (<div>
    {items.map((e,i)=>(<div key={i} className="cos-expcard">
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><button style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)"}} onClick={()=>remove(i)}><X size={15}/></button></div>
      <input placeholder="Degree (e.g. B.S. Computer Science)" value={e.degree||""} onChange={ev=>upd(i,"degree",ev.target.value)}/>
      <input placeholder="School" value={e.school||""} onChange={ev=>upd(i,"school",ev.target.value)}/>
      <input placeholder="Graduation year" value={e.year||""} onChange={ev=>upd(i,"year",ev.target.value)}/>
    </div>))}
    <button className="cos-btn cos-btn-ghost cos-btn-block" onClick={add}><Plus size={15}/> Add education</button>
  </div>);
}

const WIZARD_STEPS = ["Personal","Career goals","Experience","Skills","Certifications","Clearance","Education","Review"];

function Onboarding({ profile, setProfile, prefs, setPrefs, customSal, setCustomSal, recommended, enhancing, onExit, onFinish, initialStep=0 }){
  const [step,setStep]=useState(initialStep);
  const [saved,setSaved]=useState(false);
  const total=WIZARD_STEPS.length;
  const setP=(k,v)=>setProfile({...profile,[k]:v});
  const setPr=(k,v)=>setPrefs({...prefs,[k]:v});
  const toggleArr=(k,v)=>setPrefs(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const effSal=prefs.salaryTarget||customSal;

  // Autosave after every step change: snapshot the profile → Supabase (no-op if
  // unconfigured). Settings/prefs already write through automatically via usePersistence.
  useEffect(()=>{ let on=true;
    const t=setTimeout(()=>{ Promise.resolve(persist.resume?.({ filePath:null, fileName:(profile?.name||"profile")+".json", parsed:profile, score:null }))
      .then(()=>{ if(on){ setSaved(true); setTimeout(()=>on&&setSaved(false),1600);} })
      .catch(()=>{ if(on){ setSaved(true); setTimeout(()=>on&&setSaved(false),1600);} }); }, 400);
    return ()=>{ on=false; clearTimeout(t); };
  },[step]); // eslint-disable-line react-hooks/exhaustive-deps

  const canNext=(()=>{
    if(step===0) return !!(profile.name&&profile.name.trim());
    if(step===1) return prefs.titles.length>0 && (prefs.remoteOnly||prefs.workTypes.length>0) ;
    return true;
  })();

  const next=()=>{ if(step<total-1) setStep(step+1); else onFinish(); };
  const back=()=>{ if(step===0) onExit(); else setStep(step-1); };

  return (<div className="cos-wiz">
    <div className="cos-wiz-top">
      <div className="cos-wiz-bar"><i style={{width:`${((step+1)/total)*100}%`}}/></div>
      <div className="cos-wiz-meta"><span>Step {step+1} of {total} · {WIZARD_STEPS[step]}</span>
        {saved?<span className="cos-wiz-save"><Check size={12}/> Saved</span>:enhancing&&step>=2?<span className="cos-wiz-save"><Loader2 size={12} className="cos-spin"/> Enhancing</span>:null}</div>
    </div>

    <div className="cos-wiz-body">
      {step===0&&(<div className="cos-step" key="s0">
        <h2 className="cos-wiz-h">Let's start with you</h2>
        <p className="cos-wiz-lead">The basics employers need to reach you.</p>
        <div className="cos-field"><span className="cos-label">Full name</span><input className="cos-input" value={profile.name||""} onChange={e=>setP("name",e.target.value)} placeholder="Your full name"/></div>
        <div className="cos-field"><span className="cos-label">Email</span><input className="cos-input" value={profile.email||""} onChange={e=>setP("email",e.target.value)} placeholder="Your email"/></div>
        <div className="cos-field"><span className="cos-label">Phone</span><input className="cos-input" value={profile.phone||""} onChange={e=>setP("phone",e.target.value)} placeholder="Your phone number"/></div>
        <div className="cos-field"><LocAuto value={prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:(profile.city?`${profile.city}, ${profile.state}`:""))} onPick={(c,st)=>{setProfile({...profile,city:c,state:st});setPrefs({...prefs,city:c,state:st,remoteOnly:false});}} onRemote={()=>setPrefs({...prefs,remoteOnly:true})}/></div>
      </div>)}

      {step===1&&(<div className="cos-step" key="s1">
        <h2 className="cos-wiz-h">Your career goals</h2>
        <p className="cos-wiz-lead">These directly drive which jobs we match you to.</p>
        {recommended.length>0&&(<div style={{marginBottom:12}}><div className="cos-banner ok" style={{marginBottom:9}}><Sparkle size={15} style={{flexShrink:0}}/>Suggested from your resume — tap to add.</div>
          <div className="cos-seg">{recommended.map(t=>(<button key={t} className={`cos-chip ${prefs.titles.includes(t)?"on":""}`} onClick={()=>toggleArr("titles",t)}>{prefs.titles.includes(t)?"✓ ":"+ "}{t}</button>))}</div></div>)}
        <span className="cos-label">Desired roles</span>
        <div className="cos-seg" style={{marginBottom:9}}>{["Product Manager","Technical Program Manager","Software Engineer","Cybersecurity Analyst","Network Engineer","Cloud Engineer","Operations Manager","Solutions Architect"].map(t=>(<button key={t} className={`cos-chip ${prefs.titles.includes(t)?"on":""}`} onClick={()=>toggleArr("titles",t)}>{t}</button>))}</div>
        <input className="cos-input" style={{marginBottom:16}} placeholder="Add a custom role + Enter" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){toggleArr("titles",e.target.value.trim());e.target.value="";}}}/>
        <span className="cos-label">Work type</span>
        <div className="cos-seg" style={{marginBottom:16}}>{["Remote","Hybrid","On-Site","Any"].map(w=>(<button key={w} className={`cos-chip ${prefs.workTypes.includes(w)?"on":""}`} onClick={()=>toggleArr("workTypes",w)}>{w}</button>))}</div>
        <span className="cos-label">Salary target</span>
        <div className="cos-seg" style={{marginBottom:10}}>{SALARY_OPTIONS.map(s=>(<button key={s} className={`cos-chip ${prefs.salaryTarget===s?"on":""}`} onClick={()=>{setPrefs({...prefs,salaryTarget:s});setCustomSal("");}}>{s}</button>))}</div>
        <input className="cos-input" style={{marginBottom:16}} placeholder="Or custom, e.g. $165,000" value={customSal} onChange={e=>{setCustomSal(e.target.value);setPrefs(p=>({...p,salaryTarget:e.target.value}));}}/>
        <div className={`cos-toggle ${prefs.openToRelocate?"on":""}`} onClick={()=>setPr("openToRelocate",!prefs.openToRelocate)}>Open to relocating<span className="knob"><i/></span></div>
      </div>)}

      {step===2&&(<div className="cos-step" key="s2">
        <h2 className="cos-wiz-h">Experience</h2>
        <p className="cos-wiz-lead">Add your roles. We use titles and achievements to match and score jobs.</p>
        <ExperienceCards value={profile.workHistory||[]} onChange={v=>setP("workHistory",v)}/>
      </div>)}

      {step===3&&(<div className="cos-step" key="s3">
        <h2 className="cos-wiz-h">Skills</h2>
        <p className="cos-wiz-lead">Search and add your skills. These are matched against every job.</p>
        <SkillPills value={profile.skills||[]} onChange={v=>setP("skills",v)} label="Your skills"/>
      </div>)}

      {step===4&&(<div className="cos-step" key="s4">
        <h2 className="cos-wiz-h">Certifications</h2>
        <p className="cos-wiz-lead">Add certifications with issuer and dates. Optional but boosts matches.</p>
        <CertCards value={profile.certifications||[]} onChange={v=>setP("certifications",v)}/>
      </div>)}

      {step===5&&(<div className="cos-step" key="s5">
        <h2 className="cos-wiz-h">Clearance & military</h2>
        <p className="cos-wiz-lead">Unlocks cleared and veteran-preference roles. Skip if not applicable.</p>
        <ClearanceSelect value={profile.clearance} onChange={v=>setP("clearance",v)} openTo={prefs.clearancePref&&!["None","Any"].includes(prefs.clearancePref)} onToggleOpen={c=>setPr("clearancePref",c?(profile.clearance&&profile.clearance!=="None"?profile.clearance:"Secret"):"Any")}/>
        <div className={`cos-toggle ${profile.military?"on":""}`} style={{marginTop:6}} onClick={()=>setP("military",!profile.military)}>Military service / veteran<span className="knob"><i/></span></div>
        {profile.military&&(<div className="cos-step">
          <div className="cos-field"><span className="cos-label">Branch</span>
            <select className="cos-sel" value={profile.branch||""} onChange={e=>setP("branch",e.target.value)}><option value="">Select…</option>{["Army","Navy","Air Force","Marine Corps","Coast Guard","Space Force","National Guard"].map(b=><option key={b}>{b}</option>)}</select></div>
          <div className="cos-field"><span className="cos-label">Years served</span><input className="cos-input" value={profile.yearsServed||""} onChange={e=>setP("yearsServed",e.target.value)} placeholder="e.g. 6"/></div>
        </div>)}
      </div>)}

      {step===6&&(<div className="cos-step" key="s6">
        <h2 className="cos-wiz-h">Education</h2>
        <p className="cos-wiz-lead">Add your degrees. Helps meet role requirements.</p>
        <EducationCards value={profile.education||[]} onChange={v=>setP("education",v)}/>
      </div>)}

      {step===7&&(<div className="cos-step" key="s7">
        <h2 className="cos-wiz-h">Review & confirm</h2>
        <p className="cos-wiz-lead">Looks good? We'll find your matches next.{enhancing&&<span style={{display:"inline-flex",alignItems:"center",gap:6,marginLeft:6,color:"var(--primary)",fontWeight:700}}><Loader2 size={13} className="cos-spin"/> enhancing</span>}</p>
        <div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div className="cos-sec" style={{margin:0}}>Profile</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(0)}>Edit</button></div>
          <div style={{fontWeight:700,fontSize:16,marginTop:6}}>{profile.name||"Your name"}</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>{[profile.email,prefs.remoteOnly?"Remote":(prefs.city?`${prefs.city}, ${prefs.state}`:profile.city)].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="cos-sec" style={{margin:0}}>Target roles</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(1)}>Edit</button></div>
          <div className="cos-pills">{(prefs.titles||[]).map(t=><span key={t} className="cos-pill-tag" style={{paddingRight:12}}>{t}</span>)}{!prefs.titles.length&&<span style={{fontSize:13,color:"var(--muted)"}}>None yet</span>}</div>
          <div style={{fontSize:12.5,color:"var(--muted)",marginTop:6}}>{(prefs.workTypes||[]).join(", ")||"Any"} · Target {effSal||"—"}</div>
        </div>
        <div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="cos-sec" style={{margin:0}}>Skills</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(3)}>Edit</button></div>
          <div className="cos-pills">{(profile.skills||[]).slice(0,12).map(s=><span key={s} className="cos-pill-tag" style={{paddingRight:12}}>{s}</span>)}{!(profile.skills||[]).length&&<span style={{fontSize:13,color:"var(--muted)"}}>None yet</span>}</div>
        </div>
        {(profile.certifications||[]).length>0&&(<div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div className="cos-sec" style={{margin:0}}>Certifications</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(4)}>Edit</button></div>
          {certNames(profile.certifications).map(c=><div key={c} style={{fontSize:13.5,marginBottom:3}}>• {c}</div>)}
        </div>)}
        {(profile.clearance&&!/^none$/i.test(profile.clearance))&&(<div className="cos-card flat" style={{marginBottom:11}}>
          <div className="cos-sec">Clearance</div><div style={{fontSize:13.5}}>{profile.clearance}{profile.military?` · ${profile.branch||"Veteran"}`:""}</div></div>)}
        {(profile.workHistory||[]).length>0&&(<div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="cos-sec" style={{margin:0}}>Experience</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(2)}>Edit</button></div>
          {(profile.workHistory||[]).slice(0,5).map((w,i)=>(<div key={i} style={{display:"flex",gap:10,paddingBottom:9,marginBottom:9,borderBottom:i<Math.min(4,(profile.workHistory||[]).length-1)?"1px solid var(--line)":"none"}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:"var(--primary)",marginTop:5,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13.5}}>{w.title||"Role"}</div><div style={{fontSize:12,color:"var(--muted)"}}>{w.company||""}{w.dates?` · ${w.dates}`:""}</div></div></div>))}
        </div>)}
        {(profile.education||[]).length>0&&(<div className="cos-card flat" style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div className="cos-sec" style={{margin:0}}>Education</div><button className="cos-btn cos-btn-soft cos-btn-sm" onClick={()=>setStep(6)}>Edit</button></div>
          {(profile.education||[]).map((e,i)=><div key={i} style={{fontSize:13.5,marginBottom:4}}><b>{e.degree||"Degree"}</b>{e.school?` — ${e.school}`:""}{e.year?` (${e.year})`:""}</div>)}
        </div>)}
      </div>)}
    </div>

    <div className="cos-wiz-foot">
      <button className="cos-btn cos-btn-ghost" onClick={back}><ChevronLeft size={15}/></button>
      <button className="cos-btn cos-btn-primary" style={{flex:1,opacity:canNext?1:.5}} disabled={!canNext} onClick={next}>
        {step===total-1?<>Build my dashboard <ArrowRight size={15}/></>:<>Continue <ChevronRight size={15}/></>}
      </button>
    </div>
  </div>);
}

function OnbStep({dots,title,lead,children,back,next,canNext,nextLabel="Continue"}){
  return(<div className="cos-onb"><div className="cos-dots">{[1,2,3,4,5].map(i=><i key={i} className={i<=dots?"on":""}/>)}</div><h1>{title}</h1><p className="lead">{lead}</p><div className="cos-grow">{children}</div>
    <div style={{display:"flex",gap:10,marginTop:18}}><button className="cos-btn cos-btn-ghost" onClick={back}><ChevronLeft size={15}/></button><button className="cos-btn cos-btn-primary" style={{flex:1}} disabled={!canNext} onClick={next}>{nextLabel} <ChevronRight size={15}/></button></div></div>);
}

function Coach({profile,jobs,saved,score,prefs,salaryTarget,insights}){
  const [msgs,setMsgs]=useState(()=>insights.length?[{role:"ai",text:insights[0],short:true}]:[]);
  const [q,setQ]=useState(""); const [busy,setBusy]=useState(false); const digestRef=useRef(null); const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,busy]);
  // hydrate prior coaching history from Supabase (no-op if unconfigured)
  useEffect(()=>{ let on=true; import("../lib/data").then(({coach})=>coach.history().then(rows=>{
    if(on&&rows?.length) setMsgs(rows.map(r=>({role:r.role,text:r.content,short:false}))); }).catch(()=>{})); return ()=>{on=false;}; },[]);
  // include applications + interview pipeline so the coach reasons about outcomes, not just matches
  const digest=()=>{
    const apps=(saved||[]).filter(t=>ACTIVE_STAGES.includes(t.stage));
    const interviews=(saved||[]).filter(t=>t.stage==="Interview Scheduled"||t.stage==="Interview Completed");
    const d={skills:(profile?.skills||[]).slice(0,10),certs:profile?.certifications,clearance:profile?.clearance,
      roles:(profile?.workHistory||[]).slice(0,3).map(w=>w.title),score:score?.score,target:salaryTarget,
      location:prefs?.remoteOnly?"Remote":`${prefs?.city}, ${prefs?.state}`,
      matches:jobs.slice(0,5).map(j=>({t:j.title,m:j.match,miss:j.missing})),
      savedCount:(saved||[]).length, applied:apps.length, interviews:interviews.length,
      pipeline:(saved||[]).map(t=>({t:t.title,stage:t.stage}))};
    return JSON.stringify(d).slice(0,1600);
  };
  const suggestions=["What jobs should I pursue?","How do I increase my match score?","Why am I not getting interviews?","Which certification has the highest ROI?"];
  const ask=async(question,explain,base)=>{ if((!question?.trim()&&!explain)||busy)return; if(!explain){setMsgs(m=>[...m,{role:"you",text:question}]);persist.coach("you",question);setQ("");} setBusy(true);
    try{const sys=explain?`Career coach. Expand on your previous SHORT answer with specifics and steps. Previous: "${base}". Context: ${digest()}`:`You are this person's AI career coach with full visibility into their resume, matches, saved jobs, applications, and interview pipeline. ENCOURAGING but honest and specific. Use their actual data (applied count, interviews, gaps). If they ask about interviews, reference their pipeline; if about ROI, name the highest-impact cert for their target roles. Answer in 2-3 short sentences MAX (they can tap Explain more). Never call a salary target "unrealistic" — name the role types that reach it. Context: ${digest()}\nQ: ${question}`;
      const ans=await callClaude([{role:"user",content:sys}],{maxTokens:explain?650:260,timeoutMs:20000});setMsgs(m=>[...m,{role:"ai",text:ans,short:!explain}]);persist.coach("ai",ans);}
    catch(e){setMsgs(m=>[...m,{role:"ai",text:humanError(e)}]);}finally{setBusy(false);} };
  return(<div className="cos-coachwrap"><div className="cos-msgs">
    {msgs.length===0&&<div className="cos-card flat" style={{display:"flex",gap:10}}><Lightbulb size={17} style={{color:"var(--accent)",flexShrink:0}}/><span style={{fontSize:13.5,lineHeight:1.45}}>Ask me anything — I can see your resume, matches, applications, and interview pipeline.</span></div>}
    {msgs.map((m,i)=>(<div key={i} style={{display:"flex",flexDirection:"column"}}><div className={`cos-bubble ${m.role==="you"?"you":"ai"}`}>{m.text}</div>{m.role==="ai"&&m.short&&i===msgs.length-1&&!busy&&<button className="cos-explain" onClick={()=>ask(null,true,m.text)}>Explain more →</button>}</div>))}
    {busy&&<div className="cos-typing"><i/><i/><i/></div>}<div ref={endRef}/></div>
    {msgs.filter(m=>m.role==="you").length===0&&<div className="cos-suggest">{suggestions.map(s=><button key={s} onClick={()=>ask(s)}>{s}</button>)}</div>}
    <div className="cos-ask"><input className="cos-input" placeholder="Ask your coach…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask(q)}/><button className="cos-btn cos-btn-accent" style={{padding:"0 18px"}} onClick={()=>ask(q)} disabled={busy}><Send size={16}/></button></div></div>);
}
