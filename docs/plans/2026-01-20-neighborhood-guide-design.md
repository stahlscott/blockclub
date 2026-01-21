# LBC-6: Neighborhood Guide - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A single editable page per neighborhood where admins post standing information for members.

**Architecture:** Server-rendered page with client-side Tiptap editor for admin editing. Content stored as HTML in a dedicated table with RLS for member read / admin write access.

**Tech Stack:** Next.js App Router, Tiptap rich text editor, Supabase (PostgreSQL + RLS)

---

## Problem Statement

Three related problems this solves:

1. **Repeated questions** - "When's the block party?" gets asked every year in posts
2. **Buried info** - Important standing info (garbage day, useful numbers) gets lost in the feed
3. **New member onboarding** - People joining don't know neighborhood basics

## Core Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content structure | Free-form single page | Simple; headers provide organization without schema complexity |
| Edit permissions | Admin-only | No moderation, version history, or approval workflows needed |
| Page name | Admin-customizable (default: "Neighborhood Notes") | Personal neighborhood feel without forcing thought |
| Editor | Basic rich text (bold, italic, headers, bullets, links) | Covers needs without overwhelming non-technical admins |
| Visibility | Members-only | Consistent with Library/Posts |
| Nav placement | After Posts | Reference material, not primary activity |

## Data Model

### New table: `neighborhood_guides`

```sql
create table neighborhood_guides (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid references neighborhoods(id) on delete cascade unique,
  title text not null default 'Neighborhood Notes',
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

-- RLS policies
alter table neighborhood_guides enable row level security;

-- Members can read their neighborhood's guide
create policy "Members can view guide"
  on neighborhood_guides for select
  using (
    neighborhood_id in (
      select neighborhood_id from memberships
      where user_id = auth.uid()
      and status = 'active'
      and deleted_at is null
    )
  );

-- Admins can update their neighborhood's guide
create policy "Admins can update guide"
  on neighborhood_guides for update
  using (
    neighborhood_id in (
      select neighborhood_id from memberships
      where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
      and deleted_at is null
    )
  );

-- Admins can insert guide (for first creation)
create policy "Admins can create guide"
  on neighborhood_guides for insert
  with check (
    neighborhood_id in (
      select neighborhood_id from memberships
      where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
      and deleted_at is null
    )
  );
```

### Type definitions

Add to `@blockclub/shared`:

```typescript
export interface NeighborhoodGuide {
  id: string;
  neighborhood_id: string;
  title: string;
  content: string;
  updated_at: string;
  updated_by: string | null;
}

export type NeighborhoodGuideInsert = Omit<NeighborhoodGuide, 'id' | 'updated_at'>;
export type NeighborhoodGuideUpdate = Partial<Pick<NeighborhoodGuide, 'title' | 'content' | 'updated_by'>>;
```

## User Interface

### Viewing (all members)

- Clean read-only page displaying rich text content
- Header shows custom title (e.g., "Detroit Ave Notes")
- Footer shows "Last updated [date] by [name]"
- Empty state differs by role:
  - **Admin:** "Add helpful info for your neighbors - garbage day, local contacts, upcoming events..."
  - **Member:** "Your neighborhood admin hasn't added a guide yet"

### Editing (admins only)

- "Edit" button visible only to admins
- Inline editing on same page (no separate `/edit` route)
- Rich text toolbar: Bold, Italic, H2, H3, Bullet list, Numbered list, Link
- Explicit "Save" button (not auto-save)
- "Cancel" discards changes

### Settings

- New field in neighborhood settings: "Guide Title"
- Default: "Neighborhood Notes"

## Routes & File Structure

```
app/(protected)/neighborhoods/[slug]/guide/
├── page.tsx          # Server component: fetch guide, check membership
├── guide-view.tsx    # Client component: render content
├── guide-editor.tsx  # Client component: Tiptap editor (lazy loaded)
├── actions.ts        # Server action: saveGuide()
└── guide.module.css

components/
└── RichTextEditor/
    ├── Editor.tsx        # Reusable Tiptap wrapper
    └── Editor.module.css
```

### Navigation

Add to `Header.tsx` nav items, after Posts:

```typescript
{ href: `/neighborhoods/${slug}/guide`, label: guideTitle || 'Guide' }
```

## Rich Text Editor: Tiptap

**Dependencies:**
- `@tiptap/react`
- `@tiptap/starter-kit` (bold, italic, headings, lists)
- `@tiptap/extension-link`

**Storage:** HTML string in `content` column

**Rendering:** Use Tiptap's read-only mode for safe HTML rendering (preferred over manual innerHTML handling)

**Bundle:** ~50-60KB gzipped; lazy-load editor component since only admins use it

## Explicitly Out of Scope (YAGNI)

- Multiple pages/sub-sections per neighborhood
- Community editing or suggestion workflows
- Version history / edit tracking
- Public visibility option
- Dashboard integration

## Future Considerations

Revisit based on user feedback:

- **Dashboard card for new members** - If onboarding friction observed
- **"Updated" notification** - If users want to know when guide changes
- **Multiple sections/pages** - If single page proves limiting

---

## Implementation Notes

1. **Create guide on first edit** - Don't create empty guide rows for all neighborhoods; create on first admin save (upsert pattern)

2. **Title in nav** - Requires fetching guide title for header; consider caching or including in membership/neighborhood query

3. **Lazy load editor** - Use `next/dynamic` with `ssr: false` for Tiptap components to avoid hydration issues and reduce initial bundle

4. **Content sanitization** - Use Tiptap's built-in read-only rendering mode which safely renders HTML without XSS risk; alternatively use DOMPurify if rendering raw HTML
