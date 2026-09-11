import { createSign } from 'node:crypto';
import { appendFileSync } from 'node:fs';

// Exchange a signed JWT directly, as documented by Chrome Web Store.
// This avoids requiring the separate IAM Credentials API and impersonation roles.
const key = JSON.parse(process.env.CWS_SERVICE_ACCOUNT_JSON ?? '{}');
if (key.type !== 'service_account' || !key.client_email || !key.private_key) {
  throw new Error('Invalid CWS service account JSON');
}
const output = process.env.GITHUB_OUTPUT;
if (!output) throw new Error('Missing GITHUB_OUTPUT');
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
  iss: key.client_email,
  scope: 'https://www.googleapis.com/auth/chromewebstore',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
})}`;
const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  signal: AbortSignal.timeout(30_000),
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${unsigned}.${signature}`,
  }),
});
if (!response.ok) throw new Error(`Google token exchange failed: HTTP ${response.status}`);
const result = await response.json() as { access_token?: string };
const token = result.access_token;
if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) {
  throw new Error('Google returned an invalid access token');
}
console.log(`::add-mask::${token}`);
appendFileSync(output, `access_token=${token}\n`);
