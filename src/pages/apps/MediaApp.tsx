import type {ImageIndexEntry} from "@tokenring-ai/image-generation/rpc/schema";
import {ImageIcon, Loader2, RefreshCw, Search, Sparkles, WandSparkles, X, ZoomIn} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import AgentLauncherBar from '../../components/AgentLauncherBar.tsx';
import ChatPanel from '../../components/chat/ChatPanel.tsx';
import ResizableSplit from '../../components/ui/ResizableSplit.tsx';
import {toastManager} from '../../components/ui/toast.tsx';
import {agentRPCClient, imageGenerationRPCClient, useImageGenerationModels, useImages} from '../../rpc.ts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mediaUrl(filename: string) {
  return `/api/media/${encodeURIComponent(filename)}`;
}

function aspectLabel(width: number, height: number) {
  if (width === height) return 'Square';
  if (width > height) return 'Wide';
  return 'Tall';
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function ImageThumbnail({
  image,
  selected,
  onClick,
}: {
  image: ImageIndexEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none cursor-pointer group aspect-square bg-tertiary ${
        selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:border-white/20'
      }`}
    >
      {!error ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-muted animate-spin"/>
            </div>
          )}
          <img
            src={mediaUrl(image.filename)}
            alt={image.keywords.join(', ') || image.filename}
            className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <ImageIcon className="w-5 h-5 text-muted opacity-40"/>
          <span className="text-2xs text-muted truncate max-w-full px-1">{image.filename}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"/>
      {selected && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 shadow-sm"/>
      )}
    </button>
  );
}

// ─── Image viewer ─────────────────────────────────────────────────────────────

function ImageViewer({
  image,
  onWorkOnImage,
  onClose,
}: {
  image: ImageIndexEntry;
  onWorkOnImage: () => Promise<void>;
  onClose: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={mediaUrl(image.filename)}
            alt={image.keywords.join(', ')}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-primary space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted truncate font-mono">{image.filename}</span>
            <span className="text-2xs text-muted shrink-0">
              {image.width}×{image.height} · {aspectLabel(image.width, image.height)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary transition-colors rounded focus-ring cursor-pointer shrink-0"
          >
            <X className="w-4 h-4"/>
          </button>
        </div>

        {image.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {image.keywords.map(k => (
              <span key={k} className="px-2 py-0.5 bg-tertiary border border-primary rounded-full text-2xs text-muted">
                {k}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => void onWorkOnImage()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer focus-ring shadow-button-primary"
          >
            <Sparkles className="w-3.5 h-3.5"/> Work on this image
          </button>
          <button
            onClick={() => setLightbox(true)}
            className="flex items-center gap-2 px-3 py-2 border border-primary text-sm text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <ZoomIn className="w-3.5 h-3.5"/> Full size
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-primary">
        <img
          src={mediaUrl(image.filename)}
          alt={image.keywords.join(', ')}
          className="max-w-full max-h-full object-contain rounded-xl shadow-lg cursor-zoom-in"
          onClick={() => setLightbox(true)}
        />
      </div>
    </div>
  );
}

// ─── Generate panel ───────────────────────────────────────────────────────────

function GeneratePanel({
  agentId,
  onGenerated,
}: {
  agentId: string | null;
  onGenerated: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'tall' | 'wide'>('square');
  const [generating, setGenerating] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const {data: modelsData} = useImageGenerationModels();

  const availableModels = useMemo(() => {
    if (!modelsData) return [];
    return Object.entries(modelsData.models)
      .filter(([, m]) => m.available)
      .map(([name]) => name);
  }, [modelsData]);

  const selectedModel = model || availableModels[0] || '';

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toastManager.error('Please enter a prompt', {duration: 3000});
      return;
    }
    if (!agentId) {
      toastManager.error('Agent not ready yet', {duration: 3000});
      return;
    }
    setGenerating(true);
    try {
      await imageGenerationRPCClient.generateImage({
        agentId,
        prompt: prompt.trim(),
        model: selectedModel || undefined,
        aspectRatio,
        keywords: prompt.trim().split(/[,\s]+/).filter(Boolean).slice(0, 10),
      });
      toastManager.success('Image generated!', {duration: 3000});
      setPrompt('');
      onGenerated();
    } catch (err: any) {
      toastManager.error(err.message || 'Generation failed', {duration: 5000});
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: { key: string; metaKey: boolean; ctrlKey: boolean }) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleGenerate();
    }
  };

  const aspectOptions: {value: 'square' | 'tall' | 'wide'; label: string; ratio: string}[] = [
    {value: 'square', label: 'Square', ratio: '1:1'},
    {value: 'wide', label: 'Wide', ratio: '3:2'},
    {value: 'tall', label: 'Tall', ratio: '2:3'},
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg mx-auto">
            <WandSparkles className="w-7 h-7 text-white"/>
          </div>
          <h2 className="text-base font-semibold text-primary mt-3">Generate Image</h2>
          <p className="text-sm text-muted">Describe the image you want to create</p>
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-secondary">Prompt</label>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="A serene mountain lake at sunset with reflections..."
            rows={4}
            className="w-full bg-input border border-primary rounded-xl py-2.5 px-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
          />
          <p className="text-2xs text-muted text-right">⌘↵ to generate</p>
        </div>

        {/* Aspect ratio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-secondary">Aspect Ratio</label>
          <div className="flex gap-2">
            {aspectOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAspectRatio(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer focus-ring ${
                  aspectRatio === opt.value
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : 'border-primary text-muted hover:text-primary hover:bg-hover'
                }`}
              >
                <div className={`border-2 rounded-sm ${aspectRatio === opt.value ? 'border-indigo-400' : 'border-current'} ${
                  opt.value === 'square' ? 'w-5 h-5' : opt.value === 'wide' ? 'w-7 h-5' : 'w-5 h-7'
                }`}/>
                <span>{opt.label}</span>
                <span className="text-2xs opacity-60">{opt.ratio}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Model selector */}
        {availableModels.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">Model</label>
            <select
              value={selectedModel}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-input border border-primary rounded-lg py-2 px-3 text-sm text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={() => void handleGenerate()}
          disabled={generating || !agentId || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed focus-ring shadow-button-primary"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin"/> Generating...</>
            : <><WandSparkles className="w-4 h-4"/> Generate Image</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Gallery sidebar ──────────────────────────────────────────────────────────

function GallerySidebar({
  search,
  images,
  loading,
  selectedImage,
  onSearch,
  onSelect,
  onRefresh,
}: {
  search: string;
  images: ImageIndexEntry[];
  loading: boolean;
  selectedImage: ImageIndexEntry | null;
  onSearch: (q: string) => void;
  onSelect: (img: ImageIndexEntry) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Search */}
      <div className="shrink-0 px-3 py-2 border-b border-primary">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"/>
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search images..."
            className="w-full bg-input border border-primary rounded-lg py-1.5 pl-8 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <X className="w-3 h-3"/>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && images.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-muted animate-spin"/>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
            <ImageIcon className="w-8 h-8 text-muted opacity-30"/>
            <p className="text-sm text-muted">
              {search ? `No images matching "${search}"` : 'No images yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map(img => (
              <ImageThumbnail
                key={img.filename}
                image={img}
                selected={selectedImage?.filename === img.filename}
                onClick={() => onSelect(img)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-primary px-3 py-2 flex items-center justify-between">
        <span className="text-2xs text-muted">{images.length} image{images.length !== 1 ? 's' : ''}</span>
        <button
          onClick={onRefresh}
          className="p-1 text-muted hover:text-primary transition-colors cursor-pointer rounded focus-ring"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3"/>
        </button>
      </div>
    </div>
  );
}

// ─── Right panel: viewer or generate ─────────────────────────────────────────

function RightPanel({
  agentId,
  selectedImage,
  onWorkOnImage,
  onClearSelection,
  onGenerated,
}: {
  agentId: string | null;
  selectedImage: ImageIndexEntry | null;
  onWorkOnImage: () => Promise<void>;
  onClearSelection: () => void;
  onGenerated: () => void;
}) {
  if (selectedImage) {
    return (
      <ImageViewer
        image={selectedImage}
        onWorkOnImage={onWorkOnImage}
        onClose={onClearSelection}
      />
    );
  }
  return (
    <GeneratePanel agentId={agentId} onGenerated={onGenerated}/>
  );
}

// ─── Main MediaApp ────────────────────────────────────────────────────────────

export default function MediaApp() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageIndexEntry | null>(null);
  const [search, setSearch] = useState('');

  const imagesData = useImages(search || undefined);

  const images: ImageIndexEntry[] = imagesData.data?.images ?? [];

  // Create a headless agent on mount for image generation operations
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const types = await agentRPCClient.getAgentTypes({});
        if (cancelled) return;
        const preferred =
          types.find(t => ['media', 'image', 'imageGeneration'].includes(t.type)) ??
          types[0];
        if (!preferred) {
          setInitError('No agent types available.');
          return;
        }
        const {id} = await agentRPCClient.createAgent({agentType: preferred.type, headless: true});
        if (!cancelled) setAgentId(id);
      } catch (err: any) {
        if (!cancelled) setInitError(err.message || 'Failed to initialize');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Clean up headless agent on unmount
  useEffect(() => {
    return () => {
      if (agentId) {
        agentRPCClient.deleteAgent({agentId, reason: 'Media app unmounted'}).catch(() => {});
      }
    };
  }, [agentId]);

  const handleWorkOnImage = async () => {
    try {
      const types = await agentRPCClient.getAgentTypes({});
      const preferred =
        types.find(t => ['media', 'image', 'imageGeneration'].includes(t.type)) ??
        types[0];
      if (!preferred) return;
      const {id} = await agentRPCClient.createAgent({agentType: preferred.type, headless: false});
      setChatAgentId(id);
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to open agent', {duration: 4000});
    }
  };

  const handleGenerated = () => {
    void imagesData.mutate();
    setSelectedImage(null);
  };

  if (initError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary gap-4 p-6 text-center">
        <ImageIcon className="w-10 h-10 text-muted opacity-40"/>
        <div>
          <h2 className="text-sm font-semibold text-primary mb-1">Media Unavailable</h2>
          <p className="text-xs text-muted max-w-sm">{initError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg cursor-pointer focus-ring"
        >
          Retry
        </button>
      </div>
    );
  }

  const body = (
    <div className="flex h-full min-h-0">
      {/* Gallery sidebar */}
      <div className="w-64 shrink-0 border-r border-primary flex flex-col min-h-0 bg-secondary">
        <GallerySidebar
          search={search}
          images={images}
          loading={imagesData.isLoading}
          selectedImage={selectedImage}
          onSearch={setSearch}
          onSelect={setSelectedImage}
          onRefresh={() => void imagesData.mutate()}
        />
      </div>
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <RightPanel
          agentId={agentId}
          selectedImage={selectedImage}
          onWorkOnImage={handleWorkOnImage}
          onClearSelection={() => setSelectedImage(null)}
          onGenerated={handleGenerated}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      {/* Header */}
      <div className="shrink-0 h-11 border-b border-primary bg-secondary flex items-center gap-2 px-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm shrink-0">
          <ImageIcon className="w-4 h-4 text-white"/>
        </div>
        <span className="text-sm font-semibold text-primary">Media</span>

        <div className="flex-1"/>

        <div className="w-px h-5 bg-primary/70 mx-0.5 shrink-0" aria-hidden="true"/>
        <AgentLauncherBar
          buttonLabel="Open Agent"
          buttonClassName="bg-indigo-600 hover:bg-indigo-500 text-white shadow-button-primary"
          onLaunch={id => setChatAgentId(id)}
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {chatAgentId ? (
          <ResizableSplit direction="vertical" initialRatio={0.60} minFirst={200} minSecond={120} className="h-full">
            {body}
            <div className="h-full overflow-hidden bg-primary">
              <ChatPanel agentId={chatAgentId}/>
            </div>
          </ResizableSplit>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
