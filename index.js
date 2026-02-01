// ================= IMPORTS =================
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from 'baileys';

import P from 'pino';
import express from 'express';
import QRCode from 'qrcode';

// ================= CONFIG =================
const ADMIN_NUMBER = '918096091809@s.whatsapp.net';
const userLeads = {};
let latestQR = null;

// ================= EXPRESS =================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h2>GK Tech Solutions WhatsApp Bot</h2>
    <p>Status: Running 🚀</p>
    <a href="/qr">Open WhatsApp QR</a>
  `);
});

app.get('/qr', async (req, res) => {
  if (!latestQR) return res.send('QR not ready. Refresh...');
  res.send(`<img src="${await QRCode.toDataURL(latestQR)}" />`);
});

app.listen(PORT, () =>
  console.log(`🌐 Web server running on port ${PORT}`)
);

// ================= BOT =================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ['GK Tech Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      latestQR = qr;
      console.log('📸 QR generated');
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp Connected');
      latestQR = null;
    }

    if (
      connection === 'close' &&
      lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut
    ) {
      startBot();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    if (['hi', 'hello', 'menu', 'start'].includes(text.toLowerCase())) {
      await sock.sendMessage(sender, {
        text: `👋 Welcome to GK TECH SOLUTIONS

1️⃣ Services
2️⃣ Pricing
3️⃣ Contact
4️⃣ Get Custom Bot`
      });
    }
  });
}

startBot();
