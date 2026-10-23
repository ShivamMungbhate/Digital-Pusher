import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  UserCheck,
  Trash2,
  BellRing
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FamilyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [consents, setConsents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Senior invite generation state
  const [shareLevel, setShareLevel] = useState<'summary' | 'summary_and_media'>('summary');
  const [alertThreshold, setAlertThreshold] = useState<'medium' | 'high'>('medium');
  const [generatedInvite, setGeneratedInvite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Family code linking state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const consentRes = await api.get('/consents');
      setConsents(consentRes.data.consents || []);

      if (user.role === 'family') {
        const alertsRes = await api.get('/alerts');
        setAlerts(alertsRes.data.alerts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load family connections');
    } finally {
      setLoading(false);
    }
  };

  // Senior generates an invite code
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/consents/invite-code', {
        shareLevel,
        alertThreshold
      });
      setGeneratedInvite(res.data.consent);
      setSuccess('Invite code generated! Share this code with your family member.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite code');
    }
  };

  // Family member enters senior's invite code
  const handleLinkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setError(null);
    setSuccess(null);
    setSubmittingCode(true);
    try {
      await api.post('/consents/link', {
        inviteCode: inviteCodeInput.trim().toUpperCase()
      });
      setSuccess('Link request sent! Please ask your senior to accept the request on their screen.');
      setInviteCodeInput('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to link with code');
    } finally {
      setSubmittingCode(false);
    }
  };

  // Senior accepts link request
  const handleAccept = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/consents/${id}/accept`);
      setSuccess('Family connection approved and activated!');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve connection');
    }
  };

  // Senior or Family revokes link
  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this family connection? Alerts will stop immediately.')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/consents/${id}/revoke`);
      setSuccess('Connection revoked.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke connection');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Sign in to Access Family Shield</h2>
        <p className="text-slate-600 text-sm mb-6">
          Connect seniors and family members to share protective security alerts with consent.
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
        >
          Sign In / Register
        </a>
      </div>
    );
  }

  const isSenior = user.role === 'senior';
  const pendingRequests = consents.filter((c) => c.status === 'pending' && c.familyId);
  const activeConsents = consents.filter((c) => c.status === 'active');

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-full uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            <span>Family Protection Network</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isSenior ? 'Family Guardian Shield' : 'Protected Seniors Dashboard'}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {isSenior
              ? 'Invite a trusted family member to receive automatic security alerts when scams target you.'
              : 'Monitor threats and assist your loved ones against online deception.'}
          </p>
        </div>

        <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 self-start sm:self-auto">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700">
            {user.name} ({isSenior ? 'Senior' : 'Family'})
          </span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SENIOR VIEW: Generate Code & Manage Links */}
      {isSenior ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invite Code Generator Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Invite Family Member</h3>
                <p className="text-xs text-slate-500">Generate a 48-hour secure linking code</p>
              </div>
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Alert Sharing Level
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShareLevel('summary')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      shareLevel === 'summary'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Summary Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareLevel('summary_and_media')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      shareLevel === 'summary_and_media'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Summary + Media
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Alert Trigger Sensitivity
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAlertThreshold('medium')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      alertThreshold === 'medium'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Medium & High
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertThreshold('high')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      alertThreshold === 'high'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    High Only
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl shadow-md transition"
              >
                Generate 6-Digit Code
              </button>
            </form>

            {/* Generated Code Display */}
            {generatedInvite && (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Your Family Invite Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-black tracking-widest text-slate-900 font-mono">
                    {generatedInvite.inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(generatedInvite.inviteCode)}
                    className="p-2 bg-white hover:bg-amber-100 text-slate-800 rounded-lg border border-amber-300 transition"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-amber-700">
                  Valid for 48 hours. Give this code to your family member.
                </p>
              </div>
            )}
          </div>

          {/* Pending & Active Connections */}
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl shadow-sm space-y-3">
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pending Link Approvals ({pendingRequests.length})</span>
                </h3>
                {pendingRequests.map((req) => (
                  <div key={req._id} className="bg-white p-4 rounded-2xl border border-amber-200 space-y-3">
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 text-sm">
                        {req.familyId?.name || 'Family Member'}
                      </p>
                      <p className="text-slate-500">{req.familyId?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(req._id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept Link</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active Family Members */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>Connected Guardians ({activeConsents.length})</span>
              </h3>

              {activeConsents.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No active family connections yet. Generate an invite code to connect your family.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeConsents.map((consent) => (
                    <div
                      key={consent._id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between"
                    >
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-900 text-sm">
                          {consent.familyId?.name || 'Connected Guardian'}
                        </p>
                        <p className="text-slate-500">{consent.familyId?.email}</p>
                        <p className="text-slate-400 font-semibold">
                          Alerts: {consent.alertThreshold} • Share: {consent.shareLevel}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(consent._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Revoke connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* FAMILY VIEW: Enter Senior's Code & View Alerts */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Link Code Entry Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Connect to Your Senior</h3>
                <p className="text-xs text-slate-500">Enter the code shown on your senior's screen</p>
              </div>
            </div>

            <form onSubmit={handleLinkCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  6-Character Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DP-8F12B0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-lg font-bold tracking-widest text-slate-900 text-center uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={10}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingCode}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submittingCode ? 'Connecting...' : 'Submit Link Request'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Protected Seniors ({activeConsents.length})</h4>
              {activeConsents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No connected seniors yet.</p>
              ) : (
                <div className="space-y-2">
                  {activeConsents.map((c) => (
                    <div key={c._id} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{c.seniorId?.name || 'Senior'}</p>
                        <p className="text-slate-500">{c.seniorId?.email}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                        Active Shield
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Security Alerts Feed */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-red-600" />
              <span>Real-Time Threat Alerts ({alerts.length})</span>
            </h3>

            {alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No recent security alerts. Your loved ones are safe!
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`p-4 rounded-2xl border ${
                      alert.risk === 'high'
                        ? 'bg-red-50/70 border-red-200 text-red-950'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase">
                        {alert.risk} Risk
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">{alert.title}</h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">{alert.summary}</p>
                    {alert.suggestedAction && (
                      <p className="text-xs font-semibold text-blue-800 mt-2 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                        Action: {alert.suggestedAction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
