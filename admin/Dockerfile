# build stage
FROM node:20-bookworm AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY views ./views

RUN npx tsc

# runtime stage
FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY public ./public
COPY views ./views

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
