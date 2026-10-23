import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, UserCheck, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'senior' | 'family'>('senior');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long');
        await register(name, email, password, role, phone || undefined);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const loginAsDemo = async (demoEmail: string) => {
    setIsRegister(false);
    setError(null);
    setEmail(demoEmail);
    setPassword('DemoPass123!');
    setSubmitting(true);
    try {
      await login(demoEmail, 'DemoPass123!');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 bg-blue-100 text-blue-700 rounded-2xl mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isRegister ? 'Join Digital Pusher' : 'Welcome to Digital Pusher'}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          {isRegister
            ? 'Set up your protection shield in less than a minute.'
            : 'Sign in to check suspicious messages or protect your loved ones.'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => { setIsRegister(false); setError(null); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
            !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsRegister(true); setError(null); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
            isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Create Account
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Select Role</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => setRole('senior')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  role === 'senior'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-sm">I am a Senior</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('family')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  role === 'family'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-sm">Family Member</span>
              </button>
            </div>

            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Password {isRegister && <span className="text-xs font-normal text-slate-500">(minimum 6 characters)</span>}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "At least 6 characters" : "••••••••"}
            minLength={isRegister ? 6 : undefined}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        {isRegister && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-base"
        >
          <span>{submitting ? 'Please wait...' : isRegister ? 'Complete Registration' : 'Sign In to Account'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      {/* Quick Demo Fill Buttons */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
          One-Click Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => loginAsDemo('ramesh.senior@example.com')}
            className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 transition text-center shadow-sm"
          >
            Senior Demo (Ramesh)
          </button>
          <button
            type="button"
            onClick={() => loginAsDemo('priya.family@example.com')}
            className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl border border-purple-200 transition text-center shadow-sm"
          >
            Family Demo (Priya)
          </button>
        </div>
      </div>
    </div>
  );
}
