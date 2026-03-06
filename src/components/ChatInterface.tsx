import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Message } from '@/types/chat';
import { sendChatMessage, sendChatMessageStream, fetchChunkMap, ChunkMapEntry } from '@/services/api';
import { useSettings } from '@/hooks/use-settings';

interface ChatInterfaceProps {
  onCitationClick: (heading: string) => void;
  onChunksUsed?: (indices: number[]) => void;
}

const SAMPLE_QUESTIONS = [
  "What is SQL?",
  "What is a database?",
  "What is atomicity?"
];

export function ChatInterface({ onCitationClick, onChunksUsed }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chunkMap, setChunkMap] = useState<Record<string, ChunkMapEntry>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { chatConfig } = useSettings();

  useEffect(() => {
    fetchChunkMap()
      .then(setChunkMap)
      .catch(err => console.error('Failed to load chunk map:', err));
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const chunkMapSnapshot = chunkMap; // capture for async callbacks
    const query = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (chatConfig.enableStreaming) {
      // Streaming mode
      const assistantMessageId = (Date.now() + 1).toString();
      
      // Add empty assistant message that will be updated as tokens arrive
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      try {
        await sendChatMessageStream(query, chatConfig, {
          onToken: (token) => {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + token }
                : msg
            ));
          },
          onChunksByPage: (chunksByPage) => {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, chunksByPage }
                : msg
            ));
          },
          onDone: (sources) => {
            setMessages(prev => prev.map(msg => {
              if (msg.id !== assistantMessageId) return msg;
              const citations = (sources ?? []).map(s => ({ page: s.page, text: s.text }));
              // Derive chunk indices by matching chunk texts against chunkMap previews
              const allChunkTexts = Object.values(msg.chunksByPage ?? {}).flat();
              const derivedIndices = Object.entries(chunkMapSnapshot)
                .filter(([_, entry]) => {
                  const prefix = entry.preview.slice(0, Math.min(entry.preview.length, 80));
                  return prefix.length >= 20 && allChunkTexts.some(t => t.startsWith(prefix));
                })
                .map(([idx]) => Number(idx));
              onChunksUsed?.(derivedIndices);
              return { ...msg, citations, chunksUsed: derivedIndices };
            }));
            setIsLoading(false);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content || `Error: ${error}` }
                : msg
            ));
            setIsLoading(false);
          },
        });
      } catch (error) {
        console.error('Error in streaming:', error);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Unable to connect to the API.' }
            : msg
        ));
        setIsLoading(false);
      }
    } else {
      // Non-streaming mode
      try {
        const response = await sendChatMessage(query, chatConfig);

        onChunksUsed?.(response.chunksUsed ?? []);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          citations: response.citations,
          chunksUsed: response.chunksUsed ?? [],
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error sending message:', error);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Unable to connect to the API.',
          citations: [
            { page: 1, text: 'Introduction section' },
            { page: 5, text: 'Chapter 2.1' },
          ],
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    }
  };

  const handleSampleQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-8">
                <Lightbulb className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-xl font-medium mb-2">Start a conversation</p>
                <p className="text-muted-foreground mb-6">Ask any question about your course material</p>
              </div>
              
              <div className="max-w-5xl mx-auto">
                <h3 className="text-lg font-medium mb-4 text-left">Try these sample questions:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SAMPLE_QUESTIONS.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start hover:bg-primary/5 hover:border-primary/20 transition-colors whitespace-normal"
                      onClick={() => handleSampleQuestion(question)}
                    >
                      <span className="text-sm leading-relaxed break-words">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`p-4 max-w-[90%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap text-left">
                  {message.content}
                  {message.role === 'assistant' && isLoading && chatConfig.enableStreaming && message === messages[messages.length - 1] && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
                  )}
                </p>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2 opacity-70">Sources:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const used = message.chunksUsed ?? [];
                        // Deduplicate by heading to avoid repeating the same section
                        const seen = new Set<string>();
                        return used
                          .filter(idx => {
                            const h = chunkMap[String(idx)]?.heading;
                            if (!h || seen.has(h)) return false;
                            seen.add(h);
                            return true;
                          })
                          .map(idx => (
                            <button
                              key={idx}
                              onClick={() => {
                                const entry = chunkMap[String(idx)];
                                if (entry) onCitationClick(entry.heading);
                              }}
                              title={chunkMap[String(idx)]?.preview ?? ''}
                              className="text-xs underline text-blue-500 hover:text-blue-700 text-left"
                            >
                              {chunkMap[String(idx)]?.section_path ?? `Chunk ${idx}`}
                            </button>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}

          {isLoading && !chatConfig.enableStreaming && (
            <div className="flex justify-start">
              <Card className="p-4 bg-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-6 bg-white shadow-lg">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your textbook..."
            className="min-h-[80px] resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="lg" disabled={isLoading || !input.trim()} className="h-auto">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
