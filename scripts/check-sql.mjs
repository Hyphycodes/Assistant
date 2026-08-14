import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/202608140001_hyphy_hq.sql", import.meta.url), "utf8").toLowerCase();
const requiredTables = ["workspaces", "workspace_members", "things", "thing_dates", "thing_sections", "thing_notes", "thing_links", "inbox_items", "inbox_attachments", "ai_runs", "inbox_proposals", "activity_events", "thing_messages", "approvals", "approval_actions", "contacts", "thing_contacts", "thing_options", "orders", "integration_connections"];
const missing = requiredTables.filter((table) => !migration.includes(`create table public.${table}`) || !migration.includes(`alter table public.${table} enable row level security`));
if (missing.length) {
  console.error(`Migration contract incomplete: ${missing.join(", ")}`);
  process.exit(1);
}
for (const token of ["is_workspace_member", "is_workspace_owner", "one_active_owner_per_workspace", "workspace_id"]) {
  if (!migration.includes(token)) {
    console.error(`Migration contract missing: ${token}`);
    process.exit(1);
  }
}
console.log(`SQL contract valid: ${requiredTables.length} workspace tables include RLS.`);
