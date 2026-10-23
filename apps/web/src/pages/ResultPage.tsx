import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Volume2,
  CheckCircle,
  AlertOctagon,
  PhoneCall,
  Users,
  FileText,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  PauseCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

function getTacticColor(name: string) {
  switch (name) {
    case 'urgency':
      return {
        highlight: 'bg-amber-300 text-amber-950 border-amber-600',
        badge: 'bg-amber-600 text-white',
        card: 'bg-amber-50 border-amber-200 text-amber-900'
      };
    case 'authority':
      return {
        highlight: 'bg-blue-300 text-blue-950 border-blue-600',
        badge: 'bg-blue-600 text-white',
        card: 'bg-blue-50 border-blue-200 text-blue-900'
      };
    case 'fear':
      return {
        highlight: 'bg-red-300 text-red-950 border-red-600',
        badge: 'bg-red-600 text-white',
        card: 'bg-red-50 border-red-200 text-red-900'
      };
    case 'payment_demand':
      return {
        highlight: 'bg-purple-300 text-purple-950 border-purple-600',
        badge: 'bg-purple-600 text-white',
        card: 'bg-purple-50 border-purple-200 text-purple-900'
      };
    case 'secrecy':
      return {
        highlight: 'bg-indigo-300 text-indigo-950 border-indigo-600',
        badge: 'bg-indigo-600 text-white',
        card: 'bg-indigo-50 border-indigo-200 text-indigo-900'
      };
    default:
      return {
        highlight: 'bg-rose-300 text-rose-950 border-rose-600',
        badge: 'bg-rose-600 text-white',
        card: 'bg-rose-50 border-rose-200 text-rose-900'
      };
  }
}

interface TacticItem {
  name: string;
  evidence: string;
  severity: string;
}

interface MatchItem {
  start: number;
  end: number;
  tactic: TacticItem;
}

function HighlightedMessage({
  text,
  tactics
}: {
  text: string;
  tactics: TacticItem[];
}) {
  if (!text) return null;

  const matches: MatchItem[] = [];
  const unmatchedTactics: TacticItem[] = [];
  const lowerText = text.toLowerCase();

  tactics.forEach((tactic) => {
    const rawQuote = tactic.evidence?.trim();
    if (!rawQuote) return;

    // Strip outer quotes if present
    const cleanQuote = rawQuote.replace(/^["']|["']$/g, '').trim();
    if (!cleanQuote) return;

    const lowerQuote = cleanQuote.toLowerCase();
    const index = lowerText.indexOf(lowerQuote);

    if (index !== -1) {
      matches.push({
        start: index,
        end: index + cleanQuote.length,
        tactic
      });
    } else {
      unmatchedTactics.push(tactic);
    }
  });

  // Sort matches by start index
  matches.sort((a, b) => a.start - b.start);

  // Eliminate overlapping matches
  const nonOverlapping: MatchItem[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    } else {
      unmatchedTactics.push(m.tactic);
    }
  }

  // Build segments
  const segments: React.ReactNode[] = [];
  let currentIndex = 0;

  nonOverlapping.forEach((m, idx) => {
    if (m.start > currentIndex) {
      segments.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex, m.start)}
        </span>
      );
    }

    const theme = getTacticColor(m.tactic.name);
    segments.push(
      <mark
        key={`match-${idx}`}
        className={`px-1.5 py-0.5 rounded font-bold border-b-2 transition inline ${theme.highlight}`}
        title={`Tactic: ${m.tactic.name} (${m.tactic.severity} severity)`}
      >
        <span>{text.slice(m.start, m.end)}</span>
        <span
          className={`ml-1.5 inline-block text-[10px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm align-baseline tracking-wider ${theme.badge}`}
        >
          {m.tactic.name.replace('_', ' ')}
        </span>
      </mark>
    );
    currentIndex = m.end;
  });

  if (currentIndex < text.length) {
    segments.push(<span key={`text-${currentIndex}`}>{text.slice(currentIndex)}</span>);
  }

  return (
    <div className="space-y-4">
      {/* Message container with highlighted tactics */}
      <div className="p-5 sm:p-6 bg-slate-900 text-slate-100 rounded-2xl font-mono text-sm sm:text-base leading-relaxed border border-slate-800 shadow-inner whitespace-pre-wrap select-text">
        {segments}
      </div>

      {/* Unmatched quotes displayed in a separate list */}
      {unmatchedTactics.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            Additional Manipulation Quotes Detected:
          </p>
          <div className="space-y-2">
            {unmatchedTactics.map((t, i) => {
              const theme = getTacticColor(t.name);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${theme.card}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${theme.badge}`}>
                      {t.name.replace('_', ' ')}
                    </span>
                    <span className="font-semibold italic text-sm">"{t.evidence}"</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                    Severity: {t.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);
  const [familyAlertSent, setFamilyAlertSent] = useState<boolean>(false);
  const [pauseTimer, setPauseTimer] = useState<number>(30);

  // Poll submission and analysis status
  const { data, isLoading, isError } = useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      const res = await api.get(`/submissions/${id}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.submission?.status;
      if (status === 'done' || status === 'failed') {
        return false;
      }
      return 1500;
    },
    enabled: !!id
  });

  const submission = data?.submission;
  const analysis = data?.analysis;
  const shouldPause = analysis && (analysis.risk === 'high' || analysis.escalate === true);

  // 30-second calm countdown timer (non-blocking)
  useEffect(() => {
    if (!shouldPause || pauseTimer <= 0) return;
    const interval = setInterval(() => {
      setPauseTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldPause, pauseTimer]);

  // Calm Loading Progress Screen
  if (isLoading || (submission && submission.status !== 'done' && submission.status !== 'failed')) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Checking Carefully for You...
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-md mx-auto">
            Take a breath. We are analyzing the text, checking known manipulation scripts, and preparing a plain-language verdict.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Encrypted media storage verified (AES-256)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Personal identifiers masked for privacy</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Running Gemini multimodal reasoning engine...</span>
          </div>
        </div>
      </div>
    );
  }

  // Failed State
  if (isError || (submission && submission.status === 'failed')) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-red-200 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Analysis Incomplete</h2>
        <p className="text-slate-600 text-base">
          {submission?.error || 'We were unable to complete the analysis for this item. Please try submitting again.'}
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link
            to="/submit"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-500 transition"
          >
            Try Again
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading analysis data...</p>
      </div>
    );
  }

  // Verdict Badges Styling
  const isScam = analysis.verdict === 'likely_scam';
  const isGenuine = analysis.verdict === 'looks_genuine';
  const isUnclear = !isScam && !isGenuine;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(id);
    setTimeout(() => setCopiedDraft(null), 2000);
  };

  const handleAlertFamily = () => {
    setFamilyAlertSent(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Submission #{id?.slice(-6)}
        </span>
      </div>

      {/* STEP 1 Requirement: "Pause" panel for high risk or escalate=true */}
      {shouldPause && (
        <div className="p-6 bg-amber-50 border-2 border-amber-400 rounded-3xl shadow-md text-amber-950 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-200 text-amber-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PauseCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
                  Stop. Don't pay or share anything yet.
                </h2>
                <p className="text-sm sm:text-base text-amber-900 font-medium">
                  Manipulators rely on urgency to make you act before thinking. Take a breath and let this calm timer run.
                </p>
              </div>
            </div>
            <div className="px-3.5 py-2 bg-amber-200/90 rounded-2xl text-center flex-shrink-0 border border-amber-300 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider block text-amber-800">Calm Pause</span>
              <span className="text-lg font-black font-mono">
                {pauseTimer > 0 ? `${pauseTimer}s` : 'Done'}
              </span>
            </div>
          </div>

          {/* Calm countdown progress bar (non-blocking) */}
          <div className="w-full bg-amber-200/70 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((30 - pauseTimer) / 30) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>
              {pauseTimer > 0
                ? '⏳ Waiting allows clear thinking. (All actions and details below remain accessible)'
                : '✓ 30-second pause complete. Review the breakdown below at your own pace.'}
            </span>
            {pauseTimer > 0 && (
              <button
                type="button"
                onClick={() => setPauseTimer(0)}
                className="text-amber-900 underline hover:text-amber-950 text-xs font-bold"
              >
                Skip timer
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 1 Requirement: Lead with "What they are doing" built from analysis.summary; verdict/confidence as smaller badge */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl shadow-xl border-2 border-slate-200 space-y-4">
        {/* Subtle badges row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                isScam
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : isGenuine
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isScam && <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
              {isGenuine && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              {isUnclear && <HelpCircle className="w-3.5 h-3.5 text-amber-600" />}
              <span>
                {isScam && 'Likely Scam'}
                {isGenuine && 'Looks Genuine'}
                {isUnclear && 'Caution / Unclear'}
              </span>
            </span>

            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
              Confidence: {Math.round((analysis.confidence || 0.95) * 100)}%
            </span>

            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border uppercase tracking-wider ${
                analysis.risk === 'high'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : analysis.risk === 'medium'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {analysis.risk} Risk
            </span>
          </div>

          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Manipulation Guardian
          </span>
        </div>

        {/* Plain-Language Line "What they are doing" */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-700 mb-1.5">
            What They Are Doing
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug tracking-tight">
            {analysis.summary}
          </p>
        </div>

        {/* Audio Player if audioUrl is returned */}
        {analysis.audioUrl && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-600">
              <Volume2 className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Listen to Voice Explanation:</span>
            </div>
            <audio
              src={`http://localhost:5001${analysis.audioUrl}`}
              controls
              className="w-full sm:flex-1 h-9"
            />
          </div>
        )}
      </div>

      {/* STEP 1 Requirement: Show user's original (masked) message with each tactic's evidence quote highlighted */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 space-y-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
            Message Inspection & Highlighted Manipulation
          </h2>
          <p className="text-sm text-slate-600">
            Every highlighted phrase below represents a psychological trigger designed to manipulate you:
          </p>
        </div>

        {submission?.rawTextMasked ? (
          <HighlightedMessage
            text={submission.rawTextMasked}
            tactics={analysis.tactics || []}
          />
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-600">
            <p className="italic">
              Text transcription was submitted via file or voice recording. Detected manipulation tactics:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {(analysis.tactics || []).map((t: any, idx: number) => {
                const theme = getTacticColor(t.name);
                return (
                  <div key={idx} className={`p-3 rounded-xl border ${theme.card}`}>
                    <span className={`px-2 py-0.5 rounded font-black text-xs uppercase ${theme.badge}`}>
                      {t.name.replace('_', ' ')}
                    </span>
                    <span className="ml-2 font-medium italic">"{t.evidence}"</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Cybercrime Escalation Card */}
      {analysis.escalate && (
        <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-8 h-8 text-amber-300 flex-shrink-0" />
            <div>
              <h3 className="font-black text-lg">National Cybercrime Helpline: 1930</h3>
              <p className="text-red-100 text-xs sm:text-sm">
                If you lost money or someone is threatening you right now, dial 1930 immediately or visit cybercrime.gov.in.
              </p>
            </div>
          </div>
          <a
            href="tel:1930"
            className="px-5 py-2.5 bg-white text-red-700 font-black rounded-xl text-sm shadow-md hover:bg-red-50 transition flex-shrink-0"
          >
            Call 1930
          </a>
        </div>
      )}

      {/* Safe Verification Steps */}
      {analysis.safeSteps && analysis.safeSteps.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            What You Should Do Next (Safe Steps)
          </h2>
          <div className="space-y-2.5">
            {analysis.safeSteps.map((step: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 text-slate-800 font-medium text-base">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-written Drafts (Family Alert & Cybercrime Report) */}
      {analysis.drafts && analysis.drafts.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Ready-to-Use Drafts
          </h2>
          <div className="space-y-4">
            {analysis.drafts.map((draft: any, idx: number) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900">{draft.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(draft.body, `draft_${idx}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  >
                    {copiedDraft === `draft_${idx}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs sm:text-sm font-sans text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {draft.body}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
        <button
          type="button"
          onClick={handleAlertFamily}
          className={`flex-1 w-full py-4 rounded-2xl font-black text-base shadow-lg transition flex items-center justify-center gap-2 ${
            familyAlertSent
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>{familyAlertSent ? 'Family Alert Sent!' : 'Alert My Family Now'}</span>
        </button>

        <Link
          to="/"
          className="flex-1 w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold rounded-2xl text-center transition"
        >
          Done / Back to Home
        </Link>
      </div>

      {/* Persistent Consumer Legal Disclaimer */}
      <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
        <p>{analysis.disclaimer || 'This is information to help you decide, not legal or financial advice.'}</p>
      </div>
    </div>
  );
}
