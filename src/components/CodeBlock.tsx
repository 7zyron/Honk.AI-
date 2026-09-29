import React, { useState, useMemo } from 'react';
import { Check, Copy, Terminal, ChevronDown, ChevronUp, Code2 } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => {
    return (value || '').split('\n');
  }, [value]);

  const lineCount = lines.length;
  const isVeryLong = lineCount > 35;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const displayLanguage = language || 'code';

  return (
    <div className="relative my-3.5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-3.5 py-1.5 text-zinc-400">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300">
            {displayLanguage}
          </span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-sans border border-zinc-700/50">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isVeryLong && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
              title={isExpanded ? 'Collapse code view' : 'Expand full code view'}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-sans">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-sans">Expand All</span>
                </>
              )}
            </button>
          )}

          <button
            id={`copy-code-btn-${Math.random().toString(36).substring(2, 7)}`}
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
            title="Copy entire code to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400 font-sans">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px] font-sans">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Container with Optional Expansion */}
      <div
        className={`overflow-x-auto p-3.5 text-zinc-200 selection:bg-amber-500/30 transition-[max-height] duration-200 ${
          isVeryLong && !isExpanded ? 'max-h-[420px] overflow-y-auto' : ''
        }`}
      >
        <pre className="font-mono leading-relaxed flex">
          <code className="w-full">{value}</code>
        </pre>
      </div>

      {/* Show expand footer banner if very long and not expanded */}
      {isVeryLong && !isExpanded && (
        <div className="border-t border-zinc-800/80 bg-zinc-900/95 px-3 py-1.5 text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
          >
            Showing first 35 lines • Click to view all {lineCount} lines
          </button>
        </div>
      )}
    </div>
  );
};
