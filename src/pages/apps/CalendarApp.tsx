import errorAsString from "@tokenring-ai/utility/error/errorAsString";
import {
  Bot,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toastManager } from "../../components/ui/toast.tsx";
import { cn } from "../../lib/utils.ts";
import { agentRPCClient, useAgentTypes, useCalendarEvents, useCalendarProviders, useWorkflows, workflowRPCClient } from "../../rpc.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (omit for all-day)
  endTime?: string; // HH:MM
  type: "agent" | "workflow" | "calendar";
  agentType?: string;
  workflowKey?: string;
  color: string;
  allDay?: boolean;
  source?: "local" | "rpc";
  description?: string;
  location?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "tokenring:calendar:events";

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function rpcToLocalEvent(ev: any): CalendarEvent {
  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const fmt = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return {
    id: ev.id,
    title: ev.title,
    date: toDateKey(start),
    ...(!ev.allDay && {
      startTime: fmt(start.getHours(), start.getMinutes()),
      endTime: fmt(end.getHours(), end.getMinutes()),
    }),
    allDay: ev.allDay ?? false,
    type: "calendar",
    color: "bg-indigo-500",
    source: "rpc",
    description: ev.description,
    location: ev.location,
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Provider selector ────────────────────────────────────────────────────────

function ProviderSelector({
  provider,
  availableProviders,
  loading,
  onProviderChange,
}: {
  provider: string | null;
  availableProviders: string[];
  loading: boolean;
  onProviderChange: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (loading && availableProviders.length === 0) {
    return (
      <span className="text-2xs text-muted flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading providers
      </span>
    );
  }

  if (availableProviders.length === 0) {
    return (
      <span className="text-2xs text-muted flex items-center gap-1">
        <WifiOff className="w-3 h-3" /> No providers
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-primary rounded-lg text-xs text-muted hover:text-primary hover:border-sky-500/40 transition-all focus-ring cursor-pointer"
      >
        <Globe className="w-3 h-3" />
        <span className="font-medium text-primary max-w-32 truncate">{provider ?? "No provider"}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-secondary border border-primary rounded-xl shadow-card z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-primary">
            <p className="text-2xs font-semibold text-muted uppercase tracking-wider">Switch Provider</p>
          </div>
          {availableProviders.map(p => (
            <button
              type="button"
              key={p}
              onClick={() => {
                onProviderChange(p);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-hover transition-colors cursor-pointer text-left focus-ring ${p === provider ? "text-sky-500 font-medium" : "text-primary"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p === provider ? "bg-sky-500" : "bg-transparent"}`} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EVENT_COLORS = [
  { label: "Sky", value: "bg-sky-500", text: "text-sky-500", border: "border-sky-500" },
  { label: "Indigo", value: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500" },
  { label: "Violet", value: "bg-violet-500", text: "text-violet-500", border: "border-violet-500" },
  { label: "Rose", value: "bg-rose-500", text: "text-rose-500", border: "border-rose-500" },
  { label: "Amber", value: "bg-amber-500", text: "text-amber-500", border: "border-amber-500" },
  { label: "Emerald", value: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500" },
  { label: "Cyan", value: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500" },
];

// ─── Event chip ───────────────────────────────────────────────────────────────

function EventChip({ event, onClick, compact = false }: { event: CalendarEvent; onClick: () => void; compact?: boolean }) {
  const TypeIcon = event.type === "workflow" ? GitBranch : event.type === "calendar" ? Calendar : Bot;
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-left cursor-pointer hover:opacity-90 transition-opacity truncate",
        event.color,
        compact ? "text-2xs" : "text-xs",
      )}
      aria-label={`Event: ${event.title}`}
    >
      <TypeIcon className="shrink-0" size={compact ? 8 : 10} />
      <span className="truncate">
        {compact ? "" : event.startTime ? `${event.startTime} ` : ""}
        {event.title}
      </span>
    </button>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  today,
  events,
  onDayClick,
  onEventClick,
}: {
  year: number;
  month: number;
  today: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const todayKey = toDateKey(today);

  // Build 6-row × 7-col grid
  const firstOfMonth = new Date(year, month, 1);
  const startDay = startOfWeek(firstOfMonth);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(startDay, i));

  const byDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (m[ev.date] ||= []).push(ev);
    }
    return m;
  }, [events]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-primary">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-2xs font-semibold text-muted uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      {/* Date grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
        {cells.map((cell, i) => {
          const key = toDateKey(cell);
          const isToday = key === todayKey;
          const isCurrentMonth = cell.getMonth() === month;
          const dayEvents = byDate[key] ?? [];
          const showMax = 3;
          const overflow = dayEvents.length - showMax;
          return (
            <div
              key={i}
              onClick={() => onDayClick(cell)}
              className={cn(
                "border-b border-r border-primary min-h-20 p-1 cursor-pointer hover:bg-hover transition-colors",
                i % 7 === 0 && "border-l-0",
                !isCurrentMonth && "bg-secondary/40",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday && "bg-sky-500 text-white font-bold",
                    !isToday && isCurrentMonth && "text-primary",
                    !isToday && !isCurrentMonth && "text-muted",
                  )}
                >
                  {cell.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, showMax).map(ev => (
                  <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDayClick(cell);
                    }}
                    className="text-2xs text-muted hover:text-primary transition-colors w-full text-left px-1"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_H = 56; // px per hour

function WeekView({
  weekStart,
  today,
  events,
  onSlotClick,
  onEventClick,
}: {
  weekStart: Date;
  today: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const todayKey = toDateKey(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_H - 20;
    }
  }, []);

  const byDateHour = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!ev.startTime) continue;
      const hour = parseInt(ev.startTime.split(":")[0], 10);
      const k = `${ev.date}:${hour}`;
      (m[k] ||= []).push(ev);
    }
    return m;
  }, [events]);

  const allDayByDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (ev.allDay || !ev.startTime) (m[ev.date] ||= []).push(ev);
    }
    return m;
  }, [events]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day header */}
      <div className="flex border-b border-primary shrink-0">
        <div className="w-14 shrink-0" />
        {days.map(day => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex-1 py-2 text-center border-l border-primary">
              <div className={cn("text-2xs font-medium uppercase tracking-wider", isToday ? "text-sky-500" : "text-muted")}>
                {WEEKDAYS_LETTER[day.getDay()]}
              </div>
              <div
                className={cn(
                  "text-sm font-bold mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full",
                  isToday ? "bg-sky-500 text-white" : "text-primary",
                )}
              >
                {day.getDate()}
              </div>
              {/* All-day events */}
              <div className="mt-1 px-1 space-y-0.5 min-h-1">
                {(allDayByDate[key] ?? []).map(ev => (
                  <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: `${24 * HOUR_H}px` }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-2 text-2xs text-muted"
                style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
              >
                {h === 0 ? "" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map(day => {
            const dayKey = toDateKey(day);
            return (
              <div key={dayKey} className="flex-1 relative border-l border-primary">
                {HOURS.map(h => (
                  <div
                    key={h}
                    onClick={() => onSlotClick(day, h)}
                    className="absolute left-0 right-0 border-b border-primary/40 hover:bg-sky-500/5 cursor-pointer transition-colors"
                    style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
                  />
                ))}
                {/* Events */}
                {Object.entries(byDateHour)
                  .filter(([k]) => k.startsWith(dayKey))
                  .flatMap(([, evs]) => evs)
                  .map(ev => {
                    const [h, min] = ev.startTime!.split(":").map(Number);
                    const [eh, emin] = ev.endTime ? ev.endTime.split(":").map(Number) : [h + 1, min];
                    const top = (h + min / 60) * HOUR_H;
                    const height = Math.max((eh - h + (emin - min) / 60) * HOUR_H, 20);
                    return (
                      <button
                        type="button"
                        key={ev.id}
                        onClick={e => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                        className={cn(
                          "absolute left-1 right-1 rounded px-1.5 py-0.5 text-white text-2xs font-medium cursor-pointer hover:opacity-90 transition-opacity text-left overflow-hidden",
                          ev.color,
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {ev.type === "workflow" ? <GitBranch size={8} className="shrink-0" /> : <Bot size={8} className="shrink-0" />}
                          {ev.title}
                        </div>
                        {ev.startTime && <div className="text-white/70">{ev.startTime}</div>}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  date,
  today,
  events,
  onSlotClick,
  onEventClick,
}: {
  date: Date;
  today: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const dayKey = toDateKey(date);
  const isToday = dayKey === toDateKey(today);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_H - 20;
  }, []);

  const dayEvents = useMemo(() => events.filter(ev => ev.date === dayKey && ev.startTime), [events, dayKey]);

  const allDay = useMemo(() => events.filter(ev => ev.date === dayKey && (ev.allDay || !ev.startTime)), [events, dayKey]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-primary shrink-0">
        <div className={cn("text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full", isToday ? "bg-sky-500 text-white" : "text-primary")}>
          {date.getDate()}
        </div>
        <div>
          <div className={cn("text-sm font-semibold", isToday ? "text-sky-500" : "text-primary")}>{WEEKDAYS_SHORT[date.getDay()]}</div>
          <div className="text-2xs text-muted">
            {MONTHS[date.getMonth()]} {date.getFullYear()}
          </div>
        </div>
        {allDay.length > 0 && (
          <div className="ml-4 flex gap-1 flex-wrap">
            {allDay.map(ev => (
              <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
            ))}
          </div>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${24 * HOUR_H}px` }}>
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-2 text-2xs text-muted"
                style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
              >
                {h === 0 ? "" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`}
              </div>
            ))}
          </div>
          <div className="flex-1 relative border-l border-primary">
            {HOURS.map(h => (
              <div
                key={h}
                onClick={() => onSlotClick(date, h)}
                className="absolute left-0 right-0 border-b border-primary/40 hover:bg-sky-500/5 cursor-pointer transition-colors"
                style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
              />
            ))}
            {dayEvents.map(ev => {
              const [h, min] = ev.startTime!.split(":").map(Number);
              const [eh, emin] = ev.endTime ? ev.endTime.split(":").map(Number) : [h + 1, min];
              const top = (h + min / 60) * HOUR_H;
              const height = Math.max((eh - h + (emin - min) / 60) * HOUR_H, 24);
              return (
                <button
                  type="button"
                  key={ev.id}
                  onClick={e => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                  className={cn(
                    "absolute left-2 right-2 rounded-lg px-2 py-1 text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity text-left overflow-hidden shadow-sm",
                    ev.color,
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex items-center gap-1.5 truncate font-semibold">
                    {ev.type === "workflow" ? <GitBranch size={10} className="shrink-0" /> : <Bot size={10} className="shrink-0" />}
                    {ev.title}
                  </div>
                  {ev.startTime && (
                    <div className="text-white/80 text-2xs">
                      {ev.startTime}
                      {ev.endTime ? ` – ${ev.endTime}` : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Event modal ──────────────────────────────────────────────────────────────

interface EventModalProps {
  event: CalendarEvent | null;
  defaultDate: string;
  defaultHour: number | null;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onRun: (event: CalendarEvent) => void;
  running: boolean;
}

function EventModal({ event, defaultDate, defaultHour, onClose, onSave, onDelete, onRun, running }: EventModalProps) {
  const agentTypes = useAgentTypes();
  const workflows = useWorkflows();

  const isNew = !event;
  const defaultTime = defaultHour != null ? `${String(defaultHour).padStart(2, "0")}:00` : undefined;

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(event?.startTime ?? defaultTime ?? "09:00");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? !defaultTime);
  const [type, setType] = useState<"agent" | "workflow" | "calendar">(event?.type ?? "workflow");
  const [agentType, setAgentType] = useState(event?.agentType ?? "");
  const [workflowKey, setWorkflowKey] = useState(event?.workflowKey ?? "");
  const [color, setColor] = useState(event?.color ?? EVENT_COLORS[0].value);

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!title.trim()) {
      toastManager.error("Title is required");
      return;
    }
    if (type === "workflow" && !workflowKey) {
      toastManager.error("Select a workflow");
      return;
    }
    if (type === "agent" && !agentType) {
      toastManager.error("Select an agent type");
      return;
    }
    onSave({
      id: event?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      ...(!allDay && startTime && { startTime }),
      ...(!allDay && endTime && { endTime }),
      allDay,
      type,
      ...(type === "agent" && agentType !== undefined && { agentType }),
      ...(type === "workflow" && workflowKey !== undefined && { workflowKey }),
      color,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-primary border border-primary rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-base font-bold text-primary">{isNew ? "New Scheduled Event" : "Edit Event"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-hover transition-colors text-muted hover:text-primary cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">Title</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Event title…"
              className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Date + All-day */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded accent-sky-500" />
              <span className="text-xs text-primary">All day</span>
            </label>
          </div>

          {/* Time */}
          {!allDay && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">End time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Run type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("workflow")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                  type === "workflow" ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-primary text-muted hover:border-sky-500/40 hover:text-primary",
                )}
              >
                <GitBranch size={14} /> Workflow
              </button>
              <button
                type="button"
                onClick={() => setType("agent")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                  type === "agent" ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-primary text-muted hover:border-sky-500/40 hover:text-primary",
                )}
              >
                <Bot size={14} /> Agent
              </button>
            </div>
          </div>

          {/* Workflow / Agent selector */}
          {type === "workflow" ? (
            <div>
              <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">Workflow</label>
              {workflows.isLoading ? (
                <div className="flex items-center gap-2 text-muted text-xs py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : (workflows.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted py-1">
                  No workflows defined in <code>.tokenring/workflows/</code>
                </p>
              ) : (
                <select
                  value={workflowKey}
                  onChange={e => setWorkflowKey(e.target.value)}
                  className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                >
                  <option value="">Select a workflow…</option>
                  {workflows.data!.map(w => (
                    <option key={w.name} value={w.name}>
                      {w.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1">Agent type</label>
              {agentTypes.isLoading ? (
                <div className="flex items-center gap-2 text-muted text-xs py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  value={agentType}
                  onChange={e => setAgentType(e.target.value)}
                  className="w-full bg-secondary border border-primary rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                >
                  <option value="">Select an agent type…</option>
                  {agentTypes.data?.map(t => (
                    <option key={t.type} value={t.type}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Color */}
          <div>
            <label className="text-2xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Color</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map(c => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all cursor-pointer focus:outline-none",
                    c.value,
                    color === c.value ? "ring-2 ring-offset-2 ring-offset-primary ring-white/70 scale-110" : "hover:scale-105",
                  )}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => onRun(event!)}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {running ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
              Run now
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => onDelete(event!.id)}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-500/40 hover:bg-rose-500/10 text-rose-500 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted hover:text-primary transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RPC event detail ─────────────────────────────────────────────────────────

function RpcEventDetail({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-primary border border-primary rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={16} className="shrink-0 text-indigo-500" />
            <h2 className="text-base font-bold text-primary truncate">{event.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg hover:bg-hover transition-colors text-muted hover:text-primary cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={14} className="shrink-0" />
            <span>
              {event.date}
              {event.allDay ? " · All day" : event.startTime ? ` · ${event.startTime}${event.endTime ? ` – ${event.endTime}` : ""}` : ""}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2 text-sm text-muted">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && <p className="text-xs text-primary/80 pt-1 whitespace-pre-wrap">{event.description}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarApp() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [defaultHour, setDefaultHour] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  // Calendar provider state
  const providers = useCalendarProviders();
  const [provider, setProvider] = useState<string | null>(null);
  const [rpcDetailEvent, setRpcDetailEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const available = providers.data?.providers ?? [];
    if (!available.length) return;
    if (!provider || !available.includes(provider)) {
      setProvider(available[0]);
    }
  }, [providers.data, provider]);

  const { fetchFrom, fetchTo } = useMemo(() => {
    let from: Date, to: Date;
    if (view === "month") {
      from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (view === "week") {
      from = startOfWeek(cursor);
      to = addDays(from, 7);
      to.setHours(23, 59, 59, 999);
    } else {
      from = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      to = addDays(from, 1);
    }
    return { fetchFrom: from.toISOString(), fetchTo: to.toISOString() };
  }, [view, cursor]);

  const rpcEventsResult = useCalendarEvents(provider ?? undefined, fetchFrom, fetchTo);

  const allEvents = useMemo(() => {
    const rpc = (rpcEventsResult.data?.events ?? []).map(rpcToLocalEvent);
    return [...events, ...rpc];
  }, [events, rpcEventsResult.data]);

  // Persist events
  useEffect(() => {
    saveEvents(events);
  }, [events]);

  // Navigation
  const goNext = useCallback(() => {
    setCursor(c => {
      const n = new Date(c);
      if (view === "month") n.setMonth(n.getMonth() + 1);
      else if (view === "week") n.setDate(n.getDate() + 7);
      else n.setDate(n.getDate() + 1);
      return n;
    });
  }, [view]);

  const goPrev = useCallback(() => {
    setCursor(c => {
      const n = new Date(c);
      if (view === "month") n.setMonth(n.getMonth() - 1);
      else if (view === "week") n.setDate(n.getDate() - 7);
      else n.setDate(n.getDate() - 1);
      return n;
    });
  }, [view]);

  const goToday = useCallback(() => {
    if (view === "month") setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    else setCursor(new Date(today));
  }, [view, today]);

  // Title bar label
  const titleLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) return `${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`;
      return `${MONTHS[ws.getMonth()].slice(0, 3)} – ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
    }
    return `${MONTHS[cursor.getMonth()]} ${cursor.getDate()}, ${cursor.getFullYear()}`;
  }, [view, cursor]);

  // Open new-event modal
  const openNew = useCallback(
    (date?: Date, hour?: number) => {
      setEditingEvent(null);
      setDefaultDate(toDateKey(date ?? today));
      setDefaultHour(hour ?? null);
      setModalOpen(true);
    },
    [today],
  );

  const openEdit = useCallback((ev: CalendarEvent) => {
    if (ev.source === "rpc") {
      setRpcDetailEvent(ev);
      return;
    }
    setEditingEvent(ev);
    setDefaultDate(ev.date);
    setDefaultHour(null);
    setModalOpen(true);
  }, []);

  // Day click in month view → switch to day view
  const handleDayClick = useCallback((date: Date) => {
    setCursor(date);
    setView("day");
  }, []);

  // Slot click in week/day view → open new event
  const handleSlotClick = useCallback(
    (date: Date, hour: number) => {
      openNew(date, hour);
    },
    [openNew],
  );

  const handleSaveEvent = useCallback((ev: CalendarEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      return idx >= 0 ? prev.map((e, i) => (i === idx ? ev : e)) : [...prev, ev];
    });
    setModalOpen(false);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  }, []);

  const handleRunEvent = useCallback(
    async (ev: CalendarEvent) => {
      setRunning(true);
      try {
        if (ev.type === "workflow" && ev.workflowKey) {
          const { id } = await workflowRPCClient.spawnWorkflow({ name: ev.workflowKey, headless: false });
          setModalOpen(false);
          void navigate(`/agent/${id}`);
        } else if (ev.type === "agent" && ev.agentType) {
          const { id } = await agentRPCClient.createAgent({ agentType: ev.agentType, headless: false });
          setModalOpen(false);
          void navigate(`/agent/${id}`);
        }
      } catch (error) {
        toastManager.error(errorAsString(error));
      } finally {
        setRunning(false);
      }
    },
    [navigate],
  );

  // View-specific props
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary shrink-0 bg-primary">
        {/* Nav arrows + today */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold border border-primary rounded-lg hover:bg-hover text-primary transition-colors cursor-pointer ml-1"
          >
            Today
          </button>
        </div>

        {/* Title */}
        <h2 className="text-sm font-bold text-primary ml-1 flex items-center gap-2">
          <CalendarDays size={16} className="text-sky-500" />
          {titleLabel}
        </h2>

        <div className="flex-1" />

        {/* Provider selector */}
        <ProviderSelector
          provider={provider}
          availableProviders={providers.data?.providers ?? []}
          loading={providers.isLoading}
          onProviderChange={setProvider}
        />

        {/* View switcher */}
        <div className="flex items-center bg-secondary border border-primary rounded-lg p-0.5 text-xs font-medium">
          {(["month", "week", "day"] as ViewMode[]).map(v => (
            <button
              type="button"
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 rounded-md capitalize transition-all cursor-pointer",
                view === v ? "bg-sky-500 text-white shadow-sm" : "text-muted hover:text-primary",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* New event */}
        <button
          type="button"
          onClick={() => openNew()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={14} /> New event
        </button>
      </div>

      {/* Calendar body */}
      {view === "month" && (
        <MonthView year={cursor.getFullYear()} month={cursor.getMonth()} today={today} events={allEvents} onDayClick={handleDayClick} onEventClick={openEdit} />
      )}
      {view === "week" && <WeekView weekStart={weekStart} today={today} events={allEvents} onSlotClick={handleSlotClick} onEventClick={openEdit} />}
      {view === "day" && <DayView date={cursor} today={today} events={allEvents} onSlotClick={handleSlotClick} onEventClick={openEdit} />}

      {/* Scheduler event modal */}
      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={defaultDate}
          defaultHour={defaultHour}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onRun={handleRunEvent}
          running={running}
        />
      )}

      {/* RPC calendar event detail */}
      {rpcDetailEvent && <RpcEventDetail event={rpcDetailEvent} onClose={() => setRpcDetailEvent(null)} />}
    </div>
  );
}
