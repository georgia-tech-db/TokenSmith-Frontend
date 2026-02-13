import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IndexCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (chapters: number[]) => void;
  isBuilding: boolean;
  indexedChapters?: number[];
  mode?: 'build' | 'add';
}

const START_CHAPTER = 0;
const END_CHAPTER = 20;

export function IndexCreationModal({
  open,
  onOpenChange,
  onSubmit,
  isBuilding,
  indexedChapters = [],
  mode = 'build',
}: IndexCreationModalProps) {
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedChapters([]);
    }
  }, [open]);

  const chapters = Array.from(
    { length: END_CHAPTER - START_CHAPTER + 1 },
    (_, i) => START_CHAPTER + i
  );

  const handleChapterToggle = (chapter: number) => {
    if (indexedChapters.includes(chapter)) return;
    setSelectedChapters((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter)
        : [...prev, chapter]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedChapters);
  };

  const title = mode === 'build' ? 'Build Index' : 'Add Chapters';
  const description =
    mode === 'build'
      ? 'Select the chapters you want to include in the index.'
      : 'Select additional chapters to add to the index.';
  const buttonText = mode === 'build' ? 'Build Index' : 'Add Chapters';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <div key={chapter} className="flex items-center space-x-2">
                <Checkbox
                  id={`chapter-${chapter}`}
                  checked={
                    selectedChapters.includes(chapter) ||
                    indexedChapters.includes(chapter)
                  }
                  disabled={indexedChapters.includes(chapter)}
                  onCheckedChange={() => handleChapterToggle(chapter)}
                />
                <label
                  htmlFor={`chapter-${chapter}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Chapter {chapter}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isBuilding || selectedChapters.length === 0}
          >
            {isBuilding ? 'Building...' : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
