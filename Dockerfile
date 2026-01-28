# Basis: Kleines Linux mit Node
FROM node:22-alpine

# Installiere notwendige Tools für Tailscale
RUN apk update && apk add --no-cache ca-certificates iptables ip6tables iproute2

# Arbeitsverzeichnis
WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm install

# Proxy Code kopieren
COPY index.js ./

# --- TAILSCALE INSTALLATION ---
# Wir nehmen die amd64 Version, weil Render auf Intel/AMD läuft (nicht Pi/ARM!)
ENV TSFILE=tailscale_1.94.1_amd64.tgz

# Download URL anpassen (die Struktur ist bei Static Binaries immer gleich)
RUN wget https://pkgs.tailscale.com/stable/${TSFILE} && \
    tar xzf ${TSFILE} --strip-components=1 -C /usr/bin/ tailscale_1.94.1_amd64/tailscaled tailscale_1.94.1_amd64/tailscale && \
    rm ${TSFILE}

# Start-Skript erstellen
# 1. Startet tailscaled im Userspace-Modus (wichtig für Render/Heroku)
# 2. Loggt sich ein
# 3. Startet den Node Proxy
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Tailscale..."' >> /app/start.sh && \
    echo 'tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "Authenticating Tailscale..."' >> /app/start.sh && \
    echo 'tailscale up --authkey=${TS_AUTHKEY} --hostname=render-gateway' >> /app/start.sh && \
    echo 'echo "Starting Node Proxy..."' >> /app/start.sh && \
    echo 'node index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Startbefehl
CMD ["/app/start.sh"]
