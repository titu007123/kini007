Kini007 CSV Import Update

এই ZIP-এ শুধু ৩টি আপডেটেড Admin ফাইল আছে:
- admin.html
- admin.js
- admin.css

GitHub repository-এর root folder-এ এই ৩টি ফাইল upload করে একই নামের পুরোনো ফাইল Replace করুন। অন্য কোনো ফাইল delete/replace করবেন না। তারপর Commit changes করুন।

Admin Dashboard খুলুন: https://titu007123.github.io/kini007/admin.html
Login করে বাম পাশের CSV Import menu খুলুন। Sample CSV ডাউনলোড করে Excel/Google Sheets-এ তথ্য বসিয়ে CSV UTF-8 হিসেবে save করুন, তারপর Upload করে preview দেখুন এবং Import করুন।

CSV column:
name, description, category, brand, price, currency, platform, region, image_url, product_url, is_active

অন্তত name column লাগবে। price ফাঁকা রাখা যায়। image_url ও product_url ফাঁকা রাখা যায়। is_active ফাঁকা থাকলে পণ্য Active হবে। Duplicate product name স্বয়ংক্রিয়ভাবে বাদ যায় না।

গুরুত্বপূর্ণ: এই ফিচার CSV upload করে Supabase products table-এ পণ্য যোগ করে। এটি Daraz/Amazon/AliExpress থেকে নিজে নিজে পণ্য scrape বা sync করে না। Marketplace-এর অনুমোদিত CSV/feed export প্রয়োজন।
