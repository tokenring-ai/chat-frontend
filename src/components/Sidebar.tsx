import React, { useCallback } from 'react';
import { MessageSquare, FileText } from 'lucide-react';

interface SidebarProps {
  currentPage: 'files' | 'agent';
  onPageChange: (page: 'files' | 'agent') => void;
  isMobile?: boolean;
  isSidebarOpen?: boolean;
}

interface NavItemProps {
  page: 'files' | 'agent';
  icon: any;
  label: string;
  isActive: boolean;
  isMobile: boolean;
  onClick: (page: 'files' | 'agent') => void;
}

// Move NavItem outside to prevent remounting on each parent render
const NavItem = React.memo(({ page, icon: Icon, label, isActive, isMobile, onClick }: NavItemProps) => {
  if (false && isMobile) {
    return (
      <button
        onClick={() => onClick(page)}
        className={`w-[90%] h-12 flex items-center gap-4 px-4 rounded-xl transition-all cursor-pointer ${
          isActive ? 'bg-accent text-inverse shadow-sm' : 'hover:bg-hover text-secondary'
        }`}
      >
        <Icon size={22} />
        <span className="text-base font-semibold">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(page)}
      className={`flex flex-row p-2 gap-2 md:flex-col items-center justify-center rounded-xl transition-all cursor-pointer min-w
       ${ isActive
        ? 'sm:bg-accent sm:text-inverse sm:shadow-sm text-accent'
        : 'hover:bg-hover text-secondary'}
      `}
      title={label}
    >
      <Icon size={20} />
      <span className="text-xs mt-0.5 uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
});

function Sidebar({ currentPage, onPageChange, isMobile = false, isSidebarOpen = false }: SidebarProps) {
  const handlePageChange = useCallback((page: 'files' | 'agent') => {
    onPageChange(page);
  }, [onPageChange]);

  return (
    <div className={`flex flex-col items-center p-4 gap-2 w-full ${isMobile ? 'h-full bg-sidebar' : ''}`}>
      <NavItem 
        page="agent" 
        icon={MessageSquare} 
        label="Agent" 
        isActive={currentPage === 'agent'}
        isMobile={isMobile}
        onClick={handlePageChange}
      />
      <NavItem 
        page="files" 
        icon={FileText} 
        label="Files" 
        isActive={currentPage === 'files'}
        isMobile={isMobile}
        onClick={handlePageChange}
      />
    </div>
  );
}

export default React.memo(Sidebar);
