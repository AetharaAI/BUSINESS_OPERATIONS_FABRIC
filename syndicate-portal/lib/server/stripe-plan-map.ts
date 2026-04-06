import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Plan } from "@/lib/types/portal";

export type PlanMapping = {
  plan: Plan;
  stripe_product_id_reference: string | null;
  stripe_price_id_deposit: string | null;
  stripe_price_id_final_setup: string | null;
  stripe_price_id_monthly: string | null;
  payment_link_deposit: string | null;
  payment_link_final_setup: string | null;
  final_setup_status_default: "pending" | "not_required";
};

const extractPriceAndProduct = (content: string, pattern: RegExp): { product: string | null; price: string | null } => {
  const match = content.match(pattern);
  if (!match) return { product: null, price: null };
  return { product: match[1] ?? null, price: match[2] ?? null };
};

const extractLink = (content: string, pattern: RegExp): string | null => {
  const match = content.match(pattern);
  return match?.[1] ?? null;
};

export const loadStripePlanMappings = (): Record<Plan, PlanMapping> => {
  const mappingPath = resolve(process.cwd(), "..", "legal-docs", "Syndicate-Stripe-Prod-Ids.md");
  const content = readFileSync(mappingPath, "utf8");

  const starterDeposit = extractPriceAndProduct(
    content,
    /Starter Deposit - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i
  );
  const starterFinal = extractPriceAndProduct(
    content,
    /Starter Final Setup Balance - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i
  );
  const starterMonthly = extractPriceAndProduct(content, /Starter Monthly - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i);

  const growthDeposit = extractPriceAndProduct(
    content,
    /Growth Deposit - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i
  );
  const growthFinal = extractPriceAndProduct(
    content,
    /Growth Final Setup Balance - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i
  );
  const growthMonthly = extractPriceAndProduct(content, /Growth Monthly - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i);

  const operatorMonthly = extractPriceAndProduct(
    content,
    /Operator Monthly - (prod_[A-Za-z0-9]+) - (price_[A-Za-z0-9]+)/i
  );

  return {
    starter: {
      plan: "starter",
      stripe_product_id_reference: starterMonthly.product ?? starterDeposit.product,
      stripe_price_id_deposit: starterDeposit.price,
      stripe_price_id_final_setup: starterFinal.price,
      stripe_price_id_monthly: starterMonthly.price,
      payment_link_deposit: extractLink(content, /Starter Deposit link - (https?:\/\/\S+)/i),
      payment_link_final_setup: extractLink(content, /Starter Final Setup link - (https?:\/\/\S+)/i),
      final_setup_status_default: "pending"
    },
    growth: {
      plan: "growth",
      stripe_product_id_reference: growthMonthly.product ?? growthDeposit.product,
      stripe_price_id_deposit: growthDeposit.price,
      stripe_price_id_final_setup: growthFinal.price,
      stripe_price_id_monthly: growthMonthly.price,
      payment_link_deposit: extractLink(content, /Growth Deposit link - (https?:\/\/\S+)/i),
      payment_link_final_setup: extractLink(content, /Growth Final Setup link - (https?:\/\/\S+)/i),
      final_setup_status_default: "pending"
    },
    operator: {
      plan: "operator",
      stripe_product_id_reference: operatorMonthly.product,
      stripe_price_id_deposit: null,
      stripe_price_id_final_setup: null,
      stripe_price_id_monthly: operatorMonthly.price,
      payment_link_deposit: null,
      payment_link_final_setup: null,
      final_setup_status_default: "not_required"
    }
  };
};
