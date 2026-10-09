FROM node:22-alpine

WORKDIR /app

# Install git and other utilities required for pipelines
RUN apk add --no-cache git openssh docker-cli

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5002

CMD ["npm", "start"]
