#!/bin/bash

# CoinkrazyAI Docker Startup Script
# This script sets up and starts your application with Docker Compose

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CoinkrazyAI Docker Startup Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}\n"
    
    if [ ! -f .env.example ]; then
        echo -e "${RED}❌ .env.example file not found!${NC}"
        exit 1
    fi
    
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}Please update the following in .env:${NC}"
    echo -e "  • DATABASE_URL (use Neon or configure local PostgreSQL)"
    echo -e "  • VITE_PUBLIC_BUILDER_KEY"
    echo -e "  • DOMAIN (for SSL certificates)"
    echo -e "  • LETSENCRYPT_EMAIL\n"
    
    read -p "Press Enter to continue with Docker startup..."
fi

# Create required directories if they don't exist
echo -e "${BLUE}Setting up required directories...${NC}"
mkdir -p certbot/{conf,www}
mkdir -p logs
echo -e "${GREEN}✓ Directories ready${NC}\n"

# Parse command line arguments
COMMAND=${1:-up}

case $COMMAND in
    up)
        echo -e "${BLUE}Starting containers...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✓ Containers started!${NC}\n"
        
        echo -e "${BLUE}Waiting for services to be ready...${NC}"
        sleep 5
        
        echo -e "${GREEN}✓ Setup complete!${NC}\n"
        echo -e "${BLUE}Services:${NC}"
        echo -e "  • App: http://localhost:80"
        echo -e "  • Database: localhost:5432"
        echo -e "  • Logs: ./logs/\n"
        
        echo -e "${BLUE}Useful commands:${NC}"
        echo -e "  • View logs: ${YELLOW}docker-compose logs -f${NC}"
        echo -e "  • Stop: ${YELLOW}docker-compose down${NC}"
        echo -e "  • Rebuild: ${YELLOW}docker-compose up -d --build${NC}"
        echo -e "  • Restart: ${YELLOW}docker-compose restart${NC}\n"
        ;;
    
    down)
        echo -e "${BLUE}Stopping containers...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Containers stopped${NC}\n"
        ;;
    
    logs)
        echo -e "${BLUE}Showing logs...${NC}"
        docker-compose logs -f
        ;;
    
    restart)
        echo -e "${BLUE}Restarting containers...${NC}"
        docker-compose restart
        echo -e "${GREEN}✓ Containers restarted${NC}\n"
        ;;
    
    build)
        echo -e "${BLUE}Building containers...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}✓ Build complete${NC}\n"
        ;;
    
    rebuild)
        echo -e "${BLUE}Rebuilding and starting containers...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}✓ Rebuild complete!${NC}\n"
        ;;
    
    status)
        echo -e "${BLUE}Container Status:${NC}"
        docker-compose ps
        echo ""
        ;;
    
    clean)
        echo -e "${YELLOW}⚠️  This will stop and remove all containers and volumes!${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            echo -e "${GREEN}✓ Cleanup complete${NC}\n"
        else
            echo -e "${YELLOW}Cancelled${NC}\n"
        fi
        ;;
    
    help|--help|-h)
        echo -e "${BLUE}Usage:${NC}"
        echo -e "  ./docker-start.sh [COMMAND]\n"
        echo -e "${BLUE}Commands:${NC}"
        echo -e "  ${YELLOW}up${NC}       - Start containers (default)"
        echo -e "  ${YELLOW}down${NC}     - Stop containers"
        echo -e "  ${YELLOW}logs${NC}     - View container logs"
        echo -e "  ${YELLOW}restart${NC}  - Restart containers"
        echo -e "  ${YELLOW}status${NC}   - Show container status"
        echo -e "  ${YELLOW}build${NC}    - Build containers"
        echo -e "  ${YELLOW}rebuild${NC}  - Rebuild and start containers"
        echo -e "  ${YELLOW}clean${NC}    - Remove all containers and volumes"
        echo -e "  ${YELLOW}help${NC}     - Show this help message\n"
        ;;
    
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo -e "Run './docker-start.sh help' for available commands\n"
        exit 1
        ;;
esac
