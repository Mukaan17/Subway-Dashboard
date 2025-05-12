FROM node:16-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start React development server
CMD ["npm", "start"] 