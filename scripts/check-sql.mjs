import { readFileSync } from "node:fs";

const migration = ["202608140001_hyphy_hq.sql", "202608140002_flexible_workspace.sql"].map((file) => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8")).join("\n").toLowerCase();
const requiredTables = ["workspaces", "workspace_members", "things", "thing_dates", "thing_sections", "thing_notes", "thing_links", "inbox_items", "inbox_attachments", "ai_runs", "inbox_proposals", "activity_events", "thing_messages", "approvals", "approval_actions", "contacts", "thing_contacts", "thing_options", "orders", "integration_connections"];
requiredTables.push("thing_relationships", "items", "custom_field_definitions", "custom_field_values", "preferences", "templates", "workspace_snapshots");
const missing = requiredTables.filter((table) => !new RegExp(`create table (if not exists )?public\\.${table}`).test(migration) || !migration.includes(`alter table public.${table} enable row level security`));
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
