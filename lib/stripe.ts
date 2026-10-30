/**
 * 신강팀 LEXI(lexistyle) `src/lib/payments/stripe.ts` + LawyGo Checkout Session 이식.
 * 원샷 결제와 월 구독을 price_data로 바로 생성해, 카탈로그에 없는 금액도 받을 수 있다.
 */
import Stripe from 'stripe';
import { SITE_URL } from '@/lib/domain';
import { dbQuery } from '@/lib/db';

export const STRIPE_API_VERSION = '2026-05-27.dahlia';

let stripeClient: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe | null {
  if (!stripeConfigured()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      apiVersion: STRIPE_API_VERSION as never,
    });
  }
  return stripeClient;
}

export type CheckoutProduct = {
  id: string;
  name: string;
  amount_krw: number;
  interval: 'month' | 'once';
  slot?: string;
};

export async function createAdCheckoutSession(input: {
  subscriptionId: string;
  product: CheckoutProduct;
  propertyId: string;
  customerEmail?: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe가 설정되지 않았습니다. STRIPE_SECRET_KEY를 확인하세요.');

  const amount = Math.max(1000, Math.round(input.product.amount_krw));
  const recurring = input.product.interval === 'month';
  const session = await stripe.checkout.sessions.create({
    mode: recurring ? 'subscription' : 'payment',
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'krw',
          unit_amount: amount,
          product_data: {
            name: input.product.name || '여행갈지도 광고',
            description: `${input.product.slot === 'ai_search' ? 'AI 검색 광고 1칸' : '숙소 광고'} · ${input.propertyId}`,
          },
          ...(recurring ? { recurring: { interval: 'month' as const } } : {}),
        },
      },
    ],
    success_url: `${SITE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#pricing`,
    cancel_url: `${SITE_URL}/?checkout=cancelled#pricing`,
    client_reference_id: input.subscriptionId,
    metadata: {
      yeohang_subscription_id: input.subscriptionId,
      property_id: input.propertyId,
      product_id: input.product.id,
      amount_krw: String(amount),
    },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error('Stripe Checkout Session URL 생성 실패');
  return { sessionId: session.id, url: session.url };
}

export async function retrieveStripeSession(sessionId: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe 미설정');
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function fulfillStripeSession(session: Stripe.Checkout.Session) {
  const subId = String(session.metadata?.yeohang_subscription_id || session.client_reference_id || '');
  if (!subId) return { ok: false, reason: 'no_subscription' };
  const paid = session.payment_status === 'paid' || session.status === 'complete';
  const status = paid ? 'active' : 'pending';
  const stripeSub = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || session.id;
  await dbQuery(
    `UPDATE subscriptions SET status=$1, stripe_session_id=$2, stripe_subscription_id=$3 WHERE id=$4`,
    [status, session.id, stripeSub, subId],
  );
  const propertyId = String(session.metadata?.property_id || '');
  if (paid && propertyId) {
    await dbQuery(`UPDATE properties SET sponsored=true WHERE id=$1`, [propertyId]);
  }
  return { ok: true, status, property_id: propertyId, subscription_id: subId };
}
