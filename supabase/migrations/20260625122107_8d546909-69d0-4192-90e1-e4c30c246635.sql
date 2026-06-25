-- Tenants: Stripe Connect account tracking
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status text NOT NULL DEFAULT 'not_started'
    CHECK (stripe_onboarding_status IN ('not_started','pending','active','restricted'));

-- Competitions: per-club payment & fee configuration
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS application_fee_flat_cents integer NOT NULL DEFAULT 0
    CHECK (application_fee_flat_cents >= 0),
  ADD COLUMN IF NOT EXISTS application_fee_percent_bps integer NOT NULL DEFAULT 0
    CHECK (application_fee_percent_bps >= 0 AND application_fee_percent_bps <= 10000),
  ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'club'
    CHECK (fee_payer IN ('club','player')),
  ADD COLUMN IF NOT EXISTS refund_policy_default text NOT NULL DEFAULT 'ask_each_time'
    CHECK (refund_policy_default IN ('refund_app_fee','keep_app_fee','ask_each_time')),
  ADD COLUMN IF NOT EXISTS cash_enabled boolean NOT NULL DEFAULT true;

-- Competition entries: link entry to its Stripe payment
ALTER TABLE public.competition_entries
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_method text
    CHECK (paid_method IN ('stripe','cash','bank_transfer','manual_other','admin_override'));

CREATE INDEX IF NOT EXISTS idx_competition_entries_stripe_pi
  ON public.competition_entries(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_competition_entries_stripe_session
  ON public.competition_entries(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Payments ledger: Stripe + refund tracking
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS application_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer,
  ADD COLUMN IF NOT EXISTS refund_app_fee boolean;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi
  ON public.payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Tenants Stripe lookup index
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_account
  ON public.tenants(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;