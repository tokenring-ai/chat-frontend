import { AgentRpcSchemas } from "@tokenring-ai/agent/rpc/types";
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import HumanRequestRenderer from './components/HumanRequest/HumanRequestRenderer.tsx';
import { agentRPCClient } from "./rpc.ts";
import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";

type Message = {
  type: 'chat' | 'reasoning' | 'system' | 'input';
  content: string;
  level?: 'info' | 'warning' | 'error';
};

export default function App() {
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [position, setPosition] = useState(0);
  const [agents, setAgents] = useState<ResultOfRPCCall<typeof AgentRpcSchemas,"listAgents">>([]);
  const [eventsData, setEventsData] = useState<ResultOfRPCCall<typeof AgentRpcSchemas,"getAgentEvents">|null>(null);
  const [agentTypes, setAgentTypes] = useState<ResultOfRPCCall<typeof AgentRpcSchemas, "getAgentTypes">>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAgents();
    loadAgentTypes();
  }, []);

  useEffect(() => {
    if (!currentAgentId) return;
    const interval = setInterval(() => loadEvents(), 100);
    return () => clearInterval(interval);
  }, [currentAgentId, position]);

  const loadAgents = async () => {
    try {
      const agents = await agentRPCClient.listAgents({});
      setAgents(agents);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentTypes = async () => {
    try {
      const agentTypes = await agentRPCClient.getAgentTypes({});
      setAgentTypes(agentTypes);
    } finally {}
  }

  const loadEvents = async () => {
    if (!currentAgentId) return;
    const data = await agentRPCClient.getAgentEvents({ agentId: currentAgentId, fromPosition: position});
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
          } else if (event.type === 'human.request') {
            // Handled by waitingOn state
          }
        });
      }
    }
  }, [eventsData, position, currentAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentAgentId) return;
    await agentRPCClient.sendInput({ agentId: currentAgentId, message: input});
    setInput('');
  };

  const selectAgent = (agentId: string) => {
    setCurrentAgentId(agentId);
    setMessages([]);
    setPosition(0);
  };

  const createAgent = async (type: string) => {
    await agentRPCClient.createAgent({ agentType: type, headless: false});
    await loadAgents();
  };

  const handleHumanResponse = async (response: HumanInterfaceResponse) => {
    const waitingOn = eventsData?.waitingOn;
    if (!waitingOn || !currentAgentId) return;

    await agentRPCClient.sendHumanResponse({
      agentId: currentAgentId,
      requestId: waitingOn.id,
      response
    });
  };

  const currentAgent = agents.find(a => a.id === currentAgentId);
  const busy = eventsData?.busyWith ? true : false;
  const busyMessage = eventsData?.busyWith || '';
  const waitingOn = eventsData?.waitingOn;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading agents...</div>;
  }

  if (!currentAgent) {
    return (
      <div className="max-w-[600px] mx-auto my-[50px] px-5">
        <h1 className="text-[#4ec9b0] text-4xl font-bold mb-6">TokenRing Coder</h1>
        <h2 className="text-[#9cdcfe] text-xl font-bold mb-5">Select or Create Agent</h2>
        {agents.length > 0 && (
          <div className="mb-8 flex flex-col gap-2">
            <h3 className="text-[#dcdcaa] text-sm font-bold p-2.5">Running Agents</h3>
            {agents.map(a => (
              <button key={a.id} onClick={() => selectAgent(a.id)} className="w-full block bg-[#2d2d30] border border-[#3e3e42] text-[#d4d4d4] cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-[#3e3e42]">
                {a.name} ({a.id.slice(0, 8)})
              </button>
            ))}
          </div>
        )}
        <div className="mb-8 flex flex-col gap-2">
          <h3 className="text-[#dcdcaa] text-sm font-bold p-2.5">Create New Agent</h3>
          { agentTypes.map(t => (
            <button key={t.type} onClick={() => createAgent(t.type)} className="w-full block bg-[#2d2d30] border border-[#3e3e42] text-[#d4d4d4] cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-[#3e3e42]">
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3e3e42] py-[15px] px-5">
        <h1 className="text-[#4ec9b0] text-lg font-bold">TokenRing Coder</h1>
        <div className="flex items-center gap-[15px] text-[#9cdcfe]">
          {currentAgent.name}
          <button onClick={() => setCurrentAgentId(null)} className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:bg-[#1177bb]">Switch</button>
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
          disabled={busy || !!waitingOn}
          autoFocus
          className="flex-1 bg-[#3c3c3c] border border-[#3e3e42] text-[#d4d4d4] text-sm outline-none p-2 focus:border-[#007acc]"
        />
        <button type="submit" disabled={busy || !input.trim() || !!waitingOn} className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-5 hover:enabled:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50">Send</button>
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
