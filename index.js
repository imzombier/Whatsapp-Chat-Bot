// ================== IMPORTS ==================
import baileys from '@whiskeysockets/baileys';
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = baileys;

import P from 'pino';
import express from 'express';
import QRCode from 'qrcode';

// ================== CONFIG ==================
const ADMIN_NUMBER = '918096091809@s.whatsapp.net';
const userLeads = {};
let latestQR = null;
let sock = null; // single socket instance

// ================== EXPRESS SERVER ==================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h2>GK Tech Solutions WhatsApp Bot</h2>
    <p>Status: Running 🚀</p>
    <p><a href="/qr">Open WhatsApp QR</a></p>
  `);
});

app.get('/qr', async (req, res) => {
  if (!latestQR) {
    return res.send('<h3>No QR available yet. Refresh in 5 seconds.</h3>');
  }

  const qrImage = await QRCode.toDataURL(latestQR);
  res.send(`
    <h3>Scan this QR with WhatsApp</h3>
    <img src="${qrImage}" />
    <p>WhatsApp → Linked Devices → Scan</p>
    <p>Refresh if QR expires</p>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ================== BOT ==================
async function startBot() {
  if (sock) return; // prevent multiple instances

  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['GK Tech Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // ===== CONNECTION HANDLER =====
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      console.log('📸 QR generated → open /qr');
    }

    if (connection === 'open') {
      console.log('✅ GK TECH SOLUTIONS Bot Connected');
      latestQR = null;
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;

      sock = null;

      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Generating new QR…');
      } else {
        console.log('⚠️ Connection lost. Reconnecting…');
      }

      setTimeout(startBot, 3000);
    }
  });

  // ===== MESSAGE HANDLER =====
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    if (sender.endsWith('@g.us')) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    const messageText = text.toLowerCase().trim();

    // MAIN MENU
    if (['hi', 'hello', 'menu', 'start', '5'].includes(messageText)) {
      await sock.sendMessage(sender, {
        text:
`👋 *Welcome to GK TECH SOLUTIONS*

1️⃣ Services
2️⃣ Pricing
3️⃣ Contact
4️⃣ Get Custom Bot`
      });
      return;
    }

    // START LEAD FLOW
    if (messageText === '4') {
      userLeads[sender] = { step: 1 };
      await sock.sendMessage(sender, { text: '📝 Enter your Full Name:' });
      return;
    }

    // LEAD STEPS
    if (userLeads[sender]) {
      const lead = userLeads[sender];

      if (lead.step === 1) {
        lead.name = text;
        lead.step = 2;
        await sock.sendMessage(sender, { text: '🏢 Business Type?' });
        return;
      }

      if (lead.step === 2) {
        lead.business = text;
        lead.step = 3;
        await sock.sendMessage(sender, { text: '📞 Contact Number?' });
        return;
      }

      if (lead.step === 3) {
        lead.phone = text;

        await sock.sendMessage(ADMIN_NUMBER, {
          text:
`📥 NEW LEAD

👤 Name: ${lead.name}
🏢 Business: ${lead.business}
📞 Phone: ${lead.phone}
📱 WhatsApp: ${sender.replace('@s.whatsapp.net', '')}`
        });

        await sock.sendMessage(sender, {
          text: '✅ Thank you! Our team will contact you shortly.'
        });

        delete userLeads[sender];
      }
    }
  });
}

startBot();
