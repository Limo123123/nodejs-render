const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const PORT = process.env.PORT || 10000;

const TARGET = process.env.TARGET_URL || 'http://100.82.208.74:10000'; 

// Der SOCKS5 Agent, aber diesmal mit aktiviertem Keep-Alive für den Turbo-Boost!
const tailscaleAgent = new SocksProxyAgent('socks5://127.0.0.1:1055', {
    keepAlive: true,        // Hält den Tailscale-Tunnel dauerhaft offen!
    maxSockets: 100,        // Mehr parallele Verbindungen
    timeout: 30000          // 30 Sekunden Limit
});

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check (fängt Render-Scans sauber ab)
app.get('/health', (req, res) => res.send('Proxy OK'));

// Proxy Konfiguration
const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    ws: true, // Websockets
    secure: false, 
    agent: tailscaleAgent, // Unser gepimpter SOCKS5 Agent
    xfwd: true, // Behält die originale IP des Users bei
    
    // Feste Timeouts verhindern Zombie-Prozesse
    proxyTimeout: 15000, 
    timeout: 15000,
    
    onError: (err, req, res) => {
        console.error('Proxy Fehler:', err.message);
        if (!res.headersSent) {
            res.status(502).send(`Gateway Error: Konnte Pi nicht erreichen. (${err.message})`);
        }
    }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
