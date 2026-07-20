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
let userA: { id: string; email: string; password: string };
let userB: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };
let approvalNeighborhood: { id: string; slug: string };
let movedOutMembership: { id: string };
let activeMembership: { id: string };
let otherMembership: { id: string };

beforeAll(async () => {
  userA = await createTestUser(service, "rejoin-a");
  userB = await createTestUser(service, "rejoin-b");
  await seedProfile(service, userA, "Rejoin A");
  await seedProfile(service, userB, "Rejoin B");
  neighborhood = await createNeighborhood(service, userA.id, "Rejoin Neighborhood");
  approvalNeighborhood = await createNeighborhood(service, userA.id, "Approval Neighborhood");
  movedOutMembership = await seedMembership(service, { userId: userA.id, neighborhoodId: neighborhood.id, status: "moved_out" });
  activeMembership = await seedMembership(service, { userId: userA.id, neighborhoodId: approvalNeighborhood.id, status: "active" });
  otherMembership = await seedMembership(service, { userId: userB.id, neighborhoodId: neighborhood.id, status: "moved_out" });
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteNeighborhood(service, approvalNeighborhood.id),
    deleteTestUser(service, userA.id),
    deleteTestUser(service, userB.id),
  ]);
});

describe("membership rejoin RLS contract", () => {
  it("allows_only_owned_moved_out_membership", async () => {
    await anon.auth.signOut();
    await signInAs(anon, userA);
    const { data, error } = await anon
      .from("memberships")
      .update({ status: "active" })
      .eq("id", movedOutMembership.id)
      .eq("user_id", userA.id)
      .eq("status", "moved_out")
      .is("deleted_at", null)
      .select("id, user_id, neighborhood_id, status");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: movedOutMembership.id, user_id: userA.id, neighborhood_id: neighborhood.id, status: "active" }]);
  });

  it("rejects_other_users_membership_and_non_moved_out_rows", async () => {
    await service.from("memberships").update({ status: "moved_out" }).eq("id", movedOutMembership.id);
    await anon.auth.signOut();
    await signInAs(anon, userA);
    const other = await anon.from("memberships").update({ status: "active" }).eq("id", otherMembership.id).select("id");
    expect(other.error?.code === "42501" || other.data?.length === 0).toBe(true);
    const active = await anon.from("memberships").update({ status: "moved_out" }).eq("id", activeMembership.id).eq("status", "moved_out").select("id");
    expect(active.error?.code === "42501" || active.data?.length === 0).toBe(true);
  });

  it("approval_neighborhood_keeps_rejoin_pending_when_active_members_exist", async () => {
    const approvalMembership = await seedMembership(service, { userId: userB.id, neighborhoodId: approvalNeighborhood.id, status: "moved_out" });
    await anon.auth.signOut();
    await signInAs(anon, userB);
    const { data, error } = await anon
      .from("memberships")
      .update({ status: "pending" })
      .eq("id", approvalMembership.id)
      .eq("user_id", userB.id)
      .eq("status", "moved_out")
      .is("deleted_at", null)
      .select("status");
    expect(error).toBeNull();
    expect(data).toEqual([{ status: "pending" }]);
  });

  it("stale_or_missing_membership_is_zero_rows_not_success", async () => {
    await anon.auth.signOut();
    await signInAs(anon, userA);
    const { data, error } = await anon
      .from("memberships")
      .update({ status: "active" })
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .eq("user_id", userA.id)
      .eq("status", "moved_out")
      .is("deleted_at", null)
      .select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
