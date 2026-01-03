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
  if (isMobile) {
    return (
      <button
        onClick={() => onClick(page)}
        className={`w-[90%] h-12 flex items-center gap-4 px-4 rounded-lg transition-colors cursor-pointer ${
          isActive ? 'bg-active text-accent' : 'hover:bg-hover text-secondary'
        }`}
      >
        <Icon size={24} />
        <span className="text-base font-medium">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(page)}
      className={`w-12 h-12 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
        isActive ? 'bg-active text-accent' : 'hover:bg-hover text-secondary'
      }`}
      title={label}
    >
      <Icon size={20} />
      <span className="text-[10px] mt-1 uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
});

function Sidebar({ currentPage, onPageChange, isMobile = false, isSidebarOpen = false }: SidebarProps) {
  const handlePageChange = useCallback((page: 'files' | 'agent') => {
    onPageChange(page);
  }, [onPageChange]);

  return (
    <div className={`flex flex-col items-center py-4 gap-2 w-full ${isMobile ? 'h-full bg-sidebar' : ''}`}>
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
