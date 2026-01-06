import { useState, useEffect, useRef } from 'react';
import { agentRPCClient } from '../rpc.ts';

type Message = {
  type: 'output.chat' | 'output.reasoning' | 'output.info' | 'output.warning' | 'output.error' | 'input.received' | 'output.artifact';
  message?: string;
  name?: string;
  mimeType?: string;
  body?: string;
};

export function useAgentEventState(agentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [position, setPosition] = useState(0);
  const stateRef = useRef({ messages: [] as Message[], position: 0 });

  useEffect(() => {
    stateRef.current = { messages, position };
  }, [messages, position]);

  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      let fromPosition = stateRef.current.position;
      let currentMessages = [...stateRef.current.messages];

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
                case 'output.info':
                case 'output.warning':
                case 'output.error':
                  const last = currentMessages[currentMessages.length - 1];
                  if (last?.type === event.type) {
                    last.message += event.message;
                  } else {
                    currentMessages.push({type: event.type, message: event.message});
                  }
                  messagesChanged = true;
                  break;
                case 'input.received':
                  currentMessages.push({type: event.type, message: event.message});
                  messagesChanged = true;
                  break;
                case 'output.artifact':
                  currentMessages.push({
                    type: event.type,
                    name: event.name,
                    mimeType: event.mimeType,
                    body: event.body
                  });
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
