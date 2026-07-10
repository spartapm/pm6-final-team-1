import { NextResponse } from "next/server";
import { createAdminClient, getAuthedUser, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  const user = await getAuthedUser(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always remove the public profile so the account can no longer use the product.
  const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  await userClient.from("profiles").delete().eq("auth_user_id", user.id);

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, authDeleted: true });
}
