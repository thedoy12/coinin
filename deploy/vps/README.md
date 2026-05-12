# CoinIn VPS Deployment

Production VPS target:

- App fullstack runs on `127.0.0.1:3001` through `npm start`.
- Nginx proxies `coinin.store` and `www.coinin.store` to the app.
- Existing IP/default routes such as `/tripay/*` and Digiflazz proxy routes should remain untouched.

## One-Time VPS Setup

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
git clone https://github.com/thedoy12/coinin.git /var/www/coinin
cd /var/www/coinin
cp .env.example .env
nano .env
```

Required production env:

```env
APP_ID=coinin
APP_SECRET=use-a-long-random-secret-at-least-32-chars
DATABASE_URL=postgresql://...
VITE_APP_URL=https://coinin.store
TOPUP_API_URL=http://202.10.37.162
TOPUP_WEBHOOK_URL=https://coinin.store/api/provider-callback
PAYMENT_API_URL=http://202.10.37.162/tripay
PAYMENT_METHOD=QRIS2
```

Deploy:

```bash
bash deploy/vps/deploy.sh
```

Install Nginx host config:

```bash
sudo cp deploy/vps/nginx-coinin.conf /etc/nginx/sites-available/coinin
sudo ln -sf /etc/nginx/sites-available/coinin /etc/nginx/sites-enabled/coinin
sudo nginx -t
sudo systemctl reload nginx
```

Enable HTTPS:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d coinin.store -d www.coinin.store
```

## DNS

Point both records to the VPS:

```text
coinin.store      A      202.10.37.162
www.coinin.store  A      202.10.37.162
```

## Checks

```bash
curl http://127.0.0.1:3001/api/health
curl https://coinin.store/api/health
pm2 logs coinin
```

Tripay callback:

```text
https://coinin.store/api/callback
```

If the backend runs on this VPS, Tripay whitelist IP can be `202.10.37.162`.
