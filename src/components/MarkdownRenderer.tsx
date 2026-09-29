import React, { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { HonkWritingCursor } from './HonkWritingCursor';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Remark plugin that inserts a custom inline pen node into the trailing leaf of the markdown AST.
 * This guarantees the animated pen visually follows the end of the real revealed text inline,
 * automatically wrapping across lines alongside the text, and disappearing as soon as streaming ends.
 */
function remarkHonkPenPlugin() {
  return (tree: any) => {
    if (!tree || !tree.children) return;

    function appendPenToDeepestTrailingNode(node: any): boolean {
      if (!node.children || node.children.length === 0) return false;
      const lastChild = node.children[node.children.length - 1];

      // If the last child is a nested container (e.g. list -> listItem -> paragraph, or paragraph -> strong)
      if (
        lastChild.children &&
        lastChild.children.length > 0 &&
        lastChild.type !== 'table' &&
        lastChild.type !== 'code'
      ) {
        const handled = appendPenToDeepestTrailingNode(lastChild);
        if (handled) return true;
      }

      // If this container accepts inline children (paragraph, heading, listItem, blockquote)
      if (
        node.type === 'paragraph' ||
        node.type === 'heading' ||
        node.type === 'listItem' ||
        node.type === 'blockquote' ||
        node.type === 'root'
      ) {
        node.children.push({
          type: 'honkpen',
          data: {
            hName: 'honkpen',
          },
        });
        return true;
      }

      return false;
    }

    const inserted = appendPenToDeepestTrailingNode(tree);
    if (!inserted && tree.children) {
      tree.children.push({
        type: 'paragraph',
        children: [
          {
            type: 'honkpen',
            data: {
              hName: 'honkpen',
            },
          },
        ],
      });
    }
  };
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  // Strip raw URLs before markdown rendering to uphold the strict zero-URL policy
  const sanitizedContent = (content || '')
    .replace(/https?:\/\/[^\s)<>"]+/gi, '')
    .replace(/www\.[^\s)<>"]+/gi, '');

  const plugins = useMemo(() => {
    if (isStreaming) {
      return [remarkGfm, remarkHonkPenPlugin];
    }
    return [remarkGfm];
  }, [isStreaming]);

  return (
    <div
      className={`prose prose-invert max-w-none text-zinc-200 leading-relaxed text-[15px] relative ${
        isStreaming ? 'honk-writing-stream' : ''
      }`}
    >
      <Markdown
        remarkPlugins={plugins}
        components={
          {
            honkpen() {
              return <HonkWritingCursor />;
            },
            code({ className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              const codeString = String(children).replace(/\n$/, '');

              if (!isInline) {
                return (
                  <CodeBlock
                    language={match ? match[1] : ''}
                    value={codeString}
                  />
                );
              }

              return (
                <code
                  className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[13px] text-amber-300 border border-zinc-700/50"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p({ children }: any) {
              return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
            },
            h1({ children }: any) {
              return <h1 className="mt-4 mb-2 text-xl font-bold text-zinc-50">{children}</h1>;
            },
            h2({ children }: any) {
              return <h2 className="mt-3.5 mb-2 text-lg font-semibold text-zinc-100">{children}</h2>;
            },
            h3({ children }: any) {
              return <h3 className="mt-3 mb-1.5 text-base font-semibold text-zinc-200">{children}</h3>;
            },
            ul({ children }: any) {
              return <ul className="my-2.5 ml-5 list-disc space-y-1 text-zinc-200">{children}</ul>;
            },
            ol({ children }: any) {
              return <ol className="my-2.5 ml-5 list-decimal space-y-1 text-zinc-200">{children}</ol>;
            },
            li({ children }: any) {
              return <li className="leading-relaxed">{children}</li>;
            },
            blockquote({ children }: any) {
              return (
                <blockquote className="my-3 border-l-3 border-amber-500/80 bg-zinc-900/50 py-1.5 px-3.5 rounded-r-lg italic text-zinc-300">
                  {children}
                </blockquote>
              );
            },
            table({ children }: any) {
              return (
                <div className="my-3 overflow-x-auto rounded-xl border border-zinc-700/60">
                  <table className="w-full text-left text-sm text-zinc-300">{children}</table>
                </div>
              );
            },
            th({ children }: any) {
              return (
                <th className="border-b border-zinc-700 bg-zinc-800/90 px-3.5 py-2 font-semibold text-zinc-100">
                  {children}
                </th>
              );
            },
            td({ children }: any) {
              return (
                <td className="border-b border-zinc-800/60 px-3.5 py-2 text-zinc-300">
                  {children}
                </td>
              );
            },
            a({ children }: any) {
              // Render link text plainly without clickable link / URL
              return <span className="font-semibold text-amber-300">{children}</span>;
            },
          } as any
        }
      >
        {sanitizedContent}
      </Markdown>
    </div>
  );
};

export default MarkdownRenderer;
