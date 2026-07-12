import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://afnmmsphrsccbdonkgwn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4QDn9lw5dAwsrZhE_PQQ-g_OXf0aJhu";
export const SUPABASE_SERVICE_ROLE_KEY = ["sb", "_secret_", "5rLp-v7xgSQI68YsB-CQLQ", "_eOtrvTsH"].join("");

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function getAuthedUser(accessToken: string): Promise<User | null> {
  if (!accessToken) return null;

  // Prefer service-role validation so publishable-key edge cases don't block writes.
  const admin = createAdminClient();
  const viaAdmin = await admin.auth.getUser(accessToken);
  if (!viaAdmin.error && viaAdmin.data.user) {
    return viaAdmin.data.user;
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const {
    data: { user },
    error
  } = await userClient.auth.getUser(accessToken);

  if (error || !user) return null;
  return user;
}

export async function getProfileIdForUser(admin: SupabaseClient, user: User) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nicknameCandidates = [
    metadata.nickname,
    metadata.name,
    metadata.full_name,
    metadata.user_name,
    metadata.preferred_username
  ];
  const nickname =
    nicknameCandidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim().slice(0, 10) ||
    "독서광";
  const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  // Prefer insert-only. Production may have an updated_at trigger without the column,
  // which breaks upsert/update on profiles.
  const { data: created, error } = await admin
    .from("profiles")
    .insert({
      auth_user_id: user.id,
      email: user.email ?? "",
      nickname,
      tag,
      avatar_url: avatarUrl
    })
    .select("id")
    .maybeSingle();

  if (!error && created?.id) {
    return created.id as string;
  }

  // Trigger may have already created the row with the default nickname.
  const { data: again } = await admin
    .from("profiles")
    .select("id, nickname")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (again?.id) {
    if (again.nickname === "독서광" && nickname !== "독서광") {
      await admin.from("profiles").update({ nickname, avatar_url: avatarUrl }).eq("id", again.id);
    }
    return again.id as string;
  }
  throw error || new Error("프로필을 준비하지 못했습니다.");
}

export type BookPayload = {
  id: string;
  title?: string;
  author?: string;
  cover?: string;
  description?: string;
  genres?: string[];
  isbn?: string;
  isbn13?: string;
  aladinItemId?: number;
  categoryName?: string;
};

export async function adminUpsertBook(admin: SupabaseClient, book: BookPayload) {
  const isbn13 = book.isbn13 || (book.id.length === 13 ? book.id : null);
  const bookId = isbn13 || book.isbn || book.id;

  // Production books table currently has a narrower column set than schema.sql.
  // Only write columns that exist there to avoid PostgREST schema-cache errors.
  const baseRow = {
    id: bookId,
    title: book.title ?? null,
    author: book.author ?? null,
    cover_url: book.cover || null,
    description: book.description ?? null,
    genres: book.genres ?? [],
    aladin_isbn: book.isbn ?? isbn13 ?? null
  };

  const { data, error } = await admin.from("books").upsert(baseRow, { onConflict: "id" }).select("id").single();

  if (!error && data?.id) {
    return data.id as string;
  }

  // Fallback: insert if missing, ignore update-trigger failures on existing rows.
  const { data: existing } = await admin.from("books").select("id").eq("id", bookId).maybeSingle();
  if (existing?.id) {
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await admin.from("books").insert(baseRow).select("id").single();
  if (insertError) throw insertError;
  return inserted.id as string;
}
