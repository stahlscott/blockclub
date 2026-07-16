import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createIntegrationClients,
  createNeighborhood,
  createTestUser,
  deleteNeighborhood,
  deleteTestUser,
  seedMembership,
  seedProfile,
  signInAs,
} from "./client";

const clients = createIntegrationClients();
const anon = clients.anon;
const service = clients.service;
let admin: { id: string; email: string; password: string };
let staff: { id: string; email: string; password: string };
let member: { id: string; email: string; password: string };
let outsider: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };
let otherNeighborhood: { id: string; slug: string };
let pendingMembership: { id: string };

beforeAll(async () => {
  admin = await createTestUser(service, "moderation-admin");
  staff = await createTestUser(service, "moderation-staff");
  member = await createTestUser(service, "moderation-member");
  outsider = await createTestUser(service, "moderation-outsider");
  await Promise.all([
    seedProfile(service, admin, "Moderation Admin"),
    seedProfile(service, staff, "Moderation Staff"),
    seedProfile(service, member, "Moderation Member"),
    seedProfile(service, outsider, "Moderation Outsider"),
  ]);
  neighborhood = await createNeighborhood(service, admin.id, "Moderation Neighborhood", { requireApproval: true });
  otherNeighborhood = await createNeighborhood(service, outsider.id, "Other Moderation Neighborhood");
  await seedMembership(service, { userId: admin.id, neighborhoodId: neighborhood.id, role: "admin" });
  const { error: staffAdminError } = await service
    .from("staff_admins")
    .insert({ user_id: staff.id, email: staff.email, active: true });
  if (staffAdminError) throw new Error(`Could not seed staff allowlist: ${staffAdminError.message}`);
  pendingMembership = await seedMembership(service, { userId: member.id, neighborhoodId: neighborhood.id, status: "pending" });
  await seedMembership(service, { userId: outsider.id, neighborhoodId: otherNeighborhood.id, role: "admin" });
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteNeighborhood(service, otherNeighborhood.id),
    deleteTestUser(service, admin.id),
    deleteTestUser(service, member.id),
    deleteTestUser(service, outsider.id),
  ]);
});

describe("membership moderation contract", () => {
  it("staff_allowlist_function_recognizes_only_active_rows", async () => {
    const allowed = await service.rpc("is_staff_admin", { p_user_id: staff.id });
    const denied = await service.rpc("is_staff_admin", { p_user_id: outsider.id });
    expect(allowed.error).toBeNull();
    expect(allowed.data).toBe(true);
    expect(denied.error).toBeNull();
    expect(denied.data).toBe(false);
  });

  it("staff_rpc_records_valid_actor_and_effective_user", async () => {
    const { data, error } = await service.rpc("staff_moderate_pending_membership", {
      p_membership_id: pendingMembership.id,
      p_effective_user_id: admin.id,
      p_staff_actor_id: staff.id,
      p_decision: "approve",
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, status: "active", affected_membership_count: 1 });
    const { data: row } = await service.from("memberships").select("staff_actor_id").eq("id", pendingMembership.id).single();
    expect(row?.staff_actor_id).toBe(staff.id);
    await service.from("memberships").update({ status: "pending", deleted_at: null, staff_actor_id: null }).eq("id", pendingMembership.id);
  });

  it("staff_rpc_rejects_forged_effective_user_and_missing_identity", async () => {
    const forged = await service.rpc("staff_moderate_pending_membership", {
      p_membership_id: pendingMembership.id,
      p_effective_user_id: outsider.id,
      p_staff_actor_id: staff.id,
      p_decision: "approve",
    });
    expect(forged.error).toBeNull();
    expect(forged.data).toMatchObject({ success: false, reason: "effective_user_not_authorized_or_conflict" });

    const unallowlisted = await service.rpc("staff_moderate_pending_membership", {
      p_membership_id: pendingMembership.id,
      p_effective_user_id: admin.id,
      p_staff_actor_id: outsider.id,
      p_decision: "approve",
    });
    expect(unallowlisted.error).toBeNull();
    expect(unallowlisted.data).toMatchObject({ success: false, reason: "staff_actor_not_allowlisted" });
  });

  it("authenticated_browser_cannot_invoke_staff_rpc", async () => {
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("staff_moderate_pending_membership", {
      p_membership_id: pendingMembership.id,
      p_effective_user_id: admin.id,
      p_staff_actor_id: staff.id,
      p_decision: "approve",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("staff_membership_commands_preserve_history_and_enforce_state", async () => {
    const { data: removed, error: removeError } = await service.rpc("staff_membership_operation", {
      p_operation: "remove",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: staff.id,
    });
    expect(removeError).toBeNull();
    expect(removed).toMatchObject({ success: true, status: "inactive", affected_membership_count: 1 });

    const { data: preserved } = await service
      .from("memberships")
      .select("id, user_id, neighborhood_id, deleted_at, staff_actor_id")
      .eq("id", pendingMembership.id)
      .single();
    expect(preserved).toMatchObject({ id: pendingMembership.id, user_id: member.id, neighborhood_id: neighborhood.id, staff_actor_id: staff.id });
    expect(preserved?.deleted_at).toBeTruthy();

    const { data: reactivated, error: reactivateError } = await service.rpc("staff_membership_operation", {
      p_operation: "reactivate",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: staff.id,
    });
    expect(reactivateError).toBeNull();
    expect(reactivated).toMatchObject({ success: true, status: "active", affected_membership_count: 1 });

    const promoted = await service.rpc("staff_membership_operation", {
      p_operation: "promote",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: staff.id,
    });
    expect(promoted.error).toBeNull();
    expect(promoted.data).toMatchObject({ success: true, role: "admin", affected_membership_count: 1 });

    const demoted = await service.rpc("staff_membership_operation", {
      p_operation: "demote",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: staff.id,
    });
    expect(demoted.error).toBeNull();
    expect(demoted.data).toMatchObject({ success: true, role: "member", affected_membership_count: 1 });

    await service.from("memberships").update({ status: "pending", deleted_at: null, staff_actor_id: null }).eq("id", pendingMembership.id);
  });

  it("staff_add_command_creates_membership_with_audit", async () => {
    const { data, error } = await service.rpc("staff_membership_operation", {
      p_operation: "add",
      p_target_user_id: member.id,
      p_neighborhood_id: otherNeighborhood.id,
      p_role: "member",
      p_staff_actor_id: staff.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, user_id: member.id, neighborhood_id: otherNeighborhood.id, status: "active", affected_membership_count: 1 });
    const { data: row } = await service.from("memberships").select("staff_actor_id").eq("id", data?.membership_id).single();
    expect(row?.staff_actor_id).toBe(staff.id);
  });

  it("staff_command_rejects_unallowlisted_and_browser_callers", async () => {
    const unallowlisted = await service.rpc("staff_membership_operation", {
      p_operation: "approve",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: outsider.id,
    });
    expect(unallowlisted.error).toBeNull();
    expect(unallowlisted.data).toMatchObject({ success: false, reason: "staff_actor_not_allowlisted" });

    await anon.auth.signOut();
    await signInAs(anon, admin);
    const browser = await anon.rpc("staff_membership_operation", {
      p_operation: "approve",
      p_membership_id: pendingMembership.id,
      p_staff_actor_id: staff.id,
    });
    expect(browser.data).toBeNull();
    expect(browser.error?.code).toBe("42501");
  });

  it("admin_can_approve_pending_membership", async () => {
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data: signedIn } = await anon.auth.getUser();
    expect(signedIn.user?.id).toBe(admin.id);
    const { data, error } = await anon.rpc("moderate_pending_membership", { p_membership_id: pendingMembership.id, p_decision: "approve" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", membership_id: pendingMembership.id, status: "active", affected_membership_count: 1 });
    await service.from("memberships").update({ status: "pending", deleted_at: null }).eq("id", pendingMembership.id);
  });

  it("admin_can_decline_pending_membership_with_soft_delete", async () => {
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("moderate_pending_membership", { p_membership_id: pendingMembership.id, p_decision: "decline" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", membership_id: pendingMembership.id, status: "inactive", affected_membership_count: 1 });
    expect(data?.deleted_at).toBeTruthy();
    await service.from("memberships").update({ status: "pending", deleted_at: null }).eq("id", pendingMembership.id);
  });

  it("cross_neighborhood_admin_cannot_moderate_target", async () => {
    await anon.auth.signOut();
    await signInAs(anon, outsider);
    const { data, error } = await anon
      .from("memberships")
      .update({ status: "active" })
      .eq("id", pendingMembership.id)
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select("id");
    expect(error?.code === "42501" || data?.length === 0).toBe(true);
  });

  it("anonymous_moderation_rpc_is_denied", async () => {
    await anon.auth.signOut();
    const { data, error } = await anon.rpc("moderate_pending_membership", { p_membership_id: pendingMembership.id, p_decision: "approve" });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("direct_authenticated_membership_delete_is_denied", async () => {
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.from("memberships").delete().eq("id", pendingMembership.id).select("id");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
