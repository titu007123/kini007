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


## Admin Dashboard সেটআপ

1. Supabase → SQL Editor-এ `supabase-admin-setup.sql` ফাইলের SQL চালান।
2. Supabase → Authentication → Users → Add user থেকে আপনার নির্দিষ্ট Admin ইমেইল ও পাসওয়ার্ড দিয়ে একটি user তৈরি করুন। Public sign-up চালু করবেন না।
3. তৈরি হওয়া user-এর UUID কপি করুন। SQL ফাইলের শেষে থাকা INSERT statement-এ `YOUR_AUTH_USER_UUID` বদলে UUID বসিয়ে SQL Editor-এ চালান।
4. GitHub Pages-এ `admin.html`, `admin.css`, `admin.js`, `supabase-admin-setup.sql` এবং আপডেট করা `index.html` আপলোড করুন।
5. Admin URL: `/admin.html`। কেবল `admin_users` টেবিলে সক্রিয়ভাবে allowlisted account-ই প্রবেশ করতে পারবে।

### Marketplace সংযোগ সম্পর্কে

Admin থেকে Daraz/Amazon/AliExpress বা অন্য স্টোরের নাম, ওয়েবসাইট, affiliate URL ও integration type সংরক্ষণ করা যায় এবং সেখানকার পণ্যের লিংক ম্যানুয়ালি যোগ করা যায়। স্বয়ংক্রিয় product sync করতে সংশ্লিষ্ট marketplace-এর অনুমোদিত API, affiliate feed বা CSV access এবং প্রয়োজনীয় approval লাগবে। API secret কখনো `admin.js` বা browser code-এ দেবেন না; বাস্তব API connector server-side Edge Function/secure backend-এ তৈরি করতে হবে।
