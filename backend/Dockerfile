FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

# Cloudflare Tunnel binary installieren (ersetzt ngrok)
RUN curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
