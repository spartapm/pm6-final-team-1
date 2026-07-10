import { NextResponse } from "next/server";
import {
  adminUpsertBook,
  createAdminClient,
  getAuthedUser,
  getProfileIdForUser,
  type BookPayload
} from "@/lib/supabase-admin";

type Body = {
  action?: "follow" | "unfollow" | "review" | "upsert-book";
  book?: BookPayload;
  bookId?: string;
  rating?: number;
  body?: string;
  isDraft?: boolean;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  const user = await getAuthedUser(accessToken);

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Body | null;
  if (!payload?.action) {
    return NextResponse.json({ error: "action이 필요합니다." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const profileId = await getProfileIdForUser(admin, user);

    if (payload.action === "upsert-book") {
      if (!payload.book?.id) {
        return NextResponse.json({ error: "book이 필요합니다." }, { status: 400 });
      }
      const bookId = await adminUpsertBook(admin, payload.book);
      return NextResponse.json({ ok: true, bookId });
    }

    if (payload.action === "follow" || payload.action === "unfollow") {
      const bookId = payload.bookId || payload.book?.id;
      if (!bookId) {
        return NextResponse.json({ error: "bookId가 필요합니다." }, { status: 400 });
      }

      if (payload.book) {
        await adminUpsertBook(admin, payload.book);
      } else {
        // Ensure FK target exists even if only an ISBN was provided.
        await adminUpsertBook(admin, { id: bookId });
      }

      if (payload.action === "follow") {
        const { error } = await admin.from("book_follows").upsert(
          { user_id: profileId, book_id: bookId },
          { onConflict: "user_id,book_id" }
        );
        if (error) throw error;
      } else {
        const { error } = await admin.from("book_follows").delete().eq("user_id", profileId).eq("book_id", bookId);
        if (error) throw error;
      }

      return NextResponse.json({ ok: true, bookId, following: payload.action === "follow" });
    }

    if (payload.action === "review") {
      const bookId = payload.bookId || payload.book?.id;
      const rating = Number(payload.rating ?? 0);
      const body = (payload.body ?? "").trim();

      if (!bookId) {
        return NextResponse.json({ error: "bookId가 필요합니다." }, { status: 400 });
      }
      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: "별점은 1~5점이어야 합니다." }, { status: 400 });
      }
      if (body.length < 30 || body.length > 1000) {
        return NextResponse.json({ error: "감상은 30자 이상 1000자 이하여야 합니다." }, { status: 400 });
      }

      if (payload.book) {
        await adminUpsertBook(admin, payload.book);
      } else {
        await adminUpsertBook(admin, { id: bookId });
      }

      const { data, error } = await admin
        .from("reviews")
        .insert({
          user_id: profileId,
          book_id: bookId,
          rating,
          body,
          is_draft: Boolean(payload.isDraft)
        })
        .select("id")
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, reviewId: data.id as string, bookId });
    }

    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
