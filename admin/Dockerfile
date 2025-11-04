FROM node:20-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY views ./views
RUN npx tsc

FROM node:20-bookworm
WORKDIR /app

# install nftables in the runtime image
RUN apt-get update && apt-get install -y --no-install-recommends nftables wireguard-tools iproute2 zip && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
COPY views ./views

EXPOSE 3000
CMD ["node", "dist/server.js"]
