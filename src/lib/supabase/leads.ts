import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "./access.ts";

export type LeadTemperature = "hot" | "cold" | null;
export type ReviewDecision = "approved" | "rejected" | null;

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
  techLeadId: string | null;
  techLeadName: string | null;
  techDecision: ReviewDecision;
  techNotes: string | null;
  financeLeadId: string | null;
  financeLeadName: string | null;
  financeDecision: ReviewDecision;
  financeNotes: string | null;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

const leadSelect =
  "id, title, description, temperature, status, company_id, contact_id, owner_id, " +
  "tech_lead_id, tech_decision, tech_notes, finance_lead_id, finance_decision, finance_notes, created_at, " +
  "company:companies!company_id(id, name), contact:contacts!contact_id(id, name), " +
  "owner:profiles!owner_id(display_name, email), " +
  "tech_lead:profiles!tech_lead_id(display_name, email), " +
  "finance_lead:profiles!finance_lead_id(display_name, email)";

interface LeadRow {
  id: string;
  title: string;
  description: string | null;
  temperature: LeadTemperature;
  status: string;
  company_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  tech_lead_id: string | null;
  tech_decision: ReviewDecision;
  tech_notes: string | null;
  finance_lead_id: string | null;
  finance_decision: ReviewDecision;
  finance_notes: string | null;
  created_at: string;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  owner: { display_name: string | null; email: string | null } | null;
  tech_lead: { display_name: string | null; email: string | null } | null;
  finance_lead: { display_name: string | null; email: string | null } | null;
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
    techLeadId: row.tech_lead_id,
    techLeadName: row.tech_lead?.display_name ?? row.tech_lead?.email ?? null,
    techDecision: row.tech_decision,
    techNotes: row.tech_notes,
    financeLeadId: row.finance_lead_id,
    financeLeadName:
      row.finance_lead?.display_name ?? row.finance_lead?.email ?? null,
    financeDecision: row.finance_decision,
    financeNotes: row.finance_notes,
    createdAt: row.created_at,
  };
}

export const getLead = createServerFn({ method: "GET" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; lead: Lead } | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const { data: row, error } = await check.supabase
        .from("leads")
        .select(leadSelect)
        .eq("id", data.leadId)
        .maybeSingle();

      if (error) return { success: false, message: "Failed to load lead." };
      if (!row) return { success: false, message: "Lead not found." };

      return { success: true, lead: mapLead(row as unknown as LeadRow) };
    },
  );

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

export interface UserOption {
  id: string;
  displayName: string | null;
  email: string;
}

export const listTechLeads = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; users: UserOption[] } | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("role", "tech_lead")
      .eq("is_active", true);

    if (error) return { success: false, message: "Failed to load tech leads." };
    return {
      success: true,
      users: data.map((u) => ({
        id: u.id,
        displayName: u.display_name,
        email: u.email,
      })),
    };
  },
);

// US-10: Sales Manager escalates a Hot lead to a specific Tech Lead.
const escalateLeadSchema = z.object({
  leadId: z.string().uuid(),
  techLeadId: z.string().uuid(),
});

export const escalateLead = createServerFn({ method: "POST" })
  .validator(escalateLeadSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["sales_manager"]);
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("status, temperature")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };
    if (lead.status !== "new" || lead.temperature !== "hot") {
      return {
        success: false,
        message: "Only a new, Hot-tagged lead can be escalated.",
      };
    }

    const { error } = await check.supabase
      .from("leads")
      .update({ status: "escalated", tech_lead_id: data.techLeadId })
      .eq("id", data.leadId);

    if (error) return { success: false, message: "Failed to escalate lead." };
    return { success: true };
  });

// US-11: the assigned Tech Lead approves or rejects on technical feasibility.
const reviewTechnicalSchema = z.object({
  leadId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const reviewTechnicalFeasibility = createServerFn({ method: "POST" })
  .validator(reviewTechnicalSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["tech_lead"]);
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("status, tech_lead_id")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };
    if (lead.status !== "escalated" || lead.tech_lead_id !== check.userId) {
      return {
        success: false,
        message: "This lead isn't awaiting your technical review.",
      };
    }

    const { error } = await check.supabase
      .from("leads")
      .update({
        tech_decision: data.decision,
        tech_notes: data.notes || null,
        status: data.decision === "approved" ? "tech_approved" : "rejected",
      })
      .eq("id", data.leadId);

    if (error) return { success: false, message: "Failed to submit review." };
    return { success: true };
  });

// US-12: any Finance Lead can pick up a tech-approved lead and review it.
const reviewFinancialSchema = z.object({
  leadId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const reviewFinancialViability = createServerFn({ method: "POST" })
  .validator(reviewFinancialSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["finance_lead"]);
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("status")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };
    if (lead.status !== "tech_approved") {
      return {
        success: false,
        message: "This lead isn't awaiting financial review.",
      };
    }

    const { error } = await check.supabase
      .from("leads")
      .update({
        finance_lead_id: check.userId,
        finance_decision: data.decision,
        finance_notes: data.notes || null,
        status: data.decision === "approved" ? "finance_approved" : "rejected",
      })
      .eq("id", data.leadId);

    if (error) return { success: false, message: "Failed to submit review." };
    return { success: true };
  });

// US-13: Sales Manager acknowledges a rejection and marks the lead Cold.
// The UI pairs this with createReminder() (US-19) to schedule a follow-up.
const markLeadColdSchema = z.object({
  leadId: z.string().uuid(),
});

export const markLeadCold = createServerFn({ method: "POST" })
  .validator(markLeadColdSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["sales_manager"]);
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("status")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };
    if (lead.status !== "rejected") {
      return {
        success: false,
        message: "Only a rejected lead can be marked Cold.",
      };
    }

    const { error } = await check.supabase
      .from("leads")
      .update({ status: "new", temperature: "cold" })
      .eq("id", data.leadId);

    if (error) return { success: false, message: "Failed to mark lead Cold." };
    return { success: true };
  });

// Admin override: step a lead back one stage in the approval workflow
// (e.g. undo a finance approval back to tech_approved), clearing the
// decision/notes for the stage being undone so it can be re-reviewed.
// Not available for 'converted' (a Deal already exists) or 'new' (nothing
// earlier to revert to).
const reverseLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
});

export const reverseLeadStatus = createServerFn({ method: "POST" })
  .validator(reverseLeadStatusSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireRole(["admin"]);
    if (!check.ok) return { success: false, message: check.message };

    const { data: lead } = await check.supabase
      .from("leads")
      .select("status, tech_decision, finance_decision")
      .eq("id", data.leadId)
      .maybeSingle();

    if (!lead) return { success: false, message: "Lead not found." };

    let update: Record<string, unknown>;
    switch (lead.status) {
      case "escalated":
        update = {
          status: "new",
          tech_lead_id: null,
          tech_decision: null,
          tech_notes: null,
        };
        break;
      case "tech_approved":
        update = { status: "escalated", tech_decision: null, tech_notes: null };
        break;
      case "finance_approved":
        update = {
          status: "tech_approved",
          finance_lead_id: null,
          finance_decision: null,
          finance_notes: null,
        };
        break;
      case "rejected":
        update =
          lead.finance_decision === "rejected"
            ? {
                status: "tech_approved",
                finance_lead_id: null,
                finance_decision: null,
                finance_notes: null,
              }
            : {
                status: "escalated",
                tech_decision: null,
                tech_notes: null,
              };
        break;
      case "converted":
        return {
          success: false,
          message: "Can't reverse a converted lead -- the Deal already exists.",
        };
      default:
        return {
          success: false,
          message: "This lead is already at the earliest stage.",
        };
    }

    const { error } = await check.supabase
      .from("leads")
      .update(update)
      .eq("id", data.leadId);

    if (error) {
      return { success: false, message: "Failed to reverse lead status." };
    }
    return { success: true };
  });

// US-14: Sales Manager converts a finance-approved lead into a Deal.
// The Deal keeps the original lead's owner (continuity for the rep who
// worked the lead), not the converting Sales Manager.
const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
});

export const convertLead = createServerFn({ method: "POST" })
  .validator(convertLeadSchema)
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; dealId: string } | { success: false; message: string }
    > => {
      const check = await requireRole(["sales_manager"]);
      if (!check.ok) return { success: false, message: check.message };

      const { data: lead } = await check.supabase
        .from("leads")
        .select("status, title, company_id, contact_id, owner_id")
        .eq("id", data.leadId)
        .maybeSingle();

      if (!lead) return { success: false, message: "Lead not found." };
      if (lead.status !== "finance_approved") {
        return {
          success: false,
          message: "Only a finance-approved lead can be converted.",
        };
      }

      const { data: deal, error: dealError } = await check.supabase
        .from("deals")
        .insert({
          org_id: check.orgId,
          lead_id: data.leadId,
          company_id: lead.company_id,
          contact_id: lead.contact_id,
          owner_id: lead.owner_id,
          title: lead.title,
        })
        .select("id")
        .single();

      if (dealError || !deal) {
        return { success: false, message: "Failed to create deal." };
      }

      const { error: leadError } = await check.supabase
        .from("leads")
        .update({ status: "converted" })
        .eq("id", data.leadId);

      if (leadError) {
        return {
          success: false,
          message: "Deal created, but failed to mark the lead converted.",
        };
      }

      return { success: true, dealId: deal.id };
    },
  );
