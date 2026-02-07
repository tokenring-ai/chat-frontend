import {useMemo, useState} from 'react';
import AutoScrollContainer from '../components/chat/AutoScrollContainer.tsx';
import ChatFooter from '../components/chat/ChatFooter.tsx';
import ChatHeader from '../components/chat/ChatHeader.tsx';
import MessageList from '../components/chat/MessageList.tsx';
import FileBrowserOverlay from '../components/overlay/file-browser.tsx';
import {useAgentEventState} from '../hooks/useAgentEventState.ts';
import {useAgentExecutionState} from '../hooks/useAgentExecutionState.ts';
import {agentRPCClient, useAvailableCommands, useCommandHistory} from '../rpc.ts';
import { useChatInput } from '../components/ChatInputContext.tsx';
import { toastManager } from '../components/ui/toast.tsx';

export default function ChatPage({ agentId }: { agentId: string }) {
  const { getInput, setInput: setPersistedInput, clearInput } = useChatInput();
  const [input, setInputState] = useState(() => getInput(agentId));
  const [showHistory, setShowHistory] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [inputError, setInputError] = useState(false);
  
  const setInput = (value: string) => {
    setInputState(value);
    setPersistedInput(agentId, value);
  };
  
  const { messages } = useAgentEventState(agentId);
  const { idle, busyWith, statusLine, waitingOn } = useAgentExecutionState(agentId);
  const commandHistory = useCommandHistory(agentId);
  const availableCommands = useAvailableCommands(agentId);

  const filteredAvailableCommands = useMemo(() => {
    let ret: string[] = [];
    if (input.startsWith('/') && availableCommands.data) {
      ret = availableCommands.data.filter(cmd => cmd.toLowerCase().startsWith(input.slice(1).toLowerCase())).sort();
      if (ret.length === 0) {
        ret = ['help'];
      } else if (ret.length < 4) {
        ret.push(...ret.map(cmd => `help ${cmd}`));
      }
    }
    return ret;
  }, [availableCommands.data, input]);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1000);
      return;
    }
    if (!idle || !!waitingOn) return;
    const message = input;
    setInput('');
    clearInput(agentId);
    setInputError(false);
    try {
      await agentRPCClient.sendInput({ agentId, message });
      const newHistory = [...(commandHistory.data || []), message].slice(-50);
      await commandHistory.mutate(newHistory);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to send message', { duration: 5000 });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <FileBrowserOverlay
        agentId={agentId}
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
      />

      <ChatHeader agentId={agentId} idle={idle}/>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AutoScrollContainer>
          <MessageList messages={messages} agentId={agentId} busyWith={busyWith || undefined} />
        </AutoScrollContainer>

        <ChatFooter
          agentId={agentId}
          input={input}
          setInput={setInput}
          inputError={inputError}
          setInputError={setInputError}
          idle={idle}
          waitingOn={waitingOn ? 'waiting' : undefined}
          statusLine={statusLine || undefined}
          availableCommands={filteredAvailableCommands}
          commandHistory={commandHistory.data || []}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          setShowFileBrowser={setShowFileBrowser}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
