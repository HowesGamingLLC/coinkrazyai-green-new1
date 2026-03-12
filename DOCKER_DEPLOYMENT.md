# Docker Deployment Guide

## Prerequisites
- Docker and Docker Compose installed on your server
- Environment variables configured

## Quick Start

### 1. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and set your configuration:
- `DATABASE_URL` - Your database connection string
- `VITE_PUBLIC_BUILDER_KEY` - Your Builder.io public key
- Other API keys and secrets as needed

### 2. Build and Run
```bash
# Build the Docker image and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 3. Access the Application
- Application: `http://your-server:8080`
- API Health Check: `http://your-server:8080/api/ping`

## Using External Database (Recommended for Production)

If using Neon or another external PostgreSQL service:
1. Set `DATABASE_URL` in `.env` to your external database URL
2. The local PostgreSQL service won't be used (you can remove the `db` service from docker-compose.yml)

### Minimal docker-compose.yml for external DB:
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: coinkrazy-app
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - VITE_PUBLIC_BUILDER_KEY=${VITE_PUBLIC_BUILDER_KEY}
      - PING_MESSAGE=${PING_MESSAGE}
    restart: unless-stopped
```

## Using Local PostgreSQL Database

If you want to use the included PostgreSQL service:
1. Set `DATABASE_URL=postgresql://neondb_owner:password@db:5432/neondb` in `.env`
2. Set PostgreSQL credentials in `.env`
3. Run `docker-compose up -d`

## Production Deployment Tips

### 1. Use a Reverse Proxy (Nginx)
```nginx
upstream app {
  server app:8080;
}

server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### 2. Enable HTTPS
Use Let's Encrypt with Certbot:
```bash
docker run -it --rm --name certbot -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" certbot/certbot certonly \
  --standalone -d yourdomain.com
```

### 3. Scaling
```bash
# Scale the app service
docker-compose up -d --scale app=3
```

### 4. Database Backups
```bash
# Backup PostgreSQL
docker-compose exec db pg_dump -U neondb_owner neondb > backup.sql

# Restore from backup
docker-compose exec -T db psql -U neondb_owner neondb < backup.sql
```

## Monitoring and Logs

```bash
# View app logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# Check container status
docker-compose ps

# Check resource usage
docker stats
```

## Troubleshooting

### App crashes on startup
- Check logs: `docker-compose logs app`
- Verify DATABASE_URL is correct
- Ensure database is healthy: `docker-compose ps`

### Database connection errors
- Check if db service is running: `docker-compose ps db`
- Test connection: `docker-compose exec db psql -U neondb_owner -d neondb -c "SELECT 1"`

### Port already in use
Change the port mapping in docker-compose.yml:
```yaml
ports:
  - "8081:8080"  # Maps server port 8081 to container port 8080
```

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or with zero downtime (if using reverse proxy):
docker-compose up -d --build --no-deps
```
