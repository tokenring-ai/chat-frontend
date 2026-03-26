import {type AgentEventEnvelope, AgentStatusSchema, InputExecutionStateSchema,} from "@tokenring-ai/agent/AgentEvents";
import {useEffect, useRef, useState} from "react";
import {z} from "zod";
import {agentRPCClient} from "../rpc.ts";
import type {ChatMessage, QuestionInteraction} from "../types/agent-events.ts";

export type RemoteAgentStatus = Omit<AgentStatus, "status"> & {
  status: AgentStatus["status"] | "connecting";
};
type AgentStatus = z.output<typeof AgentStatusSchema>;
type InputExecutionState = z.output<typeof InputExecutionStateSchema>;

const INITIAL_AGENT_STATUS: RemoteAgentStatus = {
  type: "agent.status",
  status: "connecting",
  currentActivity: "Connecting to the agent...",
  timestamp: 0,
  inputExecutionQueue: []
};

function hasMessage(event: AgentEventEnvelope): event is Extract<AgentEventEnvelope, {message: string}> {
  return "message" in event;
}

export function useAgentEventState(agentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<RemoteAgentStatus>(INITIAL_AGENT_STATUS);
  const [position, setPosition] = useState(0);
  const [currentExecutionState, setCurrentExecutionState] = useState<InputExecutionState|null>();

  const stateRef = useRef({
    messages: [] as ChatMessage[],
    position: 0,
    agentStatus: INITIAL_AGENT_STATUS,
    inputExecutions: new Map<string, InputExecutionState>(),
    seenQuestionIds: new Set<string>(),
  });

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      let fromPosition = stateRef.current.position;
      let currentMessages = [...stateRef.current.messages];
      let currentAgentStatus = stateRef.current.agentStatus;
      let inputExecutions = new Map(stateRef.current.inputExecutions);
      let seenQuestionIds = new Set(stateRef.current.seenQuestionIds);

      const appendMessage = (event: ChatMessage) => {
        currentMessages.push(event);
      };

      const mergeStreamingMessage = (event: Extract<AgentEventEnvelope, {type: "output.chat" | "output.reasoning"}>) => {
        const lastIndex = currentMessages.length - 1;
        const lastMessage = currentMessages[lastIndex];
        if (lastMessage && lastMessage.type === event.type && hasMessage(lastMessage)) {
          currentMessages[lastIndex] = { ...lastMessage, message: lastMessage.message + event.message, timestamp: event.timestamp };
          return;
        }
        appendMessage(event);
      };

      const addQuestionPrompts = (requestId: string, interactions: QuestionInteraction[] = []) => {
        for (const interaction of interactions) {
          const key = `${requestId}:${interaction.interactionId}`;
          if (seenQuestionIds.has(key)) continue;

          appendMessage({
            ...interaction,
            requestId,
          });
          seenQuestionIds.add(key);
        }
      };

      while (!abortController.signal.aborted) {
        try {
          for await (const eventsData of agentRPCClient.streamAgentEvents({
            agentId,
            fromPosition,
          }, abortController.signal)) {
            for (const event of eventsData.events) {
              switch (event.type) {
                case "output.chat":
                case "output.reasoning":
                  mergeStreamingMessage(event);
                  break;
                case "agent.created":
                case "agent.stopped":
                case "agent.response":
                case "output.artifact":
                case "output.info":
                case "output.warning":
                case "output.error":
                case "input.received":
                case "input.interaction":
                  appendMessage(event);
                  break;
                case "agent.status":
                  currentAgentStatus = event;
                  setCurrentExecutionState(inputExecutions.get(event.inputExecutionQueue[0]))

                  break;
                case "input.execution":
                  if (event.status === "finished") {
                    inputExecutions.delete(event.requestId);
                  } else {
                    const prevEvent = inputExecutions.get(event.requestId);
                    inputExecutions.set(event.requestId, {
                      ...prevEvent,
                      ...event
                    });
                    addQuestionPrompts(
                      event.requestId,
                      (event.availableInteractions ?? []).filter(
                        (interaction): interaction is QuestionInteraction => interaction.type === "question"
                      )
                    );
                  }
                  break;
                case "cancel":
                  break;
                default: {
                  // noinspection UnnecessaryLocalVariableJS
                  const _exhaustive: never = event;
                  throw new Error(`Unhandled event type: ${(_exhaustive as any).type}`);
                }
              }
            }

            fromPosition = eventsData.position;
            stateRef.current = {
              messages: currentMessages,
              position: eventsData.position,
              agentStatus: currentAgentStatus,
              inputExecutions,
              seenQuestionIds,
            };

            setMessages([...currentMessages]);
            setAgentStatus(currentAgentStatus);
            setPosition(eventsData.position);
          }
        } catch (error) {
          if (abortController.signal.aborted) return;

          console.error("Stream error, retrying...", error);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          fromPosition = stateRef.current.position;
          currentMessages = [...stateRef.current.messages];
          currentAgentStatus = stateRef.current.agentStatus;
          inputExecutions = new Map(stateRef.current.inputExecutions);
          seenQuestionIds = new Set(stateRef.current.seenQuestionIds);
        }
      }
    })();

    return () => abortController.abort();
  }, [agentId]);

  return {
    messages,
    agentStatus,
    position,
    currentExecutionState,
  };
}
