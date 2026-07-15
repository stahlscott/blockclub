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
let neighborhood: { id: string; slug: string };

async function signIn(user: { email: string; password: string }) {
  await anon.auth.signOut();
  await signInAs(anon, user);
  return anon;
}

async function createLoan(status: "requested" | "approved" | "active" = "requested") {
  const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id });
  const loan = await seedLoan(service, {
    itemId: item.id,
    borrowerId: borrower.id,
    status: status === "active" ? "requested" : status,
  });
  if (status === "active") {
    await service.from("loans").update({ status: "active", start_date: "2026-07-14", closure_reason: null }).eq("id", loan.id);
    await service.from("items").update({ availability: "borrowed" }).eq("id", item.id);
  }
  return { item, loan };
}

beforeAll(async () => {
  owner = await createTestUser(service, "rpc-owner");
  borrower = await createTestUser(service, "rpc-borrower");
  await seedProfile(service, owner, "RPC Owner");
  await seedProfile(service, borrower, "RPC Borrower");
  neighborhood = await createNeighborhood(service, owner.id);
  await seedMembership(service, { userId: owner.id, neighborhoodId: neighborhood.id, role: "admin" });
  await seedMembership(service, { userId: borrower.id, neighborhoodId: neighborhood.id });
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteTestUser(service, owner.id),
    deleteTestUser(service, borrower.id),
  ]);
});

describe("loan lifecycle RPCs", () => {
  it("approve_loan_transitions_requested_to_approved", async () => {
    const { loan, item } = await createLoan();
    const user = await signIn(owner);
    const { data, error } = await user.rpc("approve_loan", { p_loan_id: loan.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", loan_id: loan.id, item_id: item.id, affected_loan_count: 1 });
    const { data: row } = await service.from("loans").select("status, start_date, due_date").eq("id", loan.id).single();
    expect(row).toEqual({ status: "approved", start_date: null, due_date: null });
  });

  it("pickup_loan_transitions_approved_to_active", async () => {
    const { loan, item } = await createLoan("approved");
    const user = await signIn(owner);
    const { data, error } = await user.rpc("activate_loan", { p_loan_id: loan.id, p_start_date: "2026-07-14", p_due_date: "2026-07-28" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", loan_id: loan.id, item_id: item.id, affected_loan_count: 1, affected_item_count: 1 });
    const { data: row } = await service.from("loans").select("status, start_date, due_date").eq("id", loan.id).single();
    expect(row).toEqual({ status: "active", start_date: "2026-07-14", due_date: "2026-07-28" });
    const { data: updatedItem } = await service.from("items").select("availability").eq("id", item.id).single();
    expect(updatedItem).toEqual({ availability: "borrowed" });
  });

  it("return_loan_transitions_active_to_returned", async () => {
    const { loan, item } = await createLoan("active");
    const user = await signIn(owner);
    const { data, error } = await user.rpc("return_loan", { p_loan_id: loan.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", loan_id: loan.id, item_id: item.id });
    const { data: row } = await service.from("loans").select("status, returned_at, closure_reason, closed_by_user_id").eq("id", loan.id).single();
    expect(row).toMatchObject({ status: "returned", closure_reason: "borrower_returned", closed_by_user_id: owner.id });
    expect(row?.returned_at).toBeTruthy();
    const { data: updatedItem } = await service.from("items").select("availability").eq("id", item.id).single();
    expect(updatedItem).toEqual({ availability: "available" });
  });

  it("cancel_loan_requires_borrower", async () => {
    const { loan } = await createLoan();
    const user = await signIn(owner);
    const { data, error } = await user.rpc("cancel_loan", { p_loan_id: loan.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "not_authorized" });
    const borrowerClient = await signIn(borrower);
    const result = await borrowerClient.rpc("cancel_loan", { p_loan_id: loan.id });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ success: true, reason: "updated" });
  });

  it("loan_action_rejects_terminal_state", async () => {
    const { loan } = await createLoan();
    await service.from("loans").update({ status: "cancelled", closure_reason: "owner_declined", closed_by_user_id: owner.id }).eq("id", loan.id);
    const user = await signIn(owner);
    const { data, error } = await user.rpc("approve_loan", { p_loan_id: loan.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: false, reason: "invalid_transition" });
  });

  it("direct_anon_rpc_invocation_is_denied", async () => {
    const { loan } = await createLoan();
    await anon.auth.signOut();
    const { data, error } = await anon.rpc("approve_loan", { p_loan_id: loan.id });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
