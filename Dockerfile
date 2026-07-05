FROM node:20-alpine

WORKDIR /app

# Server deps
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Client build
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Server source
COPY server/ ./server/

ENV NODE_ENV=production
ENV USE_JSON_DB=true
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "cd server && node server.js"]
