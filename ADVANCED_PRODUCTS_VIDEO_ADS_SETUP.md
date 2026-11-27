# KINI007 Advanced Product + Video Ads rollout

Branch: feature/advanced-products-video-ads

## Existing architecture audit
- Static HTML/CSS/JavaScript site hosted on GitHub Pages.
- Supabase is already configured and used by the storefront and admin dashboard.
- Existing admin login uses Supabase Auth plus the public.admin_users allowlist.
- Existing products and stores tables are retained; the existing affiliate links and eBay search flow must remain intact.

## Phase 1 — Database migration
1. Open Supabase Dashboard → SQL Editor.
2. Create a new query and paste the complete contents of `supabase-advanced-products-video-ads.sql`.
3. Run it once. It is additive: it does not delete or rewrite existing product rows.
4. Confirm that product_categories, video_ads and the kini007-media Storage bucket exist.

The migration adds advanced product metadata (subcategory, SKU, product video, gallery, specifications, tags, featured flag and sort order), a hierarchical category table, scheduled video ads, and an admin-only media upload policy with public read access.

## Phase 2 — Frontend/admin integration
After the migration is applied, connect the admin forms to the new columns/tables and connect homepage placements to active scheduled video_ads rows. Product video and uploaded MP4 files are public assets; do not upload private identity documents or secrets to this bucket.

## Security
- Never put a Supabase service_role/secret key in browser JavaScript.
- Continue using the existing publishable key and admin allowlist/RLS.
- All media uploads and catalog mutations must be performed by an authenticated allowlisted admin.
- Do not replace supabase-config.js or change the existing admin UUID.
