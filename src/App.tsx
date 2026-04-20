import { useState } from 'react';
import { Book, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChatInterface } from '@/components/ChatInterface';
import MdViewer from '@/components/MdViewer';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import './App.css';

function App() {
  const [showPdf, setShowPdf] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [highlightChunkTexts, setHighlightChunkTexts] = useState<string[]>([]);
  const { chatConfig, updateChatConfig } = useSettings();

  const handleCitationClick = (_heading: string, chunkTexts: string[]) => {
    setShowPdf(true);
    setHighlightChunkTexts(chunkTexts);
    // MdViewer auto-scrolls to the first highlighted paragraph via its own useEffect
  };

  const handleChunksUsed = (chunkTexts: string[]) => {
    setHighlightChunkTexts(chunkTexts);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-white shadow-sm z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">DB Learning Assistant</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-background">
              <Label htmlFor="header-enable-chunks" className="text-sm text-muted-foreground">
                Use Chunks
              </Label>
              <div className="relative h-5 w-9">
                <Switch
                  id="header-enable-chunks"
                  checked={chatConfig.enableChunks}
                  onCheckedChange={(checked) => updateChatConfig({ enableChunks: checked })}
                  className="absolute inset-0"
                />
                <span
                  className={cn(
                    'pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[9px] font-medium leading-none',
                    chatConfig.enableChunks ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  {chatConfig.enableChunks ? 'On' : 'Off'}
                </span>
              </div>
            </div>
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
        <ChatInterface
            onCitationClick={handleCitationClick}
            onChunksUsed={handleChunksUsed}
          />
        </div>

        {/* Textbook panel — always mounted so heading refs are ready before first click */}
        <div className={cn(
          "w-1/2 border-l overflow-hidden flex flex-col",
          !showPdf && "hidden"
        )}>
          <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
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
            <MdViewer
              highlightChunkTexts={highlightChunkTexts}
            />
          </div>
        </div>
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
