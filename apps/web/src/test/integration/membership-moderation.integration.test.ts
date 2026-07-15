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
let member: { id: string; email: string; password: string };
let outsider: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };
let otherNeighborhood: { id: string; slug: string };
let pendingMembership: { id: string };

beforeAll(async () => {
  admin = await createTestUser(service, "moderation-admin");
  member = await createTestUser(service, "moderation-member");
  outsider = await createTestUser(service, "moderation-outsider");
  await Promise.all([
    seedProfile(service, admin, "Moderation Admin"),
    seedProfile(service, member, "Moderation Member"),
    seedProfile(service, outsider, "Moderation Outsider"),
  ]);
  neighborhood = await createNeighborhood(service, admin.id, "Moderation Neighborhood", { requireApproval: true });
  otherNeighborhood = await createNeighborhood(service, outsider.id, "Other Moderation Neighborhood");
  await seedMembership(service, { userId: admin.id, neighborhoodId: neighborhood.id, role: "admin" });
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
