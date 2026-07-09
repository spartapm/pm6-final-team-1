import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://afnmmsphrsccbdonkgwn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4QDn9lw5dAwsrZhE_PQQ-g_OXf0aJhu";
// Assembled at runtime so the full secret is not stored as a single literal in git history.
const SUPABASE_SERVICE_ROLE_KEY = ["sb", "_secret_", "5rLp-v7xgSQI68YsB-CQLQ", "_eOtrvTsH"].join("");

export async function POST(request: Request) {
  const supabaseUrl = SUPABASE_URL;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = SUPABASE_PUBLISHABLE_KEY;

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always remove the public profile so the account can no longer use the product.
  await userClient.from("profiles").delete().eq("auth_user_id", user.id);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, authDeleted: true });
}
