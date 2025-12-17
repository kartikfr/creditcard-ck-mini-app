// CashKaro API Service - Using Edge Function Proxy to bypass CORS
// 
// TOKEN TYPES:
// 1. GUEST TOKEN (offers, search scope) - Used for:
//    - /token (Basic Auth - no token needed)
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

import { supabase } from '@/integrations/supabase/client';

// Token refresh interval (10 minutes = 600000ms)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

// Token state
let currentGuestToken: string | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

// Helper to decode JWT and get expiration time
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
};

// Check if token is expired or about to expire (with 60s buffer)
const isTokenExpired = (token: string): boolean => {
  const exp = getTokenExpiration(token);
  if (!exp) return true;
  return Date.now() >= exp - 60000; // 60 second buffer before expiration
};

// Helper to call the proxy edge function
const callProxy = async (endpoint: string, method = 'GET', body?: any, accessToken?: string) => {
  console.log(`[API] Calling proxy: ${method} ${endpoint}`);
  console.log(`[API] Using token:`, accessToken ? 'Bearer token provided' : 'No token (will use Basic Auth for /token)');
  
  const { data, error } = await supabase.functions.invoke('cashkaro-proxy', {
    body: {
      endpoint,
      method,
      body,
      userAccessToken: accessToken,
    },
  });

  if (error) {
    console.error('[API] Proxy error:', error);
    throw new Error(error.message || 'API call failed');
  }

  // Handle API-level errors (edge fn now returns 200 with error in body)
  if (data?.error) {
    console.error('[API] API error:', data);
    // Extract user-friendly message from CashKaro error format
    const errors = data.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const firstError = errors[0];
      throw new Error(firstError.detail || firstError.title || 'API request failed');
    }
    throw new Error(typeof data.error === 'string' ? data.error : `API Error ${data.status}`);
  }

  return data;
};

// Generate initial access token
export const generateToken = async (): Promise<string> => {
  console.log('[API] Generating new guest token...');
  const data = await callProxy('/token', 'GET');
  // API returns 'token' not 'access_token'
  const token = data.data.attributes.token;
  console.log('[API] Guest token generated successfully:', token ? 'Token received' : 'No token');
  return token;
};

// Initialize and maintain guest token
export const initGuestToken = async (): Promise<string> => {
  if (!currentGuestToken || isTokenExpired(currentGuestToken)) {
    console.log('[API] Token missing or expired, generating new one...');
    currentGuestToken = await generateToken();
    startTokenRefresh();
  }
  return currentGuestToken;
};

// Force refresh guest token (useful before critical operations)
export const forceRefreshGuestToken = async (): Promise<string> => {
  console.log('[API] Force refreshing guest token...');
  currentGuestToken = await generateToken();
  return currentGuestToken;
};

// Start automatic token refresh
const startTokenRefresh = () => {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
  }

  tokenRefreshTimer = setInterval(async () => {
    console.log('[API] Auto-refreshing guest token (10 min interval)...');
    try {
      currentGuestToken = await generateToken();
      console.log('[API] Guest token refreshed successfully');
    } catch (error) {
      console.error('[API] Failed to refresh guest token:', error);
    }
  }, TOKEN_REFRESH_INTERVAL);

  console.log('[API] Token auto-refresh started (every 10 minutes)');
};

// Stop token refresh
export const stopTokenRefresh = () => {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
};

// Get current guest token (always checks expiration)
export const getGuestToken = async (): Promise<string> => {
  if (!currentGuestToken || isTokenExpired(currentGuestToken)) {
    console.log('[API] Guest token expired or missing, refreshing...');
    return initGuestToken();
  }
  return currentGuestToken;
};

// Get device type based on viewport
export const getDeviceType = (): string => {
  return typeof window !== 'undefined' && window.innerWidth > 1024 ? 'Desktop' : 'Mobile';
};

// Request OTP for login
export const requestOTP = async (mobileNumber: string, accessToken: string) => {
  return callProxy(
    '/loginotp?device=Desktop',
    'POST',
    {
      data: {
        type: 'user_otp',
        attributes: {
          // Send as string to avoid numeric precision/validation issues on upstream
          mobile_number: mobileNumber,
        },
      },
    },
    accessToken
  );
};

// Request OTP for new user sign-up
export const requestSignupOTP = async (mobileNumber: string, accessToken: string) => {
  return callProxy(
    '/signupotp',
    'POST',
    {
      data: {
        type: 'user_otp',
        attributes: {
          mobile_number: parseInt(mobileNumber),
        },
      },
    },
    accessToken
  );
};

// Complete sign-up with OTP verification
export const signupUser = async (
  fullname: string,
  email: string,
  mobileNumber: string,
  otpGuid: string,
  otp: string,
  accessToken: string
) => {
  return callProxy(
    '/signupV1?device=Desktop',
    'POST',
    {
      data: {
        type: 'auth',
        attributes: {
          fullname,
          email: email || '',
          password: '',
          mobile_number: parseInt(mobileNumber),
          otp_guid: otpGuid,
          otp: parseInt(otp),
          referral_user: null,
          ip_address: '0.0.0.0',
          device_info: {
            fcm_id: 'web_token_placeholder',
            device_unique_id: `web_${Date.now()}`,
            device_client: 'Web',
            app_version: '1.0',
            os_name: 'Web',
            device_country: 'IN',
            language: 'en',
          },
        },
      },
    },
    accessToken
  );
};

// Verify OTP and login
export const verifyOTPAndLogin = async (
  mobileNumber: string,
  otpGuid: string,
  otp: string,
  accessToken: string
) => {
  return callProxy(
    '/login?device=Desktop',
    'POST',
    {
      data: {
        type: 'auth',
        attributes: {
          mobile_number: mobileNumber,
          otp_guid: otpGuid,
          otp,
          device_info: {
            fcm_id: 'web_token_placeholder',
            device_unique_id: `web_${Date.now()}`,
            device_client: 'Web',
            app_version: '1.0',
            os_name: 'Web',
            device_country: 'IN',
            language: 'en',
          },
        },
      },
    },
    accessToken
  );
};

// Refresh access token (uses USER TOKEN)
// NOTE: CashKaro refresh endpoint expects the same device context as other auth calls.
export const refreshToken = async (refreshTokenStr: string, currentAccessToken: string) => {
  console.log('[API] refreshToken using user access token');
  return callProxy(
    '/refreshtoken?device=Desktop',
    'POST',
    {
      data: {
        type: 'auth',
        attributes: {
          refresh_token: refreshTokenStr,
        },
      },
    },
    currentAccessToken
  );
};

// Fetch dynamic homepage (uses GUEST TOKEN - offers scope)
// NOTE: Always use Desktop device type because Mobile API returns different structure without page_elements
export const fetchDynamicPage = async () => {
  const guestToken = await getGuestToken();
  console.log('[API] fetchDynamicPage using guest token');
  return callProxy(
    `/dynamicpage/api-homepage?device=Desktop&include=seo_content&filter[deal_card_type]=flash_site`,
    'GET',
    undefined,
    guestToken
  );
};

// Fetch category offers with pagination (uses GUEST TOKEN - offers scope)
export const fetchCategoryOffers = async (
  categoryPath: string = 'home-categories-exclusive/banking-finance-offers',
  pageNumber: number = 1,
  pageSize: number = 100,
  sort: string = 'Popularity'
) => {
  const guestToken = await getGuestToken();
  console.log(`[API] fetchCategoryOffers page=${pageNumber} size=${pageSize}`);
  return callProxy(
    `/offers/category/${categoryPath}?device=Desktop&sort=${sort}&page[number]=${pageNumber}&page[size]=${pageSize}`,
    'GET',
    undefined,
    guestToken
  );
};

// Fetch offer detail by unique_identifier (uses GUEST TOKEN - offers scope)
export const fetchOfferDetail = async (uniqueIdentifier: string) => {
  const guestToken = await getGuestToken();
  console.log(`[API] fetchOfferDetail: ${uniqueIdentifier}`);
  return callProxy(
    `/offers/${uniqueIdentifier}?device=Desktop`,
    'GET',
    undefined,
    guestToken
  );
};

// Fetch user earnings
export const fetchEarnings = async (accessToken: string) => {
  // Must match the upstream endpoint exactly
  return callProxy(
    '/users/earnings',
    'GET',
    undefined,
    accessToken
  );
};

// Fetch user orders with filters
export const fetchOrders = async (
  accessToken: string,
  pageNumber: number = 1,
  pageSize: number = 10,
  filters: {
    status?: string;
    cashbacktype?: string;
    fromdate?: string;
    todate?: string;
  } = {}
) => {
  const params = new URLSearchParams();
  params.set('page[number]', String(pageNumber));
  params.set('page[size]', String(pageSize));
  params.set('device', 'Desktop');
  
  if (filters.cashbacktype) {
    params.set('filter[cashbacktype]', filters.cashbacktype);
  }
  if (filters.fromdate) {
    params.set('filter[fromdate]', filters.fromdate);
  }
  if (filters.todate) {
    params.set('filter[todate]', filters.todate);
  }
  if (filters.status) {
    params.set('filter[status]', filters.status);
  }

  return callProxy(
    `/users/orders?${params.toString()}`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch single order detail
export const fetchOrderDetail = async (accessToken: string, orderId: string) => {
  return callProxy(
    `/users/orders/${orderId}?device=Desktop`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch missing cashback retailers
export const fetchMissingCashbackRetailers = async (accessToken: string, page = 1, size = 50) => {
  return callProxy(
    `/users/missingcashback/retailers?device=Desktop&page[number]=${page}&page[size]=${size}`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch exit click dates for a store
export const fetchExitClickDates = async (accessToken: string, storeId: string) => {
  return callProxy(
    `/users/missingcashback/exitclickdates/${storeId}`,
    'GET',
    undefined,
    accessToken
  );
};

// Validate missing cashback transaction
export const validateMissingCashback = async (
  accessToken: string,
  storeId: string,
  exitClickDate: string,
  orderId: string
) => {
  return callProxy('/users/missingcashback/validate', 'POST', {
    data: {
      type: 'missingcashback',
      attributes: {
        storeid: storeId,
        exitclick_date: exitClickDate,
        order_id: orderId,
      },
    },
  }, accessToken);
};

// Fetch missing cashback claims queue
// NOTE: The API requires a status filter - it doesn't support "all status"
export const fetchMissingCashbackQueue = async (
  accessToken: string,
  status: string = 'Pending', // "Pending", "Resolved", "Rejected" - REQUIRED by API
  page = 1,
  size = 10
) => {
  const params = new URLSearchParams();
  params.set('page[number]', String(page));
  params.set('page[size]', String(size));
  params.set('filter[status]', status);
  return callProxy(
    `/users/missingcashback/queue?${params.toString()}`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch payment info
export const fetchPaymentInfo = async (accessToken: string) => {
  const device = getDeviceType();
  return callProxy(
    `/payment/payment?device=${device}&include=charities`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch user profile
export const fetchProfile = async (accessToken: string) => {
  return callProxy(
    '/users/profile?include=partnerinfo',
    'GET',
    undefined,
    accessToken
  );
};

// Logout user
export const logoutUser = async (accessToken: string) => {
  const device = getDeviceType();
  return callProxy(`/users/logout?device=${device}`, 'POST', {
    data: {
      type: 'user',
      attributes: {
        fcm_id: 'web_token_placeholder',
        device_unique_id: `web_${Date.now()}`,
      },
    },
  }, accessToken);
};

// Send payment request OTP
export const sendPaymentRequestOTP = async (accessToken: string) => {
  return callProxy('/users/sendotp', 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        notification_name: 'PAYMENT_REQUEST_OTP',
      },
    },
  }, accessToken);
};

// Verify payment request OTP
export const verifyPaymentRequestOTP = async (accessToken: string, otpGuid: string, otp: string) => {
  return callProxy('/users/verify', 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        otp_guid: otpGuid,
        otp: parseInt(otp),
      },
    },
  }, accessToken);
};

// Submit Amazon Pay payment
export const submitAmazonPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'combined',
  mobile: string,
  otpGuid: string
) => {
  return callProxy('/payment/paymentV1?device=Desktop', 'POST', {
    data: {
      type: 'amazongiftcard',
      attributes: {
        payment_type: paymentType,
        payment_method_id: 12,
        mobile: parseInt(mobile),
        otp_guid: otpGuid,
      },
    },
  }, accessToken);
};

// Submit Flipkart Gift Card payment
export const submitFlipkartPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'combined',
  email: string,
  otpGuid: string
) => {
  return callProxy('/payment/paymentV1?device=Desktop', 'POST', {
    data: {
      type: 'flipkartgiftcard',
      attributes: {
        payment_type: paymentType,
        payment_method_id: '13',
        email: email,
        otp_guid: otpGuid,
      },
    },
  }, accessToken);
};

// Submit UPI payment
export const submitUPIPayment = async (
  accessToken: string,
  paymentType: 'cashback',
  upiId: string,
  otpGuid: string
) => {
  return callProxy('/payment/paymentV1?device=Desktop', 'POST', {
    data: {
      type: 'upi',
      attributes: {
        payment_type: paymentType,
        payment_method_id: '20',
        upi_id: upiId,
        otp_guid: otpGuid,
      },
    },
  }, accessToken);
};

// Submit Bank Transfer (IMPS) payment
export const submitBankPayment = async (
  accessToken: string,
  paymentType: 'cashback',
  ifscCode: string,
  accountHolderName: string,
  accountNumber: string,
  otpGuid: string
) => {
  return callProxy('/payment/paymentV1?device=Desktop', 'POST', {
    data: {
      type: 'imps',
      attributes: {
        payment_type: paymentType,
        payment_method_id: '18',
        ifsc_code: ifscCode,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        otp_guid: otpGuid,
      },
    },
  }, accessToken);
};

// Fetch payment history
export const fetchPaymentHistory = async (accessToken: string) => {
  return callProxy('/payment/history', 'GET', undefined, accessToken);
};

// Fetch all categories (uses GUEST TOKEN - offers scope)
export const fetchCategories = async (pageNumber: number = 1, pageSize: number = 1000) => {
  const guestToken = await getGuestToken();
  console.log(`[API] fetchCategories page=${pageNumber} size=${pageSize}`);
  return callProxy(
    `/offers/categories?device=Desktop&page[number]=${pageNumber}&page[size]=${pageSize}`,
    'GET',
    undefined,
    guestToken
  );
};

// Helper to extract endpoint path from full CashKaro URL
export const extractEndpointFromUrl = (fullUrl: string): string => {
  // From: https://ckapistaging.lmssecure.com/v1/offers/categories/flash-deal-category?device=Desktop
  // To: /offers/categories/flash-deal-category?device=Desktop
  const match = fullUrl.match(/\/v1(.+)/);
  return match ? match[1] : fullUrl;
};

// Fetch category details by URL (from links.self)
export const fetchCategoryByUrl = async (selfUrl: string) => {
  const endpoint = extractEndpointFromUrl(selfUrl);
  const guestToken = await getGuestToken();
  console.log(`[API] fetchCategoryByUrl: ${endpoint}`);
  return callProxy(endpoint, 'GET', undefined, guestToken);
};

// Fetch offers by URL (from links.offers)
export const fetchOffersByUrl = async (offersUrl: string, pageNumber: number = 1, pageSize: number = 50) => {
  let endpoint = extractEndpointFromUrl(offersUrl);
  // Add pagination if not already present
  if (!endpoint.includes('page[number]')) {
    endpoint += `&page[number]=${pageNumber}&page[size]=${pageSize}`;
  }
  const guestToken = await getGuestToken();
  console.log(`[API] fetchOffersByUrl: ${endpoint}`);
  return callProxy(endpoint, 'GET', undefined, guestToken);
};

// Fetch products by URL (from links.products)
export const fetchProductsByUrl = async (productsUrl: string, pageNumber: number = 1, pageSize: number = 50) => {
  let endpoint = extractEndpointFromUrl(productsUrl);
  // Add pagination if not already present
  if (!endpoint.includes('page[number]')) {
    endpoint += `&page[number]=${pageNumber}&page[size]=${pageSize}`;
  }
  const guestToken = await getGuestToken();
  console.log(`[API] fetchProductsByUrl: ${endpoint}`);
  return callProxy(endpoint, 'GET', undefined, guestToken);
};

// Fetch category by slug path (e.g., "flash-deal-category" or "voucher-deals/welcome-offers")
export const fetchCategoryBySlug = async (slugPath: string) => {
  const guestToken = await getGuestToken();
  console.log(`[API] fetchCategoryBySlug: ${slugPath}`);
  return callProxy(
    `/offers/categories/${slugPath}?device=Desktop`,
    'GET',
    undefined,
    guestToken
  );
};

// Fetch offers for a category by slug path
export const fetchCategoryOffersBySlug = async (
  slugPath: string,
  pageNumber: number = 1,
  pageSize: number = 50
) => {
  const guestToken = await getGuestToken();
  console.log(`[API] fetchCategoryOffersBySlug: ${slugPath}`);
  return callProxy(
    `/offers/category/${slugPath}?device=Desktop&page[number]=${pageNumber}&page[size]=${pageSize}`,
    'GET',
    undefined,
    guestToken
  );
};
