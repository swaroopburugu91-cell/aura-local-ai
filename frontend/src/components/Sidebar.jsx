import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Cpu,
  FileText,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onUpdateConversation,
  onOpenSettings,
  onOpenModels,
  onOpenKnowledgeBase,
  health,
  activeModel,
  isDark,
  onToggleTheme,
  isOpen,
  onToggleOpen
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filteredConversations.filter(c => c.pinned === 1);
  const unpinned = filteredConversations.filter(c => c.pinned !== 1);

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (conv, e) => {
    e.stopPropagation();
    if (editTitle.trim() && editTitle !== conv.title) {
      onUpdateConversation(conv.id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const togglePin = (conv, e) => {
    e.stopPropagation();
    onUpdateConversation(conv.id, { pinned: conv.pinned ? 0 : 1 });
  };

  const isOllamaOnline = health?.ollama_running;
  const gpuName = health?.specs?.gpu_name || 'RTX 3050 6GB';

  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-4 w-16 bg-[#1e1f20] dark:bg-[#1e1f20] border-r border-[#333537] z-20">
        <button
          onClick={onToggleOpen}
          className="p-2 rounded-xl text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors mb-4"
          title="Expand sidebar"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={onNewChat}
          className="p-3 rounded-2xl bg-[#4285f4] text-white hover:bg-[#3367d6] shadow-lg shadow-[#4285f4]/20 transition-all mb-4"
          title="New Chat"
        >
          <Plus size={20} />
        </button>
        <div className="flex-1" />
        <button
          onClick={onOpenModels}
          className="p-2.5 rounded-xl text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors mb-2"
          title="Model Manager"
        >
          <Cpu size={19} />
        </button>
        <button
          onClick={onOpenKnowledgeBase}
          className="p-2.5 rounded-xl text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors mb-2"
          title="Document Knowledge Base"
        >
          <FileText size={19} />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors"
          title="Settings"
        >
          <Settings size={19} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 md:w-80 h-full flex flex-col bg-[#1e1f20] border-r border-[#333537] z-20 select-none transition-all duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white shadow-md shadow-[#4285f4]/20">
            <Sparkles size={17} className="animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-1.5">
              <span>Aura</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#7cacf8]/15 text-[#7cacf8] border border-[#7cacf8]/30">
                Offline
              </span>
            </div>
            <div className="text-[11px] text-[#9aa0a6]">Personal AI Engine</div>
          </div>
        </div>

        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-[#282a2c] transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-start space-x-3 px-4 py-3 rounded-full bg-[#282a2c] hover:bg-[#333537] text-white border border-[#3c4043] transition-all duration-150 group shadow-sm"
        >
          <div className="w-7 h-7 rounded-full bg-[#4285f4] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={16} />
          </div>
          <span className="text-sm font-medium">New chat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-[#9aa0a6]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#131314] text-[#e3e3e3] border border-[#333537] placeholder-[#9aa0a6] focus:outline-none focus:border-[#7cacf8] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-[#9aa0a6] hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Pinned Chats */}
        {pinned.length > 0 && (
          <div>
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-[#9aa0a6] uppercase flex items-center gap-1">
              <Pin size={11} />
              <span>Pinned</span>
            </div>
            <div className="space-y-1">
              {pinned.map(c => renderChatRow(c))}
            </div>
          </div>
        )}

        {/* Recent Chats */}
        <div>
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-[#9aa0a6] uppercase">
            Recent Chats
          </div>
          <div className="space-y-1">
            {unpinned.length === 0 && pinned.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#9aa0a6]">
                No conversations yet.<br />Click "+ New chat" to start!
              </div>
            ) : (
              unpinned.map(c => renderChatRow(c))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Hardware Status & Controls */}
      <div className="p-3 border-t border-[#333537] bg-[#1a1b1c] space-y-2">
        {/* Hardware Status Pill */}
        <div
          onClick={onOpenModels}
          className="flex items-center justify-between p-2 rounded-xl bg-[#282a2c] hover:bg-[#333537] cursor-pointer transition-colors border border-[#333537]"
          title="Click to manage local models and view hardware stats"
        >
          <div className="flex items-center space-x-2 truncate">
            <span className={`w-2 h-2 rounded-full ${isOllamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div className="truncate text-left">
              <div className="text-[11px] font-medium text-white truncate flex items-center gap-1">
                <span>{activeModel || 'llama3.2:3b'}</span>
              </div>
              <div className="text-[10px] text-[#9aa0a6] truncate">
                {isOllamaOnline ? `Offline Ready • ${gpuName}` : 'Starting Engine...'}
              </div>
            </div>
          </div>
          <Cpu size={15} className="text-[#7cacf8] flex-shrink-0" />
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center justify-between pt-1 px-1 text-[#9aa0a6]">
          <button
            onClick={onOpenKnowledgeBase}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors"
            title="Document Knowledge Base (RAG)"
          >
            <FileText size={17} />
          </button>
          <button
            onClick={onOpenModels}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors"
            title="AI Models & GPU Acceleration"
          >
            <Cpu size={17} />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#282a2c] transition-colors"
            title="Settings & System Prompt"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>
    </aside>
  );

  function renderChatRow(conv) {
    const isActive = conv.id === activeConversationId;
    const isEditing = conv.id === editingId;

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs font-medium transition-all ${
          isActive
            ? 'bg-[#282a2c] text-white border border-[#3c4043]'
            : 'text-[#c4c7c5] hover:bg-[#282a2c]/60 hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-2.5 truncate flex-1 pr-2">
          <MessageSquare size={14} className={isActive ? 'text-[#7cacf8]' : 'text-[#9aa0a6]'} />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename(conv, e);
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              className="bg-[#131314] text-white px-1.5 py-0.5 rounded border border-[#7cacf8] text-xs outline-none w-full"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button
                onClick={(e) => saveRename(conv, e)}
                className="p-1 hover:text-emerald-400"
                title="Save"
              >
                <Check size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                className="p-1 hover:text-red-400"
                title="Cancel"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => togglePin(conv, e)}
                className={`p-1 hover:text-[#7cacf8] ${conv.pinned ? 'text-[#7cacf8]' : 'text-[#9aa0a6]'}`}
                title={conv.pinned ? "Unpin chat" : "Pin chat"}
              >
                <Pin size={12} className={conv.pinned ? 'fill-current' : ''} />
              </button>
              <button
                onClick={(e) => startRename(conv, e)}
                className="p-1 text-[#9aa0a6] hover:text-white"
                title="Rename chat"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                className="p-1 text-[#9aa0a6] hover:text-red-400"
                title="Delete chat"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}
