import { z } from "zod";

export const APP_ROLES = [
  "admin",
  "sales_manager",
  "sales_rep",
  "tech_lead",
  "finance_lead",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const appRoleSchema = z.enum(APP_ROLES);

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_rep: "Sales Rep",
  tech_lead: "Tech Lead",
  finance_lead: "Finance Lead",
};
