FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY frontend/ /app/frontend/

ENV PORT=3000 \
    DATA_FILE=/data/tasks.json

RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]