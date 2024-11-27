ARG TAG=3.18
ARG CGO=0
FROM golang:1-alpine${TAG} AS builder

WORKDIR /app

COPY go.mod .
COPY go.sum .
COPY main.go .

RUN CGO_ENABLED=${CGO} go build -o main ./...

FROM alpine:${TAG}

WORKDIR /app

COPY --from=builder /app/main .
ADD public public
ADD templates templates

RUN apk --no-cache add curl

ENV GIN_MODE=release PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -fs http://localhost:${PORT}/healthz

EXPOSE ${PORT}

ENTRYPOINT ./main
