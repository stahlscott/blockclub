import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedClient,
  createIntegrationClients,
  createNeighborhood,
  createTestUser,
  deleteNeighborhood,
  deleteTestUser,
  seedItem,
  seedLoan,
  seedMembership,
  seedPost,
  seedProfile,
  signInAs,
} from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

const clients = createIntegrationClients();
const anon = clients.anon;
const service = clients.service;
let owner: { id: string; email: string; password: string };
let borrower: { id: string; email: string; password: string };
let outsider: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };
let otherNeighborhood: { id: string; slug: string };
let item: { id: string };
let post: { id: string };
let loan: { id: string };
let borrowerMembership: { id: string };

async function useUser(user: { email: string; password: string }): Promise<SupabaseClient> {
  await anon.auth.signOut();
  return signInAs(anon, user);
}

beforeAll(async () => {
  owner = await createTestUser(service, "owner");
  borrower = await createTestUser(service, "borrower");
  outsider = await createTestUser(service, "outsider");
  await Promise.all([
    seedProfile(service, owner, "Integration Owner"),
    seedProfile(service, borrower, "Integration Borrower"),
    seedProfile(service, outsider, "Integration Outsider"),
  ]);
  neighborhood = await createNeighborhood(service, owner.id);
  otherNeighborhood = await createNeighborhood(service, owner.id, "Other Integration Neighborhood");
  await seedMembership(service, { userId: owner.id, neighborhoodId: neighborhood.id, role: "admin" });
  borrowerMembership = await seedMembership(service, { userId: borrower.id, neighborhoodId: neighborhood.id });
  await seedMembership(service, { userId: outsider.id, neighborhoodId: otherNeighborhood.id });
  item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id });
  post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: owner.id });
  loan = await seedLoan(service, { itemId: item.id, borrowerId: borrower.id });
});

afterEach(async () => {
  await service
    .from("loans")
    .update({ status: "requested", borrower_id: borrower.id, deleted_at: null, returned_at: null, start_date: null })
    .eq("id", loan.id);
  await service.from("items").update({ deleted_at: null, availability: "available" }).eq("id", item.id);
  await service.from("posts").update({ deleted_at: null }).eq("id", post.id);
  await service.from("memberships").update({ status: "active", deleted_at: null }).eq("id", borrowerMembership.id);
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteNeighborhood(service, otherNeighborhood.id),
    deleteTestUser(service, owner.id),
    deleteTestUser(service, borrower.id),
    deleteTestUser(service, outsider.id),
  ]);
});

describe("authenticated RLS characterization", () => {
  it("integration_soft_deleted_rows_are_hidden_from_authenticated_reads", async () => {
    const user = await useUser(owner);
    const { error: itemError } = await service.from("items").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
    const { error: postError } = await service.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", post.id);
    const { error: loanError } = await service.from("loans").update({ deleted_at: new Date().toISOString() }).eq("id", loan.id);
    expect(itemError).toBeNull();
    expect(postError).toBeNull();
    expect(loanError).toBeNull();

    const [items, posts, loans] = await Promise.all([
      user.from("items").select("id").eq("id", item.id),
      user.from("posts").select("id").eq("id", post.id),
      user.from("loans").select("id").eq("id", loan.id),
    ]);
    expect(items.data).toEqual([]);
    expect(posts.data).toEqual([]);
    expect(loans.data).toEqual([]);

    await Promise.all([
      service.from("items").update({ deleted_at: null }).eq("id", item.id),
      service.from("posts").update({ deleted_at: null }).eq("id", post.id),
      service.from("loans").update({ deleted_at: null }).eq("id", loan.id),
    ]);
  });

  it("integration_cross_neighborhood_reads_and_writes_are_rejected", async () => {
    const user = await useUser(outsider);
    const { data: visibleItems, error: readError } = await user.from("items").select("id").eq("id", item.id);
    expect(readError).toBeNull();
    expect(visibleItems).toEqual([]);

    const { data: changedRows, error: updateError } = await user
      .from("items")
      .update({ name: "forged" })
      .eq("id", item.id)
      .select("id");
    expect(updateError).toBeNull();
    expect(changedRows).toEqual([]);
  });

  it("integration_loan_owner_cannot_forge_status_or_relationships", async () => {
    const user = await useUser(owner);
    const { data: changedRows, error } = await user
      .from("loans")
      .update({ status: "returned", borrower_id: owner.id })
      .eq("id", loan.id)
      .select("id, status, borrower_id");
    expect(error?.code === "42501" || changedRows?.length === 0).toBe(true);
    const { data: unchangedLoan, error: readError } = await service
      .from("loans")
      .select("id, status, borrower_id")
      .eq("id", loan.id)
      .single();
    expect(readError).toBeNull();
    expect(unchangedLoan).toMatchObject({ id: loan.id, status: "requested", borrower_id: borrower.id });
  });

  it("integration_borrower_can_only_cancel_permitted_loan", async () => {
    const user = await useUser(borrower);
    const { data: directRows, error: directError } = await user
      .from("loans")
      .update({ status: "cancelled" })
      .eq("id", loan.id)
      .select("id, status");
    expect(directError?.code === "42501" || directRows?.length === 0).toBe(true);

    const { data: rpcResult, error: rpcError } = await user.rpc("cancel_loan", { p_loan_id: loan.id });
    expect(rpcError).toBeNull();
    expect(rpcResult).toMatchObject({ success: true, reason: "updated", loan_id: loan.id });
  });

  it("integration_self_borrow_insert_is_rejected", async () => {
    const user = await useUser(owner);
    const { data: insertedRows, error } = await user
      .from("loans")
      .insert({ item_id: item.id, borrower_id: owner.id, status: "requested", notes: null, deleted_at: null })
      .select("id");
    expect(error).not.toBeNull();
    expect(insertedRows).toBeNull();
  });

  it("concurrent_duplicate_loan_requests_have_one_unique_index_winner", async () => {
    const borrowerTwo = await createTestUser(service, "borrower-two");
    await seedProfile(service, borrowerTwo, "Integration Borrower Two");
    await seedMembership(service, { userId: borrowerTwo.id, neighborhoodId: neighborhood.id });
    const [first, second] = await Promise.all([
      createAuthenticatedClient(borrower),
      createAuthenticatedClient(borrowerTwo),
    ]);
    const requests = await Promise.all([
      first.from("loans").insert({ item_id: item.id, borrower_id: borrower.id, status: "requested", notes: "race one", deleted_at: null }).select("id"),
      second.from("loans").insert({ item_id: item.id, borrower_id: borrowerTwo.id, status: "requested", notes: "race two", deleted_at: null }).select("id"),
    ]);
    expect(requests.filter(({ data, error }) => error === null && (data?.length ?? 0) === 1)).toHaveLength(1);
    expect(requests.filter(({ error }) => error !== null)).toHaveLength(1);
    await service.from("loans").delete().eq("borrower_id", borrowerTwo.id);
    await service.from("memberships").delete().eq("user_id", borrowerTwo.id);
    await deleteTestUser(service, borrowerTwo.id);
  });

  it("rls_self_move_out_policy_allows_only_own_active_membership", async () => {
    await service.from("memberships").update({ status: "active", deleted_at: null }).eq("id", borrowerMembership.id);
    const user = await useUser(borrower);
    const { data, error } = await user
      .from("memberships")
      .update({ status: "moved_out" })
      .eq("id", borrowerMembership.id)
      .select("id, user_id, neighborhood_id, status");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: borrowerMembership.id, user_id: borrower.id, neighborhood_id: neighborhood.id, status: "moved_out" }]);
  });

  it("rls_self_rejoin_policy_allows_only_own_moved_out_membership", async () => {
    await service.from("memberships").update({ status: "moved_out", deleted_at: null }).eq("id", borrowerMembership.id);
    const user = await useUser(borrower);
    const { data, error } = await user
      .from("memberships")
      .update({ status: "active" })
      .eq("id", borrowerMembership.id)
      .select("id, user_id, neighborhood_id, status");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: borrowerMembership.id, user_id: borrower.id, neighborhood_id: neighborhood.id, status: "active" }]);
  });

  it("rls_membership_transition_rejects_unrelated_membership", async () => {
    await service.from("memberships").update({ status: "active", deleted_at: null }).eq("id", borrowerMembership.id);
    const user = await useUser(outsider);
    const { data, error } = await user
      .from("memberships")
      .update({ status: "moved_out" })
      .eq("id", borrowerMembership.id)
      .select("id");
    expect(error?.code === "42501" || data?.length === 0).toBe(true);
  });
});
