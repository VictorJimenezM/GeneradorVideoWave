#!/bin/bash
# Genera certificados autofirmados para desarrollo local HTTPS
DIR="$(cd "$(dirname "$0")" && pwd)"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -subj "/C=ES/ST=Madrid/L=Madrid/O=GeneradorVideoWave/CN=localhost"
echo "Certificados generados en $DIR/"
