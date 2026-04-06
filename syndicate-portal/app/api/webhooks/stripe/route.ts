import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { serverEnv } from "@/lib/server/env";
import { billingStateStore } from "@/lib/server/billing-state-store";

export const runtime = "nodejs";

const getStripeClient = (): Stripe => {
  if (!serverEnv.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(serverEnv.stripeSecretKey, {
    apiVersion: "2025-05-28.basil"
  });
};

const resolveTenantFromPriceAndCustomer = (params: {
  priceId: string | null;
  customerId: string | null;
  metadataTenantId: string | null;
}): string | null => {
  if (params.metadataTenantId && billingStateStore.getByTenantId(params.metadataTenantId)) {
    return params.metadataTenantId;
  }

  if (params.customerId) {
    const byCustomer = billingStateStore.findByStripeCustomerId(params.customerId);
    if (byCustomer) return byCustomer.tenant_id;
  }

  if (params.priceId) {
    const candidates = billingStateStore.findCandidatesByPriceId(params.priceId);
    if (params.customerId) {
      const narrowed = candidates.filter(
        (item) => item.stripe_customer_id === params.customerId || item.stripe_customer_id == null
      );
      if (narrowed.length === 1) return narrowed[0].tenant_id;
    }
    if (candidates.length === 1) return candidates[0].tenant_id;
  }

  return null;
};

const handleCheckoutCompleted = async (stripe: Stripe, event: Stripe.Event): Promise<void> => {
  const session = event.data.object as Stripe.Checkout.Session;
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"]
  });

  const firstLine = expandedSession.line_items?.data?.[0];
  const priceId = typeof firstLine?.price === "string" ? firstLine.price : firstLine?.price?.id ?? null;
  const customerId = typeof expandedSession.customer === "string" ? expandedSession.customer : null;
  const subscriptionId = typeof expandedSession.subscription === "string" ? expandedSession.subscription : null;
  const metadataTenantId = (expandedSession.metadata?.tenant_id as string | undefined) ?? null;

  const tenantId = resolveTenantFromPriceAndCustomer({ priceId, customerId, metadataTenantId });
  if (!tenantId) return;

  const current = billingStateStore.getByTenantId(tenantId);
  if (!current) return;

  const patch: {
    tenant_id: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    deposit_status?: "pending" | "paid";
    final_setup_status?: "pending" | "paid" | "not_required";
    monthly_status?: "inactive" | "pending" | "active";
  } = {
    tenant_id: tenantId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId
  };

  if (priceId && current.stripe_price_id_deposit === priceId) {
    patch.deposit_status = "paid";
  }
  if (priceId && current.stripe_price_id_final_setup === priceId) {
    patch.final_setup_status = "paid";
  }
  if (priceId && current.stripe_price_id_monthly === priceId) {
    patch.monthly_status = "active";
  }

  billingStateStore.applyStripeUpdate(patch);
};

const handleInvoicePaid = (event: Stripe.Event): void => {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const rawSubscription = (invoice as unknown as { subscription?: unknown }).subscription;
  const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : null;
  if (!customerId) return;

  const state = billingStateStore.findByStripeCustomerId(customerId);
  if (!state) return;

  billingStateStore.applyStripeUpdate({
    tenant_id: state.tenant_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    monthly_status: "active"
  });
};

const handleInvoiceFailed = (event: Stripe.Event): void => {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const rawSubscription = (invoice as unknown as { subscription?: unknown }).subscription;
  const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : null;
  if (!customerId) return;

  const state = billingStateStore.findByStripeCustomerId(customerId);
  if (!state) return;

  billingStateStore.applyStripeUpdate({
    tenant_id: state.tenant_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    monthly_status: "pending"
  });
};

const handleSubscriptionUpdate = (event: Stripe.Event): void => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) return;

  const state = billingStateStore.findByStripeCustomerId(customerId);
  if (!state) return;

  const status = subscription.status;
  const monthlyStatus: "inactive" | "pending" | "active" =
    status === "active" || status === "trialing" ? "active" : status === "canceled" ? "inactive" : "pending";

  billingStateStore.applyStripeUpdate({
    tenant_id: state.tenant_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    monthly_status: monthlyStatus
  });
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!serverEnv.stripeWebhookSecret) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
    }

    const stripeSignature = request.headers.get("stripe-signature");
    if (!stripeSignature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const rawBody = await request.text();
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, stripeSignature, serverEnv.stripeWebhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event);
        break;
      case "invoice.paid":
        handleInvoicePaid(event);
        break;
      case "invoice.payment_failed":
        handleInvoiceFailed(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        handleSubscriptionUpdate(event);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
