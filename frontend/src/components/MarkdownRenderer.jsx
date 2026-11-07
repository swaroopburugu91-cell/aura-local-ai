import React, { useState } from 'react';
import { Copy, Check, Terminal, Play, Loader2 } from 'lucide-react';
import { executeSystemCommand } from '../services/api';

export default function MarkdownRenderer({ content = '', isStreaming = false }) {
  if (!content) return null;

  // Split markdown by code blocks (```lang ... ```)
  const parts = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: content.substring(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'text',
      code: match[2].trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      text: content.substring(lastIndex)
    });
  }

  return (
    <div className={`space-y-3 leading-relaxed text-[15px] ${isStreaming ? 'typing-cursor' : ''}`}>
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={idx} lang={part.lang} code={part.code} />;
        }
        return <TextRenderer key={idx} text={part.text} />;
      })}
    </div>
  );
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const isExecutable = ['powershell', 'ps1', 'bash', 'sh', 'cmd', 'shell', 'terminal', 'batch'].includes(lang.toLowerCase());

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await executeSystemCommand(code);
      setExecutionResult(res);
    } catch (err) {
      setExecutionResult({ success: false, stderr: err.message, stdout: "" });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#333537] bg-[#1e1f20] shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282a2c] text-xs font-mono text-[#9aa0a6] border-b border-[#333537]">
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-[#7cacf8]" />
          <span className="uppercase tracking-wider font-semibold text-[#c4c7c5]">{lang}</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Run on Laptop Button for Terminal / Shell commands */}
          {isExecutable && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-colors"
              title="Execute this command directly on your laptop"
            >
              {isRunning ? (
                <>
                  <Loader2 size={13} className="animate-spin text-emerald-400" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={12} className="fill-current text-emerald-400" />
                  <span>Run on Laptop</span>
                </>
              )}
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#1e1f20] hover:bg-[#333537] text-[#e3e3e3] transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-[13.5px] font-mono leading-normal text-[#e3e3e3] bg-[#131314]">
        <code>{code}</code>
      </pre>

      {/* Live System Execution Output Box */}
      {executionResult && (
        <div className="border-t border-[#333537] bg-[#0c0d0e] p-3 text-xs font-mono">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#282a2c] text-[#9aa0a6]">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-2 h-2 rounded-full ${executionResult.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
              Terminal Result ({executionResult.success ? "Exit Code 0" : `Exit Code ${executionResult.exit_code}`})
            </span>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-[11px] text-[#7cacf8] hover:underline"
            >
              Dismiss
            </button>
          </div>
          <pre className={`mt-2 p-2 rounded bg-[#131314] whitespace-pre-wrap overflow-x-auto max-h-48 text-[12.5px] ${
            executionResult.success ? 'text-emerald-200' : 'text-red-300'
          }`}>
            {executionResult.stdout || executionResult.stderr || "(Command completed with no output)"}
          </pre>
        </div>
      )}
    </div>
  );
}

function TextRenderer({ text }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;

        // Headers
        if (trimmed.startsWith('### ')) {
          return <h3 key={lIdx} className="text-base font-semibold text-white pt-2">{renderInline(trimmed.slice(4))}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={lIdx} className="text-lg font-bold text-white pt-3 pb-1 border-b border-[#333537]">{renderInline(trimmed.slice(3))}</h2>;
        }
        if (trimmed.startsWith('# ')) {
          return <h1 key={lIdx} className="text-xl font-extrabold text-white pt-4 pb-1">{renderInline(trimmed.slice(2))}</h1>;
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lIdx} className="flex items-start space-x-2 pl-3">
              <span className="text-[#7cacf8] font-bold select-none leading-relaxed">•</span>
              <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start space-x-2 pl-3">
              <span className="text-[#7cacf8] font-mono font-medium select-none min-w-[1.2rem]">{numMatch[1]}.</span>
              <span className="flex-1">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={lIdx} className="border-l-4 border-[#7cacf8] pl-3 py-1 my-1 text-[#c4c7c5] italic bg-[#1e1f20]/40 rounded-r-lg">
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Normal paragraph
        return <p key={lIdx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// Inline formatting for **bold**, *italic*, `inline code`
function renderInline(str) {
  if (!str) return '';
  
  // Parse inline codes `...`
  const codeParts = str.split(/(`[^`]+`)/g);

  return codeParts.map((subPart, i) => {
    if (subPart.startsWith('`') && subPart.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-[#282a2c] text-[#7cacf8] font-mono text-[13px] border border-[#333537]">
          {subPart.slice(1, -1)}
        </code>
      );
    }

    // Bold formatting **text**
    const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, j) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={j} className="font-semibold text-white">{bPart.slice(2, -2)}</strong>;
      }
      return bPart;
    });
  });
}
