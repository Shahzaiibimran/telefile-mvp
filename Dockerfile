FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

RUN cd backend && npm run build
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["node", "backend/dist/index.js"] 