import { useState } from 'react';
import { Book, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import PdfViewer from '@/components/PdfViewer';
import { SettingsPanel } from '@/components/SettingsPanel';
import { cn } from '@/lib/utils';
import './App.css';

function App() {
  const [showPdf, setShowPdf] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [targetPage, setTargetPage] = useState<number | undefined>();
  const [targetPosition, setTargetPosition] = useState<{ top: number; height: number } | undefined>();

  const handleCitationClick = (page: number, position?: { top: number; height: number }) => {
    setTargetPage(page);
    setTargetPosition(position);
    setShowPdf(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-white shadow-sm z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">DB Learning Assistant</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant={showPdf ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowPdf(!showPdf)}
              className="gap-2"
            >
              <Book className="h-4 w-4" />
              {showPdf ? 'Hide' : 'Show'} Textbook
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        {/* Chat Interface - Takes up more space on desktop */}
        <div className={cn(
          "flex-1 overflow-hidden transition-all duration-300",
          showPdf ? "w-1/2" : "w-full"
        )}>
          <ChatInterface onCitationClick={handleCitationClick} />
        </div>

        {/* PDF Viewer - Side panel */}
        {showPdf && (
          <div className="w-1/2 border-l overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <h2 className="text-lg font-semibold">Textbook</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdf(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PdfViewer
                  pdfUrl="/textbook.pdf"
                  targetPage={targetPage}
                  targetPosition={targetPosition}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
