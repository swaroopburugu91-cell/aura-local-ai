import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import SettingsModal from './components/SettingsModal';
import ModelManagerModal from './components/ModelManagerModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import {
  fetchHealth,
  fetchModels,
  fetchConversations,
  createConversation,
  fetchConversationDetails,
  updateConversation,
  deleteConversation,
  clearConversationMessages,
  streamChat
} from './services/api';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // Streaming state
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);

  // System & Models state
  const [health, setHealth] = useState(null);
  const [modelsData, setModelsData] = useState(null);
  const [activeModel, setActiveModel] = useState('llama3.2:3b');
  const [useRag, setUseRag] = useState(true);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dark/Light theme
  const [isDark, setIsDark] = useState(true);

  // Initial load
  useEffect(() => {
    loadHealthAndModels();
    loadConversations();

    // Setup keyboard shortcuts
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        if (isStreaming) {
          handleStopStreaming();
        } else {
          setIsSettingsOpen(false);
          setIsModelsOpen(false);
          setIsKnowledgeBaseOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadHealthAndModels = async () => {
    try {
      const [h, m] = await Promise.all([fetchHealth(), fetchModels()]);
      setHealth(h);
      setModelsData(m);
      if (m.active_model) setActiveModel(m.active_model);
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  };

  const loadConversations = async (autoSelectId = null) => {
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (autoSelectId) {
        selectConversation(autoSelectId);
      } else if (list.length > 0 && !activeConversationId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (id) => {
    setActiveConversationId(id);
    try {
      const data = await fetchConversationDetails(id);
      setCurrentConversation(data.conversation);
      setMessages(data.messages || []);
      if (data.conversation.model) {
        setActiveModel(data.conversation.model);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation("New Chat", activeModel);
      await loadConversations(newConv.id);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      const remaining = conversations.filter(c => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setCurrentConversation(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleUpdateConversation = async (id, updates) => {
    try {
      await updateConversation(id, updates);
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
    } catch (err) {
      console.error('Failed to update conversation:', err);
    }
  };

  const handleSendMessage = async ({ text, files = [] }) => {
    let cid = activeConversationId;
    if (!cid) {
      const created = await createConversation("New Chat", activeModel);
      cid = created.id;
      setActiveConversationId(cid);
      setConversations(prev => [created, ...prev]);
    }

    // Add user message to UI immediately
    const userMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      files,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingSources([]);

    abortControllerRef.current = new AbortController();

    streamChat({
      conversationId: cid,
      message: text,
      model: activeModel,
      useRag,
      files,
      signal: abortControllerRef.current.signal,
      onSources: (sources) => setStreamingSources(sources),
      onChunk: (chunk) => setStreamingContent(prev => prev + chunk),
      onError: (errMsg) => {
        setIsStreaming(false);
        setMessages(prev => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            role: 'assistant',
            content: `⚠️ **Inference Notice:**\n${errMsg}`,
            created_at: new Date().toISOString()
          }
        ]);
        setStreamingContent('');
      },
      onDone: (data) => {
        setIsStreaming(false);
        if (data && !data.cancelled) {
          selectConversation(cid);
          loadConversations();
        }
        setStreamingContent('');
      }
    });
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage({ text: lastUserMsg.content, files: lastUserMsg.files || [] });
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    if (streamingContent) {
      setMessages(prev => [
        ...prev,
        {
          id: 'partial-' + Date.now(),
          role: 'assistant',
          content: streamingContent + ' *(generation paused)*',
          created_at: new Date().toISOString()
        }
      ]);
      setStreamingContent('');
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark bg-[#131314]' : 'bg-[#f0f4f9]'}`}>
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onUpdateConversation={handleUpdateConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenModels={() => setIsModelsOpen(true)}
        onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
        health={health}
        activeModel={activeModel}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Minimalist Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#333537]/50 bg-[#131314]/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-white">
              {currentConversation?.title || 'New Chat'}
            </span>
            <span className="text-[11px] font-mono text-[#9aa0a6] bg-[#1e1f20] px-2 py-0.5 rounded-full border border-[#333537]">
              {activeModel}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#1e1f20] border border-[#333537] text-[#9aa0a6]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>100% Offline</span>
            </div>
          </div>
        </header>

        {/* Chat Scroll Area */}
        <ChatArea
          conversation={currentConversation}
          messages={messages}
          streamingContent={streamingContent}
          streamingSources={streamingSources}
          isStreaming={isStreaming}
          onPromptSuggestion={(prompt) => handleSendMessage({ text: prompt })}
          onRegenerate={handleRegenerate}
          activeModel={activeModel}
          health={health}
        />

        {/* Bottom Message Input Capsule */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          useRag={useRag}
          onToggleRag={() => setUseRag(!useRag)}
          disabled={false}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ModelManagerModal
        isOpen={isModelsOpen}
        onClose={() => setIsModelsOpen(false)}
        health={health}
        modelsData={modelsData}
        onRefreshModels={loadHealthAndModels}
        onModelSelected={(m) => setActiveModel(m)}
      />

      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />
    </div>
  );
}
