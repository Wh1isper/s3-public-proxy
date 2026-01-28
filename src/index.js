/**
 * S3 Public Proxy Worker
 * 
 * Proxies requests to an S3 bucket using read-only credentials.
 * Implements AWS Signature V4 for authentication.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only allow GET and HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Build S3 URL
      const s3Path = url.pathname === '/' ? '' : url.pathname;
      const s3Url = `https://${env.S3_ENDPOINT}/${env.S3_BUCKET}${s3Path}${url.search}`;

      // Sign and send request
      const signedRequest = await signRequest(s3Url, request.method, env);
      const response = await fetch(signedRequest);

      // Add CORS and cache headers
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=86400');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};

/**
 * Sign request using AWS Signature V4
 */
async function signRequest(s3Url, method, env) {
  const url = new URL(s3Url);
  const host = url.host;

  // Generate timestamp
  const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = datetime.slice(0, 8);

  const region = env.S3_REGION || 'us-east-1';
  const service = 's3';

  // Build canonical request
  const canonicalUri = url.pathname || '/';

  const params = new URLSearchParams(url.search);
  const sortedParams = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQueryString = sortedParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:UNSIGNED-PAYLOAD`,
    `x-amz-date:${datetime}`,
  ].join('\n') + '\n';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // Build string to sign
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    scope,
    await sha256(canonicalRequest),
  ].join('\n');

  // Calculate signature
  const signingKey = await getSigningKey(env.S3_SECRET_KEY, date, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  // Build authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Request(s3Url, {
    method,
    headers: {
      'Host': host,
      'x-amz-date': datetime,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'Authorization': authorization,
    },
  });
}

/**
 * Calculate SHA-256 hash
 */
async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate HMAC-SHA256
 */
async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * Calculate HMAC-SHA256 and return hex string
 */
async function hmacHex(key, message) {
  const sig = await hmac(key, message);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive signing key for AWS Signature V4
 */
async function getSigningKey(secretKey, date, region, service) {
  const kDate = await hmac('AWS4' + secretKey, date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, 'aws4_request');
}
