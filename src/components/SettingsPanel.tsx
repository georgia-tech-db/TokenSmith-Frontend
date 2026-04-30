import { useState, useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/hooks/use-settings';
import { GEN_MODEL_DEFAULT } from '@/types/config';
import { fetchGeneratorModels } from '@/services/api';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function modelDisplayName(model: string): string {
  const filename = model.split('/').pop() ?? model;
  return filename.replace(/\.gguf$/, '');
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { chatConfig, updateChatConfig, resetChatConfig } = useSettings();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [backendDefaultModel, setBackendDefaultModel] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const loadGeneratorModels = () => {
    setModelsLoading(true);
    setModelsError(null);
    fetchGeneratorModels()
      .then((data) => {
        setAvailableModels(data.available);
        setBackendDefaultModel(data.default);
      })
      .catch((err) => {
        console.error('Failed to load generator models:', err);
        setModelsError('Failed to load generator models. Please try again.');
      })
      .finally(() => setModelsLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    loadGeneratorModels();
  }, [isOpen]);

  const selectableModels = Array.from(new Set(availableModels)).filter(
    (model) =>
      model !== GEN_MODEL_DEFAULT &&
      (!backendDefaultModel || model !== backendDefaultModel)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <DialogTitle>Session Settings</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-6">
          <div className="space-y-6">
            {/* Enable Chunks */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Enable Document Usage</Label>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Yes: model uses the uploaded document for answering questions.</li>
                <li>No: model relies solely on its pre-existing knowledge.</li>
              </ul>
              <div className="flex gap-2 pt-1">
                <Button
                  variant={chatConfig.enableChunks ? "default" : "outline"}
                  onClick={() => updateChatConfig({ enableChunks: true })}
                >
                  Yes
                </Button>
                <Button
                  variant={!chatConfig.enableChunks ? "default" : "outline"}
                  onClick={() => updateChatConfig({ enableChunks: false })}
                >
                  No
                </Button>
              </div>
            </div>

            <Separator />

            {/* Generator Model */}
            <div className="space-y-2">
              <Label htmlFor="gen-model" className="text-base font-medium">
                Model
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the model used for generating responses.
              </p>
              <Select
                value={chatConfig.genModel}
                onValueChange={(value) => updateChatConfig({ genModel: value })}
                disabled={modelsLoading}
              >
                <SelectTrigger id="gen-model">
                  <SelectValue placeholder={modelsLoading ? 'Loading models…' : 'Select model'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GEN_MODEL_DEFAULT}>
                    {backendDefaultModel
                      ? `Default (${modelDisplayName(backendDefaultModel)})`
                      : 'Default (backend configured)'}
                  </SelectItem>
                  {selectableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {modelDisplayName(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelsError && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-destructive">{modelsError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadGeneratorModels}
                    disabled={modelsLoading}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
            
            {/* Reset */}
            <Button
              variant="destructive"
              size="sm"
              onClick={resetChatConfig}
              className="space-y-2 gap-2 w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

