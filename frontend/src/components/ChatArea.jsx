import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function ChatArea({
  conversation,
  messages = [],
  streamingContent = '',
  streamingSources = [],
  isStreaming = false,
  onPromptSuggestion,
  onRegenerate,
  activeModel,
  health
}) {
  const scrollRef = useRef(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Auto-scroll on new message or streaming token
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Offline TTS via HTML5 SpeechSynthesis
  const handleToggleSpeak = (id, text) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code snippet omitted for audio.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const suggestions = [
    {
      title: 'Explain Quantum Computing',
      prompt: 'Explain quantum computing and qubits in simple, intuitive terms with practical analogies.',
      icon: '💡'
    },
    {
      title: 'Python Data Pipeline',
      prompt: 'Write a high-performance Python script to process a 1GB CSV file using generators and chunking.',
      icon: '🐍'
    },
    {
      title: 'Debug C++ Memory Leak',
      prompt: 'Explain common causes of memory leaks in modern C++ and demonstrate how to solve them with smart pointers.',
      icon: '⚙️'
    },
    {
      title: 'Summarize Uploaded Docs',
      prompt: 'Provide a structured summary of my uploaded documents, highlighting the key takeaways and actionable points.',
      icon: '📄'
    }
  ];

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
      {messages.length === 0 && !streamingContent ? (
        /* Welcome Greeting Screen */
        <div className="max-w-3xl mx-auto min-h-[70vh] flex flex-col justify-center items-start space-y-8 py-10 select-none animate-fadeIn">
          {/* Greeting text */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              <span className="gemini-gradient-simple font-bold">{getGreeting()}, explorer</span>
            </h1>
            <h2 className="text-3xl md:text-4xl font-medium text-[#7cacf8]">
              What would you like to build or discover today?
            </h2>
            <p className="text-sm text-[#9aa0a6] pt-1">
              Powered by local model <span className="text-[#e3e3e3] font-mono bg-[#282a2c] px-2 py-0.5 rounded-md">{activeModel}</span> on your RTX 3050 GPU. No internet required.
            </p>
          </div>

          {/* Prompt Suggestions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full pt-4">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onPromptSuggestion(item.prompt)}
                className="group p-4 rounded-2xl bg-[#1e1f20] hover:bg-[#282a2c] border border-[#333537] hover:border-[#444746] cursor-pointer transition-all duration-200 shadow-sm flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white group-hover:text-[#7cacf8] transition-colors">
                    {item.title}
                  </span>
                  <span className="text-lg">{item.icon}</span>
                </div>
                <p className="text-xs text-[#9aa0a6] line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Chat Messages List */
        <div className="max-w-3xl mx-auto space-y-6 pb-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && index === messages.length - 1;

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-1">
                    <Sparkles size={16} />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div className={`space-y-1.5 max-w-[88%] md:max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* User Bubble */}
                  {isUser ? (
                    <div className="space-y-2">
                      <div className="px-5 py-3 rounded-3xl bg-[#282a2c] text-white text-[15px] leading-relaxed shadow-sm">
                        {msg.content}
                      </div>
                      {/* Attached files chips */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {msg.files.map((filename, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center space-x-1.5 text-[11px] text-[#7cacf8] bg-[#1e1f20] px-2.5 py-1 rounded-full border border-[#333537]"
                            >
                              <FileText size={12} />
                              <span>{filename}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="space-y-3">
                      <MarkdownRenderer content={msg.content} />

                      {/* Action Bar */}
                      <div className="flex items-center space-x-2 pt-1 text-[#9aa0a6]">
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        {/* Read Aloud TTS button */}
                        <button
                          onClick={() => handleToggleSpeak(msg.id, msg.content)}
                          className={`p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors ${
                            speakingMessageId === msg.id ? 'text-[#7cacf8] animate-pulse' : ''
                          }`}
                          title={speakingMessageId === msg.id ? "Stop speaking" : "Read aloud"}
                        >
                          {speakingMessageId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>

                        {/* Regenerate button on last message */}
                        {isLastAssistant && onRegenerate && (
                          <button
                            onClick={onRegenerate}
                            className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors flex items-center space-x-1 text-xs"
                            title="Regenerate response"
                          >
                            <RotateCcw size={13} />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Active Streaming Message */}
          {isStreaming && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-1 animate-pulse">
                <Sparkles size={16} />
              </div>
              <div className="space-y-2 max-w-[88%] md:max-w-[82%]">
                {/* RAG sources pill if present */}
                {streamingSources && streamingSources.length > 0 && (
                  <div className="flex items-center space-x-2 text-xs text-[#7cacf8] bg-[#7cacf8]/10 border border-[#7cacf8]/30 px-3 py-1 rounded-full mb-1 w-fit">
                    <Layers size={13} />
                    <span>Grounding with {streamingSources.length} document sources</span>
                  </div>
                )}
                <MarkdownRenderer content={streamingContent} isStreaming={true} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
