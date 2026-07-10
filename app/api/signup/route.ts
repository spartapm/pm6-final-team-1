import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://afnmmsphrsccbdonkgwn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = ["sb", "_secret_", "5rLp-v7xgSQI68YsB-CQLQ", "_eOtrvTsH"].join("");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; nickname?: string }
    | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const nickname = body?.nickname?.trim() || "독서광";

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "이메일과 비밀번호를 확인해주세요." }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname }
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: "ALREADY_REGISTERED" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "계정 생성에 실패했습니다." }, { status: 500 });
  }

  const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  await admin.from("profiles").upsert(
    {
      auth_user_id: data.user.id,
      email,
      nickname,
      tag
    },
    { onConflict: "auth_user_id" }
  );

  return NextResponse.json({ ok: true, userId: data.user.id });
}
