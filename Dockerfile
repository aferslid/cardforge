FROM mcr.microsoft.com/playwright:v1.60.1-noble

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install

COPY server ./server

WORKDIR /app/server

ENV PORT=8080

CMD ["node", "index.js"]