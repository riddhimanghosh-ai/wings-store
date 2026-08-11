"use client";

import { useEffect, useState } from "react";

export type Lang = "id" | "en";

const KEY = "wings_lang";
const EVENT = "wings-lang-change";

export function getLang(): Lang {
  if (typeof window === "undefined") return "id";
  return (window.localStorage.getItem(KEY) as Lang) === "en" ? "en" : "id";
}

export function setLang(lang: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, lang);
  window.dispatchEvent(new Event(EVENT));
}

/** Every user-facing string in the Wings Online replica, Indonesian first. */
export const STRINGS = {
  // Auth — Masuk
  welcomeTo:            { id: "Selamat Datang di",            en: "Welcome to" },
  username:             { id: "Username",                     en: "Username" },
  password:             { id: "Password",                     en: "Password" },
  rememberMe:           { id: "Ingat Saya",                   en: "Remember Me" },
  signIn:               { id: "MASUK",                        en: "SIGN IN" },
  signingIn:            { id: "MEMPROSES…",                   en: "SIGNING IN…" },
  registerAccount:      { id: "Register Akun",                en: "Register Account" },
  forgotPassword:       { id: "Lupa Password",                en: "Forgot Password" },
  needHelp:             { id: "Butuh bantuan?",               en: "Need help?" },
  contactSupport:       { id: "Hubungi Layanan Pelanggan",    en: "Contact Customer Service" },
  wrongCredentials:     { id: "Username atau password salah.", en: "Incorrect username or password." },
  demoMode:             { id: "Mode demo",                     en: "Demo mode" },
  demoLoginHint:        { id: "sudah terisi otomatis — pilih toko lain di daftar di atas, lalu tekan MASUK.", en: "pre-filled — pick a different store from the list above, then press Sign in." },
  selectStore:          { id: "Pilih toko",                     en: "Select store" },
  loadingStores:        { id: "Memuat toko…",                   en: "Loading stores…" },
  demoAnyPassword:      { id: "password apa pun diterima",      en: "any password works" },

  // Order confirmation screen
  confirmOrderTitle:    { id: "Konfirmasi pesanan Anda",         en: "Confirm your order" },
  confirmOrderIntro:    { id: "Periksa item di bawah — perbaiki jika AI salah baca, atau hapus yang tidak sesuai.", en: "Check the items below — fix anything the AI misread, or remove what doesn't belong." },
  showTranscript:       { id: "Tampilkan transkrip mentah",      en: "Show raw transcript" },
  hideTranscript:       { id: "Sembunyikan transkrip mentah",    en: "Hide raw transcript" },
  rawTextLabel:         { id: "Teks asli",                       en: "Raw text" },
  confirmOrderBtn:      { id: "Konfirmasi pesanan",               en: "Confirm order" },
  confirming:           { id: "Mengonfirmasi…",                  en: "Confirming…" },
  deleteOrderBtn:       { id: "Hapus pesanan",                   en: "Delete order" },
  deletingOrder:        { id: "Menghapus…",                      en: "Deleting…" },
  deleteOrderConfirm:   { id: "Hapus pesanan ini? Tindakan ini tidak dapat dibatalkan.", en: "Discard this order? This can't be undone." },
  orderNotFound:        { id: "Pesanan tidak ditemukan — mungkin sudah dikonfirmasi atau dihapus.", en: "This order could not be found — it may already have been confirmed or removed." },
  loadingYourOrder:     { id: "Memuat pesanan Anda…",            en: "Loading your order…" },
  addItemOrDelete:      { id: "Tambahkan minimal satu item, atau hapus seluruh pesanan di bawah.", en: "Add at least one item, or delete the whole order below." },
  selectProductOrRemove:{ id: "Pilih produk untuk setiap item, atau hapus itemnya.", en: "Select a product for every item, or remove it." },
  confirmOrderFailed:   { id: "Gagal mengonfirmasi pesanan",     en: "Failed to confirm order" },
  deleteOrderFailed:    { id: "Pesanan tidak dapat dihapus.",    en: "Could not delete this order." },
  discountApplied:      { id: "diskon borongan diterapkan",      en: "bulk discount applied" },
  discountAddMore:      { id: "Tambah",                          en: "Add" },
  discountMoreFor:      { id: "lagi untuk diskon",               en: "more for" },
  discountOff:          { id: "min.",                            en: "off, min." },
  totalLabel:           { id: "Total",                           en: "Total" },
  addItemBtn:           { id: "Tambah item",                     en: "Add item" },

  // Auth — Register
  customerId:           { id: "Customer ID",                  en: "Customer ID" },
  customerIdHint:       { id: "Kode customer Wings, tertera di nota pembelian. Diawali WS untuk area Wings Surya.", en: "Your Wings customer code, printed on your invoice. Starts with WS for the Wings Surya area." },
  salesGroupCode:       { id: "Code Sales Group",             en: "Sales Group Code" },
  salesGroupHint:       { id: "Kode supervisor yang meng-cover toko Anda.", en: "The supervisor code covering your store." },
  customerPhone:        { id: "No. Handphone Customer",       en: "Customer Mobile Number" },
  chooseOtp:            { id: "Pilih pengiriman OTP",         en: "Choose OTP delivery" },
  dontKnowId:           { id: "Tidak Tahu Customer ID?",      en: "Don't know your Customer ID?" },
  contactSales:         { id: "Hubungi Sales",                en: "Contact Sales" },
  send:                 { id: "KIRIM",                        en: "SEND" },
  regionNote:           { id: "Klik disini untuk hubungi kami", en: "Click here to contact us" },
  regionNoteTail:       { id: "— khusus wilayah Jakarta, Jawa Barat, dan Sumatera.", en: "— Jakarta, West Java and Sumatra regions only." },

  // Auth — Security question
  securityQuestion:     { id: "Pertanyaan Keamanan",          en: "Security Question" },
  securityIntro:        { id: "Pilih salah satu pertanyaan keamanan yang akan menjadi verifikasi akun Anda.", en: "Choose one security question to verify your account." },
  securityWarn:         { id: "*Pastikan Anda mengingat pertanyaan dan jawaban yang Anda berikan sebelum menekan tombol simpan", en: "*Make sure you remember the question and answer you provide before pressing save" },
  q1:                   { id: "Siapa nama kecil saya ?",      en: "What is my childhood nickname ?" },
  q2:                   { id: "Dimana saya sekolah pertama kali ?", en: "Where did I first go to school ?" },
  q3:                   { id: "Di kota manakah saya dilahirkan ?", en: "In which city was I born ?" },
  answer:               { id: "Jawaban:",                     en: "Answer:" },
  save:                 { id: "SIMPAN",                       en: "SAVE" },

  // Auth — Forgot password
  newPassword:          { id: "Masukkan Password Baru",       en: "Enter New Password" },
  repeatPassword:       { id: "Masukkan Ulang Password Baru", en: "Re-enter New Password" },
  resetPassword:        { id: "RESET PASSWORD",               en: "RESET PASSWORD" },
  passwordMismatch:     { id: "Password tidak sama. Silakan periksa kembali.", en: "Passwords do not match. Please check again." },

  // Onboarding
  skip:                 { id: "Lewati",                       en: "Skip" },
  next:                 { id: "LANJUT",                       en: "NEXT" },
  start:                { id: "MULAI",                        en: "START" },
  onb1Title:            { id: "Order dari Kategori",          en: "Order by Category" },
  onb1Body:             { id: "Klik salah satu kategori pada beranda", en: "Tap any category on the home screen" },
  onb2Title:            { id: "Order dari Pencarian",         en: "Order by Search" },
  onb2Body:             { id: "Cari produk lewat kolom pencarian di beranda", en: "Find products using the search bar on the home screen" },
  onb3Title:            { id: "Order dari Suara & Foto",      en: "Order by Voice & Photo" },
  onb3Body:             { id: "Rekam pesanan atau foto nota tulis tangan — AI akan membacanya", en: "Record your order or photograph a handwritten note — AI will read it" },

  // Beranda
  hello:                { id: "Halo",                         en: "Hello" },
  searchProduct:        { id: "Cari produk",                  en: "Search products" },
  tabRecommended:       { id: "Rekomendasi",                  en: "Recommended" },
  tabFavourite:         { id: "Favorit",                      en: "Favourites" },
  tabPromo:             { id: "Promo",                        en: "Promos" },
  discount:             { id: "Diskon",                       en: "Discount" },
  min:                  { id: "Min.",                         en: "Min." },
  quickOrderTitle:      { id: "Pesan Cepat — Suara / Foto Nota", en: "Quick Order — Voice / Photo Note" },
  quickOrderBody:       { id: "Rekam pesanan atau foto nota tulis tangan, AI akan membacanya", en: "Record your order or photograph a handwritten note, AI will read it" },
  loadingProducts:      { id: "Memuat produk…",               en: "Loading products…" },
  noProducts:           { id: "Tidak ada produk.",            en: "No products." },
  noFavourites:         { id: "Belum ada produk favorit. Tekan ikon hati pada produk untuk menambahkan.", en: "No favourites yet. Tap the heart icon on a product to add it." },
  footerNote:           { id: "Order 24 jam tanpa menunggu sales datang · Harga akhir menyesuaikan stok depo", en: "Order 24/7 without waiting for a sales rep · Final price depends on depot stock" },

  // Category listing
  allProducts:          { id: "Semua Produk",                 en: "All Products" },
  products:            { id: "produk",                        en: "products" },
  sortBy:               { id: "Urutkan",                      en: "Sort" },
  filter:               { id: "Filter",                       en: "Filter" },
  apply:                { id: "Terapkan",                     en: "Apply" },
  reset:                { id: "Reset",                        en: "Reset" },
  brand:                { id: "Brand",                        en: "Brand" },
  packSize:             { id: "Pack Size",                    en: "Pack Size" },
  variant:              { id: "Variant",                      en: "Variant" },
  notFound:             { id: "Produk tidak ditemukan. Coba ubah pencarian atau filter.", en: "No products found. Try changing your search or filters." },
  sortNewest:           { id: "Terbaru",                      en: "Newest" },
  sortPromo:            { id: "Promo",                         en: "On Promo" },
  sortBestSelling:      { id: "Paling Laku",                  en: "Best Selling" },
  sortPack:             { id: "Pack Size",                    en: "Pack Size" },
  sortAz:               { id: "Variant A - Z",                en: "Variant A - Z" },
  sortZa:               { id: "Variant Z - A",                en: "Variant Z - A" },

  // Product row
  addToCart:            { id: "Tambahkan",                    en: "Add" },
  retail:               { id: "ECERAN",                       en: "EACH" },
  perBox:               { id: "box",                          en: "box" },
  discountMin:          { id: "Diskon",                       en: "Discount" },

  // Cart
  cart:                 { id: "Keranjang",                    en: "Cart" },
  productsNotShowing:   { id: "Produk tidak muncul?",         en: "Products not showing?" },
  reloadHere:           { id: "Muat ulang disini",            en: "Reload here" },
  deliverTo:            { id: "Dikirim ke",                   en: "Deliver to" },
  willShipOn:           { id: "Order akan dikirim tanggal",   en: "Order will ship on" },
  changeDate:           { id: "Ubah tanggal",                 en: "Change date" },
  productCount:         { id: "Produk",                       en: "Products" },
  removeAll:            { id: "Hapus Semua",                  en: "Remove All" },
  remove:               { id: "Hapus",                        en: "Remove" },
  cartEmpty:            { id: "Keranjang masih kosong.",      en: "Your cart is empty." },
  voucher:              { id: "Voucher",                      en: "Voucher" },
  vouchersAvailable:    { id: "Ada 0 voucher tersedia",       en: "0 vouchers available" },
  subTotalEst:          { id: "Sub Total (est.)",             en: "Subtotal (est.)" },
  deductionEst:         { id: "Potongan (est.)",              en: "Deduction (est.)" },
  productDiscount:      { id: "Diskon Produk",                en: "Product Discount" },
  totalPriceEst:        { id: "Total Harga (est.)",           en: "Total Price (est.)" },
  totalPrice:           { id: "Total Harga",                  en: "Total Price" },
  points:               { id: "Poin",                         en: "Points" },
  calcActual:           { id: "Hitung Harga Aktual",          en: "Calculate Actual Price" },
  orderNow:             { id: "Pesan Sekarang",               en: "Order Now" },
  processing:           { id: "Memproses…",                   en: "Processing…" },
  orderProcessed:       { id: "Pesanan Diproses",             en: "Order Processing" },
  orderProcessedBody:   { id: "Harap menunggu. Kami sedang memproses pesanan Anda", en: "Please wait. We are processing your order" },
  orderFailed:          { id: "Pesanan gagal diproses. Silakan coba lagi.", en: "Order could not be processed. Please try again." },
  total:                { id: "total",                        en: "total" },

  // Purchases
  purchases:            { id: "Pembelian",                    en: "Purchases" },
  tabNotShipped:        { id: "Belum Dikirim",                en: "Not Shipped" },
  tabShipped:           { id: "Terkirim",                     en: "Shipped" },
  tabInvoices:          { id: "Tagihan",                      en: "Invoices" },
  soNotShowing:         { id: "SO tidak muncul?",             en: "Order not showing?" },
  loadingOrders:        { id: "Memuat pesanan…",              en: "Loading orders…" },
  noOrdersTab:          { id: "Belum ada pesanan pada tab ini.", en: "No orders in this tab yet." },
  orderProcessedThanks: { id: "Pesanan Anda sudah diproses. Terima kasih!", en: "Your order has been processed. Thank you!" },
  remaining:            { id: "Sisa",                         en: "Balance" },
  shipDate:             { id: "Kirim",                        en: "Ship" },
  viewProducts:         { id: "Lihat",                        en: "View" },
  cancelOrder:          { id: "Batalkan Order",               en: "Cancel Order" },
  cancelling:           { id: "Membatalkan…",                 en: "Cancelling…" },
  cancelConfirm:        { id: "Batalkan order ini?",          en: "Cancel this order?" },
  cannotCancel:         { id: "Order sudah dikirim — tidak dapat dibatalkan lewat aplikasi.", en: "Order has shipped — it can no longer be cancelled in the app." },
  cancelFailed:         { id: "Order tidak dapat dibatalkan.", en: "This order cannot be cancelled." },
  orderedBy:            { id: "Ordered by",                   en: "Ordered by" },
  viaApps:              { id: "Apps",                         en: "Apps" },
  viaVoice:             { id: "Suara",                        en: "Voice" },
  viaPhoto:             { id: "Foto",                         en: "Photo" },
  stagePlaced:          { id: "Pesanan dibuat",               en: "Order placed" },
  stagePacked:          { id: "Sedang dikemas",               en: "Packed" },
  stageShipping:        { id: "Sedang dikirim",               en: "Out for delivery" },
  stageDelivered:       { id: "Terkirim",                     en: "Delivered" },
  stageCancelled:       { id: "Dibatalkan",                   en: "Cancelled" },

  // Account
  account:              { id: "Akun",                         en: "Account" },
  myProfile:            { id: "Profil Saya",                  en: "My Profile" },
  editProfile:          { id: "Ubah Profile",                 en: "Edit Profile" },
  chooseStore:          { id: "Pilih toko (demo):",           en: "Choose store (demo):" },
  transactionList:      { id: "Daftar Transaksi",             en: "Transaction List" },
  information:          { id: "Informasi",                    en: "Information" },
  achievements:         { id: "Pencapaian",                   en: "Achievements" },
  rateApp:              { id: "Beri Penilaian WINGS Online",  en: "Rate WINGS Online" },
  customerService:      { id: "Layanan Pelanggan",            en: "Customer Service" },
  settings:             { id: "Pengaturan",                   en: "Settings" },
  fingerprintLogin:     { id: "Masuk dengan Fingerprint",     en: "Sign in with Fingerprint" },
  adminConsole:         { id: "Konsol Admin WINGS",           en: "WINGS Admin Console" },
  logout:               { id: "Keluar",                       en: "Sign Out" },

  // Nav
  navHome:              { id: "Beranda",                      en: "Home" },
  navPurchases:         { id: "Pembelian",                    en: "Purchases" },
  navCart:              { id: "Keranjang",                    en: "Cart" },
  navAccount:           { id: "Akun",                         en: "Account" },

  // Quick order
  quickOrder:           { id: "Pesan Cepat",                  en: "Quick Order" },
  quickOrderHead:       { id: "Rekam suara atau foto nota tulis tangan", en: "Record your voice or photograph a handwritten note" },
  quickOrderSub:        { id: "Bisa Bahasa Indonesia, Inggris, atau campuran. AI akan membaca produk dan jumlahnya.", en: "Works in Indonesian, English, or a mix. AI will read the products and quantities." },
  tapToRecord:          { id: "Tekan untuk merekam pesanan",  en: "Tap to record your order" },
  recordingTap:         { id: "Merekam… tekan untuk berhenti", en: "Recording… tap to stop" },
  or:                   { id: "atau",                         en: "or" },
  photoCamera:          { id: "Foto Nota dengan Kamera",      en: "Photograph Note with Camera" },
  photoUpload:          { id: "Unggah Foto Nota",             en: "Upload Note Photo" },
  photoUploadHint:      { id: "Pilih dari galeri atau file",  en: "Pick from gallery or files" },
  voiceUpload:          { id: "Unggah Rekaman Suara",         en: "Upload Voice Recording" },
  voiceUploadHint:      { id: "MP3, M4A, WAV, OGG, WEBM, FLAC", en: "MP3, M4A, WAV, OGG, WEBM, FLAC" },
  processingAi:         { id: "Memproses pesanan Anda dengan AI…", en: "Processing your order with AI…" },
  // Stages shown while a voice note or photo is being turned into an order.
  // The stages are the real server-side steps; the pacing is an estimate, so
  // stageAlmost holds the line whenever a request outlasts the sequence.
  stageSavingVoice:     { id: "Menyimpan rekamanmu…",         en: "Saving your recording…" },
  stageSavingPhoto:     { id: "Menyimpan fotomu…",            en: "Saving your photo…" },
  stageListening:       { id: "Mendengarkan pesan kamu…",     en: "Listening to your note…" },
  stageWriting:         { id: "Menulis pesananmu…",           en: "Writing down what you said…" },
  stageReading:         { id: "Membaca catatanmu…",           en: "Reading your note…" },
  stageHandwriting:     { id: "Mengurai tulisan tangan…",     en: "Making out the handwriting…" },
  stageMatching:        { id: "Mencocokkan dengan katalog…",  en: "Matching items to the catalogue…" },
  stagePricing:         { id: "Mengecek harga dan promo…",    en: "Checking prices and bulk deals…" },
  stageTotalling:       { id: "Menghitung total…",            en: "Adding up your order…" },
  stageChecking:        { id: "Menandai yang perlu dicek…",   en: "Flagging anything to double-check…" },
  stageAlmost:          { id: "Hampir selesai…",              en: "Almost there…" },
  stageFinishing:       { id: "Merapikan pesananmu…",         en: "Tidying up your order…" },
  exampleSpeech:        { id: "Contoh ucapan",                en: "Example phrasing" },
  micDenied:           { id: "Tidak dapat mengakses mikrofon. Mohon izinkan akses mikrofon.", en: "Cannot access the microphone. Please allow microphone access." },
  genericError:         { id: "Terjadi kesalahan.",           en: "Something went wrong." },

  // Categories
  catMakanan:           { id: "Makanan",                      en: "Food" },
  catMinuman:           { id: "Minuman",                      en: "Beverages" },
  catMie:               { id: "Mie Instan",                   en: "Instant Noodles" },
  catKopi:              { id: "Kopi & Bubuk",                 en: "Coffee & Powders" },
  catDeterjen:          { id: "Deterjen",                     en: "Detergent" },
  catPakaian:           { id: "Perawatan Pakaian",            en: "Fabric Care" },
  catRumah:             { id: "Pembersih Rumah",              en: "Home Cleaning" },
  catTubuh:             { id: "Perawatan Tubuh & Rambut",     en: "Body & Hair Care" },
  catPiring:            { id: "Pembersih Piring",             en: "Dishwashing" },
  catBayi:              { id: "Popok & Perawatan Bayi",       en: "Nappies & Baby Care" },

  // Chat assistant
  chatOpenAria:         { id: "Buka bantuan",                 en: "Open help" },
  chatTitle:            { id: "Asisten Wings",                en: "Wings Assistant" },
  chatHelping:          { id: "Membantu",                     en: "Helping" },
  chatScope:            { id: "Pesanan, produk & promo",      en: "Orders, products & promos" },
  chatClose:            { id: "Tutup",                        en: "Close" },
  chatGreeting:         { id: "Halo",                         en: "Hello" },
  chatGreetingHint:     { id: "Tanya soal pesanan, harga produk, atau promo yang sedang berjalan.", en: "Ask about your orders, product prices, or promos running right now." },
  chatTyping:           { id: "Sedang mengetik…",             en: "Typing…" },
  chatPlaceholder:      { id: "Tanya pesanan, harga, promo…", en: "Ask about orders, prices, promos…" },
  chatSend:             { id: "Kirim",                        en: "Send" },
  chatChecked:          { id: "dicek",                        en: "checked" },
  // Human labels for the tools the assistant called. The raw function names
  // ("listTopDiscounts") used to be shown to retailers verbatim, which read as
  // leaked internals rather than the trust signal this line is meant to be.
  chatToolOrders:       { id: "Data pesanan",                 en: "Order records" },
  chatToolProducts:     { id: "Harga terkini",                en: "Live prices" },
  chatToolDiscounts:    { id: "Promo hari ini",               en: "Today's promos" },
  chatNoCatch:          { id: "Maaf, saya tidak menangkap itu.", en: "Sorry, I didn't catch that." },
  chatError:            { id: "Terjadi kesalahan.",           en: "Something went wrong." },
  chatNetworkError:     { id: "Gangguan jaringan — silakan coba lagi.", en: "Network problem — please try again." },
  chatSuggest1:         { id: "Di mana pesanan saya?",        en: "Where is my order?" },
  chatSuggest2:         { id: "Ada diskon Mie Sedaap?",       en: "Any Mie Sedaap discounts?" },
  chatSuggest3:         { id: "Bagaimana cara membatalkan order?", en: "How do I cancel an order?" },
  chatSuggest4:         { id: "Promo terbaik hari ini",       en: "Best promos today" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function translate(key: StringKey, lang: Lang) {
  return STRINGS[key][lang];
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>("id");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    setReady(true);
    const onChange = () => setLangState(getLang());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const t = (key: StringKey) => translate(key, lang);

  return { lang, ready, t, setLang };
}
