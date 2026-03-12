# CoinKrazy AI - Quick Start Deployment

## One-Command Setup (Recommended)

```bash
bash deploy.sh
```

This script will:
1. ✓ Check Docker/Docker Compose installation
2. ✓ Ask for your domain name
3. ✓ Create necessary directories
4. ✓ Configure environment variables
5. ✓ Set up Nginx
6. ✓ Start all containers
7. ✓ Generate initial SSL certificate

## Manual Setup (If preferred)

### Step 1: Clone the Repository
```bash
git clone https://github.com/coinkrazygaming/coinkrazyai-new26-green.git
cd coinkrazyai-new26-green
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your values (DATABASE_URL, VITE_PUBLIC_BUILDER_KEY, etc.)
nano .env
```

### Step 3: Create Directories
```bash
mkdir -p certbot/conf certbot/www logs ssl
```

### Step 4: Set Your Domain
```bash
# Replace "yourdomain.com" with your actual domain
sed -i 's/server_name _;/server_name yourdomain.com www.yourdomain.com;/g' nginx.conf
```

### Step 5: Generate Initial Certificate
```bash
mkdir -p certbot/conf/live/coinkrazy
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certbot/conf/live/coinkrazy/privkey.pem \
  -out certbot/conf/live/coinkrazy/fullchain.pem \
  -subj "/CN=yourdomain.com"
```

### Step 6: Start the Application
```bash
docker-compose up -d
```

### Step 7: Get Real SSL Certificate
Wait 30 seconds for services to start, then:

```bash
docker-compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

### Step 8: Reload Nginx
```bash
docker-compose exec nginx nginx -s reload
```

## Verify Installation

### Check if everything is running
```bash
docker-compose ps
```

### Test your domain
```bash
# HTTP redirect to HTTPS (should show redirect)
curl -v http://yourdomain.com

# HTTPS access (should work)
curl https://yourdomain.com
```

### View logs
```bash
docker-compose logs -f app
```

## What You Get

✓ **HTTPS/SSL** - Automatic encryption with Let's Encrypt
✓ **Nginx Reverse Proxy** - Professional-grade web server
✓ **Auto Renewal** - SSL certificates renew automatically
✓ **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
✓ **Rate Limiting** - DDoS protection
✓ **Gzip Compression** - Faster page loads
✓ **Health Checks** - Automatic service monitoring
✓ **GitHub Integration** - Automatic pulls from your repo

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# Restart app
docker-compose restart app

# Update from GitHub
docker-compose down
docker-compose up -d --build

# Check certificate expiration
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/coinkrazy/fullchain.pem -noout -dates

# Stop everything
docker-compose down
```

## DNS Configuration

After running the setup, point your domain DNS to your server:

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Create an A record pointing to your server's IP address
3. Example:
   - Type: A
   - Name: @ (or yourdomain.com)
   - Value: your.server.ip.address
   - TTL: 3600

**Wait 5-30 minutes for DNS to propagate**, then test with:
```bash
curl https://yourdomain.com/api/ping
```

## Troubleshooting

### Containers not starting?
```bash
docker-compose logs
```

### App crashes on startup?
```bash
docker-compose logs app
# Check if DATABASE_URL is set correctly in .env
```

### HTTPS certificate issues?
```bash
docker-compose logs certbot
# Verify domain DNS is pointing to your server
```

### Can't access the site?
1. Check firewall allows ports 80 and 443
2. Verify DNS is pointing to your server
3. Check Nginx logs: `docker-compose logs nginx`

## Need Help?

See the detailed guide: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

For Let's Encrypt issues: https://letsencrypt.org/docs/
