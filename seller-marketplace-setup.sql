-- KINI007 Seller product upload setup
-- Run only after confirming the latest products backup exists.
-- This is additive: it does not delete or rewrite existing product rows.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_id UUID
  REFERENCES public.seller_profiles(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_seller_id_idx
  ON public.products(seller_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own products" ON public.products;
CREATE POLICY "Sellers can view own products"
ON public.products FOR SELECT TO authenticated
USING (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Active sellers can insert own products" ON public.products;
CREATE POLICY "Active sellers can insert own products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  seller_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.seller_profiles s
    WHERE s.user_id = (SELECT auth.uid()) AND s.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE TO authenticated
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
ON public.products FOR DELETE TO authenticated
USING (seller_id = (SELECT auth.uid()));

-- Public product images: images are intended to be visible on the public storefront.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('seller-product-images', 'seller-product-images', TRUE, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = TRUE, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "Public can view seller product images" ON storage.objects;
CREATE POLICY "Public can view seller product images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'seller-product-images');

DROP POLICY IF EXISTS "Sellers upload images to own folder" ON storage.objects;
CREATE POLICY "Sellers upload images to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seller-product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Sellers update images in own folder" ON storage.objects;
CREATE POLICY "Sellers update images in own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'seller-product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'seller-product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Sellers delete images in own folder" ON storage.objects;
CREATE POLICY "Sellers delete images in own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'seller-product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
