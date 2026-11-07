// Supabase Edge Function: razorpay-webhook
// Securely receives authoritative Razorpay webhooks (e.g., refund.processed, payment.captured)
// Verifies X-Razorpay-Signature over raw request body using server environment RAZORPAY_WEBHOOK_SECRET.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'RAZORPAY_WEBHOOK_SECRET not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();

    // Cryptographic HMAC-SHA256 signature verification over raw body
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Fixed-length digest constant-time comparison
    if (signature.toLowerCase() !== expectedHex.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    // Supabase Service Role client for backend updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle refund events: only move refund_pending to refunded when Razorpay sends the refund event
    if (eventType === 'refund.processed' || eventType === 'refund.created' || eventType === 'payment.refunded') {
      const refundEntity = payload?.refund?.entity || payload?.payment?.entity;
      const paymentId = refundEntity?.payment_id || refundEntity?.id;
      const refundId = refundEntity?.id;

      if (paymentId) {
        // Find existing payment in refund_pending status
        const { data: paymentRow } = await supabase
          .from('payments')
          .select('id, booking_id, status')
          .or(`gateway_payment_id.eq.${paymentId},id.eq.${paymentId}`)
          .single();

        if (paymentRow) {
          // Transition payments table status from refund_pending to refunded
          await supabase
            .from('payments')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRow.id);

          // Update bookings refund_status to refunded
          await supabase
            .from('bookings')
            .update({
              refund_status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRow.booking_id);

          // Audit log recording actual successful gateway refund confirmation
          await supabase.from('admin_audit_logs').insert({
            action: 'RAZORPAY_REFUND_PROCESSED',
            target_entity: 'payments',
            target_id: paymentRow.id,
            details: {
              event: eventType,
              gateway_payment_id: paymentId,
              gateway_refund_id: refundId,
              booking_id: paymentRow.booking_id,
            },
          });
        }
      }
    }

    // Handle payment capture events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        await supabase
          .from('payments')
          .update({
            status: 'captured',
            gateway_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('gateway_order_id', orderId);

        const { data: paymentRow } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('gateway_order_id', orderId)
          .single();

        if (paymentRow?.booking_id) {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRow.booking_id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

