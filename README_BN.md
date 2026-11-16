# Kini007 — Smart Shopping & Discovery

এটি GitHub Pages-এ প্রকাশযোগ্য একটি PWA ওয়েবসাইট। বর্তমান সংস্করণে Supabase Data API থেকে সক্রিয় পণ্য পড়া, বাংলা/ইংরেজি টেক্সট সার্চ এবং ক্যাটাগরি ফিল্টার যুক্ত করা হয়েছে।

## ফাইল
- `index.html` — ওয়েবসাইটের কাঠামো
- `style.css` — ডিজাইন ও responsive layout
- `app.js` — Supabase থেকে পণ্য আনা, সার্চ, ক্যাটাগরি ফিল্টার ও ভাষা পরিবর্তন
- `supabase-config.js` — Supabase Project URL ও Publishable Key
- `manifest.json`, `sw.js` — PWA সেটআপ

## GitHub-এ আপডেট
1. ZIP Extract করুন।
2. Extract করা `kini007-main` ফোল্ডারের ভেতরের সব ফাইল GitHub repository-এর root-এ upload করুন।
3. পুরোনো ফাইল replace করুন এবং commit করুন।
4. GitHub Pages deployment শেষ হলে সাইটে hard refresh দিন (Ctrl+F5)।

## Supabase সংযোগ
`supabase-config.js`-এ Project URL ও Publishable Key রাখা আছে। Publishable Key browser-এ ব্যবহারের জন্য তৈরি; এখানে কখনো Secret বা service_role key বসাবেন না।

Data API থেকে `public.products` টেবিলের নিচের কলামগুলো পড়া হয়:
`id, name, description, category, brand, price, currency, image_url, product_url, platform, region, is_active, created_at`.

`is_active = true` থাকা পণ্যই public website-এ দেখানো হবে। তাই `products` টেবিলে অন্তত `name`, `category` এবং `is_active`-সহ পণ্য যোগ করতে হবে। `image_url` ও `product_url` ঐচ্ছিক; তবে ব্যবহারকারীর জন্য এগুলো যোগ করা ভালো।

## নিরাপত্তা
- `products` টেবিলে Row Level Security (RLS) চালু রাখুন।
- `anon` role-কে শুধু active products পড়ার অনুমতি দিন।
- Public website থেকে INSERT, UPDATE বা DELETE policy দেবেন না। Admin panel পরে Supabase Auth ও নিরাপদ RLS policy দিয়ে তৈরি করতে হবে।
- Supabase Secret/service_role key কখনো GitHub বা browser code-এ দেবেন না।

## বর্তমান সীমাবদ্ধতা
- এখনো Admin Login বা Admin Dashboard নেই।
- পণ্য স্বয়ংক্রিয়ভাবে Daraz/Amazon থেকে সংগ্রহ করা হয় না; অনুমোদিত API, affiliate feed অথবা নিজস্বভাবে যোগ করা product data প্রয়োজন।
- Search বর্তমানে ডাউনলোড করা সক্রিয় পণ্যের মধ্যে browser-side search করে।
- Supabase-এ পণ্য না থাকলে ওয়েবসাইটে empty-state বার্তা দেখাবে।

## PWA
HTTPS-এ প্রকাশিত সাইট Android Chrome থেকে Install করা যাবে, যদি browser install criteria পূরণ করে।
