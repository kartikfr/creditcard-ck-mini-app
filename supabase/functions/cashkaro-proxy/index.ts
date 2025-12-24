import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`;
    parts.push(encoder.encode(headerPart));
    
    // Decode base64 to binary
    const binaryString = atob(file.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    parts.push(bytes);
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
  
  return result;
};

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

    // Build the full URL
    const url = `${CASHKARO_CONFIG.BASE_URL}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.api+json',
      'x-api-key': CASHKARO_CONFIG.API_KEY,
      'x-chkr-app-version': CASHKARO_CONFIG.APP_VERSION,
    };

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

    let requestBody: BodyInit | undefined;
    
    // Handle multipart form data for file uploads
    if (isMultipart && formFields) {
      const boundary = generateBoundary();
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      const multipartData = createMultipartBody(formFields, files || [], boundary);
      requestBody = multipartData.buffer.slice(multipartData.byteOffset, multipartData.byteOffset + multipartData.byteLength) as ArrayBuffer;
      console.log(`[CashKaro Proxy] Created multipart body with ${files?.length || 0} files`);
    } else if (body) {
      headers['Content-Type'] = 'application/vnd.api+json';
      requestBody = JSON.stringify(body);
    }

    console.log(`[CashKaro Proxy] Making request to: ${url}`);
    console.log(`[CashKaro Proxy] Authorization type:`, headers['Authorization']?.split(' ')[0] || 'None');

    // Make the request to CashKaro API
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    const responseText = await response.text();
    console.log(`[CashKaro Proxy] Response status: ${response.status}`);
    console.log(`[CashKaro Proxy] Response body: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // Always return 200 from the edge function so client can read error details
    if (!response.ok) {
      console.error(`[CashKaro Proxy] API Error: ${response.status}`, data);
      return new Response(JSON.stringify({ 
        error: true, 
        status: response.status,
        data 
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
