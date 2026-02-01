import baileys from '@whiskeysockets/baileys';
import P from 'pino';
import express from 'express';
import QRCode from 'qrcode';

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = baileys;

let sock;
let latestQR = null;

// ---------- EXPRESS ----------
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send(`
    <h2>GK Tech WhatsApp Bot</h2>
    <a href="/qr">Open QR</a>
  `);
});

app.get('/qr', async (req, res) => {
  if (!latestQR) return res.send('QR not generated yet');
  res.send(`<img src="${await QRCode.toDataURL(latestQR)}" />`);
});

app.listen(PORT, () =>
  console.log('🌐 Web server running on port 3000')
);

// ---------- BOT ----------
async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ['GK-Bot', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) {
      latestQR = qr;
      console.log('📸 QR generated');
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp Connected');
      latestQR = null;
    }
  });
}

startBot();
