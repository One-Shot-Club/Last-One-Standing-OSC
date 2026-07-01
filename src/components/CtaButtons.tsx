import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const WHATSAPP_NUMBER = "353899714543";
export const WHATSAPP_MESSAGE =
  "Hi, I'd like to find out more about OneShotClub fundraisers for my club.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

type Variant = "onLight" | "onDark";

type Props = { variant?: Variant; className?: string };

export function WhatsAppCta({ variant = "onLight", className = "" }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wider transition";
  const styles =
    variant === "onDark"
      ? "bg-accent text-accent-foreground hover:brightness-110"
      : "bg-[#25D366] text-white hover:brightness-110";
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
      data-cta="whatsapp"
    >
      <MessageCircle className="h-4 w-4" />
      Chat on WhatsApp
    </a>
  );
}

export function LetsGetSetUpCta({ variant = "onLight", className = "" }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wider transition";
  const styles =
    variant === "onDark"
      ? "border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
      : "bg-primary text-primary-foreground hover:bg-secondary";
  return (
    <Link
      to="/signup"
      className={`${base} ${styles} ${className}`}
      data-cta="setup"
    >
      Let's get set up →
    </Link>
  );
}

export function CtaPair({
  variant = "onLight",
  align = "start",
}: {
  variant?: Variant;
  align?: "start" | "center" | "end";
}) {
  const justify =
    align === "center"
      ? "justify-center"
      : align === "end"
        ? "md:justify-end"
        : "justify-start";
  return (
    <div className={`flex flex-wrap gap-3 ${justify}`}>
      <WhatsAppCta variant={variant} />
      <LetsGetSetUpCta variant={variant} />
    </div>
  );
}
