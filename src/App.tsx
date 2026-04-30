import { useState } from 'react';
import { X} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import PdfViewer from '@/components/PdfViewer';
import { SettingsPanel } from '@/components/SettingsPanel';
import { cn } from '@/lib/utils';
import './App.css';
import gtLogo from '/assets/logo1.png';

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
    <div className="h-screen flex flex-col bg-gt-tan">
      <header className="shadow-sm z-10">
        <div className="relative px-6 py-4 flex items-center">
          <img src={gtLogo} alt="Georgia Tech Logo" className="h-16 w-auto" />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-bold text-black">
            TokenSmith
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        {/* Chat Interface - Takes up more space on desktop */}
        <div className={cn(
          "flex-1 overflow-hidden transition-all duration-300",
          showPdf ? "w-1/2" : "w-full"
        )}>
          <ChatInterface 
            onCitationClick={handleCitationClick} 
            onSettingsClick={() => setShowSettings(true)}
            onBookClick={() => setShowPdf(!showPdf)}
            onUploadClick={() => {
              console.log("Upload document clicked");
            }}
          />
        </div>

        {/* PDF Viewer - Side panel */}
        {showPdf && (
          <div className="w-1/2 border-l overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <h2 className="text-lg font-semibold">Your Document</h2>
                <Button
                  variant="outline"
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
