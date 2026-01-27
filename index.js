// ================== IMPORTS ==================
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import P from 'pino';
import qrcode from 'qrcode-terminal';
import express from 'express';

// ================== CONFIG ==================
const ADMIN_NUMBER = '918096091809@s.whatsapp.net';
const userLeads = {};

// ================== KEEP-ALIVE SERVER (RENDER) ==================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('GK Tech Solutions WhatsApp Bot is running 🚀');
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// ================== BOT START ==================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  // ================== CONNECTION UPDATE ==================
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR Code to connect WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ GK TECH SOLUTIONS Bot Connected');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...');
        startBot();
      } else {
        console.log('❌ Logged out. Scan QR again.');
      }
    }
  });

  // ================== MESSAGE HANDLER ==================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    if (sender.endsWith('@g.us')) return; // ignore groups

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';
    const messageText = text.toLowerCase().trim();

    // -------- MAIN MENU --------
    if (['hi', 'hello', 'start', 'menu', '5'].includes(messageText)) {
      await sock.sendMessage(sender, {
        text:
`👋 *Welcome to GK TECH SOLUTIONS*

🚀 We provide *Automated Chat Bots* & *Professional Websites* to help businesses grow.

👉 Choose an option:

*1️⃣ Our Services*
*2️⃣ Pricing*
*3️⃣ Contact & Support*
*4️⃣ Get Your Custom Bot*`
      });
      return;
    }

    // -------- SERVICES --------
    if (messageText === '1' || messageText === 'services') {
      await sock.sendMessage(sender, {
        text:
`🛠️ *Our Services*

🤖 Automated Chat Bots
🌐 Business Websites
📈 Business Automation
🛠️ Setup & Support

_Type *5* for menu._`
      });
      return;
    }

    // -------- PRICING --------
    if (['2', 'price', 'pricing'].includes(messageText)) {
      await sock.sendMessage(sender, {
        text:
`💰 *Pricing*

Starting from *₹999*
(Depends on requirements)

_Type *4* to get a quote._
_Type *5* for menu._`
      });
      return;
    }

    // -------- CONTACT --------
    if (['3', 'contact', 'support'].includes(messageText)) {
      await sock.sendMessage(sender, {
        text:
`📞 *Contact & Support*

📱 +91-8096091809
🕒 24/7 Support

_Type *5* for menu._`
      });
      return;
    }

    // -------- LEAD START --------
    if (messageText === '4') {
      userLeads[sender] = { step: 1 };
      await sock.sendMessage(sender, {
        text: `📝 Please enter your *Full Name*:`
      });
      return;
    }

    // -------- LEAD FLOW --------
    if (userLeads[sender]) {
      const lead = userLeads[sender];

      if (lead.step === 1) {
        lead.name = text;
        lead.step = 2;
        await sock.sendMessage(sender, {
          text: `🏢 Enter your *Business Type*:`
        });
        return;
      }

      if (lead.step === 2) {
        lead.business = text;
        lead.step = 3;
        await sock.sendMessage(sender, {
          text: `📋 Describe your *Requirement* (Bot / Website / Both):`
        });
        return;
      }

      if (lead.step === 3) {
        lead.requirement = text;
        lead.step = 4;
        await sock.sendMessage(sender, {
          text: `📞 Share your *Contact Number*:`
        });
        return;
      }

      if (lead.step === 4) {
        lead.phone = text;

        const adminMsg =
`📥 *NEW LEAD*

👤 Name: ${lead.name}
🏢 Business: ${lead.business}
📋 Requirement: ${lead.requirement}
📞 Phone: ${lead.phone}
📱 WhatsApp: ${sender.replace('@s.whatsapp.net', '')}
🕒 ${new Date().toLocaleString()}`;

        await sock.sendMessage(ADMIN_NUMBER, { text: adminMsg });

        await sock.sendMessage(sender, {
          text:
`✅ *Thank you, ${lead.name}!*

Our team will contact you shortly.

*- GK TECH SOLUTIONS*
_Type *5* for menu._`
        });

        delete userLeads[sender];
        return;
      }
    }

    // -------- FALLBACK --------
    await sock.sendMessage(sender, {
      text: `❓ Invalid option.\nType *5* for menu.`
    });
  });
}

startBot();
