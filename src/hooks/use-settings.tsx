import { createContext, useContext, useState, ReactNode } from 'react';
import { ChatConfig, DEFAULT_CHAT_CONFIG } from '@/types/config';

interface SettingsContextType {
  chatConfig: ChatConfig;
  updateChatConfig: (config: Partial<ChatConfig>) => void;
  resetChatConfig: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [chatConfig, setChatConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);

  const updateChatConfig = (config: Partial<ChatConfig>) => {
    setChatConfig(prev => ({ ...prev, ...config }));
  };

  const resetChatConfig = () => {
    setChatConfig(DEFAULT_CHAT_CONFIG);
  };

  return (
    <SettingsContext.Provider
      value={{
        chatConfig,
        updateChatConfig,
        resetChatConfig,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

