import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BANKKARO_API_URL = 'https://bk-prod-external.bankkaro.com/sp/api/cards';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pincode, inhandIncome, empStatus } = await req.json();
    
    console.log('[Eligibility Proxy] Request received:', { pincode, inhandIncome, empStatus });

    // Validate inputs
    if (!pincode || !inhandIncome || !empStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pincode, inhandIncome, empStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call BankKaro API
    const response = await fetch(BANKKARO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: '',
        banks_ids: [],
        card_networks: [],
        annualFees: '',
        credit_score: '',
        sort_by: '',
        free_cards: '',
        eligiblityPayload: {
          pincode: pincode,
          inhandIncome: String(inhandIncome),
          empStatus: empStatus,
        },
        cardGeniusPayload: {},
      }),
    });

    console.log('[Eligibility Proxy] BankKaro API response status:', response.status);

    const data = await response.json();
    console.log('[Eligibility Proxy] BankKaro API response data count:', data?.data?.length || 0);

    // Extract ck_store_id values from eligible cards
    const eligibleCardIds: string[] = [];
    if (data?.data && Array.isArray(data.data)) {
      data.data.forEach((card: any) => {
        if (card.ck_store_id) {
          eligibleCardIds.push(String(card.ck_store_id));
        }
      });
    }

    console.log('[Eligibility Proxy] Eligible card IDs:', eligibleCardIds);

    return new Response(
      JSON.stringify({
        success: true,
        eligibleCardIds,
        totalEligible: eligibleCardIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Eligibility Proxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check eligibility';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
