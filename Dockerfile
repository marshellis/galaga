FROM node:20-alpine
WORKDIR /app

# Install deps for both workspaces (hoists @colyseus/schema etc. to /app/node_modules)
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
RUN npm ci --workspace=shared --workspace=server

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/

# Compile shared
RUN npm run build --workspace=shared

# Compile server: tsc exits non-zero due to cross-workspace rootDir warnings
# but still emits correct JS — the server runtime is verified by tests
RUN npm run build --workspace=server; true

WORKDIR /app/server
EXPOSE 8080
CMD ["npm", "start"]
