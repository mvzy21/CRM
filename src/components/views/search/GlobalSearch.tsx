import { useNavigate } from "@tanstack/react-router";
import { Building2, Contact, Flame, Handshake, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  type SearchHit,
  type SearchKind,
  searchRecords,
} from "#/lib/supabase/search.ts";

const KIND_META: Record<SearchKind, { label: string; icon: typeof Building2 }> = {
  company: { label: "Company", icon: Building2 },
  contact: { label: "Contact", icon: Contact },
  lead: { label: "Lead", icon: Flame },
  deal: { label: "Deal", icon: Handshake },
};

interface GlobalSearchProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * US-28, reachable from anywhere: a Ctrl/Cmd+K palette over live results,
 * rather than search only existing as its own destination page. The
 * dedicated Search page stays for deliberate, filterable browsing; this is
 * for "I know roughly what I'm looking for, get me there in two keystrokes."
 */
export function GlobalSearch({
  workspaceId,
  open,
  onOpenChange,
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits(null);
    setActiveIndex(0);
    // Dialog mounts and focuses asynchronously; a raf beats the dialog's
    // own focus management.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await searchRecords({ data: { query } });
      if (cancelled) return;
      setHits(result.success ? result.results.hits : []);
      setActiveIndex(0);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function go(hit: SearchHit) {
    onOpenChange(false);
    if (hit.kind === "lead") {
      navigate({
        to: "/workspace/$workspaceId/leads/$leadId",
        params: { workspaceId, leadId: hit.id },
      });
    } else if (hit.kind === "deal") {
      navigate({
        to: "/workspace/$workspaceId/deals/$dealId",
        params: { workspaceId, dealId: hit.id },
      });
    } else if (hit.kind === "company") {
      navigate({ to: "/workspace/$workspaceId/companies", params: { workspaceId } });
    } else {
      navigate({ to: "/workspace/$workspaceId/contacts", params: { workspaceId } });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!hits || hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[activeIndex];
      if (hit) go(hit);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] max-w-xl translate-y-0 gap-0 p-0"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search companies, contacts, leads, deals…"
            className="border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)] sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--ink-soft)]">
              Type at least 2 characters to search.
            </p>
          ) : hits === null ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--ink-soft)]">
              Searching…
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--ink-soft)]">
              Nothing matched &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul>
              {hits.map((hit, i) => {
                const Icon = KIND_META[hit.kind].icon;
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
                        i === activeIndex ? "bg-[var(--muted)]" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--ink)]">
                          {hit.title}
                        </span>
                        <span className="block truncate text-xs text-[var(--ink-soft)]">
                          {KIND_META[hit.kind].label}
                          {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
