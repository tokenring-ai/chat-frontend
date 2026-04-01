import type {InputAttachment} from '@tokenring-ai/agent/AgentEvents';
import {useMemo, useState} from 'react';
import AutoScrollContainer from '../components/chat/AutoScrollContainer.tsx';
import ChatFooter from '../components/chat/ChatFooter.tsx';
import ConnectionStatusBanner from '../components/chat/ConnectionStatusBanner.tsx';
import MessageList from '../components/chat/MessageList.tsx';
import PendingQuestions from "../components/chat/PendingQuestions.tsx";
import {useChatInput} from '../components/ChatInputContext.tsx';
import FileBrowserOverlay from '../components/overlay/file-browser.tsx';
import {toastManager} from '../components/ui/toast.tsx';
import {useAgentEventState} from '../hooks/useAgentEventState.ts';
import {agentRPCClient, useAvailableCommands, useCommandHistory} from '../rpc.ts';

export default function ChatPage({ agentId }: { agentId: string }) {
  const { getInput, setInput: setPersistedInput, clearInput } = useChatInput();
  const [input, setInputState] = useState(() => getInput(agentId));
  const [showHistory, setShowHistory] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const setInput = (value: string) => {
    setInputState(value);
    setPersistedInput(agentId, value);
  };

  const {messages, agentStatus, currentExecutionState, isConnecting, connectionError, reconnectAttempts, manualReconnect} = useAgentEventState(agentId);

  const idle = agentStatus.status === "running" && agentStatus.inputExecutionQueue.length === 0;

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
        input: {
          from: "Chat webapp user",
          message,
          attachments,
        },
      });
      const newHistory = [...(commandHistory.data || []), message].slice(-50);
      await commandHistory.mutate(newHistory);
      // Show success feedback if attachments were sent
      if (attachments && attachments.length > 0) {
        setSubmitFeedback({message: `Sent ${attachments.length} attachment(s)`, type: 'success'});
        setTimeout(() => setSubmitFeedback(null), 2000);
      }
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to send message', { duration: 5000 });
      setSubmitFeedback({message: 'Failed to send', type: 'error'});
      setTimeout(() => setSubmitFeedback(null), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <FileBrowserOverlay
        agentId={agentId}
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
      />

      {/* Connection status banner */}
      <ConnectionStatusBanner
        isConnecting={isConnecting}
        connectionError={connectionError}
        reconnectAttempts={reconnectAttempts}
        onReconnect={manualReconnect}
      />

      <div className="flex flex-col flex-1 min-h-0">
        <AutoScrollContainer>
          <MessageList
            messages={messages}
            agentId={agentId}
            agentStatus={agentStatus}
          />
        </AutoScrollContainer>

        {/* Pending Questions displayed at the end of chat, before input */}
        <PendingQuestions
          questions={currentExecutionState?.availableInteractions
            ?.filter((interaction) => interaction.type === 'question')
            .map((question) => ({
              ...question,
              requestId: currentExecutionState.requestId
            })) || []}
          agentId={agentId}
        />

        <ChatFooter
          agentId={agentId}
          input={input}
          setInput={setInput}
          inputError={inputError}
          setInputError={setInputError}
          idle={idle}
          statusMessage={agentStatus.currentActivity}
          availableCommands={filteredAvailableCommands}
          commandHistory={commandHistory.data || []}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          setShowFileBrowser={setShowFileBrowser}
          onSubmit={handleSubmit}
          submitFeedback={submitFeedback}
        />
      </div>
    </div>
  );
}
