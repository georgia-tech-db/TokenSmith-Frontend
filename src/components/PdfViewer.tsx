import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfUrl: string;
  targetPage?: number;
  targetPosition?: { top: number; height: number };
}

export default function PdfViewer({ pdfUrl, targetPage, targetPosition }: PdfViewerProps) {
  console.log('PdfViewer rendered with:', { pdfUrl, targetPage, targetPosition });
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF loaded with', numPages, 'pages');
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF failed to load:', error);
  }

  useEffect(() => {
    console.log('Page number changed to:', pageNumber);
  }, [pageNumber]);

  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      console.log('Navigating to target page:', targetPage, 'current page:', pageNumber);
      setPageNumber(targetPage);
    }
  }, [targetPage, numPages]);

  // Separate effect to handle scrolling after page renders
  useEffect(() => {
    if (pageNumber >= 1 && pageNumber <= numPages) {
      // Wait for the page to render and then scroll
      const scrollToPage = () => {
        const pageElement = pageRefs.current[pageNumber];
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');

        if (pageElement && scrollContainer) {
          const elementTop = pageElement.offsetTop;
          const offset = targetPosition ? targetPosition.top * scale : 0;
          scrollContainer.scrollTop = elementTop + offset;
          console.log('Scrolled to page:', pageNumber, 'at position:', elementTop + offset);
        } else {
          // If page element not found, try again after a short delay
          setTimeout(scrollToPage, 50);
        }
      };

      // Small delay to ensure the page has rendered
      setTimeout(scrollToPage, 100);
    }
  }, [pageNumber, targetPosition, scale]);

  const goToPrevPage = () => {
    console.log('Going to previous page, current:', pageNumber, 'total:', numPages);
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    console.log('Going to next page, current:', pageNumber, 'total:', numPages);
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(2.5, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100">
      <div className="border-b p-4 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[70px] text-center font-medium">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="flex justify-center p-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <p>Loading PDF...</p>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96 text-red-500">
                <p>Failed to load PDF. Please check the file path.</p>
                <p className="text-sm mt-2">URL: {pdfUrl}</p>
              </div>
            }
          >
            {numPages > 0 && pageNumber >= 1 && pageNumber <= numPages && (
              <div
                key={`page_${pageNumber}`}
                ref={(el) => (pageRefs.current[pageNumber] = el)}
                className="shadow-lg"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onLoadSuccess={() => {
                    console.log('Page', pageNumber, 'loaded successfully');
                    // Trigger scroll after page loads
                    setTimeout(() => {
                      const pageElement = pageRefs.current[pageNumber];
                      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                      
                      if (pageElement && scrollContainer) {
                        const elementTop = pageElement.offsetTop;
                        const offset = targetPosition ? targetPosition.top * scale : 0;
                        scrollContainer.scrollTop = elementTop + offset;
                        console.log('Page loaded - scrolled to position:', elementTop + offset);
                      }
                    }, 50);
                  }}
                />
              </div>
            )}
          </Document>
        </div>
      </ScrollArea>

      <div className="border-t p-3 bg-white flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={pageNumber}
            onChange={(e) => {
              console.log('Input changed:', e.target.value);
              const page = parseInt(e.target.value);
              if (!isNaN(page) && page >= 1 && page <= numPages) {
                console.log('Setting page to:', page);
                setPageNumber(page);
              }
            }}
            onBlur={(e) => {
              console.log('Input blurred:', e.target.value);
              const page = parseInt(e.target.value);
              if (isNaN(page) || page < 1) {
                console.log('Invalid page, setting to 1');
                setPageNumber(1);
              } else if (page > numPages) {
                console.log('Page too high, setting to max:', numPages);
                setPageNumber(numPages);
              }
            }}
            className="w-14 text-center text-sm"
            min={1}
            max={numPages}
          />
          <span className="text-xs text-muted-foreground">of {numPages}</span>
        </div>

        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
