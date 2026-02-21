const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
// NEU: Wir nutzen den HTTP Proxy Agent!
const { HttpProxyAgent } = require('http-proxy-agent');

const app = express();
const PORT = process.env.PORT || 10000;

const TARGET = process.env.TARGET_URL || 'http://100.82.208.74:10000'; 

// NEU: Tailscale bietet auf 1055 auch einen HTTP-Proxy an.
// HTTP-Proxys unterstützen in Node.js perfektes Keep-Alive!
const tailscaleAgent = new HttpProxyAgent('http://127.0.0.1:1055', {
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 30000
});

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check (fängt auch die Render-Pings ab, keine Fehlermeldungen mehr!)
app.get('/health', (req, res) => res.send('Proxy OK'));

const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    ws: true,
    secure: false,
    agent: tailscaleAgent, // Der neue, schnelle HTTP Agent
    xfwd: true,
    proxyTimeout: 15000,
    timeout: 15000,
    onError: (err, req, res) => {
        console.error('Proxy Fehler:', err.message);
        if (!res.headersSent) res.status(502).send('Gateway Error');
    }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
