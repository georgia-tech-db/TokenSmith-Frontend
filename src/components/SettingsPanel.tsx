import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/hooks/use-settings';
import { PROMPT_TYPES } from '@/types/config';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { chatConfig, updateChatConfig, resetChatConfig } = useSettings();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <DialogTitle>Chat Settings</DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetChatConfig}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

