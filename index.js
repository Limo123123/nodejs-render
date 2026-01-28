const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const PORT = process.env.PORT || 10000;

// ZIEL: Die URL deines Raspberry Pi
const TARGET = process.env.TARGET_URL || 'http://raspberrypi:10000'; 

// WICHTIG: Der Agent, der den Verkehr durch den Tailscale-Tunnel (Socks5 Port 1055) leitet
const tailscaleAgent = new SocksProxyAgent('socks5://127.0.0.1:1055');

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check
app.get('/health', (req, res) => res.send('Proxy OK'));

// Proxy Konfiguration
const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    ws: true, // Websockets
    secure: false,
    agent: tailscaleAgent, // <--- HIER IST DER TRICK!
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Forwarded-For', req.ip);
    },
    onError: (err, req, res) => {
        console.error('Proxy Fehler:', err.message);
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
