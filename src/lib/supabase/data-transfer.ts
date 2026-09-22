import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "./access.ts";

// US-26 (Import Data) and US-27 (Export Data). CSV is the interchange
// format -- Excel opens and writes it natively, so it covers the
// "CSV/Excel" requirement without pulling in a spreadsheet parser.

export const EXPORT_ENTITIES = [
  "companies",
  "contacts",
  "leads",
  "deals",
] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];

export const IMPORT_ENTITIES = ["contacts", "leads"] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export interface ImportOutcome {
  imported: number;
  failed: { row: number; reason: string }[];
  warnings: { row: number; note: string }[];
}

/**
 * A leading =, +, - or @ makes Excel treat a cell as a formula, so a field
 * like "=cmd|'/c calc'!A1" arriving from a lead title would execute on
 * whoever opens the export. Prefixing with a single quote keeps the text
 * visible but inert.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** RFC 4180 parse: handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // A BOM survives a round trip through Excel and would otherwise become
  // part of the first header name.
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function headerIndex(headers: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headers.forEach((header, i) => {
    index[header.trim().toLowerCase()] = i;
  });
  return index;
}

/**
 * Counterpart to csvCell's formula guard: export prefixes a value like
 * "- scanning" with a quote so Excel can't treat it as a formula, so import
 * has to strip it again. Without this, export -> import (i.e. the backup and
 * restore case US-27 exists for) silently corrupts every field that starts
 * with =, +, - or @ -- bulleted requirements being the obvious one.
 */
const cell = (row: string[], index: number | undefined) => {
  if (index === undefined) return "";
  const raw = (row[index] ?? "").trim();
  return /^'[=+\-@]/.test(raw) ? raw.slice(1) : raw;
};

// ---------------------------------------------------------------- export

export const exportRecords = createServerFn({ method: "GET" })
  .validator(z.object({ entity: z.enum(EXPORT_ENTITIES) }))
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; filename: string; csv: string }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `altrium-${data.entity}-${stamp}.csv`;
      const fail = {
        success: false,
        message: "Failed to export records.",
      } as const;

      if (data.entity === "companies") {
        const { data: rows, error } = await check.supabase
          .from("companies")
          .select(
            "name, industry, created_at, owner:profiles!owner_id(display_name, email)",
          )
          .order("created_at", { ascending: false });
        if (error) return fail;
        return {
          success: true,
          filename,
          csv: toCsv(
            ["Name", "Industry", "Owner", "Created"],
            (rows as unknown as Record<string, never>[]).map((r) => {
              const row = r as unknown as {
                name: string;
                industry: string | null;
                created_at: string;
                owner: {
                  display_name: string | null;
                  email: string | null;
                } | null;
              };
              return [
                row.name,
                row.industry,
                row.owner?.display_name ?? row.owner?.email ?? "",
                row.created_at,
              ];
            }),
          ),
        };
      }

      if (data.entity === "contacts") {
        const { data: rows, error } = await check.supabase
          .from("contacts")
          .select(
            "name, email, phone, created_at, company:companies!company_id(name)",
          )
          .order("created_at", { ascending: false });
        if (error) return fail;
        return {
          success: true,
          filename,
          csv: toCsv(
            ["Name", "Email", "Phone", "Company", "Created"],
            (
              rows as unknown as {
                name: string;
                email: string | null;
                phone: string | null;
                created_at: string;
                company: { name: string } | null;
              }[]
            ).map((row) => [
              row.name,
              row.email,
              row.phone,
              row.company?.name ?? "",
              row.created_at,
            ]),
          ),
        };
      }

      if (data.entity === "leads") {
        const { data: rows, error } = await check.supabase
          .from("leads")
          .select(
            "title, status, temperature, budget, requirements, description, expected_close_date, created_at, " +
              "company:companies!company_id(name), contact:contacts!contact_id(name), " +
              "owner:profiles!owner_id(display_name, email)",
          )
          .order("created_at", { ascending: false });
        if (error) return fail;
        return {
          success: true,
          filename,
          csv: toCsv(
            [
              "Title",
              "Status",
              "Temperature",
              "Company",
              "Contact",
              "Owner",
              "Budget",
              "Expected Close Date",
              "Requirements",
              "Description",
              "Created",
            ],
            (
              rows as unknown as {
                title: string;
                status: string;
                temperature: string | null;
                budget: number | null;
                requirements: string | null;
                description: string | null;
                expected_close_date: string | null;
                created_at: string;
                company: { name: string } | null;
                contact: { name: string } | null;
                owner: {
                  display_name: string | null;
                  email: string | null;
                } | null;
              }[]
            ).map((row) => [
              row.title,
              row.status,
              row.temperature,
              row.company?.name ?? "",
              row.contact?.name ?? "",
              row.owner?.display_name ?? row.owner?.email ?? "",
              row.budget,
              row.expected_close_date,
              row.requirements,
              row.description,
              row.created_at,
            ]),
          ),
        };
      }

      const { data: rows, error } = await check.supabase
        .from("deals")
        .select(
          "title, stage, status, budget, deadline, requirements, lost_reason, closed_at, created_at, " +
            "company:companies!company_id(name), contact:contacts!contact_id(name), " +
            "owner:profiles!owner_id(display_name, email)",
        )
        .order("created_at", { ascending: false });
      if (error) return fail;
      return {
        success: true,
        filename,
        csv: toCsv(
          [
            "Title",
            "Stage",
            "Status",
            "Company",
            "Contact",
            "Owner",
            "Budget",
            "Deadline",
            "Requirements",
            "Lost Reason",
            "Closed At",
            "Created",
          ],
          (
            rows as unknown as {
              title: string;
              stage: string;
              status: string;
              budget: number | null;
              deadline: string | null;
              requirements: string | null;
              lost_reason: string | null;
              closed_at: string | null;
              created_at: string;
              company: { name: string } | null;
              contact: { name: string } | null;
              owner: {
                display_name: string | null;
                email: string | null;
              } | null;
            }[]
          ).map((row) => [
            row.title,
            row.stage,
            row.status,
            row.company?.name ?? "",
            row.contact?.name ?? "",
            row.owner?.display_name ?? row.owner?.email ?? "",
            row.budget,
            row.deadline,
            row.requirements,
            row.lost_reason,
            row.closed_at,
            row.created_at,
          ]),
        ),
      };
    },
  );

// ---------------------------------------------------------------- import

const importSchema = z.object({
  entity: z.enum(IMPORT_ENTITIES),
  csv: z.string().min(1, "The file is empty.").max(2_000_000),
});

const contactRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

const leadRowSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  requirements: z.string().trim().max(4000).optional().or(z.literal("")),
  budget: z.number().nonnegative("Budget cannot be negative").nullable(),
  expectedCloseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected close date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});

export const importRecords = createServerFn({ method: "POST" })
  .validator(importSchema)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; outcome: ImportOutcome }
      | { success: false; message: string }
    > => {
      // Contacts and leads are both sales_rep-only inserts at the RLS layer
      // (contacts_insert_sales_rep / leads_insert_sales_rep), so importing
      // them is the same capability exercised in bulk.
      const check = await requireRole(["sales_rep"]);
      if (!check.ok) return { success: false, message: check.message };

      const rows = parseCsv(data.csv);
      if (rows.length < 2) {
        return {
          success: false,
          message: "The file needs a header row and at least one data row.",
        };
      }

      const columns = headerIndex(rows[0]);
      const body = rows.slice(1);
      const outcome: ImportOutcome = { imported: 0, failed: [], warnings: [] };

      // Resolve company/contact references by name once, rather than a
      // lookup query per row.
      const [{ data: companyRows }, { data: contactRows }] = await Promise.all([
        check.supabase.from("companies").select("id, name"),
        check.supabase.from("contacts").select("id, name, email"),
      ]);
      const companyByName = new Map(
        (companyRows ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]),
      );
      const contactByName = new Map(
        (contactRows ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]),
      );

      // Dedup guard for the contacts import, mirroring createContact: email
      // is the stronger identity signal when present, name otherwise. Seeded
      // from existing rows and grown as the file is walked, so two
      // duplicate rows in the *same* CSV -- not just a re-run of the same
      // file -- are caught too, not just the second import.
      const existingContactEmails = new Set(
        (contactRows ?? [])
          .map((c) => c.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e)),
      );
      const existingContactNames = new Set(
        (contactRows ?? []).map((c) => c.name.trim().toLowerCase()),
      );

      const pending: Record<string, unknown>[] = [];

      body.forEach((row, i) => {
        // +2: one for the header row, one because humans count from 1.
        const lineNumber = i + 2;
        const companyName = cell(row, columns.company);
        let companyId: string | null = null;
        if (companyName) {
          companyId = companyByName.get(companyName.toLowerCase()) ?? null;
          if (!companyId) {
            outcome.warnings.push({
              row: lineNumber,
              note: `No company named "${companyName}" — imported without a company link.`,
            });
          }
        }

        if (data.entity === "contacts") {
          const parsed = contactRowSchema.safeParse({
            name: cell(row, columns.name),
            email: cell(row, columns.email),
            phone: cell(row, columns.phone),
          });
          if (!parsed.success) {
            outcome.failed.push({
              row: lineNumber,
              reason: parsed.error.issues[0]?.message ?? "Invalid row",
            });
            return;
          }

          const normalizedEmail = parsed.data.email?.trim().toLowerCase();
          const normalizedName = parsed.data.name.trim().toLowerCase();
          const isDuplicate = normalizedEmail
            ? existingContactEmails.has(normalizedEmail)
            : existingContactNames.has(normalizedName);
          if (isDuplicate) {
            outcome.failed.push({
              row: lineNumber,
              reason: normalizedEmail
                ? `A contact with the email "${parsed.data.email}" already exists.`
                : `A contact named "${parsed.data.name}" already exists.`,
            });
            return;
          }
          if (normalizedEmail) existingContactEmails.add(normalizedEmail);
          else existingContactNames.add(normalizedName);

          pending.push({
            org_id: check.orgId,
            owner_id: check.userId,
            name: parsed.data.name,
            email: parsed.data.email || null,
            phone: parsed.data.phone || null,
            company_id: companyId,
          });
          return;
        }

        const budgetRaw = cell(row, columns.budget).replace(/[,\s]/g, "");
        if (budgetRaw && Number.isNaN(Number(budgetRaw))) {
          outcome.failed.push({
            row: lineNumber,
            reason: `Budget "${cell(row, columns.budget)}" is not a number`,
          });
          return;
        }

        const parsed = leadRowSchema.safeParse({
          title: cell(row, columns.title),
          description: cell(row, columns.description),
          requirements: cell(row, columns.requirements),
          budget: budgetRaw ? Number(budgetRaw) : null,
          expectedCloseDate: cell(row, columns["expected close date"]),
        });
        if (!parsed.success) {
          outcome.failed.push({
            row: lineNumber,
            reason: parsed.error.issues[0]?.message ?? "Invalid row",
          });
          return;
        }

        const contactName = cell(row, columns.contact);
        let contactId: string | null = null;
        if (contactName) {
          contactId = contactByName.get(contactName.toLowerCase()) ?? null;
          if (!contactId) {
            outcome.warnings.push({
              row: lineNumber,
              note: `No contact named "${contactName}" — imported without a contact link.`,
            });
          }
        }

        pending.push({
          org_id: check.orgId,
          owner_id: check.userId,
          title: parsed.data.title,
          description: parsed.data.description || null,
          requirements: parsed.data.requirements || null,
          budget: parsed.data.budget,
          expected_close_date: parsed.data.expectedCloseDate || null,
          company_id: companyId,
          contact_id: contactId,
        });
      });

      if (pending.length > 0) {
        const { error } = await check.supabase
          .from(data.entity)
          .insert(pending);
        if (error) {
          return {
            success: false,
            message:
              error.code === "23505"
                ? "Import stopped: the file contains a record that already exists."
                : "Import failed. No rows were saved.",
          };
        }
        outcome.imported = pending.length;
      }

      return { success: true, outcome };
    },
  );
