FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy package files first (for better layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy the entire project
COPY . .

# Expose ports
EXPOSE 8080 5173

# Start the development server
CMD ["pnpm", "dev"]
