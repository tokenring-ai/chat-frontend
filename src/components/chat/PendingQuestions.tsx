import { AnimatePresence, motion } from 'framer-motion';
import InlineQuestion from '../question/InlineQuestion.tsx';
import type { QuestionPromptMessage } from '../../types/agent-events.ts';

interface PendingQuestionsProps {
  questions: QuestionPromptMessage[];
  agentId: string;
}

export default function PendingQuestions({ questions, agentId }: PendingQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-primary bg-secondary/50 dark:bg-secondary/30">
      <div className="px-4 py-2 border-b border-primary">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span>Active Questions ({questions.length})</span>
        </div>
      </div>
      <AnimatePresence mode="sync">
        {questions.map((question) => (
          <motion.div
            key={question.interactionId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-b border-primary last:border-b-0"
          >
            <InlineQuestion
              request={question}
              agentId={agentId}
              requestId={question.requestId}
              response={undefined}
              autoScroll={false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
