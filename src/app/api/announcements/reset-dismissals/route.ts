import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SETTING_KEY = "announcement_dismissal_reset";

/**
 * POST /api/announcements/reset-dismissals
 *
 * Triggers a reset of all dismissed announcements.
 * Persists a reset timestamp in system_settings so clients can detect the change.
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resetTimestamp = Date.now();

    // Upsert the reset timestamp so GET can return the persisted value
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert({ key: SETTING_KEY, value: String(resetTimestamp) }, { onConflict: "key" });

    if (error) {
      console.error("Failed to persist reset timestamp:", error);
      return NextResponse.json({ error: "Failed to persist reset timestamp" }, { status: 500 });
    }

    await logAdminAction({
      action: "announcement.reset_dismissals",
      targetType: "system",
      metadata: { resetTimestamp },
    });

    return NextResponse.json({
      success: true,
      resetTimestamp,
      message: "Dismissals reset triggered. All users will see announcements again.",
    });
  } catch (error) {
    console.error("Failed to reset dismissals:", error);
    return NextResponse.json({ error: "Failed to reset dismissals" }, { status: 500 });
  }
}

/**
 * GET /api/announcements/reset-dismissals
 *
 * Returns the persisted reset timestamp so clients can check whether to clear localStorage.
 */
export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch reset timestamp:", error);
      return NextResponse.json({ error: "Failed to fetch reset timestamp" }, { status: 500 });
    }

    return NextResponse.json({
      resetTimestamp: data ? Number(data.value) : null,
    });
  } catch (error) {
    console.error("Failed to get reset timestamp:", error);
    return NextResponse.json({ error: "Failed to get reset timestamp" }, { status: 500 });
  }
}
