import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

async function findUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < 200) break;
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ error: "이메일이 필요합니다." }, { status: 400 });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ ok: true, confirmed: false });
    }

    if (!user.email_confirmed_at) {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, confirmed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이메일 확인 처리에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
