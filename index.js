const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const PORT = process.env.PORT || 10000;

// ZIEL: Die URL deines Raspberry Pi
// Fallback auf Port 10000, falls die Env Var fehlt/falsch ist
const TARGET = process.env.TARGET_URL || 'http://100.82.208.74:10000'; 

// Der SOCKS5 Agent (Tailscale)
const tailscaleAgent = new SocksProxyAgent('socks5://127.0.0.1:1055');

console.log(`🚀 Proxy startet. Leite weiter an: ${TARGET}`);

// Health Check
app.get('/health', (req, res) => res.send('Proxy OK'));

// Proxy Konfiguration
const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    ws: true, // Websockets erlauben
    secure: false, // Selbst-signierte Zertifikate akzeptieren
    agent: tailscaleAgent,
    xfwd: true, // <--- WICHTIG: Fügt X-Forwarded-For Header automatisch und sicher hinzu
    
    onError: (err, req, res) => {
        console.error('Proxy Fehler (Verbindung zum Pi fehlgeschlagen):', err.message);
        
        // Verhindert Crash, falls Header schon gesendet wurden
        if (!res.headersSent) {
            res.status(502).send(`Gateway Error: Konnte Raspberry Pi nicht erreichen. Ist der Port korrekt? (${err.message})`);
        }
    }
};

app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Gateway läuft auf Port ${PORT}`);
});
