interface SidebarProps {
  currentPage: 'files' | 'agent';
  onPageChange: (page: 'files' | 'agent') => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="w-16 bg-sidebar flex flex-col items-center py-2 gap-2">
      <button
        onClick={() => onPageChange('agent')}
        className={`w-12 h-12 m-1 p-1 flex flex-col items-center justify-center rounded transition-colors cursor-pointer ${
          currentPage === 'agent' ? 'bg-active' : 'hover:bg-hover'
        }`}
        title="Agent"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
        <span className="text-[10px] text-secondary mt-0.5">Agent</span>
      </button>
      <button
        onClick={() => onPageChange('files')}
        className={`w-12 h-12 m-1 p-1 flex flex-col items-center justify-center rounded transition-colors cursor-pointer ${
          currentPage === 'files' ? 'bg-active' : 'hover:bg-hover'
        }`}
        title="Files"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <span className="text-[10px] text-secondary mt-0.5">Files</span>
      </button>

    </div>
  );
}
