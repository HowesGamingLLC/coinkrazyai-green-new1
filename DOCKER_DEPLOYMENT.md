# Docker Deployment Guide - CoinKrazy AI

## Prerequisites
- Docker and Docker Compose installed on your server
- Domain name pointing to your server
- Environment variables configured
- Ports 80 and 443 accessible from the internet

## Quick Start

### 1. Clone/Pull the Deployment Files
```bash
# On your server
git clone https://github.com/coinkrazygaming/coinkrazyai-new26-green.git coinkrazy-deploy
cd coinkrazy-deploy
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and set:
```
DATABASE_URL=postgresql://neondb_owner:your_password@ep-morning-violet-ai7zchiq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
VITE_PUBLIC_BUILDER_KEY=your_builder_key
PING_MESSAGE=ping pong
```

### 3. Set Your Domain Name
Edit `nginx.conf` and replace `_` with your domain:
```bash
sed -i 's/server_name _;/server_name yourdomain.com www.yourdomain.com;/g' nginx.conf
```

### 4. Create Directories for SSL Certificates
```bash
mkdir -p certbot/conf certbot/www logs ssl
```

### 5. Initial SSL Certificate Setup
```bash
# Generate a self-signed certificate initially
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem -out ssl/fullchain.pem \
  -subj "/CN=yourdomain.com"

# Create the directory structure for Let's Encrypt
mkdir -p certbot/conf/live/coinkrazy
cp ssl/privkey.pem certbot/conf/live/coinkrazy/privkey.pem
cp ssl/fullchain.pem certbot/conf/live/coinkrazy/fullchain.pem
```

### 6. Start the Services
```bash
docker-compose up -d
```

Monitor the startup:
```bash
docker-compose logs -f
```

### 7. Get a Real SSL Certificate from Let's Encrypt
```bash
# Run this after the app is running
docker-compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive \
  --expand
```

### 8. Reload Nginx with Real Certificate
```bash
docker-compose exec nginx nginx -s reload
```

## Verify HTTPS is Working
```bash
# Check certificate
curl -v https://yourdomain.com

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Internet (HTTPS)              │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │   Nginx (443)   │
        │ Reverse Proxy   │
        │   + SSL/TLS     │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   App (8080)    │
        │  Node.js Server │
        │  (not exposed)  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   PostgreSQL    │
        │   Database      │
        └─────────────────┘
```

## Services

### Nginx (Port 443)
- Reverse proxy handling all HTTPS traffic
- Automatic HTTP to HTTPS redirection
- Rate limiting
- Security headers (HSTS, CSP, etc)
- Automatic certificate renewal

### App (Port 8080 - Internal Only)
- Node.js/Express server
- React frontend (SPA)
- NOT directly accessible from the internet

### PostgreSQL (Internal Only)
- Local PostgreSQL database (or use external Neon)
- Data persisted in Docker volume

### Certbot
- Automatic SSL certificate management
- Renews certificates 30 days before expiration
- Uses ACME protocol (Let's Encrypt)

## Important Files

- `docker-compose.yml` - Container orchestration
- `nginx.conf` - Nginx reverse proxy configuration
- `.env` - Environment variables (create from .env.example)
- `Dockerfile` - App container build configuration
- `logs/` - Application and access logs

## Common Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f certbot
```

### Check SSL Certificate Status
```bash
# Inside Nginx container
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/coinkrazy/fullchain.pem -noout -dates

# Or from host if mounted
openssl x509 -in certbot/conf/live/coinkrazy/fullchain.pem -noout -dates
```

### Renew SSL Certificate Manually
```bash
docker-compose exec certbot certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart nginx
```

### Update Code
```bash
# Pull latest from GitHub
docker-compose down
docker-compose up -d --build
```

### Check Application Health
```bash
# Direct health check
docker-compose exec app wget -O- http://localhost:8080/api/ping

# Or via curl
curl https://yourdomain.com/api/ping
```

## Troubleshooting

### HTTPS Certificate Issues
```bash
# Check certificate validity
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/coinkrazy/fullchain.pem -text

# Check Nginx error logs
docker-compose logs nginx | grep error

# Validate Nginx configuration
docker-compose exec nginx nginx -t
```

### App Won't Start
```bash
# Check application logs
docker-compose logs app

# Verify environment variables
docker-compose config | grep -A 10 "environment:"

# Check database connection
docker-compose logs db
```

### Database Connection Errors
```bash
# Test database
docker-compose exec db psql -U neondb_owner -d neondb -c "SELECT 1"

# Or if using external Neon database, test from app:
docker-compose exec app curl $DATABASE_URL
```

### Port Already in Use
```bash
# Change ports in docker-compose.yml
# For Nginx: ports: ["8081:80", "8444:443"]
# Then rebuild: docker-compose up -d
```

### Nginx can't connect to app
```bash
# Verify app is running
docker-compose ps

# Check app health
docker-compose logs app

# Verify network
docker network ls
docker network inspect coinkrazy-network
```

## Production Security Checklist

- [ ] SSL certificate properly installed and renewed
- [ ] firewall configured (allow only 80, 443, SSH)
- [ ] Strong database passwords in .env
- [ ] Regular backups of database
- [ ] Monitoring and alerting set up
- [ ] Rate limiting enabled (configured in nginx.conf)
- [ ] Security headers in place
- [ ] Regular security updates for dependencies
- [ ] SSH key-based authentication only
- [ ] Regular log reviews

## Database Management

### Using External Neon Database (Recommended)
Just set `DATABASE_URL` in `.env` to your Neon connection string. The local PostgreSQL service won't be used.

### Using Local PostgreSQL
```bash
# Access database
docker-compose exec db psql -U neondb_owner -d neondb

# Backup database
docker-compose exec db pg_dump -U neondb_owner neondb > backup.sql

# Restore from backup
docker-compose exec -T db psql -U neondb_owner neondb < backup.sql
```

## Scaling and Performance

### Enable HTTP/2 and Brotli Compression
Already enabled in nginx.conf for faster performance.

### Monitor Resource Usage
```bash
docker stats
```

### Database Connection Pooling
Consider using PgBouncer if needed:
```bash
# Create pgbouncer service in docker-compose.yml
# and route app connections through it
```

## Support

For issues with your specific domain or setup, check:
1. Application logs: `docker-compose logs app`
2. Nginx logs: `docker-compose logs nginx`
3. SSL certificate: `openssl x509 -in certbot/conf/live/coinkrazy/fullchain.pem -text`
4. Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
