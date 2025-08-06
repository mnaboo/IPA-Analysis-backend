# Użyj oficjalnego obrazu Node z obsługą TypeScript
FROM node:20

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj package.json i package-lock.json
COPY package*.json ./

# Zainstaluj zależności
RUN npm install

# Skopiuj resztę plików (w tym src/)
COPY . .

# Skonfiguruj domyślny port (opcjonalnie)
EXPOSE 3000

# Komenda startowa
CMD ["npm", "run", "dev"]
