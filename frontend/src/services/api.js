const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function fetchConversations(query = '') {
  const url = query ? `${API_BASE}/conversations?q=${encodeURIComponent(query)}` : `${API_BASE}/conversations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function createConversation(title = 'New Chat', model = 'llama3.2:3b') {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model })
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return res.json();
}

export async function fetchConversationDetails(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch conversation history');
  return res.json();
}

export async function updateConversation(id, { title, pinned, model }) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, pinned, model })
  });
  if (!res.ok) throw new Error('Failed to update conversation');
  return res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
}

export async function clearConversationMessages(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}/messages`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear conversation messages');
  return res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_recording.webm');
  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Transcription failed');
  return res.json();
}

/**
 * Stream chat response token-by-token using Server-Sent Events.
 */
export async function streamChat({
  conversationId,
  message,
  model,
  useRag = true,
  files = [],
  signal,
  onChunk,
  onSources,
  onError,
  onDone
}) {
  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        model,
        use_rag: useRag,
        files
      }),
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.error) {
            onError && onError(data.error);
            return;
          }
          if (data.sources && onSources) {
            onSources(data.sources);
          }
          if (data.content !== undefined && onChunk) {
            onChunk(data.content);
          }
          if (data.done) {
            onDone && onDone(data);
            return;
          }
        } catch (e) {
          console.error('Failed to parse SSE chunk:', trimmed, e);
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone && onDone({ cancelled: true });
    } else {
      onError && onError(err.message || 'Stream connection error');
    }
  }
}

/**
 * Stream model download progress
 */
export async function pullModelStream(modelName, onProgress, onError, onDone) {
  try {
    const response = await fetch(`${API_BASE}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.error) {
            onError && onError(data.error);
            return;
          }
          onProgress && onProgress(data);
          if (data.status === 'success') {
            onDone && onDone();
            return;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    onError && onError(err.message || 'Failed to pull model');
  }
}


export async function fetchSupabaseStatus() {
  const res = await fetch(`${API_BASE}/supabase/status`);
  if (!res.ok) throw new Error('Failed to fetch Supabase status');
  return res.json();
}

export async function saveSupabaseConfig(url, key) {
  const res = await fetch(`${API_BASE}/supabase/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, key })
  });
  if (!res.ok) throw new Error('Failed to save Supabase configuration');
  return res.json();
}
