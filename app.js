const items=[
{title:"বাংলাদেশি হস্তশিল্প",desc:"স্থানীয় কারুশিল্প, উপহার ও ঘর সাজানোর অনুপ্রেরণা।",cat:"bd",emoji:"🧺",tag:"Bangladesh",url:"#"},
{title:"দৈনন্দিন প্রয়োজনীয় পণ্য",desc:"প্রয়োজনীয় জিনিসের তালিকা ও কেনাকাটার ধারণা।",cat:"bd",emoji:"🛍️",tag:"Bangladesh",url:"#"},
{title:"Global Tech Picks",desc:"মোবাইল অ্যাকসেসরিজ ও স্মার্ট গ্যাজেট আবিষ্কার করুন।",cat:"global",emoji:"🎧",tag:"Global",url:"#"},
{title:"Home & Living",desc:"ঘর, রান্নাঘর ও জীবনযাপনের দরকারি পণ্য।",cat:"global",emoji:"🏡",tag:"Global",url:"#"},
{title:"Fashion Finds",desc:"পোশাক, জুতা ও স্টাইলের নতুন ধারণা।",cat:"fashion",emoji:"👟",tag:"Fashion",url:"#"},
{title:"Beauty & Care",desc:"ব্যক্তিগত যত্ন ও সৌন্দর্য পণ্যের গাইড।",cat:"fashion",emoji:"✨",tag:"Fashion",url:"#"},
{title:"Smartphone Guide",desc:"ফোন কেনার আগে ফিচার ও বাজেট তুলনা করুন।",cat:"tech",emoji:"📱",tag:"Technology",url:"#"},
{title:"Useful Apps",desc:"কাজ, পড়াশোনা ও দৈনন্দিন জীবনের অ্যাপ।",cat:"tech",emoji:"💡",tag:"Technology",url:"#"},
{title:"ছোট্ট ভালোবাসার গল্প",desc:"সম্পর্ক, অনুভূতি ও জীবনের ছোট গল্প।",cat:"stories",emoji:"📖",tag:"Stories",url:"#"},
{title:"জীবন থেকে শেখা",desc:"অনুপ্রেরণামূলক গল্প ও ইতিবাচক ভাবনা।",cat:"stories",emoji:"🌱",tag:"Stories",url:"#"},
{title:"ইসলামিক জ্ঞান",desc:"বিশ্বস্ত সূত্রভিত্তিক ইসলামিক শিক্ষা ও পাঠ।",cat:"islamic",emoji:"🕌",tag:"Islamic",url:"#"},
{title:"দৈনিক ভালো অভ্যাস",desc:"নৈতিকতা, কৃতজ্ঞতা ও সুন্দর আচরণের কথা।",cat:"islamic",emoji:"🌙",tag:"Islamic",url:"#"}
];
let category="all",language="bn";
const grid=document.querySelector("#grid"),search=document.querySelector("#search");
function render(){const q=search.value.trim().toLowerCase();const found=items.filter(x=>(category==="all"||x.cat===category)&&(`${x.title} ${x.desc} ${x.tag}`).toLowerCase().includes(q));
grid.innerHTML=found.length?found.map(x=>`<article class="card"><div class="art">${x.emoji}</div><div class="card-body"><span class="badge">${x.tag}</span><h3>${x.title}</h3><p>${x.desc}</p><a class="${x.url==="#"?"disabled":""}" href="${x.url}" ${x.url==="#"?'aria-disabled="true" onclick="event.preventDefault();alert(\'এই কার্ডে আপনার affiliate বা বিস্তারিত পণ্যের লিংক যোগ করুন।\')"': 'target="_blank" rel="noopener noreferrer"'}>বিস্তারিত দেখুন ↗</a></div></article>`).join(""):'<div class="empty">কোনো ফলাফল পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।</div>';}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelector(".tab.active").classList.remove("active");b.classList.add("active");category=b.dataset.cat;render()}));
search.addEventListener("input",render);document.querySelector("#searchBtn").addEventListener("click",render);
document.querySelector("#langBtn").addEventListener("click",()=>{language=language==="bn"?"en":"bn";document.querySelector("#langBtn").textContent=language==="bn"?"EN":"বাংলা";document.querySelectorAll("[data-bn]").forEach(el=>el.textContent=el.dataset[language]);search.placeholder=language==="bn"?"পণ্য বা বিষয় খুঁজুন...":"Search products or topics...";});
document.querySelector("#year").textContent=new Date().getFullYear();
let installPrompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;document.querySelector("#installBtn").hidden=false});
document.querySelector("#installBtn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;document.querySelector("#installBtn").hidden=true});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
render();