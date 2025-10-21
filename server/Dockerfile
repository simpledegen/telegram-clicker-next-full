FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npx tsc -p .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app /app
CMD ["node", "dist/index.js"]
