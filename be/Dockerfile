FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY cmd/ ./cmd/
RUN go mod download
RUN CGO_ENABLED=0 go build -o savia-be ./cmd

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /root

COPY --from=builder /app/savia-be /root/savia-be

RUN chmod +x /root/savia-be

ENV PORT=8080

EXPOSE 8080

CMD ["/root/savia-be"]
