import {HumanRequestSchema} from "@tokenring-ai/agent/AgentEvents";
import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import HumanRequestRenderer from '../components/HumanRequest/HumanRequestRenderer.tsx';
import FileBrowser from './chat/FileBrowser.tsx';
import Sidebar from '../components/Sidebar.tsx';
import { agentRPCClient } from "../rpc.ts";
import z from 'zod';

type Message = {
  type: 'output.chat' | 'output.reasoning' | 'output.info' | 'output.warning' | 'output.error' | 'input.received';
  message: string;
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
  const [{
    idle,
    busyWith,
    statusLine,
    waitingOn,
    position,
    messages
  }, setChatState] = useState<ChatState>({ idle: false, busyWith: "Connecting...", statusLine: null, waitingOn: null, position: 0, messages: []});
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = location.pathname.endsWith('/files') ? 'files' : 'agent';
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      let prevMessages: Message[] = messages;
      let fromPosition = position

      while (!abortController.signal.aborted) {
        try {
          for await (const eventsData of agentRPCClient.streamAgentEvents({
            agentId: agentId,
            fromPosition,
          }, abortController.signal)) {
            for (const event of eventsData.events) {
              switch (event.type) {
                case 'output.chat':
                case 'output.reasoning':
                case 'output.info':
                case 'output.warning':
                case 'output.error':
                  const last = prevMessages[prevMessages.length - 1];
                  if (last?.type === event.type) {
                    last.message += event.message
                  } else {
                    prevMessages.push({type: event.type, message: event.message});
                  }
                  break;
                case 'input.received':
                  prevMessages.push({type: event.type, message: event.message});
                  break;
              }
            }

            fromPosition = eventsData.position;

            setChatState({
              busyWith: eventsData.busyWith,
              idle: eventsData.idle,
              waitingOn: eventsData.waitingOn,
              statusLine: eventsData.statusLine,
              position: eventsData.position,
              messages: eventsData.events.length > 0 ? [...prevMessages] : prevMessages
            });
          }
        } catch (e) {
          if (!abortController.signal.aborted) {
            console.error("Stream error, retrying...", e);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    })();

    return () => abortController.abort();
  }, [agentId]);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages[messages.length - 1]?.message, isAtBottom, waitingOn, busyWith, statusLine]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 50;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await agentRPCClient.sendInput({ agentId: agentId, message: input });
    setInput('');
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
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 transition-opacity duration-300"
          onClick={() => onSidebarChange?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 shadow-2xl' : 'relative'} 
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
            <div className="flex flex-col h-full">
              <div 
                ref={messagesContainerRef} 
                onScroll={handleScroll} 
                className="flex-1 overflow-y-auto p-4 sm:p-6 leading-relaxed flex flex-col gap-2"
              >
                {messages.map((msg, i) =>
                  <div key={i} className={`whitespace-pre-wrap break-words ${colorClasses[msg.type]}`}>
                    {msg.type === 'input.received' && <span className="text-input mr-1">&gt; </span>}
                    {msg.message}
                  </div>
                )}
                {busyWith && <div className="animate-pulse-slow text-warning mt-2 italic">{busyWith}</div>}
                <div ref={messagesEndRef} className="h-4" />
              </div>
              
              {statusLine && (
                <div className="bg-secondary/50 border-t border-default px-4 py-1.5 text-xs text-muted truncate">
                  <span className="text-success mr-1.5 inline-block w-2 h-2 rounded-full bg-green-500"></span> 
                  {statusLine}
                </div>
              )}
              
              <div className="bg-secondary border-t border-default p-3 sm:p-4">
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!idle || !!waitingOn}
                    autoFocus
                    className="flex-1 bg-input border border-default text-primary text-sm outline-none px-4 py-2.5 focus:border-focus rounded-md transition-colors disabled:opacity-50"
                  />
                  {idle ? (
                    <button 
                      type="submit" 
                      disabled={!input.trim() || !!waitingOn} 
                      className="btn-primary text-white font-medium rounded-md px-4 sm:px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleCancel} 
                      className="btn-danger text-white font-medium rounded-md px-4 sm:px-6 py-2.5 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </div>
            </div>
          } />
          <Route path="/files" element={<FileBrowser agentId={agentId} onClose={() => navigate(`/agent/${agentId}`)} />} />
        </Routes>

        {waitingOn && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-secondary rounded-lg shadow-2xl border border-default overflow-hidden animate-in fade-in zoom-in duration-300">
              <HumanRequestRenderer
                request={waitingOn.request}
                onResponse={handleHumanResponse}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
