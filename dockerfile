FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

ENV NODE_ENV=production

USER node

EXPOSE 3000 3001

CMD ["npm", "start"]