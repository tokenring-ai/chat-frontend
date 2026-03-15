import { ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface AutoScrollContainerProps {
  children: ReactNode;
  className?: string;
}

export default function AutoScrollContainer({ children, className = '' }: AutoScrollContainerProps) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const hasInitializedRef = useRef(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  };

  // Auto-scroll to bottom on mount if there's content
  useEffect(() => {
    if (!hasInitializedRef.current && scrollRef.current && contentRef.current) {
      // Wait for content to be rendered
      const timer = setTimeout(() => {
        if (scrollRef.current && contentRef.current) {
          const { scrollHeight } = scrollRef.current;
          isAtBottomRef.current = true;
          scrollRef.current.scrollTo({
            top: scrollHeight,
            behavior: 'instant'
          });
          setShowScrollButton(false);
          hasInitializedRef.current = true;
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottomRef.current && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'instant'
        });
      }
    });

    resizeObserver.observe(contentRef.current);
    
    const mutationObserver = new MutationObserver(() => {
      if (isAtBottomRef.current && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'instant'
        });
      }
    });

    mutationObserver.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    isAtBottomRef.current = true;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setShowScrollButton(false);
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-0 flex flex-col font-mono text-sm relative scroll-smooth bg-primary h-full ${className}`}
      >
        <div ref={contentRef} className="flex flex-col min-h-full pb-4">
          {children}
        </div>
      </main>
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute right-4 bottom-4 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors z-20 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            title="Scroll to bottom"
            aria-label="Scroll to bottom of chat"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
