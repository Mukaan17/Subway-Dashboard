# -------- STAGE 1: Build Frontend --------
FROM node:23-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci
RUN apk add --no-cache curl

# Copy source files
COPY . .

# Build the frontend app (React/Vite/Next/etc.)
RUN npm run build

# -------- STAGE 2: Serve with NGINX --------
FROM nginx:alpine

# Copy production build to Nginx html directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
