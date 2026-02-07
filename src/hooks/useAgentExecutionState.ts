import {type ParsedQuestionRequest} from "@tokenring-ai/agent/AgentEvents";
import { useState, useEffect } from 'react';
import { agentRPCClient } from '../rpc.ts';

type ExecutionState = {
  idle: boolean;
  busyWith: string | null;
  statusLine: string | null;
  waitingOn: ParsedQuestionRequest | null;
};

export function useAgentExecutionState(agentId: string) {
  const [state, setState] = useState<ExecutionState>({
    idle: false,
    busyWith: "Connecting...",
    statusLine: null,
    waitingOn: null,
  });

  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      while (!abortController.signal.aborted) {
        try {
          for await (const execState of agentRPCClient.streamAgentExecutionState({
            agentId,
          }, abortController.signal)) {
            setState({
              idle: execState.idle,
              busyWith: execState.busyWith,
              statusLine: execState.statusLine,
              waitingOn: execState.waitingOn[0] || null,
            });
          }
        } catch (e) {
          if (!abortController.signal.aborted) {
            console.error("Execution state stream error, retrying...", e);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    })();

    return () => abortController.abort();
  }, [agentId]);

  return state;
}
