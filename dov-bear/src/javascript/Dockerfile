#FROM library/node:22-slim
FROM node@sha256:2fb92fe9d7350866a73c5cc311c1a19919ffd47e8592d4233374ee330e3bdb1e

LABEL org.opencontainers.image.source=https://github.com/chukmunnlee/dov-bear
LABEL maintainer=chukmunnlee

RUN apt update && apt upgrade -y

WORKDIR /app

COPY package*.json .

RUN npm ci --omit=dev

COPY . .

ENV PORT=3000 METRICS_PORT=3100

USER 1000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:${PORT}/healthz || exit 1

EXPOSE ${PORT} ${METRICS_PORT}

SHELL [ "/bin/sh", "-c" ]

CMD node main
