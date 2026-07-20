import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createIntegrationClients,
  createNeighborhood,
  createTestUser,
  deleteNeighborhood,
  deleteTestUser,
  seedMembership,
  seedPost,
  seedProfile,
  signInAs,
} from "./client";

const clients = createIntegrationClients();
const anon = clients.anon;
const service = clients.service;
let author: { id: string; email: string; password: string };
let member: { id: string; email: string; password: string };
let admin: { id: string; email: string; password: string };
let outsider: { id: string; email: string; password: string };
let neighborhood: { id: string; slug: string };

beforeAll(async () => {
  author = await createTestUser(service, "post-author");
  member = await createTestUser(service, "post-member");
  admin = await createTestUser(service, "post-admin");
  outsider = await createTestUser(service, "post-outsider");
  await Promise.all([
    seedProfile(service, author, "Post Author"),
    seedProfile(service, member, "Post Member"),
    seedProfile(service, admin, "Post Admin"),
    seedProfile(service, outsider, "Post Outsider"),
  ]);
  neighborhood = await createNeighborhood(service, author.id);
  await seedMembership(service, { userId: author.id, neighborhoodId: neighborhood.id });
  await seedMembership(service, { userId: member.id, neighborhoodId: neighborhood.id });
  await seedMembership(service, { userId: admin.id, neighborhoodId: neighborhood.id, role: "admin" });
});

afterAll(async () => {
  await Promise.allSettled([
    deleteNeighborhood(service, neighborhood.id),
    deleteTestUser(service, author.id),
    deleteTestUser(service, member.id),
    deleteTestUser(service, admin.id),
    deleteTestUser(service, outsider.id),
  ]);
});

describe("post mutation RPCs", () => {
  it("author_soft_deletes_post_and_preserves_history", async () => {
    const post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: author.id });
    await anon.auth.signOut();
    await signInAs(anon, author);
    const { data, error } = await anon.rpc("soft_delete_post", { p_post_id: post.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, reason: "updated", post_id: post.id, affected_post_count: 1 });
    const { data: row } = await service.from("posts").select("deleted_at").eq("id", post.id).single();
    expect(row?.deleted_at).toBeTruthy();
  });

  it("admin_can_soft_delete_unowned_post", async () => {
    const post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: author.id });
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const { data, error } = await anon.rpc("soft_delete_post", { p_post_id: post.id });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, affected_post_count: 1 });
  });

  it("member_can_toggle_reaction_but_cannot_pin", async () => {
    const post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: author.id });
    await anon.auth.signOut();
    await signInAs(anon, member);
    const added = await anon.rpc("toggle_post_reaction", { p_post_id: post.id, p_reaction: "heart" });
    expect(added.error).toBeNull();
    expect(added.data).toMatchObject({ success: true, active: true, affected_reaction_count: 1 });
    const deniedPin = await anon.rpc("set_post_pin", { p_post_id: post.id, p_is_pinned: true });
    expect(deniedPin.error).toBeNull();
    expect(deniedPin.data).toMatchObject({ success: false, reason: "not_authorized" });
    const removed = await anon.rpc("toggle_post_reaction", { p_post_id: post.id, p_reaction: "heart" });
    expect(removed.data).toMatchObject({ success: true, active: false, affected_reaction_count: 1 });
  });

  it("admin_can_pin_and_update_post", async () => {
    const post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: author.id });
    await anon.auth.signOut();
    await signInAs(anon, admin);
    const pinned = await anon.rpc("set_post_pin", { p_post_id: post.id, p_is_pinned: true });
    expect(pinned.data).toMatchObject({ success: true, reason: "pinned", affected_post_count: 1 });
    const updated = await anon.rpc("update_post", { p_post_id: post.id, p_content: "Updated post", p_image_url: null, p_expires_at: null, p_is_pinned: true });
    expect(updated.data).toMatchObject({ success: true, affected_post_count: 1 });
  });

  it("direct_authenticated_post_mutations_are_denied", async () => {
    const post = await seedPost(service, { neighborhoodId: neighborhood.id, authorId: author.id });
    await anon.auth.signOut();
    await signInAs(anon, author);
    const deleted = await anon.from("posts").delete().eq("id", post.id).select("id");
    expect(deleted.data).toBeNull();
    expect(deleted.error?.code).toBe("42501");
    const updated = await anon.from("posts").update({ content: "forged" }).eq("id", post.id).select("id");
    expect(updated.data).toBeNull();
    expect(updated.error?.code).toBe("42501");
  });
});
