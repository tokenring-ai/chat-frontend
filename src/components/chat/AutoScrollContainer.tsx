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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    console.log('[handleScroll]', { scrollTop, scrollHeight, clientHeight, atBottom, diff: scrollHeight - scrollTop - clientHeight });
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  };

  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const contentHeight = contentRef.current?.scrollHeight;
      const shouldScroll = isAtBottomRef.current;
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
  }, [contentRef.current]);

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
        className={`flex-1 overflow-y-auto p-0 flex flex-col font-mono text-sm relative scroll-smooth bg-[#050505] h-full ${className}`}
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
            className="absolute right-4 bottom-4 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors z-20 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
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
