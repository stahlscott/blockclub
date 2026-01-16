# Shared Package Guide

## Purpose

This package is the single source of truth for TypeScript types that match the Supabase database schema. It's shared between the web app and mobile app.

## What Belongs Here

- Database table types (matching Supabase schema exactly)
- Enum types (matching database enums)
- Insert/Update type variants for mutations
- Joined types for queries with relations
- The `Database` interface for typed Supabase client

## What Does NOT Belong Here

- React components or hooks
- Web-specific utilities (Next.js, browser APIs)
- Mobile-specific code (React Native)
- Business logic or API calls

## Type Categories

### Enums
Database enum types that map directly to PostgreSQL enums:
```typescript
export type MembershipRole = "admin" | "member";
export type MembershipStatus = "pending" | "active" | "inactive" | "moved_out";
export type ItemCategory = "tools" | "kitchen" | "outdoor" | ...;
export type ItemAvailability = "available" | "borrowed" | "unavailable";
export type LoanStatus = "requested" | "approved" | "active" | "returned" | "cancelled";
```

### Core Table Types
Direct mappings to database tables:
```typescript
export interface User { id, email, name, avatar_url, ... }
export interface Neighborhood { id, name, slug, settings, ... }
export interface Membership { id, user_id, neighborhood_id, role, status, ... }
export interface Item { id, name, category, availability, ... }
```

### Joined Types
For queries that include related data:
```typescript
// Membership with nested user data
export interface MembershipWithUser extends Membership {
  user: User;
}

// Item with nested owner data
export interface ItemWithOwner extends Item {
  owner: User;
}
```

Pattern: `{TableName}With{RelatedTable}`

### Mutation Types
For insert and update operations:
```typescript
// For creating new records (omit auto-generated fields)
export type ItemInsert = Omit<Item, "id" | "created_at" | "updated_at">;

// For updating records (partial, omit immutable fields)
export type ItemUpdate = Partial<Omit<Item, "id" | "owner_id" | "created_at">>;
```

Pattern: `{TableName}Insert` and `{TableName}Update`

## Usage

### In Web App
```typescript
import type { User, Item, MembershipWithUser, ItemInsert } from "@blockclub/shared";

// Type a query result
const { data } = await supabase.from("users").select("*");
const users: User[] = data || [];

// Type an insert
const newItem: ItemInsert = {
  name: "Drill",
  category: "tools",
  neighborhood_id: "...",
  owner_id: "...",
};
```

### In Mobile App
```typescript
import type { Item, ItemCategory } from "@blockclub/shared";

// Same types work in React Native
const categories: ItemCategory[] = ["tools", "kitchen", "outdoor"];
```

## When Schema Changes

1. Update the Supabase migration in `supabase/migrations/`
2. Update `types.ts` to match the new schema
3. Add any new joined types or mutation types needed
4. Run `npm run typecheck` to verify all apps still compile

## File Structure

```
packages/shared/
├── src/
│   ├── types.ts      # All type definitions
│   ├── supabase.ts   # Supabase client factory (shared config)
│   └── index.ts      # Re-exports everything
├── package.json
└── tsconfig.json
```

## Exports

Everything is re-exported from `index.ts`:
```typescript
export * from "./types";
export * from "./supabase";
```

Import from the package name:
```typescript
import { User, createClient } from "@blockclub/shared";
```
