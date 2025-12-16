// CashKaro API Service - Using Edge Function Proxy to bypass CORS

import { supabase } from '@/integrations/supabase/client';

// Token refresh interval (10 minutes = 600000ms)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

// Token state
let currentGuestToken: string | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

// Helper to call the proxy edge function
const callProxy = async (endpoint: string, method = 'GET', body?: any, userAccessToken?: string) => {
  console.log(`[API] Calling proxy: ${method} ${endpoint}`);
  
  const { data, error } = await supabase.functions.invoke('cashkaro-proxy', {
    body: {
      endpoint,
      method,
      body,
      userAccessToken,
    },
  });

  if (error) {
    console.error('[API] Proxy error:', error);
    throw new Error(error.message || 'API call failed');
  }

  if (data?.error) {
    console.error('[API] API error:', data);
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.data));
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
  if (!currentGuestToken) {
    currentGuestToken = await generateToken();
    startTokenRefresh();
  }
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

// Get current guest token
export const getGuestToken = async (): Promise<string> => {
  if (!currentGuestToken) {
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
  return callProxy('/loginotp?device=Desktop', 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        mobile_number: parseInt(mobileNumber),
      },
    },
  }, accessToken);
};

// Verify OTP and login
export const verifyOTPAndLogin = async (
  mobileNumber: string,
  otpGuid: string,
  otp: string,
  accessToken: string
) => {
  return callProxy('/login?device=Desktop', 'POST', {
    data: {
      type: 'auth',
      attributes: {
        mobile_number: parseInt(mobileNumber),
        otp_guid: otpGuid,
        otp: parseInt(otp),
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
  }, accessToken);
};

// Refresh access token
export const refreshToken = async (refreshTokenStr: string, accessToken: string) => {
  return callProxy(
    '/refreshtoken',
    'POST',
    {
      data: {
        type: 'auth',
        attributes: {
          refresh_token: refreshTokenStr,
        },
      },
    },
    accessToken
  );
};

// Fetch dynamic homepage
export const fetchDynamicPage = async (accessToken: string) => {
  const device = getDeviceType();
  return callProxy(
    `/dynamicpage/api-homepage?device=${device}&include=seo_content&filter[deal_card_type]=flash_site`,
    'GET',
    undefined,
    accessToken
  );
};

// Fetch user earnings
export const fetchEarnings = async (accessToken: string) => {
  return callProxy(
    '/users/earnings?include=cashbacks,rewards,referrals',
    'GET',
    undefined,
    accessToken
  );
};

// Fetch missing cashback retailers
export const fetchMissingCashbackRetailers = async (accessToken: string, page = 1, size = 10) => {
  return callProxy(
    `/users/missingcashback/retailers?page[number]=${page}&page[size]=${size}`,
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

// Submit missing cashback claim
export const submitMissingCashback = async (
  accessToken: string,
  storeId: string,
  exitDate: string,
  exitId: string,
  orderId: string,
  amount: string
) => {
  return callProxy('/users/missingcashback/queue', 'POST', {
    data: {
      type: 'missingcashback',
      attributes: {
        store_id: parseInt(storeId),
        exit_date: exitDate,
        exit_id: exitId,
        order_id: orderId,
        transaction_amount: amount,
      },
    },
  }, accessToken);
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

// Send payment OTP
export const sendPaymentOTP = async (accessToken: string, mobileNumber: string) => {
  const device = getDeviceType();
  return callProxy(`/users/sendotp?device=${device}`, 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        mobile_number: parseInt(mobileNumber),
      },
    },
  }, accessToken);
};

// Verify payment OTP
export const verifyPaymentOTP = async (accessToken: string, otp: string) => {
  return callProxy('/users/verify', 'POST', {
    data: {
      type: 'user_otp',
      attributes: {
        otp: parseInt(otp),
      },
    },
  }, accessToken);
};

// Submit payment request
export const submitPaymentRequest = async (
  accessToken: string,
  type: 'upi' | 'bank',
  amount: string,
  paymentDetails: {
    upi_id?: string;
    account_number?: string;
    ifsc_code?: string;
    account_holder_name?: string;
  }
) => {
  const device = getDeviceType();
  return callProxy(`/payment/paymentV1?device=${device}`, 'POST', {
    data: {
      type,
      attributes: {
        amount,
        ...paymentDetails,
        otp_verified: true,
      },
    },
  }, accessToken);
};

// Fetch payment history
export const fetchPaymentHistory = async (accessToken: string) => {
  return callProxy('/payment/history', 'GET', undefined, accessToken);
};
