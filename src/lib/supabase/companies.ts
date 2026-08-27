import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "./access.ts";

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

export const listCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { success: true; companies: Company[] }
    | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("companies")
      .select(
        "id, name, industry, owner_id, created_at, profiles(display_name, email)",
      )
      .order("created_at", { ascending: false });

    if (error) return { success: false, message: "Failed to load companies." };

    const companies: Company[] = data.map((row) => {
      // Supabase's untyped client infers this many-to-one embed as an array,
      // but PostgREST actually returns a single object (or null) for it.
      const owner = row.profiles as unknown as {
        display_name: string | null;
        email: string | null;
      } | null;
      return {
        id: row.id,
        name: row.name,
        industry: row.industry,
        ownerId: row.owner_id,
        ownerName: owner?.display_name ?? owner?.email ?? null,
        createdAt: row.created_at,
      };
    });

    return { success: true, companies };
  },
);

const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  industry: z.string().trim().max(100).optional().or(z.literal("")),
});

export const createCompany = createServerFn({ method: "POST" })
  .validator(createCompanySchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["sales_rep"]);
    if (!check.ok) return { success: false, message: check.message };

    // Case/whitespace-insensitive dupe check, scoped to the org -- "Acme"
    // and " acme " shouldn't both end up as separate rows.
    const { data: existing, error: lookupError } = await check.supabase
      .from("companies")
      .select("id, name")
      .eq("org_id", check.orgId);

    if (lookupError) {
      return { success: false, message: "Failed to create company." };
    }

    const normalizedName = data.name.trim().toLowerCase();
    if (
      existing.some((row) => row.name.trim().toLowerCase() === normalizedName)
    ) {
      return {
        success: false,
        message: `A company named "${data.name.trim()}" already exists.`,
      };
    }

    const { error } = await check.supabase.from("companies").insert({
      name: data.name,
      industry: data.industry || null,
      org_id: check.orgId,
      owner_id: check.userId,
    });

    if (error) {
      // Belt-and-braces against the lookup-then-insert race above: two
      // concurrent creates can both pass the check, so the DB-level unique
      // index (unique-name-per-org.sql) is the real backstop -- this turns
      // its raw constraint violation into the same friendly message.
      if (error.code === "23505") {
        return {
          success: false,
          message: `A company named "${data.name.trim()}" already exists.`,
        };
      }
      return { success: false, message: "Failed to create company." };
    }
    return { success: true };
  });

const updateCompanySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1, "Company name is required").max(200),
  industry: z.string().trim().max(100).optional().or(z.literal("")),
});

export const updateCompany = createServerFn({ method: "POST" })
  .validator(updateCompanySchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: existing, error: lookupError } = await check.supabase
      .from("companies")
      .select("id, name")
      .eq("org_id", check.orgId)
      .neq("id", data.companyId);

    if (lookupError) {
      return { success: false, message: "Failed to update company." };
    }

    const normalizedName = data.name.trim().toLowerCase();
    if (
      existing.some((row) => row.name.trim().toLowerCase() === normalizedName)
    ) {
      return {
        success: false,
        message: `A company named "${data.name.trim()}" already exists.`,
      };
    }

    const { data: updated, error } = await check.supabase
      .from("companies")
      .update({ name: data.name, industry: data.industry || null })
      .eq("id", data.companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: `A company named "${data.name.trim()}" already exists.`,
        };
      }
      return { success: false, message: "Failed to update company." };
    }
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this company.",
      };
    }

    return { success: true };
  });
