import type { CloudQuoteQuoteHistoricalItemSchema, CloudQuoteQuoteSchema } from "@tokenring-ai/cloudquote/schema";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BotMessageSquare,
  Building2,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { z } from "zod";
import { toastManager } from "../../components/ui/toast.tsx";
import {
  agentRPCClient,
  filesystemRPCClient,
  useAgentTypes,
  useFindStock,
  useNewsRPMIndexedDataSearchResults,
  useStockLeaders,
  useStockPriceHistory,
  useStockPriceTicks,
  useStockQuote,
} from "../../rpc.ts";

// ─── type definitions ─────────────────────────────────────────────────────────

export type StockQuote = z.infer<typeof CloudQuoteQuoteSchema>;
export type StockHistoricalRow = z.infer<typeof CloudQuoteQuoteHistoricalItemSchema>;
export type StockPriceTicksRow = [number, number, number];
export type StockPriceHistoryRow = z.infer<typeof CloudQuoteQuoteHistoricalItemSchema>;

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

// ─── helpers ────────────────────────────────────────────────────────────────

function pricePrecision(n: number | null | undefined): number {
  const abs = Math.abs(Number(n) || 0);
  if (abs >= 10) return 2;
  if (abs >= 1) return 3;
  return 4;
}

function fmt(n: number | string | null | undefined, digits = 2) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPrice(n: number | string | null | undefined) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  return fmt(n, pricePrecision(Number(n)));
}

function fmtVol(n: number | string | null | undefined): string {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function fmtMarketCap(price?: number, shares?: number): string {
  if (!price || !shares) return "—";
  const cap = price * shares;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${fmt(cap)}`;
}

function changeSign(v: number | string | null | undefined): string {
  return Number(v) >= 0 ? "+" : "";
}

function fmtTs(ts: number | null | undefined, kind: "date" | "datetime" = "date"): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return kind === "datetime" ? d.toLocaleString() : d.toLocaleDateString();
}

function parseHistoryDate(v: number | string): number {
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  if (v > 1e15) return v / 1e6;
  if (v > 1e12) return v / 1e3;
  return v;
}

// ─── stat card / range bar ──────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: "up" | "down" | "neutral" }) {
  const accentClass = accent === "up" ? "text-emerald-500" : accent === "down" ? "text-red-500" : "text-primary";
  return (
    <div className="px-3 py-2.5 bg-secondary rounded-lg border border-primary">
      <div className="text-2xs uppercase tracking-wide text-muted mb-1">{label}</div>
      <div className={`text-sm font-semibold ${accentClass} truncate`}>{value}</div>
      {sub != null && <div className="text-2xs text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function RangeBar({
  low,
  high,
  current,
  lowLabel,
  highLabel,
}: {
  low: number | undefined;
  high: number | undefined;
  current: number | undefined;
  lowLabel?: string;
  highLabel?: string;
}) {
  if (low == null || high == null || current == null || high <= low) {
    return <div className="h-1.5 rounded-full bg-secondary border border-primary" />;
  }
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div className="space-y-1">
      <div className="relative h-1.5 rounded-full bg-secondary border border-primary overflow-hidden">
        <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-emerald-500/30" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 border border-primary shadow-md"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-2xs text-muted font-mono">
        <span>{lowLabel ?? fmtPrice(low)}</span>
        <span>{highLabel ?? fmtPrice(high)}</span>
      </div>
    </div>
  );
}

// ─── inline SVG price chart ─────────────────────────────────────────────────

function PriceLineChart({ rows }: { rows: StockHistoricalRow[] }) {
  const W = 800,
    H = 200,
    PL = 56,
    PR = 12,
    PT = 8,
    PB = 32;

  const closes = rows.map(r => Number(r[4]) || 0);
  if (closes.length < 2) {
    return <div className="flex items-center justify-center h-32 text-muted text-sm">No chart data</div>;
  }

  const minP = Math.min(...closes);
  const maxP = Math.max(...closes);
  const range = maxP - minP || 1;

  const xS = (i: number) => PL + (i / (closes.length - 1)) * (W - PL - PR);
  const yS = (p: number) => PT + (1 - (p - minP) / range) * (H - PT - PB);

  const linePath = closes.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(i)} ${yS(p)}`).join(" ");
  const areaPath = `${linePath} L ${xS(closes.length - 1)} ${H - PB} L ${xS(0)} ${H - PB} Z`;

  const yTicks = [minP, minP + range / 4, minP + range / 2, minP + (3 * range) / 4, maxP];

  const dates = rows.map(r => {
    const ts = parseHistoryDate(r[0] as number | string);
    return ts ? new Date(ts).toISOString().slice(0, 10) : "";
  });
  const labelCount = 6;
  const xLabelIndices = Array.from({ length: labelCount }, (_, i) => Math.round((i / (labelCount - 1)) * (dates.length - 1)));

  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = lineColor;
  const gradId = `grad-${isUp ? "up" : "dn"}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48 select-none" aria-label="Price chart">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <line key={i} x1={PL} y1={yS(t)} x2={W - PR} y2={yS(t)} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {yTicks.map((t, i) => (
        <text key={i} x={PL - 6} y={yS(t) + 4} fontSize={10} fill="currentColor" opacity={0.5} textAnchor="end">
          ${fmt(t)}
        </text>
      ))}
      {xLabelIndices.map(idx =>
        dates[idx] ? (
          <text key={idx} x={xS(idx)} y={H - 8} fontSize={10} fill="currentColor" opacity={0.5} textAnchor="middle">
            {dates[idx].slice(2)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// ─── tabs ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "chart" | "history" | "news";

function OverviewTab({ quote, history }: { quote: StockQuote | null; history: StockHistoricalRow[] | undefined }) {
  if (!quote) return <div className="py-8 text-center text-muted text-sm">No quote data</div>;

  const price = quote.Price;
  const peRatio = quote.Price && quote.EPS ? quote.Price / quote.EPS : null;
  const dividendYield = quote.AnnualDividend && quote.Price ? (quote.AnnualDividend / quote.Price) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Mini sparkline + ranges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Day range */}
        <div className="px-4 py-3 bg-secondary rounded-xl border border-primary">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xs uppercase tracking-wide text-muted">Day Range</span>
            <span className="text-2xs text-muted font-mono">
              ${fmtPrice(quote.Low)} – ${fmtPrice(quote.High)}
            </span>
          </div>
          <RangeBar
            low={quote.Low}
            high={quote.High}
            current={price}
            lowLabel={`L $${fmtPrice(quote.Low)}`}
            highLabel={`H $${fmtPrice(quote.High)}`}
          />
        </div>
        {/* 52-week range */}
        <div className="px-4 py-3 bg-secondary rounded-xl border border-primary">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xs uppercase tracking-wide text-muted">52-Week Range</span>
            <span className="text-2xs text-muted font-mono">
              ${fmtPrice(quote.Low52)} – ${fmtPrice(quote.High52)}
            </span>
          </div>
          <RangeBar
            low={quote.Low52}
            high={quote.High52}
            current={price}
            lowLabel={`L $${fmtPrice(quote.Low52)}`}
            highLabel={`H $${fmtPrice(quote.High52)}`}
          />
        </div>
      </div>

      {/* Sparkline if we have history */}
      {history && history.length > 1 && (
        <div className="bg-secondary rounded-xl border border-primary p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xs uppercase tracking-wide text-muted">Recent Price</span>
            <span className="text-2xs text-muted">{history.length} sessions</span>
          </div>
          <PriceLineChart rows={history} />
        </div>
      )}

      {/* Key stats */}
      <div>
        <div className="text-2xs uppercase tracking-wide text-muted font-bold mb-2 px-1">Key Stats</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <StatCard label="Open" value={`$${fmtPrice(quote.Open)}`} />
          <StatCard label="Prev Close" value={`$${fmtPrice(quote.PrevClose)}`} />
          <StatCard label="Volume" value={fmtVol(quote.Volume)} sub={quote.AverageVolume ? `Avg ${fmtVol(quote.AverageVolume)}` : undefined} />
          <StatCard label="Market Cap" value={fmtMarketCap(quote.Price, quote.SharesOutstanding)} />
          <StatCard
            label="P/E Ratio"
            value={peRatio != null ? fmt(peRatio) : "—"}
            sub={quote.EPS != null ? `EPS $${fmt(quote.EPS)}` : undefined}
          />
          <StatCard
            label="Dividend Yield"
            value={dividendYield != null ? `${fmt(dividendYield)}%` : "—"}
            sub={quote.AnnualDividend != null ? `Annual $${fmt(quote.AnnualDividend)}` : undefined}
          />
          <StatCard
            label="50-Day MA"
            value={`$${fmtPrice(quote.MovingAverage50)}`}
            accent={price && quote.MovingAverage50 ? (price >= quote.MovingAverage50 ? "up" : "down") : "neutral"}
          />
          <StatCard
            label="200-Day MA"
            value={`$${fmtPrice(quote.MovingAverage200)}`}
            accent={price && quote.MovingAverage200 ? (price >= quote.MovingAverage200 ? "up" : "down") : "neutral"}
          />
          <StatCard
            label="Bid"
            value={quote.Bid != null ? `$${fmtPrice(quote.Bid)}` : "—"}
            sub={quote.BidSize ? `× ${fmtVol(quote.BidSize)}` : undefined}
          />
          <StatCard
            label="Ask"
            value={quote.Ask != null ? `$${fmtPrice(quote.Ask)}` : "—"}
            sub={quote.AskSize ? `× ${fmtVol(quote.AskSize)}` : undefined}
          />
          <StatCard
            label="After Hours"
            value={quote.AfterHoursPrice != null ? `$${fmtPrice(quote.AfterHoursPrice)}` : "—"}
            sub={quote.AfterHoursTradeTime ? fmtTs(quote.AfterHoursTradeTime, "datetime") : undefined}
          />
          <StatCard
            label="Shares Out"
            value={quote.SharesOutstanding ? fmtVol(quote.SharesOutstanding) : "—"}
          />
        </div>
      </div>

      {/* Performance */}
      {(quote.StartingPrice1W || quote.StartingPrice1M || quote.StartingPrice3M || quote.StartingPrice6M || quote.StartingPrice52 || quote.StartingPriceYTD) && (
        <div>
          <div className="text-2xs uppercase tracking-wide text-muted font-bold mb-2 px-1">Performance</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {([
              ["1W", quote.StartingPrice1W],
              ["1M", quote.StartingPrice1M],
              ["3M", quote.StartingPrice3M],
              ["6M", quote.StartingPrice6M],
              ["YTD", quote.StartingPriceYTD],
              ["52W", quote.StartingPrice52],
            ] as const).map(([label, start]) => {
              if (!start || !price) {
                return <StatCard key={label} label={label} value="—" />;
              }
              const pct = ((price - start) / start) * 100;
              return (
                <StatCard
                  key={label}
                  label={label}
                  value={`${changeSign(pct)}${fmt(pct)}%`}
                  accent={pct >= 0 ? "up" : "down"}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted px-1">
        {quote.ExchangeName && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> {quote.ExchangeName}
            {quote.ExchangeShortName && <span className="text-muted/60">({quote.ExchangeShortName})</span>}
          </div>
        )}
        {quote.SecurityTypeName && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> {quote.SecurityTypeName}
            {quote.NominalCurrencyCode && <span className="text-muted/60">· {quote.NominalCurrencyCode}</span>}
          </div>
        )}
        {(quote as { CLWebsite?: string }).CLWebsite && (
          <a
            href={(quote as { CLWebsite?: string }).CLWebsite!.startsWith("http") ? (quote as { CLWebsite?: string }).CLWebsite : `https://${(quote as { CLWebsite?: string }).CLWebsite}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
          >
            <Globe className="w-3 h-3" /> {(quote as { CLWebsite?: string }).CLWebsite}
          </a>
        )}
        {quote.LastTradeTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Last trade {fmtTs(quote.LastTradeTime, "datetime")}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTab({ symbol }: { symbol: string }) {
  const [chartInterval, setChartInterval] = useState("daily");
  const intervals = [
    { label: "1D", value: "1" },
    { label: "5D", value: "5" },
    { label: "1M", value: "daily" },
    { label: "3M", value: "daily3m" },
    { label: "1Y", value: "weekly" },
  ];

  const chartUrl = `https://chart.financialcontent.com/Chart?shwidth=3&fillshx=0&height=200&lncolor=6366f1&interval=${chartInterval}&fillshy=0&gtcolor=6366f1&vucolor=10b981&bvcolor=1e293b&gmcolor=334155&shcolor=475569&grcolor=0f172a&vdcolor=ef4444&brcolor=0f172a&gbcolor=0f172a&lnwidth=2&volume=1&pvcolor=ef4444&mkcolor=ef4444&itcolor=94a3b8&fillalpha=20&ticker=${symbol}&Client=stocks&txcolor=94a3b8&output=svg&bgcolor=1e293b&arcolor=null&type=0&width=800`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {intervals.map(iv => (
          <button
            type="button"
            key={iv.value}
            onClick={() => setChartInterval(iv.value)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer focus-ring ${
              chartInterval === iv.value ? "bg-indigo-600 text-white" : "bg-secondary text-muted hover:text-primary border border-primary"
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
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

function HistoryTab({ symbol }: { symbol: string }) {
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setMonth(today.getMonth() - 3);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [fetchParams, setFetchParams] = useState({ from, to });
  const history = useStockPriceHistory(symbol, fetchParams.from, fetchParams.to);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="text-xs bg-secondary border border-primary rounded-lg px-3 py-1.5 text-primary focus:border-indigo-500 outline-none"
        />
        <span className="text-xs text-muted">to</span>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="text-xs bg-secondary border border-primary rounded-lg px-3 py-1.5 text-primary focus:border-indigo-500 outline-none"
        />
        <button
          type="button"
          onClick={() => setFetchParams({ from, to })}
          className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Apply
        </button>
      </div>

      {history.data?.rows && history.data.rows.length > 0 && (
        <div className="bg-secondary rounded-xl border border-primary p-3">
          <PriceLineChart rows={history.data.rows} />
        </div>
      )}

      {history.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      ) : !history.data?.rows?.length ? (
        <div className="py-8 text-center text-muted text-sm">No history data</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-primary">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary border-b border-primary">
                {["Date", "Open", "High", "Low", "Close", "Volume"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...history.data.rows].reverse().map((row, i) => (
                <tr key={i} className="border-b border-primary/50 hover:bg-hover transition-colors">
                  <td className="px-3 py-2 font-mono text-secondary">{String(row[0])}</td>
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

function NewsTab({ symbol, symbolId }: { symbol: string; symbolId?: string }) {
  const news = useNewsRPMIndexedDataSearchResults(
    symbolId !== undefined
      ? {
          key: "symbolID",
          value: symbolId,
        }
      : undefined,
  );

  const rows = news.data?.rows ?? [];

  if (news.isLoading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  if (!rows.length) return <div className="py-8 text-center text-muted text-sm">No news found for {symbol}</div>;

  return (
    <div className="space-y-2">
      {rows.map((item: StockNewsItem, i: number) => {
        const slug = item.slug ?? item.Slug ?? "";
        const headline = item.headline ?? item.Headline ?? item.title ?? "(no headline)";
        const date = item.date ?? item.Date ?? item.publishDate ?? "";
        const provider = item.provider ?? item.Provider ?? item.source ?? "";
        const link = slug ? `https://www.financialcontent.com/article/${slug}` : (item.link ?? item.Link ?? "");
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-xl border border-primary hover:border-indigo-500/30 transition-colors group"
          >
            <Newspaper className="w-4 h-4 text-muted shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary leading-snug mb-1">{headline}</p>
              <div className="flex items-center gap-3">
                {provider && <span className="text-2xs text-muted">{provider}</span>}
                {date && <span className="text-2xs text-muted font-mono">{String(date).slice(0, 10)}</span>}
              </div>
            </div>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 text-muted hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all rounded-md focus-ring cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaders section ─────────────────────────────────────────────────────────

function LeadersSection({ onSymbolSelect }: { onSymbolSelect: (s: string) => void }) {
  const [leaderTab, setLeaderTab] = useState<"MOSTACTIVE" | "PERCENTGAINERS" | "PERCENTLOSERS">("MOSTACTIVE");
  const leaders = useStockLeaders(leaderTab, 10);

  const tabs = [
    { key: "MOSTACTIVE" as const, label: "Most Active", icon: <Zap className="w-3 h-3" /> },
    { key: "PERCENTGAINERS" as const, label: "Top Gainers", icon: <TrendingUp className="w-3 h-3" /> },
    { key: "PERCENTLOSERS" as const, label: "Top Losers", icon: <TrendingDown className="w-3 h-3" /> },
  ];

  const rows = leaders.data?.rows ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {tabs.map(t => (
          <button
            type="button"
            key={t.key}
            onClick={() => setLeaderTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring ${
              leaderTab === t.key ? "bg-indigo-600 text-white" : "bg-secondary text-muted hover:text-primary border border-primary"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {leaders.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
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
                const sym = row.Symbol ?? "";
                const name = row.Name ?? "";
                const price = row.Price ?? "";
                const change = row.Change ?? "";
                const changePct = row.ChangePercent ?? "";
                const vol = row.Volume ?? "";
                const isUp = Number(change) >= 0;
                return (
                  <tr
                    key={i}
                    onClick={() => sym && onSymbolSelect(sym.toUpperCase())}
                    className="border-b border-primary/50 hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2 font-bold text-indigo-400">{sym}</td>
                    <td className="px-3 py-2 text-secondary truncate max-w-40">{name}</td>
                    <td className="px-3 py-2 text-right font-medium text-primary">${fmtPrice(price)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                      <span className="flex items-center justify-end gap-0.5">
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {changeSign(change)}
                        {fmt(change)} ({changeSign(changePct)}
                        {fmt(changePct)}%)
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
  const [selectedType, setSelectedType] = useState("");
  const [question, setQuestion] = useState(`Analyze the stock ${symbol}. What do you think about the current price action and near-term outlook?`);
  const [launching, setLaunching] = useState(false);

  const firstType = agentTypes.data?.[0]?.type ?? "";
  const effectiveType = selectedType || firstType;

  const handleLaunch = useCallback(async () => {
    if (!effectiveType) return;
    setLaunching(true);
    try {
      const { id: agentId } = await agentRPCClient.createAgent({ agentType: effectiveType, headless: false });

      const contextData = {
        symbol,
        question,
        quote: quoteData,
        recentHistory: historyRows.slice(-20),
        fetchedAt: new Date().toISOString(),
      };
      const contextPath = `/tmp/tokenring-stock-${symbol}-${Date.now()}.json`;
      const fsState = await filesystemRPCClient.getFilesystemState({ agentId });
      if (fsState.status !== "success") throw new Error("Failed to get filesystem state");
      await filesystemRPCClient.writeFile({ path: contextPath, content: JSON.stringify(contextData, null, 2), provider: fsState.provider });
      await filesystemRPCClient.addFileToChat({ agentId, file: contextPath });

      onClose();
      void navigate(`/agent/${agentId}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to launch agent";
      toastManager.error(errorMessage, { duration: 5000 });
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

        <div>
          <label className="text-xs text-muted font-medium block mb-1">Your question</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
            className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 text-primary focus:border-indigo-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-muted font-medium block mb-1">Agent type</label>
          <select
            value={effectiveType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 text-primary focus:border-indigo-500 outline-none cursor-pointer"
          >
            {agentTypes.data?.map(t => (
              <option key={t.type} value={t.type}>
                {t.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm bg-secondary hover:bg-hover text-secondary border border-primary rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching || !effectiveType}
            className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <BotMessageSquare className="w-4 h-4" />}
            Launch Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Symbol search box (typeahead) ──────────────────────────────────────────

function SymbolSearchBox({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect: (sym: string) => void }) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 200);
    return () => clearTimeout(t);
  }, [value]);

  const search = useFindStock(debounced && debounced.length >= 1 ? debounced : undefined, 8);
  const results = useMemo(() => (search.data?.rows ?? []).filter(Boolean) as StockQuote[], [search.data]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handlePick = (sym: string) => {
    setOpen(false);
    onSelect(sym);
  };

  return (
    <div ref={wrapRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === "Enter" && results[0]?.Symbol) {
            e.preventDefault();
            handlePick(results[0].Symbol);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search by symbol or company name (e.g. AAPL, Apple)"
        className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-primary rounded-xl text-sm text-primary placeholder:text-muted focus:border-indigo-500 outline-none"
      />

      {open && debounced.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-primary border border-primary rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {search.isLoading && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </div>
          )}
          {!search.isLoading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted">No matches for "{debounced}"</div>
          )}
          {results.map((r, i) => {
            const sym = r.Symbol ?? "";
            const logo = (r as { CLIconBright128?: string }).CLIconBright128;
            const change = Number(r.Change ?? 0);
            const isUp = change >= 0;
            return (
              <button
                type="button"
                key={`${sym}-${i}`}
                onClick={() => handlePick(sym.toUpperCase())}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-hover transition-colors text-left border-b border-primary/40 last:border-0"
              >
                <div className="w-7 h-7 rounded-md bg-secondary border border-primary flex items-center justify-center overflow-hidden shrink-0">
                  {logo ? (
                    <img src={logo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-400">{sym}</span>
                    {r.ExchangeShortName && <span className="text-2xs text-muted">{r.ExchangeShortName}</span>}
                  </div>
                  <div className="text-xs text-muted truncate">{r.Name ?? r.ShortName ?? ""}</div>
                </div>
                {r.Price != null && (
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-primary">${fmtPrice(r.Price)}</div>
                    <div className={`text-2xs font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                      {changeSign(r.ChangePercent)}
                      {fmt(r.ChangePercent)}%
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── stock detail panel ───────────────────────────────────────────────────────

function StockDetail({ symbol, onClear }: { symbol: string; onClear: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [showAskAI, setShowAskAI] = useState(false);

  const quote = useStockQuote([symbol]);
  const history = useStockPriceHistory(symbol);
  const ticks = useStockPriceTicks(symbol);

  const quoteRow = quote.data?.rows?.[0] ?? null;

  const price = quoteRow?.Price;
  const change = quoteRow?.Change;
  const changePct = quoteRow?.ChangePercent;
  const companyName = quoteRow?.Name ?? symbol;
  const isUp = Number(change) > 0;
  const isDown = Number(change) < 0;
  const isFlat = !(isUp || isDown);

  const logo = (quoteRow as { CLLogoBright128?: string; CLIconBright128?: string } | null)?.CLLogoBright128 ?? (quoteRow as { CLIconBright128?: string } | null)?.CLIconBright128;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: "chart", label: "Chart", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: "history", label: "History", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "news", label: "News", icon: <Newspaper className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 py-4 bg-secondary border border-primary rounded-2xl">
        <div className="flex items-start gap-3 min-w-0">
          {logo && (
            <div className="w-12 h-12 rounded-lg bg-primary border border-primary flex items-center justify-center overflow-hidden shrink-0">
              <img src={logo} alt={`${symbol} logo`} className="w-full h-full object-contain p-1" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-lg font-bold text-indigo-400">{symbol}</span>
              {companyName !== symbol && <span className="text-sm text-secondary truncate">{companyName}</span>}
              {quoteRow?.ExchangeShortName && (
                <span className="text-2xs px-1.5 py-0.5 bg-primary border border-primary rounded text-muted">{quoteRow.ExchangeShortName}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              {quote.isLoading && !quoteRow ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              ) : price != null ? (
                <>
                  <span className="text-3xl font-bold text-primary">${fmtPrice(price)}</span>
                  {!isFlat && (
                    <span className={`flex items-center gap-0.5 text-sm font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                      {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {changeSign(change)}
                      {fmt(change)} ({changeSign(changePct)}
                      {fmt(changePct)}%)
                    </span>
                  )}
                  {quoteRow?.LastTradeTime && (
                    <span className="text-2xs text-muted">· {fmtTs(quoteRow.LastTradeTime, "datetime")}</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted">Price unavailable</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAskAI(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <BotMessageSquare className="w-3.5 h-3.5" />
            Ask AI
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 text-xs text-muted hover:text-primary bg-secondary border border-primary rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-primary pb-0 mb-1">
        {tabs.map(t => (
          <button
            type="button"
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer focus-ring ${
              tab === t.key ? "border-indigo-500 text-primary" : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && <OverviewTab quote={quoteRow} history={history.data?.rows} />}
        {tab === "chart" && <ChartTab symbol={symbol} />}
        {tab === "history" && <HistoryTab symbol={symbol} />}
        {tab === "news" && <NewsTab symbol={symbol} {...(quoteRow?.SymbolID !== undefined && { symbolId: quoteRow.SymbolID })} />}
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
  const [inputValue, setInputValue] = useState("");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  const handleSymbolSelect = useCallback((sym: string) => {
    const upper = sym.toUpperCase();
    setInputValue(upper);
    setActiveSymbol(upper);
  }, []);

  const quickSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY"];

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-y-auto">
      <div className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header + search */}
          <div>
            <h1 className="text-primary text-2xl font-bold tracking-tight mb-1">Stocks</h1>
            <p className="text-xs text-muted mb-4">Real-time quotes, charts, history, and news</p>

            <div className="flex gap-2">
              <SymbolSearchBox value={inputValue} onChange={setInputValue} onSelect={handleSymbolSelect} />
            </div>

            {/* Quick symbols */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickSymbols.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleSymbolSelect(s)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer focus-ring border ${
                    activeSymbol === s
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                      : "bg-secondary border-primary text-muted hover:text-primary hover:border-indigo-500/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stock detail */}
          {activeSymbol && (
            <StockDetail
              symbol={activeSymbol}
              onClear={() => {
                setActiveSymbol(null);
                setInputValue("");
              }}
            />
          )}

          {/* Market leaders */}
          <div>
            <p className="text-2xs font-bold text-muted uppercase tracking-widest px-1 mb-3">Market Leaders</p>
            <LeadersSection onSymbolSelect={handleSymbolSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
