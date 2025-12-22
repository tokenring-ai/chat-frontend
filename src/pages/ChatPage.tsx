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
}

type ChatState = {
  busyWith: string | null;
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

export default function ChatPage({ agentId }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [{
    idle,
    busyWith,
    waitingOn,
    position,
    messages
  }, setChatState] = useState<ChatState>({ idle: false, busyWith: "Connecting...", waitingOn: null, position: 0, messages: []});
  const [showFiles, setShowFiles] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = location.pathname.endsWith('/files') ? 'files' : 'agent';

  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      let prevMessages: Message[] = messages;
      let fromPosition = position

      while (!abortController.signal.aborted) {
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
            position: eventsData.position,
            messages: eventsData.events.length > 0 ? [...prevMessages] : prevMessages
          });
        }
      }
    })();

    return () => abortController.abort();
  }, [agentId]);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages[messages.length - 1]?.message, isAtBottom, waitingOn, busyWith]);

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
    <div className="flex h-full">
      <Sidebar currentPage={currentPage} onPageChange={(page) => navigate(page === 'agent' ? `/agent/${agentId}` : `/agent/${agentId}/files`)} />
      <div className="flex flex-col flex-1">
        <Routes>
          <Route path="/" element={
            <>
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 leading-relaxed">
              {messages.map((msg, i) =>
                <div key={i} className={`mb-2 whitespace-pre-wrap wrap-break-word ${colorClasses[msg.type]}`}>
                  {msg.type === 'input.received' && <span className="text-input mr-1">&gt; </span>}
                  {msg.message}
                </div>
              )}
              {busyWith && <div className="animate-pulse-slow text-warning">{busyWith}</div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="bg-secondary border-t border-default flex gap-2.5 py-3.75 px-5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={!idle || !!waitingOn}
          autoFocus
          className="flex-1 bg-input border border-default text-primary text-sm outline-none p-2 focus:border-focus"
        />
        {idle ? (
          <button type="submit" disabled={!input.trim() || !!waitingOn} className="btn-primary border-none rounded-sm text-white cursor-pointer text-sm py-2 px-5 hover:enabled:btn-primary disabled:cursor-not-allowed disabled:opacity-50">Send</button>
          ) : (
            <button type="button" onClick={handleCancel} className="btn-danger border-none rounded-sm text-white cursor-pointer text-sm py-2 px-5 hover:btn-danger">Cancel</button>
          )}
            </form>
            </>
          } />
          <Route path="/files" element={<FileBrowser agentId={agentId} onClose={() => navigate(`/agent/${agentId}`)} />} />
        </Routes>

      {waitingOn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000">
          <HumanRequestRenderer
            request={waitingOn.request}
            onResponse={handleHumanResponse}
          />
        </div>
      )}
      </div>
      {showFiles && <FileBrowser agentId={agentId} onClose={() => setShowFiles(false)} />}
    </div>
  );
}
