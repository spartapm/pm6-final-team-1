import { supabase } from "./supabase";
import type { Book, Review } from "@/app/data";
import { aladinCacheKey, readAladinCache, writeAladinCache } from "./aladin-cache";

export type Profile = {
  id: string;
  auth_user_id: string;
  email: string;
  nickname: string;
  tag: string;
  avatar_url: string | null;
  bio: string | null;
};

type BookRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  genres: string[] | null;
  aladin_isbn: string | null;
  aladin_isbn13: string | null;
  aladin_item_id: number | null;
  aladin_category_name: string | null;
  book_follows?: { user_id: string }[];
  reviews?: { rating: number }[];
};

type ReviewRow = {
  id: string;
  book_id: string;
  rating: number;
  body: string;
  created_at: string;
  profiles: {
    id: string;
    nickname: string;
    tag: string;
    avatar_url: string | null;
  } | null;
  review_likes?: { user_id: string }[];
  comments?: { id: string }[];
};

type AladinItem = {
  itemId?: number;
  title?: string;
  author?: string;
  publisher?: string;
  pubDate?: string;
  description?: string;
  cover?: string;
  isbn?: string;
  isbn13?: string;
  categoryId?: number;
  categoryName?: string;
  customerReviewRank?: number;
};

export type AladinBook = Book & {
  aladinItemId?: number;
  isbn?: string;
  isbn13?: string;
  publisher?: string;
  pubDate?: string;
  categoryName?: string;
};

const fallbackCover = "";

function nicknameFromMetadata(metadata: Record<string, unknown> | null | undefined, fallback = "독서광") {
  const values = [
    metadata?.nickname,
    metadata?.name,
    metadata?.full_name,
    metadata?.user_name,
    metadata?.preferred_username
  ];

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 10);
    }
  }

  return fallback;
}

function avatarFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const avatar =
    (typeof metadata?.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata?.picture === "string" && metadata.picture) ||
    null;
  return avatar;
}

export async function getCurrentProfile() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("auth_user_id", session.user.id).maybeSingle();

  if (error) {
    throw error;
  }

  const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const nickname = nicknameFromMetadata(metadata);
  const avatarUrl = avatarFromMetadata(metadata);

  if (data) {
    const profile = data as Profile;
    const shouldSyncNickname = profile.nickname === "독서광" && nickname !== "독서광";
    const shouldSyncAvatar = !profile.avatar_url && Boolean(avatarUrl);
    const shouldSyncEmail = !profile.email && Boolean(session.user.email);

    if (shouldSyncNickname || shouldSyncAvatar || shouldSyncEmail) {
      const { data: synced } = await supabase
        .from("profiles")
        .update({
          ...(shouldSyncNickname ? { nickname } : {}),
          ...(shouldSyncAvatar ? { avatar_url: avatarUrl } : {}),
          ...(shouldSyncEmail ? { email: session.user.email ?? "" } : {})
        })
        .eq("id", profile.id)
        .select("*")
        .maybeSingle();

      if (synced) return synced as Profile;
      return {
        ...profile,
        ...(shouldSyncNickname ? { nickname } : {}),
        ...(shouldSyncAvatar ? { avatar_url: avatarUrl } : {}),
        ...(shouldSyncEmail ? { email: session.user.email ?? "" } : {})
      };
    }

    return profile;
  }

  const { data: createdProfile } = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: session.user.id,
        email: session.user.email ?? "",
        nickname,
        avatar_url: avatarUrl,
        tag: String(Math.floor(Math.random() * 10000)).padStart(4, "0")
      },
      { onConflict: "auth_user_id" }
    )
    .select("*")
    .maybeSingle();

  return createdProfile as Profile | null;
}

export async function signUpWithEmail(email: string, password: string, nickname: string) {
  // Create + auto-confirm via server so MVP signup works without email verification.
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, nickname })
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    if (payload.error === "ALREADY_REGISTERED" || response.status === 409) {
      throw new Error("ALREADY_REGISTERED");
    }
    throw new Error(payload.error || "계정 생성에 실패했습니다.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const profile = await getCurrentProfile();
    if (profile) {
      if (profile.nickname !== nickname || profile.email !== email) {
        try {
          await supabase.from("profiles").update({ nickname, email }).eq("id", profile.id);
        } catch {
          // ignore profile update race
        }
        return { ...profile, nickname, email };
      }
      return profile;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("PROFILE_NOT_READY");
}

async function ensureEmailConfirmed(email: string) {
  await fetch("/api/ensure-email-confirmed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  }).catch(() => undefined);
}

export async function signInWithEmail(email: string, password: string) {
  let { error } = await supabase.auth.signInWithPassword({ email, password });

  // Older accounts may still be unconfirmed from the early signup flow.
  if (error) {
    await ensureEmailConfirmed(email);
    const retry = await supabase.auth.signInWithPassword({ email, password });
    error = retry.error;
  }

  if (error) {
    if (/confirm|not confirmed/i.test(error.message)) {
      throw new Error("EMAIL_NOT_CONFIRMED");
    }
    throw error;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const profile = await getCurrentProfile();
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error("PROFILE_NOT_READY");
}

export async function signInWithKakao() {
  const redirectTo = typeof window === "undefined" ? undefined : window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo,
      scopes: "profile_nickname profile_image",
      queryParams: {
        scope: "profile_nickname profile_image"
      }
    }
  });

  if (error) throw error;
}

export async function deleteCurrentAccount() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("로그인 정보가 없습니다.");
  }

  const response = await fetch("/api/delete-account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error || "계정 삭제에 실패했습니다.");
  }

  await signOut();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateProfile(profileId: string, values: Partial<Pick<Profile, "nickname" | "bio" | "avatar_url">>) {
  const { data, error } = await supabase.from("profiles").update(values).eq("id", profileId).select("*").single();
  if (error) throw error;
  return data as Profile;
}

export async function uploadProfileImage(authUserId: string, file: File) {
  const extension = file.name.split(".").pop() || "png";
  const path = `${authUserId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchAladinBooks(query: string, mode: "search" | "bestseller" = "search") {
  const cacheKey = aladinCacheKey([mode, query || "베스트셀러"]);
  const cached = readAladinCache<AladinBook[]>(cacheKey);
  if (cached?.length) {
    return cached;
  }

  const params = new URLSearchParams({ mode, query });
  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("알라딘 도서 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  const books = ((data.item ?? []) as AladinItem[]).map(mapAladinItemToBook);
  if (books.length > 0) {
    writeAladinCache(cacheKey, books);
  }
  return books;
}

export async function listFeaturedBookIsbn13() {
  const { data, error } = await supabase.from("featured_book_isbns").select("isbn13");
  if (error) throw error;
  return (data ?? []).map((row) => row.isbn13 as string);
}

export async function fetchFixedBestsellerBooks(limit = 24, isbn13List: string[] = [], offset = 0) {
  const cacheKey = aladinCacheKey([
    "fixed-bestsellers",
    offset,
    limit,
    isbn13List.length > 0 && isbn13List.length <= 24 ? isbn13List.join(",") : "default"
  ]);
  const cached = readAladinCache<AladinBook[]>(cacheKey);
  if (cached?.length) {
    return cached;
  }

  const params = new URLSearchParams({
    mode: "fixed-bestsellers",
    limit: String(limit),
    offset: String(offset)
  });
  // Prefer server-side BESTSELLER_ISBN13 to avoid huge query strings.
  // Only pass an explicit list when a custom subset is required.
  if (isbn13List.length > 0 && isbn13List.length <= 24) {
    params.set("isbn13", isbn13List.join(","));
  }

  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("고정 도서 리스트 호출에 실패했습니다.");
  }

  const data = await response.json();
  const books = ((data.item ?? []) as AladinItem[]).map(mapAladinItemToBook);
  if (books.length > 0) {
    writeAladinCache(cacheKey, books);
  }
  return books;
}

export async function fetchAladinBookDetail(bookId: string) {
  const cacheKey = aladinCacheKey(["lookup", bookId]);
  const cached = readAladinCache<AladinBook>(cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ mode: "lookup", itemId: bookId });
  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("알라딘 도서 상세 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  const item = (data.item ?? [])[0] as AladinItem | undefined;
  const book = item ? mapAladinItemToBook(item) : null;
  if (book) {
    writeAladinCache(cacheKey, book);
  }
  return book;
}

async function getAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const {
    data: { session: refreshed }
  } = await supabase.auth.refreshSession();

  return refreshed?.access_token ?? "";
}

async function postBookAction(body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch("/api/book-actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string; bookId?: string; reviewId?: string };
  if (!response.ok) {
    throw new Error(payload.error || "서버 저장에 실패했습니다.");
  }
  return payload;
}

function toBookPayload(book: AladinBook | Book) {
  const aladinBook = book as AladinBook;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    description: book.description,
    genres: book.genres,
    isbn: aladinBook.isbn,
    isbn13: aladinBook.isbn13 || (book.id.length === 13 ? book.id : undefined),
    aladinItemId: aladinBook.aladinItemId,
    categoryName: aladinBook.categoryName
  };
}

export async function upsertBook(book: AladinBook | Book) {
  const payload = await postBookAction({
    action: "upsert-book",
    book: toBookPayload(book)
  });

  return {
    ...book,
    id: payload.bookId || book.id
  } as Book;
}

export async function listBooks() {
  const { data, error } = await supabase
    .from("books")
    .select("*, book_follows(user_id), reviews(rating)")
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) throw error;
  return ((data ?? []) as BookRow[]).map(mapBookRow);
}

export async function listFeedReviews(bookIds: string[] = [], currentProfileId?: string) {
  let query = reviewSelect().eq("is_draft", false).order("created_at", { ascending: false }).limit(40);

  if (bookIds.length > 0) {
    query = query.in("book_id", bookIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as ReviewRow[]).map((row) => mapReviewRow(row, currentProfileId));
}

export async function listBookReviews(bookId: string, sortBy: "latest" | "popular" = "latest", currentProfileId?: string) {
  const { data, error } = await reviewSelect().eq("book_id", bookId).eq("is_draft", false).order("created_at", { ascending: false });
  if (error) throw error;

  const mapped = ((data ?? []) as unknown as ReviewRow[]).map((row) => mapReviewRow(row, currentProfileId));
  return sortBy === "popular" ? mapped.sort((a, b) => b.likes - a.likes) : mapped;
}

export async function createReview(profileId: string, bookId: string, rating: number, body: string, isDraft = false, book?: AladinBook | Book) {
  void profileId;
  const payload = await postBookAction({
    action: "review",
    bookId,
    rating,
    body,
    isDraft,
    book: book ? toBookPayload(book) : { id: bookId }
  });

  if (!payload.reviewId) {
    throw new Error("감상글 저장에 실패했습니다.");
  }
  return payload.reviewId;
}

export async function updateReview(reviewId: string, rating: number, body: string, isDraft = false) {
  const { error } = await supabase.from("reviews").update({ rating, body, is_draft: isDraft }).eq("id", reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export async function toggleBookFollow(profileId: string, bookId: string, shouldFollow: boolean, book?: AladinBook | Book) {
  void profileId;
  await postBookAction({
    action: shouldFollow ? "follow" : "unfollow",
    bookId,
    book: book ? toBookPayload(book) : { id: bookId }
  });
}

export async function listFollowingBookIds(profileId: string) {
  const { data, error } = await supabase.from("book_follows").select("book_id").eq("user_id", profileId);
  if (error) throw error;
  return (data ?? []).map((row) => row.book_id as string);
}

export async function toggleReviewLike(profileId: string, reviewId: string, shouldLike: boolean) {
  if (shouldLike) {
    const { error } = await supabase.from("review_likes").insert({ user_id: profileId, review_id: reviewId });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase.from("review_likes").delete().eq("user_id", profileId).eq("review_id", reviewId);
  if (error) throw error;
}

export async function createComment(profileId: string, reviewId: string, body: string, parentId?: string) {
  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: profileId, review_id: reviewId, body, parent_id: parentId ?? null })
    .select(
      `
      id,
      review_id,
      parent_id,
      body,
      created_at,
      profiles:user_id(id, nickname, tag, avatar_url),
      comment_likes(user_id)
    `
    )
    .single();

  if (error) throw error;
  return mapCommentRow(data as unknown as CommentRow);
}

export async function listComments(reviewId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      review_id,
      parent_id,
      body,
      created_at,
      profiles:user_id(id, nickname, tag, avatar_url),
      comment_likes(user_id)
    `
    )
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as CommentRow[]).map(mapCommentRow);
}

export async function toggleCommentLike(profileId: string, commentId: string, shouldLike: boolean) {
  if (shouldLike) {
    const { error } = await supabase.from("comment_likes").insert({ user_id: profileId, comment_id: commentId });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase.from("comment_likes").delete().eq("user_id", profileId).eq("comment_id", commentId);
  if (error) throw error;
}

export async function reportReview(profileId: string, reviewId: string, reason: string) {
  const { error } = await supabase.from("reports").insert({ reporter_id: profileId, review_id: reviewId, reason });
  if (error) throw error;
}

export type CommentItem = {
  id: string;
  reviewId: string;
  parentId: string | null;
  user: string;
  tag: string;
  avatar: string;
  body: string;
  likes: number;
  date: string;
};

type CommentRow = {
  id: string;
  review_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  profiles?: { id: string; nickname: string; tag: string; avatar_url: string | null } | null;
  comment_likes?: { user_id: string }[];
};

function mapCommentRow(row: CommentRow): CommentItem {
  return {
    id: row.id,
    reviewId: row.review_id,
    parentId: row.parent_id,
    user: row.profiles?.nickname ?? "독서광",
    tag: row.profiles?.tag ? `#${row.profiles.tag}` : "",
    avatar: row.profiles?.avatar_url ?? "",
    body: row.body,
    likes: row.comment_likes?.length ?? 0,
    date: formatReviewDate(row.created_at)
  };
}

export function formatReviewDate(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function reviewSelect() {
  return supabase.from("reviews").select(
    `
      id,
      book_id,
      rating,
      body,
      created_at,
      profiles:user_id(id, nickname, tag, avatar_url),
      review_likes(user_id),
      comments(id)
    `
  );
}

function mapAladinItemToBook(item: AladinItem): AladinBook {
  const id = item.isbn13 || item.isbn || String(item.itemId ?? item.title ?? crypto.randomUUID());

  return {
    id,
    title: item.title ?? "제목 없음",
    author: item.author ?? "저자 미상",
    cover: normalizeCoverUrl(item.cover),
    // Book detail / list ratings should come from in-app user reviews, not Aladin.
    rating: 0,
    followers: 0,
    genres: mapCategoryToUiGenres(item.categoryName),
    description: item.description || "책 소개를 불러오지 못했습니다.",
    aladinItemId: item.itemId,
    isbn: item.isbn,
    isbn13: item.isbn13,
    publisher: item.publisher,
    pubDate: item.pubDate,
    categoryName: item.categoryName
  };
}

/** Map Aladin category paths onto the UI chip labels (소설, 에세이, ...). */
export function mapCategoryToUiGenres(categoryName?: string | null): string[] {
  const text = categoryName ?? "";
  const matched: string[] = [];

  if (/판타지|무협/.test(text)) matched.push("소설");
  else if (/소설|시\/희곡|희곡|과학소설|SF/.test(text)) matched.push("소설");

  if (/에세이/.test(text)) matched.push("에세이");
  if (/자기계발/.test(text)) matched.push("자기계발");
  if (/동화|유아|어린이|아동/.test(text)) matched.push("소설");
  if (/힐링/.test(text)) matched.push("에세이");

  if (matched.length > 0) return Array.from(new Set(matched));

  // Fall back to the last path segment only when it already matches a UI chip.
  const leaf = text.split(">").at(-1)?.trim() ?? "";
  const uiGenres = ["소설", "에세이", "자기계발"];
  if (uiGenres.includes(leaf)) return [leaf];

  return ["도서"];
}

function mapBookRow(row: BookRow): Book {
  const ratings = row.reviews ?? [];
  const average = ratings.length > 0 ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0;
  const mappedFromCategory = mapCategoryToUiGenres(row.aladin_category_name);
  const storedGenres = (row.genres ?? []).flatMap((genre) => mapCategoryToUiGenres(genre));
  const genres = Array.from(new Set([...storedGenres, ...mappedFromCategory])).filter((genre) => genre !== "도서");

  return {
    id: row.id,
    title: row.title ?? row.aladin_isbn13 ?? row.id,
    author: row.author ?? "알라딘 API 실시간 조회 대상",
    cover: normalizeCoverUrl(row.cover_url ?? undefined),
    rating: Math.round(average * 10) / 10,
    followers: row.book_follows?.length ?? 0,
    genres: genres.length > 0 ? genres : mappedFromCategory,
    description: row.description || "책 소개를 불러오지 못했습니다."
  };
}

function normalizeCoverUrl(cover?: string) {
  if (!cover) {
    return fallbackCover;
  }

  return cover.startsWith("http://") ? `https://${cover.slice("http://".length)}` : cover;
}

function mapReviewRow(row: ReviewRow, currentProfileId?: string): Review {
  return {
    id: row.id,
    bookId: row.book_id,
    user: row.profiles?.nickname ?? "독서광",
    tag: row.profiles?.tag ? `#${row.profiles.tag}` : "",
    avatar: row.profiles?.avatar_url ?? "",
    rating: row.rating,
    body: row.body,
    likes: row.review_likes?.length ?? 0,
    comments: row.comments?.length ?? 0,
    date: formatReviewDate(row.created_at),
    mine: Boolean(currentProfileId && row.profiles?.id === currentProfileId)
  };
}
