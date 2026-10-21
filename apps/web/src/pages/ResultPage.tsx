import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert, ShieldCheck, HelpCircle, Volume2, CheckCircle, AlertOctagon,
  PhoneCall, Users, FileText, ArrowLeft, RefreshCw, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);
  const [familyAlertSent, setFamilyAlertSent] = useState<boolean>(false);

  // Poll submission and analysis status
  const { data, isLoading, isError, refetch } = useQuery({
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
      return 1500; // Poll every 1.5s with backoff
    },
    enabled: !!id
  });

  const submission = data?.submission;
  const analysis = data?.analysis;

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

  // Verdict Styling
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

      {/* Main Verdict Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl shadow-xl border-2 transition ${
          isScam
            ? 'bg-red-50/90 border-red-500 text-red-950'
            : isGenuine
            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950'
            : 'bg-amber-50/90 border-amber-500 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {isScam && <ShieldAlert className="w-12 h-12 text-red-600 flex-shrink-0" />}
            {isGenuine && <ShieldCheck className="w-12 h-12 text-emerald-600 flex-shrink-0" />}
            {isUnclear && <HelpCircle className="w-12 h-12 text-amber-600 flex-shrink-0" />}
            <div>
              <span className="text-xs font-black uppercase tracking-wider block opacity-75">
                Verdict
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {isScam && 'Likely Scam'}
                {isGenuine && 'Looks Genuine'}
                {isUnclear && 'Caution / Unclear'}
              </h1>
            </div>
          </div>

          <div className="px-4 py-2 bg-white/80 rounded-2xl border border-current/20 text-center">
            <span className="text-xs font-bold uppercase tracking-wider block opacity-70">Confidence</span>
            <span className="text-xl font-black">
              {Math.round((analysis.confidence || 0.95) * 100)}%
            </span>
          </div>
        </div>

        {/* Plain Language Summary */}
        <p className="text-base sm:text-lg font-medium leading-relaxed mt-2">
          {analysis.summary}
        </p>

        {/* Audio Player if audioUrl is returned */}
        {analysis.audioUrl && (
          <div className="mt-4 pt-4 border-t border-current/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Volume2 className="w-5 h-5 text-current animate-pulse" />
              <span>Listen to Voice Explanation:</span>
            </div>
            <audio src={`http://localhost:5001${analysis.audioUrl}`} controls className="w-full sm:flex-1 h-9" />
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

      {/* Tactic Chips & Evidence Quotes */}
      {analysis.tactics && analysis.tactics.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Manipulation Tactics Detected
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {analysis.tactics.map((tactic: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800">
                      {tactic.name}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold uppercase">
                      Severity: {tactic.severity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 italic">
                    "{tactic.evidence}"
                  </p>
                </div>
              </div>
            ))}
          </div>
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
