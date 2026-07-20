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
let memberMembership: { id: string };

beforeAll(async () => {
  admin = await createTestUser(service, "promotion-admin");
  member = await createTestUser(service, "promotion-member");
  outsider = await createTestUser(service, "promotion-outsider");
  await Promise.all([
    seedProfile(service, admin, "Promotion Admin"),
    seedProfile(service, member, "Promotion Member"),
    seedProfile(service, outsider, "Promotion Outsider"),
  ]);
  neighborhood = await createNeighborhood(service, admin.id, "Promotion Neighborhood");
  otherNeighborhood = await createNeighborhood(service, outsider.id, "Other Promotion Neighborhood");
  await seedMembership(service, { userId: admin.id, neighborhoodId: neighborhood.id, role: "admin" });
  await seedMembership(service, { userId: outsider.id, neighborhoodId: otherNeighborhood.id, role: "admin" });
  memberMembership = await seedMembership(service, { userId: member.id, neighborhoodId: neighborhood.id, role: "member" });
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

describe("neighborhood admin promotion contract", () => {
  it("neighborhood_admin_can_promote_active_member", async () => {
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("promote_membership_to_admin", {
      p_membership_id: memberMembership.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      reason: "updated",
      membership_id: memberMembership.id,
      neighborhood_id: neighborhood.id,
      role: "admin",
      affected_membership_count: 1,
    });
    const { data: row } = await service.from("memberships").select("role").eq("id", memberMembership.id).single();
    expect(row?.role).toBe("admin");
    await service.from("memberships").update({ role: "member" }).eq("id", memberMembership.id);
  });

  it("promotion_is_rejected_for_already_admin_target", async () => {
    await service.from("memberships").update({ role: "admin" }).eq("id", memberMembership.id);
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("promote_membership_to_admin", {
      p_membership_id: memberMembership.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized_or_conflict", affected_membership_count: 0 });
    await service.from("memberships").update({ role: "member" }).eq("id", memberMembership.id);
  });

  it("cross_neighborhood_admin_cannot_promote", async () => {
    await anon.auth.signOut();
    await signInAs(anon, outsider);
    const { data, error } = await anon.rpc("promote_membership_to_admin", {
      p_membership_id: memberMembership.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized_or_conflict", affected_membership_count: 0 });
    const { data: row } = await service.from("memberships").select("role").eq("id", memberMembership.id).single();
    expect(row?.role).toBe("member");
  });

  it("ordinary_member_cannot_promote_themselves", async () => {
    await anon.auth.signOut();
    await signInAs(anon, member);
    const { data, error } = await anon.rpc("promote_membership_to_admin", {
      p_membership_id: memberMembership.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized_or_conflict", affected_membership_count: 0 });
  });

  it("anonymous_promotion_is_denied", async () => {
    await anon.auth.signOut();
    const { data, error } = await anon.rpc("promote_membership_to_admin", {
      p_membership_id: memberMembership.id,
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
