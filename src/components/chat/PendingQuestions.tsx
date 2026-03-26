import {AnimatePresence, motion} from 'framer-motion';
import {useEffect, useState} from 'react';
import type {QuestionPromptMessage} from '../../types/agent-events.ts';
import InlineQuestion from '../question/InlineQuestion.tsx';

interface PendingQuestionsProps {
  questions: QuestionPromptMessage[];
  agentId: string;
}

export default function PendingQuestions({ questions, agentId }: PendingQuestionsProps) {
  if (questions.length === 0) return null;

  const hasPendingAutoSubmit = (autoSubmitAt?: number) =>
    autoSubmitAt !== undefined && autoSubmitAt > Date.now();

  // Check if any question has an upcoming auto-submit
  const hasAutoSubmit = questions.some((q) => hasPendingAutoSubmit(q.autoSubmitAt));
  const urgentCount = questions.filter((q) => hasPendingAutoSubmit(q.autoSubmitAt)).length;

  // Calculate time until earliest auto-submit
  const urgentQuestions = questions.filter((q) => hasPendingAutoSubmit(q.autoSubmitAt));
  const earliestAutoSubmit = urgentQuestions.length > 0
    ? Math.min(...urgentQuestions.map((q) => q.autoSubmitAt!))
    : null;

  // State for countdown timer
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!earliestAutoSubmit) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      if (!earliestAutoSubmit) {
        setTimeRemaining(null);
        return;
      }

      const remaining = Math.max(0, Math.ceil((earliestAutoSubmit - Date.now()) / 1000));

      if (remaining <= 0) {
        setTimeRemaining(null);
        return;
      }

      // Format as mm:ss or just seconds if less than a minute
      if (remaining < 60) {
        setTimeRemaining(`${remaining}s`);
      } else {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [earliestAutoSubmit]);

  return (
    <div className="shrink-0 border-t border-primary bg-secondary/50 dark:bg-secondary/30">
      <div className="px-4 py-2 border-b border-primary">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span>Active Questions ({questions.length})</span>
          {hasAutoSubmit && (
            <span
              className="ml-auto flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
              {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
              {timeRemaining && (
                <span className="ml-1 text-[9px] font-bold bg-red-200 dark:bg-red-800/50 px-1.5 py-0.5 rounded">
                  {timeRemaining}
                </span>
              )}
            </span>
          )}
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
              isUrgent={hasPendingAutoSubmit(question.autoSubmitAt)}
              urgencyLevel={
                question.autoSubmitAt && question.autoSubmitAt > Date.now()
                  ? Math.ceil((question.autoSubmitAt - Date.now()) / 1000)
                  : null
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
