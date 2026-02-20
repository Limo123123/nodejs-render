const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const PORT = process.env.PORT || 10000;

// ZIEL: Die URL deines Raspberry Pi
const TARGET = process.env.TARGET_URL || 'http://100.82.208.74:10000'; 

// --- 1. MASSIVE OPTIMIERUNG: Keep-Alive & Pooling ---
// Hält den Tailscale-Tunnel offen, anstatt ihn für jeden Klick neu aufzubauen!
const tailscaleAgent = new SocksProxyAgent('socks5://127.0.0.1:1055', {
    keepAlive: true,        // Tunnel nicht schließen!
    maxSockets: 100,        // Bis zu 100 gleichzeitige parallele Anfragen erlauben
    maxFreeSockets: 10,     // 10 Tunnel auf Vorrat offen halten (für sofortige Antworten)
    timeout: 30000          // 30 Sekunden Timeout für den Socket
});

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check
app.get('/health', (req, res) => res.send('Proxy OK'));

// Proxy Konfiguration
const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    ws: true, // Websockets erlauben
    secure: false, // Selbst-signierte Zertifikate akzeptieren
    agent: tailscaleAgent, // Unser neuer Turbo-Agent
    xfwd: true, 
    
    // --- 2. OPTIMIERUNG: Feste Timeouts ---
    // Verhindert, dass der Render-Server unendlich hängt, falls der Pi mal neustartet
    proxyTimeout: 15000, // Bricht ab, wenn der Pi 15 Sekunden lang nicht antwortet
    timeout: 15000,
    
    onError: (err, req, res) => {
        console.error('Proxy Fehler (Verbindung zum Pi fehlgeschlagen):', err.message);
        
        if (!res.headersSent) {
            res.status(502).send(`Gateway Error: Konnte Raspberry Pi nicht erreichen. (${err.message})`);
        }
    }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
