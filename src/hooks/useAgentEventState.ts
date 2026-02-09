import {AgentEventEnvelope} from "@tokenring-ai/agent/AgentEvents";
import { useState, useEffect, useRef } from 'react';
import { agentRPCClient } from '../rpc.ts';
export function useAgentEventState(agentId: string) {
  const [messages, setMessages] = useState<AgentEventEnvelope[]>([]);
  const [position, setPosition] = useState(0);
  const stateRef = useRef({ messages: [] as AgentEventEnvelope[], position: 0 });

  useEffect(() => {
    stateRef.current = { messages, position };
  }, [messages, position]);

  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      let fromPosition = stateRef.current.position;
      let currentMessages = [...stateRef.current.messages];

      function mergeMessage(msg: AgentEventEnvelope) {
        const last = currentMessages[currentMessages.length - 1];
        if ("message" in msg && last?.type === msg.type) {
          last.message += msg.message;
          last.timestamp = msg.timestamp;
        } else {
          currentMessages.push(msg);
        }
      }

      while (!abortController.signal.aborted) {
        try {
          for await (const eventsData of agentRPCClient.streamAgentEvents({
            agentId,
            fromPosition,
          }, abortController.signal)) {
            
            let messagesChanged = false;
            
            for (const event of eventsData.events) {
              switch (event.type) {
                case 'output.chat':
                case 'output.reasoning':
                  mergeMessage(event);
                  messagesChanged = true;
                  break;
                case 'input.received':
                case 'output.artifact':
                case 'agent.created':
                case 'agent.stopped':
                case 'output.info':
                case 'output.warning':
                case 'output.error':
                case 'question.request':
                case 'question.response':
                case 'reset':
                case 'abort':
                  currentMessages.push(event)
                  messagesChanged = true;
                  break;
                case 'input.handled':
                  if (event.status === 'error') {
                    mergeMessage({
                      type: 'output.error',
                      message: event.message + "\n",
                      timestamp: event.timestamp
                    });
                  } else if (event.status === 'cancelled') {
                    mergeMessage({
                      type: 'output.info',
                      message: event.message + "\n",
                      timestamp: event.timestamp
                    });
                  } else {
                    currentMessages.push(event);
                  }
                  messagesChanged = true;
                  break;
              }
            }

            fromPosition = eventsData.position;

            if (messagesChanged) {
              setMessages([...currentMessages]);
            }
            setPosition(eventsData.position);
          }
        } catch (e) {
          if (!abortController.signal.aborted) {
            console.error("Stream error, retrying...", e);
            await new Promise(resolve => setTimeout(resolve, 1000));
            fromPosition = stateRef.current.position;
            currentMessages = [...stateRef.current.messages];
          }
        }
      }
    })();

    return () => abortController.abort();
  }, [agentId]);

  return { messages, position };
}
