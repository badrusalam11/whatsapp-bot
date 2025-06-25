const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;

const chromePath = path.join(basePath, 'chromium', 'chrome.exe');
console.log("🧭 Using Chrome path:", chromePath);
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();
app.use(express.json());

// Setup multer for form-data file uploads
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
    executablePath: path.join(chromePath),
    headless: true, // or false if you want to see the window
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
});

client.on('message', async message => {
    console.log(`📩 ${message.from}: ${message.body}`);

    // Skip system or group messages (optional)
    // if (message.fromMe || message.isStatus || message.type !== 'chat') return;
    if (!message.body.startsWith('#TanyaBadru')) {
        return false;
    }
    // Remove the command prefix
    message.body = message.body.replace('#TanyaBadru', '').trim();
    try {
        console.log(`🤖 Processing message: ${message.body}`);
        await client.sendMessage(message.from, "🤖 Processing your request...");
        // Send to Ollama API (running at localhost:11434)
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: message.body,
                system: `Kamu adalah Badru, asisten AI cerdas dan ramah yang membantu pengguna WhatsApp menjawab berbagai pertanyaan secara akurat, sopan, dan mudah dipahami. 
                Jawablah dalam bahasa yang sama dengan bahasa yang digunakan oleh pengguna. 
                Jika pertanyaan menggunakan bahasa Indonesia, jawab dengan bahasa Indonesia. 
                Jika menggunakan bahasa Inggris, jawab dengan bahasa Inggris, dan sesuaikan gaya bahasa dengan konteks pengguna.`,
                stream: false
            })
            });

        const data = await response.json();
        // Send the response back to WhatsApp
        if (data && data.response) {
            await client.sendMessage(message.from, data.response.trim());
        } else {
            await client.sendMessage(message.from, "❌ Failed to get AI response.");
        }
    } catch (error) {
        console.error('❌ AI Error:', error);
        await client.sendMessage(message.from, "⚠️ Error calling AI: " + error.message);
    }
});

client.initialize();

// === Express REST API ===
app.post('/send', async (req, res) => {
    const { chatId, message } = req.body;

    try {
        await client.sendMessage(chatId, message);
        res.json({ status: 'sent', chatId, message });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Web.js API is running');
});

app.get('/groups', async (req, res) => {
    try {
        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name
            }));

        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

app.get('/chats', async (req, res) => {
    try {
        const chats = await client.getChats();
        const formatted = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name || chat.formattedTitle || 'Unknown',
            isGroup: chat.isGroup
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});


app.get('/contacts', async (req, res) => {
    try {
        const contacts = await client.getContacts();
        const formatted = contacts.map(contact => ({
            id: contact.id._serialized,
            number: contact.id.user,
            name: contact.name || contact.pushname || 'Unknown',
            isBusiness: contact.isBusiness,
            isEnterprise: contact.isEnterprise
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
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

        res.json({
            status: 'sent',
            chatId,
            filename: file.originalname,
            caption: caption || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.toString() });
    }
});




app.listen(3001, () => {
    console.log('🚀 API server running at http://localhost:3001');
});
