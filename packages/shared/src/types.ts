/**
 * Core types for Block Club neighborhood app
 * These types match the Supabase database schema exactly
 */

// ============================================================================
// ENUMS (matching database enums)
// ============================================================================

/**
 * User's role within a neighborhood.
 * - `admin`: Can approve members, manage items, moderate content
 * - `member`: Standard member with access to neighborhood features
 */
export type MembershipRole = "admin" | "member";

/**
 * Membership lifecycle status.
 * - `pending`: Awaiting admin approval to join neighborhood
 * - `active`: Full member with access to all neighborhood features
 * - `inactive`: Temporarily disabled (e.g., by admin)
 * - `moved_out`: Former resident, preserved for historical loan/post data
 */
export type MembershipStatus = "pending" | "active" | "inactive" | "moved_out";

/**
 * Categories for lending library items.
 * Used for filtering and organization in the library view.
 */
export type ItemCategory =
  | "tools"
  | "kitchen"
  | "outdoor"
  | "sports"
  | "games"
  | "electronics"
  | "books"
  | "baby"
  | "travel"
  | "other";

/**
 * Current availability status of a lending library item.
 * - `available`: Can be borrowed by other members
 * - `borrowed`: Currently on loan (has active loan record)
 * - `unavailable`: Owner has marked as unavailable (e.g., broken, away)
 */
export type ItemAvailability = "available" | "borrowed" | "unavailable";

/**
 * Loan request and lifecycle status.
 * Flow: requested → approved → active → returned
 *       requested → cancelled (by borrower or owner)
 * - `requested`: Borrower has requested the item
 * - `approved`: Owner approved, awaiting pickup
 * - `active`: Item is with borrower
 * - `returned`: Item has been returned to owner
 * - `cancelled`: Request was cancelled before becoming active
 */
export type LoanStatus =
  | "requested"
  | "approved"
  | "active"
  | "returned"
  | "cancelled";

/** RSVP response for events */
export type RsvpStatus = "yes" | "no" | "maybe";

/** Status for childcare exchange requests */
export type ChildcareRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

/** Available emoji reactions for posts */
export type PostReactionType = "thumbs_up" | "heart" | "pray" | "celebrate";

// ============================================================================
// CORE TABLES
// ============================================================================

export interface PhoneEntry {
  label: string; // e.g., "Mom", "Dad", "Home"
  number: string; // 10-digit phone number
}

export interface EmailEntry {
  label: string; // e.g., "Personal", "Work"
  email: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null; // Legacy single phone (deprecated)
  phones: PhoneEntry[] | null; // Multiple labeled phone numbers
  emails: EmailEntry[] | null; // Multiple labeled email addresses
  primary_neighborhood_id: string | null; // User's preferred neighborhood for unified dashboard
  address: string | null;
  unit: string | null;
  move_in_year: number | null;
  children: string | null;
  pets: string | null;
  created_at: string;
  updated_at: string;
}

export interface NeighborhoodSettings {
  require_approval: boolean;
  allow_public_directory: boolean;
}

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  settings: NeighborhoodSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  neighborhood_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joined_at: string;
  deleted_at: string | null;
}

// ============================================================================
// LENDING LIBRARY
// ============================================================================

export interface Item {
  id: string;
  neighborhood_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  photo_urls: string[];
  availability: ItemAvailability;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Loan {
  id: string;
  item_id: string;
  borrower_id: string;
  status: LoanStatus;
  requested_at: string;
  start_date: string | null;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
  deleted_at: string | null;
}

// ============================================================================
// EVENTS
// ============================================================================

export interface Event {
  id: string;
  neighborhood_id: string;
  host_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  guest_count: number;
  created_at: string;
}

// ============================================================================
// CHILDCARE
// ============================================================================

export interface ChildcareAvailability {
  id: string;
  user_id: string;
  neighborhood_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChildcareRequest {
  id: string;
  availability_id: string;
  requester_id: string;
  status: ChildcareRequestStatus;
  children_count: number;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// POSTS
// ============================================================================

export interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  content: string;
  is_pinned: boolean;
  expires_at: string | null;
  edited_at: string | null;
  edited_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction: PostReactionType;
  created_at: string;
}

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================
// These types represent the shape of data when fetching with Supabase joins.
// Use them to type the results of queries like:
//   .select("*, user:users(*)")
//
// Naming convention: {Table}With{RelatedTable}

/** Membership with nested user profile data */
export interface MembershipWithUser extends Membership {
  user: User;
}

/** Membership with nested neighborhood data */
export interface MembershipWithNeighborhood extends Membership {
  neighborhood: Neighborhood;
}

/** Library item with owner's user profile */
export interface ItemWithOwner extends Item {
  owner: User;
}

/** Loan with full item and borrower details */
export interface LoanWithDetails extends Loan {
  item: Item;
  borrower: User;
}

/** Event with host's user profile */
export interface EventWithHost extends Event {
  host: User;
}

/** Event RSVP with attendee's user profile */
export interface EventRsvpWithUser extends EventRsvp {
  user: User;
}

/** Childcare availability with provider's user profile */
export interface ChildcareAvailabilityWithUser extends ChildcareAvailability {
  user: User;
}

/** Post with author profile and optional editor info */
export interface PostWithAuthor extends Post {
  author: User;
  editor?: User | null;
}

/** Post with author and aggregated reaction data for display */
export interface PostWithReactions extends PostWithAuthor {
  /** Count of each reaction type on this post */
  reaction_counts: Record<PostReactionType, number>;
  /** Reaction types the current user has added */
  user_reactions: PostReactionType[];
}

// ============================================================================
// INSERT/UPDATE TYPES (for mutations)
// ============================================================================

export type UserInsert = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
};
export type UserUpdate = Partial<
  Omit<User, "id" | "created_at" | "updated_at">
>;

export type NeighborhoodInsert = Omit<
  Neighborhood,
  "id" | "created_at" | "updated_at"
>;
export type NeighborhoodUpdate = Partial<
  Omit<Neighborhood, "id" | "created_by" | "created_at" | "updated_at">
>;

export type MembershipInsert = Omit<Membership, "id" | "joined_at">;
export type MembershipUpdate = Partial<Pick<Membership, "role" | "status">>;

export type ItemInsert = Omit<Item, "id" | "created_at" | "updated_at">;
export type ItemUpdate = Partial<
  Omit<
    Item,
    "id" | "neighborhood_id" | "owner_id" | "created_at" | "updated_at"
  >
>;

export type LoanInsert = Omit<Loan, "id" | "requested_at">;
export type LoanUpdate = Partial<
  Pick<Loan, "status" | "start_date" | "due_date" | "returned_at" | "notes">
>;

export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at">;
export type EventUpdate = Partial<
  Omit<
    Event,
    "id" | "neighborhood_id" | "host_id" | "created_at" | "updated_at"
  >
>;

export type EventRsvpInsert = Omit<EventRsvp, "id" | "created_at">;
export type EventRsvpUpdate = Partial<
  Pick<EventRsvp, "status" | "guest_count">
>;

export type ChildcareAvailabilityInsert = Omit<
  ChildcareAvailability,
  "id" | "created_at" | "updated_at"
>;
export type ChildcareAvailabilityUpdate = Partial<
  Omit<
    ChildcareAvailability,
    "id" | "user_id" | "neighborhood_id" | "created_at" | "updated_at"
  >
>;

export type ChildcareRequestInsert = Omit<
  ChildcareRequest,
  "id" | "created_at"
>;
export type ChildcareRequestUpdate = Partial<
  Pick<ChildcareRequest, "status" | "notes">
>;

export type PostInsert = {
  neighborhood_id: string;
  author_id: string;
  content: string;
  expires_at?: string | null;
};
export type PostUpdate = Partial<
  Pick<
    Post,
    "content" | "is_pinned" | "expires_at" | "edited_at" | "edited_by" | "deleted_at"
  >
>;

export type PostReactionInsert = {
  post_id: string;
  user_id: string;
  reaction: PostReactionType;
};

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      neighborhoods: {
        Row: Neighborhood;
        Insert: NeighborhoodInsert;
        Update: NeighborhoodUpdate;
      };
      memberships: {
        Row: Membership;
        Insert: MembershipInsert;
        Update: MembershipUpdate;
      };
      items: {
        Row: Item;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      loans: {
        Row: Loan;
        Insert: LoanInsert;
        Update: LoanUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      event_rsvps: {
        Row: EventRsvp;
        Insert: EventRsvpInsert;
        Update: EventRsvpUpdate;
      };
      childcare_availability: {
        Row: ChildcareAvailability;
        Insert: ChildcareAvailabilityInsert;
        Update: ChildcareAvailabilityUpdate;
      };
      childcare_requests: {
        Row: ChildcareRequest;
        Insert: ChildcareRequestInsert;
        Update: ChildcareRequestUpdate;
      };
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
      post_reactions: {
        Row: PostReaction;
        Insert: PostReactionInsert;
        Update: never;
      };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      item_category: ItemCategory;
      item_availability: ItemAvailability;
      loan_status: LoanStatus;
      rsvp_status: RsvpStatus;
      childcare_request_status: ChildcareRequestStatus;
      post_reaction_type: PostReactionType;
    };
  };
}
