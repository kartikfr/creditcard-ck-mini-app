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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = 'GET', body, userAccessToken } = await req.json();

    console.log(`[CashKaro Proxy] ${method} ${endpoint}`);
    console.log(`[CashKaro Proxy] Request body:`, JSON.stringify(body, null, 2));
    console.log(`[CashKaro Proxy] Has userAccessToken:`, !!userAccessToken);

    // Build the full URL
    const url = `${CASHKARO_CONFIG.BASE_URL}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'x-api-key': CASHKARO_CONFIG.API_KEY,
      'x-chkr-app-version': CASHKARO_CONFIG.APP_VERSION,
    };

    // Determine authorization strategy based on endpoint
    if (endpoint === '/token') {
      // Token generation always uses Basic Auth
      headers['Authorization'] = CASHKARO_CONFIG.AUTH_HEADER;
      console.log(`[CashKaro Proxy] Using Basic Auth for /token endpoint`);
    } else if (userAccessToken) {
      // All other endpoints use Bearer token (either guest or user token)
      headers['Authorization'] = `Bearer ${userAccessToken}`;
      console.log(`[CashKaro Proxy] Using Bearer token for ${endpoint}`);
    } else {
      console.warn(`[CashKaro Proxy] WARNING: No token provided for ${endpoint} - this may fail`);
    }

    console.log(`[CashKaro Proxy] Making request to: ${url}`);
    console.log(`[CashKaro Proxy] Authorization type:`, headers['Authorization']?.split(' ')[0] || 'None');

    // Make the request to CashKaro API
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
    // (Supabase throws before we can read body on non-2xx status)
    if (!response.ok) {
      console.error(`[CashKaro Proxy] API Error: ${response.status}`, data);
      return new Response(JSON.stringify({ 
        error: true, 
        status: response.status,
        data 
      }), {
        status: 200, // Return 200 so client can read error details
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
