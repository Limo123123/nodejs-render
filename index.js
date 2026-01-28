const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5500;

// ZIEL: Die Tailscale-IP oder der MagicDNS-Name deines Raspberry Pi
// Wichtig: Nutze hier HTTP, da Tailscale intern schon verschlüsselt, 
// oder HTTPS, wenn dein Pi ein selbst-signiertes Zertifikat hat (dann secure: false).
const TARGET = process.env.TARGET_URL || 'http://100.82.208.74:5500'; 

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check (damit Render weiß, dass wir leben)
app.get('/health', (req, res) => res.send('Proxy OK'));

// Alles weiterleiten
app.use('/', createProxyMiddleware({
    target: TARGET,
    changeOrigin: true, // Wichtig für vHosts
    ws: true, // Websockets erlauben (für Chat!)
    secure: false, // Falls du HTTPS auf dem Pi nutzt, aber Zertifikate nicht matchen
    onProxyReq: (proxyReq, req, res) => {
        // Optional: Header setzen, damit der Pi weiß, woher es kommt
        proxyReq.setHeader('X-Forwarded-For', req.ip);
    },
    onError: (err, req, res) => {
        console.error('Proxy Fehler:', err);
        res.status(500).send('Proxy Error: Konnte Pi nicht erreichen.');
    }
}));

app.listen(PORT, () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
