FROM node:22.11.0

# Install system dependencies needed for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libdrm2 \
    libxshmfence1 \
    libxext6 \
    libxfixes3 \
    libxrender1 \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm install

# Copy app code
COPY . .

# Volumes to persist session/cache
VOLUME ["/app/.wwebjs_auth"]
VOLUME ["/app/.wwebjs_cache"]

# Expose API port
EXPOSE 3001

# Run the app
CMD ["node", "index.js"]
