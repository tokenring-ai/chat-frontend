import type {ParsedInteraction} from "@tokenring-ai/agent/AgentEvents";
import { AnimatePresence, motion } from 'framer-motion';
import type {QuestionInteraction, QuestionPromptMessage} from '../../types/agent-events.ts';
import InlineQuestion from '../question/InlineQuestion.tsx';

interface PendingQuestionsProps {
  requestId: string;
  interactions: ParsedInteraction[];
  agentId: string;
}

export default function AvailableInteractions({ requestId, interactions, agentId }: PendingQuestionsProps) {
  if (interactions.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-primary bg-secondary">
      <AnimatePresence mode="sync">
        {interactions.filter((interaction) => interaction.type === 'question').map((question: QuestionInteraction) => (
          <motion.div
            key={question.interactionId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InlineQuestion
              requestId={requestId}
              request={question}
              agentId={agentId}
              response={undefined}
              autoScroll={false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
