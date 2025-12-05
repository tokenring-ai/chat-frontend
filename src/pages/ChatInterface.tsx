import { useEffect, useRef, useState } from 'react';
import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import { AgentRpcSchemas } from "@tokenring-ai/agent/rpc/types";
import { HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import HumanRequestRenderer from '../components/HumanRequest/HumanRequestRenderer.tsx';
import { agentRPCClient } from "../rpc.ts";

type Message = {
  type: 'chat' | 'reasoning' | 'system' | 'input';
  content: string;
  level?: 'info' | 'warning' | 'error';
};

interface ChatInterfaceProps {
  agent: ResultOfRPCCall<typeof AgentRpcSchemas, "listAgents">[0];
  onSwitchAgent: () => void;
}

export default function ChatInterface({ agent, onSwitchAgent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [position, setPosition] = useState(0);
  const [eventsData, setEventsData] = useState<ResultOfRPCCall<typeof AgentRpcSchemas, "getAgentEvents"> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3e3e42] py-[15px] px-5">
        <h1 className="text-[#4ec9b0] text-lg font-bold">TokenRing Coder</h1>
        <div className="flex items-center gap-[15px] text-[#9cdcfe]">
          {agent.name}
          <button onClick={onSwitchAgent} className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:bg-[#1177bb]">Switch</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 leading-relaxed">
        {messages.map((msg, i) => {
          const colorClass = msg.type === 'chat' ? 'text-[#4ec9b0]' :
            msg.type === 'reasoning' ? 'text-[#dcdcaa]' :
              msg.type === 'input' ? 'text-[#4fc1ff]' :
                msg.level === 'warning' ? 'text-[#dcdcaa]' :
                  msg.level === 'error' ? 'text-[#f48771]' : 'text-[#569cd6]';
          return (
            <div key={i} className={`mb-2 whitespace-pre-wrap break-words ${colorClass}`}>
              {msg.type === 'input' && <span className="text-[#4fc1ff] mr-1">&gt; </span>}
              {msg.content}
            </div>
          );
        })}
        {busy && <div className="animate-pulse-slow text-[#dcdcaa]">{busyMessage}</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="bg-[#252526] border-t border-[#3e3e42] flex gap-2.5 py-[15px] px-5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={!idle || !!waitingOn}
          autoFocus
          className="flex-1 bg-[#3c3c3c] border border-[#3e3e42] text-[#d4d4d4] text-sm outline-none p-2 focus:border-[#007acc]"
        />
        {idle ? (
          <button type="submit" disabled={!input.trim() || !!waitingOn} className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-5 hover:enabled:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50">Send</button>
        ) : (
          <button type="button" onClick={handleCancel} className="bg-[#d16969] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-5 hover:bg-[#e07878]">Cancel</button>
        )}
      </form>

      {waitingOn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
          <HumanRequestRenderer
            request={waitingOn.request}
            onResponse={handleHumanResponse}
          />
        </div>
      )}
    </div>
  );
}
