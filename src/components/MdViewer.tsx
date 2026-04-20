import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MdViewerProps {
  // Exact chunk texts to highlight at paragraph level
  highlightChunkTexts?: string[];
}

export default function MdViewer({ highlightChunkTexts = [] }: MdViewerProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Pre-compute 80-char prefixes for O(n) lookup — avoids rebuilding in every p renderer call
  const highlightPrefixes = useMemo(
    () => highlightChunkTexts.map(t => t.trim().slice(0, 80)).filter(p => p.length > 20),
    [highlightChunkTexts]
  );

  // Auto-scroll to the first highlighted paragraph whenever highlights change
  useEffect(() => {
    if (highlightPrefixes.length === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[data-chunk-highlight]');
        if (el) el.scrollIntoView({ block: 'center' });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [highlightPrefixes]);

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
              const isHighlit = highlightPrefixes.length > 0 &&
                highlightPrefixes.some(prefix => trimmed.startsWith(prefix));
              if (isHighlit) {
                return (
                  <p data-chunk-highlight="true" className="bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 -mx-2">
                    {children}
                  </p>
                );
              }
              return <p>{children}</p>;
            },

            // h2/h3: keep data-heading for potential future use
            h2({ children, ...props }) {
              return <h2 {...props} className="scroll-mt-4">{children}</h2>;
            },

            h3({ children, ...props }) {
              return <h3 {...props} className="scroll-mt-4">{children}</h3>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
}
