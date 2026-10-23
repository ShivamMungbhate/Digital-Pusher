import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Type, Languages, LogIn, LogOut, User, PlusCircle, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SubmitPage from './pages/SubmitPage';
import ResultPage from './pages/ResultPage';
import FamilyPage from './pages/FamilyPage';

function AppContent() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [largeText, setLargeText] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('hi') ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${largeText ? 'large-text' : ''}`}>
      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-white hover:opacity-90">
            <Shield className="w-7 h-7 text-amber-400" />
            <span>{t('appName')}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Large Text Accessible Toggle */}
            <button
              onClick={() => setLargeText(!largeText)}
              className={`p-2 rounded-xl border flex items-center gap-1 text-xs sm:text-sm font-bold transition ${
                largeText ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title="Toggle Large Text for easier reading"
              aria-label="Toggle text size"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Text Size</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl border bg-slate-800 text-slate-200 border-slate-700 flex items-center gap-1.5 text-xs sm:text-sm font-bold hover:bg-slate-700 transition"
              title="Change Language"
              aria-label="Change language"
            >
              <Languages className="w-4 h-4 text-emerald-400" />
              <span>{i18n.language.startsWith('hi') ? 'English' : 'हिंदी'}</span>
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/family"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition shadow-sm"
                  title="Manage Family Shield connections and alerts"
                >
                  <Users className="w-4 h-4" />
                  <span>Family Shield</span>
                </Link>
                <Link
                  to="/submit"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Check New</span>
                </Link>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate max-w-[100px]">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 rounded-xl border border-slate-700 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm transition"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('nav.login')}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/results/:id" element={<ResultPage />} />
          <Route path="/family" element={<FamilyPage />} />
        </Routes>
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500 px-4 space-y-1">
        <p className="max-w-2xl mx-auto leading-relaxed">{t('disclaimer')}</p>
        <p className="text-slate-400 font-semibold">Digital Pusher 🛡️ Google Gemini Hackathon Vertical Slice</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
