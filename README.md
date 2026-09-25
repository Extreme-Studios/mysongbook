# Songbook

Milestone 4 menghubungkan katalog publik ke tab `Songs` pada Google Sheet melalui Vercel Functions. Penulisan lagu memerlukan Google Identity Services dan verifikasi Super User di server. Editor, draft lokal, dan transpose tampilan dari milestone sebelumnya tetap tersedia.

## Konfigurasi

Salin `.env.example` ke `.env.local` lalu isi variabel berikut di lingkungan lokal dan Vercel:

| Variabel | Isi |
| --- | --- |
| `GOOGLE_SHEET_ID` | ID spreadsheet yang memiliki tab `Songs` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account yang diberi akses Editor pada spreadsheet |
| `GOOGLE_PRIVATE_KEY` | Private key service account; newline asli atau `\\n` didukung |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID untuk verifikasi ID token di server |
| `VITE_GOOGLE_CLIENT_ID` | Web OAuth client ID yang sama untuk tombol login di browser |
| `ADMIN_GOOGLE_SUB` | `sub` akun Google Super User, bukan email |

Tab `Songs` harus memakai header persis berikut pada baris pertama: `id,title,artist,original_key,content_json,sort_order,updated_at`. Jangan menaruh private key di variabel berawalan `VITE_`, file sumber, atau browser. `.env.local` sudah diabaikan Git.

Untuk menemukan `sub` awal, set `SONGBOOK_BOOTSTRAP=1` dan `ADMIN_GOOGLE_EMAIL` sesuai email admin hanya di lingkungan lokal development. Masuk melalui tombol Google pada aplikasi. Bila akun cocok, UI menampilkan `sub` yang telah diverifikasi server. Pindahkan nilai itu ke `ADMIN_GOOGLE_SUB`, lalu hapus kedua variabel bootstrap dan mulai ulang server. Endpoint bootstrap menolak pemanggilan di production.

## Menjalankan dan migrasi

Jalankan `npm install` satu kali. Di PowerShell, muat `.env.local` ke proses terminal sebelum menjalankan Functions lokal:

```powershell
Get-Content .env.local | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
  $separator = $_.IndexOf('=')
  [Environment]::SetEnvironmentVariable($_.Substring(0, $separator), $_.Substring($separator + 1), 'Process')
}
vercel dev
```

Gunakan `http://localhost:3000` untuk uji login lokal. Daftarkan origin tersebut pada OAuth Web Client; perubahan origin di Google Cloud dapat memerlukan waktu sebelum berlaku.
Jalankan login Google di browser biasa seperti Chrome atau Edge. Browser internal/embedded dapat menampilkan popup kosong karena Google Identity Services tidak mendukung WebView. Port `5173` hanya menjalankan frontend Vite dan menampilkan fallback mock ketika API tidak tersedia.

Di terminal lain, jalankan `npm run seed` hanya saat migrasi awal atau bila perlu menambah data contoh yang belum ada.

`vercel dev` menjalankan halaman dan Functions bersama. `npm run dev` hanya menjalankan Vite: ketika API tidak tersedia, daftar mock muncul hanya saat development dengan peringatan jelas. Production tidak menggunakan fallback mock secara diam-diam.

`npm run seed` memasukkan lima lagu awal yang belum ada berdasarkan ID tetap dari mock. Perintah ini dapat diulang tanpa menggandakan lagu, setelah kredensial service account terpasang. Lakukan seed sebelum memeriksa katalog Sheet dari browser.

## Editor dan akses

Publik dapat melihat daftar, mencari judul atau artis, membuka detail, dan transpose chord. Setelah login sebagai Super User, tombol **+ Song** membuka formulir dasar, lalu editor block. Baris baru ditulis ke Sheet saat **Save to Sheet**, bukan saat membuka editor. Super User juga dapat mengedit atau menghapus lagu. Semua POST, PUT, dan DELETE memverifikasi Google ID token dan `sub` admin di server; kontrol tampilan saja tidak memberi hak tulis.

Dalam editor, block Bagian, Lirik, dan Chord dapat ditambah, dihapus, dan dipindah. Chord merujuk block lirik dan posisi karakter mulai dari 0; spasi lirik dihitung. `Space` bergerak +2 karakter, `Shift + Space` bergerak −2, dan tombol `←`/`→` tersedia untuk layar sentuh. **Save Draft** menyimpan perubahan pada browser lokal. Draft lokal tidak mengubah Sheet sampai **Save to Sheet** ditekan.

Setiap block memiliki tombol inline **+ Chord** dan **+ Lirik**. Pada lirik, chord baru masuk tepat sebelum baris itu dan langsung terhubung; lirik baru masuk tepat setelahnya. Pada chord atau bagian, block baru masuk tepat setelah block tersebut. Selector Root atau input lirik langsung mendapat fokus sehingga penyusunan setelah Paste Lyrics dapat berjalan dari atas ke bawah tanpa kembali ke toolbar global.

Saat **Edit Mode** dibuka, semua block tetap tampil sebagai lagu biasa dengan satu tombol **Edit** per block. Hanya block yang dipilih menampilkan input, selector, dan action bar. Memilih block lain menutup editor sebelumnya; **Done** hanya menutup editor block. **Save Draft** dan **Save to Sheet** tetap berlaku untuk seluruh lagu.

Tombol **Copy** pada block Lirik dan Chord menaruh salinan tepat setelah block asal dengan ID baru. Chord yang disalin tetap merujuk lirik asal. **Duplicate Pair** pada chord yang terhubung menyalin chord dan liriknya sekaligus, menghubungkan chord baru ke lirik baru, dan mempertahankan posisi tiap chord. Editor tetap menyimpan chord asli tanpa offset transpose.

**Paste Lyrics** membuka panel untuk menempelkan seluruh lirik. Satu baris nonkosong menjadi satu block; heading seperti `Intro`, `Verse 1`, `[Chorus]`, `Pre-Chorus`, dan `Solo Guitar` menjadi Bagian, sedangkan baris lain menjadi Lirik. Preview tampil sebelum import. **Append to End** menambahkan block ke akhir; **Replace Current Content** meminta konfirmasi sebelum mengganti block yang ada. Import tidak membuat chord otomatis. Hasilnya memakai block biasa sehingga dapat diedit, diberi chord, disalin, disimpan sebagai draft, atau dikirim ke Sheet.

## Pemeriksaan

```bash
npm test
npm run lint
npm run build
```

Build menghasilkan `dist/`. `vercel.json` menangani refresh langsung pada `/song/...` dan `/new/...` tanpa menimpa rute `/api`.

Belum ada deploy produksi. Scale, zoom, auto-scroll, fullscreen, dan PWA tidak termasuk milestone ini.
