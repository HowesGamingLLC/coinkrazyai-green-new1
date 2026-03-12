#!/bin/bash

# CoinKrazy AI - Docker Deployment Setup Script
# This script automates the initial setup of the Docker environment

set -e

echo "=========================================="
echo "CoinKrazy AI - Docker Deployment Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "[1/5] Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Get domain name
echo "[2/5] Configuring domain..."
read -p "Enter your domain name (e.g., coinkrazy.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Domain set to: $DOMAIN${NC}"
echo ""

# Create directories
echo "[3/5] Creating necessary directories..."
mkdir -p certbot/conf certbot/www logs ssl
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Set up environment file
echo "[4/5] Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ .env file created. Please edit it with your actual values:${NC}"
    echo "  - DATABASE_URL"
    echo "  - VITE_PUBLIC_BUILDER_KEY"
    echo "  - PING_MESSAGE"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi
echo -e "${GREEN}✓ Environment file configured${NC}"
echo ""

# Update nginx.conf with domain
echo "[5/5] Configuring Nginx..."
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/g" nginx.conf

# Generate self-signed certificate for initial startup
echo "Generating initial self-signed certificate..."
mkdir -p certbot/conf/live/coinkrazy
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certbot/conf/live/coinkrazy/privkey.pem \
  -out certbot/conf/live/coinkrazy/fullchain.pem \
  -subj "/CN=$DOMAIN" 2>/dev/null || true

echo -e "${GREEN}✓ Nginx configured for domain: $DOMAIN${NC}"
echo ""

# Start containers
echo "=========================================="
echo "Starting Docker containers..."
echo "=========================================="
echo ""

docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if app is running
if docker-compose exec -T app wget -O- http://localhost:8080/api/ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is running${NC}"
else
    echo -e "${YELLOW}⚠ Application may still be starting. Check logs with: docker-compose logs -f${NC}"
fi

echo ""
echo "=========================================="
echo "Installation complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Point your domain DNS to this server IP"
echo ""
echo "2. Get SSL certificate from Let's Encrypt:"
echo "   docker-compose exec certbot certbot certonly --webroot \\"
echo "     -w /var/www/certbot \\"
echo "     -d $DOMAIN \\"
echo "     -d www.$DOMAIN \\"
echo "     --email your-email@example.com \\"
echo "     --agree-tos \\"
echo "     --non-interactive"
echo ""
echo "3. Reload Nginx:"
echo "   docker-compose exec nginx nginx -s reload"
echo ""
echo "4. Verify HTTPS:"
echo "   curl https://$DOMAIN"
echo ""
echo "5. View logs:"
echo "   docker-compose logs -f"
echo ""
echo -e "${YELLOW}Current domain setup: $DOMAIN${NC}"
echo ""
