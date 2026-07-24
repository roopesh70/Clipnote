'use client';

import React, { useState } from 'react';
import { Settings, Key, Database, Cloud, Save, X, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://clipnote-1-nbeu.onrender.com';
      await fetch(`${apiBaseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiKey,
          openai_api_key: openaiKey,
        }),
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            API & Services Configuration
          </h3>
          <p className="text-xs text-slate-400">
            Configure custom API keys for AI transcription, structuring, and cloud storage providers.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              Google Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              OpenAI API Key (Whisper & GPT-4o)
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
          </div>

          {/* Supabase & Cloudinary (Optional Hooks) */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Cloud DB & Storage (Optional)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Supabase / Cloudinary
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              By default, Clipnote stores SQLite database records and media files locally. Cloud syncing to Supabase and Cloudinary can be enabled via environment variables.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full py-3 rounded-xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Settings Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
