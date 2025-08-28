# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app/frontend-novo
COPY frontend-novo/package*.json ./
RUN npm ci
COPY frontend-novo/ ./
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app/frontend-novo
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=build /app/frontend-novo ./
EXPOSE 8080
CMD ["npm","start","--","-p","8080","-H","0.0.0.0"]
