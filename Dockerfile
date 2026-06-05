FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production

CMD ["sh", "-c", "npm run db:deploy && npm start"]
