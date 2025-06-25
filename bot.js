// Final WhatsApp bot with AI & Automation Test Integration + Scheduler Support (WIB aware)
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const chromePath = path.join(basePath, 'chromium', 'chrome.exe');
const qrcode = require('qrcode-terminal');
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const chrono = require('chrono-node');
const { DateTime } = require('luxon');

const app = express();
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const suitesApi = 'http://127.0.0.1:5006/api/suites';
const runApi = 'http://127.0.0.1:5006/api/run';
const scheduleApi = 'http://127.0.0.1:5006/api/schedule';

let suitesListText = '';

const fetchSuites = async () => {
  try {
    const res = await fetch(suitesApi);
    const suites = await res.json();
    suitesListText = suites.map((s, i) => `🧪 ${i + 1}. ${s.path}`).join('\n');
  } catch (error) {
    console.error('❌ Error fetching test suites:', error);
    suitesListText = '(Gagal mengambil daftar suite)';
  }
};

const nowJakarta = DateTime.now().setZone('Asia/Jakarta').toFormat('dd MMMM yyyy');

const buildSystemPrompt = () => `
Kamu adalah Badru, asisten AI cerdas dan ramah.
Hari ini adalah ${nowJakarta}. Kamu berada di zona waktu Asia/Jakarta (GMT+7).
Semua waktu (run_at) HARUS dalam zona waktu Asia/Jakarta (WIB) dan format "YYYY-MM-DD HH:mm:ss".

Jika user meminta menjalankan test **dan tidak menyebutkan waktu**, balas: {"action": "run", "testsuite_path": "..."}
Jika user menyebutkan waktu atau jam tertentu (misalnya "jam 20.00", "besok pagi", "nanti malam"), anggap itu penjadwalan dan balas: {"action": "schedule", "testsuite_path": "...", "run_at": "..."}
Jika meminta daftar suite, balas: {"action": "list"}

Berikut adalah daftar test suites:
${suitesListText}

Jika pertanyaan tidak relevan dengan automation, jawab seperti biasa.
`;


let isFailed = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('✅ WhatsApp client is ready!');
  await fetchSuites();
});

client.on('message', async message => {
  console.log(`📩 ${message.from}: ${message.body}`);

  if (!message.body.startsWith('#TanyaBadru')) return;

  const userPrompt = message.body.replace('#TanyaBadru', '').trim();
  await client.sendMessage(message.from, '🤖 Memproses permintaan Anda...');

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: userPrompt,
        system: buildSystemPrompt(),
        stream: false
      })
    });

    const data = await response.json();
    const aiText = data.response.trim();
    let isHandled = false;

    console.log('data:', data);
    console.log('AI Response:', aiText);
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const aiCommand = JSON.parse(jsonMatch[0]);
        console.log('Parsed AI Command:', aiCommand);

        if (aiCommand.action === 'list') {
          await client.sendMessage(message.from, `📋 Daftar Test Suites:\n\n${suitesListText}`);
          isHandled = true;

        } else if (aiCommand.action === 'run' && aiCommand.testsuite_path) {
          const suitePath = aiCommand.testsuite_path;
          await client.sendMessage(message.from, `🚀 Menjalankan: *${suitePath}*...`);
          fetch(runApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testsuite_path: suitePath,
              phone_number: message.from,
            })
          });
          await client.sendMessage(message.from, '🕒 Test sedang dijalankan di background. Report akan dikirim otomatis.');
          isHandled = true;

        } else if (aiCommand.action === 'schedule' && aiCommand.testsuite_path) {
          try {
            await client.sendMessage(message.from, `🗓 Menjadwalkan: *${aiCommand.testsuite_path}* pada ${aiCommand.run_at} WIB...`);
            const responseSchedule = await fetch(scheduleApi, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                testsuite_path: aiCommand.testsuite_path,
                phone_number: message.from,
                run_at: aiCommand.run_at,
                status: 'scheduled',
              })
            });
            if (!responseSchedule.ok) {
              await client.sendMessage(message.from, '⚠️ Gagal menjadwalkan test. Silakan coba lagi.');
              return;
            }
            await client.sendMessage(message.from, '📅 Test berhasil dijadwalkan. Anda akan menerima laporan setelah selesai.');
            isHandled = true;
          } catch (e) {
            console.error('❌ Gagal menjadwalkan test:', e);
            await client.sendMessage(message.from, '❌  Gagal menjadwalkan test. Pastikan format waktu benar.');
            isFailed = true;
          }
        }

      } catch (e) {
        console.error('❌ Gagal parse JSON dari AI:', e);
      }
    }

    if (!isHandled) {
      if (!isFailed) {
        await client.sendMessage(message.from, aiText);
      }
    }
  } catch (error) {
    console.error('❌ AI Error:', error);
    await client.sendMessage(message.from, '⚠️ Error memanggil AI: ' + error.message);
  }
});

client.initialize();

app.get('/', (req, res) => res.send('WhatsApp Web.js API is running'));

app.post('/send', async (req, res) => {
  const { chatId, message } = req.body;
  try {
    await client.sendMessage(chatId, message);
    res.json({ status: 'sent', chatId, message });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.post('/send-file', upload.single('file'), async (req, res) => {
  const { chatId, caption } = req.body;
  const file = req.file;
  if (!chatId || !file) {
    return res.status(400).json({ error: 'Missing chatId or file' });
  }

  try {
    const base64File = file.buffer.toString('base64');
    const media = new MessageMedia(file.mimetype, base64File, file.originalname);
    await client.sendMessage(chatId, media, { caption });
    res.json({ status: 'sent', chatId, filename: file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(3001, () => console.log('🚀 API server running at http://localhost:3001'));
