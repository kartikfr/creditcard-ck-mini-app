import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// TOKEN TYPES:
// 1. GUEST TOKEN (offers, search, products, helper scope) - Used for:
//    - /token (Basic Auth - generates guest token)
//    - /loginotp (uses guest token)
//    - /login (uses guest token)
//    - /dynamicpage (uses guest token)
//
// 2. USER TOKEN (user-specific scope) - Used for:
//    - /users/earnings
//    - /users/profile
//    - /users/missingcashback/*
//    - /payment/*
//    - /refreshtoken

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHKARO_CONFIG = {
  BASE_URL: 'https://ckapistaging.lmssecure.com/v1',
  API_KEY: '73pfe492u249d76n6o6k25dy2mqp58c1',
  AUTH_HEADER: 'Basic c3RhZ2luZ2Nrd2ViYXBpOk1uS0xsYm82V3NUcVRKNFI=',
  APP_VERSION: '4.6',
};

// Helper to create multipart form data boundary
const generateBoundary = (): string => {
  return `----FormBoundary${Date.now()}${Math.random().toString(36).substring(2)}`;
};

// Helper to decode base64 string to Uint8Array with validation
const base64ToUint8Array = (base64: string): Uint8Array => {
  // Remove any data URL prefix if present (e.g., "data:image/png;base64,")
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Validate base64 string
  if (!cleanBase64 || cleanBase64.length === 0) {
    console.error('[CashKaro Proxy] Empty base64 data received');
    return new Uint8Array(0);
  }
  
  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleanBase64)) {
    console.error('[CashKaro Proxy] Invalid base64 characters detected');
  }
  
  try {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Log first few bytes for magic number verification
    if (bytes.length > 4) {
      const magicBytes = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[CashKaro Proxy] File magic bytes: ${magicBytes}`);
    }
    
    return bytes;
  } catch (error) {
    console.error('[CashKaro Proxy] Failed to decode base64:', error);
    return new Uint8Array(0);
  }
};

// Helper to create multipart form data body
const createMultipartBody = (
  formFields: Record<string, string>,
  files: Array<{ name: string; data: string; filename: string; contentType: string }>,
  boundary: string
): Uint8Array => {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  
  // Add form fields
  for (const [key, value] of Object.entries(formFields)) {
    const fieldPart = `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`;
    parts.push(encoder.encode(fieldPart));
  }
  
  // Add file fields
  for (const file of files) {
    console.log(`[CashKaro Proxy] Processing file: ${file.filename}, type: ${file.contentType}, data length: ${file.data.length}`);
    
    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`;
    parts.push(encoder.encode(headerPart));
    
    // Decode base64 to binary using helper
    const fileBytes = base64ToUint8Array(file.data);
    console.log(`[CashKaro Proxy] Decoded file size: ${fileBytes.length} bytes`);
    parts.push(fileBytes);
    parts.push(encoder.encode('\r\n'));
  }
  
  // Add closing boundary
  parts.push(encoder.encode(`--${boundary}--\r\n`));
  
  // Combine all parts
  const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  console.log(`[CashKaro Proxy] Total multipart body size: ${result.length} bytes`);
  return result;
};

// Retry helper for transient CloudFront 403 errors
const isCloudFront403 = (status: number, responseText: string): boolean => {
  return status === 403 && responseText.includes('cloudfront');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = 'GET', body, userAccessToken, isMultipart, formFields, files } = await req.json();

    console.log(`[CashKaro Proxy] ${method} ${endpoint}`);
    console.log(`[CashKaro Proxy] Request body:`, JSON.stringify(body, null, 2));
    console.log(`[CashKaro Proxy] Has userAccessToken:`, !!userAccessToken);
    console.log(`[CashKaro Proxy] Is multipart:`, !!isMultipart);

    // Enhanced logging for payment submissions
    if (endpoint.includes('/payment/paymentV1')) {
      const paymentMethodId = body?.data?.attributes?.payment_method_id;
      console.log(`[CashKaro Proxy] Payment submission details:`, {
        type: body?.data?.type,
        payment_method_id: paymentMethodId,
        payment_method_id_typeof: typeof paymentMethodId,
        payment_type: body?.data?.attributes?.payment_type,
      });
    }

    // Build the full URL
    const url = `${CASHKARO_CONFIG.BASE_URL}${endpoint}`;

    // Build headers - Use different profiles for JSON vs multipart to avoid WAF triggers
    const headers: Record<string, string> = {
      'x-api-key': CASHKARO_CONFIG.API_KEY,
      'x-chkr-app-version': CASHKARO_CONFIG.APP_VERSION,
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
    };

    // For multipart uploads: use mobile-app-like headers and AVOID Origin/Referer
    // For JSON requests: use standard browser headers
    if (isMultipart) {
      // Mobile app profile - less likely to trigger WAF bot rules
      headers['Accept'] = '*/*';
      headers['Accept-Encoding'] = 'gzip, deflate';
      headers['User-Agent'] = 'CashKaro/4.6 (Android 13; SM-G998B; Build/TP1A.220624.014)';
      console.log(`[CashKaro Proxy] Using mobile-app header profile for multipart upload`);
    } else {
      // Standard JSON profile
      headers['Accept'] = 'application/vnd.api+json';
      headers['Accept-Encoding'] = 'gzip, deflate';
      headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';
      console.log(`[CashKaro Proxy] Using standard header profile for JSON request`);
    }

    // Determine authorization strategy based on endpoint
    if (endpoint === '/token') {
      headers['Authorization'] = CASHKARO_CONFIG.AUTH_HEADER;
      console.log(`[CashKaro Proxy] Using Basic Auth for /token endpoint`);
    } else if (userAccessToken) {
      headers['Authorization'] = `Bearer ${userAccessToken}`;
      console.log(`[CashKaro Proxy] Using Bearer token for ${endpoint}`);
    } else {
      console.warn(`[CashKaro Proxy] WARNING: No token provided for ${endpoint} - this may fail`);
    }

    let requestBody: BodyInit | null = null;
    let multipartData: Uint8Array | null = null;
    
    // Handle multipart form data for file uploads
    if (isMultipart && formFields) {
      const boundary = generateBoundary();
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      
      console.log(`[CashKaro Proxy] Processing ${files?.length || 0} files for multipart upload`);
      console.log(`[CashKaro Proxy] Form fields:`, JSON.stringify(Object.keys(formFields)));
      
      multipartData = createMultipartBody(formFields, files || [], boundary);
      
      // Convert Uint8Array to ArrayBuffer for proper BodyInit type
      // Use explicit type assertion since slice may return SharedArrayBuffer in some runtimes
      requestBody = new Uint8Array(multipartData).buffer as ArrayBuffer;
      headers['Content-Length'] = String(multipartData.byteLength);
      
      console.log(`[CashKaro Proxy] Created multipart body with ${files?.length || 0} files, size: ${multipartData.byteLength} bytes`);
      console.log(`[CashKaro Proxy] Content-Length header set to: ${multipartData.byteLength}`);
      
      console.log(`[CashKaro Proxy] Created multipart body with ${files?.length || 0} files, size: ${multipartData.byteLength} bytes`);
      console.log(`[CashKaro Proxy] Content-Length header set to: ${multipartData.byteLength}`);
    } else if (body) {
      headers['Content-Type'] = 'application/vnd.api+json';
      requestBody = JSON.stringify(body);
    }

    console.log(`[CashKaro Proxy] Making request to: ${url}`);
    console.log(`[CashKaro Proxy] Authorization type:`, headers['Authorization']?.split(' ')[0] || 'None');
    console.log(`[CashKaro Proxy] Headers being sent:`, Object.keys(headers).join(', '));

    // Retry logic for transient CloudFront 403 errors
    const MAX_RETRIES = 2;
    let lastResponse: Response | null = null;
    let lastResponseText = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoffMs = attempt * 1000; // 1s, 2s
        console.log(`[CashKaro Proxy] Retry attempt ${attempt}/${MAX_RETRIES} after ${backoffMs}ms backoff`);
        await sleep(backoffMs);
      }

      // Make the request to CashKaro API
      lastResponse = await fetch(url, {
        method,
        headers,
        body: requestBody,
      });

      lastResponseText = await lastResponse.text();
      console.log(`[CashKaro Proxy] Response status: ${lastResponse.status} (attempt ${attempt + 1})`);
      console.log(`[CashKaro Proxy] Response body: ${lastResponseText.substring(0, 500)}`);

      // Log response headers for debugging
      const respHeaders: Record<string, string> = {};
      lastResponse.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });
      console.log(`[CashKaro Proxy] Response headers:`, JSON.stringify(respHeaders));

      // If it's not a transient CloudFront 403, break immediately
      if (!isCloudFront403(lastResponse.status, lastResponseText)) {
        break;
      }

      console.warn(`[CashKaro Proxy] CloudFront 403 detected, will retry...`);
    }

    let data;
    try {
      data = JSON.parse(lastResponseText);
    } catch {
      // If it's HTML (like CloudFront error page), wrap it
      data = { raw: lastResponseText };
    }

    // Always return 200 from the edge function so client can read error details
    if (!lastResponse!.ok) {
      console.error(`[CashKaro Proxy] API Error: ${lastResponse!.status}`, data);
      
      // Provide user-friendly message for CloudFront blocks
      const isCloudFrontBlock = isCloudFront403(lastResponse!.status, lastResponseText);
      
      return new Response(JSON.stringify({ 
        error: true, 
        status: lastResponse!.status,
        data,
        isCloudFrontBlock,
        userMessage: isCloudFrontBlock 
          ? 'Upload failed due to network security. Please try again in a minute or switch networks.'
          : undefined,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[CashKaro Proxy] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: errorStack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
