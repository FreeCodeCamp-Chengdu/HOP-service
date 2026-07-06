FROM node:18-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]