import type { ReactNode } from "react";
import type { AdminNavIcon } from "@/components/admin/nav";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function NavIcon({ name }: { name: AdminNavIcon }) {
  switch (name) {
    case "overview":
      return (
        <Icon>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </Icon>
      );
    case "vendors":
      return (
        <Icon>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21V12h6v9" />
        </Icon>
      );
    case "products":
      return (
        <Icon>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </Icon>
      );
    case "categories":
      return (
        <Icon>
          <path d="M12.8 2.2 2 13l8.8 8.8a2 2 0 0 0 2.8 0L22 13.4a2 2 0 0 0 0-2.8L12.8 2.2Z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </Icon>
      );
    case "orders":
      return (
        <Icon>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </Icon>
      );
    case "customers":
      return (
        <Icon>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
      );
    case "referrals":
      return (
        <Icon>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </Icon>
      );
    case "support":
      return (
        <Icon>
          <path d="M3 11a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-3h8" />
          <path d="M3 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3H3z" />
        </Icon>
      );
    case "analytics":
      return (
        <Icon>
          <path d="M3 3v18h18" />
          <path d="M7 16v-5" />
          <path d="M12 16V8" />
          <path d="M17 16v-8" />
        </Icon>
      );
    case "settings":
      return (
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Icon>
      );
  }
}
