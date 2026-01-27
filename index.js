// ================== IMPORTS ==================
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import P from 'pino';
import qrcode from 'qrcode-terminal';
import express from 'express';

// ================== CONFIG ==================
const ADMIN_NUMBER = '918096091809@s.whatsapp.net'; // change if needed
const userLeads = {}; // temp in-memory storage

// ================== KEEP ALIVE SERVER ==================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('GK TECH SOLUTIONS WhatsApp Bot is running 🚀');
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// ================== BOT FUNCTION ==================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
  logger: P({ level: 'silent' }),
  auth: state,
  printQRInTerminal: true
});


  sock.ev.on('creds.update', saveCreds);

  // ================== CONNECTION ==================
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📱 Scan QR Code below:');
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
        console.log('❌ Logged out. Please scan QR again.');
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

    // ================== MAIN MENU ==================
    if (['hi', 'hello', 'start', 'menu', '5'].includes(messageText)) {
      await sock.sendMessage(sender, {
        text:
`👋 *Welcome to GK TECH SOLUTIONS*

🚀 We provide *Automated Chat Bots* & *Professional Websites* to help businesses grow through smart automation.

👉 Please choose an option below:

*1️⃣  Our Services*  
*2️⃣  Pricing*  
*3️⃣  Contact & Support*  
*4️⃣  Get Your Custom Bot*`
      });
      return;
    }

    // ================== SERVICES ==================
    if (messageText === '1' || messageText === 'services') {
      await sock.sendMessage(sender, {
        text:
`🛠️ *Our Services*

🤖 Automated Chat Bots  
🌐 Business Websites  
📈 Lead & Business Automation  
🛠️ Setup & 24/7 Support  

_Type *4* to get your custom bot._  
_Type *5* to return to menu._`
      });
      return;
    }

    // ================== PRICING ==================
    if (messageText === '2' || messageText === 'price' || messageText === 'pricing') {
      await sock.sendMessage(sender, {
        text:
`💰 *Pricing*

✅ Starting from *₹999*  
• Depends on features & customization  

_Type *4* to request a quote._  
_Type *5* to return to menu._`
      });
      return;
    }

    // ================== CONTACT ==================
    if (messageText === '3' || messageText === 'contact' || messageText === 'support') {
      await sock.sendMessage(sender, {
        text:
`📞 *Contact & Support*

🕒 Available 24/7  
📱 +91-8096091809  

_Type *4* to get started._  
_Type *5* to return to menu._`
      });
      return;
    }

    // ================== LEAD START ==================
    if (messageText === '4' || messageText.includes('custom bot')) {
      userLeads[sender] = { step: 1 };

      await sock.sendMessage(sender, {
        text:
`🚀 *Get Your Custom Bot*

Let’s build the right solution for your business.

📝 Please enter your *Full Name*:`
      });
      return;
    }

    // ================== LEAD FLOW ==================
    if (userLeads[sender]) {
      const lead = userLeads[sender];

      if (lead.step === 1) {
        lead.name = text;
        lead.step = 2;
        await sock.sendMessage(sender, {
          text: `🏢 Thanks, *${lead.name}*.\n\nPlease enter your *Business Type*:`
        });
        return;
      }

      if (lead.step === 2) {
        lead.business = text;
        lead.step = 3;
        await sock.sendMessage(sender, {
          text: `📋 Please describe your *Requirement* (Bot / Website / Both):`
        });
        return;
      }

      if (lead.step === 3) {
        lead.requirement = text;
        lead.step = 4;
        await sock.sendMessage(sender, {
          text: `📞 Please share your *Contact Number*:`
        });
        return;
      }

      if (lead.step === 4) {
        lead.phone = text;

        const adminMsg =
`📥 *NEW LEAD RECEIVED*

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

Your request has been submitted successfully.
Our team will contact you shortly.

*- GK TECH SOLUTIONS*

_Type *5* to return to the main menu._`
        });

        delete userLeads[sender];
        return;
      }
    }

    // ================== FALLBACK ==================
    await sock.sendMessage(sender, {
      text: `❓ Invalid option.\n\nType *5* to return to the main menu.`
    });
  });
}

startBot();
