# Image upload optimization

## Scope and rollout boundary

New avatar, profile-gallery, post, and lending-library uploads are normalized to
one server-validated WebP derivative. Uploaded originals are not retained.
Existing JPEG, PNG, WebP, and GIF objects are legacy data: they remain untouched
and readable. This rollout does not backfill, rewrite, enumerate, delete, or
convert legacy objects. New GIF uploads are rejected.

The rollout is deliberately staged:

1. Deploy the route, client normalizer, tests, and observability without touching
   existing objects.
2. Validate staging uploads on iOS/Android and desktop browsers, including
   replacement failures and impersonation rules.
3. Apply the storage-policy migration only after route authorization and cleanup
   tests pass. Public SELECT remains available for legacy objects.
4. Enable production enforcement and monitor failures, output sizes, latency,
   and orphan cleanup. Do not run destructive legacy cleanup without a separate
   approved change.

## Canonical profiles

| Profile | Longest edge | Initial quality | Quality floor | Target ceiling |
| --- | ---: | ---: | ---: | ---: |
| Avatar | 512 px | 0.88 | 0.76 | 400 KB |
| Profile gallery | 1600 px | 0.86 | 0.74 | 1.5 MB |
| Post | 1920 px | 0.84 | 0.72 | 2 MB |
| Library item | 1600 px | 0.86 | 0.74 | 1.5 MB |

The shared profile module is the source of truth. Quality decreases only when
needed to meet the target ceiling, never below the floor. Small images are not
upscaled. The route also enforces request-byte, decoded-pixel, dimension, and
output-byte safety limits.

## Conversion behavior

- Accepted input: JPEG, PNG, and WebP.
- New GIF, animated/multi-page images, SVG, BMP, malformed bytes, and forged
  MIME types are rejected.
- EXIF orientation is applied to pixels; metadata is stripped from converted
  derivatives.
- Alpha is preserved when the source and WebP output support it.
- Already-normalized WebP that satisfies profile dimensions and has no metadata
  is passed through without another lossy encode.
- Browser preprocessing is advisory and uses a Worker when available. The Node
  route repeats all validation and conversion for native clients or hostile
  callers.

## Authorization and storage boundary

Browser code calls `/api/uploads/images`; it never writes or deletes Storage
objects directly. The Node route authenticates with the existing server auth
context, resolves effective owner/neighborhood/resource scope, validates the
profile-to-bucket mapping, and uses the server-only Supabase admin client only
after authorization.

- Avatar/gallery: bound to the authenticated/effective profile. Existing profile
  editing supports staff impersonation, so the route requires a valid staff
  impersonation context and writes under the effective user folder.
- Post/item create: requires a short-lived HMAC-signed capability bound to the
  authenticated actor, effective owner, resolved neighborhood, profile, and
  create operation.
- Post/item replacement: requires the row ID; the server resolves author/owner,
  neighborhood, and existing reference before accepting the file.
- New paths are `{effectiveUserId}/{uuid}.webp`, with `image/webp` content type
  and long immutable cache control.

Storage migration `00039_normalized_image_storage.sql` changes new write
constraints to WebP and removes browser insert/update/delete policies. Public
read policies are retained for all legacy formats.

## Replacement and orphan safety

A new object must be uploaded and verified before its URL is persisted. Existing
references must not be deleted first. If persistence fails, retain the old
reference/object and clean only the new unreferenced object. Removal goes through
the authorized cleanup route, which performs a reference scan before deletion;
repeating cleanup is safe.

The current profile/item/post actions still submit whole URL fields/arrays. A
future CAS mutation should compare the previously loaded URL/array before
persisting replacement or removal, especially where multiple tabs can edit a
profile or item. Until that hardening is complete, staging must exercise
concurrent edits and treat cleanup failures as an operational alert rather than
retrying destructively.

## Observability

Structured events include `image_upload_normalized`, rejection/conversion errors,
`image_cleanup_skipped_referenced`, `image_cleanup_failed`, and
`image_orphan_cleanup`. Events record profile, source format, dimensions, output
bytes, latency, bucket/path, and error code only. Never log image contents,
EXIF values, signed capabilities, or sensitive metadata.

Monitor p95 route latency, request rejection rate, conversion failures, output
byte distributions by profile, storage upload failures, and orphan cleanup
counts. The benchmark command is:

```bash
npm run benchmark:image-profiles
```

It fails closed when the synthetic fixture set is absent and emits dimensions,
format, byte size, alpha, page/animation count, and orientation. Contact-sheet
review remains a human gate because byte assertions cannot establish visual
quality.

## Delivery optimization

Next.js `next/image` is the sole routine delivery optimizer. High-volume call
sites pass explicit `sizes` values and stable dimensions. Do not append Supabase
transformation URLs to images already passed through Next. AVIF is a separate
future delivery experiment and is not a stored-upload requirement.

## Rollback

Rollback application code to the prior upload client only before applying the
storage-policy migration. After policy enforcement, rollback means restoring the
server route and fixing the route/client—not reopening browser writes. Do not
remove or rewrite existing objects during rollback. Orphan sweeps must be
idempotent, reference-aware, and separately approved for production use.
