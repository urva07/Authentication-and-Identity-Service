FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Source copied one directory per layer, roughly from least to most frequently changed
COPY --chown=node:node .sequelizerc ./
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node seeds ./seeds
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node src/constants ./src/constants
COPY --chown=node:node src/errors ./src/errors
COPY --chown=node:node src/config ./src/config
COPY --chown=node:node src/lib ./src/lib
COPY --chown=node:node src/utils ./src/utils
COPY --chown=node:node src/integrations ./src/integrations
COPY --chown=node:node src/infrastructure ./src/infrastructure
COPY --chown=node:node src/monitoring ./src/monitoring
COPY --chown=node:node src/models ./src/models
COPY --chown=node:node src/repositories ./src/repositories
COPY --chown=node:node src/validators ./src/validators
COPY --chown=node:node src/middlewares ./src/middlewares
COPY --chown=node:node src/services ./src/services
COPY --chown=node:node src/constants ./src/constants
COPY --chown=node:node src/controllers/index.js ./src/controllers/index.js
COPY --chown=node:node src/controllers/mainApp ./src/controllers/mainApp
COPY --chown=node:node src/controllers/healthApp ./src/controllers/healthApp
COPY --chown=node:node src/routes ./src/routes
COPY --chown=node:node src/views ./src/views
COPY --chown=node:node src/app.js src/healthApp.js src/server.js ./src/

ENV NODE_ENV=development

USER root

EXPOSE 3000 3001

CMD ["npm", "start"]
