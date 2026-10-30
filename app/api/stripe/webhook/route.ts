import { getStripeClient, fulfillStripeSession, stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: 'Stripe 미설정' }, { status: 503 });
  }
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return Response.json({ error: '웹훅 시크릿이 없습니다.' }, { status: 503 });
  }
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') || '';
  try {
    const event = stripe.webhooks.constructEvent(raw, sig, secret);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfillStripeSession(event.data.object);
    }
    return Response.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '웹훅 검증 실패';
    return Response.json({ error: message }, { status: 400 });
  }
}
