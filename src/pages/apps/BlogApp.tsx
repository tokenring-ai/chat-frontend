import type {BlogPost} from "@tokenring-ai/blog/BlogProvider";
import {BookOpen, Calendar, ChevronDown, ExternalLink, FilePlus, Globe, Image, Loader2, Pencil, RefreshCw, Tag, WifiOff,} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toastManager} from '../../components/ui/toast.tsx';
import {agentRPCClient, blogRPCClient, useBlogPost, useBlogPosts, useBlogState} from '../../rpc.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

type PostStatus = 'draft' | 'published' | 'scheduled' | 'pending' | 'private';
type StatusFilter = 'all' | 'draft' | 'published';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PostStatus, { label: string; dot: string; badge: string }> = {
  draft: {label: 'Draft', dot: 'bg-amber-400', badge: 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/30'},
  published: {label: 'Published', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'},
  scheduled: {label: 'Scheduled', dot: 'bg-blue-400', badge: 'bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-400/30'},
  pending: {label: 'Pending', dot: 'bg-orange-400', badge: 'bg-orange-400/10 text-orange-600 dark:text-orange-400 border-orange-400/30'},
  private: {label: 'Private', dot: 'bg-violet-400', badge: 'bg-violet-400/10 text-violet-600 dark:text-violet-400 border-violet-400/30'},
};

function formatDate(ts: number | undefined) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

function StatusBadge({status}: { status: PostStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border ${s.badge}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`}/>
      {s.label}
    </span>
  );
}

// ─── Provider selector ────────────────────────────────────────────────────────

function ProviderSelector({
                            agentId,
                            provider,
                            availableProviders,
                            onProviderChange,
                          }: {
  agentId: string;
  provider: string | null;
  availableProviders: string[];
  onProviderChange: (p: string) => void;
}) {
  const [changing, setChanging] = useState(false);
  const [open, setOpen] = useState(false);

  if (availableProviders.length === 0) {
    return (
      <span className="text-2xs text-muted flex items-center gap-1">
        <WifiOff className="w-3 h-3"/> No providers configured
      </span>
    );
  }

  const switchProvider = async (name: string) => {
    setChanging(true);
    setOpen(false);
    try {
      await blogRPCClient.updateBlogState({agentId, selectedProvider: name});
      onProviderChange(name);
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to switch provider', {duration: 4000});
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={changing}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-primary rounded-lg text-xs text-muted hover:text-primary hover:border-indigo-500/40 transition-all focus-ring cursor-pointer disabled:opacity-50"
      >
        <Globe className="w-3 h-3"/>
        <span className="font-medium text-primary max-w-32 truncate">{provider ?? 'No provider'}</span>
        {changing ? <Loader2 className="w-3 h-3 animate-spin"/> : <ChevronDown className="w-3 h-3"/>}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-secondary border border-primary rounded-xl shadow-card z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-primary">
            <p className="text-2xs font-semibold text-muted uppercase tracking-wider">Switch Provider</p>
          </div>
          {availableProviders.map(p => (
            <button
              key={p}
              onClick={() => switchProvider(p)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-hover transition-colors cursor-pointer text-left focus-ring ${p === provider ? 'text-indigo-500 font-medium' : 'text-primary'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p === provider ? 'bg-indigo-500' : 'bg-transparent'}`}/>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post list item ───────────────────────────────────────────────────────────

function PostListItem({post, selected, onClick}: { post: BlogPost; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col gap-1 px-3 py-3 text-left border-b border-primary hover:bg-hover transition-colors focus-ring cursor-pointer ${
        selected ? 'bg-active border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'
      }`}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-medium leading-tight flex-1 min-w-0 ${selected ? 'text-primary' : 'text-secondary'}`}>
          {post.title || <em className="text-muted">Untitled</em>}
        </span>
        <StatusBadge status={post.status}/>
      </div>
      <div className="flex items-center gap-2 text-2xs text-muted">
        <Calendar className="w-3 h-3 shrink-0"/>
        <span>{formatDate(post.updated_at)}</span>
        {post.tags && post.tags.length > 0 && (
          <>
            <span>·</span>
            <Tag className="w-3 h-3 shrink-0"/>
            <span className="truncate">{post.tags.slice(0, 2).join(', ')}{post.tags.length > 2 ? ` +${post.tags.length - 2}` : ''}</span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── Post viewer ──────────────────────────────────────────────────────────────

function PostViewer({
                      post,
                      provider,
                      agentId,
                      onStartAgent,
                      onRefresh,
                    }: {
  post: BlogPost;
  provider: string;
  agentId: string;
  onStartAgent: (postId?: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleWorkOnPost = async () => {
    setStarting(true);
    try {
      await onStartAgent(post.id);
    } finally {
      setStarting(false);
    }
  };

  const handlePublish = async () => {
    if (post.status === 'published') return;
    setPublishing(true);
    try {
      await blogRPCClient.updatePost({provider, id: post.id, updatedData: {status: 'published'} as any});
      toastManager.success('Post published!', {duration: 3000});
      onRefresh();
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to publish', {duration: 5000});
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Post header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-primary space-y-4">
        {post.feature_image?.url && (
          <div className="w-full h-40 rounded-xl overflow-hidden bg-tertiary">
            <img src={post.feature_image.url} alt="Feature" className="w-full h-full object-cover"/>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-primary leading-tight flex-1">
            {post.title || <em className="text-muted font-normal">Untitled</em>}
          </h2>
          <StatusBadge status={post.status}/>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3"/>
            Updated {formatDate(post.updated_at)}
          </span>
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3"/>
              Published {formatDate(post.published_at)}
            </span>
          )}
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-primary transition-colors">
              <ExternalLink className="w-3 h-3"/> View live
            </a>
          )}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-tertiary border border-primary rounded-full text-2xs text-muted">
                <Tag className="w-2.5 h-2.5"/>{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleWorkOnPost}
            disabled={starting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 focus-ring shadow-button-primary"
          >
            {starting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Opening...</>
              : <><Pencil className="w-3.5 h-3.5"/> Work on this post</>
            }
          </button>
          {post.status !== 'published' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 focus-ring"
            >
              {publishing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Publishing...</>
                : <><Globe className="w-3.5 h-3.5"/> Publish</>
              }
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-2 text-muted hover:text-primary border border-primary rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {post.html ? (
          <article className="prose prose-sm dark:prose-invert max-w-none text-primary" dangerouslySetInnerHTML={{__html: post.html}}/>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3 text-muted">
            <BookOpen className="w-8 h-8 opacity-30"/>
            <p className="text-sm">No content preview available.<br/>Click <strong className="text-primary">Work on this post</strong> to start editing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main BlogApp ─────────────────────────────────────────────────────────────

export default function BlogApp() {
  const navigate = useNavigate();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [launchingNew, setLaunchingNew] = useState(false);

  const blogState = useBlogState(agentId);
  const posts = useBlogPosts(provider, statusFilter, 100);
  const selectedPost = useBlogPost(provider, selectedPostId);

  // Create a headless blog agent on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const types = await agentRPCClient.getAgentTypes({});
        if (cancelled) return;
        const preferred =
          types.find(t => ['blog', 'writer', 'contentWriter', 'content-writer', 'managingEditor'].includes(t.type)) ??
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up headless agent on unmount
  useEffect(() => {
    return () => {
      if (agentId) {
        agentRPCClient.deleteAgent({agentId, reason: 'Blog app unmounted'}).catch(() => {
        });
      }
    };
  }, [agentId]);

  // Sync provider and available providers from blog state
  useEffect(() => {
    if (!blogState.data) return;
    const {selectedProvider, availableProviders: ap} = blogState.data;
    setAvailableProviders(ap);
    if (!provider && (selectedProvider ?? ap[0])) {
      setProvider(selectedProvider ?? ap[0]);
    }
  }, [blogState.data]);

  // Fetch blog state once agentId is ready
  useEffect(() => {
    if (!agentId) return;
    blogState.mutate();
  }, [agentId]);

  const filteredPosts = useMemo(() => {
    const all = (posts.data?.posts ?? []) as BlogPost[];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [posts.data, search]);

  const startAgent = async (postId?: string) => {
    const types = await agentRPCClient.getAgentTypes({});
    const preferred =
      types.find(t => ['blog', 'writer', 'contentWriter', 'content-writer', 'managingEditor'].includes(t.type)) ??
      types[0];
    if (!preferred) {
      toastManager.error('No blog agent type available', {duration: 4000});
      return;
    }
    const {id} = await agentRPCClient.createAgent({agentType: preferred.type, headless: false});

    if (postId && provider) {
      try {
        await blogRPCClient.updateBlogState({agentId: id, selectedPostId: postId, selectedProvider: provider ?? undefined});
      } catch {
        // Non-fatal
      }
    }

    navigate(`/agent/${id}`);
  };

  const handleNewPost = async () => {
    setLaunchingNew(true);
    try {
      await startAgent();
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to create agent', {duration: 5000});
    } finally {
      setLaunchingNew(false);
    }
  };

  if (initError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary gap-4 p-6 text-center">
        <BookOpen className="w-10 h-10 text-muted opacity-40"/>
        <div>
          <h2 className="text-sm font-semibold text-primary mb-1">Blog Unavailable</h2>
          <p className="text-xs text-muted max-w-sm">{initError}</p>
        </div>
        <button onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg cursor-pointer focus-ring">
          Retry
        </button>
      </div>
    );
  }

  const FILTERS: { id: StatusFilter; label: string }[] = [
    {id: 'all', label: 'All'},
    {id: 'draft', label: 'Drafts'},
    {id: 'published', label: 'Published'},
  ];

  const postCounts = useMemo(() => {
    const all = (posts.data?.posts ?? []) as BlogPost[];
    return {
      all: all.length,
      draft: all.filter(p => p.status === 'draft').length,
      published: all.filter(p => p.status === 'published').length,
    };
  }, [posts.data]);

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      {/* App header */}
      <div className="shrink-0 border-b border-primary bg-secondary px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
          <BookOpen className="w-4 h-4 text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-primary">Blog</h1>
          <p className="text-2xs text-muted">Manage posts across Ghost, WordPress, and more</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {agentId && (
            <ProviderSelector
              agentId={agentId}
              provider={provider}
              availableProviders={availableProviders}
              onProviderChange={p => {
                setProvider(p);
                posts.mutate();
              }}
            />
          )}
          <button
            onClick={handleNewPost}
            disabled={launchingNew || !agentId}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 focus-ring shadow-button-primary"
          >
            {launchingNew
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Starting...</>
              : <><FilePlus className="w-3.5 h-3.5"/> New post</>
            }
          </button>
        </div>
      </div>

      {/* Body: split panel */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Post list ── */}
        <div className="w-72 shrink-0 border-r border-primary flex flex-col min-h-0 bg-secondary">
          <div className="flex border-b border-primary shrink-0">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer focus-ring -mb-px ${
                  statusFilter === f.id
                    ? 'border-indigo-500 text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                {f.label}
                {postCounts[f.id] > 0 && (
                  <span
                    className={`text-2xs px-1.5 py-0.5 rounded-full font-mono ${statusFilter === f.id ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' : 'bg-tertiary text-muted'}`}>
                    {postCounts[f.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-b border-primary shrink-0">
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-input border border-primary rounded-lg py-1.5 px-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {!provider || posts.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-muted animate-spin"/>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
                <Image className="w-8 h-8 text-muted opacity-30"/>
                <p className="text-sm text-muted">
                  {search ? `No posts matching "${search}"` : 'No posts found'}
                </p>
                {!search && (
                  <button
                    onClick={handleNewPost}
                    disabled={launchingNew}
                    className="text-xs text-indigo-500 hover:text-indigo-400 cursor-pointer transition-colors"
                  >
                    Create your first post →
                  </button>
                )}
              </div>
            ) : (
              filteredPosts.map(post => (
                <PostListItem
                  key={post.id}
                  post={post}
                  selected={post.id === (selectedPost.data?.post.id ?? null)}
                  onClick={() => setSelectedPostId(post.id)}
                />
              ))
            )}
          </div>

          {posts.data && (
            <div className="shrink-0 border-t border-primary px-3 py-2 flex items-center justify-between">
              <span className="text-2xs text-muted">{filteredPosts.length} of {posts.data.count} posts</span>
              <button
                onClick={() => posts.mutate()}
                className="p-1 text-muted hover:text-primary transition-colors cursor-pointer rounded focus-ring"
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3"/>
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Post viewer ── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {!agentId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
              <Loader2 className="w-6 h-6 animate-spin"/>
              <span className="text-sm">Connecting to blog service...</span>
            </div>
          ) : !provider ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <WifiOff className="w-10 h-10 text-muted opacity-30"/>
              <div>
                <h2 className="text-base font-semibold text-primary mb-1">No provider selected</h2>
                <p className="text-sm text-muted max-w-xs">Select a blog provider from the dropdown to get started.</p>
              </div>
            </div>
          ) : selectedPost.data ? (
            <PostViewer
              post={selectedPost.data?.post}
              provider={provider}
              agentId={agentId}
              onStartAgent={startAgent}
              onRefresh={() => posts.mutate()}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white"/>
              </div>
              <div>
                <h2 className="text-base font-semibold text-primary mb-1">No post selected</h2>
                <p className="text-sm text-muted max-w-xs">Select a post from the list to view and edit it, or create a new one with an AI agent.</p>
              </div>
              <button
                onClick={handleNewPost}
                disabled={launchingNew}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50 focus-ring shadow-button-primary"
              >
                {launchingNew
                  ? <><Loader2 className="w-4 h-4 animate-spin"/> Starting...</>
                  : <><FilePlus className="w-4 h-4"/> New post with agent</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
