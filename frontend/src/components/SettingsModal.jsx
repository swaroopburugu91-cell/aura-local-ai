import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Cpu,
  Volume2,
  Trash2,
  Check,
  AlertTriangle,
  Database
} from 'lucide-react';
import { fetchSettings, saveSettings, fetchSupabaseStatus, saveSupabaseConfig } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  onClearAllChats
}) {
  const [settings, setSettings] = useState({
    temperature: '0.7',
    top_p: '0.9',
    max_tokens: '4096',
    system_prompt: 'You are Aura, an exceptionally intelligent, helpful, and concise local AI assistant. You run 100% offline on the user\'s laptop. Always provide clear, accurate, and beautifully structured responses with markdown formatting.',
    gpu_offload: 'true',
    tts_rate: '1.0'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState({ configured: false, url: '' });
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadSupabase();
    }
  }, [isOpen]);

  const loadSupabase = async () => {
    try {
      const st = await fetchSupabaseStatus();
      setSupabaseStatus(st);
      if (st.url) setSupabaseUrl(st.url);
    } catch (e) {}
  };

  const handleSaveSupabase = async () => {
    try {
      await saveSupabaseConfig(supabaseUrl, supabaseKey);
      setSupabaseStatus({ configured: Boolean(supabaseUrl && supabaseKey), url: supabaseUrl });
      alert('Supabase connected successfully!');
    } catch (e) {
      alert(`Supabase error: ${e.message}`);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      alert(`Failed to save settings: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-[#1e1f20] border border-[#333537] rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333537]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4285f4]/20 text-[#7cacf8] flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Assistant Settings</h2>
              <p className="text-xs text-[#9aa0a6]">Configure inference hyperparameters & offline options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-[#282a2c]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white">System Prompt Instructions</label>
            <textarea
              rows={3}
              value={settings.system_prompt || ''}
              onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
              className="w-full p-3 rounded-xl bg-[#131314] text-xs text-[#e3e3e3] border border-[#333537] focus:outline-none focus:border-[#7cacf8] resize-none leading-relaxed"
            />
            <p className="text-[11px] text-[#9aa0a6]">
              Defines Aura's persona, precision, tone, and formatting instructions.
            </p>
          </div>

          {/* Hyperparameters Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature */}
            <div className="p-3.5 rounded-2xl bg-[#131314] border border-[#333537] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-white">Temperature</span>
                <span className="font-mono text-[#7cacf8]">{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={settings.temperature || '0.7'}
                onChange={(e) => setSettings({ ...settings, temperature: e.target.value })}
                className="w-full accent-[#4285f4] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#9aa0a6]">
                <span>0.1 (Precise/Code)</span>
                <span>1.5 (Creative)</span>
              </div>
            </div>

            {/* Top P */}
            <div className="p-3.5 rounded-2xl bg-[#131314] border border-[#333537] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-white">Top-P Sampling</span>
                <span className="font-mono text-[#7cacf8]">{settings.top_p}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.top_p || '0.9'}
                onChange={(e) => setSettings({ ...settings, top_p: e.target.value })}
                className="w-full accent-[#4285f4] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#9aa0a6]">
                <span>0.1 (Focused)</span>
                <span>1.0 (Diverse)</span>
              </div>
            </div>
          </div>

          {/* GPU Hardware Offload Toggle */}
          <div className="p-4 rounded-2xl bg-[#131314] border border-[#333537] flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Cpu size={14} className="text-[#7cacf8]" />
                <span>NVIDIA RTX 3050 GPU Acceleration</span>
              </div>
              <p className="text-[11px] text-[#9aa0a6]">
                Offloads 100% of LLM transformer layers to your 6GB VRAM for up to 60+ tokens/sec.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gpu_offload === 'true' || settings.gpu_offload === true}
                onChange={(e) => setSettings({ ...settings, gpu_offload: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#282a2c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4285f4]"></div>
            </label>
          </div>

          {/* Speech Synthesis Settings */}
          <div className="p-4 rounded-2xl bg-[#131314] border border-[#333537] space-y-3">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Volume2 size={14} className="text-purple-400" />
              <span>Offline Voice Playback (TTS)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9aa0a6]">Speech Speed Rate:</span>
              <span className="font-mono text-[#7cacf8]">{settings.tts_rate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={settings.tts_rate || '1.0'}
              onChange={(e) => setSettings({ ...settings, tts_rate: e.target.value })}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Supabase Cloud Backend Sync */}
          <div className="p-4 rounded-2xl bg-[#131314] border border-[#333537] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Database size={14} className="text-emerald-400" />
                <span>Supabase Cloud Backend (Optional)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${supabaseStatus.configured ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#282a2c] text-[#9aa0a6]'}`}>
                {supabaseStatus.configured ? 'Connected' : 'Offline SQLite Only'}
              </span>
            </div>
            <p className="text-[11px] text-[#9aa0a6]">
              Sync your conversations, chat messages, and documents to Supabase PostgreSQL when connected to the internet.
            </p>
            <div className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#1e1f20] text-xs text-white border border-[#333537] focus:outline-none focus:border-emerald-400 font-mono"
              />
              <input
                type="password"
                placeholder="Supabase Anon Key or Service Role Key"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#1e1f20] text-xs text-white border border-[#333537] focus:outline-none focus:border-emerald-400 font-mono"
              />
              <button
                onClick={handleSaveSupabase}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                Connect & Save Supabase
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#333537] bg-[#1a1b1c]">
          <span className="text-[11px] text-[#9aa0a6]">
            SQLite DB: <code>data/aura_ai.db</code>
          </span>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#4285f4] hover:bg-[#3367d6] text-white text-xs font-medium transition-colors"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
