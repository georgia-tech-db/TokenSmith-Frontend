import { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight, Settings, Upload, BookOpen} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Message } from '@/types/chat';
import { sendChatMessageStream } from '@/services/api';
import { useSettings } from '@/hooks/use-settings';

interface ChatInterfaceProps {
  onCitationClick: (page: number, position?: { top: number; height: number }) => void;
  onUploadClick?: () => void;
  onSettingsClick?: () => void;
  onOpenClick?: () => void;
}

export function ChatInterface({ 
  onCitationClick, 
  onUploadClick, 
  onSettingsClick, 
  onOpenClick
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatConfig } = useSettings();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const assistantMessageId = (Date.now() + 1).toString();

    // Add user message and empty assistant message
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
    ]);

    setInput('');
    setIsLoading(true);

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
          if (sources && sources.length > 0) {
            const citations = sources.map(source => ({
              page: source.page,
              text: source.text
            }));

            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, citations }
                : msg
            ));
          }
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
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left Sidebar Panel */}
      <div className="w-24 flex flex-col items-center py-6 gap-8 bg-gt-tan-light border-r shadow-sm z-10 shrink-0">
        {/* Upload Document Group */}
        <div className="flex flex-col items-center gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            title="Upload Document"
            onClick={onUploadClick}
            className="w-14 h-14 rounded-xl text-black bg-gt-tan-light hover:bg-yellow-500 transition-colors"
          >
            <Upload className="h-6 w-6" />
          </Button>
          <span className="text-xs font-bold text-center leading-tight whitespace-normal px-1">
            Upload Document
          </span>
        </div>

        {/* Settings Group */}
        <div className="flex flex-col items-center gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            title="Settings"
            onClick={onSettingsClick}
            className="w-14 h-14 rounded-xl text-black bg-gt-tan-light hover:bg-yellow-500 transition-colors"
          >
            <Settings className="h-6 w-6" />
          </Button>
          <span className="text-xs font-bold text-center leading-tight whitespace-normal px-1">
            Settings
          </span>
        </div>

        {/* Show Document Group */}
        <div className="flex flex-col items-center gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            title="Show Textbook"
            onClick={onOpenClick}
            className="w-14 h-14 rounded-xl text-black bg-gt-tan-light hover:bg-yellow-500 transition-colors"
          >
            <BookOpen className="h-6 w-6" />
          </Button>
          <span className="text-xs font-bold text-center leading-tight whitespace-normal px-1">
            Open Document
          </span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full py-12 px-4">
                <div className="max-w-md w-full bg-white border-2 border-gt-old-gold rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-center text-black mb-2">
                    Welcome to TokenSmith!
                  </h2>
                  <p className="text-center text-black mb-8">
                    Get started with these easy steps:
                  </p>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gt-tan-light p-2 rounded-lg shrink-0 mt-1">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Upload Document</h3>
                        <p className="text-sm text-black">
                          Click the upload button to upload your course material.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-gt-tan-light p-2 rounded-lg shrink-0 mt-1">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Open Document</h3>
                        <p className="text-sm text-black">
                          Click the open button to view and verify your uploaded document.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-gt-tan-light p-2 rounded-lg shrink-0 mt-1">
                        <Settings className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Adjust Settings</h3>
                        <p className="text-sm text-black">
                          Click the settings button to change your session preferences.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-gt-tan-light p-2 rounded-lg shrink-0 mt-1">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Ask a Question</h3>
                        <p className="text-sm text-black">
                          Type your query below and click the submit button to get an answer.
                        </p>
                      </div>
                    </div>
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
                    {message.role === 'assistant' && isLoading && message === messages[messages.length - 1] && (
                      <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
                    )}
                  </p>

                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2 opacity-70">Citations:</p>
                      <div className="space-y-2">
                        {message.citations.map((citation, idx) => {
                          const chunksForPage = message.chunksByPage?.[citation.page] ?? [];

                          return (
                            <Collapsible key={idx} className="border rounded-md">
                              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-secondary/50 transition-colors rounded-t-md [&[data-state=open]>div>svg]:rotate-90">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                                  <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCitationClick(citation.page, citation.position);
                                    }}
                                  >
                                    Page {citation.page}
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="px-4 pb-2 pt-1">
                                <p className="text-sm text-muted-foreground">{citation.text}</p>
                                {chunksForPage.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {chunksForPage.map((chunk, chunkIdx) => (
                                      <p key={chunkIdx} className="text-xs text-muted-foreground text-left">
                                        {chunk}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="border-t p-6 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your course material..."
              className="min-h-[60px] resize-none text-base bg-gray-50 focus-visible:ring-gt-old-gold"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="lg" 
              title="Send Message"
              disabled={isLoading || !input.trim()} 
              className="h-auto px-6 bg-gt-tan-light text-black hover:bg-yellow-500"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}