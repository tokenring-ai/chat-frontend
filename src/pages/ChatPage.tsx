import {HumanRequestSchema} from "@tokenring-ai/agent/AgentEvents";
import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import HumanRequestRenderer from '../components/HumanRequest/HumanRequestRenderer.tsx';
import FileBrowser from './chat/FileBrowser.tsx';
import Sidebar from '../components/Sidebar.tsx';
import ArtifactViewer from '../components/ArtifactViewer.tsx';
import { agentRPCClient } from "../rpc.ts";
import { Send, Square } from 'lucide-react';
import z from 'zod';

type Message = {
  type: 'output.chat' | 'output.reasoning' | 'output.info' | 'output.warning' | 'output.error' | 'input.received' | 'output.artifact';
  message?: string;
  name?: string;
  mimeType?: string;
  body?: string;
};

interface ChatInterfaceProps {
  agentId: string;
  sidebarOpen?: boolean;
  onSidebarChange?: (open: boolean) => void;
}

type ChatState = {
  busyWith: string | null;
  statusLine: string | null;
  idle: boolean;
  waitingOn: z.infer<typeof HumanRequestSchema> | null;
  position: number;
  messages: Message[];
}

const colorClasses = {
  'output.chat': 'text-accent',
  'output.reasoning': 'text-warning',
  'input.received': 'text-input',
  'output.warning': 'text-warning',
  'output.error': 'text-error',
  'output.info': 'text-code'
}

export default function ChatPage({ agentId, sidebarOpen = false, onSidebarChange }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>({ 
    idle: false, 
    busyWith: "Connecting...", 
    statusLine: null, 
    waitingOn: null, 
    position: 0, 
    messages: []
  });
  
  const {
    idle,
    busyWith,
    statusLine,
    waitingOn,
    messages
  } = chatState;

  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Track previous state to detect actual changes
  const prevMessagesLengthRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  const currentPage = location.pathname.endsWith('/files') ? 'files' : 'agent';
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  // Track state in a ref to avoid closure staleness in the stream loop
  const chatStateRef = useRef(chatState);
  useEffect(() => {
    chatStateRef.current = chatState;
  }, [chatState]);

  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      // Start from the current position if we have one
      let fromPosition = chatStateRef.current.position;
      let currentMessages = [...chatStateRef.current.messages];

      while (!abortController.signal.aborted) {
        try {
          for await (const eventsData of agentRPCClient.streamAgentEvents({
            agentId: agentId,
            fromPosition,
          }, abortController.signal)) {
            
            let messagesChanged = false;
            
            for (const event of eventsData.events) {
              switch (event.type) {
                case 'output.chat':
                case 'output.reasoning':
                case 'output.info':
                case 'output.warning':
                case 'output.error':
                  const last = currentMessages[currentMessages.length - 1];
                  if (last?.type === event.type) {
                    last.message += event.message;
                  } else {
                    currentMessages.push({type: event.type, message: event.message});
                  }
                  messagesChanged = true;
                  break;
                case 'input.received':
                  currentMessages.push({type: event.type, message: event.message});
                  messagesChanged = true;
                  break;
                case 'output.artifact':
                  currentMessages.push({
                    type: event.type,
                    name: event.name,
                    mimeType: event.mimeType,
                    body: event.body
                  });
                  messagesChanged = true;
                  break;
              }
            }

            fromPosition = eventsData.position;

            setChatState(prev => ({
              ...prev,
              busyWith: eventsData.busyWith,
              idle: eventsData.idle,
              waitingOn: eventsData.waitingOn,
              statusLine: eventsData.statusLine,
              position: eventsData.position,
              messages: messagesChanged ? [...currentMessages] : prev.messages
            }));
          }
        } catch (e) {
          if (!abortController.signal.aborted) {
            console.error("Stream error, retrying...", e);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // When retrying, refresh fromPosition from current ref state
            fromPosition = chatStateRef.current.position;
            currentMessages = [...chatStateRef.current.messages];
          }
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [agentId]); // Only restart when agentId changes

  // Improved scrolling logic
  useEffect(() => {
    const container = messagesContainerRef.current;
    const endRef = messagesEndRef.current;
    
    if (!container || !endRef || isScrollingRef.current) return;

    const currentMessagesLength = messages.length;
    const messagesAdded = currentMessagesLength > prevMessagesLengthRef.current;
    
    if (isAtBottom && messagesAdded) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      isScrollingRef.current = true;
      
      scrollTimeoutRef.current = setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
        isScrollingRef.current = false;
      }, 0);
    }
    
    prevMessagesLengthRef.current = currentMessagesLength;
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, isAtBottom]);

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 50;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !idle || !!waitingOn) return;
    const message = input;
    setInput('');
    await agentRPCClient.sendInput({ agentId: agentId, message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCancel = async () => {
    await agentRPCClient.abortAgent({ agentId: agentId, reason: "User requested abort" });
  };

  const handleHumanResponse = async (response: HumanInterfaceResponse) => {
    if (!waitingOn) return;

    await agentRPCClient.sendHumanResponse({
      agentId: agentId,
      requestId: waitingOn.id,
      response
    });
  };

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Mobile sidebar overlay - offset to keep TopBar clickable */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/60 z-30 transition-opacity duration-300"
          onClick={() => onSidebarChange?.(false)}
        />
      )}

      {/* Sidebar - offset to keep TopBar visible */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 top-14 left-0 shadow-2xl' : 'relative'} 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300 ease-in-out z-40
        ${isMobile ? 'w-64' : 'w-16'}
        bg-sidebar flex flex-col items-center py-2 gap-2 h-full
      `}>
        <Sidebar
          currentPage={currentPage}
          onPageChange={(page) => {
            navigate(page === 'agent' ? `/agent/${agentId}` : `/agent/${agentId}/files`);
            onSidebarChange?.(false);
          }}
          isMobile={isMobile}
          isSidebarOpen={sidebarOpen}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 bg-primary">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col h-full overflow-hidden">
              <div 
                ref={messagesContainerRef} 
                onScroll={handleScroll} 
                className="flex-1 overflow-y-auto p-4 sm:p-6 leading-relaxed flex flex-col gap-2"
              >
                {messages.map((msg, i) => {
                  if (msg.type === 'output.artifact') {
                    return <ArtifactViewer key={i} name={msg.name!} mimeType={msg.mimeType!} body={msg.body!} />;
                  }
                  return (
                    <div key={i} className={`whitespace-pre-wrap break-words ${colorClasses[msg.type]}`}>
                      {msg.type === 'input.received' && <span className="text-input mr-1">&gt; </span>}
                      {msg.message}
                    </div>
                  );
                })}
                {busyWith && <div className="animate-pulse-slow text-warning mt-2 italic">{busyWith}</div>}
                <div ref={messagesEndRef} className="h-4" />
              </div>
              
              {statusLine && (
                <div className="bg-secondary/50 border-t border-default px-4 py-1.5 text-xs text-muted truncate">
                  <span className="text-success mr-1.5 inline-block w-2 h-2 rounded-full bg-green-500"></span> 
                  {statusLine}
                </div>
              )}
              
              <div className="bg-primary border-t border-default p-3 sm:p-4">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={!idle || !!waitingOn}
                    autoFocus
                    rows={1}
                    className="w-full bg-secondary border border-default text-primary text-sm outline-none px-4 py-3.5 pr-14 focus:border-focus rounded-xl transition-all disabled:opacity-50 resize-none min-h-[52px] max-h-[200px] shadow-sm group-focus-within:shadow-md group-focus-within:border-focus/50"
                  />
                  <div className="absolute right-3 bottom-4 flex items-center justify-center">
                    {idle ? (
                      <button 
                        type="submit" 
                        disabled={!input.trim() || !!waitingOn} 
                        className={`p-1.5 rounded-lg transition-all duration-200 ${
                          input.trim() 
                            ? 'bg-accent text-[#1e1e1e] scale-100 opacity-100 shadow-sm hover:scale-105 active:scale-95' 
                            : 'bg-transparent text-muted opacity-40 scale-90 grayscale'
                        }`}
                        aria-label="Send message"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleCancel} 
                        className="p-1.5 bg-error/20 text-error rounded-lg transition-all hover:bg-error/30 hover:scale-105 active:scale-95 border border-error/30"
                        aria-label="Cancel"
                      >
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    )}
                  </div>
                </form>
                <div className="max-w-4xl mx-auto mt-2 px-1 flex justify-between items-center text-[10px] text-muted uppercase tracking-wider font-semibold opacity-50">
                  <span>Shift + Enter for new line</span>
                  {idle ? <span>Ready</span> : <span>Agent Thinking...</span>}
                </div>
              </div>
            </div>
          } />
          <Route path="/files" element={<FileBrowser agentId={agentId} onClose={() => navigate(`/agent/${agentId}`)} />} />
        </Routes>

        {waitingOn && <HumanRequestRenderer
                request={waitingOn.request}
                onResponse={handleHumanResponse}
              />
        }
      </div>
    </div>
  );
}
