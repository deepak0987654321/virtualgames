# Base image
FROM node:22-alpine


# Install build dependencies for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
# Use npm install instead of ci to be more forgiving with cross-platform lockfiles
RUN npm install


# Copy source
COPY . .

# Build Next.js (required for the frontend assets)
# The server will ignore the built server and use custom 'server.ts' via ts-node,
# but Next needs '.next' folder for pages.
RUN npm run build

# Expose Port
EXPOSE 3000

# Set Env
ENV NODE_ENV=production
ENV PORT=3000

# Start Command
# We use the 'start' script from package.json which runs: ts-node server.ts
CMD ["npm", "start"]
