import crypto from 'crypto';

function sha256(string) {
  return crypto.createHash('sha256').update(string, 'utf8').digest();
}

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

function getB2HostAndEndpoint(bucket, key) {
  const endpointEnv = process.env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
  const endpointUrl = new URL(endpointEnv);
  const host = endpointUrl.host;
  const endpoint = `${endpointEnv}/${bucket}/${key}`;
  return { host, endpoint };
}

function getB2Region() {
  const endpointEnv = process.env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
  try {
    const endpointUrl = new URL(endpointEnv);
    const hostParts = endpointUrl.host.split('.');
    if (hostParts.length >= 2 && hostParts[1] !== 'backblazeb2') {
      return hostParts[1];
    }
  } catch (e) {
    // ignore
  }
  return process.env.B2_REGION || 'us-west-004';
}

export async function uploadToB2(bucket, key, fileBuffer, mimeType) {
  const accessKey = process.env.B2_KEY_ID;
  const secretKey = process.env.B2_APPLICATION_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error("Backblaze B2 credentials are not configured in environment variables.");
  }
  
  const { host, endpoint } = getB2HostAndEndpoint(bucket, key);
  
  const method = 'PUT';
  const region = getB2Region();
  const service = 's3';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  const headers = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'content-type': mimeType,
    'content-length': fileBuffer.length.toString()
  };
  
  const canonicalUri = '/' + `${bucket}/${key}`.split('/').map(encodeURIComponent).join('/');
  const canonicalQuery = '';
  
  const canonicalHeaders = Object.keys(headers).sort()
    .map(k => `${k}:${headers[k].trim()}\n`).join('');
    
  const signedHeaders = Object.keys(headers).sort().join(';');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const credentialScope = [dateStamp, region, service, 'aws4_request'].join('/');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const fetchHeaders = {
    ...headers,
    'Authorization': authHeader
  };
  
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: fetchHeaders,
    body: new Uint8Array(fileBuffer)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`B2 upload failed: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  return endpoint;
}

export function getSignedUrlB2(bucket, key, expiresIn = 300) {
  const accessKey = process.env.B2_KEY_ID;
  const secretKey = process.env.B2_APPLICATION_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error("Backblaze B2 credentials are not configured in environment variables.");
  }
  
  const { host, endpoint } = getB2HostAndEndpoint(bucket, key);
  const region = getB2Region();
  const service = 's3';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = [dateStamp, region, service, 'aws4_request'].join('/');
  
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  };
  
  const sortedQueryKeys = Object.keys(queryParams).sort();
  const canonicalQuery = sortedQueryKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
  
  const canonicalUri = '/' + `${bucket}/${key}`.split('/').map(encodeURIComponent).join('/');
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function deleteFromB2(bucket, key) {
  const accessKey = process.env.B2_KEY_ID;
  const secretKey = process.env.B2_APPLICATION_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error("Backblaze B2 credentials are not configured in environment variables.");
  }
  
  const { host, endpoint } = getB2HostAndEndpoint(bucket, key);
  
  const method = 'DELETE';
  const region = getB2Region();
  const service = 's3';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  
  const headers = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };
  
  const canonicalUri = '/' + `${bucket}/${key}`.split('/').map(encodeURIComponent).join('/');
  const canonicalQuery = '';
  
  const canonicalHeaders = Object.keys(headers).sort()
    .map(k => `${k}:${headers[k].trim()}\n`).join('');
    
  const signedHeaders = Object.keys(headers).sort().join(';');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const credentialScope = [dateStamp, region, service, 'aws4_request'].join('/');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const fetchHeaders = {
    ...headers,
    'Authorization': authHeader
  };
  
  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: fetchHeaders
  });
  
  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`B2 delete failed: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  return true;
}
