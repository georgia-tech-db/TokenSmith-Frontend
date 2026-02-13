import { useState, useEffect } from 'react';
import { Book, X, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import PdfViewer from '@/components/PdfViewer';
import { SettingsPanel } from '@/components/SettingsPanel';
import { LandingPage } from '@/components/LandingPage';
import { IndexCreationModal } from '@/components/IndexCreationModal';
import { getIndexStatus, buildIndex, addChaptersToIndex } from '@/services/api';
import { cn } from '@/lib/utils';
import './App.css';

type IndexStatus = 'loading' | 'indexed' | 'not_indexed';
type ModalMode = 'build' | 'add';

function App() {
  const [showPdf, setShowPdf] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [targetPage, setTargetPage] = useState<number | undefined>();
  const [targetPosition, setTargetPosition] = useState<{ top: number; height: number } | undefined>();
  const [indexStatus, setIndexStatus] = useState<IndexStatus>('loading');
  const [indexedChapters, setIndexedChapters] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('build');
  const [isBuilding, setIsBuilding] = useState(false);
  const [isChatDisabled, setIsChatDisabled] = useState(false);

  useEffect(() => {
    const checkIndexStatus = async () => {
      try {
        const { status, chapters } = await getIndexStatus();
        setIndexStatus(status === 'not_indexed' ? 'not_indexed' : 'indexed');
        setIndexedChapters(chapters);
      } catch (error) {
        console.error('Error checking index status:', error);
        setIndexStatus('not_indexed'); // Fallback to allow index creation
      }
    };
    checkIndexStatus();
  }, []);

  const handleCitationClick = (page: number, position?: { top: number; height: number }) => {
    setTargetPage(page);
    setTargetPosition(position);
    setShowPdf(true);
  };

  const handleBuildIndex = async (chapters: number[]) => {
    setIsBuilding(true);
    try {
      await buildIndex(chapters);
      setIndexStatus('indexed');
      setIndexedChapters(chapters);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error building index:', error);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleAddChapters = async (chapters: number[]) => {
    setIsBuilding(true);
    setIsChatDisabled(true);
    try {
      await addChaptersToIndex(chapters);
      setIndexedChapters((prev) => [...prev, ...chapters]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding chapters:', error);
    } finally {
      setIsBuilding(false);
      setIsChatDisabled(false);
    }
  };

  const openBuildModal = () => {
    setModalMode('build');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setIsModalOpen(true);
  };

  const renderContent = () => {
    switch (indexStatus) {
      case 'loading':
        return (
          <div className="flex flex-col h-full bg-neutral-50 justify-center items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        );
      case 'not_indexed':
        return <LandingPage onBuildIndex={openBuildModal} />;
      case 'indexed':
        return (
          <main className="flex-1 overflow-hidden flex">
            <div className={cn("flex-1 overflow-hidden transition-all duration-300", showPdf ? "w-1/2" : "w-full")}>
              <ChatInterface onCitationClick={handleCitationClick} isChatDisabled={isChatDisabled} />
            </div>
            {showPdf && (
              <div className="w-1/2 border-l overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b bg-white">
                    <h2 className="text-lg font-semibold">Textbook</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowPdf(false)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PdfViewer pdfUrl="/textbook.pdf" targetPage={targetPage} targetPosition={targetPosition} />
                  </div>
                </div>
              </div>
            )}
          </main>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-white shadow-sm z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">DB Learning Assistant</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            {indexStatus === 'indexed' && (
              <Button variant={showPdf ? "secondary" : "outline"} size="sm" onClick={() => setShowPdf(!showPdf)} className="gap-2">
                <Book className="h-4 w-4" />
                {showPdf ? 'Hide' : 'Show'} Textbook
              </Button>
            )}
          </div>
        </div>
      </header>

      {renderContent()}

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onManageIndex={openAddModal}
      />

      <IndexCreationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={modalMode === 'build' ? handleBuildIndex : handleAddChapters}
        isBuilding={isBuilding}
        indexedChapters={indexedChapters}
        mode={modalMode}
      />
    </div>
  );
}

export default App;
