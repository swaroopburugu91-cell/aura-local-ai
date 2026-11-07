import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Mic,
  MicOff,
  Send,
  Square,
  FileText,
  X,
  Database,
  AlertCircle
} from 'lucide-react';
import { uploadDocument, transcribeAudio } from '../services/api';

export default function MessageInput({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  useRag,
  onToggleRag,
  disabled
}) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachedFiles.length === 0) || isStreaming || disabled) return;
    onSendMessage({
      text: text.trim(),
      files: attachedFiles.map(f => f.filename)
    });
    setText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // File upload handler (indexes to RAG & attaches)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const uploaded = await uploadDocument(file);
        setAttachedFiles(prev => [
          ...prev,
          {
            id: uploaded.id,
            filename: uploaded.filename,
            size: uploaded.file_size,
            chunks: uploaded.chunk_count
          }
        ]);
      }
    } catch (err) {
      alert(`File upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Offline Speech-to-Text via Web Speech API
  const toggleSpeechRecognition = () => {
    setMicError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setMicError(`Speech error: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(prev => (prev ? prev + ' ' : '') + transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicError(err.message);
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* File chips */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#282a2c] border border-[#333537] text-xs text-white shadow-sm"
            >
              <FileText size={14} className="text-[#7cacf8]" />
              <span className="truncate max-w-[180px] font-medium">{f.filename}</span>
              <span className="text-[10px] text-[#9aa0a6] bg-[#1e1f20] px-1.5 py-0.5 rounded-full">
                {f.chunks} chunks
              </span>
              <button
                onClick={() => removeAttachedFile(idx)}
                className="text-[#9aa0a6] hover:text-white p-0.5 rounded-full"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mic error notice */}
      {micError && (
        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded-xl mb-2">
          <AlertCircle size={14} />
          <span>{micError}</span>
        </div>
      )}

      {/* Gemini Floating Capsule */}
      <div className="relative rounded-3xl bg-[#1e1f20] border border-[#333537] shadow-xl hover:border-[#444746] focus-within:border-[#7cacf8]/60 transition-all">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.h,.html,.css,.json,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening to your voice..." : "Ask Aura anything, analyze code, summarize documents..."}
          disabled={disabled}
          className="w-full pt-4 pb-2 px-5 bg-transparent text-[#e3e3e3] placeholder-[#9aa0a6] text-[15px] resize-none outline-none leading-relaxed max-h-[220px]"
        />

        {/* Action Controls Row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left Buttons: Attachment & RAG toggle */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className={`p-2 rounded-full text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors ${
                isUploading ? 'animate-pulse text-[#7cacf8]' : ''
              }`}
              title="Attach PDF, TXT, or Code file for instant local analysis"
            >
              <Paperclip size={18} />
            </button>

            {/* RAG Knowledge Grounding Pill */}
            <button
              onClick={onToggleRag}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                useRag
                  ? 'bg-[#7cacf8]/15 border-[#7cacf8]/40 text-[#7cacf8]'
                  : 'bg-transparent border-[#333537] text-[#9aa0a6] hover:text-[#e3e3e3]'
              }`}
              title={useRag ? "Knowledge Base (RAG) is ACTIVE - Aura uses uploaded files" : "RAG is OFF"}
            >
              <Database size={13} />
              <span>RAG {useRag ? 'On' : 'Off'}</span>
            </button>
          </div>

          {/* Right Buttons: Mic & Send / Stop */}
          <div className="flex items-center space-x-2">
            {/* Speech-to-Text Button */}
            <button
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#282a2c]'
              }`}
              title={isRecording ? "Stop recording voice" : "Dictate offline with speech"}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="w-9 h-9 rounded-full bg-[#333537] hover:bg-[#444746] text-white flex items-center justify-center transition-colors shadow-md"
                title="Stop generating"
              >
                <Square size={14} className="fill-current text-white" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={(!text.trim() && attachedFiles.length === 0) || disabled}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  text.trim() || attachedFiles.length > 0
                    ? 'bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white shadow-md shadow-[#4285f4]/30 hover:opacity-90 scale-100'
                    : 'bg-[#282a2c] text-[#5f6368] cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-center text-[#9aa0a6] pt-2">
        Aura runs 100% locally on your NVIDIA RTX 3050. No internet connection required.
      </div>
    </div>
  );
}
