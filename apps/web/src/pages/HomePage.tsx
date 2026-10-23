import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Eye, FileText, Mic, Upload, ArrowRight, Users, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-8 py-2">
      {/* Big Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-800">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-full tracking-wide uppercase">
              AI Protection Shield
            </span>
            {user && (
              <span className="text-blue-200 text-sm font-semibold">
                Welcome back, {user.name} ({user.role === 'senior' ? 'Senior Account' : 'Family Guardian'})
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            {t('home.heading')}
          </h1>

          <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
            {t('home.subheading')}
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link
              to="/submit"
              className="inline-flex items-center gap-3 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg sm:text-xl rounded-2xl shadow-xl hover:shadow-2xl transition transform active:scale-95"
            >
              <Shield className="w-7 h-7 text-slate-950" />
              <span>{t('home.checkButton')}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>

            <Link
              to="/submit?action=record"
              className="inline-flex items-center gap-2 px-5 py-4 bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-base rounded-2xl border border-slate-700 transition"
            >
              <Mic className="w-5 h-5 text-red-400" />
              <span>Record Voice Note</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Main Mode Selection Cards */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">
          Choose How You Want Protection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode A: Scam Guardian */}
          <Link
            to="/submit?mode=scam"
            className="group bg-white p-7 rounded-3xl border-2 border-slate-200 hover:border-red-400 hover:shadow-xl transition flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Mode A</span>
              <h3 className="text-xl font-black text-slate-900 mt-1 mb-2">
                {t('home.modeA_title')}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {t('home.modeA_desc')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-red-600 font-bold text-sm pt-4 border-t border-slate-100">
              <span>Scan Suspicious Message</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Mode B: Dark Pattern Auditor */}
          <Link
            to="/submit?mode=dark_pattern"
            className="group bg-white p-7 rounded-3xl border-2 border-slate-200 hover:border-amber-400 hover:shadow-xl transition flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <Eye className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Mode B</span>
              <h3 className="text-xl font-black text-slate-900 mt-1 mb-2">
                {t('home.modeB_title')}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {t('home.modeB_desc')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-sm pt-4 border-t border-slate-100">
              <span>Audit Checkout Flow</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Mode C: Paperwork Decoder */}
          <Link
            to="/submit?mode=paperwork"
            className="group bg-white p-7 rounded-3xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl transition flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mode C</span>
              <h3 className="text-xl font-black text-slate-900 mt-1 mb-2">
                {t('home.modeC_title')}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {t('home.modeC_desc')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm pt-4 border-t border-slate-100">
              <span>Decode Legal Paperwork</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      </div>

      {/* Family Shield Protection Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/30 text-blue-300 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
            <Users className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
              <BellRing className="w-3.5 h-3.5 text-amber-300" />
              <span>Consensual Family Protection</span>
            </div>
            <h3 className="text-xl font-black text-white">Family Shield & Emergency Alerts</h3>
            <p className="text-blue-100 text-sm max-w-xl mt-1 leading-relaxed">
              Connect elderly parents with trusted family members. When high-risk scams or dark patterns are detected, guardians receive instant alerts with consent.
            </p>
          </div>
        </div>
        <Link
          to="/family"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-blue-900 hover:bg-blue-50 font-black rounded-xl text-sm transition flex-shrink-0 shadow-md"
        >
          <span>Open Family Shield</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
