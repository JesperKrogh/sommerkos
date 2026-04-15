FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache chromium nss

COPY package.json package-lock.json* ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

COPY . .
RUN npm run build
RUN cp -r /app/data /app/dist/data
RUN cp /app/logo-kos.png /app/dist/logo-kos.png
RUN cp -r /app/images-web /app/dist/images
RUN cp -r /app/images-overview /app/dist/images-overview
RUN PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser node scripts/prerender.mjs || true

FROM nginx:1.27-alpine AS serve

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
