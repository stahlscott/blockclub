import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";

type SetupClient = SupabaseClient;

export interface IntegrationClients {
  // The generated Database mutation types currently resolve direct writes to never;
  // keep the real authenticated client untyped at this test boundary until Phase 2
  // corrects the shared schema types. RLS is still exercised by the JWT client.
  anon: SetupClient;
  service: SetupClient;
}

export function createIntegrationClients(): IntegrationClients {
  // Integration Vitest is configured with one worker because fixtures share one local database.
  const url = process.env.SUPABASE_INTEGRATION_URL;
  const anonKey = process.env.SUPABASE_INTEGRATION_ANON_KEY;
  const serviceKey = process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Integration credentials are missing; run the integration preflight first");
  }
  return {
    anon: createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: `blockclub-integration-anon-${randomUUID()}` },
    }),
    service: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: `blockclub-integration-service-${randomUUID()}` },
    }),
  };
}

export async function createTestUser(
  service: SetupClient,
  label: string,
): Promise<{ id: string; email: string; password: string }> {
  const email = `integration-${label}-${randomUUID()}@local.test`;
  const password = `Test-${randomUUID()}-password`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create integration user: ${error?.message ?? "missing user"}`);
  return { id: data.user.id, email, password };
}

export async function signInAs(
  anon: SupabaseClient<Database>,
  user: { email: string; password: string },
): Promise<SupabaseClient<Database>> {
  const { data, error } = await anon.auth.signInWithPassword(user);
  if (error || !data.session) throw new Error(`Could not sign in integration user: ${error?.message ?? "missing session"}`);
  return anon;
}

export async function createAuthenticatedClient(user: { email: string; password: string }): Promise<SupabaseClient<Database>> {
  const url = process.env.SUPABASE_INTEGRATION_URL;
  const anonKey = process.env.SUPABASE_INTEGRATION_ANON_KEY;
  if (!url || !anonKey) throw new Error("Integration credentials are missing");
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `blockclub-integration-race-${randomUUID()}` },
  });
  await signInAs(client, user);
  return client;
}

export async function deleteTestUser(service: SetupClient, userId: string): Promise<void> {
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Could not clean integration user ${userId}: ${error.message}`);
}

export async function seedProfile(service: SetupClient, user: { id: string; email: string }, name: string): Promise<void> {
  const { error } = await service.from("users").upsert({ id: user.id, email: user.email, name });
  if (error) throw new Error(`Could not seed profile ${user.id}: ${error.message}`);
}

export async function createNeighborhood(
  service: SetupClient,
  creatorId: string,
  name = `Integration Neighborhood ${randomUUID()}`,
  options: { requireApproval?: boolean } = {},
): Promise<{ id: string; slug: string }> {
  const slug = `integration-${randomUUID()}`;
  const { data, error } = await service
    .from("neighborhoods")
    .insert({ name, slug, settings: { require_approval: options.requireApproval ?? false, allow_public_directory: false }, created_by: creatorId })
    .select("id, slug")
    .single();
  if (error || !data) throw new Error(`Could not seed neighborhood: ${error?.message ?? "missing row"}`);
  return data;
}

export async function seedMembership(
  service: SetupClient,
  values: { userId: string; neighborhoodId: string; role?: "admin" | "member"; status?: "pending" | "active" | "inactive" | "moved_out" },
): Promise<{ id: string }> {
  const { data, error } = await service
    .from("memberships")
    .insert({ user_id: values.userId, neighborhood_id: values.neighborhoodId, role: values.role ?? "member", status: values.status ?? "active", deleted_at: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not seed membership: ${error?.message ?? "missing row"}`);
  return data;
}

export async function seedItem(
  service: SetupClient,
  values: { neighborhoodId: string; ownerId: string; name?: string; availability?: "available" | "borrowed" | "unavailable" },
): Promise<{ id: string }> {
  const { data, error } = await service
    .from("items")
    .insert({ neighborhood_id: values.neighborhoodId, owner_id: values.ownerId, name: values.name ?? "Integration Item", category: "other", photo_urls: [], availability: values.availability ?? "available", deleted_at: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not seed item: ${error?.message ?? "missing row"}`);
  return data;
}

export async function seedPost(
  service: SetupClient,
  values: { neighborhoodId: string; authorId: string; content?: string },
): Promise<{ id: string }> {
  const { data, error } = await service
    .from("posts")
    .insert({ neighborhood_id: values.neighborhoodId, author_id: values.authorId, content: values.content ?? "Integration post", deleted_at: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not seed post: ${error?.message ?? "missing row"}`);
  return data;
}

export async function seedLoan(
  service: SetupClient,
  values: { itemId: string; borrowerId: string; status?: "requested" | "approved" | "active" | "returned" | "cancelled"; notes?: string; startDate?: string },
): Promise<{ id: string }> {
  const { data, error } = await service
    .from("loans")
    .insert({ item_id: values.itemId, borrower_id: values.borrowerId, status: values.status ?? "requested", start_date: values.startDate ?? (values.status === "active" ? "2026-07-14" : null), notes: values.notes ?? null, deleted_at: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not seed loan: ${error?.message ?? "missing row"}`);
  return data;
}

export async function deleteNeighborhood(service: SetupClient, neighborhoodId: string): Promise<void> {
  const { error } = await service.from("neighborhoods").delete().eq("id", neighborhoodId);
  if (error) throw new Error(`Could not clean neighborhood ${neighborhoodId}: ${error.message}`);
}

export function expectAffectedRow<T>(data: T | T[] | null, operation: string): T {
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`${operation} did not affect a row`);
  }
  return Array.isArray(data) ? data[0] : data;
}
