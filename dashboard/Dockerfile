FROM node:16-alpine as build

WORKDIR /app

# Configure Node for minimal memory usage
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source code
COPY . .

# Build with production optimization flags
RUN GENERATE_SOURCEMAP=false npm run build

# Production environment - use lightweight nginx alpine
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"] 