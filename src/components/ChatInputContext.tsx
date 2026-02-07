import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ChatInputState {
  [agentId: string]: string;
}

interface ChatInputContextType {
  getInput: (agentId: string) => string;
  setInput: (agentId: string, value: string) => void;
  clearInput: (agentId: string) => void;
}

const ChatInputContext = createContext<ChatInputContextType | undefined>(undefined);

const STORAGE_KEY = 'tokenring-chat-inputs';

export function ChatInputProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<ChatInputState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch (e) {
      console.error('Failed to persist chat inputs:', e);
    }
  }, [inputs]);

  const getInput = (agentId: string) => inputs[agentId] || '';

  const setInput = (agentId: string, value: string) => {
    setInputs(prev => ({ ...prev, [agentId]: value }));
  };

  const clearInput = (agentId: string) => {
    setInputs(prev => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  };

  return (
    <ChatInputContext.Provider value={{ getInput, setInput, clearInput }}>
      {children}
    </ChatInputContext.Provider>
  );
}

export function useChatInput() {
  const context = useContext(ChatInputContext);
  if (!context) {
    throw new Error('useChatInput must be used within ChatInputProvider');
  }
  return context;
}
