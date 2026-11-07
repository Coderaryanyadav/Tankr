// Supabase Edge Function: create-razorpay-order
// Server-only endpoint to securely initialize genuine Razorpay payment orders.
// Secrets (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are read exclusively from server environment variables.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { booking_id, method = 'upi' } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing booking_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Read secrets exclusively from server environment (NEVER from client or platform_settings)
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Razorpay credentials not configured in server environment',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Initialize Supabase client with caller's JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Retrieve booking record
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, booking_reference, final_payable_amount, customer_id')
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(booking.final_payable_amount) * 100);

    // 4. Create authoritative order directly via Razorpay API
    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: booking.id,
        notes: {
          booking_reference: booking.booking_reference,
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errorBody = await rzpResponse.text();
      return new Response(
        JSON.stringify({ success: false, error: `Razorpay API error: ${errorBody}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpOrder = await rzpResponse.json();
    const gatewayOrderId = rzpOrder.id;

    // 5. Invoke create_payment_order RPC to record the order intent
    const idempotencyKey = `order_${booking.id}_${gatewayOrderId}`;
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_payment_order', {
      p_booking_id: booking.id,
      p_method: method,
      p_idempotency_key: idempotencyKey,
      p_gateway_order_id: gatewayOrderId,
    });

    if (rpcErr || !rpcData?.success) {
      return new Response(
        JSON.stringify({ success: false, error: rpcErr?.message || rpcData?.error || 'Database order registration failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: gatewayOrderId,
        amount: booking.final_payable_amount,
        currency: 'INR',
        keyId: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

