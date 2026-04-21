import type {CloudQuoteQuoteHistoricalItemSchema, CloudQuoteQuoteSchema} from "@tokenring-ai/cloudquote/schema";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BotMessageSquare,
  Clock,
  ExternalLink,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type React from 'react';
import {useCallback, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {z} from 'zod';
import {toastManager} from '../../components/ui/toast.tsx';
import {
  agentRPCClient,
  filesystemRPCClient,
  useAgentTypes,
  useNewsRPMIndexedDataSearchResults,
  useStockLeaders,
  useStockPriceHistory,
  useStockPriceTicks,
  useStockQuote,
} from '../../rpc.ts';

// ─── type definitions ─────────────────────────────────────────────────────────

export type StockQuote = z.infer<typeof CloudQuoteQuoteSchema>;
export type StockHistoricalRow = z.infer<typeof CloudQuoteQuoteHistoricalItemSchema>;
export type StockPriceTicksRow = [number, number, number]; // timestamp, price, volume
export type StockPriceHistoryRow = z.infer<typeof CloudQuoteQuoteHistoricalItemSchema>;

export interface StockLeadersRow {
  Symbol: string;
  CompanyName: string;
  LastTrade: number;
  Change: number;
  PercentChange: number;
  Volume: number;
}

export interface StockNewsItem {
  slug?: string;
  Slug?: string;
  headline?: string;
  Headline?: string;
  title?: string;
  date?: string | number;
  Date?: string | number;
  publishDate?: string | number;
  provider?: string;
  Provider?: string;
  source?: string;
  link?: string;
  Link?: string;
}

export interface StockNewsResponse {
  data?: {
    rows?: StockNewsItem[];
    [key: string]: unknown;
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined, digits = 2) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
}

function fmtVol(n: number | string | null | undefined): string {
  const v = Number(n);
  if (!v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function changeSign(v: number | string | null | undefined): string {
  return Number(v) >= 0 ? '+' : '';
}

// ─── inline SVG price chart ─────────────────────────────────────────────────

function PriceLineChart({rows, color = '#6366f1'}: { rows: StockHistoricalRow[]; color?: string }) {
  const W = 800, H = 180, PL = 48, PR = 12, PT = 8, PB = 32;

  const prices = rows.map(r => r[4] ?? 0).filter(Boolean);
  if (prices.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-muted text-sm">No chart data</div>
    );
  }

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const xS = (i: number) => PL + (i / (prices.length - 1)) * (W - PL - PR);
  const yS = (p: number) => PT + (1 - (p - minP) / range) * (H - PT - PB);

  const linePath = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xS(i)} ${yS(p)}`).join(' ');
  const areaPath = `${linePath} L ${xS(prices.length - 1)} ${H - PB} L ${xS(0)} ${H - PB} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [minP, minP + range / 2, maxP];

  // X-axis labels (up to 5)
  const dates = rows.map(r => new Date(r[0] / 1e6).toISOString().slice(0, 10));
  const xLabelIndices = [0, Math.floor(dates.length / 4), Math.floor(dates.length / 2), Math.floor(3 * dates.length / 4), dates.length - 1];

  const gradId = `grad-${color.replace('#', '')}`;
  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#10b981' : '#ef4444';
  const fillColorStart = isUp ? '#10b981' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 select-none" aria-label="Price chart">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColorStart} stopOpacity={0.18}/>
          <stop offset="100%" stopColor={fillColorStart} stopOpacity={0.01}/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PL} y1={yS(t)} x2={W - PR} y2={yS(t)} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}/>
      ))}
      {/* Area */}
      <path d={areaPath} fill={`url(#${gradId})`}/>
      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round"/>
      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PL - 4} y={yS(t) + 4} fontSize={10} fill="currentColor" opacity={0.45} textAnchor="end">${fmt(t)}</text>
      ))}
      {/* X-axis labels */}
      {xLabelIndices.map(idx => (
        dates[idx] ? (
          <text key={idx} x={xS(idx)} y={H - 6} fontSize={9} fill="currentColor" opacity={0.4} textAnchor="middle">
            {dates[idx].slice(5)}
          </text>
        ) : null
      ))}
    </svg>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

type Tab = 'quote' | 'chart' | 'history' | 'news';

function QuoteTab({quote}: { quote: StockQuote | null }) {
  if (!quote) return <div className="py-8 text-center text-muted text-sm">No quote data</div>;

  const fields: [string, string | number | null | undefined][] = Object.entries(quote).filter(([, v]) => v != null && v !== '');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {fields.map(([key, val]) => (
        <div key={key} className="px-3 py-2 bg-secondary rounded-lg border border-primary">
          <div className="text-2xs text-muted mb-0.5 truncate">{key}</div>
          <div className="text-sm font-medium text-primary truncate">{String(val)}</div>
        </div>
      ))}
    </div>
  );
}

function ChartTab({symbol}: { symbol: string }) {
  const [interval, setInterval] = useState('daily');
  const intervals = [
    {label: '1D', value: '1'},
    {label: '5D', value: '5'},
    {label: '1M', value: 'daily'},
    {label: '3M', value: 'daily3m'},
    {label: '1Y', value: 'weekly'},
  ];

  const chartUrl = `https://chart.financialcontent.com/Chart?shwidth=3&fillshx=0&height=200&lncolor=6366f1&interval=${interval}&fillshy=0&gtcolor=6366f1&vucolor=10b981&bvcolor=1e293b&gmcolor=334155&shcolor=475569&grcolor=0f172a&vdcolor=ef4444&brcolor=0f172a&gbcolor=0f172a&lnwidth=2&volume=1&pvcolor=ef4444&mkcolor=ef4444&itcolor=94a3b8&fillalpha=20&ticker=${symbol}&Client=stocks&txcolor=94a3b8&output=svg&bgcolor=1e293b&arcolor=null&type=0&width=800`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {intervals.map(iv => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer focus-ring ${
              interval === iv.value
                ? 'bg-indigo-600 text-white'
                : 'bg-secondary text-muted hover:text-primary border border-primary'
            }`}
          >
            {iv.label}
          </button>
        ))}
      </div>
      <div className="bg-secondary rounded-xl border border-primary overflow-hidden">
        <img
          src={chartUrl}
          alt={`${symbol} price chart`}
          className="w-full h-48 object-cover"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
}

function HistoryTab({symbol}: { symbol: string }) {
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setMonth(today.getMonth() - 3);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [fetchParams, setFetchParams] = useState({from, to});
  const history = useStockPriceHistory(symbol, fetchParams.from, fetchParams.to);

  return (
    <div className="space-y-3">
      {/* Date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
               className="text-xs bg-secondary border border-primary rounded-lg px-3 py-1.5 text-primary focus:border-indigo-500 outline-none"/>
        <span className="text-xs text-muted">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
               className="text-xs bg-secondary border border-primary rounded-lg px-3 py-1.5 text-primary focus:border-indigo-500 outline-none"/>
        <button
          onClick={() => setFetchParams({from, to})}
          className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3"/> Apply
        </button>
      </div>

      {/* Chart */}
      {history.data?.rows && history.data.rows.length > 0 && (
        <div className="bg-secondary rounded-xl border border-primary p-3">
          <PriceLineChart rows={history.data.rows}/>
        </div>
      )}

      {/* Table */}
      {history.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted"/></div>
      ) : !history.data?.rows?.length ? (
        <div className="py-8 text-center text-muted text-sm">No history data</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-primary">
          <table className="w-full text-xs">
            <thead>
            <tr className="bg-secondary border-b border-primary">
              {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted">{h}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            {[...history.data.rows].reverse().map((row, i) => (
              <tr key={i} className="border-b border-primary/50 hover:bg-hover transition-colors">
                <td className="px-3 py-2 font-mono text-secondary">{row[0]}</td>
                <td className="px-3 py-2 text-secondary">{fmt(row[1])}</td>
                <td className="px-3 py-2 text-emerald-500">{fmt(row[2])}</td>
                <td className="px-3 py-2 text-red-500">{fmt(row[3])}</td>
                <td className="px-3 py-2 font-medium text-primary">{fmt(row[4])}</td>
                <td className="px-3 py-2 text-muted">{fmtVol(row[5])}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewsTab({symbol, symbolId}: { symbol: string, symbolId?: string }) {
  const news = useNewsRPMIndexedDataSearchResults(symbolId ? {
    key: 'symbolID',
    value: symbolId,
  } : null);

  const rows = news.data?.rows ?? [];

  if (news.isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted"/></div>;
  if (!rows.length) return <div className="py-8 text-center text-muted text-sm">No news found for {symbol}</div>;

  return (
    <div className="space-y-2">
      {rows.map((item: StockNewsItem, i: number) => {
        const slug = item.slug ?? item.Slug ?? '';
        const headline = item.headline ?? item.Headline ?? item.title ?? '(no headline)';
        const date = item.date ?? item.Date ?? item.publishDate ?? '';
        const provider = item.provider ?? item.Provider ?? item.source ?? '';
        const link = slug ? `https://www.financialcontent.com/article/${slug}` : (item.link ?? item.Link ?? '');
        return (
          <div key={i}
               className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-xl border border-primary hover:border-indigo-500/30 transition-colors group">
            <Newspaper className="w-4 h-4 text-muted shrink-0 mt-0.5"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary leading-snug mb-1">{headline}</p>
              <div className="flex items-center gap-3">
                {provider && <span className="text-2xs text-muted">{provider}</span>}
                {date && <span className="text-2xs text-muted font-mono">{String(date).slice(0, 10)}</span>}
              </div>
            </div>
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer"
                 className="shrink-0 p-1.5 text-muted hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all rounded-md focus-ring cursor-pointer">
                <ExternalLink className="w-3.5 h-3.5"/>
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaders section ─────────────────────────────────────────────────────────

function LeadersSection({onSymbolSelect}: { onSymbolSelect: (s: string) => void }) {
  const [leaderTab, setLeaderTab] = useState<'MOSTACTIVE' | 'PERCENTGAINERS' | 'PERCENTLOSERS'>('MOSTACTIVE');
  const leaders = useStockLeaders(leaderTab, 10);

  const tabs = [
    {key: 'MOSTACTIVE' as const, label: 'Most Active', icon: <Zap className="w-3 h-3"/>},
    {key: 'PERCENTGAINERS' as const, label: 'Top Gainers', icon: <TrendingUp className="w-3 h-3"/>},
    {key: 'PERCENTLOSERS' as const, label: 'Top Losers', icon: <TrendingDown className="w-3 h-3"/>},
  ];

  const rows = leaders.data?.rows ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setLeaderTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring ${
              leaderTab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-secondary text-muted hover:text-primary border border-primary'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {leaders.isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted"/></div>
      ) : !rows.length ? (
        <div className="py-6 text-center text-muted text-sm">No data</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-primary">
          <table className="w-full text-xs">
            <thead>
            <tr className="bg-secondary border-b border-primary">
              <th className="px-3 py-2 text-left text-muted font-semibold">Symbol</th>
              <th className="px-3 py-2 text-left text-muted font-semibold">Company</th>
              <th className="px-3 py-2 text-right text-muted font-semibold">Price</th>
              <th className="px-3 py-2 text-right text-muted font-semibold">Change</th>
              <th className="px-3 py-2 text-right text-muted font-semibold">Volume</th>
            </tr>
            </thead>
            <tbody>
            {rows.map((row: StockQuote | null, i: number) => {
              if (!row) return null;
              const sym = row.Symbol ?? '';
              const name = row.Name ?? '';
              const price = row.Price ?? '';
              const change = row.Change ?? '';
              const changePct = row.ChangePercent ?? '';
              const vol = row.Volume ?? '';
              const isUp = Number(change) >= 0;
              return (
                <tr
                  key={i}
                  onClick={() => sym && onSymbolSelect(sym.toUpperCase())}
                  className="border-b border-primary/50 hover:bg-hover transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2 font-bold text-indigo-400">{sym}</td>
                  <td className="px-3 py-2 text-secondary truncate max-w-[160px]">{name}</td>
                  <td className="px-3 py-2 text-right font-medium text-primary">${fmt(price)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                      <span className="flex items-center justify-end gap-0.5">
                        {isUp ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                        {changeSign(change)}{fmt(change)} ({changeSign(changePct)}{fmt(changePct)}%)
                      </span>
                  </td>
                  <td className="px-3 py-2 text-right text-muted">{fmtVol(vol)}</td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Ask AI modal ────────────────────────────────────────────────────────────

function AskAIModal({
                      symbol,
                      quoteData,
                      historyRows,
                      onClose,
                    }: {
  symbol: string;
  quoteData: StockQuote | null;
  historyRows: StockHistoricalRow[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const agentTypes = useAgentTypes();
  const [selectedType, setSelectedType] = useState('');
  const [question, setQuestion] = useState(`Analyze the stock ${symbol}. What do you think about the current price action and near-term outlook?`);
  const [launching, setLaunching] = useState(false);

  const firstType = agentTypes.data?.[0]?.type ?? '';
  const effectiveType = selectedType || firstType;

  const handleLaunch = useCallback(async () => {
    if (!effectiveType) return;
    setLaunching(true);
    try {
      const {id: agentId} = await agentRPCClient.createAgent({agentType: effectiveType, headless: false});

      // Write context file with current data
      const contextData = {
        symbol,
        question,
        quote: quoteData,
        recentHistory: historyRows.slice(-20),
        fetchedAt: new Date().toISOString(),
      };
      const contextPath = `/tmp/tokenring-stock-${symbol}-${Date.now()}.json`;
      const fsState = await filesystemRPCClient.getFilesystemState({agentId});
      if (fsState.status !== 'success') throw new Error('Failed to get filesystem state');
      await filesystemRPCClient.writeFile({path: contextPath, content: JSON.stringify(contextData, null, 2), provider: fsState.provider});
      await filesystemRPCClient.addFileToChat({agentId, file: contextPath});

      onClose();
      void navigate(`/agent/${agentId}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch agent';
      toastManager.error(errorMessage, {duration: 5000});
      setLaunching(false);
    }
  }, [effectiveType, symbol, question, quoteData, historyRows, navigate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-primary border border-primary rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-primary">Ask AI about {symbol}</h2>
          <p className="text-xs text-muted mt-0.5">Launches a new agent with current quote + history as context</p>
        </div>

        {/* Question */}
        <div>
          <label className="text-xs text-muted font-medium block mb-1">Your question</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
            className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 text-primary focus:border-indigo-500 outline-none resize-none"
          />
        </div>

        {/* Agent type */}
        <div>
          <label className="text-xs text-muted font-medium block mb-1">Agent type</label>
          <select
            value={effectiveType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 text-primary focus:border-indigo-500 outline-none cursor-pointer"
          >
            {agentTypes.data?.map(t => (
              <option key={t.type} value={t.type}>{t.displayName}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm bg-secondary hover:bg-hover text-secondary border border-primary rounded-lg transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={launching || !effectiveType}
            className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {launching ? <Loader2 className="w-4 h-4 animate-spin"/> : <BotMessageSquare className="w-4 h-4"/>}
            Launch Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── stock detail panel ───────────────────────────────────────────────────────

function StockDetail({symbol, onClear}: { symbol: string; onClear: () => void }) {
  const [tab, setTab] = useState<Tab>('quote');
  const [showAskAI, setShowAskAI] = useState(false);

  const quote = useStockQuote([symbol]);
  const history = useStockPriceHistory(symbol);
  const ticks = useStockPriceTicks(symbol);

  const quoteRow = quote.data?.rows?.[0] ?? null;

  const price = quoteRow?.Price;
  const change = quoteRow?.Change
  const changePct = quoteRow?.ChangePercent;
  const companyName = quoteRow?.Name ?? symbol;
  const isUp = Number(change) > 0;
  const isDown = Number(change) < 0;
  const isFlat = !(isUp || isDown);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {key: 'quote', label: 'Quote', icon: <BarChart2 className="w-3.5 h-3.5"/>},
    {key: 'chart', label: 'Chart', icon: <BarChart2 className="w-3.5 h-3.5"/>},
    {key: 'history', label: 'History', icon: <Clock className="w-3.5 h-3.5"/>},
    {key: 'news', label: 'News', icon: <Newspaper className="w-3.5 h-3.5"/>},
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 py-4 bg-secondary border border-primary rounded-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg font-bold text-indigo-400">{symbol}</span>
            {companyName !== symbol && <span className="text-sm text-muted truncate">{companyName}</span>}
          </div>
          <div className="flex items-baseline gap-2">
            {quote.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted"/>
            ) : price != null ? (
              <>
                <span className="text-3xl font-bold text-primary">${fmt(price)}</span>
                {!isFlat && (
                  <span className={`flex items-center gap-0.5 text-sm font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isUp ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                    {changeSign(change)}{fmt(change)} ({changeSign(changePct)}{fmt(changePct)}%)
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted">Price unavailable</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAskAI(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <BotMessageSquare className="w-3.5 h-3.5"/>
            Ask AI
          </button>
          <button
            onClick={onClear}
            className="px-3 py-2 text-xs text-muted hover:text-primary bg-secondary border border-primary rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-primary pb-0 -mb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer focus-ring ${
              tab === t.key
                ? 'border-indigo-500 text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'quote' && <QuoteTab quote={quoteRow}/>}
        {tab === 'chart' && <ChartTab symbol={symbol}/>}
        {tab === 'history' && <HistoryTab symbol={symbol}/>}
        {tab === 'news' && <NewsTab symbol={symbol} symbolId={quoteRow?.SymbolID}/>}
      </div>

      {showAskAI && (
        <AskAIModal
          symbol={symbol}
          quoteData={quoteRow}
          historyRows={history.data?.rows ?? (ticks.data?.rows as unknown as StockPriceHistoryRow[]) ?? []}
          onClose={() => setShowAskAI(false)}
        />
      )}
    </div>
  );
}

// ─── main app ─────────────────────────────────────────────────────────────────

export default function StocksApp() {
  const [inputValue, setInputValue] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const sym = inputValue.trim().toUpperCase();
    if (sym) setActiveSymbol(sym);
  }, [inputValue]);

  const handleSymbolSelect = useCallback((sym: string) => {
    setInputValue(sym);
    setActiveSymbol(sym);
  }, []);

  const quickSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'SPY'];

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-y-auto">
      <div className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header + search */}
          <div>
            <h1 className="text-primary text-2xl font-bold tracking-tight mb-1">Stocks</h1>
            <p className="text-xs text-muted mb-4">Real-time quotes, charts, history, and news</p>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"/>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value.toUpperCase())}
                  placeholder="Enter ticker symbol (e.g. AAPL)"
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-primary rounded-xl text-sm text-primary placeholder:text-muted focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer focus-ring"
              >
                Search
              </button>
            </form>

            {/* Quick symbols */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickSymbols.map(s => (
                <button
                  key={s}
                  onClick={() => handleSymbolSelect(s)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer focus-ring border ${
                    activeSymbol === s
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                      : 'bg-secondary border-primary text-muted hover:text-primary hover:border-indigo-500/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stock detail */}
          {activeSymbol && (
            <StockDetail symbol={activeSymbol} onClear={() => {
              setActiveSymbol(null);
              setInputValue('');
            }}/>
          )}

          {/* Market leaders */}
          <div>
            <p className="text-2xs font-bold text-muted uppercase tracking-widest px-1 mb-3">Market Leaders</p>
            <LeadersSection onSymbolSelect={handleSymbolSelect}/>
          </div>

        </div>
      </div>
    </div>
  );
}
