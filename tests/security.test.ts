import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = ["supabase/migrations/202608140001_hyphy_hq.sql", "supabase/migrations/202608140002_flexible_workspace.sql"].map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

describe("workspace security migration", () => {
  it("enables RLS on every workspace-owned table", () => {
    const tables = ["workspaces", "workspace_members", "things", "thing_dates", "thing_sections", "thing_notes", "thing_links", "inbox_items", "inbox_attachments", "ai_runs", "inbox_proposals", "activity_events", "thing_messages", "approvals", "approval_actions", "contacts", "thing_contacts", "thing_options", "orders", "integration_connections", "thing_relationships", "items", "custom_field_definitions", "custom_field_values", "preferences", "templates", "workspace_snapshots"];
    for (const table of tables) expect(sql).toContain(`alter table public.${table} enable row level security`);
  });

  it("reserves approval resolution and integration management for the owner", () => {
    expect(sql).toContain("approvals_owner_resolve");
    expect(sql).toContain("approval_actions_owner_write");
    expect(sql).toContain("integrations_owner_manage");
    expect(sql).toContain("is_workspace_owner(workspace_id)");
  });

  it("enforces one active owner per workspace", () => {
    expect(sql).toContain("one_active_owner_per_workspace");
    expect(sql).toContain("where role='owner' and status='active'");
  });
});
