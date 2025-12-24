# Dockerfile for Savia Backend
FROM golang:1.21-alpine

WORKDIR /app

COPY . .

RUN go build -o savia-be cmd/main.go

CMD ["./savia-be"]
