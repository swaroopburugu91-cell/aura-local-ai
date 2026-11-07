import React, { useState } from 'react';
import {
  X,
  Cpu,
  Download,
  CheckCircle,
  HardDrive,
  Zap,
  Layers,
  Thermometer,
  AlertTriangle,
  Play
} from 'lucide-react';
import { pullModelStream, saveSettings } from '../services/api';

export default function ModelManagerModal({
  isOpen,
  onClose,
  health,
  modelsData,
  onRefreshModels,
  onModelSelected
}) {
  const [pullInput, setPullInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(null);
  const [pullError, setPullError] = useState(null);

  if (!isOpen) return null;

  const specs = health?.specs || {};
  const installedModels = modelsData?.installed || [];
  const recommendedModels = specs?.recommended_models || [];
  const activeModel = modelsData?.active_model || 'llama3.2:3b';

  const vramTotal = specs?.total_vram_mb || 6144;
  const vramFree = specs?.free_vram_mb || 6000;
  const vramUsed = vramTotal - vramFree;
  const vramPercent = Math.round((vramUsed / vramTotal) * 100);

  const ramTotal = specs?.total_ram_gb || 16;
  const ramFree = specs?.free_ram_gb || 5;
  const ramUsed = Math.round((ramTotal - ramFree) * 10) / 10;
  const ramPercent = Math.round((ramUsed / ramTotal) * 100);

  const handleSelectModel = async (modelTag) => {
    try {
      await saveSettings({ active_model: modelTag });
      onModelSelected(modelTag);
      onRefreshModels();
    } catch (e) {
      alert(`Error setting model: ${e.message}`);
    }
  };

  const handleStartPull = (modelTag) => {
    const target = modelTag || pullInput.trim();
    if (!target) return;

    setIsPulling(true);
    setPullError(null);
    setPullProgress({ status: 'Starting download...', percent: 0 });

    pullModelStream(
      target,
      (data) => {
        let percent = 0;
        if (data.total && data.completed) {
          percent = Math.round((data.completed / data.total) * 100);
        }
        setPullProgress({
          status: data.status || 'Downloading...',
          percent,
          digest: data.digest
        });
      },
      (err) => {
        setPullError(err);
        setIsPulling(false);
      },
      () => {
        setIsPulling(false);
        setPullProgress({ status: 'Download completed successfully!', percent: 100 });
        setPullInput('');
        onRefreshModels();
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#1e1f20] border border-[#333537] rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333537]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4285f4]/20 text-[#7cacf8] flex items-center justify-center">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Local AI Models & Hardware</h2>
              <p className="text-xs text-[#9aa0a6]">Manage offline LLMs and hardware acceleration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-[#282a2c]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hardware Telemetry Card */}
          <div className="p-4 rounded-2xl bg-[#131314] border border-[#333537] space-y-4">
            <div className="text-xs font-semibold text-[#7cacf8] uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} />
              <span>Hardware Acceleration Telemetry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GPU Gauge */}
              <div className="p-3 rounded-xl bg-[#1e1f20] border border-[#333537] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Layers size={13} className="text-[#7cacf8]" />
                    {specs.gpu_name || 'NVIDIA GeForce RTX 3050'}
                  </span>
                  <span className="text-[#9aa0a6] text-[11px]">
                    {specs.gpu_temp_c ? `${specs.gpu_temp_c}°C` : 'Optimal'}
                  </span>
                </div>
                <div className="w-full bg-[#282a2c] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#4285f4] to-[#7cacf8] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(vramPercent, 5)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#9aa0a6]">
                  <span>VRAM: {Math.round(vramUsed)} MB used</span>
                  <span>{vramTotal} MB total (6 GB)</span>
                </div>
              </div>

              {/* RAM Gauge */}
              <div className="p-3 rounded-xl bg-[#1e1f20] border border-[#333537] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <HardDrive size={13} className="text-purple-400" />
                    System Memory & {specs.logical_cores || 12} Cores
                  </span>
                  <span className="text-[#9aa0a6] text-[11px]">{ramPercent}%</span>
                </div>
                <div className="w-full bg-[#282a2c] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ramPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#9aa0a6]">
                  <span>RAM: {ramUsed} GB in use</span>
                  <span>{ramTotal} GB total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Pull / Download Bar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white">Download Offline Model via Ollama</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. llama3.2:3b, qwen2.5:3b, mistral, deepseek-r1:1.5b"
                value={pullInput}
                onChange={(e) => setPullInput(e.target.value)}
                disabled={isPulling}
                className="flex-1 px-4 py-2 text-xs rounded-xl bg-[#131314] text-white border border-[#333537] focus:outline-none focus:border-[#7cacf8]"
              />
              <button
                onClick={() => handleStartPull()}
                disabled={!pullInput.trim() || isPulling}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#4285f4] hover:bg-[#3367d6] text-white text-xs font-medium disabled:opacity-50 transition-colors"
              >
                <Download size={14} />
                <span>{isPulling ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>

            {/* Pull Progress */}
            {pullProgress && (
              <div className="p-3 rounded-xl bg-[#131314] border border-[#333537] space-y-2 mt-2">
                <div className="flex justify-between text-xs text-[#e3e3e3]">
                  <span>{pullProgress.status}</span>
                  {pullProgress.percent > 0 && <span>{pullProgress.percent}%</span>}
                </div>
                {pullProgress.percent > 0 && (
                  <div className="w-full bg-[#282a2c] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#4285f4] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pullProgress.percent}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {pullError && (
              <div className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-xl border border-red-800/40">
                {pullError}
              </div>
            )}
          </div>

          {/* Installed Models List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-white flex items-center justify-between">
              <span>Installed Models ({installedModels.length})</span>
              <button
                onClick={onRefreshModels}
                className="text-[11px] text-[#7cacf8] hover:underline"
              >
                Refresh List
              </button>
            </div>

            {installedModels.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#131314] text-center text-xs text-[#9aa0a6] border border-[#333537]">
                No models installed in Ollama yet. Choose one of the recommended models below to install!
              </div>
            ) : (
              <div className="space-y-2">
                {installedModels.map((m) => {
                  const isActive = m.name === activeModel || m.model === activeModel;
                  return (
                    <div
                      key={m.name}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-[#282a2c] border-[#7cacf8]'
                          : 'bg-[#131314] border-[#333537] hover:border-[#444746]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{m.name}</span>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] text-[#7cacf8] bg-[#7cacf8]/15 px-2 py-0.5 rounded-full border border-[#7cacf8]/30">
                              <CheckCircle size={11} /> Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#9aa0a6]">
                          Size: {m.size_gb} GB • Format: GGUF
                        </div>
                      </div>

                      {!isActive && (
                        <button
                          onClick={() => handleSelectModel(m.name)}
                          className="px-3 py-1.5 rounded-xl bg-[#282a2c] hover:bg-[#333537] text-white text-xs font-medium border border-[#333537] transition-colors"
                        >
                          Use Model
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hardware-Optimized Recommended Models */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-white">
              Recommended for RTX 3050 (6GB VRAM)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendedModels.map((m) => {
                const isInstalled = installedModels.some(
                  inst => inst.name === m.tag || inst.model === m.tag
                );
                const isActive = activeModel === m.tag;

                return (
                  <div
                    key={m.tag}
                    className="p-3.5 rounded-2xl bg-[#131314] border border-[#333537] flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{m.name}</span>
                        <span className="text-[10px] text-[#7cacf8] font-semibold bg-[#7cacf8]/10 px-2 py-0.5 rounded-full">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9aa0a6] pt-1 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#282a2c]">
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {m.gpu_support}
                      </span>

                      {isInstalled ? (
                        isActive ? (
                          <span className="text-[11px] text-[#7cacf8] font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> In Use
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectModel(m.tag)}
                            className="text-xs text-white hover:text-[#7cacf8] font-medium"
                          >
                            Switch to this
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleStartPull(m.tag)}
                          disabled={isPulling}
                          className="flex items-center space-x-1 text-xs text-[#7cacf8] hover:underline font-medium"
                        >
                          <Download size={12} />
                          <span>Get ({m.size_gb} GB)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
