"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Mail,
  MoreHorizontal,
  ShieldCheck
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
import { genres, recentSearches, type Book, type Review } from "./data";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { BESTSELLER_ISBN13, BESTSELLER_PREVIEW } from "@/lib/bestseller-isbn13";
import {
  createReview,
  deleteReview,
  fetchAladinBookDetail,
  fetchFixedBestsellerBooks,
  getCurrentProfile,
  listBooks,
  listFeedReviews,
  listFollowingBookIds,
  reportReview,
  signInWithEmail,
  signInWithKakao,
  signOut,
  signUpWithEmail,
  toggleBookFollow,
  toggleReviewLike,
  updateProfile as updateSupabaseProfile,
  uploadProfileImage,
  upsertBook,
  type Profile
} from "@/lib/bookmorak-service";

type Screen = "start" | "onboarding" | "preview" | "login" | "signup" | "home" | "notifications" | "search" | "book" | "write" | "mypage" | "following" | "settings" | "terms" | "privacy" | "profile" | "password" | "post";
type ModalType = "more" | "report" | "deletePost" | "leaveWrite" | "logout" | "deleteAccount" | "profilePhoto" | "sort" | null;
type IconSource = StaticImageData | string;

const currentUser = {
  name: "독서광",
  tag: "#0000",
  email: "",
  intro: "아직 소개글이 없습니다.",
  avatar: "📚"
};

const fixedBookPreviews: Book[] = BESTSELLER_PREVIEW.map((book) => ({
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
  const [selectedBooks, setSelectedBooks] = useState<string[]>(fixedBookPreviews.slice(0, 2).map((book) => book.id));
  const [following, setFollowing] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [draftRating, setDraftRating] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [reportReason, setReportReason] = useState("스팸/홍보성");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [policyReturn, setPolicyReturn] = useState<Screen>("settings");
  const [profile, setProfile] = useState<Profile | null>(null);
  const isSyncing = false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBook = liveBooks.find((book) => book.id === activeBookId) ?? liveBooks[0] ?? fixedBookPreviews[0];
  const activePost = reviews.find((review) => review.id === activePostId) ?? reviews[0];

  useEffect(() => {
    let isMounted = true;

    async function enterAuthenticatedApp() {
      if (!isMounted) return;

      setScreen("home");

      try {
        const nextProfile = await getCurrentProfile();
        if (isMounted && nextProfile) {
          setProfile(nextProfile);
        }
      } catch {
        // The product should still be usable when OAuth succeeds before the profile row is ready.
      }
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setScreen("start");
        return;
      }

      if (session?.user) {
        enterAuthenticatedApp();
      }
    });

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

        setProfile(currentProfile);
        if (session?.user || currentProfile) {
          setScreen("home");
        }

        const [fixedBooks, dbBooks, dbFollows, dbReviews] = await Promise.all([
          fetchFixedBestsellerBooks(100, [...BESTSELLER_ISBN13]).catch(() => []),
          listBooks().catch(() => []),
          currentProfile ? listFollowingBookIds(currentProfile.id).catch(() => []) : Promise.resolve([]),
          listFeedReviews().catch(() => [])
        ]);

        if (!isMounted) return;
        if (fixedBooks.length > 0) {
          setLiveBooks(mergeBooks(dbBooks, fixedBooks));
        } else if (dbBooks.length > 0) {
          setLiveBooks(mergeBooks(fixedBookPreviews, dbBooks));
        }
        if (dbFollows.length > 0) setFollowing(dbFollows);
        if (dbReviews.length > 0) setReviews(dbReviews);
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
    const normalized = query.trim().toLowerCase();
    return liveBooks.filter((book) => {
      const genreMatches = selectedGenre === "전체" || book.genres.includes(selectedGenre);
      const queryMatches = !normalized || `${book.title} ${book.author}`.toLowerCase().includes(normalized);
      return genreMatches && queryMatches;
    });
  }, [liveBooks, query, selectedGenre]);

  const feedReviews = useMemo(() => {
    if (following.length === 0) {
      return reviews;
    }

    return reviews.filter((review) => following.includes(review.bookId));
  }, [following, reviews]);

  const sortedBookReviews = useMemo(() => {
    const bookReviews = reviews.filter((review) => review.bookId === activeBook.id);

    if (sortBy === "popular") {
      return [...bookReviews].sort((a, b) => b.likes - a.likes);
    }

    return bookReviews;
  }, [activeBook.id, reviews, sortBy]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const openBook = async (bookId: string) => {
    setActiveBookId(bookId);
    setScreen("book");

    try {
      const detailedBook = await fetchAladinBookDetail(bookId);
      if (!detailedBook) return;

      setLiveBooks((prev) => mergeBooks(prev, [detailedBook]));
    } catch {
      showToast("책 상세 정보를 불러오지 못했습니다.");
    }
  };

  const openPost = (postId: string) => {
    setActivePostId(postId);
    setScreen("post");
  };

  const toggleFollow = async (bookId: string) => {
    const shouldFollow = !following.includes(bookId);
    setFollowing((prev) => (prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]));

    if (!profile) {
      showToast("로그인 후 서버에 팔로우가 저장됩니다.");
      return;
    }

    try {
      const targetBook = liveBooks.find((book) => book.id === bookId);
      if (targetBook) await upsertBook(targetBook);
      await toggleBookFollow(profile.id, bookId, shouldFollow);
    } catch {
      setFollowing((prev) => (shouldFollow ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
      showToast("팔로우 처리에 실패했습니다.");
    }
  };

  const toggleLike = async (postId: string) => {
    const shouldLike = !likedPosts.includes(postId);
    setLikedPosts((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));

    if (!profile || postId.startsWith("r")) {
      return;
    }

    try {
      await toggleReviewLike(profile.id, postId, shouldLike);
    } catch {
      setLikedPosts((prev) => (shouldLike ? prev.filter((id) => id !== postId) : [...prev, postId]));
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
    setScreen("home");

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

  const submitReport = async () => {
    setModal(null);

    if (!profile || activePost.id.startsWith("r")) {
      showToast(`신고가 완료되었습니다. (${reportReason})`);
      return;
    }

    try {
      await reportReview(profile.id, activePost.id, reportReason);
      showToast("신고가 완료되었습니다.");
    } catch {
      showToast("이미 신고했거나 신고 처리에 실패했습니다.");
    }
  };

  const submitReview = async () => {
    if (draftRating === 0 || draftBody.trim().length < 30) {
      showToast("별점과 30자 이상의 감상을 입력해주세요.");
      return;
    }

    let createdId = `r${Date.now()}`;

    try {
      await upsertBook(activeBook);
      if (profile) {
        createdId = await createReview(profile.id, activeBook.id, draftRating, draftBody.trim());
      }
    } catch {
      showToast("서버 저장에 실패해 화면에만 임시 반영합니다.");
    }

    const nextReview: Review = {
      id: createdId,
      bookId: activeBook.id,
      user: profile?.nickname ?? currentUser.name,
      tag: profile?.tag ? `#${profile.tag}` : currentUser.tag,
      avatar: profile?.avatar_url ?? currentUser.avatar,
      rating: draftRating,
      body: draftBody.trim(),
      likes: 0,
      comments: 0,
      date: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll(". ", ".").replace(".", ""),
      mine: true
    };

    setReviews((prev) => [nextReview, ...prev]);
    setDraftBody("");
    setDraftRating(0);
    setScreen("book");
    showToast("등록되었습니다.");
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const loggedInProfile = await signInWithEmail(email, password);
      setProfile(loggedInProfile);
      if (loggedInProfile) {
        const [dbFollows, dbReviews] = await Promise.all([listFollowingBookIds(loggedInProfile.id), listFeedReviews()]);
        setFollowing(dbFollows);
        if (dbReviews.length > 0) setReviews(dbReviews);
      }
      setScreen("home");
      showToast("로그인 되었습니다.");
    } catch {
      showToast("이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  const handleSignup = async (email: string, password: string, nickname: string) => {
    try {
      const createdProfile = await signUpWithEmail(email, password, nickname);
      setProfile(createdProfile);
      setScreen("home");
      showToast("계정이 생성되었습니다.");
    } catch {
      showToast("계정 생성에 실패했습니다.");
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
        {screen === "start" && <StartScreen onStart={() => setScreen("onboarding")} onLogin={() => setScreen("login")} />}
        {screen === "onboarding" && (
          <OnboardingScreen
            bookCatalog={liveBooks}
            selectedBooks={selectedBooks}
            selectedGenre={selectedGenre}
            onBack={() => setScreen("start")}
            onGenre={setSelectedGenre}
            onToggleBook={(bookId) => setSelectedBooks((prev) => (prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]))}
            onNext={() => setScreen("preview")}
          />
        )}
        {screen === "preview" && (
          <PreviewScreen
            bookCatalog={liveBooks}
            selectedBooks={selectedBooks}
            onBack={() => setScreen("onboarding")}
            onAdd={() => setScreen("onboarding")}
            onSignup={() => setScreen("signup")}
          />
        )}
        {screen === "login" && <LoginScreen onBack={() => setScreen("start")} onLogin={handleLogin} onKakaoLogin={async () => {
          try {
            await signInWithKakao();
          } catch {
            showToast("카카오 로그인 설정을 확인해주세요.");
          }
        }} onSignup={() => setScreen("signup")} />}
        {screen === "signup" && <SignupScreen onBack={() => setScreen("preview")} onKakaoLogin={async () => {
          try {
            await signInWithKakao();
          } catch {
            showToast("카카오 로그인 설정을 확인해주세요.");
          }
        }} onDone={handleSignup} onTerms={() => { setPolicyReturn("signup"); setScreen("terms"); }} onPrivacy={() => { setPolicyReturn("signup"); setScreen("privacy"); }} />}
        {screen === "home" && (
          <AppFrame active="home" onNavigate={setScreen}>
            <HomeScreen
              reviews={feedReviews}
              bookCatalog={liveBooks}
              likedPosts={likedPosts}
              onBook={openBook}
              onPost={openPost}
              onLike={toggleLike}
              onMore={openMore}
              onToast={showToast}
              onNotifications={() => setScreen("notifications")}
            />
          </AppFrame>
        )}
        {screen === "notifications" && <NotificationsScreen onBack={() => setScreen("home")} onPost={openPost} onClear={() => showToast("모두 읽기 처리되었습니다.")} />}
        {screen === "search" && (
          <AppFrame active="search" onNavigate={setScreen}>
            <SearchScreen
              query={query}
              selectedGenre={selectedGenre}
              following={following}
              results={filteredBooks}
              isSyncing={isSyncing}
              onQuery={setQuery}
              onGenre={setSelectedGenre}
              onBook={openBook}
              onFollow={toggleFollow}
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
            onBack={() => setScreen("home")}
            onFollow={() => toggleFollow(activeBook.id)}
            onWrite={() => setScreen("write")}
            onPost={openPost}
            onLike={toggleLike}
            onMore={openMore}
            onSort={() => setModal("sort")}
            onToast={showToast}
          />
        )}
        {screen === "write" && (
          <WriteScreen
            book={activeBook}
            rating={draftRating}
            body={draftBody}
            onBack={() => (draftRating || draftBody ? setModal("leaveWrite") : setScreen("book"))}
            onRating={setDraftRating}
            onBody={setDraftBody}
            onSubmit={submitReview}
            onToast={showToast}
          />
        )}
        {screen === "mypage" && (
          <AppFrame active="mypage" onNavigate={setScreen}>
            <MyPageScreen
              reviews={reviews.filter((review) => review.mine)}
              profile={profile}
              bookCatalog={liveBooks}
              followingCount={following.length}
              onSettings={() => setScreen("settings")}
              onProfile={() => setScreen("profile")}
              onFollowing={() => setScreen("following")}
              onBook={openBook}
              onPost={openPost}
              onMore={openMore}
              onToast={showToast}
            />
          </AppFrame>
        )}
        {screen === "following" && <FollowingScreen following={following} bookCatalog={liveBooks} onBack={() => setScreen("mypage")} onBook={openBook} onFollow={toggleFollow} />}
        {screen === "settings" && <SettingsScreen onBack={() => setScreen("mypage")} onTerms={() => { setPolicyReturn("settings"); setScreen("terms"); }} onPrivacy={() => { setPolicyReturn("settings"); setScreen("privacy"); }} onLogout={() => setModal("logout")} onDeleteAccount={() => setModal("deleteAccount")} onToast={showToast} />}
        {screen === "terms" && <PolicyScreen title="이용약관 정보" onBack={() => setScreen(policyReturn)} />}
        {screen === "privacy" && <PolicyScreen title="개인정보 수집 및 이용 정보" onBack={() => setScreen(policyReturn)} privacy />}
        {screen === "profile" && <ProfileScreen profile={profile} onBack={() => setScreen("mypage")} onPassword={() => setScreen("password")} onPhoto={() => setModal("profilePhoto")} onSave={async (values) => {
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
            onBack={() => setScreen("home")}
            onBook={openBook}
            onLike={() => toggleLike(activePost.id)}
            onMore={() => openMore(activePost.id)}
            onToast={showToast}
          />
        )}
        <ModalLayer
          modal={modal}
          activePost={activePost}
          reportReason={reportReason}
          sortBy={sortBy}
          onClose={() => setModal(null)}
          onOpenReport={() => setModal("report")}
          onOpenDelete={() => setModal("deletePost")}
          onReportReason={setReportReason}
          onReport={submitReport}
          onDelete={deleteActivePost}
          onEdit={() => {
            setModal(null);
            setDraftRating(activePost.rating);
            setDraftBody(activePost.body);
            setActiveBookId(activePost.bookId);
            setScreen("write");
          }}
          onLeaveWrite={(save) => {
            setModal(null);
            if (save) showToast("임시저장되었습니다.");
            setScreen("book");
          }}
          onLogout={() => {
            setModal(null);
            signOut().finally(() => {
              setProfile(null);
              setScreen("start");
              showToast("로그아웃 되었습니다.");
            });
          }}
          onDeleteAccount={() => {
            setModal(null);
            setScreen("start");
            showToast("계정 삭제되었습니다.");
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
      </div>
    </main>
  );
}

function StartScreen({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <section className="start-screen">
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="logo-hero">
        <div className="mascot">
          <span>☁️</span>
          <strong>📖</strong>
        </div>
        <h1>
          <span>책</span>모락
        </h1>
        <p>책 이야기가 모락모락 피어나는 곳</p>
      </div>
      <div className="start-actions">
        <button className="primary-button" onClick={onStart}>
          시작하기 <ChevronRight size={22} />
        </button>
        <button className="outline-button" onClick={onLogin}>
          로그인
        </button>
      </div>
    </section>
  );
}

function AppFrame({ children, active, onNavigate }: { children: React.ReactNode; active: "home" | "search" | "write" | "mypage"; onNavigate: (screen: Screen) => void }) {
  return (
    <>
      <div className="scroll-content with-tab">{children}</div>
      <nav className="tabbar">
        <TabButton active={active === "home"} icon={active === "home" ? homeActiveIcon : homeIcon} label="홈" onClick={() => onNavigate("home")} />
        <TabButton active={active === "search"} icon={active === "search" ? searchActiveIcon : searchIcon} label="둘러보기" onClick={() => onNavigate("search")} />
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

function HomeScreen({ reviews, bookCatalog, likedPosts, onBook, onPost, onLike, onMore, onToast, onNotifications }: { reviews: Review[]; bookCatalog: Book[]; likedPosts: string[]; onBook: (bookId: string) => void; onPost: (postId: string) => void; onLike: (postId: string) => void; onMore: (postId: string) => void; onToast: (message: string) => void; onNotifications: () => void }) {
  return (
    <section className="screen">
      <div className="home-top">
        <LogoText />
        <button className="bell-button" onClick={onNotifications}>
          <Bell />
          <span />
        </button>
      </div>
      {reviews.length === 0 ? (
        <EmptyState title="아직 게시글이 없어요." body="팔로우한 책의 감상글이 생기면 이곳에 보여드릴게요." />
      ) : (
        reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            book={bookCatalog.find((book) => book.id === review.bookId) ?? bookCatalog[0] ?? fixedBookPreviews[0]}
            liked={likedPosts.includes(review.id)}
            onBook={() => onBook(review.bookId)}
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

function SearchScreen({ query, selectedGenre, following, results, isSyncing, onQuery, onGenre, onBook, onFollow }: { query: string; selectedGenre: string; following: string[]; results: Book[]; isSyncing: boolean; onQuery: (query: string) => void; onGenre: (genre: string) => void; onBook: (bookId: string) => void; onFollow: (bookId: string) => void }) {
  return (
    <section className="screen">
      <label className="search-box">
        <IconAsset src={searchFieldIcon} alt="" size={20} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="검색어를 입력해 주세요." />
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
            <button className="text-button">전체 삭제 <IconAsset src={deleteIcon} alt="" size={14} /></button>
          </div>
          <div className="chips">
            {recentSearches.map((item) => (
              <button key={item} className="chip" onClick={() => onQuery(item)}>
                {item} <IconAsset src={deleteIcon} alt="" size={14} />
              </button>
            ))}
          </div>
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
        <EmptyState title="아직 등록되지 않은 책이에요." body="곧 더 많은 책을 준비할게요. 조금만 기다려 주세요." />
      ) : (
        <div className="book-grid">
          {results.map((book) => (
            <button key={book.id} className="book-tile" onClick={() => onBook(book.id)}>
              <BookCover book={book} />
              <strong>{book.title}</strong>
              <span>{book.author}</span>
              <small>★ {book.rating.toFixed(1)} / 5.0</small>
              <button
                className={following.includes(book.id) ? "mini-follow following" : "mini-follow"}
                onClick={(event) => {
                  event.stopPropagation();
                  onFollow(book.id);
                }}
              >
                {following.includes(book.id) ? "팔로잉" : "팔로우"}
              </button>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function BookDetailScreen({ book, reviews, following, likedPosts, sortBy, onBack, onFollow, onWrite, onPost, onLike, onMore, onSort, onToast }: { book: Book; reviews: Review[]; following: boolean; likedPosts: string[]; sortBy: "latest" | "popular"; onBack: () => void; onFollow: () => void; onWrite: () => void; onPost: (postId: string) => void; onLike: (postId: string) => void; onMore: (postId: string) => void; onSort: () => void; onToast: (message: string) => void }) {
  const [introExpanded, setIntroExpanded] = useState(false);
  const isLoadingIntro = book.description.includes("실시간으로 불러오는 중");
  const canExpandIntro = book.description.length > 120;
  const intro = !canExpandIntro || introExpanded ? book.description : `${book.description.slice(0, 120)}...`;

  useEffect(() => {
    setIntroExpanded(false);
  }, [book.id]);

  return (
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
              <strong>{formatCount(book.followers + (following ? 1 : 0))}</strong> 팔로워
            </p>
            <button className={following ? "outline-small active" : "outline-small"} onClick={onFollow}>
              {following ? "팔로잉" : "팔로우"}
            </button>
          </div>
          <button className="primary-button compact" onClick={onWrite}>작성하기</button>
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
  );
}

function WriteScreen({ book, rating, body, onBack, onRating, onBody, onSubmit, onToast }: { book: Book; rating: number; body: string; onBack: () => void; onRating: (rating: number) => void; onBody: (body: string) => void; onSubmit: () => void; onToast: (message: string) => void }) {
  const canSubmit = rating > 0 && body.trim().length >= 30;

  return (
    <section className="scroll-content screen write-screen">
      <Header title="게시글 작성하기" onBack={onBack} right={<button className="save-button" onClick={() => onToast("임시저장되었습니다.")}>임시저장</button>} />
      <div className="selected-book-card">
        <BookCover book={book} />
        <div>
          <strong>{book.title}</strong>
          <span>{book.author}</span>
        </div>
        <button>변경</button>
      </div>
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
        />
        <span>{body.length}/1000</span>
      </label>
      <p className="hint">최소 30자 이상, 최대 1000자까지 입력할 수 있습니다. (띄어쓰기 포함)</p>
      <button className={canSubmit ? "primary-button submit" : "primary-button submit disabled"} onClick={onSubmit}>
        등록하기
      </button>
    </section>
  );
}

function MyPageScreen({ reviews, profile, bookCatalog, followingCount, onSettings, onProfile, onFollowing, onBook, onPost, onMore, onToast }: { reviews: Review[]; profile: Profile | null; bookCatalog: Book[]; followingCount: number; onSettings: () => void; onProfile: () => void; onFollowing: () => void; onBook: (bookId: string) => void; onPost: (postId: string) => void; onMore: (postId: string) => void; onToast: (message: string) => void }) {
  return (
    <section className="screen mypage-screen">
      <Header title="마이페이지" right={<button className="settings-button" onClick={onSettings}><IconAsset src={settingsIcon} alt="설정" size={24} /></button>} />
      <div className="profile-summary">
        <div className="profile-left">
          <div className="avatar large">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="프로필 이미지" width={104} height={104} unoptimized /> : currentUser.avatar}</div>
          <button onClick={onProfile}>프로필 편집</button>
        </div>
        <div className="profile-copy">
          <strong>{profile?.nickname ?? currentUser.name}{profile?.tag ? `#${profile.tag}` : currentUser.tag}</strong>
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
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          book={bookCatalog.find((book) => book.id === review.bookId) ?? bookCatalog[0] ?? fixedBookPreviews[0]}
          onBook={() => onBook(review.bookId)}
          onPost={() => onPost(review.id)}
          onLike={() => onToast("내 게시글에도 좋아요를 남겼어요.")}
          onMore={() => onMore(review.id)}
          onToast={onToast}
          variant="mypage"
        />
      ))}
    </section>
  );
}

function ReviewCard({ review, book, liked = false, compact = false, variant, onBook, onPost, onLike, onMore, onToast }: { review: Review; book: Book; liked?: boolean; compact?: boolean; variant?: "mypage"; onBook: () => void; onPost: () => void; onLike: () => void; onMore?: () => void; onToast: (message: string) => void }) {
  return (
    <article className={[compact ? "review-card compact-card" : "review-card", variant === "mypage" ? "mypage-review-card" : ""].filter(Boolean).join(" ")}>
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
        {review.body.length > 150 ? `${review.body.slice(0, 150)}... 더보기` : review.body}
      </button>
      <footer className="review-meta">
        <button className={liked ? "liked" : ""} onClick={onLike}>
          <IconAsset src={liked ? likeActiveIcon : likeIcon} alt="" size={17} /> {formatCount(review.likes + (liked ? 1 : 0))}
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
  const visibleBooks = bookCatalog.filter((book) => selectedGenre === "전체" || book.genres.includes(selectedGenre));

  return (
    <section className="scroll-content screen">
      <Header title="관심 도서 선택" onBack={onBack} />
      <div className="progress"><span style={{ width: "50%" }} /></div>
      <p className="lead">관심 있는 책을 2권 이상 선택하면 취향에 맞는 피드를 먼저 볼 수 있어요.</p>
      <div className="chips genre-chips">
        {genres.map((genre) => (
          <button key={genre} className={selectedGenre === genre ? "chip selected" : "chip"} onClick={() => onGenre(genre)}>
            {genre}
          </button>
        ))}
      </div>
      <div className="book-list onboarding-book-list">
        {visibleBooks.map((book) => (
          <button key={book.id} className={selectedBooks.includes(book.id) ? "book-row picked" : "book-row"} onClick={() => onToggleBook(book.id)}>
            <BookCover book={book} />
            <span>
              <strong>{book.title}</strong>
              <small>{book.author}</small>
              <em>{book.genres.join(" · ")}</em>
            </span>
            <b>{selectedBooks.includes(book.id) ? "선택됨" : "선택"}</b>
          </button>
        ))}
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

  return (
    <section className="scroll-content screen">
      <Header title="피드 미리보기" onBack={onBack} />
      <p className="lead">선택한 책 기반으로 이런 감상글을 만나볼 수 있어요.</p>
      <div className="selected-book-scroll">
        {selected.map((book) => (
          <button key={book.id} className="mini-book">
            <BookCover book={book} />
            <span>{book.title}</span>
          </button>
        ))}
        <button className="add-book" onClick={onAdd}>+ 책 추가하기</button>
      </div>
      <EmptyState title="가입하면 실제 감상글을 볼 수 있어요." body="선택한 책을 기준으로 DB에 저장된 감상글이 홈 피드에 표시됩니다." />
      <button className="primary-button floating-start" onClick={onSignup}>시작하기</button>
    </section>
  );
}

function LoginScreen({ onBack, onLogin, onKakaoLogin, onSignup }: { onBack: () => void; onLogin: (email: string, password: string) => void; onKakaoLogin: () => void; onSignup: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="screen auth-screen">
      <Header title="로그인" onBack={onBack} />
      <LogoText />
      <button className="social kakao" onClick={onKakaoLogin}>카카오로 로그인</button>
      <label className="field"><span>이메일</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력해주세요" /></label>
      <label className="field"><span>비밀번호</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해주세요" /></label>
      <button className={email && password ? "primary-button" : "primary-button disabled"} onClick={() => onLogin(email, password)}>로그인 하기</button>
      <button className="link-button" onClick={onSignup}>아직 계정이 없나요? 이메일로 시작하기</button>
    </section>
  );
}

function SignupScreen({ onBack, onKakaoLogin, onDone, onTerms, onPrivacy }: { onBack: () => void; onKakaoLogin: () => void; onDone: (email: string, password: string, nickname: string) => void; onTerms: () => void; onPrivacy: () => void }) {
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
        <button className="outline-button" onClick={() => setStage("verify")}>인증 메일 재전송</button>
      </section>
    );
  }

  if (stage === "email") {
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
        <button className={email.includes("@") && agree ? "primary-button" : "primary-button disabled"} disabled={!email.includes("@") || !agree} onClick={() => setStage("verify")}>인증하기</button>
      </section>
    );
  }

  return (
    <section className="screen auth-screen">
      <Header title="계정 생성" onBack={onBack} />
      <div className="avatar upload">+</div>
      <label className="field"><span>닉네임</span><input maxLength={10} value={name} onChange={(event) => setName(event.target.value)} placeholder="닉네임을 입력해주세요" /></label>
      <label className="field"><span>비밀번호</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="영문, 숫자, 특수문자 포함 8~16자" /></label>
      <label className="field"><span>비밀번호 확인</span><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="비밀번호를 다시 입력해주세요" /></label>
      <label className="agree"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> 만 14세 이상, 이용약관, 개인정보 수집에 전체 동의합니다.</label>
      <button className={name.length > 0 && agree && password.length >= 8 && password === passwordConfirm ? "primary-button" : "primary-button disabled"} onClick={() => onDone(email, password, name)}>계정 생성하기</button>
    </section>
  );
}

function FollowingScreen({ following, bookCatalog, onBack, onBook, onFollow }: { following: string[]; bookCatalog: Book[]; onBack: () => void; onBook: (bookId: string) => void; onFollow: (bookId: string) => void }) {
  return (
    <section className="scroll-content screen">
      <Header title={`팔로잉 총 ${following.length}개`} onBack={onBack} />
      <div className="book-list">
        {bookCatalog.filter((book) => following.includes(book.id)).map((book) => (
          <button key={book.id} className="book-row" onClick={() => onBook(book.id)}>
            <BookCover book={book} />
            <span>
              <strong>{book.title}</strong>
              <small>{book.author}</small>
              <em>★ {book.rating.toFixed(1)} · {book.genres.join(" · ")}</em>
            </span>
            <b onClick={(event) => { event.stopPropagation(); onFollow(book.id); }}>팔로잉</b>
          </button>
        ))}
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

function ProfileScreen({ profile, onBack, onPassword, onPhoto, onSave }: { profile: Profile | null; onBack: () => void; onPassword: () => void; onPhoto: () => void; onSave: (values: Partial<Pick<Profile, "nickname" | "bio">>) => void }) {
  const [nickname, setNickname] = useState(profile?.nickname ?? currentUser.name);
  const [bio, setBio] = useState(profile?.bio ?? currentUser.intro);

  return (
    <section className="screen auth-screen">
      <Header title="프로필 편집" onBack={onBack} right={<button className="save-button" onClick={() => onSave({ nickname, bio })}>완료</button>} />
      <button className="profile-photo-button" onClick={onPhoto}>
        <span className="avatar upload">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="프로필 이미지" width={104} height={104} unoptimized /> : currentUser.avatar}</span>
        <b><IconAsset src={cameraIcon} alt="" size={16} /></b>
      </button>
      <label className="field"><span>소개글</span><input value={bio} onChange={(event) => setBio(event.target.value)} maxLength={100} /></label>
      <label className="field"><span>닉네임</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={10} /></label>
      <label className="field"><span>이메일</span><input value={profile?.email ?? currentUser.email} readOnly /></label>
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

function PostDetailScreen({ review, book, liked, onBack, onBook, onLike, onMore, onToast }: { review: Review; book: Book; liked: boolean; onBack: () => void; onBook: (bookId: string) => void; onLike: () => void; onMore: () => void; onToast: (message: string) => void }) {
  const [replyingTo, setReplyingTo] = useState("");
  const [commentText, setCommentText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState(false);

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
        <button className={liked ? "liked" : ""} onClick={onLike}><IconAsset src={liked ? likeActiveIcon : likeIcon} alt="" size={18} /> {formatCount(review.likes + (liked ? 1 : 0))}</button>
        <button><IconAsset src={commentIcon} alt="" size={18} /> 댓글 {review.comments}</button>
        <time>{review.date}</time>
      </footer>
      <section className="comments">
        <h2>댓글 {review.comments}</h2>
        <Comment name="수줍은고양이" body="저도 이 부분이 제일 좋았어요. 담백한 문장이 오래 남네요." likes={12} onReply={() => setReplyingTo("수줍은고양이")} />
        <div className="replies">
          <Comment small name="귀여운나무늘보" body="맞아요. 마지막 문장이 특히 좋았어요." likes={5} />
          <Comment small name="상냥한고양이" body="저도 밑줄 그었어요." likes={3} />
          <Comment small name="밝은독서광" body="다시 읽어보고 싶네요." likes={2} />
          {expandedReplies && <Comment small name="수줍은드래곤" body="답글까지 보니 더 공감됩니다." likes={1} />}
          <button className="reply-toggle" onClick={() => setExpandedReplies((prev) => !prev)}>{expandedReplies ? "답글 접기" : "답글 펼치기"}</button>
        </div>
        <Comment name="밝은독서광" body="리뷰 보고 바로 장바구니에 넣었습니다!" likes={4} onReply={() => setReplyingTo("밝은독서광")} />
      </section>
      {replyingTo && <div className="replying-banner">{replyingTo}님에게 답글 남기는 중 <button onClick={() => setReplyingTo("")}>X</button></div>}
      <div className="comment-input">
        <textarea value={commentText} maxLength={1000} onChange={(event) => setCommentText(event.target.value)} placeholder="댓글을 입력해주세요" />
        <button disabled={!commentText.trim()} onClick={() => { onToast(replyingTo ? "답글이 등록되었습니다." : "댓글이 등록되었습니다."); setCommentText(""); setReplyingTo(""); }}>등록</button>
      </div>
    </section>
  );
}

function Comment({ name, body, likes, small = false, onReply }: { name: string; body: string; likes: number; small?: boolean; onReply?: () => void }) {
  return (
    <article className={small ? "comment small-comment" : "comment"}>
      <strong>{name}</strong>
      <p>{body}</p>
      <button><IconAsset src={likeIcon} alt="" size={15} /> {likes}</button>
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
  return (
    <section className="scroll-content screen">
      <Header title={title} onBack={onBack} />
      <article className="policy-card">
        <ShieldCheck />
        <h2>{privacy ? "개인정보 수집 및 이용 안내" : "책모락 이용약관"}</h2>
        <p>
          책모락은 독서 감상 공유 서비스를 제공하기 위해 계정 정보, 프로필 정보, 작성한 게시글과 댓글, 팔로잉 도서 정보를 처리합니다.
          본 MVP에서는 약관 전문을 앱 내부 하드코딩 문서로 제공하며, 실제 배포 시 법무 검토를 거친 전문으로 교체해야 합니다.
        </p>
        <p>
          사용자는 언제든 설정에서 로그아웃하거나 계정 삭제를 요청할 수 있으며, 계정 삭제 시 작성한 게시글, 댓글, 대댓글, 좋아요, 팔로우 정보가 함께 삭제됩니다.
        </p>
      </article>
    </section>
  );
}

function ModalLayer({
  modal,
  activePost,
  reportReason,
  sortBy,
  onClose,
  onOpenReport,
  onOpenDelete,
  onReportReason,
  onReport,
  onDelete,
  onEdit,
  onLeaveWrite,
  onLogout,
  onDeleteAccount,
  onProfilePhoto,
  onSort
}: {
  modal: ModalType;
  activePost: Review;
  reportReason: string;
  sortBy: "latest" | "popular";
  onClose: () => void;
  onOpenReport: () => void;
  onOpenDelete: () => void;
  onReportReason: (reason: string) => void;
  onReport: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onLeaveWrite: (save: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onProfilePhoto: (kind: "change" | "default") => void;
  onSort: (sort: "latest" | "popular") => void;
}) {
  if (!modal) return null;

  const reportReasons = ["스팸/홍보성", "욕설/비방/혐오", "음란물/선정적", "허위정보", "개인정보 노출", "저작권 침해"];

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
        {modal === "leaveWrite" && (
          <ConfirmBox
            icon={<AlertTriangle />}
            title="작성 중인 게시물을 저장할까요?"
            body="나중에 이어서 작성할 수 있어요."
            cancelLabel="삭제"
            confirmLabel="임시저장"
            onCancel={() => onLeaveWrite(false)}
            onConfirm={() => onLeaveWrite(true)}
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

  return <span className="avatar">{value}</span>;
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <BookOpen />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
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

function mergeBooks(baseBooks: Book[], nextBooks: Book[]) {
  const merged = new Map<string, Book>();
  [...baseBooks, ...nextBooks].forEach((book) => {
    merged.set(book.id, book);
  });
  return Array.from(merged.values());
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
