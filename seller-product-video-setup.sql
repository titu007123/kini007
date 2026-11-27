-- KINI007 product video upload migration
-- Run in Supabase SQL Editor after backing up the database.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('seller-product-videos','seller-product-videos',TRUE,52428800,ARRAY['video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET public=TRUE,file_size_limit=52428800,allowed_mime_types=ARRAY['video/mp4','video/webm'];
DROP POLICY IF EXISTS "Public can view seller product videos" ON storage.objects;
CREATE POLICY "Public can view seller product videos" ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='seller-product-videos');
DROP POLICY IF EXISTS "Sellers upload videos to own folder" ON storage.objects;
CREATE POLICY "Sellers upload videos to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='seller-product-videos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "Sellers update videos in own folder" ON storage.objects;
CREATE POLICY "Sellers update videos in own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='seller-product-videos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text) WITH CHECK (bucket_id='seller-product-videos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "Sellers delete videos in own folder" ON storage.objects;
CREATE POLICY "Sellers delete videos in own folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='seller-product-videos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
