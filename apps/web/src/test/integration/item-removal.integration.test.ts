import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createIntegrationClients,
  createNeighborhood,
  createTestUser,
  deleteNeighborhood,
  deleteTestUser,
  seedItem,
  seedLoan,
  seedMembership,
  seedProfile,
  signInAs,
} from "./client";

const clients = createIntegrationClients();
const anon = clients.anon;
const service = clients.service;
let owner: { id: string; email: string; password: string };
let borrower: { id: string; email: string; password: string };
let admin: { id: string; email: string; password: string };
let unrelated: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };

beforeAll(async () => {
  owner = await createTestUser(service, "item-removal-owner");
  borrower = await createTestUser(service, "item-removal-borrower");
  admin = await createTestUser(service, "item-removal-admin");
  unrelated = await createTestUser(service, "item-removal-unrelated");
  await Promise.all([
    seedProfile(service, owner, "Item Removal Owner"),
    seedProfile(service, borrower, "Item Removal Borrower"),
    seedProfile(service, admin, "Item Removal Admin"),
    seedProfile(service, unrelated, "Item Removal Unrelated"),
  ]);
  neighborhood = await createNeighborhood(service, owner.id);
  await seedMembership(service, { userId: owner.id, neighborhoodId: neighborhood.id, role: "member" });
  await seedMembership(service, { userId: borrower.id, neighborhoodId: neighborhood.id });
  await seedMembership(service, { userId: admin.id, neighborhoodId: neighborhood.id, role: "admin" });
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteTestUser(service, owner.id),
    deleteTestUser(service, borrower.id),
    deleteTestUser(service, admin.id),
    deleteTestUser(service, unrelated.id),
  ]);
});

describe("soft_delete_item RPC", () => {
  it("owner_soft_deletes_item_and_preserves_requested_and_approved_history", async () => {
    const requestedItem = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Requested removal" });
    const approvedItem = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Approved removal" });
    const requestedLoan = await seedLoan(service, { itemId: requestedItem.id, borrowerId: borrower.id, status: "requested" });
    const approvedLoan = await seedLoan(service, { itemId: approvedItem.id, borrowerId: borrower.id, status: "approved" });

    await anon.auth.signOut();
    await signInAs(anon, owner);
    const { data, error } = await anon.rpc("soft_delete_item", { p_item_id: requestedItem.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", item_id: requestedItem.id, affected_item_count: 1, cancelled_loan_count: 1 });

    const { data: item } = await service.from("items").select("deleted_at").eq("id", requestedItem.id).single();
    expect(item?.deleted_at).toBeTruthy();
    const { data: loan } = await service.from("loans").select("status, closure_reason, closed_by_user_id").eq("id", requestedLoan.id).single();
    expect(loan).toEqual({ status: "cancelled", closure_reason: "administrative_item_removal", closed_by_user_id: owner.id });

    const { data: adminResult, error: adminError } = await anon.rpc("soft_delete_item", { p_item_id: approvedItem.id });
    expect(adminError).toBeNull();
    expect(adminResult).toMatchObject({ success: true, cancelled_loan_count: 1 });
    const { data: approvedHistory } = await service.from("loans").select("status, closure_reason").eq("id", approvedLoan.id).single();
    expect(approvedHistory).toEqual({ status: "cancelled", closure_reason: "administrative_item_removal" });
  });

  it("neighborhood_admin_can_soft_delete_unowned_item", async () => {
    const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Admin removal" });
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("soft_delete_item", { p_item_id: item.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", affected_item_count: 1 });
  });

  it("active_loan_refusal_preserves_item_and_loan", async () => {
    const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, availability: "borrowed" });
    const loan = await seedLoan(service, { itemId: item.id, borrowerId: borrower.id, status: "active" });
    await service.from("loans").update({ start_date: "2026-07-14" }).eq("id", loan.id);

    await anon.auth.signOut();
    await signInAs(anon, owner);
    const { data, error } = await anon.rpc("soft_delete_item", { p_item_id: item.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "active_loan", affected_item_count: 0, cancelled_loan_count: 0 });

    const { data: itemRow } = await service.from("items").select("deleted_at").eq("id", item.id).single();
    expect(itemRow?.deleted_at).toBeNull();
    const { data: loanRow } = await service.from("loans").select("status").eq("id", loan.id).single();
    expect(loanRow).toEqual({ status: "active" });
  });

  it("unrelated_member_is_rejected_without_side_effects", async () => {
    const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id });
    await anon.auth.signOut();
    await signInAs(anon, unrelated);
    const { data, error } = await anon.rpc("soft_delete_item", { p_item_id: item.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized" });
    const { data: itemRow } = await service.from("items").select("deleted_at").eq("id", item.id).single();
    expect(itemRow?.deleted_at).toBeNull();
  });

  it("direct_authenticated_delete_is_denied", async () => {
    const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id });
    await anon.auth.signOut();
    await signInAs(anon, owner);
    const { data, error } = await anon.from("items").delete().eq("id", item.id).select("id");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("anonymous_rpc_invocation_is_denied", async () => {
    await anon.auth.signOut();
    const { data, error } = await anon.rpc("soft_delete_item", { p_item_id: "00000000-0000-0000-0000-000000000000" });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
