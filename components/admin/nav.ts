export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/vendors", label: "Vendors", icon: "vendors" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/harvest", label: "Harvest", icon: "harvest" },
  { href: "/admin/categories", label: "Categories", icon: "categories" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/referrals", label: "Referrals", icon: "referrals" },
  { href: "/admin/support", label: "Support", icon: "support" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
] as const;

export type AdminNavIcon = (typeof ADMIN_NAV)[number]["icon"];
