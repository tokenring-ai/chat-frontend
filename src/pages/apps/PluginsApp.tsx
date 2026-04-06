import {CheckCircle2, Loader2, Package, Settings2} from 'lucide-react';
import {usePlugins} from '../../rpc.ts';

function PluginCard({ plugin }: { plugin: { name: string; displayName: string, version: string; description: string; hasConfig: boolean } }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-secondary border border-primary rounded-xl hover:border-indigo-500/30 transition-colors group">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
        <Package className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-primary capitalize truncate">{plugin.displayName}</span>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xs text-muted font-mono shrink-0">{plugin.name}</span>
          <span className="text-2xs text-muted font-mono shrink-0">v{plugin.version}</span>
          {plugin.hasConfig && (
            <span className="inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
              <Settings2 className="w-2.5 h-2.5" />
              config
            </span>
          )}
        </div>
        <p className="text-2xs text-muted line-clamp-2">{plugin.description}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>
    </div>
  );
}

export default function PluginsApp() {
  const plugins = usePlugins();

  const installedPlugins = plugins.data?.plugins ?? [];

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-y-auto">
      <div className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-primary text-2xl font-bold tracking-tight mb-1">Plugins</h1>
            <p className="text-xs text-muted">Manage the plugins powering your TokenRing instance</p>
          </div>

          {/* Installed plugins */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-2xs font-bold text-muted uppercase tracking-widest px-1">
                Installed
              </p>
              {!plugins.isLoading && (
                <span className="text-2xs text-muted px-2 py-0.5 bg-secondary border border-primary rounded-full">
                  {installedPlugins.length} active
                </span>
              )}
            </div>

            {plugins.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-muted animate-spin" />
              </div>
            ) : plugins.error ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-warning">Failed to load plugins</p>
                <p className="text-2xs text-muted mt-1">{String(plugins.error)}</p>
              </div>
            ) : installedPlugins.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Package className="w-8 h-8 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">No plugins installed</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {installedPlugins.map(plugin => (
                  <PluginCard key={plugin.name} plugin={plugin} />
                ))}
              </div>
            )}
          </div>

          {/* Plugin store placeholder */}
          <div>
            <p className="text-2xs font-bold text-muted uppercase tracking-widest px-1 mb-3">Plugin Store</p>
            <div className="px-6 py-10 bg-secondary border border-primary border-dashed rounded-xl text-center">
              <Package className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-secondary mb-1">Coming soon</p>
              <p className="text-2xs text-muted max-w-xs mx-auto">
                Browse and install community plugins from the TokenRing plugin registry.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
