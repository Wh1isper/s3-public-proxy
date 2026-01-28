# S3 Public Proxy

Cloudflare Worker that proxies requests to an S3-compatible bucket using read-only credentials. Useful for serving private S3 content through Cloudflare's CDN.

## Features

- AWS Signature V4 authentication
- CORS headers enabled
- Cache-Control headers (24 hours)
- Supports GET and HEAD requests only
- Works with any S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure secrets

Set the following secrets via Cloudflare dashboard or wrangler CLI:

```bash
wrangler secret put S3_ENDPOINT
wrangler secret put S3_BUCKET
wrangler secret put S3_ACCESS_KEY
wrangler secret put S3_SECRET_KEY
wrangler secret put S3_REGION  # Optional, defaults to us-east-1
```

**Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3 endpoint (without protocol) | `s3.amazonaws.com` or `xxx.r2.cloudflarestorage.com` |
| `S3_BUCKET` | Bucket name | `my-bucket` |
| `S3_ACCESS_KEY` | Access key ID | `AKIAXXXXXXXX` |
| `S3_SECRET_KEY` | Secret access key | `xxxxxxxx` |
| `S3_REGION` | AWS region (optional) | `us-east-1` |

### 3. Deploy

```bash
npm run deploy
```

## Development

```bash
# Create .dev.vars file for local secrets
echo "S3_ENDPOINT=your-endpoint" >> .dev.vars
echo "S3_BUCKET=your-bucket" >> .dev.vars
echo "S3_ACCESS_KEY=your-key" >> .dev.vars
echo "S3_SECRET_KEY=your-secret" >> .dev.vars

# Start local development server
npm run dev
```

## Usage

Once deployed, access your S3 objects via the Worker URL:

```
https://your-worker.your-subdomain.workers.dev/path/to/object.jpg
```

## Security Notes

- Use read-only credentials for the S3 bucket
- Consider adding authentication if needed
- Review CORS settings based on your requirements

## License

MIT
