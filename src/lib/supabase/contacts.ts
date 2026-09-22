import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "./access.ts";
import type { createServerSupabaseClient } from "./server.ts";

type Supabase = ReturnType<typeof createServerSupabaseClient>;

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

export const listContacts = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; contacts: Contact[] } | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("contacts")
      .select(
        "id, name, email, phone, owner_id, created_at, companies(id, name)",
      )
      .order("created_at", { ascending: false });

    if (error) return { success: false, message: "Failed to load contacts." };

    const contacts: Contact[] = data.map((row) => {
      // Supabase's untyped client infers this many-to-one embed as an array,
      // but PostgREST actually returns a single object (or null) for it.
      const company = row.companies as unknown as {
        id: string;
        name: string;
      } | null;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        companyId: company?.id ?? null,
        companyName: company?.name ?? null,
        ownerId: row.owner_id,
        createdAt: row.created_at,
      };
    });

    return { success: true, contacts };
  },
);

const createContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required").max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  companyId: z.string().uuid().nullable(),
});

// Email is the stronger identity signal for a person -- two contacts
// sharing a name happens (e.g. two "John Smith"s at different companies),
// but two sharing an email almost always means the same person entered
// twice. Falls back to name (case/whitespace-insensitive, same as
// createCompany) only when no email is given to compare against.
async function findDuplicateContact(
  supabase: Supabase,
  orgId: string,
  name: string,
  email: string | undefined,
  excludeId?: string,
): Promise<string | null> {
  let query = supabase
    .from("contacts")
    .select("id, name, email")
    .eq("org_id", orgId);
  if (excludeId) query = query.neq("id", excludeId);

  const { data: existing, error } = await query;
  if (error) return null;

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const match = existing.find(
      (row) => (row.email ?? "").trim().toLowerCase() === normalizedEmail,
    );
    if (match) return `A contact with the email "${email}" already exists.`;
  } else {
    const normalizedName = name.trim().toLowerCase();
    const match = existing.find(
      (row) => row.name.trim().toLowerCase() === normalizedName,
    );
    if (match) return `A contact named "${name.trim()}" already exists.`;
  }
  return null;
}

export const createContact = createServerFn({ method: "POST" })
  .validator(createContactSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["sales_rep"]);
    if (!check.ok) return { success: false, message: check.message };

    const dupeMessage = await findDuplicateContact(
      check.supabase,
      check.orgId,
      data.name,
      data.email,
    );
    if (dupeMessage) return { success: false, message: dupeMessage };

    const { error } = await check.supabase.from("contacts").insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company_id: data.companyId,
      org_id: check.orgId,
      owner_id: check.userId,
    });

    if (error) return { success: false, message: "Failed to create contact." };
    return { success: true };
  });

const updateContactSchema = z.object({
  contactId: z.string().uuid(),
  name: z.string().trim().min(1, "Contact name is required").max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  companyId: z.string().uuid().nullable(),
});

export const updateContact = createServerFn({ method: "POST" })
  .validator(updateContactSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const dupeMessage = await findDuplicateContact(
      check.supabase,
      check.orgId,
      data.name,
      data.email,
      data.contactId,
    );
    if (dupeMessage) return { success: false, message: dupeMessage };

    const { data: updated, error } = await check.supabase
      .from("contacts")
      .update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company_id: data.companyId,
      })
      .eq("id", data.contactId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to update contact." };
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this contact.",
      };
    }

    return { success: true };
  });
