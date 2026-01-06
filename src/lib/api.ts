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

// Fetch OTP from generator API (for testing/development)
export const fetchOTPFromGenerator = async (mobileNumber: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('otp-generator', {
      body: { mobile: mobileNumber },
    });

    if (error) {
      console.error('[API] OTP Generator error:', error);
      return null;
    }

    if (data?.status === 'Success' && data?.message) {
      return data.message;
    }

    return null;
  } catch (err) {
    console.error('[API] Failed to fetch OTP from generator:', err);
    return null;
  }
};

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

// Custom error class to preserve API error details including meta
export class APIError extends Error {
  code?: string;
  title?: string;
  detail?: string;
  meta?: Record<string, any>;

  constructor(message: string, errorData?: { code?: string; title?: string; detail?: string; meta?: Record<string, any> }) {
    super(message);
    this.name = 'APIError';
    this.code = errorData?.code;
    this.title = errorData?.title;
    this.detail = errorData?.detail;
    this.meta = errorData?.meta;
  }
}

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
      // Throw APIError with full error details including meta
      throw new APIError(
        firstError.detail || firstError.title || 'API request failed',
        {
          code: firstError.code,
          title: firstError.title,
          detail: firstError.detail,
          meta: firstError.meta,
        }
      );
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

// Fetch a single missing cashback queue item by ID
// Used after submission to get full claim details including exit_id
export const fetchMissingCashbackQueueItem = async (
  accessToken: string,
  queueId: string
): Promise<Claim | null> => {
  console.log('[API] fetchMissingCashbackQueueItem - fetching queue item:', queueId);
  
  try {
    // Try to find the item in the Pending queue
    const pendingResponse = await fetchMissingCashbackQueue(accessToken, 'Pending', 1, 50);
    const pendingClaims = pendingResponse?.data || [];
    const foundInPending = pendingClaims.find((claim: any) => String(claim.id) === String(queueId));
    
    if (foundInPending) {
      console.log('[API] Found queue item in Pending:', foundInPending.id);
      return foundInPending;
    }
    
    // If not found in Pending, check Resolved
    const resolvedResponse = await fetchMissingCashbackQueue(accessToken, 'Resolved', 1, 50);
    const resolvedClaims = resolvedResponse?.data || [];
    const foundInResolved = resolvedClaims.find((claim: any) => String(claim.id) === String(queueId));
    
    if (foundInResolved) {
      console.log('[API] Found queue item in Resolved:', foundInResolved.id);
      return foundInResolved;
    }
    
    console.log('[API] Queue item not found in Pending or Resolved');
    return null;
  } catch (error) {
    console.error('[API] Failed to fetch queue item:', error);
    return null;
  }
};

// Type for queue claim (matches the Claim interface in MissingCashback.tsx)
interface Claim {
  id: string;
  type: string;
  attributes: {
    callback_id?: number;
    ticket_id?: string | null;
    cashback_id?: number;
    store_id?: number;
    exit_id?: string;
    click_date?: string;
    order_id: string;
    order_amount?: string;
    details?: string;
    comments?: string | null;
    status: string;
    user_type?: string;
    category?: string;
    notification_count?: number;
    report_storename?: string;
    imageurl?: string;
    store_name?: string;
    merchant_name?: string;
    image_url?: string;
    ticket_comments?: string | null;
    cashbackvalue?: string;
    ticket_status?: string | null;
    groupid?: string;
    cashback_type?: string;
    under_tracking?: string;
    status_update?: string;
    expected_resolution_date?: string;
    missing_txn_cashback_type?: string;
    missing_txn_cashback?: string;
  };
}

// Submit missing cashback to queue (after validation passes)
export const submitMissingCashbackQueue = async (
  accessToken: string,
  storeId: string,
  exitClickDate: string,
  orderId: string,
  orderAmount: string
) => {
  return callProxy('/users/missingcashback/queue', 'POST', {
    data: {
      type: 'missingcashback',
      attributes: {
        storeid: storeId,
        exitclick_date: exitClickDate,
        order_id: orderId,
        order_amount: orderAmount,
      },
    },
  }, accessToken);
};

// Add additional details to missing cashback queue (for B1/C1 groups)
// B1 requires: user_type (New/Existing)
// C1 validation expects: category (lowercase) — docs sometimes mention "Category"
export const updateMissingCashbackQueue = async (
  accessToken: string,
  queueId: string,
  additionalDetails: {
    user_type?: string;
    category?: string;
  }
) => {
  console.log('[API] updateMissingCashbackQueue - PUT request:', { queueId, additionalDetails });

  const attributes: Record<string, string> = {};

  if (additionalDetails.user_type) attributes.user_type = additionalDetails.user_type;
  if (additionalDetails.category) attributes.category = additionalDetails.category;

  console.log('[API] Final attributes being sent:', attributes);

  return callProxy(
    `/users/missingcashback/queue/${queueId}`,
    'PUT',
    {
      data: {
        type: 'queue',
        attributes,
      },
    },
    accessToken
  );
};

// Raise a ticket from order detail page
export const raiseTicket = async (
  accessToken: string,
  exitClickDate: string,
  storeId: string,
  exitId: string,
  ticketData: {
    transaction_id: string;
    total_amount_paid?: number; // Optional - only include if has valid value
    coupon_code_used?: string;
    transaction_details?: string;
    missing_txn_queue_id?: number;
    query_type?: string;
    query_sub_type?: string;
    cashback_id?: number;
  },
  files?: Array<{ name: string; data: string; filename: string; contentType: string }>
) => {
  // Build form fields for multipart request
  const formFields: Record<string, string> = {
    transaction_id: ticketData.transaction_id,
  };
  
  // Only add total_amount_paid if it's a valid positive number
  if (ticketData.total_amount_paid && ticketData.total_amount_paid > 0) {
    formFields.total_amount_paid = String(ticketData.total_amount_paid);
  }
  
  if (ticketData.coupon_code_used) {
    formFields.coupon_code_used = ticketData.coupon_code_used;
  }
  if (ticketData.transaction_details) {
    formFields.transaction_details = ticketData.transaction_details;
  }
  if (ticketData.missing_txn_queue_id) {
    formFields.missing_txn_queue_id = String(ticketData.missing_txn_queue_id);
  }
  if (ticketData.query_type) {
    formFields.type = ticketData.query_type;
  }
  if (ticketData.query_sub_type) {
    formFields.sub_type = ticketData.query_sub_type;
  }
  if (ticketData.cashback_id) {
    formFields.cashback_id = String(ticketData.cashback_id);
  }

  console.log('[API] raiseTicket called:', {
    endpoint: `/users/tickets/${exitClickDate}/${storeId}/${exitId}`,
    formFields,
    hasFiles: files && files.length > 0,
    filesCount: files?.length || 0,
  });

  // If we have files, use multipart form data
  if (files && files.length > 0) {
    // Validate files before sending
    for (const file of files) {
      if (!file.data || file.data.length === 0) {
        console.error('[API] Invalid file data - empty base64 for:', file.filename);
        throw new Error(`Invalid file: ${file.filename} - empty data`);
      }
      
      // Check for data URL prefix that shouldn't be there
      if (file.data.includes('data:')) {
        console.warn('[API] File data contains data URL prefix, this should have been stripped:', file.filename);
      }
      
      // Log file details for debugging
      console.log(`[API] File validation passed: ${file.filename}, type: ${file.contentType}, base64 length: ${file.data.length}`);
    }
    
    console.log('[API] Using multipart form data for ticket with files');
    const { data, error } = await supabase.functions.invoke('cashkaro-proxy', {
      body: {
        endpoint: `/users/tickets/${exitClickDate}/${storeId}/${exitId}`,
        method: 'POST',
        userAccessToken: accessToken,
        isMultipart: true,
        formFields,
        files,
      },
    });

    console.log('[API] Multipart response:', { data, error });

    if (error) {
      console.error('[API] Proxy error:', error);
      throw new Error(error.message || 'API call failed');
    }

    if (data?.error) {
      // Check for CloudFront block and show user-friendly message
      if (data.isCloudFrontBlock && data.userMessage) {
        throw new Error(data.userMessage);
      }
      
      const errors = data.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        throw new Error(errors[0].detail || errors[0].title || 'API request failed');
      }
      throw new Error(typeof data.error === 'string' ? data.error : `API Error ${data.status}`);
    }

    return data;
  }

  // No files, use regular JSON request with data wrapper
  console.log('[API] Using JSON request for ticket without files');
  return callProxy(
    `/users/tickets/${exitClickDate}/${storeId}/${exitId}`,
    'POST',
    {
      data: {
        type: 'ticket',
        attributes: {
          transaction_id: ticketData.transaction_id,
          ...(ticketData.total_amount_paid && ticketData.total_amount_paid > 0 ? { total_amount_paid: ticketData.total_amount_paid } : {}),
          ...(ticketData.coupon_code_used ? { coupon_code_used: ticketData.coupon_code_used } : {}),
          ...(ticketData.transaction_details ? { transaction_details: ticketData.transaction_details } : {}),
          ...(ticketData.missing_txn_queue_id ? { missing_txn_queue_id: ticketData.missing_txn_queue_id } : {}),
          ...(ticketData.query_type ? { type: ticketData.query_type } : {}),
          ...(ticketData.query_sub_type ? { sub_type: ticketData.query_sub_type } : {}),
          ...(ticketData.cashback_id ? { cashback_id: ticketData.cashback_id } : {}),
        },
      },
    },
    accessToken
  );
};

// Fetch payment info - includes paymentautomation=true for automation-enabled payment methods
export const fetchPaymentInfo = async (accessToken: string) => {
  const device = getDeviceType();
  return callProxy(
    `/payment/payment?device=${device}&paymentautomation=true&include=charities`,
    'GET',
    undefined,
    accessToken
  );
};

// Payment API Response Types
export interface PaymentInfoAttributes {
  mobile: string;
  total_earnings: string;
  cashback_earnings: string;
  rewards_earnings: string;
  currency_code: string;
  payment_threshold: string;
}

export interface PaymentMethodAttributes {
  payment_name: string;
  payment_type: string;
  payment_user_info?: {
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    email?: string;
    branch?: string;
    sort_code?: string;
  };
}

export interface PaymentInfoResponse {
  data: {
    type: string;
    id: number;
    attributes: PaymentInfoAttributes;
    relationships?: {
      payment_methods?: {
        data: Array<{
          type: string;
          id: number;
          attributes: PaymentMethodAttributes;
        }>;
      };
      user_default_rewards_payment_method_details?: {
        data: object | null;
      };
      user_default_cashback_payment_method_details?: {
        data: object | null;
      };
    };
  };
  included?: Array<{
    type: string;
    id: number;
    attributes: {
      name: string;
      unique_identifier: string;
    };
  }>;
}

// Extract payment data from Payment API response
export const extractPaymentData = (paymentInfo: any) => {
  const attrs = paymentInfo?.data?.attributes || {};
  
  return {
    mobile: attrs.mobile || '',
    totalEarnings: parseFloat(attrs.total_earnings) || 0,
    cashbackEarnings: parseFloat(attrs.cashback_earnings) || 0,
    rewardsEarnings: parseFloat(attrs.rewards_earnings) || 0,
    currencyCode: attrs.currency_code || 'INR',
    paymentThreshold: parseFloat(attrs.payment_threshold) || 250,
  };
};

export type PaymentMethodKey = 'amazon' | 'flipkart' | 'upi' | 'bank';

const DEFAULT_PAYMENT_METHOD_IDS: Record<PaymentMethodKey, number> = {
  amazon: 12,
  flipkart: 13,
  upi: 20,
  bank: 18,
};

/**
 * Extracts payment_method IDs from the /payment/payment response.
 * The API is not strictly consistent JSON:API, so we check multiple shapes.
 */
export const extractPaymentMethodIds = (paymentInfo: any): Record<PaymentMethodKey, number> => {
  const ids: Record<PaymentMethodKey, number> = { ...DEFAULT_PAYMENT_METHOD_IDS };

  const candidates: any[] =
    paymentInfo?.data?.relationships?.payment_methods?.data ||
    paymentInfo?.data?.relationships?.payment_methods ||
    paymentInfo?.relationships?.payment_methods?.data ||
    paymentInfo?.relationships?.payment_methods ||
    paymentInfo?.data?.attributes?.payment_methods ||
    paymentInfo?.data?.payment_methods ||
    (Array.isArray(paymentInfo?.included)
      ? paymentInfo.included.filter((i: any) => i?.type === 'payment_method')
      : []) ||
    [];

  if (!Array.isArray(candidates) || candidates.length === 0) return ids;

  for (const m of candidates) {
    const attrs = m?.attributes ?? m;
    const rawId = m?.id ?? attrs?.id;
    const id = typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId), 10);
    if (!Number.isFinite(id)) continue;

    // API uses different fields across environments
    const label = String(
      attrs?.payment_name ?? attrs?.name ?? attrs?.payment_method_name ?? ''
    ).toLowerCase();

    if (label.includes('amazon')) ids.amazon = id;
    else if (label.includes('flipkart')) ids.flipkart = id;
    else if (label.includes('upi')) ids.upi = id;
    else if (
      label.includes('bank') ||
      label.includes('neft') ||
      label.includes('imps') ||
      label.includes('rtgs')
    )
      ids.bank = id;
  }

  return ids;
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
  const device = getDeviceType();
  return callProxy(`/users/sendotp?device=${device}`, 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        notification_name: 'PAYMENT_REQUEST_OTP',
      },
    },
  }, accessToken);
};

// Verify payment request OTP
// API expects OTP as integer
export const verifyPaymentRequestOTP = async (
  accessToken: string,
  otpGuid: string,
  otp: string
) => {
  const parsedOtp = parseInt(otp.trim(), 10);
  
  console.log('[API] verifyPaymentRequestOTP - Sending:', {
    otp_guid: otpGuid,
    otp: parsedOtp,
  });
  
  return callProxy(
    '/users/verify',
    'POST',
    {
      data: {
        type: 'user_otp',
        attributes: {
          otp_guid: otpGuid,
          otp: parsedOtp,
        },
      },
    },
    accessToken
  );
};

// Payment method types from API
export interface PaymentMethodInfo {
  id: number;
  name: string;
  type: 'amazongiftcard' | 'flipkartgiftcard' | 'upi' | 'imps';
  minAmount: number;
  maxAmount: number;
  enabled: boolean;
}

// Submit Amazon Pay payment
// paymentMethodId should be fetched from fetchPaymentInfo
export const submitAmazonPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'cashback_and_rewards',
  mobile: string,
  otpGuid: string,
  paymentMethodId: number = 12 // Default fallback, should be passed from API response
) => {
  const device = getDeviceType();
  return callProxy(`/payment/paymentV1?device=${device}`, 'POST', {
    data: {
      type: 'amazongiftcard',
      attributes: {
        payment_type: paymentType,
        payment_method_id: String(paymentMethodId),
        mobile: mobile,
        otp_guid: otpGuid,
        amazon_payment_type: 'AmazonMobile',
      },
    },
  }, accessToken);
};

// Submit Flipkart Gift Card payment
// paymentMethodId should be fetched from fetchPaymentInfo
export const submitFlipkartPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'cashback_and_rewards',
  email: string,
  otpGuid: string,
  paymentMethodId: number = 13 // Default fallback, should be passed from API response
) => {
  const device = getDeviceType();
  return callProxy(`/payment/paymentV1?device=${device}`, 'POST', {
    data: {
      type: 'flipkartgiftcard',
      attributes: {
        otp_guid: otpGuid,
        payment_type: paymentType,
        payment_method_id: String(paymentMethodId),
        email: email,
      },
    },
  }, accessToken);
};

// Submit UPI payment
// paymentMethodId should be fetched from fetchPaymentInfo
export const submitUPIPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'cashback_and_rewards',
  upiId: string,
  otpGuid: string,
  paymentMethodId: number = 20 // Default fallback, should be passed from API response
) => {
  const device = getDeviceType();
  return callProxy(`/payment/paymentV1?device=${device}`, 'POST', {
    data: {
      type: 'upi',
      attributes: {
        otp_guid: otpGuid,
        payment_type: paymentType,
        payment_method_id: String(paymentMethodId),
        upi_id: upiId,
      },
    },
  }, accessToken);
};

// Submit Bank Transfer (IMPS/RTGS) payment
// paymentMethodId should be fetched from fetchPaymentInfo
export const submitBankPayment = async (
  accessToken: string,
  paymentType: 'cashback' | 'rewards' | 'cashback_and_rewards',
  ifscCode: string,
  accountHolderName: string,
  accountNumber: string,
  otpGuid: string,
  paymentMethodId: number = 18 // Default fallback, should be passed from API response
) => {
  const device = getDeviceType();
  return callProxy(`/payment/paymentV1?device=${device}`, 'POST', {
    data: {
      type: 'imps',
      attributes: {
        otp_guid: otpGuid,
        payment_type: paymentType,
        payment_method_id: String(paymentMethodId),
        ifsc_code: ifscCode,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
      },
    },
  }, accessToken);
};

// Fetch payment history - list of available months/years
export const fetchPaymentHistoryMonths = async (accessToken: string) => {
  return callProxy('/payment/history', 'GET', undefined, accessToken);
};

// Fetch payment history for specific month/year
export const fetchPaymentHistoryByMonth = async (
  accessToken: string,
  month: string,
  year: number
) => {
  return callProxy(`/payment/history/${month}/${year}`, 'GET', undefined, accessToken);
};

// Fetch payment history details by cashout ID
export const fetchPaymentHistoryDetail = async (
  accessToken: string,
  cashoutId: number,
  pageNumber: number = 1,
  pageSize: number = 20
) => {
  return callProxy(
    `/payment/history/${cashoutId}?page[number]=${pageNumber}&page[size]=${pageSize}`,
    'GET',
    undefined,
    accessToken
  );
};

// Download payment history as Excel
export const downloadPaymentHistoryExcel = async (
  accessToken: string,
  cashoutId: number
) => {
  return callProxy(`/payment/history/${cashoutId}/download/excel`, 'GET', undefined, accessToken);
};

// Download payment history as PDF
export const downloadPaymentHistoryPDF = async (
  accessToken: string,
  cashoutId: number
) => {
  return callProxy(`/payment/history/${cashoutId}/download/pdf`, 'GET', undefined, accessToken);
};

// NOTE: fetchPaymentHistory (legacy) removed - use fetchPaymentInfo instead which now includes paymentautomation=true

// Fetch all payment requests (for showing pending/completed payment requests)
export const fetchPaymentRequests = async (
  accessToken: string,
  pageNumber: number = 1,
  pageSize: number = 20
) => {
  const device = getDeviceType();
  return callProxy(
    `/payment/history?device=${device}&page[number]=${pageNumber}&page[size]=${pageSize}`,
    'GET',
    undefined,
    accessToken
  );
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

// Check eligibility for credit cards via BankKaro API
export const checkEligibility = async (
  pincode: string,
  monthlyIncome: number,
  employmentType: 'salaried' | 'self-employed'
): Promise<{ eligibleCardIds: string[]; totalEligible: number }> => {
  console.log('[API] Checking eligibility:', { pincode, monthlyIncome, employmentType });
  
  const { data, error } = await supabase.functions.invoke('eligibility-proxy', {
    body: {
      pincode,
      inhandIncome: monthlyIncome,
      empStatus: employmentType,
    },
  });

  if (error) {
    console.error('[API] Eligibility check error:', error);
    throw new Error(error.message || 'Failed to check eligibility');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  console.log('[API] Eligibility result:', data);
  return {
    eligibleCardIds: data?.eligibleCardIds || [],
    totalEligible: data?.totalEligible || 0,
  };
};
