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
let member: { id: string; email: string; password: string };
let borrower: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };
let membership: { id: string };
let requestedItem: { id: string };
let approvedItem: { id: string };
let activeItem: { id: string };
let requestedLoan: { id: string };
let approvedLoan: { id: string };
let activeLoan: { id: string };

beforeAll(async () => {
  member = await createTestUser(service, "move-out-member");
  borrower = await createTestUser(service, "move-out-borrower");
  await seedProfile(service, member, "Move Out Member");
  await seedProfile(service, borrower, "Move Out Borrower");
  neighborhood = await createNeighborhood(service, member.id);
  membership = await seedMembership(service, { userId: member.id, neighborhoodId: neighborhood.id, role: "admin" });
  await seedMembership(service, { userId: borrower.id, neighborhoodId: neighborhood.id });
  requestedItem = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: member.id, name: "Requested Item" });
  approvedItem = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: member.id, name: "Approved Item" });
  activeItem = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: member.id, name: "Active Item", availability: "borrowed" });
  requestedLoan = await seedLoan(service, { itemId: requestedItem.id, borrowerId: borrower.id, status: "requested" });
  approvedLoan = await seedLoan(service, { itemId: approvedItem.id, borrowerId: borrower.id, status: "approved" });
  activeLoan = await seedLoan(service, { itemId: activeItem.id, borrowerId: borrower.id, status: "requested" });
  await service.from("loans").update({ status: "active", start_date: "2026-07-14" }).eq("id", activeLoan.id);
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteTestUser(service, member.id),
    deleteTestUser(service, borrower.id),
  ]);
});

describe("atomic move-out", () => {
  it("move_out_operation_is_atomic_and_preserves_item_loan_history", async () => {
    await anon.auth.signOut();
    await signInAs(anon, member);
    const { data, error } = await anon.rpc("move_out_membership", { p_membership_id: membership.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", membership_id: membership.id, affected_item_count: 3, cancelled_loan_count: 2, returned_loan_count: 1 });

    const { data: membershipRow } = await service.from("memberships").select("status, deleted_at").eq("id", membership.id).single();
    expect(membershipRow).toEqual({ status: "moved_out", deleted_at: null });
    const { data: items } = await service.from("items").select("id, deleted_at").in("id", [requestedItem.id, approvedItem.id, activeItem.id]);
    expect(items).toHaveLength(3);
    expect(items?.every((item) => item.deleted_at !== null)).toBe(true);
    const { data: loans } = await service.from("loans").select("id, status, returned_at, closure_reason, closed_by_user_id").in("id", [requestedLoan.id, approvedLoan.id, activeLoan.id]);
    expect(loans).toHaveLength(3);
    expect(loans?.find((loan) => loan.id === requestedLoan.id)).toMatchObject({ status: "cancelled", closure_reason: "administrative_move_out", closed_by_user_id: member.id });
    expect(loans?.find((loan) => loan.id === approvedLoan.id)).toMatchObject({ status: "cancelled", closure_reason: "administrative_move_out", closed_by_user_id: member.id });
    expect(loans?.find((loan) => loan.id === activeLoan.id)).toMatchObject({ status: "returned", closure_reason: "administrative_move_out", closed_by_user_id: member.id });
    expect(loans?.find((loan) => loan.id === activeLoan.id)?.returned_at).toBeTruthy();
  });

  it("move_out_operation_rejects_unrelated_membership", async () => {
    const other = await createTestUser(service, "move-out-other");
    await seedProfile(service, other, "Move Out Other");
    await anon.auth.signOut();
    await signInAs(anon, borrower);
    const { data, error } = await anon.rpc("move_out_membership", { p_membership_id: membership.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized" });
    await deleteTestUser(service, other.id);
  });

  it("move_out_rpc_is_denied_to_anon", async () => {
    await anon.auth.signOut();
    const { data, error } = await anon.rpc("move_out_membership", { p_membership_id: membership.id });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
