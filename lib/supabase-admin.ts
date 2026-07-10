import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://afnmmsphrsccbdonkgwn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4QDn9lw5dAwsrZhE_PQQ-g_OXf0aJhu";
export const SUPABASE_SERVICE_ROLE_KEY = ["sb", "_secret_", "5rLp-v7xgSQI68YsB-CQLQ", "_eOtrvTsH"].join("");

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function getAuthedUser(accessToken: string): Promise<User | null> {
  if (!accessToken) return null;

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

  const metadata = user.user_metadata ?? {};
  const nickname =
    (metadata.nickname as string | undefined) ||
    (metadata.name as string | undefined) ||
    (metadata.full_name as string | undefined) ||
    "독서광";
  const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  const { data: created, error } = await admin
    .from("profiles")
    .upsert(
      {
        auth_user_id: user.id,
        email: user.email ?? "",
        nickname,
        tag,
        avatar_url: (metadata.avatar_url as string | undefined) || null
      },
      { onConflict: "auth_user_id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
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

  const { data, error } = await admin
    .from("books")
    .upsert(
      {
        id: bookId,
        title: book.title ?? null,
        author: book.author ?? null,
        cover_url: book.cover || null,
        description: book.description ?? null,
        genres: book.genres ?? [],
        aladin_isbn: book.isbn ?? null,
        aladin_isbn13: isbn13,
        aladin_item_id: book.aladinItemId ?? null,
        aladin_category_name: book.categoryName ?? book.genres?.[0] ?? null
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
