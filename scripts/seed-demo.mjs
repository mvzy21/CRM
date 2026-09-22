// Background data for the full product demo tutorial.
//
//   node scripts/seed-demo.mjs
//
// Creates five demo accounts (one per non-admin role), a sales team, four
// client companies, and leads/deals staged at various stages with real
// history (stale deals, closed deals, a rejected lead). This is deliberately
// background only -- the tutorial's own hero company, contact and lead are
// created live, typed in front of the audience, not seeded here. Safe to
// re-run: it removes its own previous records first and reuses the demo
// accounts.
//
// Reads VITE_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY
// from .dev.vars. Targets the oldest organization unless DEMO_ORG_ID is set.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const { VITE_SUPABASE_URL: url } = loadEnv(".env.local");
const { SUPABASE_SERVICE_ROLE_KEY: serviceKey } = loadEnv(".dev.vars");
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEMO_PASSWORD = "AltriumDemo#2026";

const USERS = [
  { key: "manager", email: "manager.demo@altrium.test", role: "sales_manager", name: "Nadia Perera", team: true },
  { key: "rep", email: "rep.demo@altrium.test", role: "sales_rep", name: "Kasun Silva", team: true },
  { key: "tech", email: "tech.demo@altrium.test", role: "tech_lead", name: "Ravi Fernando", team: false },
  { key: "finance", email: "finance.demo@altrium.test", role: "finance_lead", name: "Amaya Jayasuriya", team: false },
];

const TEAM_NAME = "Colombo Sales (demo)";

const COMPANIES = [
  { key: "northwind", name: "Northwind Logistics", industry: "Logistics" },
  { key: "ceylon", name: "Ceylon Tea Traders", industry: "Agriculture & Export" },
  { key: "lanka", name: "Lanka Health Clinics", industry: "Healthcare" },
  { key: "bluewave", name: "BlueWave Hotels", industry: "Hospitality" },
];

const CONTACTS = [
  { company: "northwind", name: "Priya Raman", email: "priya.raman@northwind.test", phone: "+94 77 555 0134" },
  { company: "ceylon", name: "Dilan Wickramasinghe", email: "dilan@ceylontea.test", phone: "+94 71 555 0198" },
  { company: "lanka", name: "Dr. Shehani Gunawardena", email: "shehani@lankahealth.test", phone: "+94 76 555 0142" },
  { company: "bluewave", name: "Mark de Silva", email: "mark.desilva@bluewave.test", phone: "+94 70 555 0177" },
];

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysAhead = (n) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function ensureUser(spec, orgId, teamId) {
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("email", spec.email)
    .maybeSingle();

  let id = existing?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email: spec.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${spec.email}: ${error.message}`);
    id = data.user.id;
  } else {
    await db.auth.admin.updateUserById(id, { password: DEMO_PASSWORD });
  }

  const { error } = await db.from("profiles").upsert({
    id,
    org_id: orgId,
    role: spec.role,
    email: spec.email,
    display_name: spec.name,
    team_id: spec.team ? teamId : null,
    is_active: true,
  });
  if (error) throw new Error(`profile ${spec.email}: ${error.message}`);
  return id;
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

export async function seed(orgIdOverride) {
  let orgId = orgIdOverride ?? process.env.DEMO_ORG_ID;
  if (!orgId) {
    const org = await must(
      "find org",
      db.from("organizations").select("id").order("created_at").limit(1).single(),
    );
    orgId = org.id;
  }

  // ---- clean previous demo run ----
  const companyNames = COMPANIES.map((c) => c.name);
  const oldCompanies = await must(
    "old companies",
    db.from("companies").select("id").eq("org_id", orgId).in("name", companyNames),
  );
  const oldCompanyIds = oldCompanies.map((c) => c.id);
  if (oldCompanyIds.length) {
    const oldLeads = await must("old leads", db.from("leads").select("id").in("company_id", oldCompanyIds));
    const oldDeals = await must("old deals", db.from("deals").select("id").in("company_id", oldCompanyIds));
    const entityIds = [...oldLeads, ...oldDeals].map((r) => r.id);
    if (entityIds.length) await must("old timeline", db.from("timeline_events").delete().in("entity_id", entityIds));
    await must("old deals del", db.from("deals").delete().in("company_id", oldCompanyIds));
    await must("old leads del", db.from("leads").delete().in("company_id", oldCompanyIds));
    await must("old contacts del", db.from("contacts").delete().in("company_id", oldCompanyIds));
    await must("old companies del", db.from("companies").delete().in("id", oldCompanyIds));
  }

  // ---- team + users ----
  let team = await must(
    "team lookup",
    db.from("teams").select("id").eq("org_id", orgId).eq("name", TEAM_NAME).maybeSingle(),
  );
  if (!team) {
    team = await must("team", db.from("teams").insert({ org_id: orgId, name: TEAM_NAME }).select("id").single());
  }

  const users = {};
  for (const spec of USERS) users[spec.key] = await ensureUser(spec, orgId, team.id);
  const rep = users.rep;

  // ---- companies + contacts ----
  const companies = {};
  for (const c of COMPANIES) {
    const row = await must(
      `company ${c.name}`,
      db.from("companies")
        .insert({ org_id: orgId, name: c.name, industry: c.industry, owner_id: rep, created_at: daysAgo(70) })
        .select("id").single(),
    );
    companies[c.key] = row.id;
  }

  const contacts = {};
  for (const c of CONTACTS) {
    const row = await must(
      `contact ${c.name}`,
      db.from("contacts")
        .insert({
          org_id: orgId, company_id: companies[c.company], name: c.name,
          email: c.email, phone: c.phone, owner_id: rep, created_at: daysAgo(68),
        })
        .select("id").single(),
    );
    contacts[c.company] = row.id;
  }

  const lead = (fields) =>
    must(`lead ${fields.title}`, db.from("leads").insert({ org_id: orgId, owner_id: rep, ...fields }).select("id").single());

  const timeline = (entityType, entityId, actorId, summary, createdAt) =>
    must("timeline", db.from("timeline_events").insert({
      org_id: orgId, entity_type: entityType, entity_id: entityId,
      actor_id: actorId, summary, created_at: createdAt,
    }));

  const activity = (parent, kind, body, createdAt) =>
    must("activity", db.from("activities").insert({
      org_id: orgId, author_id: rep, kind, body, created_at: createdAt, ...parent,
    }));

  // ---- leads ----
  // No "live demo" lead here on purpose -- the tutorial creates the company,
  // contact and lead live, typed in front of the audience, rather than
  // starting from a record that already exists. Everything below is
  // background data: other reps' deals at various stages, with real history,
  // which can't be faked by clicking through the UI in real time.

  // L2: already escalated -- waiting on the Tech Lead.
  const l2 = await lead({
    company_id: companies.ceylon, contact_id: contacts.ceylon,
    title: "Ceylon Tea — export order portal",
    description: "Buyers in the UAE want to place bulk orders online instead of by email.",
    requirements: "- Buyer self-service ordering\n- Multi-currency pricing (LKR, USD, AED)\n- Order status emails",
    budget: 38000, expected_close_date: daysAhead(60),
    temperature: "hot", status: "escalated", tech_lead_id: users.tech, created_at: daysAgo(20),
  });
  await activity({ lead_id: l2.id }, "call", "Dilan walked through their current email ordering; 30% of orders need a correction round-trip.", daysAgo(15));
  await timeline("lead", l2.id, users.manager, "Escalated to Tech Review", daysAgo(4));

  // L3: tech-approved -- waiting on the Finance Lead.
  const l3 = await lead({
    company_id: companies.lanka, contact_id: contacts.lanka,
    title: "Lanka Health — patient booking app",
    description: "Three clinics want online appointment booking to cut front-desk phone load.",
    requirements: "- Booking across three clinics\n- SMS reminders\n- Doctor availability calendar",
    budget: 52000, expected_close_date: daysAhead(75),
    temperature: "hot", status: "tech_approved", tech_lead_id: users.tech,
    tech_decision: "approved", tech_notes: "Feasible with our standard booking module; SMS via existing gateway.",
    created_at: daysAgo(25),
  });
  await activity({ lead_id: l3.id }, "meeting", "Demoed the booking prototype to Dr. Gunawardena; strong interest in SMS reminders.", daysAgo(14));
  await timeline("lead", l3.id, users.manager, "Escalated to Tech Review", daysAgo(9));
  await timeline("lead", l3.id, users.tech, "Technical review: Approved", daysAgo(5));

  // L4: New + Cold -- shows that a Cold lead cannot be escalated.
  const l4 = await lead({
    company_id: companies.bluewave, contact_id: contacts.bluewave,
    title: "BlueWave — spa booking add-on",
    description: "Exploratory enquiry; no budget yet.",
    requirements: "- Spa slot booking inside the existing hotel app",
    budget: null, expected_close_date: null,
    temperature: "cold", status: "new", created_at: daysAgo(8),
  });
  await activity({ lead_id: l4.id }, "note", "Tagged Cold: no budget this financial year, revisit in Q1.", daysAgo(7));

  // L5: rejected at finance -- counts in the report's rejected figure.
  await lead({
    company_id: companies.bluewave, contact_id: contacts.bluewave,
    title: "BlueWave — kiosk check-in",
    requirements: "- Self check-in kiosks in the lobby",
    budget: 90000, temperature: "hot", status: "rejected",
    tech_lead_id: users.tech, tech_decision: "approved",
    finance_lead_id: users.finance, finance_decision: "rejected",
    finance_notes: "Hardware cost exceeds the client's stated budget.",
    created_at: daysAgo(40),
  });

  // L6: converted -- the source of the won deal below.
  const l6 = await lead({
    company_id: companies.northwind, contact_id: contacts.northwind,
    title: "Northwind — fleet tracking",
    requirements: "- GPS tracking for 40 trucks\n- Driver mobile app",
    budget: 60000, temperature: "hot", status: "converted",
    tech_lead_id: users.tech, tech_decision: "approved",
    finance_lead_id: users.finance, finance_decision: "approved",
    created_at: daysAgo(55),
  });

  // ---- deals ----
  const deal = (fields) =>
    must(`deal ${fields.title}`, db.from("deals").insert({ org_id: orgId, owner_id: rep, ...fields }).select("id").single());

  // Fresh -- interaction 2 days ago.
  const d1 = await deal({
    company_id: companies.ceylon, contact_id: contacts.ceylon,
    title: "Ceylon Tea — warehouse ERP link", stage: "proposal", status: "open",
    budget: 28000, deadline: daysAhead(30),
    requirements: "- Sync stock levels with their ERP", created_at: daysAgo(35),
  });
  await activity({ deal_id: d1.id }, "call", "Sent revised proposal; Dilan reviewing with their IT lead.", daysAgo(2));

  // Stale -- last interaction 20 days ago.
  const d2 = await deal({
    company_id: companies.lanka, contact_id: contacts.lanka,
    title: "Lanka Health — clinic portal phase 2", stage: "negotiation", status: "open",
    budget: 41000, deadline: daysAhead(20),
    requirements: "- Lab results portal\n- Patient login", created_at: daysAgo(50),
  });
  await activity({ deal_id: d2.id }, "meeting", "Negotiated payment milestones; awaiting their board sign-off.", daysAgo(20));

  // Stale -- never touched since it was opened 30 days ago.
  await deal({
    company_id: companies.bluewave, contact_id: contacts.bluewave,
    title: "BlueWave — loyalty app", stage: "contract", status: "open",
    budget: 35000, deadline: daysAhead(15),
    requirements: "- Points programme across five hotels", created_at: daysAgo(30),
  });

  // Won -- converted from L6.
  const d4 = await deal({
    lead_id: l6.id, company_id: companies.northwind, contact_id: contacts.northwind,
    title: "Northwind — fleet tracking", stage: "contract", status: "won",
    budget: 60000, requirements: "- GPS tracking for 40 trucks\n- Driver mobile app",
    closed_at: daysAgo(15), created_at: daysAgo(45),
  });
  await timeline("lead", l6.id, users.manager, "Converted to Deal", daysAgo(45));
  await timeline("deal", d4.id, users.manager, "Closed as Won", daysAgo(15));

  // Lost.
  const d5 = await deal({
    company_id: companies.ceylon, contact_id: contacts.ceylon,
    title: "Ceylon Tea — buyer mobile app", stage: "proposal", status: "lost",
    budget: 25000, lost_reason: "Chose a cheaper vendor",
    closed_at: daysAgo(10), created_at: daysAgo(38),
  });
  await timeline("deal", d5.id, rep, "Closed as Lost: Chose a cheaper vendor", daysAgo(10));

  return { orgId, users, teamId: team.id };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seed()
    .then(({ orgId }) => {
      console.log(`Demo data seeded into org ${orgId}.`);
      console.log(`Demo password for all demo accounts: ${DEMO_PASSWORD}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
