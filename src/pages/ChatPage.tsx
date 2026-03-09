import {useMemo, useState} from 'react';
import AutoScrollContainer from '../components/chat/AutoScrollContainer.tsx';
import ChatFooter from '../components/chat/ChatFooter.tsx';
import MessageList from '../components/chat/MessageList.tsx';
import FileBrowserOverlay from '../components/overlay/file-browser.tsx';
import {useAgentEventState} from '../hooks/useAgentEventState.ts';
import {agentRPCClient, useAvailableCommands, useCommandHistory} from '../rpc.ts';
import { useChatInput } from '../components/ChatInputContext.tsx';
import { toastManager } from '../components/ui/toast.tsx';
import type { InputAttachment } from '@tokenring-ai/agent/AgentEvents';

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
  
  const { messages, executionState, status } = useAgentEventState(agentId);
  const { busyWith, waitingOn, paused } = executionState;

  const idle = executionState.inputQueue.length === 0 && executionState.waitingOn.length === 0 && executionState.running && !paused;

  const statusMessage = idle || waitingOn.length > 0
    ? 'Waiting for input'
    : status ?? "Working";

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

  const handleSubmit = async (attachments?: InputAttachment[]) => {
    if (!input.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1000);
      return;
    }
    if (!idle) return;
    const message = input;
    setInput('');
    clearInput(agentId);
    setInputError(false);
    try {
      await agentRPCClient.sendInput({ 
        agentId, 
        message,
        attachments,
      });
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
      <div className="flex flex-col flex-1 overflow-hidden">
        <AutoScrollContainer>
          <MessageList messages={messages} agentId={agentId} busyWith={busyWith} />
        </AutoScrollContainer>

        <ChatFooter
          agentId={agentId}
          input={input}
          setInput={setInput}
          inputError={inputError}
          setInputError={setInputError}
          idle={idle}
          paused={paused}
          statusMessage={ statusMessage }
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
