import React, { useState, useMemo, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Folder,
  FileText,
  Search,
  X,
  ChevronRight,
  Code,
  Image as ImageIcon,
  Check,
  Plus,
  Download,
  Edit,
  File,
  Eye,
  EyeOff,
  Trash2, Save
} from 'lucide-react';
import MarkdownEditor from "../editor/MarkdownEditor.tsx";
import CodeEditor from '../editor/CodeEditor.tsx';
import { filesystemRPCClient, useDirectoryListing, useFileContents, useSelectedFiles } from '../../rpc.ts';
import { cn } from '../../lib/utils.ts';
import { toastManager } from '../ui/toast.tsx';

interface FileBrowserOverlayProps {
    agentId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Helper to extract just the filename from a path
const getBasename = (filePath: string): string => {
    const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
    return cleanPath.split('/').pop() || filePath;
};

// Formatting size


export default function FileBrowser({ agentId, isOpen, onClose }: FileBrowserOverlayProps) {
    const [path, setPath] = useState('.');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showHiddenFiles, setShowHiddenFiles] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [previewHeight, setPreviewHeight] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const [editorContent, setEditorContent] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialFocusRef = useRef<HTMLDivElement>(null);

    const directoryListing = useDirectoryListing({ path, showHidden: showHiddenFiles, agentId });
    const selectedFiles = useSelectedFiles(agentId);
    const fileContent = useFileContents(selectedFile, agentId);

    React.useEffect(() => {
        if (isOpen && initialFocusRef.current) {
            initialFocusRef.current.focus();
        }
    }, [isOpen]);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Sort files: directories first, then files, all alphabetically
    const sortedFiles = useMemo(() => {
        if (!directoryListing.data?.files) return [];
        let files = [...directoryListing.data.files];

        if (debouncedSearch) {
            files = files.filter(f => getBasename(f).toLowerCase().includes(debouncedSearch.toLowerCase()));
        }

        return files.sort((a, b) => {
            const isDirA = a.endsWith('/');
            const isDirB = b.endsWith('/');
            if (isDirA && !isDirB) return -1;
            if (!isDirA && isDirB) return 1;
            return a.localeCompare(b);
        });
    }, [directoryListing.data?.files, debouncedSearch]);

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isResizing]);

    if (!isOpen) return null;

    const handleSaveFile = async () => {
        if (!selectedFile) return;
        const fileToSave = selectedFile;
        const contentToSave = editorContent;
        setIsSaving(true);
        try {
            await filesystemRPCClient.writeFile({ path: fileToSave, content: contentToSave, agentId });
            await fileContent.mutate();
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        const container = document.querySelector('.file-browser-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        setPreviewHeight(Math.max(200, Math.min(newHeight, rect.height - 200)));
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const handleFileClick = async (file: string) => {
        const isDir = file.endsWith('/');
        const fullPath = isDir ? file.slice(0, -1) : file;
        try {
            const stat = await filesystemRPCClient.stat({ path: fullPath, agentId });
            const stats = JSON.parse(stat.stats);

            if (stats.isDirectory) {
                setPath(fullPath);
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
            }
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    };



    const handleAddFile = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await filesystemRPCClient.addFileToChat({ agentId, file });
            await selectedFiles.mutate();
            toastManager.success(`Added ${getBasename(file)} to chat`, { duration: 2000 });
        } catch (error) {
            console.error('Failed to add file:', error);
            toastManager.error('Failed to add file to chat', { duration: 3000 });
        }
    };

    const handleRemoveFile = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await filesystemRPCClient.removeFileFromChat({ agentId, file });
            await selectedFiles.mutate();
            toastManager.info(`Removed ${getBasename(file)} from chat`, { duration: 2000 });
        } catch (error) {
            console.error('Failed to remove file:', error);
            toastManager.error('Failed to remove file from chat', { duration: 3000 });
        }
    }

    const handleDownload = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const cleanFile = file.endsWith('/') ? file.slice(0, -1) : file;
        try {
            const result = await filesystemRPCClient.readTextFile({ path: cleanFile, agentId });
            const blob = new Blob([result.content ?? ""], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = cleanFile.split('/').pop() || 'download';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        const fileNames = Array.from(files).map(f => f.name);
        setUploadingFiles(fileNames);

        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE) {
                toastManager.error(`File "${file.name}" is too large. Maximum size is 5MB.`, { duration: 3000 });
                continue;
            }
            try {
                const content = await file.text();
                const targetPath = path === '.' ? file.name : `${path}/${file.name}`;
                await filesystemRPCClient.writeFile({ path: targetPath, content, agentId });
            } catch (error) {
                console.error('Failed to upload file:', error);
                toastManager.error(`Failed to upload "${file.name}"`, { duration: 3000 });
            }
        }

        setUploadingFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await directoryListing.mutate();
    };

    const getFileIcon = (file: string, isDir: boolean, size = 16) => {
        if (isDir) return <Folder className="text-indigo-400" size={size} />;
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
            return <FileText className="text-cyan-500" size={size} />;
        }
        if (file.endsWith('.json')) return <Code className="text-amber-500" size={size} />;
        if (file.endsWith('.md')) return <FileText className="text-purple-400" size={size} />;
        if (file.match(/\.(png|jpe?g|gif|svg|webp)$/i)) return <ImageIcon className="text-purple-400" size={size} />;
        return <FileText className="text-muted" size={size} />;
    };

    const breadcrumbs = path === '.' ? [] : path.split('/');

    return (
        <FocusTrap active={isOpen}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div ref={initialFocusRef} tabIndex={-1} className="w-full max-w-6xl h-[85vh] bg-secondary border border-primary rounded-card shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 relative file-browser-container">

                {/* Window Controls & Header */}
                <div className="h-12 border-b border-primary flex items-center justify-between px-4 bg-secondary shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-muted">
                            <Folder size={16} />
                            <span className="text-xs font-medium tracking-wide">File Browser</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-input border border-primary rounded-md py-1.5 pl-8 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-48 transition-all focus-ring"
                            />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted hover:text-primary transition-colors focus-ring"
                            aria-label="Close file browser"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Browser Body */}
                <div className="flex flex-1 min-h-0">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-primary min-w-0">
                        {/* Breadcrumbs & Toolbar */}
                        <div className="h-10 border-b border-primary flex  px-4 shrink-0 ">
                            <div className="flex flex-1 items-center gap-1 text-xs text-muted min-w-0">
                                <button
                                    className="hover:text-primary cursor-pointer shrink-0 focus-ring rounded px-1"
                                    onClick={() => setPath('.')}
                                    aria-label="Go to root directory"
                                >root</button>
                                {breadcrumbs.length > 3 ? (
                                    <>
                                        <ChevronRight size={10} className="shrink-0" />
                                        <span className="text-dim">...</span>
                                        <ChevronRight size={10} className="shrink-0" />
                                        <button
                                            className="hover:text-primary cursor-pointer truncate focus-ring rounded px-1"
                                            onClick={() => setPath(breadcrumbs.slice(0, -1).join('/'))}
                                            aria-label={`Go to ${breadcrumbs[breadcrumbs.length - 2]}`}
                                        >{breadcrumbs[breadcrumbs.length - 2]}</button>
                                        <ChevronRight size={10} className="shrink-0" />
                                        <span className="text-primary truncate">{breadcrumbs[breadcrumbs.length - 1]}</span>
                                    </>
                                ) : (
                                    breadcrumbs.map((part, i) => (
                                        <React.Fragment key={i}>
                                            <ChevronRight size={10} className="shrink-0" />
                                            <button
                                                className="hover:text-primary cursor-pointer truncate focus-ring rounded px-1"
                                                onClick={() => setPath(breadcrumbs.slice(0, i + 1).join('/'))}
                                                aria-label={`Go to ${part}`}
                                            >{part}</button>
                                        </React.Fragment>
                                    ))
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-button hover:bg-hover text-muted text-2xs transition-colors focus-ring"
                                aria-label={showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
                              >
                                {showHiddenFiles ? <EyeOff size={12} /> : <Eye size={12} />}
                                {showHiddenFiles ? 'Hide' : 'Show'} Hidden
                              </button>
                            </div>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-button hover:bg-hover text-muted text-2xs transition-colors focus-ring"
                              aria-label="Upload files"
                            >
                              <Plus size={12} />
                              Upload
                            </button>
                            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-2xs text-muted font-semibold border-b border-primary">
                                        <th className="pl-2 pr-4 py-2 font-medium w-8">
                                            <div className="w-3 h-3 border border-primary rounded bg-tertiary"></div>
                                        </th>
                                        <th className="px-2 py-2 font-medium">Name</th>
                                        <th className="px-2 py-2 font-medium w-24 hidden sm:table-cell">Size</th>
                                        <th className="px-2 py-2 font-medium w-32 hidden sm:table-cell">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {sortedFiles.map((file, i) => {
                                        const isDir = file.endsWith('/');
                                        const displayName = getBasename(file);
                                        const isSelected = selectedFile === file;
                                        const isInChat = selectedFiles.data?.files.includes(file);

                                        return (
                                            <tr
                                                key={i}
                                                onClick={() => handleFileClick(file)}
                                                className={cn(
                                                    "group transition-colors border-b border-primary cursor-pointer focus-ring",
                                                    isSelected ? "bg-active" : "hover:bg-hover"
                                                )}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`${isDir ? 'Open directory' : 'Select file'} ${displayName}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleFileClick(file);
                                                    }
                                                }}
                                            >
                                                <td className="pl-2 pr-4 py-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            isInChat ? handleRemoveFile(file) : handleAddFile(file);
                                                        }}
                                                        className={cn(
                                                            "w-3 h-3 border rounded flex items-center justify-center transition-all focus-ring",
                                                            isInChat
                                                                ? "border-indigo-500 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                                                : "border-primary hover:border-muted"
                                                        )}
                                                        aria-label={isInChat ? `Remove ${displayName} from chat` : `Add ${displayName} to chat`}
                                                    >
                                                        {isInChat && <Check size={10} className="text-white" />}
                                                    </button>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className={cn(
                                                        "flex items-center gap-2 font-medium",
                                                        isSelected ? "text-indigo-400" : isDir ? "text-primary" : "text-secondary"
                                                    )}>
                                                        {getFileIcon(file, isDir)}
                                                        {displayName}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-muted hidden sm:table-cell">
                                                    {isDir ? '-' : '---'}
                                                </td>
                                                <td className="px-2 py-2 text-muted hidden sm:table-cell">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isDir && (
                                                            <button
                                                                onClick={(e) => handleDownload(file, e)}
                                                                className="p-1 hover:text-primary focus-ring rounded"
                                                                aria-label={`Download ${displayName}`}
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                isInChat ? handleRemoveFile(file) : handleAddFile(file);
                                                            }}
                                                            className={cn(
                                                                "p-1 focus-ring rounded",
                                                                isInChat ? "text-red-400 hover:text-red-300" : "text-indigo-400 hover:text-indigo-300"
                                                            )}
                                                            aria-label={isInChat ? `Remove ${displayName} from chat` : `Add ${displayName} to chat`}
                                                        >
                                                            {isInChat ? <Trash2 size={14} /> : <Plus size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {sortedFiles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-muted text-sm">
                                                No files found in this directory.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer selection info */}
                        <div className="h-9 border-t border-primary bg-tertiary flex items-center justify-between px-4 shrink-0">
                            <span className="text-2xs text-muted">
                                {selectedFiles.data?.files.length ?? 0} items in chat
                            </span>
                        </div>

                        {uploadingFiles.length > 0 && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
                                <div className="bg-secondary border border-primary rounded-button p-4 flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-muted border-t-indigo-500 rounded-full animate-spin" />
                                    <span className="text-sm text-primary">Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar - File Info */}
                    <div className="w-80 bg-tertiary border-l border-primary flex flex-col shrink-0 hidden md:flex">
                        {selectedFile ? (
                            <>
                                <div className="p-4 border-b border-primary flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-button bg-tertiary flex items-center justify-center shrink-0">
                                        {getFileIcon(selectedFile, false, 24)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-primary truncate" title={selectedFile}>{getBasename(selectedFile)}</h3>
                                        <p className="text-2xs text-muted mt-0.5">
                                            {selectedFile.split('.').pop()?.toUpperCase()} File
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="p-4 grid grid-cols-2 gap-2 border-b border-primary">
                                    <button
                                        onClick={() => selectedFiles.data?.files.includes(selectedFile) ? handleRemoveFile(selectedFile) : handleAddFile(selectedFile)}
                                        className={cn(
                                            "col-span-2 flex items-center justify-center gap-2 text-white text-xs font-medium py-2 rounded-button shadow-lg transition-all active:scale-[0.98] focus-ring",
                                            selectedFiles.data?.files.includes(selectedFile)
                                                ? "bg-red-600 hover:bg-red-500 shadow-red-500/20"
                                                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                                        )}
                                        aria-label={selectedFiles.data?.files.includes(selectedFile) ? "Remove from chat" : "Add to chat"}
                                    >
                                        {selectedFiles.data?.files.includes(selectedFile) ? (
                                            <>
                                                <Trash2 size={16} />
                                                Remove from Chat
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={16} />
                                                Add to Chat
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => handleDownload(selectedFile, e)}
                                        className="flex items-center justify-center gap-2 bg-tertiary hover:bg-hover text-secondary text-xs font-medium py-1.5 rounded-button border border-primary transition-colors focus-ring"
                                        aria-label="Download file"
                                    >
                                        <Download size={14} />
                                        Download
                                    </button>
                                    <button className="flex items-center justify-center gap-2 bg-tertiary hover:bg-hover text-secondary text-xs font-medium py-1.5 rounded-button border border-primary transition-colors focus-ring" aria-label="Edit file">
                                        <Edit size={14} />
                                        Edit
                                    </button>
                                </div>

                                {/* Metadata */}
                                <div className="p-3 text-2xs text-muted space-y-1 bg-tertiary">
                                    <div className="flex justify-between">
                                        <span>Path</span>
                                        <span className="text-secondary truncate ml-4" title={selectedFile}>{selectedFile}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Type</span>
                                        <span className="text-secondary">{selectedFile.split('.').pop()}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center">
                                <File size={48} className="mb-4 opacity-10" />
                                <p className="text-xs">Select a file from the explorer to view its contents.</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Bottom Preview Pane */}
                {selectedFile && (
                    <div style={{ height: `${previewHeight}px` }} className="bg-tertiary border-t border-primary flex flex-col shrink-0 relative">
                        <div
                            onMouseDown={handleMouseDown}
                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-indigo-500/50 transition-colors z-10"
                            aria-label="Resize preview pane"
                        />
                        <div className="px-4 py-2 flex items-center justify-between border-b border-primary bg-secondary">
                            <div className="flex items-center gap-2">
                                <span className="text-2xs font-semibold text-muted uppercase tracking-widest">Preview</span>
                                <span className="text-xs text-muted">•</span>
                                <span className="text-xs text-primary font-medium">{getBasename(selectedFile)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveFile}
                                    disabled={isSaving || !editorContent || editorContent === fileContent.data?.content}
                                    className="flex items-center gap-1.5 text-muted hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors focus-ring rounded px-2 py-1"
                                    aria-label="Save file"
                                >
                                    <Save size={14} />
                                    <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-muted hover:text-primary transition-colors focus-ring rounded p-1"
                                    aria-label="Close preview"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar bg-primary relative">
                            {fileContent.data ? (
                                selectedFile.endsWith('.md') ? (
                                    <MarkdownEditor
                                        content={fileContent.data.content ?? ""}
                                        onContentChange={setEditorContent}
                                    />
                                ) : (
                                    <CodeEditor
                                        file={selectedFile}
                                        content={fileContent.data.content ?? ""}
                                        onContentChange={setEditorContent}
                                    />
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted p-4 text-center text-xs">
                                    Loading content...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            </div>
        </FocusTrap>
    );
}
