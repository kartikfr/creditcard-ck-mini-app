// CashKaro API Configuration and Service

const API_CONFIG = {
  BASE_URL: 'https://ckapistaging.lmssecure.com/v1',
  API_KEY: '73pfe492u249d76n6o6k25dy2mqp58c1',
  AUTH_HEADER: 'Basic c3RhZ2luZ2Nrd2ViYXBpOk1uS0xsYm82V3NUcVRKNFI=',
  APP_VERSION: '4.6',
};

interface ApiHeaders {
  [key: string]: string;
}

const getBaseHeaders = (): ApiHeaders => ({
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
  'x-api-key': API_CONFIG.API_KEY,
  'x-chkr-app-version': API_CONFIG.APP_VERSION,
});

const getAuthHeaders = (accessToken: string): ApiHeaders => ({
  ...getBaseHeaders(),
  'Authorization': `Bearer ${accessToken}`,
});

// Generate initial access token
export const generateToken = async (): Promise<string> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/token`, {
    method: 'GET',
    headers: {
      ...getBaseHeaders(),
      'Authorization': API_CONFIG.AUTH_HEADER,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate token');
  }

  const data = await response.json();
  return data.data.attributes.access_token;
};

// Request OTP for login
export const requestOTP = async (mobileNumber: string, accessToken: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/loginotp?device=Desktop`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      data: {
        type: 'user_otp',
        attributes: {
          mobile_number: parseInt(mobileNumber),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.meta?.message || 'Failed to send OTP');
  }

  return response.json();
};

// Verify OTP and login
export const verifyOTPAndLogin = async (
  mobileNumber: string,
  otpGuid: string,
  otp: string,
  accessToken: string
) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/login?device=Desktop`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.meta?.message || 'Invalid OTP');
  }

  return response.json();
};

// Refresh access token
export const refreshToken = async (refreshTokenStr: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/refreshtoken`, {
    method: 'POST',
    headers: getBaseHeaders(),
    body: JSON.stringify({
      data: {
        type: 'auth',
        attributes: {
          refresh_token: refreshTokenStr,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
};

// Get device type based on viewport
export const getDeviceType = (): string => {
  return window.innerWidth > 1024 ? 'Desktop' : 'Mobile';
};

// Fetch dynamic homepage
export const fetchDynamicPage = async (accessToken: string) => {
  const device = getDeviceType();
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/dynamicpage/api-homepage?device=${device}&include=seo_content&filter[deal_card_type]=flash_site`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch homepage');
  }

  return response.json();
};

// Fetch user earnings
export const fetchEarnings = async (accessToken: string) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/users/earnings?include=cashbacks,rewards,referrals`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings');
  }

  return response.json();
};

// Fetch missing cashback retailers
export const fetchMissingCashbackRetailers = async (accessToken: string, page = 1, size = 10) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/users/missingcashback/retailers?page[number]=${page}&page[size]=${size}`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch retailers');
  }

  return response.json();
};

// Fetch exit click dates for a store
export const fetchExitClickDates = async (accessToken: string, storeId: string) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/users/missingcashback/exitclickdates/${storeId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch exit click dates');
  }

  return response.json();
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
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/missingcashback/queue`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.meta?.message || 'Failed to submit claim');
  }

  return response.json();
};

// Fetch payment info
export const fetchPaymentInfo = async (accessToken: string) => {
  const device = getDeviceType();
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/payment/payment?device=${device}&include=charities`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payment info');
  }

  return response.json();
};

// Fetch user profile
export const fetchProfile = async (accessToken: string) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/users/profile?include=partnerinfo`,
    {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
};

// Send payment OTP
export const sendPaymentOTP = async (accessToken: string, mobileNumber: string) => {
  const device = getDeviceType();
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/sendotp?device=${device}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      data: {
        type: 'user_otp',
        attributes: {
          mobile_number: parseInt(mobileNumber),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send OTP');
  }

  return response.json();
};

// Verify payment OTP
export const verifyPaymentOTP = async (accessToken: string, otp: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/verify`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      data: {
        type: 'user_otp',
        attributes: {
          otp: parseInt(otp),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify OTP');
  }

  return response.json();
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
  const response = await fetch(`${API_CONFIG.BASE_URL}/payment/paymentV1?device=${device}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      data: {
        type,
        attributes: {
          amount,
          ...paymentDetails,
          otp_verified: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.meta?.message || 'Failed to submit payment request');
  }

  return response.json();
};

// Fetch payment history
export const fetchPaymentHistory = async (accessToken: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/payment/history`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }

  return response.json();
};
