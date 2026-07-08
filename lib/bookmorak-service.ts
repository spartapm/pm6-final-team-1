import { supabase } from "./supabase";
import type { Book, Review } from "@/app/data";

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

const fallbackCover = "https://placehold.co/240x340/fff4d4/ffb21a?text=Book";

export async function getCurrentProfile() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("auth_user_id", session.user.id).single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return getCurrentProfile();
}

export async function signInWithKakao() {
  const redirectTo = typeof window === "undefined" ? undefined : window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo
    }
  });

  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname }
    }
  });

  if (error) throw error;

  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        auth_user_id: data.user.id,
        email,
        nickname,
        tag: String(Math.floor(Math.random() * 10000)).padStart(4, "0")
      },
      { onConflict: "auth_user_id" }
    );
  }

  return getCurrentProfile();
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
  const params = new URLSearchParams({ mode, query });
  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("알라딘 도서 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  return ((data.item ?? []) as AladinItem[]).map(mapAladinItemToBook);
}

export async function listFeaturedBookIsbn13() {
  const { data, error } = await supabase.from("featured_book_isbns").select("isbn13");
  if (error) throw error;
  return (data ?? []).map((row) => row.isbn13 as string);
}

export async function fetchFixedBestsellerBooks(limit = 24, isbn13List: string[] = []) {
  const params = new URLSearchParams({ mode: "fixed-bestsellers", limit: String(limit) });
  if (isbn13List.length > 0) {
    params.set("isbn13", isbn13List.join(","));
  }

  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("고정 도서 리스트 호출에 실패했습니다.");
  }

  const data = await response.json();
  return ((data.item ?? []) as AladinItem[]).map(mapAladinItemToBook);
}

export async function fetchAladinBookDetail(bookId: string) {
  const params = new URLSearchParams({ mode: "lookup", itemId: bookId });
  const response = await fetch(`/api/aladin?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("알라딘 도서 상세 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  const item = (data.item ?? [])[0] as AladinItem | undefined;
  return item ? mapAladinItemToBook(item) : null;
}

export async function upsertBook(book: AladinBook | Book) {
  const aladinBook = book as AladinBook;
  const isbn13 = aladinBook.isbn13 || (book.id.length === 13 ? book.id : null);
  const { data, error } = await supabase
    .from("books")
    .upsert(
      {
        id: isbn13 || aladinBook.isbn || book.id,
        aladin_isbn: aladinBook.isbn ?? null,
        aladin_isbn13: isbn13
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapBookRow(data as BookRow);
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

export async function listFeedReviews(bookIds: string[] = []) {
  let query = reviewSelect().eq("is_draft", false).order("created_at", { ascending: false }).limit(40);

  if (bookIds.length > 0) {
    query = query.in("book_id", bookIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as ReviewRow[]).map(mapReviewRow);
}

export async function listBookReviews(bookId: string, sortBy: "latest" | "popular" = "latest") {
  const { data, error } = await reviewSelect().eq("book_id", bookId).eq("is_draft", false).order("created_at", { ascending: false });
  if (error) throw error;

  const mapped = ((data ?? []) as unknown as ReviewRow[]).map(mapReviewRow);
  return sortBy === "popular" ? mapped.sort((a, b) => b.likes - a.likes) : mapped;
}

export async function createReview(profileId: string, bookId: string, rating: number, body: string, isDraft = false) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({ user_id: profileId, book_id: bookId, rating, body, is_draft: isDraft })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateReview(reviewId: string, rating: number, body: string, isDraft = false) {
  const { error } = await supabase.from("reviews").update({ rating, body, is_draft: isDraft }).eq("id", reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export async function toggleBookFollow(profileId: string, bookId: string, shouldFollow: boolean) {
  if (shouldFollow) {
    const { error } = await supabase.from("book_follows").insert({ user_id: profileId, book_id: bookId });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase.from("book_follows").delete().eq("user_id", profileId).eq("book_id", bookId);
  if (error) throw error;
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
  const { error } = await supabase.from("comments").insert({ user_id: profileId, review_id: reviewId, body, parent_id: parentId ?? null });
  if (error) throw error;
}

export async function reportReview(profileId: string, reviewId: string, reason: string) {
  const { error } = await supabase.from("reports").insert({ reporter_id: profileId, review_id: reviewId, reason });
  if (error) throw error;
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
  const categoryParts = item.categoryName?.split(">") ?? [];
  const genre = categoryParts.at(-1)?.trim() || "도서";

  return {
    id,
    title: item.title ?? "제목 없음",
    author: item.author ?? "저자 미상",
    cover: item.cover || fallbackCover,
    rating: item.customerReviewRank ? Math.round((item.customerReviewRank / 2) * 10) / 10 : 0,
    followers: 0,
    genres: [genre],
    description: item.description || "책 소개를 불러오지 못했습니다.",
    aladinItemId: item.itemId,
    isbn: item.isbn,
    isbn13: item.isbn13,
    publisher: item.publisher,
    pubDate: item.pubDate,
    categoryName: item.categoryName
  };
}

function mapBookRow(row: BookRow): Book {
  const ratings = row.reviews ?? [];
  const average = ratings.length > 0 ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0;

  return {
    id: row.id,
    title: row.title ?? row.aladin_isbn13 ?? row.id,
    author: row.author ?? "알라딘 API 실시간 조회 대상",
    cover: row.cover_url || fallbackCover,
    rating: Math.round(average * 10) / 10,
    followers: row.book_follows?.length ?? 0,
    genres: row.genres?.length ? row.genres : [row.aladin_category_name ?? "도서"],
    description: row.description || "책 소개를 불러오지 못했습니다."
  };
}

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    bookId: row.book_id,
    user: row.profiles?.nickname ?? "독서광",
    tag: row.profiles?.tag ? `#${row.profiles.tag}` : "#0000",
    avatar: row.profiles?.avatar_url ?? "📚",
    rating: row.rating,
    body: row.body,
    likes: row.review_likes?.length ?? 0,
    comments: row.comments?.length ?? 0,
    date: new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .format(new Date(row.created_at))
      .replaceAll(". ", ".")
      .replace(".", "")
  };
}
