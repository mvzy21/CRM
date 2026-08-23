import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "./access.ts";

export type LeadTemperature = "hot" | "cold" | null;

export interface Lead {
  id: string;
  title: string;
  description: string | null;
  temperature: LeadTemperature;
  status: string;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

const leadSelect =
  "id, title, description, temperature, status, company_id, contact_id, owner_id, created_at, " +
  "company:companies!company_id(id, name), contact:contacts!contact_id(id, name), owner:profiles!owner_id(display_name, email)";

interface LeadRow {
  id: string;
  title: string;
  description: string | null;
  temperature: LeadTemperature;
  status: string;
  company_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  created_at: string;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  owner: { display_name: string | null; email: string | null } | null;
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    temperature: row.temperature,
    status: row.status,
    companyId: row.company_id,
    companyName: row.company?.name ?? null,
    contactId: row.contact_id,
    contactName: row.contact?.name ?? null,
    ownerId: row.owner_id,
    ownerName: row.owner?.display_name ?? row.owner?.email ?? null,
    createdAt: row.created_at,
  };
}

export const listLeads = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; leads: Lead[] } | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("leads")
      .select(leadSelect)
      .order("created_at", { ascending: false });

    if (error) return { success: false, message: "Failed to load leads." };

    return {
      success: true,
      leads: (data as unknown as LeadRow[]).map(mapLead),
    };
  },
);

const createLeadSchema = z.object({
  title: z.string().trim().min(1, "Lead title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  companyId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
});

export const createLead = createServerFn({ method: "POST" })
  .validator(createLeadSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["sales_rep"]);
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase.from("leads").insert({
      title: data.title,
      description: data.description || null,
      company_id: data.companyId,
      contact_id: data.contactId,
      org_id: check.orgId,
      owner_id: check.userId,
    });

    if (error) return { success: false, message: "Failed to create lead." };
    return { success: true };
  });

const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().trim().min(1, "Lead title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  companyId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
});

export const updateLead = createServerFn({ method: "POST" })
  .validator(updateLeadSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: updated, error } = await check.supabase
      .from("leads")
      .update({
        title: data.title,
        description: data.description || null,
        company_id: data.companyId,
        contact_id: data.contactId,
      })
      .eq("id", data.leadId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to update lead." };
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this lead.",
      };
    }

    return { success: true };
  });

const tagLeadTemperatureSchema = z.object({
  leadId: z.string().uuid(),
  temperature: z.enum(["hot", "cold"]).nullable(),
});

export const tagLeadTemperature = createServerFn({ method: "POST" })
  .validator(tagLeadTemperatureSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("owner_id")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };
    if (lead.owner_id !== check.userId) {
      return {
        success: false,
        message: "Only the lead's owner can tag its temperature.",
      };
    }

    const { error } = await check.supabase
      .from("leads")
      .update({ temperature: data.temperature })
      .eq("id", data.leadId);

    if (error) return { success: false, message: "Failed to tag lead." };
    return { success: true };
  });
