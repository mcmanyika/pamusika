import { toStaffNotification } from "@/lib/admin/notifications";
import { resolveAdminAccess } from "@/lib/auth/access";
import { STAFF_NOTIFICATION_EVENTS } from "@/lib/commerce/events";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsEvent } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (
    resolveAdminAccess({
      user: user ? { id: user.id } : null,
      profile: profile ? { role: profile.role } : null,
    }) !== "ok"
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("analytics_events")
    .select("id, event_name, created_at, metadata")
    .in("event_name", [...STAFF_NOTIFICATION_EVENTS])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return Response.json({ error: "failed" }, { status: 500 });
  }

  const notifications = (data ?? [])
    .map((event) =>
      toStaffNotification(
        event as Pick<AnalyticsEvent, "id" | "event_name" | "created_at" | "metadata">,
      ),
    )
    .filter((event) => event !== null);

  return Response.json(
    { notifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
