# CoinkrazyAI Docker Setup Guide

A complete Docker setup for easy deployment and development of your CoinkrazyAI application with full production stack including PostgreSQL, Nginx, and automatic SSL certificates.

## Prerequisites

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Included with Docker Desktop, or [install separately](https://docs.docker.com/compose/install/)
- **Git**: For cloning and managing your repository

## Quick Start

### On Linux/macOS:

```bash
chmod +x docker-start.sh
./docker-start.sh up
```

### On Windows:

```bash
docker-start.bat up
```

## Setup Steps

### 1. Configure Environment Variables

The startup script will automatically create `.env` from `.env.example` if it doesn't exist.

**Required configuration:**

```env
# Application
NODE_ENV=production
VITE_PUBLIC_BUILDER_KEY=your_builder_key_here

# Database
DATABASE_URL=postgresql://user:password@db:5432/neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=neondb

# SSL/HTTPS
DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

### 2. Run the Startup Script

The script will:
- Create necessary directories (`certbot`, `logs`)
- Start all containers (app, nginx, certbot, database)
- Display connection information

## Architecture

```
┌─────────────────────────────────────────┐
│         Your Application                │
├─────────────────────────────────────────┤
│  Browser → Nginx (Port 80/443)          │
│  (Reverse proxy + SSL termination)      │
│                                         │
│  → Node.js App (Port 8080)              │
│     (Express server)                    │
│                                         │
│  → PostgreSQL Database (Port 5432)      │
│     (Data persistence)                  │
│                                         │
│  → Certbot (SSL/HTTPS)                  │
│     (Auto-renewal via Let's Encrypt)    │
└─────────────────────────────────────────┘
```

## Services

### **app** - Node.js Application
- Runs your full-stack React + Express application
- Port: 8080 (internal only, exposed via nginx)
- Auto-restart on failure
- Health checks every 30 seconds

### **nginx** - Web Server & Reverse Proxy
- Handles HTTP/HTTPS traffic
- Port: 80 (HTTP) and 443 (HTTPS)
- SSL certificate management
- Auto-reload configuration

### **db** - PostgreSQL Database
- Port: 5432 (internal only)
- Persistent data storage in `postgres_data` volume
- Health checks every 10 seconds

### **certbot** - SSL Certificate Manager
- Manages Let's Encrypt certificates
- Auto-renewal every 12 hours
- Stores certificates in `./certbot/` directory

## Commands

### Start Application
```bash
./docker-start.sh up
```

### Stop Application
```bash
./docker-start.sh down
```

### View Logs
```bash
./docker-start.sh logs
```

### Restart Services
```bash
./docker-start.sh restart
```

### Rebuild & Start (after code changes)
```bash
./docker-start.sh rebuild
```

### Check Container Status
```bash
./docker-start.sh status
```

### Clean Everything (remove containers & data)
```bash
./docker-start.sh clean
```

### Get Help
```bash
./docker-start.sh help
```

## Accessing Your Application

Once running:

- **Website**: `http://localhost` (or your domain if configured)
- **API**: `http://localhost/api/*`
- **Health Check**: `http://localhost/api/ping`

## Database Access

### From Container
```bash
docker-compose exec db psql -U neondb_owner -d neondb
```

### From Local Machine
```bash
psql postgresql://neondb_owner:password@localhost:5432/neondb
```

Requires: PostgreSQL client tools installed locally

## Troubleshooting

### Container Won't Start
```bash
# View detailed logs
./docker-start.sh logs

# Rebuild without cache
./docker-start.sh rebuild
```

### Database Connection Issues
```bash
# Check database health
docker-compose exec db pg_isready -U neondb_owner

# View database logs
docker-compose logs db
```

### SSL Certificate Issues
```bash
# View certbot logs
docker-compose logs certbot

# Check certificate files
ls -la ./certbot/conf/live/
```

### Out of Disk Space
```bash
# Clean up unused Docker resources
docker system prune -a

# Remove volumes (careful - deletes data!)
docker volume prune
```

## File Structure

```
.
├── docker-start.sh          # Linux/macOS startup script
├── docker-start.bat         # Windows startup script
├── Dockerfile               # Application container configuration
├── docker-compose.yml       # Multi-container orchestration
├── .dockerignore           # Files to exclude from container
├── .env.example            # Environment variables template
├── .env                    # Your actual environment (created by script)
├── nginx.conf              # Nginx configuration (create if needed)
├── certbot/                # SSL certificates directory (created)
│   ├── conf/              # Certificate configuration
│   └── www/               # Web root for ACME challenges
└── logs/                  # Application logs (created)
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` to version control
2. **Database Password**: Use strong, unique passwords
3. **SSL Certificates**: Automatically managed - keep domain pointing to server
4. **Firewall**: Only expose ports 80 and 443 publicly
5. **Database Access**: Only expose database internally (not to public)

## Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set valid `DOMAIN` for SSL certificates
- [ ] Configure `DATABASE_URL` for production database
- [ ] Set all API keys and secrets
- [ ] Run `./docker-start.sh up`
- [ ] Verify `http://localhost/api/ping` returns success
- [ ] Check logs for any errors
- [ ] Test application features
- [ ] Monitor health checks

## Updating Application

To deploy new changes:

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart
./docker-start.sh rebuild

# 3. Verify health
./docker-start.sh status
./docker-start.sh logs
```

## Performance Tuning

### Database
- Adjust memory limits in `docker-compose.yml`
- Use external managed database (Neon, AWS RDS) for production

### Application
- Monitor logs for performance issues
- Scale horizontally with additional app containers if needed

### Nginx
- Adjust worker processes in `nginx.conf`
- Enable caching for static assets

## Backup & Recovery

### Backup Database
```bash
docker-compose exec db pg_dump -U neondb_owner neondb > backup.sql
```

### Restore Database
```bash
docker-compose exec -T db psql -U neondb_owner neondb < backup.sql
```

### Backup Application Data
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz ./certbot ./logs
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

For issues or questions:
1. Check logs: `./docker-start.sh logs`
2. Review this guide
3. Check Docker/Docker Compose documentation
4. Review application-specific documentation

## Quick Reference

| Action | Command |
|--------|---------|
| Start | `./docker-start.sh up` |
| Stop | `./docker-start.sh down` |
| Logs | `./docker-start.sh logs` |
| Rebuild | `./docker-start.sh rebuild` |
| Status | `./docker-start.sh status` |
| Restart | `./docker-start.sh restart` |
| Clean All | `./docker-start.sh clean` |

---

**Last Updated**: March 2024  
**Version**: 1.0
