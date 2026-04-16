import { useState, useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/hooks/use-settings';
import { PROMPT_TYPES, GEN_MODEL_DEFAULT } from '@/types/config';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <DialogTitle>Chat Settings</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-6">

          <div className="space-y-6">
            {/* Enable Streaming */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="enable-streaming" className="text-base font-medium">
                  Enable Streaming
                </Label>
                <p className="text-sm text-muted-foreground">
                  Stream responses token by token for a more interactive experience
                </p>
              </div>
              <Switch
                id="enable-streaming"
                checked={chatConfig.enableStreaming}
                onCheckedChange={(checked) =>
                  updateChatConfig({ enableStreaming: checked })
                }
              />
            </div>

            <Separator />

            {/* Enable Chunks */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="enable-chunks" className="text-base font-medium">
                  Enable Chunks
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable chunk-based retrieval for the query
                </p>
              </div>
              <Switch
                id="enable-chunks"
                checked={chatConfig.enableChunks}
                onCheckedChange={(checked) =>
                  updateChatConfig({ enableChunks: checked })
                }
              />
            </div>

            <Separator />

            {/* Prompt Type */}
            <div className="space-y-2">
              <Label htmlFor="prompt-type" className="text-base font-medium">
                Prompt Type
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the type of prompt template to use for generating responses
              </p>
              <Select
                value={chatConfig.promptType}
                onValueChange={(value) => updateChatConfig({ promptType: value })}
              >
                <SelectTrigger id="prompt-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Generator Model */}
            <div className="space-y-2">
              <Label htmlFor="gen-model" className="text-base font-medium">
                Generator Model
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the generator model used for responses. "Default" uses the model configured on the backend.
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

            <Separator />

            {/* Max Chunks */}
            <div className="space-y-2">
              <Label htmlFor="max-chunks" className="text-base font-medium">
                Max Chunks
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Maximum number of chunks to retrieve and use (1-20)
              </p>
              <Input
                id="max-chunks"
                type="number"
                min="1"
                max="20"
                value={chatConfig.maxChunks ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateChatConfig({ maxChunks: undefined });
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      updateChatConfig({
                        maxChunks: Math.max(1, Math.min(20, num)),
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(parseInt(value))) {
                    updateChatConfig({ maxChunks: 5 });
                  }
                }}
              />
            </div>

            <Separator />

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-base font-medium">
                Temperature
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Controls randomness in the response (0.0 - 2.0)
              </p>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={chatConfig.temperature ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateChatConfig({ temperature: undefined });
                  } else {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      updateChatConfig({
                        temperature: Math.max(0, Math.min(2, num)),
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(parseFloat(value))) {
                    updateChatConfig({ temperature: 0.7 });
                  }
                }}
              />
            </div>

            <Separator />

            {/* Top K */}
            <div className="space-y-2">
              <Label htmlFor="top-k" className="text-base font-medium">
                Top K
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Number of top candidates to consider (1-50)
              </p>
              <Input
                id="top-k"
                type="number"
                min="1"
                max="50"
                value={chatConfig.topK ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateChatConfig({ topK: undefined });
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      updateChatConfig({
                        topK: Math.max(1, Math.min(50, num)),
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(parseInt(value))) {
                    updateChatConfig({ topK: 10 });
                  }
                }}
              />
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

