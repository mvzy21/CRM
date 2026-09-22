import { Link } from "@tanstack/react-router";
import { Building2, Contact, Flame, Handshake, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  type SearchHit,
  type SearchKind,
  type SearchResults,
  searchRecords,
} from "#/lib/supabase/search.ts";

const KIND_META: Record<SearchKind, { label: string; icon: typeof Building2 }> =
  {
    company: { label: "Company", icon: Building2 },
    contact: { label: "Contact", icon: Contact },
    lead: { label: "Lead", icon: Flame },
    deal: { label: "Deal", icon: Handshake },
  };

const ALL_KINDS: SearchKind[] = ["company", "contact", "lead", "deal"];

interface SearchViewProps {
  workspaceId: string;
}

/** US-28: search and filter companies, contacts, leads and deals. */
export function SearchView({ workspaceId }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<SearchKind[]>(ALL_KINDS);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Starting from "all four active" and letting a click just remove that
  // one kind meant clicking **Contact** -- which a user reasonably reads as
  // "show me contacts" -- actually excluded contacts and searched the
  // other three, the exact inverse of what the chip says. Clicking a kind
  // now isolates to just that one; clicking the sole active kind again
  // resets back to all four, so there's still a way to search everything.
  function toggleKind(kind: SearchKind) {
    setKinds((current) =>
      current.length === 1 && current[0] === kind ? ALL_KINDS : [kind],
    );
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2 || kinds.length === 0) return;
    setSearching(true);
    const result = await searchRecords({ data: { query, kinds } });
    setSearching(false);
    if (result.success) {
      setResults(result.results);
      setError(null);
    } else {
      setResults(null);
      setError(result.message);
    }
  }

  // Companies and contacts have no per-record detail route -- send the
  // click to the list page they live on, same as the Ctrl/Cmd+K palette.
  function hitTarget(hit: SearchHit) {
    if (hit.kind === "lead") {
      return {
        to: "/workspace/$workspaceId/leads/$leadId" as const,
        params: { workspaceId, leadId: hit.id },
      };
    }
    if (hit.kind === "deal") {
      return {
        to: "/workspace/$workspaceId/deals/$dealId" as const,
        params: { workspaceId, dealId: hit.id },
      };
    }
    if (hit.kind === "company") {
      return {
        to: "/workspace/$workspaceId/companies" as const,
        params: { workspaceId },
      };
    }
    return {
      to: "/workspace/$workspaceId/contacts" as const,
      params: { workspaceId },
    };
  }

  return (
    <div>
      <div>
        <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          Search
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
          Find companies, contacts, leads and deals across the workspace.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex max-w-xl gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, title or requirements…"
          aria-label="Search term"
        />
        <Button
          type="submit"
          disabled={searching || query.trim().length < 2 || kinds.length === 0}
        >
          <Search className="h-4 w-4" />
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {ALL_KINDS.map((kind) => {
          const active = kinds.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper,#fff)]"
                  : "border-[var(--line)] text-[var(--ink-soft)]"
              }`}
            >
              {KIND_META[kind].label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      {results ? (
        results.hits.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--ink-soft)]">
            Nothing matched &ldquo;{results.query}&rdquo;. Try a shorter term or
            widen the filters above.
          </p>
        ) : (
          <div className="panel mt-6 overflow-hidden rounded-2xl">
            <p className="border-b border-[var(--line)] px-5 py-3 text-xs text-[var(--ink-soft)]">
              {results.hits.length} result
              {results.hits.length === 1 ? "" : "s"} for &ldquo;{results.query}
              &rdquo;
              {results.truncated ? " (showing the first matches per type)" : ""}
            </p>
            <ul>
              {results.hits.map((hit) => {
                const Icon = KIND_META[hit.kind].icon;
                return (
                  <li
                    key={`${hit.kind}-${hit.id}`}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <Link
                      {...hitTarget(hit)}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--muted)]"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {hit.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                          {KIND_META[hit.kind].label}
                          {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
