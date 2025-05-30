FROM node:18

# Instalación de ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3002
CMD ["node", "server.js"]
