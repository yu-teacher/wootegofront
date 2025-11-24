FROM node:24-alpine

WORKDIR /app

# 전체 프로젝트 복사
COPY . .

# 의존성 설치 (dev 포함)
RUN npm install

EXPOSE 3003

ENV PORT=3003
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3003"]