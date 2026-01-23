import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { sendChatMessage, sendChatMessageStream } from '@/services/api';
import { ChatConfig } from '@/types/config';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock chat config
const mockConfig: ChatConfig = {
  enableChunks: true,
  enableStreaming: false,
  promptType: 'tutor',
  maxChunks: 5,
  temperature: 0.7,
  topK: 10,
};

describe('API Service Contract', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('sendChatMessage', () => {
    it('sends correct request and transforms response', async () => {
      // Mock the backend response
      const mockResponseData = {
        answer: 'Test answer',
        sources: [{ page: 1, text: 'Source text' }]
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      });

      // Call the function
      const result = await sendChatMessage('Hello', mockConfig);

      // Verify the request format
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Hello',
            enable_chunks: true,
            prompt_type: 'tutor',
            max_chunks: 5,
            temperature: 0.7,
            top_k: 10,
          }),
        })
      );

      // Verify the output transformation
      expect(result).toEqual({
        content: 'Test answer',
        citations: [{ page: 1, text: 'Source text' }]
      });
    });

    it('throws error when API fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(sendChatMessage('Hello', mockConfig))
        .rejects.toThrow('Failed to send message: 500 Internal Server Error');
    });
  });

  describe('sendChatMessageStream', () => {
    // Create a ReadableStream from an array of strings
    const createStreamResponse = (chunks: string[]) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      });
      return {
        ok: true,
        body: stream,
      };
    };

    it('correctly parses SSE tokens and done events', async () => {
      // Mock streaming response
      const mockChunks = [
        'data: {"type": "token", "content": "Hello"}\n',
        'data: {"type": "token", "content": " World"}\n',
        'data: {"type": "done", "sources": [{"page": 2, "text": "ref"}]}\n'
      ];
      
      fetchMock.mockResolvedValueOnce(createStreamResponse(mockChunks));

      // Setup callbacks
      const callbacks = {
        onToken: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      };

      // Run the function
      await sendChatMessageStream('Test Query', mockConfig, callbacks);

      // Verify callbacks
      // Check tokens
      expect(callbacks.onToken).toHaveBeenCalledTimes(2);
      expect(callbacks.onToken).toHaveBeenNthCalledWith(1, 'Hello');
      expect(callbacks.onToken).toHaveBeenNthCalledWith(2, ' World');

      // Check done event and source extraction
      expect(callbacks.onDone).toHaveBeenCalledTimes(1);
      expect(callbacks.onDone).toHaveBeenCalledWith([{ page: 2, text: 'ref' }]);
      
      // Ensure no errors
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('handles stream network errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const callbacks = { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() };

      await sendChatMessageStream('Test', mockConfig, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Failed to send message: 404 Not Found');
    });

    it('handles malformed SSE data gracefully', async () => {
      // Sending bad JSON in the middle
      const mockChunks = [
        'data: {"type": "token", "content": "Good"}\n',
        'data: {BAD_JSON_HERE}\n', 
        'data: {"type": "token", "content": "Morning"}\n',
        'data: {"type": "done"}\n'
      ];
      
      fetchMock.mockResolvedValueOnce(createStreamResponse(mockChunks));

      const callbacks = { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() };
      
      // Use spy on console to suppress "Failed to parse" warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sendChatMessageStream('Test', mockConfig, callbacks);

      // Should skip the bad chunk and process the valid ones
      expect(callbacks.onToken).toHaveBeenCalledWith('Good');
      expect(callbacks.onToken).toHaveBeenCalledWith('Morning');
      expect(callbacks.onDone).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});