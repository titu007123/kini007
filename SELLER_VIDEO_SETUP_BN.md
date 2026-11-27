# KINI007 Seller Product Video Setup (বাংলা)

এই branch-এ Seller Dashboard-এর optional product video upload যুক্ত হয়েছে।

## Supabase setup
1. Supabase Dashboard খুলুন।
2. SQL Editor → New query নির্বাচন করুন।
3. Repository-এর `seller-product-video-setup.sql` ফাইলের সম্পূর্ণ SQL paste করুন।
4. Run করুন।
5. সফল হলে Storage → Buckets-এ `seller-product-videos` bucket আছে কি না দেখুন।
6. Database → Table Editor → products-এ `video_url` column আছে কি না নিশ্চিত করুন।

এই migration `products.video_url` যোগ করে এবং MP4/WEBM-এর জন্য 50 MB public video bucket তৈরি করে। Seller কেবল নিজের UUID folder-এ upload/update/delete করতে পারবে।

## Seller Dashboard test checklist
- Seller login ছাড়া dashboard access হয় না।
- Active seller profile dashboard খুলতে পারে।
- Image ছাড়া নতুন product publish হয় না।
- Optional video ছাড়া product publish হয়।
- MP4/WEBM, 50 MB-এর মধ্যে video upload হয়।
- অন্য format বা 50 MB-এর বেশি video reject হয়।
- Product edit করলে আগের video বজায় থাকে, নতুন video দিলে replace হয়।
- Remove video দিয়ে save করলে product-এর `video_url` null হয়।
- Seller নিজের product edit/hide/delete করতে পারে; অন্য seller-এর product নয়।
- Storefront-এ active product-এর video controls দেখা যায় এবং playback হয়।
- Mobile layout-এ video responsive থাকে।

## Release order
1. প্রথমে Supabase SQL migration চালান।
2. তারপর এই branch-এর code review/merge করুন।
3. GitHub Pages deployment complete হলে browser hard refresh করুন।
4. Test seller account দিয়ে checklist অনুযায়ী বাস্তব upload/playback পরীক্ষা করুন।

## Testing limitation
GitHub source/static integration checks করা হয়েছে। Supabase project-এ SQL migration execute করা, authenticated seller দিয়ে real upload, browser playback এবং cross-account RLS test এই repository-only workflow থেকে করা যায়নি। এগুলো live Supabase access ও test seller account দিয়ে যাচাই করতে হবে।
