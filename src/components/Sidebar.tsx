import { MessageSquare, FileText } from 'lucide-react';

interface SidebarProps {
  currentPage: 'files' | 'agent';
  onPageChange: (page: 'files' | 'agent') => void;
  isMobile?: boolean;
  isSidebarOpen?: boolean;
}

export default function Sidebar({ currentPage, onPageChange, isMobile = false, isSidebarOpen = false }: SidebarProps) {
  const NavItem = ({ page, icon: Icon, label }: { page: 'files' | 'agent', icon: any, label: string }) => {
    const isActive = currentPage === page;
    
    if (isMobile) {
      return (
        <button
          onClick={() => onPageChange(page)}
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
        onClick={() => onPageChange(page)}
        className={`w-12 h-12 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
          isActive ? 'bg-active text-accent' : 'hover:bg-hover text-secondary'
        }`}
        title={label}
      >
        <Icon size={20} />
        <span className="text-[10px] mt-1 uppercase font-bold tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <div className={`flex flex-col items-center py-4 gap-2 w-full ${isMobile ? 'h-full bg-sidebar' : ''}`}>
      <NavItem page="agent" icon={MessageSquare} label="Agent" />
      <NavItem page="files" icon={FileText} label="Files" />
    </div>
  );
}
