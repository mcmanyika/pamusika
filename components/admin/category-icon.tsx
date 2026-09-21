import type { ReactNode } from "react";

export type CategoryIconName =
  | "produce"
  | "food"
  | "groceries"
  | "clothing"
  | "footwear"
  | "mobile"
  | "electronics"
  | "household"
  | "personal-care"
  | "hardware"
  | "other";

const SLUG_ICONS: Record<string, CategoryIconName> = {
  "fresh-produce": "produce",
  "prepared-food": "food",
  groceries: "groceries",
  clothing: "clothing",
  footwear: "footwear",
  "mobile-accessories": "mobile",
  electronics: "electronics",
  "household-goods": "household",
  "personal-care": "personal-care",
  other: "other",
};

export function resolveCategoryIcon(slug?: string | null, name?: string | null): CategoryIconName {
  const slugKey = slug?.trim().toLowerCase() ?? "";
  if (slugKey && SLUG_ICONS[slugKey]) {
    return SLUG_ICONS[slugKey];
  }

  const text = `${slugKey} ${name ?? ""}`.toLowerCase();
  if (/\b(produce|vegetable|fruit|farm|crop|harvest)\b/.test(text)) return "produce";
  if (/\b(food|meal|cook|restaurant|snack)\b/.test(text)) return "food";
  if (/\b(grocer)/.test(text)) return "groceries";
  if (/\b(cloth|apparel|fashion|dress|shirt)\b/.test(text)) return "clothing";
  if (/\b(shoe|footwear|boot)\b/.test(text)) return "footwear";
  if (/\b(phone|mobile|sim)\b/.test(text)) return "mobile";
  if (/\b(electron|gadget|tv|radio)\b/.test(text)) return "electronics";
  if (/\b(household|home|kitchen|furniture)\b/.test(text)) return "household";
  if (/\b(care|beauty|hygiene|soap|cosmetic)\b/.test(text)) return "personal-care";
  if (/\b(hardware|tool|paint)\b/.test(text)) return "hardware";
  return "other";
}

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CategoryIcon({
  name,
  className,
}: {
  name: CategoryIconName;
  className?: string;
}) {
  switch (name) {
    case "produce":
      return (
        <Icon className={className}>
          <path d="M12 20c4.5-1 7-4.2 7-8.2C19 6 15.5 3 12 3S5 6 5 11.8c0 4 2.5 7.2 7 8.2Z" />
          <path d="M12 7c1.5-2.5 4-3 5.5-3" />
        </Icon>
      );
    case "food":
      return (
        <Icon className={className}>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
          <path d="M18 15v7" />
        </Icon>
      );
    case "groceries":
      return (
        <Icon className={className}>
          <path d="M5 10h14l-1.4 8.2A2 2 0 0 1 15.6 20H8.4a2 2 0 0 1-2-1.8L5 10Z" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </Icon>
      );
    case "clothing":
      return (
        <Icon className={className}>
          <path d="M20.4 7.4 16 4l-2.2 3.2a2.4 2.4 0 0 1-3.6 0L8 4 3.6 7.4 6 10v10h12V10Z" />
          <path d="M12 4v3" />
        </Icon>
      );
    case "footwear":
      return (
        <Icon className={className}>
          <path d="M4 17h13.2A2.8 2.8 0 0 0 20 14.2V13c0-2-1.6-3.2-3.5-3.8L14 8.5 12 13H8L4 15.5V17Z" />
          <path d="M4 17v2" />
          <path d="M8 17v2" />
          <path d="M12 17v2" />
          <path d="M16 17v2" />
        </Icon>
      );
    case "mobile":
      return (
        <Icon className={className}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 18h2" />
        </Icon>
      );
    case "electronics":
      return (
        <Icon className={className}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
        </Icon>
      );
    case "household":
      return (
        <Icon className={className}>
          <path d="M3 11 12 3l9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </Icon>
      );
    case "personal-care":
      return (
        <Icon className={className}>
          <path d="M12 3v6" />
          <path d="M8 5h8" />
          <path d="M9 9h6v10a3 3 0 0 1-6 0V9Z" />
        </Icon>
      );
    case "hardware":
      return (
        <Icon className={className}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3Z" />
        </Icon>
      );
    case "other":
      return (
        <Icon className={className}>
          <path d="M12.8 2.2 2 13l8.8 8.8a2 2 0 0 0 2.8 0L22 13.4a2 2 0 0 0 0-2.8L12.8 2.2Z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </Icon>
      );
  }
}

export function CategoryLabel({
  name,
  slug,
  variant = "plain",
}: {
  name: string | null | undefined;
  slug?: string | null;
  variant?: "plain" | "badge";
}) {
  const label = name?.trim() || "—";
  if (label === "—") {
    return <span>—</span>;
  }

  const icon = (
    <CategoryIcon
      name={resolveCategoryIcon(slug, label)}
      className={variant === "badge" ? "h-5 w-5" : "h-4 w-4"}
    />
  );

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="shrink-0 text-[var(--color-brand-dark)]">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
