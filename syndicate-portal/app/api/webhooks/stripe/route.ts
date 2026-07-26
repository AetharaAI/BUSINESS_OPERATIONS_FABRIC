import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { serverEnv } from "@/lib/server/env";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { withCrmContext } from "@/lib/server/crm/db-context";
import { emitWorkforceReceipt } from "@/lib/server/workforce/receipts";
import { aiWebsiteProvisioningService } from "@/lib/server/website-provisioning/service";
import { loadWebsiteStripeMapping } from "@/lib/server/stripe-plan-map";

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
  clientReferenceId: string | null;
}): string | null => {
  if (params.metadataTenantId && billingStateStore.getByTenantId(params.metadataTenantId)) {
    return params.metadataTenantId;
  }

  if (params.clientReferenceId && billingStateStore.getByTenantId(params.clientReferenceId)) {
    return params.clientReferenceId;
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

const queueBillingEvidence = (params: {
  tenantId: string;
  action: string;
  result?: "success" | "denied" | "pending";
  payload: Record<string, unknown>;
}) => {
  const workspaceId = serverEnv.bofWorkspaceId || params.tenantId;
  const tenantId = params.tenantId;

  void withCrmContext({ workspace_id: workspaceId, tenant_id: tenantId }, async (tx) =>
    emitWorkforceReceipt({
      tx,
      workspaceId,
      tenantId,
      session: null,
      actorType: "service",
      action: params.action,
      targetType: "tenant_billing_state",
      targetId: tenantId,
      result: params.result ?? "success",
      payload: params.payload
    })
  ).catch((error: unknown) => {
    console.error("[stripe-webhook] evidence emit failed", {
      tenant_id: tenantId,
      action: params.action,
      error: error instanceof Error ? error.message : String(error)
    });
  });
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
  const clientReferenceId = expandedSession.client_reference_id ?? null;

  const tenantId = resolveTenantFromPriceAndCustomer({ priceId, customerId, metadataTenantId, clientReferenceId });
  if (!tenantId) return;

  const websiteStripeMapping = loadWebsiteStripeMapping();
  const websiteBuildPriceId = serverEnv.portalAiWebsiteBuildStripePriceId || websiteStripeMapping.build_price_id;
  const websiteMonthlyPriceId = serverEnv.portalAiWebsiteMonthlyStripePriceId || websiteStripeMapping.monthly_price_id;
  const websitePaymentKind =
    priceId && websiteBuildPriceId && priceId === websiteBuildPriceId
      ? "build"
      : priceId && websiteMonthlyPriceId && priceId === websiteMonthlyPriceId
        ? "monthly"
        : null;

  if (websitePaymentKind) {
    const workspaceId = serverEnv.bofWorkspaceId || tenantId;
    const billing = billingStateStore.getByTenantId(tenantId);
    if (billing) {
      billingStateStore.applyStripeUpdate({
        tenant_id: tenantId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId
      });
    }

    await aiWebsiteProvisioningService.markPaymentConfirmed(
      { workspace_id: workspaceId, tenant_id: tenantId },
      {
        payment_reference: expandedSession.id,
        payment_kind: websitePaymentKind,
        operator_note:
          websitePaymentKind === "build"
            ? "Website build checkout completed via Stripe."
            : "Website monthly checkout completed via Stripe."
      }
    );

    queueBillingEvidence({
      tenantId,
      action: websitePaymentKind === "build" ? "website.payment.build.paid" : "website.payment.monthly.started",
      payload: {
        stripe_event_type: event.type,
        stripe_session_id: expandedSession.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        client_reference_id: clientReferenceId,
        metadata_tenant_id: metadataTenantId,
        deployment_family: "ai-website"
      }
    });
    return;
  }

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

  const action =
    priceId && current.stripe_price_id_deposit === priceId
      ? "payment.deposit.paid"
      : priceId && current.stripe_price_id_final_setup === priceId
        ? "payment.final_setup.paid"
        : priceId && current.stripe_price_id_monthly === priceId
          ? "payment.monthly.started"
          : "payment.checkout.completed";

  queueBillingEvidence({
    tenantId,
    action,
    payload: {
      stripe_event_type: event.type,
      stripe_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      deposit_status: patch.deposit_status ?? current.deposit_status,
      final_setup_status: patch.final_setup_status ?? current.final_setup_status,
      monthly_status: patch.monthly_status ?? current.monthly_status
    }
  });
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
