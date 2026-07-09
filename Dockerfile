FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

ARG EXPO_PUBLIC_API_BASE_URL=/api
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
ENV VITE_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL

RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
