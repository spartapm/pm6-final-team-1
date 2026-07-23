"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Mail,
  MoreHorizontal
} from "lucide-react";
import homeIcon from "../team-1-icons/(홈) 하단바.svg";
import homeActiveIcon from "../team-1-icons/(홈) 하단바-1.svg";
import searchIcon from "../team-1-icons/(둘러보기) 하단바.svg";
import searchActiveIcon from "../team-1-icons/(둘러보기) 하단바-1.svg";
import writeIcon from "../team-1-icons/(게시글 생성) 둘러보기.svg";
import writeActiveIcon from "../team-1-icons/(게시글 생성) 둘러보기-1.svg";
import myIcon from "../team-1-icons/(마이) 하단바.svg";
import myActiveIcon from "../team-1-icons/(마이) 하단바-1.svg";
import searchFieldIcon from "../team-1-icons/(검색) 온보딩, 검색화면-검색 필드.svg";
import deleteIcon from "../team-1-icons/(삭제) 온보딩, 검색-검색 입력 필드.svg";
import settingsIcon from "../team-1-icons/(설정) 마이페이지-왼쪽 상단.svg";
import cameraIcon from "../team-1-icons/(카메라) 계정생성, 마이페이지-사진 구역.svg";
import starIcon from "../team-1-icons/(별점) 홈 피드, 책 상세페이지, 게시글 작성, 마이페이지-책 정보.svg";
import starActiveIcon from "../team-1-icons/(별점) 홈 피드, 책 상세페이지, 게시글 작성, 마이페이지-책 정보-1.svg";
import likeIcon from "../team-1-icons/(좋아요) 홈 피드, 게시글 상세페이지, 책 상세페이지-글 아래.svg";
import likeActiveIcon from "../team-1-icons/(좋아요) 홈 피드, 게시글 상세페이지, 책 상세페이지-글 아래-1.svg";
import commentIcon from "../team-1-icons/(댓글) 홈 피드, 게시글 상세페이지, 책 상세페이지-글 아래.svg";
import startCharacterIcon from "../team-1-icons/캐릭터 일러스트-시작, 로그인.svg";
import startLogoIcon from "../team-1-icons/로고명.svg";
import startServiceIcon from "../team-1-icons/서비스명.svg";
import startBgIcon from "../team-1-icons/시작화면-배경.png";
import defaultAvatarIcon from "../team-1-icons/기본 프로필.svg";
import bookshelfIcon from "../team-1-icons/홈화면-책장.png";
import { genres, reviews as sampleReviews, type Book, type Review } from "./data";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { BESTSELLER_ISBN13, BESTSELLER_PREVIEW, CATALOG_REVISION, EXTRA_BOOK_SEED } from "@/lib/bestseller-isbn13";
import { ensureCatalogCacheRevision } from "@/lib/aladin-cache";
import {
  mapBookDetailSource,
  mapFollowScreen,
  mapLikeCommentScreen,
  mapPostClickSource,
  setAuthIntent,
  consumeAuthIntent,
  setAppUserId,
  clearAppUserId,
  trackEvent,
  trackHomePostView
} from "@/lib/gtm";
import {
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  PRIVACY_TABLE_ROWS,
  TERMS_SECTIONS
} from "@/lib/policy-content";
import {
  createComment,
  createReview,
  createBookRequest,
  deleteComment,
  deleteCurrentAccount,
  deleteReview,
  fetchAladinBookDetail,
  fetchFixedBestsellerBooks,
  formatReviewDate,
  getBookFollowerCount,
  getCurrentProfile,
  listBookEngagement,
  listBookReviews,
  listBooks,
  listComments,
  listFeedReviews,
  listFollowingBookIds,
  listMyReviews,
  reportComment,
  reportReview,
  sanitizeBookDescription,
  signInWithEmail,
  signInWithKakao,
  signOut,
  signUpWithEmail,
  toggleBookFollow,
  toggleCommentLike,
  toggleReviewLike,
  updateComment,
  updateProfile as updateSupabaseProfile,
  updateReview,
  uploadProfileImage,
  upsertBook,
  type CommentItem,
  type Profile
} from "@/lib/bookmorak-service";

type Screen =
  | "start"
  | "onboarding"
  | "preview"
  | "login"
  | "signup"
  | "home"
  | "notifications"
  | "search"
  | "book"
  | "write"
  | "write-pick"
  | "mypage"
  | "following"
  | "settings"
  | "terms"
  | "privacy"
  | "profile"
  | "password"
  | "post";
type ModalType =
  | "more"
  | "report"
  | "deletePost"
  | "deleteComment"
  | "leaveWrite"
  | "logout"
  | "deleteAccount"
  | "profilePhoto"
  | "sort"
  | "bookRequest"
  | null;
type IconSource = StaticImageData | string;

const currentUser = {
  name: "독서광",
  tag: "",
  email: "",
  intro: "아직 소개글이 없습니다.",
  avatar: ""
};

const ONBOARDING_BOOKS_KEY = "bookmorak:onboarding-books";

function readStoredOnboardingBooks() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_BOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredOnboardingBooks(bookIds: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ONBOARDING_BOOKS_KEY, JSON.stringify(bookIds));
  } catch {
    // ignore quota errors
  }
}

function clearStoredOnboardingBooks() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ONBOARDING_BOOKS_KEY);
  } catch {
    // ignore
  }
}

const HOME_GUIDE_KEY = "bookmorak:home-guide-seen";

function hasSeenHomeGuide(profileId: string) {
  if (typeof window === "undefined" || !profileId) return true;
  try {
    return window.localStorage.getItem(`${HOME_GUIDE_KEY}:${profileId}`) === "1";
  } catch {
    return false;
  }
}

function markHomeGuideSeen(profileId: string) {
  if (typeof window === "undefined" || !profileId) return;
  try {
    window.localStorage.setItem(`${HOME_GUIDE_KEY}:${profileId}`, "1");
  } catch {
    // ignore
  }
}

/** Official catalog only: top100 + 추가도서_isbn수정본.csv (no stray DB / old science batch). */
const CATALOG_ISBN_SET = new Set<string>(BESTSELLER_ISBN13);

const fixedBookPreviews: Book[] = [...BESTSELLER_PREVIEW, ...EXTRA_BOOK_SEED].map((book) => ({
  id: book.isbn13,
  title: book.title,
  author: book.author,
  cover: "",
  rating: 0,
  followers: 0,
  genres: [book.genre],
  description: "알라딘 API에서 책 소개를 실시간으로 불러오는 중입니다."
}));

export function BookmorakApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [activeBookId, setActiveBookId] = useState(fixedBookPreviews[0].id);
  const [activePostId, setActivePostId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("전체");
  const [liveBooks, setLiveBooks] = useState<Book[]>(fixedBookPreviews);
  const [selectedBooks, setSelectedBooks] = useState<string[]>(() => readStoredOnboardingBooks());
  const [following, setFollowing] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookDetailReviews, setBookDetailReviews] = useState<Review[]>([]);
  const [postComments, setPostComments] = useState<CommentItem[]>([]);
  const [draftRating, setDraftRating] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const [sessionEmail, setSessionEmail] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [reportReason, setReportReason] = useState("스팸/홍보성");
  const [reportTarget, setReportTarget] = useState<"post" | "comment">("post");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [policyReturn, setPolicyReturn] = useState<Screen>("settings");
  const [bookReturnScreen, setBookReturnScreen] = useState<Screen>("home");
  const [writeReturnScreen, setWriteReturnScreen] = useState<Screen>("home");
  const [postReturnScreen, setPostReturnScreen] = useState<Screen>("home");
  const [followingReturnScreen, setFollowingReturnScreen] = useState<Screen>("mypage");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookRequestTitle, setBookRequestTitle] = useState("");
  const [bookRequestAuthor, setBookRequestAuthor] = useState("");
  const [isSubmittingBookRequest, setIsSubmittingBookRequest] = useState(false);
  const isSyncing = false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefetchedBookIdsRef = useRef<Set<string>>(new Set());
  const liveBooksRef = useRef(liveBooks);
  const screenHistoryRef = useRef<Screen[]>([]);
  const homeScrollRef = useRef<HTMLDivElement>(null);
  const homeScrollTopRef = useRef(0);
  const searchScrollRef = useRef<HTMLDivElement>(null);
  const searchScrollTopRef = useRef(0);
  const [showHomeGuide, setShowHomeGuide] = useState(false);
  liveBooksRef.current = liveBooks;

  const activeBook = liveBooks.find((book) => book.id === activeBookId) ?? liveBooks[0] ?? fixedBookPreviews[0];
  const activePost = reviews.find((review) => review.id === activePostId) ?? reviews[0];

  useEffect(() => {
    setAppUserId(profile?.id);
  }, [profile?.id]);

  useEffect(() => {
    if (screen !== "home" || !profile?.id) {
      setShowHomeGuide(false);
      return;
    }
    setShowHomeGuide(!hasSeenHomeGuide(profile.id));
  }, [screen, profile?.id]);

  useEffect(() => {
    let isMounted = true;
    ensureCatalogCacheRevision(CATALOG_REVISION);

    async function loadFollowedContent(profileId: string, followIds: string[]) {
      const [feedReviewsData, myReviewsData] = await Promise.all([
        followIds.length > 0
          ? listFeedReviews(followIds, profileId).catch(() => [])
          : Promise.resolve([] as Review[]),
        listMyReviews(profileId, profileId).catch(() => [])
      ]);
      return mergeReviews(feedReviewsData, myReviewsData);
    }

    async function applyBookEngagement(bookIds: string[]) {
      const engagement = await listBookEngagement(bookIds).catch(() => []);
      if (!isMounted || engagement.length === 0) return;
      const byId = new Map(engagement.map((item) => [item.id, item]));
      setLiveBooks((prev) =>
        prev.map((book) => {
          const stats = byId.get(book.id);
          if (!stats) return book;
          return {
            ...book,
            rating: stats.rating,
            followers: Math.max(book.followers ?? 0, stats.followers)
          };
        })
      );
    }

    async function enterAuthenticatedApp() {
      if (!isMounted) return;

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setSessionEmail(session.user.email);
        }

        const authIntent = consumeAuthIntent();
        if (authIntent === "login") {
          const authUser = session?.user;
          const createdAtMs = authUser?.created_at ? new Date(authUser.created_at).getTime() : 0;
          const isBrandNewAccount = createdAtMs > 0 && Date.now() - createdAtMs < 3 * 60 * 1000;
          const isRegistered = Boolean(authUser?.user_metadata?.bookmorak_registered);

          if (isBrandNewAccount && !isRegistered) {
            if (session?.access_token) {
              await fetch("/api/delete-account", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` }
              }).catch(() => undefined);
            }
            await signOut().catch(() => undefined);
            if (!isMounted) return;
            clearAppUserId();
            setProfile(null);
            setFollowing([]);
            setScreen("start");
            showToast("가입되지 않은 계정입니다. 먼저 회원가입을 진행해주세요.");
            return;
          }
        }

        if (authIntent === "sign_up") {
          await supabase.auth.updateUser({ data: { bookmorak_registered: true } }).catch(() => undefined);
        }

        setScreen("home");

        const nextProfile = await getCurrentProfile();
        if (!isMounted || !nextProfile) return;

        setProfile(nextProfile);
        setAppUserId(nextProfile.id);

        const pendingBooks = readStoredOnboardingBooks();
        if (pendingBooks.length > 0) {
          // Show followed books in the home feed immediately, then persist in the background.
          setFollowing((prev) => Array.from(new Set([...prev, ...pendingBooks])));
          for (const bookId of pendingBooks) {
            const targetBook = liveBooksRef.current.find((book) => book.id === bookId);
            if (targetBook) {
              await upsertBook(targetBook).catch(() => undefined);
              await toggleBookFollow(nextProfile.id, bookId, true, targetBook).catch(() => undefined);
            } else {
              await toggleBookFollow(nextProfile.id, bookId, true).catch(() => undefined);
            }
            trackEvent("follow_book", { book_id: bookId, screen: "onboarding" });
          }
          clearStoredOnboardingBooks();
          setSelectedBooks([]);
        }

        const dbFollows = await listFollowingBookIds(nextProfile.id).catch(() => []);
        const followIds = Array.from(new Set([...dbFollows, ...pendingBooks]));
        const nextReviews = await loadFollowedContent(nextProfile.id, followIds);

        if (!isMounted) return;
        setFollowing((prev) => Array.from(new Set([...prev, ...followIds])));
        if (nextReviews.length > 0) {
          setReviews((prev) => mergeReviews(prev, nextReviews));
          const likedIds = collectLikedReviewIds(nextReviews);
          if (likedIds.length > 0) {
            setLikedPosts((prev) => Array.from(new Set([...prev, ...likedIds])));
          }
        }
        await applyBookEngagement(Array.from(new Set([...followIds, ...liveBooksRef.current.map((book) => book.id)])));

        if (authIntent === "sign_up") {
          trackEvent("sign_up_complete", { user_status: "member" });
        } else if (authIntent === "login") {
          trackEvent("login_complete", { user_status: "member" });
        }
      } catch {
        // The product should still be usable when OAuth succeeds before the profile row is ready.
      }
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearAppUserId();
        setProfile(null);
        setFollowing([]);
        setSessionEmail("");
        setScreen("start");
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        if (session.user.email) setSessionEmail(session.user.email);
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          void enterAuthenticatedApp();
        }
      }
    });

    async function loadRemainingBestsellers() {
      const pageSize = 40;
      for (let offset = 24; offset < BESTSELLER_ISBN13.length; offset += pageSize) {
        const batch = await fetchFixedBestsellerBooks(pageSize, [], offset).catch(() => []);
        if (!isMounted || batch.length === 0) continue;
        setLiveBooks((prev) => mergeCatalogBooks(prev, batch));
        await applyBookEngagement(batch.map((book) => book.id).filter((id) => CATALOG_ISBN_SET.has(id)));
      }
    }

    async function bootstrap() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (session?.user) {
          setScreen("home");
        }

        const currentProfile = session?.user ? await getCurrentProfile().catch(() => null) : null;
        if (!isMounted) return;

        if (session?.user?.email) setSessionEmail(session.user.email);
        setProfile(currentProfile);
        if (currentProfile) setAppUserId(currentProfile.id);
        if (session?.user || currentProfile) {
          setScreen("home");
        }

        const [firstPageBooks, dbBooks, dbFollows] = await Promise.all([
          fetchFixedBestsellerBooks(24).catch(() => []),
          listBooks().catch(() => []),
          currentProfile ? listFollowingBookIds(currentProfile.id).catch(() => []) : Promise.resolve([] as string[])
        ]);

        if (!isMounted) return;
        // Catalog-only: enrich official ISBNs; never import stray DB books into search/browse.
        const dbCatalogBooks = dbBooks.filter((book) => CATALOG_ISBN_SET.has(book.id));
        setLiveBooks(mergeCatalogBooks(fixedBookPreviews, [...firstPageBooks, ...dbCatalogBooks]));
        if (dbFollows.length > 0) {
          setFollowing((prev) => Array.from(new Set([...prev, ...dbFollows])));
        }

        if (currentProfile) {
          const nextReviews = await loadFollowedContent(currentProfile.id, dbFollows);
          if (!isMounted) return;
          if (nextReviews.length > 0) {
            setReviews((prev) => mergeReviews(prev, nextReviews));
            const likedIds = collectLikedReviewIds(nextReviews);
            if (likedIds.length > 0) {
              setLikedPosts((prev) => Array.from(new Set([...prev, ...likedIds])));
            }
          }
        }

        const catalogIds = Array.from(
          new Set([...fixedBookPreviews, ...firstPageBooks, ...dbBooks].map((book) => book.id))
        );
        await applyBookEngagement(catalogIds);

        // Load remaining bestsellers in chunks (API caps each request at 40).
        void loadRemainingBestsellers();
      } catch {
        showToast("Supabase 연결 전까지 샘플 데이터로 표시합니다.");
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const normalized = normalizeSearchText(query);
    return liveBooks.filter((book) => {
      const genreMatches = selectedGenre === "전체" || book.genres.includes(selectedGenre);
      const haystack = normalizeSearchText(`${book.title} ${book.author}`);
      const queryMatches = !normalized || haystack.includes(normalized);
      return genreMatches && queryMatches;
    });
  }, [liveBooks, query, selectedGenre]);

  const feedReviews = useMemo(() => {
    // Home feed only shows posts for followed books (including the user's own posts).
    return reviews.filter((review) => following.includes(review.bookId));
  }, [following, reviews]);

  const myReviews = useMemo(() => {
    return reviews.filter((review) => Boolean(review.mine));
  }, [reviews]);

  const sortedBookReviews = useMemo(() => {
    const source = bookDetailReviews.length > 0 ? bookDetailReviews : reviews.filter((review) => review.bookId === activeBook.id);
    if (sortBy === "popular") {
      return [...source].sort((a, b) => b.likes - a.likes);
    }
    return source;
  }, [activeBook.id, bookDetailReviews, reviews, sortBy]);

  useEffect(() => {
    if (screen !== "search" && screen !== "home") return;

    const coverlessBooks = filteredBooks
      .filter((book) => (!book.cover || book.rating === 0) && !prefetchedBookIdsRef.current.has(book.id))
      .slice(0, 18);

    if (coverlessBooks.length === 0) return;

    let isCancelled = false;
    coverlessBooks.forEach((book) => prefetchedBookIdsRef.current.add(book.id));

    Promise.all(coverlessBooks.map((book) => fetchAladinBookDetail(book.id).catch(() => null))).then((details) => {
      if (isCancelled) return;

      const nextBooks = details.filter(Boolean) as Book[];
      if (nextBooks.length > 0) {
        setLiveBooks((prev) => mergeCatalogBooks(prev, nextBooks));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [filteredBooks, screen]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const openBook = async (bookId: string, returnScreen: Screen = screen, postId = "") => {
    trackEvent("book_detail_view", {
      post_id: postId || undefined,
      book_id: bookId,
      source: mapBookDetailSource(returnScreen)
    });
    screenHistoryRef.current.push(returnScreen);
    setBookReturnScreen(returnScreen);
    setActiveBookId(bookId);
    setBookDetailReviews([]);
    setScreen("book");

    try {
      const [detailedBook, bookReviews, followerCount] = await Promise.all([
        fetchAladinBookDetail(bookId).catch(() => null),
        listBookReviews(bookId, sortBy, profile?.id),
        getBookFollowerCount(bookId).catch(() => null)
      ]);

      setBookDetailReviews(bookReviews);
      if (bookReviews.length > 0) {
        setReviews((prev) => mergeReviews(prev, bookReviews));
        const likedIds = collectLikedReviewIds(bookReviews);
        if (likedIds.length > 0) {
          setLikedPosts((prev) => Array.from(new Set([...prev, ...likedIds])));
        }
      }

      const userAverage =
        bookReviews.length > 0
          ? Math.round((bookReviews.reduce((sum, review) => sum + review.rating, 0) / bookReviews.length) * 10) / 10
          : 0;

      setLiveBooks((prev) => {
        const previous = prev.find((book) => book.id === bookId);
        const nextFollowers =
          typeof followerCount === "number" ? followerCount : previous?.followers ?? detailedBook?.followers ?? 0;
        const nextBook: Book = {
          ...(previous ?? fixedBookPreviews[0]),
          ...(detailedBook ?? {}),
          id: bookId,
          title: detailedBook?.title || previous?.title || bookId,
          author: detailedBook?.author || previous?.author || "",
          cover: detailedBook?.cover || previous?.cover || "",
          description: sanitizeBookDescription(detailedBook?.description || previous?.description || ""),
          genres: detailedBook?.genres?.length ? detailedBook.genres : previous?.genres ?? [],
          rating: userAverage,
          followers: nextFollowers
        };
        // Force rating/followers after merge so explicit 0.0 and DB follower counts win.
        return mergeCatalogBooks(prev, [nextBook]).map((book) =>
          book.id === bookId ? { ...book, rating: userAverage, followers: nextFollowers } : book
        );
      });
    } catch {
      showToast("책 상세 정보를 불러오지 못했습니다.");
    }
  };

  const openPost = async (postId: string, returnScreen: Screen = screen) => {
    const target = reviews.find((review) => review.id === postId);
    trackEvent("post_click", {
      post_id: postId,
      book_id: target?.bookId || activeBook.id,
      source: mapPostClickSource(returnScreen)
    });
    screenHistoryRef.current.push(returnScreen);
    setPostReturnScreen(returnScreen);
    setActivePostId(postId);
    setScreen("post");
    setPostComments([]);

    try {
      const comments = await listComments(postId, profile?.id);
      setPostComments(comments);
      const likedIds = comments.filter((comment) => comment.likedByMe).map((comment) => comment.id);
      if (likedIds.length > 0) {
        setLikedComments((prev) => Array.from(new Set([...prev, ...likedIds])));
      }
    } catch {
      setPostComments([]);
    }
  };

  const goBackFromBook = () => {
    const previous = screenHistoryRef.current.pop() ?? bookReturnScreen;
    setScreen(previous);
  };

  const goBackFromPost = () => {
    const previous = screenHistoryRef.current.pop() ?? postReturnScreen;
    setScreen(previous);
  };

  const openWritePicker = (returnScreen: Screen = screen) => {
    trackEvent("write_post_start");
    setWriteReturnScreen(returnScreen);
    setEditingReviewId(null);
    setDraftRating(0);
    setDraftBody("");
    setScreen("write-pick");
  };

  const openWriteForBook = (bookId: string, returnScreen: Screen = screen) => {
    trackEvent("write_post_start");
    setWriteReturnScreen(returnScreen);
    setActiveBookId(bookId);
    setEditingReviewId(null);
    setDraftRating(0);
    setDraftBody("");
    setScreen("write");
  };

  const persistOnboardingFollows = async (nextProfile: Profile, bookIds = selectedBooks) => {
    if (bookIds.length === 0) return;

    setFollowing((prev) => Array.from(new Set([...prev, ...bookIds])));

    for (const bookId of bookIds) {
      const targetBook = liveBooksRef.current.find((book) => book.id === bookId);
      if (targetBook) {
        await upsertBook(targetBook);
        await toggleBookFollow(nextProfile.id, bookId, true, targetBook);
      } else {
        await toggleBookFollow(nextProfile.id, bookId, true);
      }
      trackEvent("follow_book", { book_id: bookId, screen: "onboarding" });
    }

    setFollowing((prev) => Array.from(new Set([...prev, ...bookIds])));
    clearStoredOnboardingBooks();
  };

  const toggleFollow = async (bookId: string, followScreen: Screen | "onboarding" = screen) => {
    if (!profile) {
      showToast("로그인 후 팔로우할 수 있습니다.");
      return;
    }

    const shouldFollow = !following.includes(bookId);
    setFollowing((prev) => (prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
    setLiveBooks((prev) =>
      prev.map((book) =>
        book.id === bookId
          ? { ...book, followers: Math.max(0, (book.followers ?? 0) + (shouldFollow ? 1 : -1)) }
          : book
      )
    );

    try {
      const targetBook = liveBooks.find((book) => book.id === bookId);
      if (targetBook) {
        await toggleBookFollow(profile.id, bookId, shouldFollow, targetBook);
      } else {
        await toggleBookFollow(profile.id, bookId, shouldFollow);
      }
      const latestCount = await getBookFollowerCount(bookId).catch(() => null);
      if (typeof latestCount === "number") {
        setLiveBooks((prev) => prev.map((book) => (book.id === bookId ? { ...book, followers: latestCount } : book)));
      }
      trackEvent(shouldFollow ? "follow_book" : "unfollow_book", {
        book_id: bookId,
        screen: mapFollowScreen(followScreen)
      });
    } catch (error) {
      setFollowing((prev) => (shouldFollow ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
      setLiveBooks((prev) =>
        prev.map((book) =>
          book.id === bookId
            ? { ...book, followers: Math.max(0, (book.followers ?? 0) + (shouldFollow ? -1 : 1)) }
            : book
        )
      );
      const message = error instanceof Error ? error.message : "";
      showToast(message || "팔로우 처리에 실패했습니다.");
    }
  };

  const toggleLike = async (postId: string, likeScreen: Screen = screen) => {
    const shouldLike = !likedPosts.includes(postId);
    setLikedPosts((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));
    setReviews((prev) =>
      prev.map((review) =>
        review.id === postId
          ? { ...review, likes: Math.max(0, review.likes + (shouldLike ? 1 : -1)), likedByMe: shouldLike }
          : review
      )
    );
    setBookDetailReviews((prev) =>
      prev.map((review) =>
        review.id === postId
          ? { ...review, likes: Math.max(0, review.likes + (shouldLike ? 1 : -1)), likedByMe: shouldLike }
          : review
      )
    );

    if (!profile || postId.startsWith("r")) {
      return;
    }

    try {
      await toggleReviewLike(profile.id, postId, shouldLike);
      if (shouldLike) {
        trackEvent("like_post", {
          post_id: postId,
          screen: mapLikeCommentScreen(likeScreen)
        });
      }
    } catch {
      setLikedPosts((prev) => (shouldLike ? prev.filter((id) => id !== postId) : [...prev, postId]));
      setReviews((prev) =>
        prev.map((review) =>
          review.id === postId
            ? { ...review, likes: Math.max(0, review.likes + (shouldLike ? -1 : 1)), likedByMe: !shouldLike }
            : review
        )
      );
      setBookDetailReviews((prev) =>
        prev.map((review) =>
          review.id === postId
            ? { ...review, likes: Math.max(0, review.likes + (shouldLike ? -1 : 1)), likedByMe: !shouldLike }
            : review
        )
      );
      showToast("좋아요 처리에 실패했습니다.");
    }
  };

  const openMore = (postId: string) => {
    setActivePostId(postId);
    setModal("more");
  };

  const deleteActivePost = async () => {
    setReviews((prev) => prev.filter((review) => review.id !== activePost.id));
    setModal(null);
    goBackFromPost();

    try {
      if (!activePost.id.startsWith("r")) {
        await deleteReview(activePost.id);
      }
      showToast("삭제되었습니다.");
    } catch {
      setReviews((prev) => [activePost, ...prev]);
      showToast("삭제에 실패했습니다.");
    }
  };

  const openBookRequestModal = () => {
    setBookRequestTitle(query.trim());
    setBookRequestAuthor("");
    setModal("bookRequest");
  };

  const submitBookRequest = async () => {
    const title = bookRequestTitle.trim();
    const author = bookRequestAuthor.trim();
    if (!title || !author) {
      showToast("책 제목과 저자를 입력해주세요.");
      return;
    }

    setIsSubmittingBookRequest(true);
    try {
      await createBookRequest({
        title,
        author,
        searchQuery: query.trim() || title,
        profileId: profile?.id
      });
      setModal(null);
      setBookRequestAuthor("");
      showToast("요청이 완료되었습니다.");
    } catch {
      showToast("책 등록 요청에 실패했습니다.");
    } finally {
      setIsSubmittingBookRequest(false);
    }
  };

  const submitReport = async () => {
    setModal(null);
    const targetCommentId = activeCommentId;
    setActiveCommentId(null);

    if (!profile) {
      showToast(`신고가 완료되었습니다. (${reportReason})`);
      return;
    }

    try {
      if (reportTarget === "comment") {
        if (!targetCommentId || targetCommentId.startsWith("c")) {
          showToast("신고가 완료되었습니다.");
          return;
        }
        await reportComment(profile.id, targetCommentId, reportReason);
      } else {
        if (activePost.id.startsWith("r")) {
          showToast("신고가 완료되었습니다.");
          return;
        }
        await reportReview(profile.id, activePost.id, reportReason);
      }
      showToast("신고가 완료되었습니다.");
    } catch {
      showToast("이미 신고했거나 신고 처리에 실패했습니다.");
    }
  };

  const editCommentBody = async (commentId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) {
      showToast("댓글 내용을 입력해주세요.");
      return;
    }

    const previous = postComments;
    setPostComments((prev) => prev.map((comment) => (comment.id === commentId ? { ...comment, body: trimmed } : comment)));

    if (commentId.startsWith("c")) {
      showToast("댓글이 수정되었습니다.");
      return;
    }

    try {
      await updateComment(commentId, trimmed);
      showToast("댓글이 수정되었습니다.");
    } catch {
      setPostComments(previous);
      showToast("댓글 수정에 실패했습니다.");
    }
  };

  const deleteActiveComment = async () => {
    const commentId = activeCommentId;
    setModal(null);
    setActiveCommentId(null);
    if (!commentId) return;

    const previous = postComments;
    const removed = previous.find((comment) => comment.id === commentId);
    setPostComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parentId !== commentId));
    if (activePost?.id) {
      setReviews((prev) =>
        prev.map((review) =>
          review.id === activePost.id ? { ...review, comments: Math.max(0, review.comments - 1) } : review
        )
      );
    }

    if (commentId.startsWith("c")) {
      showToast("댓글이 삭제되었습니다.");
      return;
    }

    try {
      await deleteComment(commentId);
      showToast("댓글이 삭제되었습니다.");
    } catch {
      setPostComments(previous);
      if (removed && activePost?.id) {
        setReviews((prev) =>
          prev.map((review) => (review.id === activePost.id ? { ...review, comments: review.comments + 1 } : review))
        );
      }
      showToast("댓글 삭제에 실패했습니다.");
    }
  };

  const submitReview = async () => {
    if (isSubmittingReview) return;

    if (draftRating === 0 || draftBody.trim().length < 30) {
      showToast("별점과 30자 이상의 감상을 입력해주세요.");
      return;
    }

    if (!profile) {
      showToast("로그인 후 감상을 등록할 수 있습니다.");
      return;
    }

    const trimmedBody = draftBody.trim();
    setIsSubmittingReview(true);

    try {
      if (editingReviewId) {
        await updateReview(editingReviewId, draftRating, trimmedBody);
        const updated = {
          rating: draftRating,
          body: trimmedBody,
          date: formatReviewDate()
        };
        setReviews((prev) => prev.map((review) => (review.id === editingReviewId ? { ...review, ...updated } : review)));
        setBookDetailReviews((prev) =>
          prev.map((review) => (review.id === editingReviewId ? { ...review, ...updated } : review))
        );
        setEditingReviewId(null);
        setDraftBody("");
        setDraftRating(0);
        setScreen("book");
        showToast("수정되었습니다.");
        return;
      }

      const createdId = await createReview(profile.id, activeBook.id, draftRating, trimmedBody, false, activeBook);
      trackEvent("write_post_complete");

      const nextReview: Review = {
        id: createdId,
        bookId: activeBook.id,
        user: profile.nickname ?? currentUser.name,
        tag: profile.tag ? `#${profile.tag}` : "",
        avatar: profile.avatar_url || "",
        rating: draftRating,
        body: trimmedBody,
        likes: 0,
        comments: 0,
        date: formatReviewDate(),
        mine: true
      };

      setReviews((prev) => [nextReview, ...prev]);
      setBookDetailReviews((prev) => [nextReview, ...prev]);
      setLiveBooks((prev) => {
        const related = [nextReview, ...reviews.filter((review) => review.bookId === activeBook.id)];
        const average =
          related.length > 0
            ? Math.round((related.reduce((sum, review) => sum + review.rating, 0) / related.length) * 10) / 10
            : draftRating;
        return mergeCatalogBooks(prev, [{ ...activeBook, rating: average }]);
      });
      setDraftBody("");
      setDraftRating(0);
      if (writeReturnScreen === "book") {
        setScreen("book");
      } else if (writeReturnScreen === "mypage") {
        setScreen("mypage");
      } else {
        setScreen("home");
      }
      showToast("등록되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      showToast(message || "서버 저장에 실패했습니다.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    if (!isValidEmail(email)) {
      showToast("이메일을 다시 입력해 주세요");
      return;
    }

    try {
      const loggedInProfile = await signInWithEmail(email, password);
      setProfile(loggedInProfile);
      if (loggedInProfile) setAppUserId(loggedInProfile.id);
      setSessionEmail(email);
      if (loggedInProfile) {
        const pendingBooks = readStoredOnboardingBooks();
        if (pendingBooks.length > 0) {
          await persistOnboardingFollows(loggedInProfile, pendingBooks).catch(() => undefined);
        }
        const dbFollows = await listFollowingBookIds(loggedInProfile.id).catch(() => []);
        const followIds = Array.from(new Set([...dbFollows, ...pendingBooks]));
        const [feed, mine] = await Promise.all([
          followIds.length > 0 ? listFeedReviews(followIds, loggedInProfile.id).catch(() => []) : Promise.resolve([]),
          listMyReviews(loggedInProfile.id, loggedInProfile.id).catch(() => [])
        ]);
        setFollowing(followIds);
        setReviews((prev) => mergeReviews(prev, mergeReviews(feed, mine)));
      }
      setScreen("home");
      showToast("로그인 되었습니다.");
      trackEvent("login_complete", { user_status: "member" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "EMAIL_NOT_CONFIRMED") {
        showToast("이메일 인증 후 로그인해 주세요.");
        return;
      }
      if (message === "PROFILE_NOT_READY") {
        showToast("프로필을 준비 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      showToast("이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  const handleSignup = async (email: string, password: string, nickname: string) => {
    if (!isValidEmail(email)) {
      showToast("이메일을 다시 입력해 주세요");
      return;
    }

    try {
      const createdProfile = await signUpWithEmail(email, password, nickname);
      setProfile(createdProfile);
      if (createdProfile) setAppUserId(createdProfile.id);
      setSessionEmail(email);
      if (createdProfile) {
        const pendingBooks = selectedBooks.length > 0 ? selectedBooks : readStoredOnboardingBooks();
        await persistOnboardingFollows(createdProfile, pendingBooks);
        const dbFollows = await listFollowingBookIds(createdProfile.id).catch(() => pendingBooks);
        const followIds = dbFollows.length > 0 ? dbFollows : pendingBooks;
        const [feed, mine] = await Promise.all([
          followIds.length > 0 ? listFeedReviews(followIds, createdProfile.id).catch(() => []) : Promise.resolve([]),
          listMyReviews(createdProfile.id, createdProfile.id).catch(() => [])
        ]);
        setFollowing(followIds);
        setReviews((prev) => mergeReviews(prev, mergeReviews(feed, mine)));
      }
      await supabase.auth.updateUser({ data: { bookmorak_registered: true } }).catch(() => undefined);
      setScreen("home");
      showToast("계정이 생성되었습니다.");
      trackEvent("sign_up_complete", { user_status: "member" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "ALREADY_REGISTERED" || /already|registered|exists/i.test(message)) {
        showToast("이미 가입된 이메일입니다.");
        return;
      }
      if (message === "PROFILE_NOT_READY") {
        showToast("계정은 생성됐지만 프로필 준비에 실패했습니다. 로그인해 주세요.");
        setScreen("login");
        return;
      }
      showToast(message || "계정 생성에 실패했습니다.");
    }
  };

  const submitComment = async (body: string, parentId?: string) => {
    if (!profile) {
      showToast("로그인 후 댓글을 작성할 수 있습니다.");
      return;
    }

    if (!activePost?.id || activePost.id.startsWith("r")) {
      showToast("샘플 게시글에는 댓글을 저장할 수 없습니다.");
      return;
    }

    try {
      const created = await createComment(profile.id, activePost.id, body, parentId);
      setPostComments((prev) => [...prev, created]);
      setReviews((prev) =>
        prev.map((review) => (review.id === activePost.id ? { ...review, comments: review.comments + 1 } : review))
      );
      trackEvent("comment_post", {
        post_id: activePost.id,
        screen: mapLikeCommentScreen("post")
      });
      showToast(parentId ? "답글이 등록되었습니다." : "댓글이 등록되었습니다.");
    } catch {
      showToast("댓글 등록에 실패했습니다.");
    }
  };

  const toggleCommentHeart = async (commentId: string) => {
    const shouldLike = !likedComments.includes(commentId);
    setLikedComments((prev) => (prev.includes(commentId) ? prev.filter((id) => id !== commentId) : [...prev, commentId]));
    setPostComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, likes: Math.max(0, comment.likes + (shouldLike ? 1 : -1)) } : comment
      )
    );

    if (!profile || commentId.startsWith("c")) return;

    try {
      await toggleCommentLike(profile.id, commentId, shouldLike);
    } catch {
      setLikedComments((prev) => (shouldLike ? prev.filter((id) => id !== commentId) : [...prev, commentId]));
      setPostComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, likes: Math.max(0, comment.likes + (shouldLike ? -1 : 1)) } : comment
        )
      );
      showToast("댓글 좋아요 처리에 실패했습니다.");
    }
  };

  const handleProfileImage = async (file: File) => {
    if (!profile?.auth_user_id) {
      showToast("로그인 후 이미지 업로드가 가능합니다.");
      return;
    }

    try {
      const avatarUrl = await uploadProfileImage(profile.auth_user_id, file);
      const updatedProfile = await updateSupabaseProfile(profile.id, { avatar_url: avatarUrl });
      setProfile(updatedProfile);
      showToast("프로필 사진이 변경되었습니다.");
    } catch {
      showToast("이미지 업로드에 실패했습니다.");
    }
  };

  return (
    <main className="shell">
      <div className="phone">
        {screen === "start" && (
          <StartScreen
            onStart={() => {
              trackEvent("onboarding_start");
              setScreen("onboarding");
            }}
            onLogin={() => setScreen("login")}
          />
        )}
        {screen === "onboarding" && (
          <OnboardingScreen
            bookCatalog={liveBooks}
            selectedBooks={selectedBooks}
            selectedGenre={selectedGenre}
            onBack={() => setScreen("start")}
            onGenre={setSelectedGenre}
            onToggleBook={(bookId) =>
              setSelectedBooks((prev) => {
                const next = prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId];
                writeStoredOnboardingBooks(next);
                return next;
              })
            }
            onNext={() => setScreen("preview")}
          />
        )}
        {screen === "preview" && (
          <PreviewScreen
            bookCatalog={liveBooks}
            selectedBooks={selectedBooks}
            onBack={() => setScreen("onboarding")}
            onAdd={() => setScreen("onboarding")}
            onSignup={() => {
              trackEvent("onboarding_complete");
              setScreen("signup");
            }}
          />
        )}
        {screen === "login" && <LoginScreen onBack={() => setScreen("start")} onLogin={handleLogin} onKakaoLogin={async () => {
          try {
            setAuthIntent("login");
            await signInWithKakao();
          } catch {
            showToast("카카오 로그인 설정을 확인해주세요.");
          }
        }} onSignup={() => setScreen("signup")} onToast={showToast} />}
        {screen === "signup" && <SignupScreen onBack={() => setScreen("preview")} onKakaoLogin={async () => {
          try {
            setAuthIntent("sign_up");
            await signInWithKakao();
          } catch {
            showToast("카카오 로그인 설정을 확인해주세요.");
          }
        }} onDone={handleSignup} onToast={showToast} onTerms={() => { setPolicyReturn("signup"); setScreen("terms"); }} onPrivacy={() => { setPolicyReturn("signup"); setScreen("privacy"); }} />}
        {screen === "home" && (
          <AppFrame
            active="home"
            onNavigate={(next) => (next === "write" ? openWritePicker("home") : setScreen(next))}
            scrollRef={homeScrollRef}
            savedScrollTop={homeScrollTopRef.current}
            onScrollTopChange={(top) => {
              homeScrollTopRef.current = top;
            }}
          >
            <HomeScreen
              reviews={feedReviews}
              bookCatalog={liveBooks}
              likedPosts={likedPosts}
              following={following}
              onBook={(bookId, postId) => openBook(bookId, "home", postId)}
              onPost={(postId) => openPost(postId, "home")}
              onLike={(postId) => toggleLike(postId, "home")}
              onMore={openMore}
              onToast={showToast}
              onNotifications={() => setScreen("notifications")}
              onFollowing={() => {
                setFollowingReturnScreen("home");
                setScreen("following");
              }}
            />
          </AppFrame>
        )}
        {screen === "notifications" && (
          <NotificationsScreen
            onBack={() => setScreen("home")}
            onPost={(postId) => openPost(postId, "notifications")}
            onClear={() => showToast("모두 읽기 처리되었습니다.")}
          />
        )}
        {screen === "search" && (
          <AppFrame
            active="search"
            onNavigate={(next) => (next === "write" ? openWritePicker("search") : setScreen(next))}
            scrollRef={searchScrollRef}
            savedScrollTop={searchScrollTopRef.current}
            onScrollTopChange={(top) => {
              searchScrollTopRef.current = top;
            }}
          >
            <SearchScreen
              query={query}
              selectedGenre={selectedGenre}
              following={following}
              results={filteredBooks}
              recentSearches={recentSearchTerms}
              isSyncing={isSyncing}
              onQuery={setQuery}
              onCommitQuery={(term) => {
                const next = term.trim();
                if (!next) return;
                setRecentSearchTerms((prev) => [next, ...prev.filter((item) => item !== next)].slice(0, 10));
              }}
              onClearRecent={() => setRecentSearchTerms([])}
              onRemoveRecent={(term) => setRecentSearchTerms((prev) => prev.filter((item) => item !== term))}
              onGenre={setSelectedGenre}
              onBook={(bookId) => openBook(bookId, "search")}
              onFollow={(bookId) => toggleFollow(bookId, "search")}
              onRequestBook={openBookRequestModal}
            />
          </AppFrame>
        )}
        {screen === "book" && (
          <BookDetailScreen
            book={activeBook}
            reviews={sortedBookReviews}
            following={following.includes(activeBook.id)}
            likedPosts={likedPosts}
            sortBy={sortBy}
            onBack={goBackFromBook}
            onFollow={() => toggleFollow(activeBook.id, "book")}
            onWrite={() => openWriteForBook(activeBook.id, "book")}
            onPost={(postId) => openPost(postId, "book")}
            onLike={(postId) => toggleLike(postId, "book")}
            onMore={openMore}
            onSort={() => setModal("sort")}
            onToast={showToast}
          />
        )}
        {screen === "write-pick" && (
          <WritePickScreen
            books={liveBooks}
            onBack={() => setScreen(writeReturnScreen)}
            onPick={(bookId) => openWriteForBook(bookId, writeReturnScreen)}
          />
        )}
        {screen === "write" && (
          <WriteScreen
            book={activeBook}
            rating={draftRating}
            body={draftBody}
            submitting={isSubmittingReview}
            following={following.includes(activeBook.id)}
            onBack={() => (draftRating || draftBody ? setModal("leaveWrite") : setScreen(editingReviewId ? "post" : writeReturnScreen === "book" ? "book" : "write-pick"))}
            onChangeBook={() => setScreen("write-pick")}
            onRating={setDraftRating}
            onBody={setDraftBody}
            onFollow={() => toggleFollow(activeBook.id, "write")}
            onSubmit={submitReview}
            onToast={showToast}
          />
        )}
        {screen === "mypage" && (
          <AppFrame active="mypage" onNavigate={(next) => (next === "write" ? openWritePicker("mypage") : setScreen(next))}>
            <MyPageScreen
              reviews={myReviews}
              profile={profile}
              bookCatalog={liveBooks}
              followingCount={following.length}
              onSettings={() => setScreen("settings")}
              onProfile={() => setScreen("profile")}
              onFollowing={() => {
                setFollowingReturnScreen("mypage");
                setScreen("following");
              }}
              onBook={(bookId, postId) => openBook(bookId, "mypage", postId)}
              onPost={(postId) => openPost(postId, "mypage")}
              onMore={openMore}
              onToast={showToast}
            />
          </AppFrame>
        )}
        {screen === "following" && (
          <FollowingScreen
            following={following}
            bookCatalog={liveBooks}
            onBack={() => setScreen(followingReturnScreen)}
            onBook={(bookId) => openBook(bookId, "following")}
            onFollow={(bookId) => toggleFollow(bookId, "following")}
          />
        )}
        {screen === "settings" && <SettingsScreen onBack={() => setScreen("mypage")} onTerms={() => { setPolicyReturn("settings"); setScreen("terms"); }} onPrivacy={() => { setPolicyReturn("settings"); setScreen("privacy"); }} onLogout={() => setModal("logout")} onDeleteAccount={() => setModal("deleteAccount")} onToast={showToast} />}
        {screen === "terms" && <PolicyScreen title="이용약관 정보" onBack={() => setScreen(policyReturn)} />}
        {screen === "privacy" && <PolicyScreen title="개인정보 수집 및 이용 정보" onBack={() => setScreen(policyReturn)} privacy />}
        {screen === "profile" && <ProfileScreen profile={profile} sessionEmail={sessionEmail} onBack={() => setScreen("mypage")} onPassword={() => setScreen("password")} onPhoto={() => setModal("profilePhoto")} onSave={async (values) => {
          if (!profile) {
            showToast("로그인 후 프로필을 저장할 수 있습니다.");
            return;
          }
          try {
            const updated = await updateSupabaseProfile(profile.id, values);
            setProfile(updated);
            showToast("변경되었습니다.");
          } catch {
            showToast("프로필 저장에 실패했습니다.");
          }
        }} />}
        {screen === "password" && <PasswordScreen onBack={() => setScreen("profile")} onDone={() => setScreen("profile")} onToast={showToast} />}
        {screen === "post" && (
          <PostDetailScreen
            review={activePost}
            book={liveBooks.find((book) => book.id === activePost.bookId) ?? activeBook}
            liked={likedPosts.includes(activePost.id)}
            comments={postComments}
            likedComments={likedComments}
            onBack={goBackFromPost}
            onBook={(bookId) => openBook(bookId, "post", activePost.id)}
            onLike={() => toggleLike(activePost.id, "post")}
            onMore={() => openMore(activePost.id)}
            onSubmitComment={submitComment}
            onToggleCommentLike={toggleCommentHeart}
            onEditComment={editCommentBody}
            onDeleteComment={(commentId) => {
              setActiveCommentId(commentId);
              setModal("deleteComment");
            }}
            onReportComment={(commentId) => {
              setActiveCommentId(commentId);
              setReportTarget("comment");
              setReportReason("스팸/홍보성");
              setModal("report");
            }}
          />
        )}
        <ModalLayer
          modal={modal}
          activePost={activePost}
          reportReason={reportReason}
          sortBy={sortBy}
          bookRequestTitle={bookRequestTitle}
          bookRequestAuthor={bookRequestAuthor}
          isSubmittingBookRequest={isSubmittingBookRequest}
          onClose={() => {
            setModal(null);
            setActiveCommentId(null);
            setReportTarget("post");
          }}
          onOpenReport={() => {
            setReportTarget("post");
            setActiveCommentId(null);
            setModal("report");
          }}
          onOpenDelete={() => setModal("deletePost")}
          onReportReason={setReportReason}
          onReport={submitReport}
          onDelete={deleteActivePost}
          onDeleteComment={deleteActiveComment}
          onEdit={() => {
            setModal(null);
            setEditingReviewId(activePost.id);
            setDraftRating(activePost.rating);
            setDraftBody(activePost.body);
            setActiveBookId(activePost.bookId);
            setWriteReturnScreen("post");
            setScreen("write");
          }}
          onLeaveWrite={() => {
            setModal(null);
            setDraftRating(0);
            setDraftBody("");
            setEditingReviewId(null);
            setScreen(writeReturnScreen === "book" ? "book" : writeReturnScreen);
          }}
          onBookRequestTitle={setBookRequestTitle}
          onBookRequestAuthor={setBookRequestAuthor}
          onSubmitBookRequest={submitBookRequest}
          onLogout={() => {
            setModal(null);
            signOut().finally(() => {
              clearAppUserId();
              setProfile(null);
              setFollowing([]);
              setScreen("start");
              showToast("로그아웃 되었습니다.");
            });
          }}
          onDeleteAccount={() => {
            setModal(null);
            deleteCurrentAccount()
              .then(() => {
                clearAppUserId();
                setProfile(null);
                setFollowing([]);
                setReviews([]);
                setScreen("start");
                showToast("계정 삭제되었습니다.");
              })
              .catch(() => showToast("계정 삭제에 실패했습니다."));
          }}
          onProfilePhoto={(kind) => {
            setModal(null);
            if (kind === "default") {
              if (profile) {
                updateSupabaseProfile(profile.id, { avatar_url: null }).then(setProfile).catch(() => showToast("프로필 변경에 실패했습니다."));
              }
              showToast("기본 프로필로 변경되었습니다.");
            } else {
              fileInputRef.current?.click();
            }
          }}
          onSort={(nextSort) => {
            setSortBy(nextSort);
            setModal(null);
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleProfileImage(file);
            event.currentTarget.value = "";
          }}
        />
        {toast && <div className="toast">{toast}</div>}
        {showHomeGuide && profile && (
          <div className="home-guide-overlay" role="dialog" aria-modal="true" aria-label="홈 피드 안내">
            <button
              type="button"
              className="home-guide-close"
              aria-label="닫기"
              onClick={() => {
                markHomeGuideSeen(profile.id);
                setShowHomeGuide(false);
              }}
            >
              ×
            </button>
            <div className="home-guide-copy">
              <strong>
                사람이 아닌 책을 팔로우해서
                <br />
                나만의 감상글 피드를 만들어요
              </strong>
              <p>
                내가 고른 책들로 채워지는 나만의 피드,
                <br />
                그 안에서 모락모락 피어나는 이야기
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StartScreen({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <section className="start-screen">
      <Image className="start-bg" src={startBgIcon} alt="" fill unoptimized priority />
      <div className="logo-hero">
        <Image className="start-character" src={startCharacterIcon} alt="책모락 캐릭터" width={280} height={230} unoptimized priority />
        <Image className="start-logo" src={startLogoIcon} alt="책모락" width={220} height={72} unoptimized priority />
        <Image className="start-service" src={startServiceIcon} alt="책 이야기가 모락모락 피어나는 곳" width={260} height={36} unoptimized priority />
      </div>
      <div className="start-actions">
        <button className="primary-button" onClick={onStart}>
          시작하기
        </button>
        <p className="start-login-line">
          이미 책모락 회원이신가요?{" "}
          <button type="button" className="start-login-link" onClick={onLogin}>
            로그인
          </button>
        </p>
      </div>
    </section>
  );
}

function AppFrame({
  children,
  active,
  onNavigate,
  scrollRef,
  savedScrollTop = 0,
  onScrollTopChange
}: {
  children: React.ReactNode;
  active: "home" | "search" | "write" | "mypage";
  onNavigate: (screen: Screen) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  savedScrollTop?: number;
  onScrollTopChange?: (top: number) => void;
}) {
  useEffect(() => {
    const node = scrollRef?.current;
    if (!node || savedScrollTop <= 0) return;

    const restore = () => {
      node.scrollTop = savedScrollTop;
    };

    restore();
    const frame = window.requestAnimationFrame(restore);
    const timer = window.setTimeout(restore, 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [savedScrollTop, scrollRef]);

  return (
    <>
      <div
        ref={scrollRef}
        className="scroll-content with-tab"
        onScroll={(event) => onScrollTopChange?.(event.currentTarget.scrollTop)}
      >
        {children}
      </div>
      <nav className="tabbar">
        <TabButton active={active === "home"} icon={active === "home" ? homeActiveIcon : homeIcon} label="홈" onClick={() => onNavigate("home")} />
        <TabButton active={active === "search"} icon={active === "search" ? searchActiveIcon : searchIcon} label="검색" onClick={() => onNavigate("search")} />
        <TabButton active={active === "write"} icon={active === "write" ? writeActiveIcon : writeIcon} label="게시글 생성" onClick={() => onNavigate("write")} />
        <TabButton active={active === "mypage"} icon={active === "mypage" ? myActiveIcon : myIcon} label="마이" onClick={() => onNavigate("mypage")} />
      </nav>
    </>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: IconSource; label: string; onClick: () => void }) {
  return (
    <button className={active ? "tab active" : "tab"} onClick={onClick}>
      <IconAsset src={icon} alt="" size={24} />
      <span>{label}</span>
    </button>
  );
}

function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="header">
      <button className="icon-button" onClick={onBack} aria-label="뒤로가기">
        {onBack && <ChevronLeft />}
      </button>
      <strong className="header-title">{title ?? <LogoText />}</strong>
      <div className="header-right">{right}</div>
    </header>
  );
}

function LogoText() {
  return (
    <span className="logo-text">
      <span>책</span>모락
    </span>
  );
}

function IconAsset({ src, alt, size, className }: { src: IconSource; alt: string; size: number; className?: string }) {
  return <Image className={className ? `icon-asset ${className}` : "icon-asset"} src={src} alt={alt} width={size} height={size} unoptimized />;
}

function HomeScreen({
  reviews,
  bookCatalog,
  likedPosts,
  following,
  onBook,
  onPost,
  onLike,
  onMore,
  onToast,
  onNotifications,
  onFollowing
}: {
  reviews: Review[];
  bookCatalog: Book[];
  likedPosts: string[];
  following: string[];
  onBook: (bookId: string, postId: string) => void;
  onPost: (postId: string) => void;
  onLike: (postId: string) => void;
  onMore: (postId: string) => void;
  onToast: (message: string) => void;
  onNotifications: () => void;
  onFollowing: () => void;
}) {
  const followedBooks = following
    .map((bookId) => bookCatalog.find((book) => book.id === bookId))
    .filter((book): book is Book => Boolean(book))
    .slice(0, 12);

  return (
    <section className="screen">
      <div className="home-top">
        <LogoText />
        <button className="bell-button" onClick={onNotifications} aria-label="알림">
          <Bell />
        </button>
      </div>
      <button type="button" className="home-bookshelf" onClick={onFollowing}>
        <div className="home-bookshelf-label">
          <strong>팔로우 중인 책</strong>
          <span>{following.length}권</span>
        </div>
        <div className="home-bookshelf-shelf">
          <Image src={bookshelfIcon} alt="" className="home-bookshelf-bg" unoptimized />
          <div className="home-bookshelf-spines">
            {followedBooks.length === 0 ? (
              <span className="home-bookshelf-empty">관심 책을 팔로우하면 여기에 쌓여요</span>
            ) : (
              followedBooks.map((book) => (
                <span key={book.id} className="home-book-spine" style={{ background: spineColor(book.id) }} title={book.title}>
                  <em>{book.title.slice(0, 4).trimEnd()}</em>
                </span>
              ))
            )}
          </div>
        </div>
      </button>
      {reviews.length === 0 ? (
        <EmptyState title="아직 게시글이 없어요." body="팔로우한 책의 감상글이 생기면 이곳에 보여드릴게요." />
      ) : (
        reviews.map((review, index) => (
          <ReviewCard
            key={review.id}
            review={review}
            book={bookCatalog.find((book) => book.id === review.bookId) ?? bookCatalog[0] ?? fixedBookPreviews[0]}
            liked={likedPosts.includes(review.id)}
            trackHomeViewIndex={index}
            onBook={() => onBook(review.bookId, review.id)}
            onPost={() => onPost(review.id)}
            onLike={() => onLike(review.id)}
            onMore={() => onMore(review.id)}
            onToast={onToast}
          />
        ))
      )}
    </section>
  );
}

function SearchScreen({
  query,
  selectedGenre,
  following,
  results,
  recentSearches,
  isSyncing,
  onQuery,
  onCommitQuery,
  onClearRecent,
  onRemoveRecent,
  onGenre,
  onBook,
  onFollow,
  onRequestBook
}: {
  query: string;
  selectedGenre: string;
  following: string[];
  results: Book[];
  recentSearches: string[];
  isSyncing: boolean;
  onQuery: (query: string) => void;
  onCommitQuery: (query: string) => void;
  onClearRecent: () => void;
  onRemoveRecent: (term: string) => void;
  onGenre: (genre: string) => void;
  onBook: (bookId: string) => void;
  onFollow: (bookId: string) => void;
  onRequestBook: () => void;
}) {
  return (
    <section className="screen">
      <label className="search-box">
        <IconAsset src={searchFieldIcon} alt="" size={20} />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommitQuery(query);
          }}
          onBlur={() => onCommitQuery(query)}
          placeholder="검색어를 입력해 주세요."
        />
        {query && (
          <button onClick={() => onQuery("")} aria-label="검색어 삭제">
            <IconAsset src={deleteIcon} alt="" size={18} />
          </button>
        )}
      </label>
      {!query && (
        <>
          <div className="section-row">
            <h2>최근 검색어</h2>
            {recentSearches.length > 0 && (
              <button className="text-button" onClick={onClearRecent}>
                전체 삭제 <IconAsset src={deleteIcon} alt="" size={14} />
              </button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <p className="hint">최근 검색어가 없습니다</p>
          ) : (
            <div className="chips">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  className="chip"
                  onClick={() => {
                    onQuery(item);
                    onCommitQuery(item);
                  }}
                >
                  {item}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${item} 삭제`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveRecent(item);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onRemoveRecent(item);
                      }
                    }}
                  >
                    <IconAsset src={deleteIcon} alt="" size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="section-row">
        <h2>{query ? `"${query}" 검색 결과 ${results.length}건` : "요즘 인기 있는 책"}</h2>
        {isSyncing && <span className="sync-badge">알라딘 검색 중</span>}
      </div>
      <div className="chips genre-chips">
        {genres.map((genre) => (
          <button key={genre} className={selectedGenre === genre ? "chip selected" : "chip"} onClick={() => onGenre(genre)}>
            {genre}
          </button>
        ))}
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="아직 등록되지 않은 책이에요."
          body="곧 더 많은 책을 준비할게요. 조금만 기다려 주세요."
          actionLabel={query.trim() ? "책 등록 요청하기" : undefined}
          onAction={query.trim() ? onRequestBook : undefined}
        />
      ) : (
        <div className="book-grid">
          {results.map((book) => (
            <article key={book.id} className="book-tile">
              <button className="book-tile-main" onClick={() => onBook(book.id)}>
                <BookCover book={book} />
                <strong>{book.title}</strong>
                <span>{book.author}</span>
                <small>★ {book.rating.toFixed(1)} / 5.0</small>
              </button>
              <button
                className={following.includes(book.id) ? "mini-follow following" : "mini-follow"}
                onClick={() => onFollow(book.id)}
              >
                {following.includes(book.id) ? "팔로잉" : "팔로우"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function BookDetailScreen({ book, reviews, following, likedPosts, sortBy, onBack, onFollow, onWrite, onPost, onLike, onMore, onSort, onToast }: { book: Book; reviews: Review[]; following: boolean; likedPosts: string[]; sortBy: "latest" | "popular"; onBack: () => void; onFollow: () => void; onWrite: () => void; onPost: (postId: string) => void; onLike: (postId: string) => void; onMore: (postId: string) => void; onSort: () => void; onToast: (message: string) => void }) {
  const [introExpanded, setIntroExpanded] = useState(false);
  const introText = sanitizeBookDescription(book.description);
  const isLoadingIntro = introText.includes("실시간으로 불러오는 중");
  const canExpandIntro = introText.length > 120;
  const intro = !canExpandIntro || introExpanded ? introText : `${introText.slice(0, 120)}...`;

  useEffect(() => {
    setIntroExpanded(false);
  }, [book.id]);

  return (
    <>
      <section className="scroll-content screen detail-screen">
        <Header onBack={onBack} />
        <div className="book-hero">
          <BookCover book={book} />
          <div>
            <h1>{book.title}</h1>
            <p>{book.author}</p>
            <strong className="rating-line">★ {book.rating.toFixed(1)}</strong>
            <div className="tags">{book.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            <div className="book-actions">
              <p>
                <strong>{formatCount(book.followers)}</strong> 팔로워
              </p>
              <button className={following ? "outline-small active" : "outline-small"} onClick={onFollow}>
                {following ? "팔로우 취소" : "팔로우"}
              </button>
            </div>
          </div>
        </div>
        <section className="book-intro">
          <h2>책 소개</h2>
          {isLoadingIntro ? (
            <p className="hint">알라딘 API에서 책 소개를 불러오고 있습니다.</p>
          ) : (
            <p>
              {intro}
              {canExpandIntro && (
                <button onClick={() => setIntroExpanded((prev) => !prev)}>
                  {introExpanded ? "접기" : "더보기"}
                </button>
              )}
            </p>
          )}
        </section>
        <div className="sort-row">
          <button onClick={onSort}>
            {sortBy === "latest" ? "최신순" : "좋아요순"} <ChevronRight size={16} />
          </button>
        </div>
        {reviews.length === 0 ? (
          <EmptyState title="아직 게시글이 없어요." body="이 책의 첫 번째 감상을 남겨보세요." />
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              book={book}
              compact
              liked={likedPosts.includes(review.id)}
              onBook={() => undefined}
              onPost={() => onPost(review.id)}
              onLike={() => onLike(review.id)}
              onMore={() => onMore(review.id)}
              onToast={onToast}
            />
          ))
        )}
      </section>
      <button className="primary-button detail-fixed-write" onClick={onWrite}>
        작성하기
      </button>
    </>
  );
}

function WritePickScreen({ books, onBack, onPick }: { books: Book[]; onBack: () => void; onPick: (bookId: string) => void }) {
  const [query, setQuery] = useState("");
  const filteredBooks = useMemo(() => {
    const normalized = normalizeSearchText(query);
    if (!normalized) return books;
    return books.filter((book) => normalizeSearchText(`${book.title} ${book.author}`).includes(normalized));
  }, [books, query]);

  return (
    <section className="scroll-content screen write-pick-screen">
      <Header title="책 선택" onBack={onBack} />
      <p className="lead">감상을 남길 책을 선택해주세요.</p>
      <label className="search-box write-pick-search">
        <IconAsset src={searchFieldIcon} alt="" size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="검색어를 입력해 주세요."
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="검색어 삭제">
            <IconAsset src={deleteIcon} alt="" size={18} />
          </button>
        )}
      </label>
      <div className="book-list onboarding-book-list">
        {filteredBooks.length === 0 ? (
          <EmptyState title="검색 결과가 없어요." body="다른 책 제목이나 작가명으로 다시 검색해보세요." />
        ) : (
          filteredBooks.map((book) => (
            <button key={book.id} className="book-row" onClick={() => onPick(book.id)}>
              <BookCover book={book} />
              <span>
                <strong>{book.title}</strong>
                <small>{book.author}</small>
                <em>{book.genres.join(" · ")}</em>
              </span>
              <b>선택</b>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function WriteScreen({
  book,
  rating,
  body,
  submitting = false,
  following = true,
  onBack,
  onChangeBook,
  onRating,
  onBody,
  onFollow,
  onSubmit,
  onToast
}: {
  book: Book;
  rating: number;
  body: string;
  submitting?: boolean;
  following?: boolean;
  onBack: () => void;
  onChangeBook: () => void;
  onRating: (rating: number) => void;
  onBody: (body: string) => void;
  onFollow: () => void;
  onSubmit: () => void;
  onToast: (message: string) => void;
}) {
  const canSubmit = rating > 0 && body.trim().length >= 30 && !submitting;

  return (
    <section className="scroll-content screen write-screen">
      <Header title="게시글 작성하기" onBack={onBack} />
      <div className="selected-book-card">
        <BookCover book={book} />
        <div>
          <strong>{book.title}</strong>
          <span>{book.author}</span>
        </div>
        <button onClick={onChangeBook}>변경</button>
      </div>
      {!following && (
        <div className="write-follow-banner">
          <div>
            <strong>팔로우 하지 않은 책이에요</strong>
            <p>팔로우 하시겠습니까?</p>
          </div>
          <button type="button" onClick={onFollow}>
            팔로우
          </button>
        </div>
      )}
      <h2>이 책은 어떠셨나요?</h2>
      <div className="rating-picker">
        {[1, 2, 3, 4, 5].map((score) => (
          <button key={score} onClick={() => onRating(score)} aria-label={`${score}점`}>
            <IconAsset src={score <= rating ? starActiveIcon : starIcon} alt="" size={42} />
          </button>
        ))}
        <strong>{rating}/5</strong>
      </div>
      <p className="hint">별점을 탭 해주세요</p>
      <div className="guide-box">
        <strong>리뷰 작성 가이드</strong>
        <p>다른 사용자를 존중하는 표현을 사용해주세요. 스포일러와 부적절한 내용은 사전 안내 없이 삭제될 수 있습니다.</p>
      </div>
      <label className="textarea-card">
        <textarea
          value={body}
          maxLength={1000}
          onChange={(event) => onBody(event.target.value)}
          placeholder="이 책을 읽으며 떠오른 질문, 감상, 남기고 싶은 문장을 자유롭게 적어보세요"
          disabled={submitting}
        />
        <span>{body.length}/1000</span>
      </label>
      <p className="hint">최소 30자 이상, 최대 1000자까지 입력할 수 있습니다. (띄어쓰기 포함)</p>
      <button
        className={canSubmit ? "primary-button submit" : "primary-button submit disabled"}
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        {submitting ? "등록 중..." : "등록하기"}
      </button>
    </section>
  );
}

function MyPageScreen({ reviews, profile, bookCatalog, followingCount, onSettings, onProfile, onFollowing, onBook, onPost, onMore, onToast }: { reviews: Review[]; profile: Profile | null; bookCatalog: Book[]; followingCount: number; onSettings: () => void; onProfile: () => void; onFollowing: () => void; onBook: (bookId: string, postId: string) => void; onPost: (postId: string) => void; onMore: (postId: string) => void; onToast: (message: string) => void }) {
  return (
    <section className="screen mypage-screen">
      <Header title="마이페이지" right={<button className="settings-button" onClick={onSettings}><IconAsset src={settingsIcon} alt="설정" size={24} /></button>} />
      <div className="profile-summary">
        <div className="profile-left">
          <div className="avatar large">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="프로필 이미지" width={104} height={104} unoptimized />
            ) : (
              <Image src={defaultAvatarIcon} alt="기본 프로필" width={104} height={104} unoptimized />
            )}
          </div>
          <button onClick={onProfile}>프로필 편집</button>
        </div>
        <div className="profile-copy">
          <strong>{profile?.nickname ?? currentUser.name}{profile?.tag ? `#${profile.tag}` : ""}</strong>
          <p>{profile?.bio ?? currentUser.intro}</p>
          <div className="profile-stats">
            <strong>{reviews.length}<span>게시글</span></strong>
            <button onClick={onFollowing}>
              <strong>{followingCount}</strong>
              <span>팔로잉</span>
            </button>
          </div>
        </div>
      </div>
      <h2>게시글</h2>
      {reviews.length === 0 ? (
        <div className="mypage-empty">
          <strong>작성한 게시글이 없습니다.</strong>
          <p>책을 선택하고 첫 감상을 남겨보세요.</p>
        </div>
      ) : (
        reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            book={bookCatalog.find((book) => book.id === review.bookId) ?? bookCatalog[0] ?? fixedBookPreviews[0]}
            onBook={() => onBook(review.bookId, review.id)}
            onPost={() => onPost(review.id)}
            onLike={() => onToast("내 게시글에도 좋아요를 남겼어요.")}
            onMore={() => onMore(review.id)}
            onToast={onToast}
            variant="mypage"
          />
        ))
      )}
    </section>
  );
}

function ReviewCard({
  review,
  book,
  liked = false,
  compact = false,
  variant,
  trackHomeViewIndex,
  onBook,
  onPost,
  onLike,
  onMore,
  onToast
}: {
  review: Review;
  book: Book;
  liked?: boolean;
  compact?: boolean;
  variant?: "mypage";
  trackHomeViewIndex?: number;
  onBook: () => void;
  onPost: () => void;
  onLike: () => void;
  onMore?: () => void;
  onToast: (message: string) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (trackHomeViewIndex === undefined || !cardRef.current) return;

    const node = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            trackHomePostView(review.id, trackHomeViewIndex);
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [review.id, trackHomeViewIndex]);

  return (
    <article
      ref={cardRef}
      className={[compact ? "review-card compact-card" : "review-card", variant === "mypage" ? "mypage-review-card" : ""].filter(Boolean).join(" ")}
    >
      {!compact && (
        <button className="book-strip" onClick={onBook}>
          <BookCover book={book} />
          <span>
            <strong>{book.title}</strong>
            <small>{book.author}</small>
          </span>
          <ChevronRight />
        </button>
      )}
      <div className="review-author">
        <UserAvatar value={review.avatar} />
        <strong>{review.user}</strong>
        <RatingStars rating={review.rating} />
        <button onClick={() => (onMore ? onMore() : onToast(review.mine ? "수정하기 / 삭제하기" : "신고하기"))}>
          <MoreHorizontal />
        </button>
      </div>
      <button className="review-body" onClick={onPost}>
        {truncateReviewBody(review.body, 150)}
      </button>
      <footer className="review-meta">
        <button className={liked ? "liked" : ""} onClick={onLike}>
          <IconAsset src={liked ? likeActiveIcon : likeIcon} alt="" size={17} /> {formatCount(review.likes)}
        </button>
        <button onClick={onPost}>
          <IconAsset src={commentIcon} alt="" size={17} /> {review.comments}
        </button>
        <time>{review.date}</time>
      </footer>
    </article>
  );
}

function OnboardingScreen({ bookCatalog, selectedBooks, selectedGenre, onBack, onGenre, onToggleBook, onNext }: { bookCatalog: Book[]; selectedBooks: string[]; selectedGenre: string; onBack: () => void; onGenre: (genre: string) => void; onToggleBook: (bookId: string) => void; onNext: () => void }) {
  const [query, setQuery] = useState("");
  const visibleBooks = useMemo(() => {
    const normalized = normalizeSearchText(query);
    return bookCatalog.filter((book) => {
      const genreMatches = selectedGenre === "전체" || book.genres.includes(selectedGenre);
      const queryMatches = !normalized || normalizeSearchText(`${book.title} ${book.author}`).includes(normalized);
      return genreMatches && queryMatches;
    });
  }, [bookCatalog, query, selectedGenre]);

  return (
    <section className="scroll-content screen onboarding-screen">
      <Header title="관심 도서 선택" onBack={onBack} />
      <div className="progress"><span style={{ width: "50%" }} /></div>
      <p className="lead">관심 있는 책을 2권 이상 선택하면 선택한 책에 대한 게시글을 한 곳에서 볼 수 있어요.</p>
      <label className="search-box write-pick-search">
        <IconAsset src={searchFieldIcon} alt="" size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="검색어를 입력해 주세요."
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="검색어 삭제">
            <IconAsset src={deleteIcon} alt="" size={18} />
          </button>
        )}
      </label>
      <div className="chips genre-chips">
        {genres.map((genre) => (
          <button key={genre} className={selectedGenre === genre ? "chip selected" : "chip"} onClick={() => onGenre(genre)}>
            {genre}
          </button>
        ))}
      </div>
      <div className="book-list onboarding-book-list">
        {visibleBooks.length === 0 ? (
          <EmptyState title="검색 결과가 없어요." body="다른 책 제목이나 작가명으로 다시 검색해보세요." />
        ) : (
          visibleBooks.map((book) => (
            <button key={book.id} className={selectedBooks.includes(book.id) ? "book-row picked" : "book-row"} onClick={() => onToggleBook(book.id)}>
              <BookCover book={book} />
              <span>
                <strong>{book.title}</strong>
                <small>{book.author}</small>
                <em>{book.genres.join(" · ")}</em>
              </span>
              <b>{selectedBooks.includes(book.id) ? "선택됨" : "선택"}</b>
            </button>
          ))
        )}
      </div>
      <div className="sticky-cta">
        <p>선택한 책 {selectedBooks.length}권</p>
        <button className={selectedBooks.length >= 2 ? "primary-button" : "primary-button disabled"} disabled={selectedBooks.length < 2} onClick={onNext}>
          선택 완료
        </button>
      </div>
    </section>
  );
}

function PreviewScreen({ bookCatalog, selectedBooks, onBack, onAdd, onSignup }: { bookCatalog: Book[]; selectedBooks: string[]; onBack: () => void; onAdd: () => void; onSignup: () => void }) {
  const selected = bookCatalog.filter((book) => selectedBooks.includes(book.id));
  const [previewReviews, setPreviewReviews] = useState<Review[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setLoadingPreview(true);
      try {
        const fromDb =
          selectedBooks.length > 0 ? await listFeedReviews(selectedBooks).catch(() => [] as Review[]) : ([] as Review[]);
        let next = fromDb.slice(0, 3);

        if (next.length < 3 && selectedBooks.length > 0) {
          const fillers = sampleReviews.slice(0, 3 - next.length).map((review, index) => ({
            ...review,
            id: `preview-${review.id}-${index}`,
            bookId: selectedBooks[(next.length + index) % selectedBooks.length]
          }));
          next = [...next, ...fillers].slice(0, 3);
        }

        if (isMounted) setPreviewReviews(next);
      } finally {
        if (isMounted) setLoadingPreview(false);
      }
    }

    void loadPreview();
    return () => {
      isMounted = false;
    };
  }, [selectedBooks]);

  return (
    <section className="scroll-content screen preview-screen">
      <Header title="피드 미리보기" onBack={onBack} />
      <p className="lead">선택한 책으로 꾸려진 감상글을 만나볼 수 있어요.</p>
      <div className="selected-book-scroll">
        {selected.map((book) => (
          <button key={book.id} className="mini-book">
            <BookCover book={book} />
            <span>{book.title}</span>
          </button>
        ))}
        <button className="add-book" onClick={onAdd}>
          + 책 추가하기
        </button>
      </div>
      {loadingPreview ? (
        <p className="hint" style={{ textAlign: "center", padding: "40px 0" }}>
          감상글을 불러오는 중이에요...
        </p>
      ) : previewReviews.length === 0 ? (
        <EmptyState title="아직 미리볼 감상글이 없어요." body="선택한 책에 대한 감상글이 등록되면 이곳에 보여드릴게요." />
      ) : (
        <div className="preview-feed">
          {previewReviews.map((review) => {
            const book = bookCatalog.find((item) => item.id === review.bookId) ?? selected[0] ?? bookCatalog[0];
            return (
              <ReviewCard
                key={review.id}
                review={review}
                book={book}
                liked={false}
                onBook={() => undefined}
                onPost={() => undefined}
                onLike={() => undefined}
                onToast={() => undefined}
              />
            );
          })}
        </div>
      )}
      <button className="primary-button floating-start" onClick={onSignup}>
        시작하기
      </button>
    </section>
  );
}

function LoginScreen({ onBack, onLogin, onKakaoLogin, onSignup, onToast }: { onBack: () => void; onLogin: (email: string, password: string) => void; onKakaoLogin: () => void; onSignup: () => void; onToast: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = isValidEmail(email) && password.length > 0;

  return (
    <section className="screen auth-screen">
      <Header title="로그인" onBack={onBack} />
      <LogoText />
      <button className="social kakao" onClick={onKakaoLogin}>카카오로 로그인</button>
      <label className="field"><span>이메일</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력해주세요" /></label>
      <label className="field"><span>비밀번호</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해주세요" /></label>
      <button
        className={canSubmit ? "primary-button" : "primary-button disabled"}
        disabled={!canSubmit}
        onClick={() => {
          if (!isValidEmail(email)) {
            onToast("이메일을 다시 입력해 주세요");
            return;
          }
          onLogin(email, password);
        }}
      >
        로그인 하기
      </button>
      <button className="link-button" onClick={onSignup}>아직 계정이 없나요? 이메일로 시작하기</button>
    </section>
  );
}

function SignupScreen({ onBack, onKakaoLogin, onDone, onToast, onTerms, onPrivacy }: { onBack: () => void; onKakaoLogin: () => void; onDone: (email: string, password: string, nickname: string) => void; onToast: (message: string) => void; onTerms: () => void; onPrivacy: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [stage, setStage] = useState<"email" | "verify" | "account">("email");

  if (stage === "verify") {
    return (
      <section className="screen auth-screen">
        <Header title="이메일 인증" onBack={() => setStage("email")} />
        <div className="verify-card">
          <Mail />
          <h2>인증 메일을 보냈어요</h2>
          <p>{email || "입력한 이메일"}로 보낸 인증 메일을 확인한 뒤 아래 버튼을 눌러주세요. 유효시간은 3분입니다.</p>
        </div>
        <button className="primary-button" onClick={() => setStage("account")}>확인</button>
        <button className="outline-button" onClick={() => onToast("인증 메일을 다시 확인해주세요.")}>인증 메일 재전송</button>
      </section>
    );
  }

  if (stage === "email") {
    const canVerify = isValidEmail(email) && agree;
    return (
      <section className="screen auth-screen">
        <Header title="시작하기" onBack={onBack} />
        <LogoText />
        <button className="social kakao" onClick={onKakaoLogin}>카카오로 시작하기</button>
        <div className="auth-divider"><span />이메일로 시작하기<span /></div>
        <label className="field"><span>이메일</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력해주세요" /></label>
        <label className="agree"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> 전체 동의합니다.</label>
        <button className="policy-row" onClick={onTerms}>[필수] 이용 약관 동의 <ChevronRight /></button>
        <button className="policy-row" onClick={onPrivacy}>[필수] 개인정보 수집 및 이용 동의 <ChevronRight /></button>
        <button
          className={canVerify ? "primary-button" : "primary-button disabled"}
          disabled={!canVerify}
          onClick={() => {
            if (!isValidEmail(email)) {
              onToast("이메일을 다시 입력해 주세요");
              return;
            }
            setStage("verify");
          }}
        >
          인증하기
        </button>
      </section>
    );
  }

  return (
    <section className="screen auth-screen">
      <Header title="계정 생성" onBack={onBack} />
      <div className="avatar upload">
        <Image src={defaultAvatarIcon} alt="기본 프로필" width={104} height={104} unoptimized />
      </div>
      <label className="field"><span>닉네임</span><input maxLength={10} value={name} onChange={(event) => setName(event.target.value)} placeholder="닉네임을 입력해주세요" /></label>
      <label className="field"><span>비밀번호</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="영문, 숫자, 특수문자 포함 8~16자" /></label>
      <label className="field"><span>비밀번호 확인</span><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="비밀번호를 다시 입력해주세요" /></label>
      <label className="agree"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> 만 14세 이상, 이용약관, 개인정보 수집에 전체 동의합니다.</label>
      <button className={name.length > 0 && agree && password.length >= 8 && password === passwordConfirm ? "primary-button" : "primary-button disabled"} onClick={() => onDone(email, password, name)}>계정 생성하기</button>
    </section>
  );
}

function FollowingScreen({ following, bookCatalog, onBack, onBook, onFollow }: { following: string[]; bookCatalog: Book[]; onBack: () => void; onBook: (bookId: string) => void; onFollow: (bookId: string) => void }) {
  const [listedIds] = useState(() => [...following]);
  const listedBooks = listedIds
    .map((bookId) => bookCatalog.find((book) => book.id === bookId))
    .filter((book): book is Book => Boolean(book));

  return (
    <section className="scroll-content screen following-screen">
      <Header title="팔로잉 목록" onBack={onBack} />
      <p className="following-count">
        팔로잉 도서 총 <strong>{following.length}</strong> 개
      </p>
      <div className="book-list">
        {listedBooks.length === 0 ? (
          <EmptyState title="팔로잉한 책이 없어요." body="관심 있는 책을 팔로우하면 여기에 모입니다." />
        ) : (
          listedBooks.map((book) => {
            const isFollowing = following.includes(book.id);
            return (
              <button key={book.id} className="book-row following-row" onClick={() => onBook(book.id)}>
                <BookCover book={book} />
                <span>
                  <strong>{book.title}</strong>
                  <small>{book.author}</small>
                  <em>
                    ★ {book.rating.toFixed(1)} / 5.0
                  </em>
                  <i className="following-tag">{book.genres.join(" · ") || "도서"}</i>
                </span>
                <b
                  className={isFollowing ? "following-chip" : "follow-chip"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onFollow(book.id);
                  }}
                >
                  {isFollowing ? "팔로잉" : "팔로우"}
                </b>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function SettingsScreen({ onBack, onTerms, onPrivacy, onLogout, onDeleteAccount, onToast }: { onBack: () => void; onTerms: () => void; onPrivacy: () => void; onLogout: () => void; onDeleteAccount: () => void; onToast: (message: string) => void }) {
  return (
    <section className="screen">
      <Header title="설정" onBack={onBack} />
      <div className="settings-list">
        <button onClick={() => onToast("버전 0.1.0")}>현재 버전 <span>0.1.0</span></button>
        <button onClick={onTerms}>이용약관 정보 <ChevronRight /></button>
        <button onClick={onPrivacy}>개인정보 수집 및 이용 정보 <ChevronRight /></button>
        <button onClick={onLogout}>로그아웃 <ChevronRight /></button>
        <button className="danger" onClick={onDeleteAccount}>계정 삭제 <ChevronRight /></button>
        <small>Supabase: {supabaseUrl}</small>
      </div>
    </section>
  );
}

function ProfileScreen({ profile, sessionEmail, onBack, onPassword, onPhoto, onSave }: { profile: Profile | null; sessionEmail?: string; onBack: () => void; onPassword: () => void; onPhoto: () => void; onSave: (values: Partial<Pick<Profile, "nickname" | "bio">>) => void }) {
  const [nickname, setNickname] = useState(profile?.nickname ?? currentUser.name);
  const [bio, setBio] = useState(profile?.bio ?? currentUser.intro);
  const email = profile?.email || sessionEmail || "";

  return (
    <section className="screen auth-screen">
      <Header title="프로필 편집" onBack={onBack} right={<button className="save-button" onClick={() => onSave({ nickname, bio })}>완료</button>} />
      <button className="profile-photo-button" onClick={onPhoto}>
        <span className="avatar upload">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="프로필 이미지" width={104} height={104} unoptimized />
          ) : (
            <Image src={defaultAvatarIcon} alt="기본 프로필" width={104} height={104} unoptimized />
          )}
        </span>
        <b aria-hidden="true"><IconAsset src={cameraIcon} alt="" size={16} /></b>
      </button>
      <label className="field"><span>소개글</span><input value={bio} onChange={(event) => setBio(event.target.value)} maxLength={100} /></label>
      <label className="field"><span>닉네임</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={10} /></label>
      <label className="field"><span>이메일</span><input value={email || "카카오 계정 (이메일 미제공)"} readOnly /></label>
      <button className="outline-button" onClick={onPassword}>비밀번호 변경</button>
    </section>
  );
}

function PasswordScreen({ onBack, onDone, onToast }: { onBack: () => void; onDone: () => void; onToast: (message: string) => void }) {
  return (
    <section className="screen auth-screen">
      <Header title="비밀번호 변경" onBack={onBack} />
      <label className="field"><span>현재 비밀번호</span><input type="password" /></label>
      <label className="field"><span>새 비밀번호</span><input type="password" /></label>
      <label className="field"><span>새 비밀번호 확인</span><input type="password" /></label>
      <button className="primary-button" onClick={() => { onToast("변경되었습니다."); onDone(); }}>변경하기</button>
    </section>
  );
}

function PostDetailScreen({
  review,
  book,
  liked,
  comments,
  likedComments,
  onBack,
  onBook,
  onLike,
  onMore,
  onSubmitComment,
  onToggleCommentLike,
  onEditComment,
  onDeleteComment,
  onReportComment
}: {
  review: Review;
  book: Book;
  liked: boolean;
  comments: CommentItem[];
  likedComments: string[];
  onBack: () => void;
  onBook: (bookId: string) => void;
  onLike: () => void;
  onMore: () => void;
  onSubmitComment: (body: string, parentId?: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  onEditComment: (commentId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReportComment: (commentId: string) => void;
}) {
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const rootComments = comments.filter((comment) => !comment.parentId);
  const repliesByParent = comments.reduce<Record<string, CommentItem[]>>((acc, comment) => {
    if (!comment.parentId) return acc;
    acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
    return acc;
  }, {});

  return (
    <section className="scroll-content screen post-detail">
      <Header onBack={onBack} right={<button className="icon-button" onClick={onMore}><MoreHorizontal /></button>} />
      <button className="book-strip" onClick={() => onBook(book.id)}>
        <BookCover book={book} />
        <span><strong>{book.title}</strong><small>{book.author}</small></span>
        <ChevronRight />
      </button>
      <div className="review-author big">
        <UserAvatar value={review.avatar} />
        <strong>{review.user}{review.tag}</strong>
        <RatingStars rating={review.rating} />
      </div>
      <p className="post-body">{review.body}</p>
      <footer className="review-meta">
        <button className={liked ? "liked" : ""} onClick={onLike}><IconAsset src={liked ? likeActiveIcon : likeIcon} alt="" size={18} /> {formatCount(review.likes)}</button>
        <button><IconAsset src={commentIcon} alt="" size={18} /> 댓글 {comments.length}</button>
        <time>{review.date}</time>
      </footer>
      <section className="comments">
        <h2>댓글 {comments.length}</h2>
        {rootComments.length === 0 ? (
          <EmptyState title="아직 댓글이 없어요." body="첫 댓글을 남겨보세요." />
        ) : (
          rootComments.map((comment) => (
            <div key={comment.id}>
              <Comment
                name={`${comment.user}${comment.tag}`}
                body={comment.body}
                likes={comment.likes}
                liked={likedComments.includes(comment.id)}
                mine={Boolean(comment.mine)}
                menuOpen={openMenuId === comment.id}
                onToggleMenu={() => setOpenMenuId((prev) => (prev === comment.id ? null : comment.id))}
                onCloseMenu={() => setOpenMenuId(null)}
                onLike={() => onToggleCommentLike(comment.id)}
                onReply={() => setReplyingTo({ id: comment.id, name: comment.user })}
                onEdit={(nextBody) => {
                  setOpenMenuId(null);
                  onEditComment(comment.id, nextBody);
                }}
                onDelete={() => {
                  setOpenMenuId(null);
                  onDeleteComment(comment.id);
                }}
                onReport={() => {
                  setOpenMenuId(null);
                  onReportComment(comment.id);
                }}
              />
              {(repliesByParent[comment.id] ?? []).length > 0 && (
                <div className="replies">
                  {(repliesByParent[comment.id] ?? []).map((reply) => (
                    <Comment
                      key={reply.id}
                      small
                      name={`${reply.user}${reply.tag}`}
                      body={reply.body}
                      likes={reply.likes}
                      liked={likedComments.includes(reply.id)}
                      mine={Boolean(reply.mine)}
                      menuOpen={openMenuId === reply.id}
                      onToggleMenu={() => setOpenMenuId((prev) => (prev === reply.id ? null : reply.id))}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onLike={() => onToggleCommentLike(reply.id)}
                      onEdit={(nextBody) => {
                        setOpenMenuId(null);
                        onEditComment(reply.id, nextBody);
                      }}
                      onDelete={() => {
                        setOpenMenuId(null);
                        onDeleteComment(reply.id);
                      }}
                      onReport={() => {
                        setOpenMenuId(null);
                        onReportComment(reply.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
      {replyingTo && <div className="replying-banner">{replyingTo.name}님에게 답글 남기는 중 <button onClick={() => setReplyingTo(null)}>X</button></div>}
      <div className="comment-input">
        <textarea value={commentText} maxLength={1000} onChange={(event) => setCommentText(event.target.value)} placeholder="댓글을 입력해주세요" />
        <button
          disabled={!commentText.trim()}
          onClick={() => {
            const body = commentText.trim();
            if (!body) return;
            onSubmitComment(body, replyingTo?.id);
            setCommentText("");
            setReplyingTo(null);
          }}
        >
          등록
        </button>
      </div>
    </section>
  );
}

function Comment({
  name,
  body,
  likes,
  liked = false,
  small = false,
  mine = false,
  menuOpen = false,
  onToggleMenu,
  onCloseMenu,
  onReply,
  onLike,
  onEdit,
  onDelete,
  onReport
}: {
  name: string;
  body: string;
  likes: number;
  liked?: boolean;
  small?: boolean;
  mine?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  onReply?: () => void;
  onLike?: () => void;
  onEdit?: (body: string) => void;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(body);

  useEffect(() => {
    setEditText(body);
  }, [body]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = () => onCloseMenu?.();
    window.addEventListener("click", handlePointer);
    return () => window.removeEventListener("click", handlePointer);
  }, [menuOpen, onCloseMenu]);

  return (
    <article className={small ? "comment small-comment" : "comment"}>
      <div className="comment-head">
        <strong>{name}</strong>
        <div className="comment-more-wrap">
          <button
            type="button"
            className="comment-more-button"
            aria-label="댓글 더보기"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu?.();
            }}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="comment-more-menu" onClick={(event) => event.stopPropagation()}>
              {mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setEditText(body);
                      onCloseMenu?.();
                    }}
                  >
                    수정하기
                  </button>
                  <button type="button" className="danger" onClick={onDelete}>
                    삭제하기
                  </button>
                </>
              ) : (
                <button type="button" className="danger" onClick={onReport}>
                  신고하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <div className="comment-edit">
          <textarea value={editText} maxLength={1000} onChange={(event) => setEditText(event.target.value)} />
          <div className="comment-edit-actions">
            <button type="button" onClick={() => { setEditing(false); setEditText(body); }}>취소</button>
            <button
              type="button"
              className="primary"
              disabled={!editText.trim()}
              onClick={() => {
                onEdit?.(editText.trim());
                setEditing(false);
              }}
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <p>{body}</p>
      )}
      <button className={liked ? "liked" : ""} onClick={onLike}><IconAsset src={liked ? likeActiveIcon : likeIcon} alt="" size={15} /> {likes}</button>
      {onReply && <button onClick={onReply}>답글 달기</button>}
    </article>
  );
}

function NotificationsScreen({ onBack, onPost, onClear }: { onBack: () => void; onPost: (postId: string) => void; onClear: () => void }) {
  const items: { id: string; postId: string; icon: string; title: string; time: string }[] = [];

  return (
    <section className="screen">
      <Header title="알림" onBack={onBack} right={<button className="save-button" onClick={onClear}>모두 읽기</button>} />
      {items.length === 0 ? (
        <div className="notification-empty">
          <Bell />
          <strong>새 알림이 없습니다.</strong>
          <p>좋아요, 댓글, 답글 알림이 생기면 이곳에서 확인할 수 있어요.</p>
        </div>
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            <button key={item.id} className="notification-item" onClick={() => onPost(item.postId)}>
              <span>{item.icon}</span>
              <strong>{item.title}</strong>
              <small>{item.time}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function PolicyScreen({ title, privacy = false, onBack }: { title: string; privacy?: boolean; onBack: () => void }) {
  const sections = privacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <section className="scroll-content screen policy-screen">
      <Header title={title} onBack={onBack} />
      <article className="policy-card">
        <h2>{privacy ? "개인정보 수집 및 이용 안내" : "책모락 이용약관"}</h2>
        {privacy && <p className="policy-intro">{PRIVACY_INTRO}</p>}
        {privacy && (
          <div className="policy-table-wrap">
            <h3>개인정보 수집 및 이용 동의 (필수)</h3>
            <table className="policy-table">
              <thead>
                <tr>
                  <th>수집 목적</th>
                  <th>수집 항목</th>
                  <th>보유 및 이용 기간</th>
                </tr>
              </thead>
              <tbody>
                {PRIVACY_TABLE_ROWS.map((row) => (
                  <tr key={row.purpose}>
                    <td>{row.purpose}</td>
                    <td>{row.items}</td>
                    <td>{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sections.map((section) => (
          <section key={section.title} className="policy-section">
            <h3>{section.title}</h3>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items && section.items.length > 0 && (
              <ol>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </article>
    </section>
  );
}

function ModalLayer({
  modal,
  activePost,
  reportReason,
  sortBy,
  bookRequestTitle,
  bookRequestAuthor,
  isSubmittingBookRequest,
  onClose,
  onOpenReport,
  onOpenDelete,
  onReportReason,
  onReport,
  onDelete,
  onDeleteComment,
  onEdit,
  onLeaveWrite,
  onLogout,
  onDeleteAccount,
  onProfilePhoto,
  onSort,
  onBookRequestTitle,
  onBookRequestAuthor,
  onSubmitBookRequest
}: {
  modal: ModalType;
  activePost: Review;
  reportReason: string;
  sortBy: "latest" | "popular";
  bookRequestTitle: string;
  bookRequestAuthor: string;
  isSubmittingBookRequest: boolean;
  onClose: () => void;
  onOpenReport: () => void;
  onOpenDelete: () => void;
  onReportReason: (reason: string) => void;
  onReport: () => void;
  onDelete: () => void;
  onDeleteComment: () => void;
  onEdit: () => void;
  onLeaveWrite: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onProfilePhoto: (kind: "change" | "default") => void;
  onSort: (sort: "latest" | "popular") => void;
  onBookRequestTitle: (value: string) => void;
  onBookRequestAuthor: (value: string) => void;
  onSubmitBookRequest: () => void;
}) {
  if (!modal) return null;

  const reportReasons = ["스팸/홍보성", "욕설/비방/혐오", "음란물/선정적", "허위정보", "개인정보 노출", "저작권 침해"];

  if (modal === "bookRequest") {
    const canSubmit = Boolean(bookRequestTitle.trim() && bookRequestAuthor.trim()) && !isSubmittingBookRequest;
    return (
      <div className="modal-backdrop centered" onClick={onClose}>
        <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
          <h2>책 등록 요청하기</h2>
          <p className="lead">요청 내용은 검토 후에 운영 정책에 따라 처리돼요.</p>
          <label className="field">
            <span>책 제목</span>
            <input value={bookRequestTitle} onChange={(event) => onBookRequestTitle(event.target.value)} placeholder="책 제목을 입력하세요" />
          </label>
          <label className="field">
            <span>저자</span>
            <input value={bookRequestAuthor} onChange={(event) => onBookRequestAuthor(event.target.value)} placeholder="" />
          </label>
          <div className="confirm-actions">
            <button type="button" onClick={onClose}>
              취소
            </button>
            <button type="button" className="danger" disabled={!canSubmit} onClick={onSubmitBookRequest}>
              {isSubmittingBookRequest ? "요청 중..." : "요청"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={modal === "report" ? "modal-sheet tall" : "modal-sheet"} onClick={(event) => event.stopPropagation()}>
        {modal === "more" && (
          <>
            <h2>더보기</h2>
            {activePost.mine ? (
              <>
                <button className="sheet-action" onClick={onEdit}>수정하기</button>
                <button className="sheet-action danger" onClick={onOpenDelete}>삭제하기</button>
              </>
            ) : (
              <button className="sheet-action danger" onClick={onOpenReport}>신고하기</button>
            )}
          </>
        )}
        {modal === "report" && (
          <>
            <h2>신고 사유 선택</h2>
            <p className="lead">신고 사유는 한 가지만 선택할 수 있어요.</p>
            <div className="reason-list">
              {reportReasons.map((reason) => (
                <button key={reason} className={reportReason === reason ? "reason selected" : "reason"} onClick={() => onReportReason(reason)}>
                  {reason}
                  {reportReason === reason && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
            <button className="primary-button compact" onClick={onReport}>신고</button>
          </>
        )}
        {modal === "deletePost" && <ConfirmBox icon={<AlertTriangle />} title="이 게시물을 삭제할까요?" body="삭제하면 다시 복구할 수 없어요." confirmLabel="삭제" onCancel={onClose} onConfirm={onDelete} danger />}
        {modal === "deleteComment" && <ConfirmBox icon={<AlertTriangle />} title="이 댓글을 삭제할까요?" body="삭제하면 다시 복구할 수 없어요." confirmLabel="삭제" onCancel={onClose} onConfirm={onDeleteComment} danger />}
        {modal === "leaveWrite" && (
          <ConfirmBox
            icon={<AlertTriangle />}
            title="작성을 중단할까요?"
            body="작성 중인 내용은 저장되지 않습니다."
            cancelLabel="취소"
            confirmLabel="나가기"
            onCancel={onClose}
            onConfirm={onLeaveWrite}
          />
        )}
        {modal === "logout" && <ConfirmBox title="로그아웃 하시겠습니까?" body="로그아웃 후 시작 화면으로 이동합니다." confirmLabel="로그아웃" onCancel={onClose} onConfirm={onLogout} />}
        {modal === "deleteAccount" && <ConfirmBox icon={<AlertTriangle />} title="계정을 삭제하시겠습니까?" body="삭제하면 다시 복구할 수 없어요." confirmLabel="삭제" onCancel={onClose} onConfirm={onDeleteAccount} danger />}
        {modal === "profilePhoto" && (
          <>
            <h2>프로필 사진</h2>
            <button className="sheet-action" onClick={() => onProfilePhoto("change")}>변경하기</button>
            <button className="sheet-action" onClick={() => onProfilePhoto("default")}>기본 프로필</button>
          </>
        )}
        {modal === "sort" && (
          <>
            <h2>정렬 기준</h2>
            <button className={sortBy === "latest" ? "sheet-action selected" : "sheet-action"} onClick={() => onSort("latest")}>최신순</button>
            <button className={sortBy === "popular" ? "sheet-action selected" : "sheet-action"} onClick={() => onSort("popular")}>좋아요순</button>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmBox({ icon, title, body, cancelLabel = "취소", confirmLabel, danger = false, onCancel, onConfirm }: { icon?: React.ReactNode; title: string; body: string; cancelLabel?: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="confirm-box">
      {icon}
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="confirm-actions">
        <button onClick={onCancel}>{cancelLabel}</button>
        <button className={danger ? "danger" : ""} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}

function BookCover({ book }: { book: Book }) {
  const [src, setSrc] = useState(book.cover || createBookCoverFallback(book.title));

  useEffect(() => {
    setSrc(book.cover || createBookCoverFallback(book.title));
  }, [book.cover, book.title]);

  return (
    <Image
      className="book-cover"
      src={src}
      alt={`${book.title} 표지`}
      width={120}
      height={170}
      unoptimized
      onError={() => setSrc(createBookCoverFallback(book.title))}
    />
  );
}

function UserAvatar({ value }: { value: string }) {
  if (value.startsWith("http")) {
    return (
      <span className="avatar">
        <Image src={value} alt="프로필 이미지" width={28} height={28} unoptimized />
      </span>
    );
  }

  return (
    <span className="avatar">
      <Image src={defaultAvatarIcon} alt="기본 프로필" width={28} height={28} unoptimized />
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <IconAsset key={score} src={score <= rating ? starActiveIcon : starIcon} alt="" size={16} />
      ))}
    </span>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <Image className="empty-illustration" src={startCharacterIcon} alt="" width={160} height={130} unoptimized />
      <strong>{title}</strong>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button type="button" className="primary-button empty-cta" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function collectLikedReviewIds(reviews: Review[]) {
  return reviews.filter((review) => review.likedByMe).map((review) => review.id);
}

function formatCount(count: number) {
  if (count > 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }

  if (count > 99) {
    return "99+";
  }

  return String(count);
}

const SPINE_COLORS = ["#E8A07A", "#7BA6C9", "#8FBF8F", "#C9A0DC", "#E8C96A", "#E07A8A", "#6DB3A8", "#A89B8C"];

function spineColor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

function mergeBooks(baseBooks: Book[], nextBooks: Book[]) {
  const merged = new Map<string, Book>();

  [...baseBooks, ...nextBooks].forEach((book) => {
    const previous = merged.get(book.id);
    if (!previous) {
      merged.set(book.id, book);
      return;
    }

    merged.set(book.id, {
      ...previous,
      ...book,
      cover: book.cover || previous.cover,
      // Prefer in-app user ratings; keep previous when incoming Aladin rating is 0.
      rating: book.rating > 0 ? book.rating : previous.rating,
      followers: Math.max(book.followers ?? 0, previous.followers ?? 0),
      description:
        book.description && book.description !== "책 소개를 불러오지 못했습니다."
          ? book.description
          : previous.description,
      genres: preferUiGenres(book.genres, previous.genres)
    });
  });

  return Array.from(merged.values());
}

function mergeCatalogBooks(baseBooks: Book[], nextBooks: Book[]) {
  return mergeBooks(
    baseBooks.filter((book) => CATALOG_ISBN_SET.has(book.id)),
    nextBooks.filter((book) => CATALOG_ISBN_SET.has(book.id))
  );
}

function mergeReviews(baseReviews: Review[], nextReviews: Review[]) {
  const merged = new Map<string, Review>();
  [...baseReviews, ...nextReviews].forEach((review) => {
    merged.set(review.id, { ...merged.get(review.id), ...review });
  });
  return Array.from(merged.values());
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function truncateReviewBody(body: string, limit = 150) {
  if (body.length <= limit) return body;

  const slice = body.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(limit * 0.6) ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}... 더보기`;
}

const UI_GENRES = new Set(["소설", "에세이", "자기계발"]);

function preferUiGenres(nextGenres: string[] = [], previousGenres: string[] = []) {
  const nextUseful = nextGenres.filter((genre) => UI_GENRES.has(genre));
  if (nextUseful.length > 0) return Array.from(new Set(nextUseful));

  const previousUseful = previousGenres.filter((genre) => UI_GENRES.has(genre));
  if (previousUseful.length > 0) return Array.from(new Set(previousUseful));

  return nextGenres.length > 0 ? nextGenres : previousGenres;
}

function createBookCoverFallback(title: string) {
  const safeTitle = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="340" viewBox="0 0 240 340">
      <rect width="240" height="340" rx="18" fill="#fff4d4"/>
      <rect x="22" y="22" width="196" height="296" rx="14" fill="#ffffff" stroke="#ffb21a" stroke-width="4"/>
      <text x="120" y="142" text-anchor="middle" font-size="48">📚</text>
      <text x="120" y="198" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#6f6252">${safeTitle.slice(0, 10)}</text>
      <text x="120" y="232" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#ffb21a">책모락</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
