FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p data

CMD ["node", "src/index.js"]
