import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";

// US-28: find companies, contacts, leads and deals quickly. Open to any
// authenticated user -- the org-wide select policies already decide what
// is visible, so search doesn't widen access, it just reaches it faster.

export type SearchKind = "company" | "contact" | "lead" | "deal";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
}

export interface SearchResults {
  query: string;
  hits: SearchHit[];
  truncated: boolean;
}

const PER_KIND_LIMIT = 10;

const searchSchema = z.object({
  query: z.string().trim().min(2, "Enter at least two characters").max(200),
  kinds: z
    .array(z.enum(["company", "contact", "lead", "deal"]))
    .min(1)
    .optional(),
});

/**
 * PostgREST treats , and . as syntax inside an `or()` filter, and % as a
 * wildcard, so a raw search term can otherwise break the query or match
 * far more than the user typed.
 */
function escapeForFilter(term: string): string {
  return term
    .replace(/[%_\\]/g, (match) => `\\${match}`)
    .replace(/[(),.]/g, " ");
}

export const searchRecords = createServerFn({ method: "GET" })
  .validator(searchSchema)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; results: SearchResults }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const term = escapeForFilter(data.query).trim();
      if (term.length < 2) {
        return {
          success: false,
          message: "Enter at least two searchable characters.",
        };
      }
      const pattern = `%${term}%`;
      const wanted = new Set<SearchKind>(
        data.kinds ?? ["company", "contact", "lead", "deal"],
      );

      const [companies, contacts, leads, deals] = await Promise.all([
        wanted.has("company")
          ? check.supabase
              .from("companies")
              .select("id, name, industry")
              .or(`name.ilike.${pattern},industry.ilike.${pattern}`)
              .limit(PER_KIND_LIMIT)
          : Promise.resolve({ data: [], error: null }),
        wanted.has("contact")
          ? check.supabase
              .from("contacts")
              .select("id, name, email, phone")
              .or(
                `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
              )
              .limit(PER_KIND_LIMIT)
          : Promise.resolve({ data: [], error: null }),
        wanted.has("lead")
          ? check.supabase
              .from("leads")
              .select("id, title, status, description, requirements")
              .or(
                `title.ilike.${pattern},description.ilike.${pattern},requirements.ilike.${pattern}`,
              )
              .limit(PER_KIND_LIMIT)
          : Promise.resolve({ data: [], error: null }),
        wanted.has("deal")
          ? check.supabase
              .from("deals")
              .select("id, title, stage, status, requirements")
              .or(`title.ilike.${pattern},requirements.ilike.${pattern}`)
              .limit(PER_KIND_LIMIT)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (companies.error || contacts.error || leads.error || deals.error) {
        return { success: false, message: "Search failed." };
      }

      const hits: SearchHit[] = [
        ...(companies.data ?? []).map((row) => ({
          kind: "company" as const,
          id: row.id as string,
          title: row.name as string,
          subtitle: (row.industry as string | null) ?? null,
        })),
        ...(contacts.data ?? []).map((row) => ({
          kind: "contact" as const,
          id: row.id as string,
          title: row.name as string,
          subtitle: [row.email, row.phone].filter(Boolean).join(" · ") || null,
        })),
        ...(leads.data ?? []).map((row) => ({
          kind: "lead" as const,
          id: row.id as string,
          title: row.title as string,
          subtitle: (row.status as string | null) ?? null,
        })),
        ...(deals.data ?? []).map((row) => ({
          kind: "deal" as const,
          id: row.id as string,
          title: row.title as string,
          subtitle: [row.stage, row.status].filter(Boolean).join(" · ") || null,
        })),
      ];

      return {
        success: true,
        results: {
          query: data.query,
          hits,
          truncated: [companies, contacts, leads, deals].some(
            (result) => (result.data ?? []).length === PER_KIND_LIMIT,
          ),
        },
      };
    },
  );
