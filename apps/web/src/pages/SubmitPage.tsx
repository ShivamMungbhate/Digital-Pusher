import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Mic, Square, Play, Trash2, Upload, FileText, AlertCircle,
  Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SubmitPage() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') || 'auto';
  const autoRecord = searchParams.get('action') === 'record';

  const [mode, setMode] = useState<string>(initialMode);
  const [language, setLanguage] = useState<string>(i18n.language.startsWith('hi') ? 'hi' : 'en');
  const [text, setText] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoRecord) {
      startRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRecord]);

  // Audio Recording with MediaRecorder
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access was denied or not available. Please type text or upload a file.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!text.trim() && !file && !audioBlob) {
      setError('Please enter a message, record your voice, or upload a file.');
      return;
    }

    setSubmitting(true);
    try {
      if (!user) {
        // Seamlessly auto-sign in as the demo senior user so the submission always succeeds
        await login('ramesh.senior@example.com', 'DemoPass123!');
      }

      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('language', language);

      if (text.trim()) {
        formData.append('text', text.trim());
      }

      if (audioBlob) {
        formData.append('file', audioBlob, 'recording.webm');
      } else if (file) {
        formData.append('file', file);
      }

      const res = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const submissionId = res.data.submissionId;
      navigate(`/results/${submissionId}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  // Preset demo helpers
  const fillSampleScam = () => {
    setMode('scam');
    setText(
      'URGENT: This is DCP Crime Branch. A parcel with drugs and illegal passports was seized in your name at Mumbai Airport. Transfer Rs 50,000 security deposit immediately or an arrest warrant will be executed in 2 hours.'
    );
    setError(null);
  };

  const fillSampleGenuine = () => {
    setMode('auto');
    setText(
      '482910 is your secret OTP for login to HDFC Bank NetBanking. Valid for 10 mins. Do not share this OTP with anyone, including bank staff.'
    );
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Title */}
      <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Check Something Suspicious
          </h1>
          <p className="text-slate-600 text-base mt-1">
            Forward a message, record a voice clip, or upload a document. We will analyze it honestly.
          </p>
        </div>

        {/* Quick sample buttons for live demo */}
        <div className="flex gap-2 self-center sm:self-auto">
          <button
            type="button"
            onClick={fillSampleScam}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition"
          >
            Sample Scam
          </button>
          <button
            type="button"
            onClick={fillSampleGenuine}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
          >
            Sample Genuine OTP
          </button>
        </div>
      </div>

      {/* Session indicator */}
      {user ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-900">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Active Protection: <strong>{user.name}</strong> ({user.email})</span>
          </div>
          <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md font-semibold">Protected</span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Quick Demo Active: Submitting connects automatically as Ramesh Sharma (Senior)</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-amber-800 underline hover:text-amber-950 font-bold"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6">
        {/* Mode Selector */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">
            Analysis Focus
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'auto', label: 'Auto Detect' },
              { id: 'scam', label: 'Scam Guardian' },
              { id: 'dark_pattern', label: 'Dark Pattern' },
              { id: 'paperwork', label: 'Paperwork Decoder' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition text-center ${
                  mode === m.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Area */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-2">
            Paste Message Text or Call Transcript
          </label>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Type or paste the message, WhatsApp forward, SMS, or caller statement here..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none text-slate-900 text-base leading-relaxed placeholder:text-slate-400"
          />
        </div>

        {/* Audio Recorder Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-blue-600" />
              <span>Voice Note / Call Recording</span>
            </span>
            {isRecording && (
              <span className="inline-flex items-center gap-1.5 text-red-600 text-xs font-black animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                RECORDING: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {!isRecording && !audioUrl && (
            <button
              type="button"
              onClick={startRecording}
              className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Mic className="w-5 h-5 text-red-500" />
              <span>Click to Record Voice</span>
            </button>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
            </button>
          )}

          {audioUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <audio src={audioUrl} controls className="w-full flex-1 h-10" />
              <button
                type="button"
                onClick={clearRecording}
                className="p-2 text-slate-500 hover:text-red-600 transition"
                title="Discard audio"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Drag and Drop File Upload */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-2">
            Or Upload Screenshot, Audio, Video, or PDF
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="audio/*,video/*,image/*,application/pdf"
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3 text-slate-800 font-bold">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="font-bold text-slate-700">Drag files here or click to browse</span>
                <span className="text-xs">Audio (25MB), Video (100MB), Image/PDF (20MB)</span>
              </div>
            )}
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-sm font-bold text-slate-700">Result Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={submitting || isRecording}
          className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span>Securing & Submitting...</span>
          ) : (
            <>
              <Shield className="w-6 h-6" />
              <span>Check for Scams & Tricks</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
