import type { AudioIndexEntry } from "@tokenring-ai/audio/rpc/schema";
import type { ImageIndexEntry } from "@tokenring-ai/image/rpc/schema";
import type { VideoIndexEntry } from "@tokenring-ai/video/rpc/schema";
import {
  FileMusic,
  ImageIcon,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Type,
  Video as VideoIcon,
  WandSparkles,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AgentLauncherBar from "../../components/AgentLauncherBar.tsx";
import ChatPanel from "../../components/chat/ChatPanel.tsx";
import FilterTabs, { type FilterTabOption } from "../../components/ui/FilterTabs.tsx";
import ResizableSplit from "../../components/ui/ResizableSplit.tsx";
import { toastManager } from "../../components/ui/toast.tsx";
import {
  agentRPCClient,
  audioRPCClient,
  imageGenerationRPCClient,
  useAudios,
  useImageGenerationModels,
  useImages,
  useSpeechModels,
  useVideoGenerationModels,
  useVideos,
  videoGenerationRPCClient,
} from "../../rpc.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaKind = "image" | "video" | "audio";
type MediaEntry = ImageIndexEntry | VideoIndexEntry | AudioIndexEntry;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mediaUrl(filename: string) {
  return `/api/media/${encodeURIComponent(filename)}`;
}

function aspectLabel(width: number, height: number) {
  if (width === height) return "Square";
  if (width > height) return "Wide";
  return "Tall";
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function ImageThumbnail({ image, selected, onClick }: { image: ImageIndexEntry; selected: boolean; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none cursor-pointer group aspect-square bg-tertiary ${
        selected ? "border-indigo-500 shadow-lg shadow-indigo-500/20" : "border-transparent hover:border-white/20"
      }`}
    >
      {!error ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-muted animate-spin" />
            </div>
          )}
          <img
            src={mediaUrl(image.filename)}
            alt={image.keywords.join(", ") || image.filename}
            className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <ImageIcon className="w-5 h-5 text-muted opacity-40" />
          <span className="text-2xs text-muted truncate max-w-full px-1">{image.filename}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      {selected && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 shadow-sm" />}
    </button>
  );
}

// ─── Video thumbnail ──────────────────────────────────────────────────────────

function VideoThumbnail({ video, selected, onClick }: { video: VideoIndexEntry; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none cursor-pointer group aspect-square bg-tertiary ${
        selected ? "border-indigo-500 shadow-lg shadow-indigo-500/20" : "border-transparent hover:border-white/20"
      }`}
    >
      <video src={mediaUrl(video.filename)} className="w-full h-full object-cover" muted preload="metadata" playsInline />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center">
        <VideoIcon className="w-6 h-6 text-white/80 drop-shadow-md" />
      </div>
      {video.duration !== undefined && (
        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 text-white text-2xs rounded font-mono">{formatDuration(video.duration)}</span>
      )}
      {selected && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 shadow-sm" />}
    </button>
  );
}

// ─── Audio thumbnail ──────────────────────────────────────────────────────────

function AudioThumbnail({ audio, selected, onClick }: { audio: AudioIndexEntry; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none cursor-pointer group aspect-square ${
        selected ? "border-indigo-500 shadow-lg shadow-indigo-500/20 bg-indigo-500/10" : "border-transparent hover:border-white/20 bg-tertiary"
      }`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
        <Music className={`w-7 h-7 ${selected ? "text-indigo-400" : "text-muted opacity-60"}`} />
        <span className="text-2xs text-muted truncate max-w-full px-1 font-mono">{audio.filename}</span>
        {audio.duration !== undefined && <span className="text-2xs text-muted opacity-70">{formatDuration(audio.duration)}</span>}
      </div>
      {selected && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 shadow-sm" />}
    </button>
  );
}

// ─── Image viewer ─────────────────────────────────────────────────────────────

function ImageViewer({ image, onWorkOnImage, onClose }: { image: ImageIndexEntry; onWorkOnImage: () => Promise<void>; onClose: () => void }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img
            src={mediaUrl(image.filename)}
            alt={image.keywords.join(", ")}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <ViewerHeader
        title={image.filename}
        subtitle={`${image.width}×${image.height} · ${aspectLabel(image.width, image.height)}`}
        keywords={image.keywords}
        onClose={onClose}
        actions={
          <>
            <ActionButton onClick={() => void onWorkOnImage()} primary icon={<Sparkles className="w-3.5 h-3.5" />}>
              Work on this image
            </ActionButton>
            <ActionButton onClick={() => setLightbox(true)} icon={<ZoomIn className="w-3.5 h-3.5" />}>
              Full size
            </ActionButton>
          </>
        }
      />

      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-primary">
        <img
          src={mediaUrl(image.filename)}
          alt={image.keywords.join(", ")}
          className="max-w-full max-h-full object-contain rounded-xl shadow-lg cursor-zoom-in"
          onClick={() => setLightbox(true)}
        />
      </div>
    </div>
  );
}

// ─── Video viewer ─────────────────────────────────────────────────────────────

function VideoViewer({ video, onWorkOnVideo, onClose }: { video: VideoIndexEntry; onWorkOnVideo: () => Promise<void>; onClose: () => void }) {
  const subtitleParts: string[] = [];
  if (video.width && video.height) subtitleParts.push(`${video.width}×${video.height}`);
  if (video.duration !== undefined) subtitleParts.push(formatDuration(video.duration));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ViewerHeader
        title={video.filename}
        subtitle={subtitleParts.join(" · ")}
        keywords={video.keywords}
        onClose={onClose}
        actions={
          <ActionButton onClick={() => void onWorkOnVideo()} primary icon={<Sparkles className="w-3.5 h-3.5" />}>
            Work on this video
          </ActionButton>
        }
      />
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-primary">
        <video src={mediaUrl(video.filename)} className="max-w-full max-h-full rounded-xl shadow-lg" controls playsInline />
      </div>
    </div>
  );
}

// ─── Audio viewer ─────────────────────────────────────────────────────────────

function AudioViewer({
  audio,
  agentId,
  onWorkOnAudio,
  onClose,
}: {
  audio: AudioIndexEntry;
  agentId: string | null;
  onWorkOnAudio: () => Promise<void>;
  onClose: () => void;
}) {
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const subtitleParts: string[] = [];
  if (audio.duration !== undefined) subtitleParts.push(formatDuration(audio.duration));
  if (audio.sampleRate) subtitleParts.push(`${(audio.sampleRate / 1000).toFixed(1)} kHz`);
  if (audio.channels) subtitleParts.push(audio.channels === 1 ? "mono" : audio.channels === 2 ? "stereo" : `${audio.channels}ch`);

  const handleTranscribe = async () => {
    if (!agentId) {
      toastManager.error("Agent not ready", { duration: 3000 });
      return;
    }
    setTranscribing(true);
    try {
      const result = await audioRPCClient.transcribeAudio({ agentId, filename: audio.filename });
      if (result.status === "success") {
        setTranscript(result.text);
      } else {
        toastManager.error("Agent not found", { duration: 4000 });
      }
    } catch (err: any) {
      toastManager.error(err.message || "Transcription failed", { duration: 5000 });
    } finally {
      setTranscribing(false);
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ViewerHeader
        title={audio.filename}
        subtitle={subtitleParts.join(" · ")}
        keywords={audio.keywords}
        onClose={onClose}
        actions={
          <>
            <ActionButton onClick={() => void onWorkOnAudio()} primary icon={<Sparkles className="w-3.5 h-3.5" />}>
              Work on this audio
            </ActionButton>
            <ActionButton onClick={() => void handleTranscribe()} disabled={transcribing} icon={transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}>
              {transcribing ? "Transcribing..." : "Transcribe"}
            </ActionButton>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 bg-primary flex flex-col items-center justify-start gap-6">
        <div className="w-full max-w-xl bg-tertiary rounded-2xl p-6 flex flex-col items-center gap-4 shadow-lg">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Music className="w-10 h-10 text-white" />
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full transition-colors cursor-pointer shadow-button-primary"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playing ? "Pause" : "Play"}
          </button>
          <audio
            ref={audioRef}
            src={mediaUrl(audio.filename)}
            controls
            className="w-full"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          {audio.prompt && (
            <div className="w-full">
              <p className="text-2xs font-medium text-muted uppercase tracking-wide mb-1">Prompt</p>
              <p className="text-sm text-secondary italic">{audio.prompt}</p>
            </div>
          )}
        </div>

        {transcript !== null && (
          <div className="w-full max-w-xl bg-tertiary rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xs font-medium text-muted uppercase tracking-wide">Transcript</p>
              <button type="button" onClick={() => setTranscript(null)} className="text-muted hover:text-primary transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Viewer chrome ────────────────────────────────────────────────────────────

function ViewerHeader({
  title,
  subtitle,
  keywords,
  actions,
  onClose,
}: {
  title: string;
  subtitle?: string;
  keywords?: string[];
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="shrink-0 px-5 pt-5 pb-4 border-b border-primary space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted truncate font-mono">{title}</span>
          {subtitle && <span className="text-2xs text-muted shrink-0">{subtitle}</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted hover:text-primary transition-colors rounded focus-ring cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {keywords && keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map(k => (
            <span key={k} className="px-2 py-0.5 bg-tertiary border border-primary rounded-full text-2xs text-muted">
              {k}
            </span>
          ))}
        </div>
      )}

      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const cls = primary
    ? "flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed focus-ring shadow-button-primary"
    : "flex items-center gap-2 px-3 py-2 border border-primary text-sm text-secondary hover:text-primary hover:bg-hover disabled:opacity-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed focus-ring";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {icon}
      {children}
    </button>
  );
}

// ─── Generate panels ──────────────────────────────────────────────────────────

function ImageGeneratePanel({ agentId, onGenerated }: { agentId: string | null; onGenerated: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"square" | "tall" | "wide">("square");
  const [generating, setGenerating] = useState(false);
  const { data: modelsData } = useImageGenerationModels();

  const availableModels = useMemo(() => {
    if (!modelsData) return [];
    return Object.entries(modelsData.models)
      .filter(([, m]) => m.available)
      .map(([name]) => name);
  }, [modelsData]);

  const selectedModel = model || availableModels[0] || "";

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toastManager.error("Please enter a prompt", { duration: 3000 });
      return;
    }
    if (!agentId) {
      toastManager.error("Agent not ready yet", { duration: 3000 });
      return;
    }
    setGenerating(true);
    try {
      await imageGenerationRPCClient.generateImage({
        agentId,
        prompt: prompt.trim(),
        ...(selectedModel && { model: selectedModel }),
        aspectRatio,
        keywords: prompt
          .trim()
          .split(/[,\s]+/)
          .filter(Boolean)
          .slice(0, 10),
      });
      toastManager.success("Image generated!", { duration: 3000 });
      setPrompt("");
      onGenerated();
    } catch (err: any) {
      toastManager.error(err.message || "Generation failed", { duration: 5000 });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
  };

  return (
    <GeneratePanelShell
      title="Generate Image"
      subtitle="Describe the image you want to create"
      icon={<WandSparkles className="w-7 h-7 text-white" />}
      gradient="from-pink-500 to-rose-600"
    >
      <PromptField value={prompt} onChange={setPrompt} onKeyDown={handleKeyDown} placeholder="A serene mountain lake at sunset with reflections..." />
      <AspectRatioField value={aspectRatio} onChange={setAspectRatio} />
      <ModelSelectField label="Model" value={selectedModel} onChange={setModel} options={availableModels} />
      <GenerateButton onClick={() => void handleGenerate()} disabled={generating || !agentId || !prompt.trim()} loading={generating}>
        Generate Image
      </GenerateButton>
    </GeneratePanelShell>
  );
}

function VideoGeneratePanel({ agentId, onGenerated }: { agentId: string | null; onGenerated: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"square" | "tall" | "wide">("wide");
  const [duration, setDuration] = useState<number>(5);
  const [generating, setGenerating] = useState(false);
  const { data: modelsData } = useVideoGenerationModels();

  const availableModels = useMemo(() => {
    if (!modelsData) return [];
    return Object.entries(modelsData.models)
      .filter(([, m]) => m.available)
      .map(([name]) => name);
  }, [modelsData]);

  const selectedModel = model || availableModels[0] || "";

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toastManager.error("Please enter a prompt", { duration: 3000 });
      return;
    }
    if (!agentId) {
      toastManager.error("Agent not ready yet", { duration: 3000 });
      return;
    }
    setGenerating(true);
    try {
      await videoGenerationRPCClient.generateVideo({
        agentId,
        prompt: prompt.trim(),
        ...(selectedModel && { model: selectedModel }),
        aspectRatio,
        ...(duration > 0 && { duration }),
        keywords: prompt
          .trim()
          .split(/[,\s]+/)
          .filter(Boolean)
          .slice(0, 10),
      });
      toastManager.success("Video generated!", { duration: 3000 });
      setPrompt("");
      onGenerated();
    } catch (err: any) {
      toastManager.error(err.message || "Generation failed", { duration: 5000 });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
  };

  return (
    <GeneratePanelShell
      title="Generate Video"
      subtitle="Describe the video clip you want to create"
      icon={<VideoIcon className="w-7 h-7 text-white" />}
      gradient="from-purple-500 to-indigo-600"
    >
      <PromptField value={prompt} onChange={setPrompt} onKeyDown={handleKeyDown} placeholder="A drone shot flying over a misty forest at dawn..." />
      <AspectRatioField value={aspectRatio} onChange={setAspectRatio} />
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-secondary">Duration (seconds)</label>
        <input
          type="number"
          min={1}
          max={60}
          value={duration}
          onChange={e => setDuration(Number(e.target.value) || 0)}
          className="w-full bg-input border border-primary rounded-lg py-2 px-3 text-sm text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
      </div>
      <ModelSelectField label="Model" value={selectedModel} onChange={setModel} options={availableModels} />
      <GenerateButton onClick={() => void handleGenerate()} disabled={generating || !agentId || !prompt.trim()} loading={generating}>
        Generate Video
      </GenerateButton>
    </GeneratePanelShell>
  );
}

function SpeechGeneratePanel({ agentId, onGenerated }: { agentId: string | null; onGenerated: () => void }) {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState<number>(1);
  const [model, setModel] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { data: modelsData } = useSpeechModels();

  const availableModels = useMemo(() => {
    if (!modelsData) return [];
    return Object.entries(modelsData.models)
      .filter(([, m]) => m.available)
      .map(([name]) => name);
  }, [modelsData]);

  const selectedModel = model || availableModels[0] || "";

  const handleGenerate = async () => {
    if (!text.trim()) {
      toastManager.error("Please enter some text", { duration: 3000 });
      return;
    }
    if (!agentId) {
      toastManager.error("Agent not ready yet", { duration: 3000 });
      return;
    }
    setGenerating(true);
    try {
      const result = await audioRPCClient.generateSpeech({
        agentId,
        text: text.trim(),
        ...(voice && { voice }),
        ...(speed > 0 && { speed }),
        ...(selectedModel && { model: selectedModel }),
        keywords: text
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 10),
      });
      if (result.status === "success") {
        toastManager.success("Speech generated!", { duration: 3000 });
        setText("");
        onGenerated();
      } else {
        toastManager.error("Agent not found", { duration: 4000 });
      }
    } catch (err: any) {
      toastManager.error(err.message || "Generation failed", { duration: 5000 });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
  };

  return (
    <GeneratePanelShell
      title="Generate Speech"
      subtitle="Convert text to spoken audio"
      icon={<Mic className="w-7 h-7 text-white" />}
      gradient="from-emerald-500 to-teal-600"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-secondary">Text</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hello, welcome to the TokenRing media studio..."
          rows={5}
          className="w-full bg-input border border-primary rounded-xl py-2.5 px-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
        />
        <p className="text-2xs text-muted text-right">⌘↵ to generate</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-secondary">Voice</label>
          <input
            type="text"
            value={voice}
            onChange={e => setVoice(e.target.value)}
            placeholder="alloy"
            className="w-full bg-input border border-primary rounded-lg py-2 px-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-secondary">Speed</label>
          <input
            type="number"
            step={0.1}
            min={0.25}
            max={4}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value) || 1)}
            className="w-full bg-input border border-primary rounded-lg py-2 px-3 text-sm text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>
      <ModelSelectField label="Model" value={selectedModel} onChange={setModel} options={availableModels} />
      <GenerateButton onClick={() => void handleGenerate()} disabled={generating || !agentId || !text.trim()} loading={generating}>
        Generate Speech
      </GenerateButton>
    </GeneratePanelShell>
  );
}

// ─── Generate panel shared parts ──────────────────────────────────────────────

function GeneratePanelShell({
  title,
  subtitle,
  icon,
  gradient,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-start py-8 px-6">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1">
          <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-lg mx-auto`}>{icon}</div>
          <h2 className="text-base font-semibold text-primary mt-3">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function PromptField({
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-secondary">Prompt</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-input border border-primary rounded-xl py-2.5 px-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
      />
      <p className="text-2xs text-muted text-right">⌘↵ to generate</p>
    </div>
  );
}

function AspectRatioField({ value, onChange }: { value: "square" | "tall" | "wide"; onChange: (v: "square" | "tall" | "wide") => void }) {
  const options: { value: "square" | "tall" | "wide"; label: string; ratio: string }[] = [
    { value: "square", label: "Square", ratio: "1:1" },
    { value: "wide", label: "Wide", ratio: "16:9" },
    { value: "tall", label: "Tall", ratio: "9:16" },
  ];
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-secondary">Aspect Ratio</label>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer focus-ring ${
              value === opt.value ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-primary text-muted hover:text-primary hover:bg-hover"
            }`}
          >
            <div
              className={`border-2 rounded-sm ${value === opt.value ? "border-indigo-400" : "border-current"} ${
                opt.value === "square" ? "w-5 h-5" : opt.value === "wide" ? "w-7 h-5" : "w-5 h-7"
              }`}
            />
            <span>{opt.label}</span>
            <span className="text-2xs opacity-60">{opt.ratio}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const isEmpty = options.length === 0;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-secondary">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isEmpty}
        className="w-full bg-input border border-primary rounded-lg py-2 px-3 text-sm text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isEmpty ? (
          <option value="">No models available</option>
        ) : (
          options.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function GenerateButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-3 bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed focus-ring shadow-button-primary"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Generating...
        </>
      ) : (
        <>
          <WandSparkles className="w-4 h-4" /> {children}
        </>
      )}
    </button>
  );
}

// ─── Gallery sidebar ──────────────────────────────────────────────────────────

function GallerySidebar({
  kind,
  search,
  loading,
  selectedFilename,
  images,
  videos,
  audios,
  onSearch,
  onSelect,
  onRefresh,
}: {
  kind: MediaKind;
  search: string;
  loading: boolean;
  selectedFilename: string | null;
  images: ImageIndexEntry[];
  videos: VideoIndexEntry[];
  audios: AudioIndexEntry[];
  onSearch: (q: string) => void;
  onSelect: (entry: MediaEntry) => void;
  onRefresh: () => void;
}) {
  const entries: MediaEntry[] = kind === "image" ? images : kind === "video" ? videos : audios;
  const EmptyIcon = kind === "image" ? ImageIcon : kind === "video" ? VideoIcon : FileMusic;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-3 py-2 border-b border-primary">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={`Search ${kind}s...`}
            className="w-full bg-input border border-primary rounded-lg py-1.5 pl-8 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && entries.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-muted animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
            <EmptyIcon className="w-8 h-8 text-muted opacity-30" />
            <p className="text-sm text-muted">{search ? `No ${kind}s matching "${search}"` : `No ${kind}s yet`}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {kind === "image" &&
              images.map(img => <ImageThumbnail key={img.filename} image={img} selected={selectedFilename === img.filename} onClick={() => onSelect(img)} />)}
            {kind === "video" &&
              videos.map(v => <VideoThumbnail key={v.filename} video={v} selected={selectedFilename === v.filename} onClick={() => onSelect(v)} />)}
            {kind === "audio" &&
              audios.map(a => <AudioThumbnail key={a.filename} audio={a} selected={selectedFilename === a.filename} onClick={() => onSelect(a)} />)}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-primary px-3 py-2 flex items-center justify-between">
        <span className="text-2xs text-muted">
          {entries.length} {kind}
          {entries.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 text-muted hover:text-primary transition-colors cursor-pointer rounded focus-ring"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function RightPanel({
  kind,
  agentId,
  selected,
  onWorkOnSelection,
  onClearSelection,
  onGenerated,
}: {
  kind: MediaKind;
  agentId: string | null;
  selected: MediaEntry | null;
  onWorkOnSelection: () => Promise<void>;
  onClearSelection: () => void;
  onGenerated: () => void;
}) {
  if (selected) {
    if (selected.kind === "image") return <ImageViewer image={selected} onWorkOnImage={onWorkOnSelection} onClose={onClearSelection} />;
    if (selected.kind === "video") return <VideoViewer video={selected} onWorkOnVideo={onWorkOnSelection} onClose={onClearSelection} />;
    if (selected.kind === "audio") return <AudioViewer audio={selected} agentId={agentId} onWorkOnAudio={onWorkOnSelection} onClose={onClearSelection} />;
  }
  if (kind === "image") return <ImageGeneratePanel agentId={agentId} onGenerated={onGenerated} />;
  if (kind === "video") return <VideoGeneratePanel agentId={agentId} onGenerated={onGenerated} />;
  return <SpeechGeneratePanel agentId={agentId} onGenerated={onGenerated} />;
}

// ─── Main MediaApp ────────────────────────────────────────────────────────────

const AGENT_TYPE_PREFERENCES: Record<MediaKind, string[]> = {
  image: ["image", "imageGeneration", "media"],
  video: ["video", "videoGeneration", "media"],
  audio: ["audio", "voice", "media"],
};

export default function MediaApp() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaKind>("image");
  const [selected, setSelected] = useState<MediaEntry | null>(null);
  const [search, setSearch] = useState("");

  const imagesData = useImages(kind === "image" && search ? search : undefined);
  const videosData = useVideos(kind === "video" && search ? search : undefined);
  const audiosData = useAudios(kind === "audio" && search ? search : undefined);

  const images: ImageIndexEntry[] = imagesData.data?.images ?? [];
  const videos: VideoIndexEntry[] = videosData.data?.videos ?? [];
  const audios: AudioIndexEntry[] = audiosData.data?.audios ?? [];

  const tabs: FilterTabOption<MediaKind>[] = [
    { id: "image", label: "Images", count: images.length },
    { id: "video", label: "Videos", count: videos.length },
    { id: "audio", label: "Audio", count: audios.length },
  ];

  // Create a headless agent on mount for media operations
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const types = await agentRPCClient.getAgentTypes({});
        if (cancelled) return;
        const preferred = types.find(t => Object.values(AGENT_TYPE_PREFERENCES).flat().includes(t.type)) ?? types[0];
        if (!preferred) {
          setInitError("No agent types available.");
          return;
        }
        const { id } = await agentRPCClient.createAgent({ agentType: preferred.type, headless: true });
        if (!cancelled) setAgentId(id);
      } catch (err: any) {
        if (!cancelled) setInitError(err.message || "Failed to initialize");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up headless agent on unmount
  useEffect(() => {
    return () => {
      if (agentId) {
        agentRPCClient.deleteAgent({ agentId, reason: "Media app unmounted" }).catch(() => {});
      }
    };
  }, [agentId]);

  // Clear selection when switching tabs
  const handleKindChange = (next: MediaKind) => {
    setKind(next);
    setSelected(null);
    setSearch("");
  };

  const handleWorkOnSelection = async () => {
    if (!selected) return;
    try {
      const types = await agentRPCClient.getAgentTypes({});
      const prefs = AGENT_TYPE_PREFERENCES[selected.kind];
      const preferred = types.find(t => prefs.includes(t.type)) ?? types[0];
      if (!preferred) return;
      const { id } = await agentRPCClient.createAgent({ agentType: preferred.type, headless: false });
      setChatAgentId(id);
    } catch (err: any) {
      toastManager.error(err.message || "Failed to open agent", { duration: 4000 });
    }
  };

  const handleGenerated = () => {
    if (kind === "image") void imagesData.mutate();
    else if (kind === "video") void videosData.mutate();
    else void audiosData.mutate();
    setSelected(null);
  };

  const handleRefresh = () => {
    if (kind === "image") void imagesData.mutate();
    else if (kind === "video") void videosData.mutate();
    else void audiosData.mutate();
  };

  if (initError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary gap-4 p-6 text-center">
        <ImageIcon className="w-10 h-10 text-muted opacity-40" />
        <div>
          <h2 className="text-sm font-semibold text-primary mb-1">Media Unavailable</h2>
          <p className="text-xs text-muted max-w-sm">{initError}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg cursor-pointer focus-ring"
        >
          Retry
        </button>
      </div>
    );
  }

  const loading = kind === "image" ? imagesData.isLoading : kind === "video" ? videosData.isLoading : audiosData.isLoading;

  const body = (
    <div className="flex flex-col h-full min-h-0">
      <FilterTabs tabs={tabs} value={kind} onChange={handleKindChange} showZeroCounts />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0 border-r border-primary flex flex-col min-h-0 bg-secondary">
          <GallerySidebar
            kind={kind}
            search={search}
            loading={loading}
            selectedFilename={selected?.filename ?? null}
            images={images}
            videos={videos}
            audios={audios}
            onSearch={setSearch}
            onSelect={setSelected}
            onRefresh={handleRefresh}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <RightPanel
            kind={kind}
            agentId={agentId}
            selected={selected}
            onWorkOnSelection={handleWorkOnSelection}
            onClearSelection={() => setSelected(null)}
            onGenerated={handleGenerated}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      <div className="shrink-0 h-11 border-b border-primary bg-secondary flex items-center gap-2 px-3">
        <div className="w-7 h-7 rounded-lg bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm shrink-0">
          <ImageIcon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-primary">Media</span>

        <div className="flex-1" />

        <div className="w-px h-5 bg-primary/70 mx-0.5 shrink-0" aria-hidden="true" />
        <AgentLauncherBar
          buttonLabel="Open Agent"
          buttonClassName="bg-indigo-600 hover:bg-indigo-500 text-white shadow-button-primary"
          onLaunch={id => setChatAgentId(id)}
        />
      </div>

      <div className="flex-1 min-h-0">
        {chatAgentId ? (
          <ResizableSplit direction="vertical" initialRatio={0.6} minFirst={200} minSecond={120} className="h-full">
            {body}
            <div className="h-full overflow-hidden bg-primary">
              <ChatPanel agentId={chatAgentId} />
            </div>
          </ResizableSplit>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
