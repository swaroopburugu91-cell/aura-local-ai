import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Trash2,
  Database,
  CheckCircle,
  AlertCircle,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument } from '../services/api';

export default function KnowledgeBaseModal({ isOpen, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    try {
      for (const file of files) {
        await uploadDocument(file);
      }
      await loadDocs();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1e1f20] border border-[#333537] rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333537]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4285f4]/20 text-[#7cacf8] flex items-center justify-center">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Local Document Knowledge Base (RAG)</h2>
              <p className="text-xs text-[#9aa0a6]">Indexed offline files used to ground Aura's answers</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Upload Area */}
          <label className="border-2 border-dashed border-[#333537] hover:border-[#7cacf8] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#131314] hover:bg-[#1e1f20] transition-colors group">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.h,.html,.css,.json,.csv"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-[#282a2c] group-hover:bg-[#4285f4] text-[#7cacf8] group-hover:text-white flex items-center justify-center mb-2 transition-colors">
              <Upload size={18} />
            </div>
            <span className="text-xs font-semibold text-white">
              {isUploading ? 'Chunking & Indexing document...' : 'Click or drop files to index locally'}
            </span>
            <span className="text-[11px] text-[#9aa0a6] pt-1">
              Supports PDF, TXT, Markdown, Python, C++, Java, JS, HTML, CSV
            </span>
          </label>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/30 border border-red-800/40 p-3 rounded-xl">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Documents Table */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-white flex items-center justify-between">
              <span>Indexed Documents ({documents.length})</span>
              <span className="text-[11px] text-[#9aa0a6]">Indexed locally in SQLite</span>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#131314] border border-[#333537] text-center text-xs text-[#9aa0a6]">
                No documents added yet. Upload files above to chat with your private documents offline!
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#131314] border border-[#333537] hover:border-[#444746] transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate flex-1 pr-3">
                      <div className="w-8 h-8 rounded-lg bg-[#282a2c] flex items-center justify-center text-[#7cacf8] flex-shrink-0">
                        {doc.file_type === '.pdf' ? (
                          <FileText size={16} />
                        ) : doc.file_type === '.csv' ? (
                          <FileSpreadsheet size={16} />
                        ) : (
                          <FileCode size={16} />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-white truncate">{doc.filename}</div>
                        <div className="text-[11px] text-[#9aa0a6]">
                          {Math.round(doc.file_size / 1024)} KB • {doc.chunk_count} semantic chunks
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg text-[#9aa0a6] hover:text-red-400 hover:bg-[#282a2c] transition-colors"
                      title="Remove from knowledge base"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
