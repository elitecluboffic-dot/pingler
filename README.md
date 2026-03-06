# PingKu — Ping Service

Website ping seperti Pingler, dibangun dengan Netlify + Turso (libSQL).

## 🚀 Cara Deploy ke Netlify

### 1. Upload ke GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/username/pingler-app.git
git push -u origin main
```

### 2. Connect ke Netlify
1. Buka [netlify.com](https://netlify.com) → Login
2. Klik **"Add new site"** → **"Import from Git"**
3. Pilih repository GitHub Anda
4. Build settings sudah otomatis terbaca dari `netlify.toml`
5. Klik **"Deploy site"**

### 3. Set Environment Variables di Netlify
1. Buka **Site Settings** → **Environment Variables**
2. Tambahkan variabel berikut:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | `libsql://your-database.turso.io` |
| `TURSO_AUTH_TOKEN` | `your_token_here` |

3. Klik **Save** lalu **Trigger redeploy**

## 📁 Struktur Project
```
pingler-app/
├── index.html              ← Frontend utama
├── netlify.toml            ← Konfigurasi Netlify
├── package.json            ← Dependencies
├── .env.example            ← Template environment variables
├── .gitignore
└── netlify/
    └── functions/
        ├── ping.js         ← Fungsi kirim ping
        └── history.js      ← Fungsi ambil riwayat
```

## ⚙️ Fitur
- Ping ke 10 layanan sekaligus (Google, Bing, Yandex, dll)
- Riwayat ping tersimpan di Turso database
- Tampilan real-time hasil ping per layanan
- Responsive di mobile
