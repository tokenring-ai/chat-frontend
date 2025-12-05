import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import AgentRpcSchema from "@tokenring-ai/agent/rpc/schema";
import { HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import HumanRequestRenderer from '../components/HumanRequest/HumanRequestRenderer.tsx';
import FilesBrowser from '../components/FilesBrowser.tsx';
import Sidebar from '../components/Sidebar.tsx';
import { agentRPCClient } from "../rpc.ts";

type Message = {
  type: 'chat' | 'reasoning' | 'system' | 'input';
  content: string;
  level?: 'info' | 'warning' | 'error';
};

interface ChatInterfaceProps {
  agent: ResultOfRPCCall<typeof AgentRpcSchema, "listAgents">[0];
  onSwitchAgent: () => void;
}

export default function ChatInterface({ agent, onSwitchAgent }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [position, setPosition] = useState(0);
  const [eventsData, setEventsData] = useState<ResultOfRPCCall<typeof AgentRpcSchema, "getAgentEvents"> | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = location.pathname.endsWith('/files') ? 'files' : 'agent';

  useEffect(() => {
    const interval = setInterval(() => loadEvents(), 100);
    return () => clearInterval(interval);
  }, [agent.id, position]);

  const loadEvents = async () => {
    const data = await agentRPCClient.getAgentEvents({ agentId: agent.id, fromPosition: position });
    setEventsData(data);
  };

  useEffect(() => {
    if (eventsData) {
      const { events, position: newPosition } = eventsData;

      if (newPosition > position) {
        setPosition(newPosition);

        events.forEach((event) => {
          if (event.type === 'output.chat') {
            setMessages(m => {
              const last = m[m.length - 1];
              if (last?.type === 'chat') {
                return [...m.slice(0, -1), { ...last, content: last.content + event.content }];
              }
              return [...m, { type: 'chat', content: event.content }];
            });
          } else if (event.type === 'output.reasoning') {
            setMessages(m => {
              const last = m[m.length - 1];
              if (last?.type === 'reasoning') {
                return [...m.slice(0, -1), { ...last, content: last.content + event.content }];
              }
              return [...m, { type: 'reasoning', content: event.content }];
            });
          } else if (event.type === 'output.system') {
            setMessages(m => [...m, { type: 'system', content: event.message, level: event.level }]);
          } else if (event.type === 'input.received') {
            setMessages(m => [...m, { type: 'input', content: event.message }]);
          }
        });
      }
    }
  }, [eventsData, position]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await agentRPCClient.sendInput({ agentId: agent.id, message: input });
    setInput('');
  };

  const handleCancel = async () => {
    await agentRPCClient.abortAgent({ agentId: agent.id, reason: "User requested abort" });
  };

  const handleHumanResponse = async (response: HumanInterfaceResponse) => {
    const waitingOn = eventsData?.waitingOn;
    if (!waitingOn) return;

    await agentRPCClient.sendHumanResponse({
      agentId: agent.id,
      requestId: waitingOn.id,
      response
    });
  };

  const idle = eventsData?.idle ?? true;
  const busy = eventsData?.busyWith ? true : false;
  const busyMessage = eventsData?.busyWith || '';
  const waitingOn = eventsData?.waitingOn;

  return (
    <div className="flex h-full">
      <Sidebar currentPage={currentPage} onPageChange={(page) => navigate(page === 'agent' ? `/agent/${agent.id}` : `/agent/${agent.id}/files`)} />
      <div className="flex flex-col flex-1">
        <Routes>
          <Route path="/" element={
            <>
            <div className="flex-1 overflow-y-auto p-5 leading-relaxed">
        {messages.map((msg, i) => {
          const colorClass = msg.type === 'chat' ? 'text-accent' :
            msg.type === 'reasoning' ? 'text-warning' :
              msg.type === 'input' ? 'text-input' :
                msg.level === 'warning' ? 'text-warning' :
                  msg.level === 'error' ? 'text-error' : 'text-code';
          return (
            <div key={i} className={`mb-2 whitespace-pre-wrap break-words ${colorClass}`}>
              {msg.type === 'input' && <span className="text-input mr-1">&gt; </span>}
              {msg.content}
            </div>
          );
        })}
              {busy && <div className="animate-pulse-slow text-warning">{busyMessage}</div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="bg-secondary border-t border-default flex gap-2.5 py-[15px] px-5">
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
          <Route path="/files" element={<FilesBrowser agentId={agent.id} onClose={() => navigate(`/agent/${agent.id}`)} />} />
        </Routes>

      {waitingOn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
          <HumanRequestRenderer
            request={waitingOn.request}
            onResponse={handleHumanResponse}
          />
        </div>
      )}
      </div>
      {showFiles && <FilesBrowser agentId={agent.id} onClose={() => setShowFiles(false)} />}
    </div>
  );
}
