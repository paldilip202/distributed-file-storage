FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p logs storage
EXPOSE 6001
CMD ["node", "src/app.js"]