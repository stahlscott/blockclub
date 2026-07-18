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

/**
 * User notification preferences.
 * Controls which notifications are sent and where.
 */
export interface NotificationPreferences {
  /** Schema version for future migrations */
  version: number;
  /** Master toggle for all email notifications */
  email_enabled: boolean;
  /** Custom email address for notifications, null = use auth email */
  notification_email: string | null;
  /** Per-channel notification settings */
  channels: {
    /** Notify when someone requests to borrow your item */
    loan_requested: boolean;
    /** Notify when your borrow request is approved */
    loan_approved: boolean;
    /** Notify when your borrow request is declined */
    loan_declined: boolean;
    /** Notify when a borrower returns your item */
    loan_returned: boolean;
  };
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
  photo_urls: string[]; // Gallery photos (pets, kids, gardens, etc.)
  notification_preferences: NotificationPreferences; // Email notification settings
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
  staff_actor_id?: string | null;
}

export interface StaffAdmin {
  user_id: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
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

export interface LoanOperationResult {
  success: boolean;
  reason: string;
  loan_id: string | null;
  item_id: string | null;
  affected_loan_count: number;
  affected_item_count: number;
}

export interface MoveOutResult {
  success: boolean;
  reason: string;
  membership_id: string | null;
  affected_item_count: number;
  cancelled_loan_count: number;
  returned_loan_count: number;
}

export interface ItemRemovalResult {
  success: boolean;
  reason: string;
  item_id: string | null;
  affected_item_count: number;
  cancelled_loan_count: number;
}

export interface PostOperationResult {
  success: boolean;
  reason: string;
  post_id: string | null;
  affected_post_count: number;
}

export interface PostReactionOperationResult {
  success: boolean;
  reason: string;
  post_id: string | null;
  reaction: PostReactionType;
  active: boolean;
  affected_reaction_count: number;
}

export interface MembershipModerationResult {
  success: boolean;
  reason: string;
  membership_id: string | null;
  neighborhood_id: string | null;
  status: MembershipStatus | null;
  deleted_at: string | null;
  affected_membership_count: number;
}

export interface StaffMembershipOperationResult {
  success: boolean;
  reason: string;
  membership_id: string | null;
  user_id: string | null;
  neighborhood_id: string | null;
  role: MembershipRole | null;
  status: MembershipStatus | null;
  deleted_at: string | null;
  affected_membership_count: number;
}

export type LoanClosureReason =
  | "borrower_returned"
  | "borrower_cancelled"
  | "owner_declined"
  | "administrative_move_out"
  | "administrative_item_removal"
  | "staff_correction";

export interface Loan {
  id: string;
  item_id: string;
  borrower_id: string;
  status: LoanStatus;
  requested_at: string;
  created_at: string;
  start_date: string | null;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  staff_actor_id: string | null;
  closure_reason: LoanClosureReason | null;
  closed_by_user_id: string | null;
}

// ============================================================================
// NEIGHBORHOOD GUIDE
// ============================================================================

/**
 * Editable neighborhood guide page.
 * One guide per neighborhood, managed by admins.
 * Content stored as HTML from Tiptap rich text editor.
 */
export interface NeighborhoodGuide {
  id: string;
  neighborhood_id: string;
  title: string;
  content: string; // HTML content from Tiptap
  updated_at: string;
  updated_by: string | null;
}

// ============================================================================
// POSTS
// ============================================================================

export interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
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

/** Neighborhood guide with the user who last updated it */
export interface NeighborhoodGuideWithUpdatedBy extends NeighborhoodGuide {
  updated_by_user: User | null;
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
  photo_urls?: string[];
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
export type MembershipUpdate = Partial<
  Pick<Membership, "role" | "status" | "deleted_at">
>;

export type ItemInsert = Omit<Item, "id" | "created_at" | "updated_at" | "deleted_at"> & {
  staff_actor_id?: string | null;
};
export type ItemUpdate = Partial<
  Omit<
    Item,
    "id" | "neighborhood_id" | "owner_id" | "created_at" | "updated_at"
  >
>;

export type LoanInsert = Omit<
  Loan,
  "id" | "requested_at" | "created_at" | "start_date" | "due_date" | "returned_at" | "staff_actor_id" | "closure_reason" | "closed_by_user_id"
> & {
  start_date?: string | null;
  due_date?: string | null;
  returned_at?: string | null;
  staff_actor_id?: string | null;
};
export type LoanUpdate = Partial<
  Pick<Loan, "status" | "start_date" | "due_date" | "returned_at" | "notes" | "deleted_at" | "staff_actor_id" | "closure_reason" | "closed_by_user_id">
>;

export type PostInsert = {
  neighborhood_id: string;
  author_id: string;
  content: string;
  image_url?: string | null;
  expires_at?: string | null;
};
export type PostUpdate = Partial<
  Pick<
    Post,
    "content" | "image_url" | "is_pinned" | "expires_at" | "edited_at" | "edited_by" | "deleted_at"
  >
>;

export type PostReactionInsert = {
  post_id: string;
  user_id: string;
  reaction: PostReactionType;
};

export type NeighborhoodGuideInsert = {
  neighborhood_id: string;
  title?: string;
  content?: string;
  updated_by?: string | null;
};
export type NeighborhoodGuideUpdate = Partial<
  Pick<NeighborhoodGuide, "title" | "content" | "updated_by">
>;

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

type DatabaseRecord<T> = T & Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DatabaseRecord<User>;
        Insert: DatabaseRecord<UserInsert>;
        Update: DatabaseRecord<UserUpdate>;
        Relationships: [
          { foreignKeyName: "users_primary_neighborhood_id_fkey"; columns: ["primary_neighborhood_id"]; isOneToOne: false; referencedRelation: "neighborhoods"; referencedColumns: ["id"] },
        ];
      };
      neighborhoods: {
        Row: DatabaseRecord<Neighborhood>;
        Insert: DatabaseRecord<NeighborhoodInsert>;
        Update: DatabaseRecord<NeighborhoodUpdate>;
        Relationships: [
          { foreignKeyName: "neighborhoods_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      memberships: {
        Row: DatabaseRecord<Membership>;
        Insert: DatabaseRecord<MembershipInsert>;
        Update: DatabaseRecord<MembershipUpdate>;
        Relationships: [
          { foreignKeyName: "memberships_neighborhood_id_fkey"; columns: ["neighborhood_id"]; isOneToOne: false; referencedRelation: "neighborhoods"; referencedColumns: ["id"] },
          { foreignKeyName: "memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      staff_admins: {
        Row: DatabaseRecord<StaffAdmin>;
        Insert: DatabaseRecord<Pick<StaffAdmin, "user_id" | "email"> & Partial<Pick<StaffAdmin, "active">>>;
        Update: DatabaseRecord<Partial<Pick<StaffAdmin, "email" | "active">>>;
        Relationships: [
          { foreignKeyName: "staff_admins_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      items: {
        Row: DatabaseRecord<Item>;
        Insert: DatabaseRecord<ItemInsert>;
        Update: DatabaseRecord<ItemUpdate>;
        Relationships: [
          { foreignKeyName: "items_neighborhood_id_fkey"; columns: ["neighborhood_id"]; isOneToOne: false; referencedRelation: "neighborhoods"; referencedColumns: ["id"] },
          { foreignKeyName: "items_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      loans: {
        Row: DatabaseRecord<Loan>;
        Insert: DatabaseRecord<LoanInsert>;
        Update: DatabaseRecord<LoanUpdate>;
        Relationships: [
          { foreignKeyName: "loans_borrower_id_fkey"; columns: ["borrower_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "loans_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
        ];
      };
      posts: {
        Row: DatabaseRecord<Post>;
        Insert: DatabaseRecord<PostInsert>;
        Update: DatabaseRecord<PostUpdate>;
        Relationships: [
          { foreignKeyName: "posts_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "posts_edited_by_fkey"; columns: ["edited_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "posts_neighborhood_id_fkey"; columns: ["neighborhood_id"]; isOneToOne: false; referencedRelation: "neighborhoods"; referencedColumns: ["id"] },
        ];
      };
      post_reactions: {
        Row: DatabaseRecord<PostReaction>;
        Insert: DatabaseRecord<PostReactionInsert>;
        Update: never;
        Relationships: [
          { foreignKeyName: "post_reactions_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
          { foreignKeyName: "post_reactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      neighborhood_guides: {
        Row: DatabaseRecord<NeighborhoodGuide>;
        Insert: DatabaseRecord<NeighborhoodGuideInsert>;
        Update: DatabaseRecord<NeighborhoodGuideUpdate>;
        Relationships: [
          { foreignKeyName: "neighborhood_guides_neighborhood_id_fkey"; columns: ["neighborhood_id"]; isOneToOne: true; referencedRelation: "neighborhoods"; referencedColumns: ["id"] },
          { foreignKeyName: "neighborhood_guides_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approve_loan: {
        Args: { p_loan_id: string };
        Returns: LoanOperationResult;
      };
      activate_loan: {
        Args: { p_loan_id: string; p_start_date: string; p_due_date?: string | null };
        Returns: LoanOperationResult;
      };
      return_loan: {
        Args: { p_loan_id: string };
        Returns: LoanOperationResult;
      };
      decline_loan: {
        Args: { p_loan_id: string };
        Returns: LoanOperationResult;
      };
      cancel_loan: {
        Args: { p_loan_id: string };
        Returns: LoanOperationResult;
      };
      move_out_membership: {
        Args: { p_membership_id: string };
        Returns: MoveOutResult;
      };
      soft_delete_item: {
        Args: { p_item_id: string };
        Returns: ItemRemovalResult;
      };
      soft_delete_post: {
        Args: { p_post_id: string };
        Returns: PostOperationResult;
      };
      set_post_pin: {
        Args: { p_post_id: string; p_is_pinned: boolean };
        Returns: PostOperationResult;
      };
      update_post: {
        Args: { p_post_id: string; p_content: string; p_image_url: string | null; p_expires_at: string | null; p_is_pinned?: boolean | null };
        Returns: PostOperationResult;
      };
      toggle_post_reaction: {
        Args: { p_post_id: string; p_reaction: PostReactionType };
        Returns: PostReactionOperationResult;
      };
      moderate_pending_membership: {
        Args: { p_membership_id: string; p_decision: string };
        Returns: MembershipModerationResult;
      };
      is_staff_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      staff_moderate_pending_membership: {
        Args: {
          p_membership_id: string;
          p_effective_user_id: string;
          p_staff_actor_id: string;
          p_decision: string;
        };
        Returns: MembershipModerationResult;
      };
      staff_membership_operation: {
        Args: {
          p_operation: string;
          p_membership_id?: string | null;
          p_target_user_id?: string | null;
          p_neighborhood_id?: string | null;
          p_role?: MembershipRole | null;
          p_staff_actor_id?: string | null;
        };
        Returns: StaffMembershipOperationResult;
      };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      item_category: ItemCategory;
      item_availability: ItemAvailability;
      loan_status: LoanStatus;
      post_reaction_type: PostReactionType;
    };
  };
}
