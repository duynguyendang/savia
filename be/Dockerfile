# be/Dockerfile
FROM golang:1.25.5-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build binary
RUN go build -o main ./cmd/main.go

# Final stage
FROM alpine:latest
WORKDIR /root/
# Quan trọng: Copy các file logic Datalog vào container
COPY --from=builder /app/resources ./resources
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]