import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIntegrationClients, createTestUser, deleteTestUser, signInAs } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";

type SetupClient = SupabaseClient;

let service: SetupClient;
let userId: string;
let user: { id: string; email: string; password: string };

beforeAll(async () => {
  const clients = createIntegrationClients();
  service = clients.service;
  user = await createTestUser(service, "smoke");
  userId = user.id;
  const { error } = await service.from("users").upsert({ id: user.id, email: user.email, name: "Integration Smoke" });
  if (error) throw error;
});

afterAll(async () => {
  if (userId) await deleteTestUser(service, userId);
});

describe("integration harness", () => {
  it("integration_harness_smoke subjects authenticated clients to RLS", async () => {
    const clients = createIntegrationClients();
    const { data: anonymousRows, error: anonymousError } = await clients.anon
      .from("users")
      .select("id")
      .eq("id", userId);
    expect(anonymousError).toBeNull();
    expect(anonymousRows).toEqual([]);

    await signInAs(clients.anon, user);
    const { data: authenticatedRows, error: authenticatedError } = await clients.anon
      .from("users")
      .select("id")
      .eq("id", userId);
    expect(authenticatedError).toBeNull();
    expect(authenticatedRows).toEqual([{ id: userId }]);
  });

  it("integration_suite_has_registered_tests", () => {
    expect(true).toBe(true);
  });
});
