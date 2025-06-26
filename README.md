📲 WhatsApp Web.js API
Node.js REST API menggunakan whatsapp-web.js untuk mengirim pesan, file, dan membaca informasi chat/contacts dari WhatsApp Web. API ini cocok digunakan untuk integrasi dengan aplikasi lain, seperti notifikasi otomatis, chatbot, dan dashboard monitoring.

# Build executable
- Run Command: `pkg . --targets node18-win-x64 --output whatsapp-bot.exe`


🚀 Instalasi
bash
Copy
Edit
git clone https://github.com/username/whatsapp-api-server.git
cd whatsapp-api-server
npm install
✅ Jalankan Server
bash
Copy
Edit
node index.js
Pertama kali dijalankan, Anda harus memindai QR Code yang muncul di terminal untuk login ke akun WhatsApp Anda.

📡 Endpoints
GET /
Cek status server.

Response:

text
Copy
Edit
WhatsApp Web.js API is running
GET /chats
Mendapatkan semua chat (grup & pribadi).

Response:

json
Copy
Edit
[
  {
    "id": "628123456789@c.us",
    "name": "John Doe",
    "isGroup": false
  },
  {
    "id": "628123456789-1234567890@g.us",
    "name": "My Group",
    "isGroup": true
  }
]
GET /groups
Mendapatkan hanya chat grup.

Response:

json
Copy
Edit
[
  {
    "id": "628123456789-1234567890@g.us",
    "name": "My Group"
  }
]
GET /contacts
Mendapatkan daftar kontak dari akun WhatsApp.

Response:

json
Copy
Edit
[
  {
    "id": "628123456789@c.us",
    "number": "628123456789",
    "name": "John Doe",
    "isBusiness": false,
    "isEnterprise": false
  }
]
POST /send
Mengirim pesan teks ke chat (grup atau individu).

Request Body:

json
Copy
Edit
{
  "chatId": "628123456789@c.us",
  "message": "Halo dari API!"
}
Response:

json
Copy
Edit
{
  "status": "sent",
  "chatId": "628123456789@c.us",
  "message": "Halo dari API!"
}
POST /send-file
Mengirim file (gambar, PDF, dll) dengan optional caption.

Content-Type: multipart/form-data

Form Data:

chatId: ID WhatsApp (@c.us atau @g.us)

file: File yang diunggah

caption: (opsional) teks caption

Contoh dengan curl:

bash
Copy
Edit
curl -X POST http://localhost:3001/send-file \
  -F chatId="628123456789@c.us" \
  -F file=@./document.pdf \
  -F caption="Berikut dokumennya"
Response:

json
Copy
Edit
{
  "status": "sent",
  "chatId": "628123456789@c.us",
  "filename": "document.pdf",
  "caption": "Berikut dokumennya"
}
🧭 Konfigurasi Chromium
API ini menggunakan Chromium portable agar kompatibel di server/hosting. Letakkan file executable chrome.exe di dalam folder:

bash
Copy
Edit
./chromium/chrome.exe
File ini akan digunakan oleh Puppeteer untuk menjalankan WhatsApp Web.

🛡️ Catatan Keamanan
Jangan gunakan API ini di internet publik tanpa autentikasi dan pembatasan IP.

WhatsApp tidak mengizinkan penggunaan otomatisasi berlebihan—gunakan dengan bijak.

🧑‍💻 Author
M. Badru Salam – @badrusalam11