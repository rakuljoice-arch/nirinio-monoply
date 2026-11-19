# NIRINO Monopoly Web

Web Monopoly multiplayer untuk NIRINO. Dibuat dengan Node.js + Express + Socket.IO. Game berjalan di browser, sedangkan bot WhatsApp mengirim tautan lewat command `.monopoliweb`.

## Deploy di NekoHost

1. Upload isi folder `nirino_monopoly_web` ke folder khusus, misalnya `/home/container/monopoly-web`.
2. Pada tab Startup NekoHost, gunakan Node.js 22 atau 24, set `PORT=3000`, dan isi `SUBDOMAIN` dengan nama yang diinginkan (misalnya `nirino-monopoly`). Pastikan port 3000 dialokasikan/diarahkan oleh subdomain NekoHost.
3. Buka Console, jalankan:

   ```bash
   cd /home/container/monopoly-web
   npm install --omit=dev
   npm start
   ```

4. Buka `https://NAMA-SUBDOMAIN.nekohost.id/health`. Jika muncul `{"ok":true,"service":"nirino-monopoly"}`, web aktif.
5. Untuk menjalankan web dan bot bersamaan pada satu container, gunakan PM2 jika tersedia. Contoh dari root project:

   ```bash
   pm2 start /home/container/monopoly-web/server.js --name nirino-monopoly
   pm2 save
   ```

   Jangan mengganti startup bot yang sedang berjalan tanpa memastikan cara bot saat ini dijalankan. Jika panel hanya menjalankan satu proses foreground, jalankan kedua proses dengan PM2 atau pisahkan web ke server NekoHost lain.

## Hubungkan bot NIRINO

1. Ganti file bot dengan file `nirino1.js` hasil patch yang disertakan dalam ZIP integrasi.
2. Buat file `monopoly-web-config.json` di folder kerja bot (sejajar dengan file utama bot):

   ```json
   {
     "url": "https://NAMA-SUBDOMAIN.nekohost.id"
   }
   ```

3. Restart bot. Di grup WhatsApp, ketik `.monopoliweb`. Bot akan mengirim tautan web.

Alternatif: set environment variable `MONOPOLY_WEB_URL` pada proses bot.

## Cara main

- Pemain pertama buka link dan tekan **Buat Room**.
- Bagikan kode room / link `?room=KODE` kepada teman.
- Pemain lain isi nama dan tekan **Gabung Room**.
- Pembuat room menekan **Mulai** setelah minimal 2 pemain bergabung.
- Pemain bergiliran melempar dadu, membeli properti, dan membayar sewa/pajak.
- Maksimal 4 pemain, 40 giliran.

## Catatan

- Game state saat ini disimpan di memori proses. Jika server web restart, room aktif akan hilang.
- MVP ini tidak memakai saldo ekonomi WhatsApp; setiap pemain memulai dengan 1.500 koin game.
- Untuk penggunaan publik, sebaiknya aktifkan HTTPS (subdomain NekoHost) dan jangan membuka port internal selain yang diperlukan.
