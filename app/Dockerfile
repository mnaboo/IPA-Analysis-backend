FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install typescript -g

COPY . .

EXPOSE 3000
