import {useEffect, useRef, useState} from 'react';
import {AgentClient} from './client.ts';
import './App.css';

type Message = {
  type: 'chat' | 'reasoning' | 'system' | 'input';
  content: string;
  level?: 'info' | 'warning' | 'error';
};

type Agent = { id: string; name: string; type: string };

export default function App() {
  const [client] = useState(() => new AgentClient());
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    client.connect().then(() => {
      setConnected(true);
      client.listAgents();
    });

    client.on('agentList', (data: any) => setAgents(data.agents));
    client.on('agentCreated', (data: any) => {
      client.connectAgent(data.agentId);
    });
    client.on('agentConnected', (data: any) => {
      const agent = agents.find(a => a.id === data.agentId);
      if (agent) setCurrentAgent(agent);
      setMessages([]);
    });
    client.on('event:output.chat', (data: any) => {
      setMessages(m => [...m, {type: 'chat', content: data.content}]);
    });
    client.on('event:output.reasoning', (data: any) => {
      setMessages(m => [...m, {type: 'reasoning', content: data.content}]);
    });
    client.on('event:output.system', (data: any) => {
      setMessages(m => [...m, {type: 'system', content: data.message, level: data.level}]);
    });
    client.on('event:input.received', (data: any) => {
      setMessages(m => [...m, {type: 'input', content: data.message}]);
    });
    client.on('event:state.busy', (data: any) => {
      setBusy(true);
      setBusyMessage(data.message);
    });
    client.on('event:state.notBusy', () => {
      setBusy(false);
      setBusyMessage('');
    });
    client.on('event:state.idle', () => {
      setBusy(false);
      inputRef.current?.focus();
    });
    client.on('event:human.request', (data: any) => {
      const response = prompt(data.request.message || 'Input required:');
      client.sendHumanResponse(data.sequence, response);
    });

    return () => client.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentAgent) return;
    client.sendInput(input);
    setInput('');
  };

  const selectAgent = (agent: Agent) => {
    client.connectAgent(agent.id);
  };

  const createAgent = (type: string) => {
    client.createAgent(type);
  };

  if (!connected) {
    return <div className="loading">Connecting...</div>;
  }

  if (!currentAgent) {
    return (
      <div className="agent-selector">
        <h1>TokenRing Coder</h1>
        <h2>Select or Create Agent</h2>
        {agents.length > 0 && (
          <div className="agent-list">
            <h3>Running Agents</h3>
            {agents.map(a => (
              <button key={a.id} onClick={() => selectAgent(a)} className="agent-btn">
                {a.name} ({a.id.slice(0, 8)})
              </button>
            ))}
          </div>
        )}
        <div className="agent-list">
          <h3>Create New Agent</h3>
          <button onClick={() => createAgent('interactiveCodeAgent')} className="agent-btn">
            Interactive Code Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="header">
        <h1>TokenRing Coder</h1>
        <div className="agent-info">
          {currentAgent.name}
          <button onClick={() => setCurrentAgent(null)} className="switch-btn">Switch</button>
        </div>
      </div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type} ${msg.level || ''}`}>
            {msg.type === 'input' && <span className="prompt">&gt; </span>}
            {msg.content}
          </div>
        ))}
        {busy && <div className="spinner">{busyMessage}</div>}
        <div ref={messagesEndRef}/>
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={busy}
          autoFocus
        />
        <button type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
