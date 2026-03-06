import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MdViewerProps {
  // Chunk indices to highlight (from chat response chunks_used[])
  highlightChunks?: Set<number>;
  // Called with the heading→element map so parent can scroll on citation click
  onChunkRefsReady?: (refs: Record<string, HTMLElement>) => void;
}

export default function MdViewer({ highlightChunks: _highlightChunks = new Set(), onChunkRefsReady }: MdViewerProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chunkRefs = useRef<Record<string, HTMLElement>>({});

  // Load markdown directly from public/book/content.md — no API call needed
  useEffect(() => {
    fetch('/book/content.md')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(md => { setMarkdown(md); setLoading(false); })
      .catch(err => {
        console.error('Failed to load markdown:', err);
        setError('Failed to load document.');
        setLoading(false);
      });
  }, []);

  // Notify parent after markdown renders — rAF ensures ref callbacks have fired
  useEffect(() => {
    if (!markdown || !onChunkRefsReady) return;
    const id = requestAnimationFrame(() => {
      if (Object.keys(chunkRefs.current).length > 0) {
        onChunkRefsReady(chunkRefs.current);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [markdown, onChunkRefsReady]);

  // Register heading elements for scroll targeting
  const registerHeadingRef = useCallback((heading: string, el: HTMLElement | null) => {
    if (el) chunkRefs.current[heading] = el;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading document…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm px-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="mx-auto max-w-3xl px-6 py-8 prose prose-neutral dark:prose-invert prose-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Resolve ./images/<name> to /book/images/<name> served from public/
            img({ src, alt }) {
              const staticUrl = src?.replace('./images/', '/book/images/') ?? src ?? '';
              return <img src={staticUrl} alt={alt ?? ''} className="rounded shadow" />;
            },

            // Style "--- Page N ---" markers as subtle dividers; hide bare "Page N" lines
            p({ children }) {
              const flat = Array.isArray(children)
                ? children.map(c => (typeof c === 'string' ? c : '')).join('')
                : typeof children === 'string' ? children : '';
              const trimmed = flat.trim();
              if (/^---\s*Page\s*\d+\s*---$/.test(trimmed)) {
                const num = trimmed.match(/\d+/)?.[0];
                return (
                  <div className="flex items-center gap-3 my-4 not-prose select-none">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] font-medium tracking-widest text-muted-foreground/50 uppercase">
                      Page {num}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                );
              }
              return <p>{children}</p>;
            },

            // Register h2 headings for scroll targeting
            h2({ children, ...props }) {
              const text = String(children);
              return (
                <h2
                  {...props}
                  ref={(el: HTMLHeadingElement | null) => registerHeadingRef(text, el)}
                  data-heading={text}
                  className="scroll-mt-4"
                >
                  {children}
                </h2>
              );
            },

            // Register h3 headings too
            h3({ children, ...props }) {
              const text = String(children);
              return (
                <h3
                  {...props}
                  ref={(el: HTMLHeadingElement | null) => registerHeadingRef(text, el)}
                  data-heading={text}
                  className="scroll-mt-4"
                >
                  {children}
                </h3>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
}
