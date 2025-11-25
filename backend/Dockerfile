FROM node:18

WORKDIR /app

# Install netcat for health checks
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

# Copy package.json
COPY package.json ./

# Copy prisma schema before npm install (needed for postinstall script)
COPY prisma ./prisma/

# Install dependencies (postinstall will generate Prisma client)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Make start script executable
RUN chmod +x start.sh

EXPOSE 3001

CMD ["./start.sh"]