import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createIntegrationClients,
  createNeighborhood,
  createTestUser,
  deleteNeighborhood,
  deleteTestUser,
  seedItem,
  seedMembership,
  seedPost,
  seedProfile,
  seedLoan,
} from "./client";
import {
  getActiveMembership,
  getItemsByNeighborhood,
  getItemsByOwner,
  getLoansForBorrower,
  getPostsByNeighborhood,
} from "@/lib/queries";

const clients = createIntegrationClients();
const service = clients.service;

type TestUser = { id: string; email: string; password: string };
let owner: TestUser;
let borrower: TestUser;
let neighborhood: { id: string; slug: string };
let otherNeighborhood: { id: string; slug: string };

beforeAll(async () => {
  owner = await createTestUser(service, "query-owner");
  borrower = await createTestUser(service, "query-borrower");
  await Promise.all([
    seedProfile(service, owner, "Query Owner"),
    seedProfile(service, borrower, "Query Borrower"),
  ]);
  neighborhood = await createNeighborhood(service, owner.id);
  otherNeighborhood = await createNeighborhood(service, owner.id, "Other Query Neighborhood");
  await Promise.all([
    seedMembership(service, { userId: owner.id, neighborhoodId: neighborhood.id, role: "admin" }),
    seedMembership(service, { userId: borrower.id, neighborhoodId: neighborhood.id }),
    seedMembership(service, { userId: borrower.id, neighborhoodId: otherNeighborhood.id }),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteNeighborhood(service, otherNeighborhood.id),
    deleteTestUser(service, owner.id),
    deleteTestUser(service, borrower.id),
  ]);
});

describe("centralized query layer with admin clients", () => {
  it("query_admin_client_hides_soft_deleted_posts", async () => {
    const visible = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: owner.id, content: "Visible query post" });
    const deleted = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: owner.id, content: "Deleted query post" });
    await service.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", deleted.id);

    const { data, error } = await getPostsByNeighborhood(service, neighborhood.id);
    expect(error).toBeNull();
    expect(data?.map((post) => post.id)).toContain(visible.id);
    expect(data?.map((post) => post.id)).not.toContain(deleted.id);
  });

  it("query_admin_client_hides_soft_deleted_items", async () => {
    const visible = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Visible query item" });
    const deleted = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Deleted query item" });
    await service.from("items").update({ deleted_at: new Date().toISOString() }).eq("id", deleted.id);

    const { data, error } = await getItemsByNeighborhood(service, neighborhood.id, { includeUnavailable: true });
    expect(error).toBeNull();
    expect(data?.map((item) => item.id)).toContain(visible.id);
    expect(data?.map((item) => item.id)).not.toContain(deleted.id);
  });

  it("query_admin_client_hides_soft_deleted_memberships", async () => {
    const deletedMembership = await seedMembership(service, { userId: owner.id, neighborhoodId: otherNeighborhood.id });
    await service.from("memberships").update({ deleted_at: new Date().toISOString(), status: "inactive" }).eq("id", deletedMembership.id);

    const { data, error } = await getActiveMembership(service, otherNeighborhood.id, owner.id);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("query_admin_client_hides_soft_deleted_loans_and_scopes_borrower_by_neighborhood", async () => {
    const item = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Query loan item" });
    const otherItem = await seedItem(service, { neighborhoodId: otherNeighborhood.id, ownerId: owner.id, name: "Other query loan item" });
    const visibleLoan = await seedLoan(service, { itemId: item.id, borrowerId: borrower.id });
    const deletedLoan = await seedLoan(service, { itemId: otherItem.id, borrowerId: borrower.id });
    await service.from("loans").update({ deleted_at: new Date().toISOString() }).eq("id", deletedLoan.id);

    const { data, error } = await getLoansForBorrower(service, borrower.id, { neighborhoodId: neighborhood.id });
    expect(error).toBeNull();
    expect(data?.map((loan) => loan.id)).toContain(visibleLoan.id);
    expect(data?.map((loan) => loan.id)).not.toContain(deletedLoan.id);
  });

  it("query_admin_client_filters_owned_items_by_neighborhood_and_soft_delete", async () => {
    const visible = await seedItem(service, { neighborhoodId: neighborhood.id, ownerId: owner.id, name: "Owned visible" });
    const other = await seedItem(service, { neighborhoodId: otherNeighborhood.id, ownerId: owner.id, name: "Owned other" });
    await service.from("items").update({ deleted_at: new Date().toISOString() }).eq("id", other.id);

    const { data, error } = await getItemsByOwner(service, neighborhood.id, owner.id, { includeUnavailable: true });
    expect(error).toBeNull();
    expect(data?.map((item) => item.id)).toContain(visible.id);
    expect(data?.map((item) => item.id)).not.toContain(other.id);
  });
});
