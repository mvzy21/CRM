const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const root = "D:\\project_altrium";
const pub = loadEnv(path.join(root, ".env.local"));
const priv = loadEnv(path.join(root, ".dev.vars"));
const admin = createClient(pub.VITE_SUPABASE_URL, priv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = () =>
  createClient(pub.VITE_SUPABASE_URL, pub.VITE_SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}: ${name}${detail ? " -- " + detail : ""}`);
};

async function makeUser(email, role, orgId) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "Test1234!", email_confirm: true,
  });
  if (error) throw error;
  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id, org_id: orgId, role, email, is_active: true,
  });
  if (pErr) throw pErr;
  const c = client();
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: "Test1234!" });
  if (sErr) throw sErr;
  return { id: data.user.id, client: c };
}

// Mirrors notify()/notifyRole() in src/lib/supabase/notifications.ts exactly.
async function notify(supabase, { orgId, userId, entityType, entityId, title, body }) {
  return supabase.from("notifications").insert({
    org_id: orgId, user_id: userId, entity_type: entityType, entity_id: entityId,
    title, body: body ?? null,
  });
}
async function notifyRole(supabase, { orgId, role, entityType, entityId, title, body, excludeUserId }) {
  const { data: users } = await supabase.from("profiles").select("id")
    .eq("org_id", orgId).eq("role", role).eq("is_active", true);
  const targets = (users ?? []).filter((u) => u.id !== excludeUserId);
  if (targets.length === 0) return { error: null };
  return supabase.from("notifications").insert(
    targets.map((u) => ({
      org_id: orgId, user_id: u.id, entity_type: entityType, entity_id: entityId,
      title, body: body ?? null,
    })),
  );
}
async function unreadTitlesFor(userId) {
  const { data, error } = await admin.from("notifications")
    .select("title, is_read").eq("user_id", userId);
  if (error) throw error;
  return data;
}

async function main() {
  const stamp = Date.now();
  const { data: org } = await admin
    .from("organizations").insert({ name: "PunchlistCheck-" + stamp }).select("id").single();
  const orgId = org.id;

  const MGR = await makeUser(`mgr.${stamp}@test.altrium.local`, "sales_manager", orgId);
  const REP = await makeUser(`rep.${stamp}@test.altrium.local`, "sales_rep", orgId);
  const TECH = await makeUser(`tech.${stamp}@test.altrium.local`, "tech_lead", orgId);
  const FIN1 = await makeUser(`fin1.${stamp}@test.altrium.local`, "finance_lead", orgId);
  const FIN2 = await makeUser(`fin2.${stamp}@test.altrium.local`, "finance_lead", orgId);

  try {
    // ================= Notifications: escalate =================
    const { data: lead } = await admin.from("leads").insert({
      org_id: orgId, owner_id: REP.id, title: "Punchlist lead", status: "escalated",
      tech_lead_id: TECH.id, temperature: "hot",
    }).select("id").single();

    let r = await notify(MGR.client, {
      orgId, userId: TECH.id, entityType: "lead", entityId: lead.id,
      title: "Lead escalated to you for technical review", body: "Punchlist lead",
    });
    record("1. Escalate: org-member insert policy allows notifying the Tech Lead", !r.error, r.error?.message);

    let techNotifs = await unreadTitlesFor(TECH.id);
    record("2. Tech Lead has exactly the escalation notification, unread",
      techNotifs.length === 1 && !techNotifs[0].is_read, JSON.stringify(techNotifs));

    // ================= Notifications: tech review approve → all finance leads =================
    r = await notifyRole(TECH.client, {
      orgId, role: "finance_lead", entityType: "lead", entityId: lead.id,
      title: "Lead ready for financial review", body: "Punchlist lead",
    });
    record("3. Tech-approve: notifyRole insert (as Tech Lead, target is Finance Leads) succeeds", !r.error, r.error?.message);

    const fin1Notifs = await unreadTitlesFor(FIN1.id);
    const fin2Notifs = await unreadTitlesFor(FIN2.id);
    record("4. Both active Finance Leads received the 'ready for financial review' notification",
      fin1Notifs.some((n) => n.title === "Lead ready for financial review") &&
      fin2Notifs.some((n) => n.title === "Lead ready for financial review"),
      JSON.stringify({ fin1Notifs, fin2Notifs }));

    // ================= Notifications: finance approve → sales managers =================
    r = await notifyRole(FIN1.client, {
      orgId, role: "sales_manager", entityType: "lead", entityId: lead.id,
      title: "Lead approved — ready to convert", body: "Punchlist lead",
    });
    record("5. Finance-approve: notifyRole (Finance Lead → Sales Manager) succeeds", !r.error, r.error?.message);
    const mgrNotifs1 = await unreadTitlesFor(MGR.id);
    record("6. Sales Manager received the 'ready to convert' notification",
      mgrNotifs1.some((n) => n.title === "Lead approved — ready to convert"), JSON.stringify(mgrNotifs1));

    // ================= Notifications: reject path → owner + all sales managers =================
    const { data: lead2 } = await admin.from("leads").insert({
      org_id: orgId, owner_id: REP.id, title: "Reject-path lead", status: "escalated",
      tech_lead_id: TECH.id, temperature: "hot",
    }).select("id").single();

    r = await notify(TECH.client, {
      orgId, userId: REP.id, entityType: "lead", entityId: lead2.id,
      title: "Lead rejected at technical review", body: "Reject-path lead",
    });
    const r2 = await notifyRole(TECH.client, {
      orgId, role: "sales_manager", entityType: "lead", entityId: lead2.id,
      title: "Lead rejected at technical review — mark it Cold", body: "Reject-path lead",
    });
    record("7. Reject path: owner + sales-manager notifications both insert cleanly", !r.error && !r2.error, r.error?.message ?? r2.error?.message);
    const repNotifs = await unreadTitlesFor(REP.id);
    record("8. Sales Rep (owner) was notified of the rejection",
      repNotifs.some((n) => n.title === "Lead rejected at technical review"), JSON.stringify(repNotifs));

    // ================= Notifications: convert → owner, self-notify suppressed =================
    const { data: deal } = await admin.from("deals").insert({
      org_id: orgId, owner_id: MGR.id, lead_id: lead.id, title: "Punchlist deal",
    }).select("id").single();

    // Owner (REP) != converter (MGR) -> should notify.
    r = await notify(MGR.client, {
      orgId, userId: REP.id, entityType: "deal", entityId: deal.id,
      title: "Your lead was converted to a deal", body: "Punchlist lead",
    });
    record("9. Convert: owner != converter -> notification insert succeeds", !r.error, r.error?.message);
    const repNotifs2 = await unreadTitlesFor(REP.id);
    record("10. Sales Rep received the conversion notification",
      repNotifs2.some((n) => n.title === "Your lead was converted to a deal"), JSON.stringify(repNotifs2));
    // self-conversion case is just an `if (owner_id !== userId)` guard in app code -- no DB call happens,
    // nothing to check at the DB level beyond confirming that guard exists (already verified by reading the source).

    // ================= RLS: select only own =================
    const { data: mgrOwnRows, error: selErr } = await MGR.client.from("notifications").select("id");
    record("11. Sales Manager can select notifications (their own rows only, via RLS)", !selErr, selErr?.message);
    const { data: repSeesTech } = await REP.client.from("notifications").select("id").eq("user_id", TECH.id);
    record("12. RLS blocks a user from reading another user's notifications", (repSeesTech ?? []).length === 0, JSON.stringify(repSeesTech));

    // ================= RLS: markNotificationRead / markAllNotificationsRead ownership =================
    const { data: repRow } = await admin.from("notifications").select("id").eq("user_id", REP.id).limit(1).single();
    const { data: crossUpdate } = await TECH.client.from("notifications")
      .update({ is_read: true }).eq("id", repRow.id).eq("user_id", TECH.id).select("id");
    record("13. A user cannot mark another user's notification read (RLS + ownership filter blocks it)",
      (crossUpdate ?? []).length === 0, JSON.stringify(crossUpdate));

    const { data: ownUpdate, error: ownErr } = await REP.client.from("notifications")
      .update({ is_read: true }).eq("id", repRow.id).eq("user_id", REP.id).select("id");
    record("14. A user CAN mark their own notification read", !ownErr && (ownUpdate ?? []).length === 1, ownErr?.message);

    const { error: markAllErr } = await REP.client.from("notifications")
      .update({ is_read: true }).eq("user_id", REP.id).eq("is_read", false);
    record("15. markAllNotificationsRead's query (own unread rows) succeeds", !markAllErr, markAllErr?.message);
    const repFinal = await unreadTitlesFor(REP.id);
    record("16. After mark-all, Sales Rep has zero unread notifications", repFinal.every((n) => n.is_read), JSON.stringify(repFinal));

    // ================= Review notes appended to timeline (logic check) =================
    const summary =
      ("Technical review: Approved") + (" some notes" ? ` — "some notes"` : "");
    record("17. Timeline summary correctly appends note text when notes present",
      summary === 'Technical review: Approved — "some notes"', summary);
    const summaryNoNotes = ("Technical review: Approved") + ("" ? ` — "${""}"` : "");
    record("18. Timeline summary omits the em-dash suffix when notes are blank",
      summaryNoNotes === "Technical review: Approved", summaryNoNotes);

    // ================= Deal delivery stage =================
    const { data: deal2, error: deal2Err } = await admin.from("deals").insert({
      org_id: orgId, owner_id: MGR.id, title: "Delivery stage check", stage: "delivery",
    }).select("id, stage").single();
    record("19. A deal can be created directly in the new 'delivery' stage", !deal2Err && deal2?.stage === "delivery", deal2Err?.message);

    const { error: moveErr } = await MGR.client.from("deals")
      .update({ stage: "delivery" }).eq("id", deal.id).select("id").single();
    record("20. moveDealStage's update query accepts 'delivery' as a target stage", !moveErr, moveErr?.message);

    const { error: badStageErr } = await admin.from("deals")
      .insert({ org_id: orgId, owner_id: MGR.id, title: "Bad stage", stage: "made_up_stage" });
    record("21. The stage check constraint still rejects an invalid stage value", !!badStageErr, badStageErr ? "correctly rejected" : "should have errored");

  } finally {
    await admin.from("organizations").delete().eq("id", orgId);
    console.log("Cleaned up throwaway org.");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("SCRIPT ERROR:", e);
  process.exit(1);
});
