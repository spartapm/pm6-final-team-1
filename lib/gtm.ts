type DataLayerEvent = {
  event?: string;
  [key: string]: string | number | boolean | undefined;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

const viewedHomePosts = new Set<string>();
let currentAppUserId: string | undefined;

/** Persist the signed-in profile id so every GA4/GTM event can carry app_user_id. */
export function setAppUserId(userId: string | null | undefined) {
  currentAppUserId = userId?.trim() || undefined;

  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // Keep DLV - app_user_id in sync without emitting a separate analytics event.
  window.dataLayer.push({
    app_user_id: currentAppUserId ?? ""
  });
}

export function clearAppUserId() {
  setAppUserId(undefined);
}

export function getAppUserId() {
  return currentAppUserId;
}

export function trackEvent(event: string, params: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
    // Always attach when available so test accounts can be filtered in GA4.
    ...(currentAppUserId ? { app_user_id: currentAppUserId } : {})
  });
}

export function trackHomePostView(postId: string, postIndex: number) {
  if (!postId || viewedHomePosts.has(postId)) return;
  viewedHomePosts.add(postId);
  trackEvent("home_post_view", {
    post_id: postId,
    post_index: postIndex
  });
}

export function mapPostClickSource(screen: string): "home" | "search" | "book_detail" | "mypage" {
  if (screen === "book") return "book_detail";
  if (screen === "search") return "search";
  if (screen === "mypage") return "mypage";
  return "home";
}

export function mapBookDetailSource(screen: string): "home" | "search" | "post_detail" | "mypage" {
  if (screen === "post") return "post_detail";
  if (screen === "search") return "search";
  if (screen === "mypage" || screen === "following") return "mypage";
  return "home";
}

export function mapFollowScreen(screen: string): "onboarding" | "search" | "book_detail" | "following_list" | "write_post" {
  if (screen === "onboarding") return "onboarding";
  if (screen === "search") return "search";
  if (screen === "following") return "following_list";
  if (screen === "write" || screen === "write_post") return "write_post";
  return "book_detail";
}

export function mapLikeCommentScreen(screen: string): "home" | "post_detail" | "book_detail" | "mypage" {
  if (screen === "post") return "post_detail";
  if (screen === "book") return "book_detail";
  if (screen === "mypage") return "mypage";
  return "home";
}

const AUTH_INTENT_KEY = "bookmorak:auth-intent";

export function setAuthIntent(intent: "sign_up" | "login") {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AUTH_INTENT_KEY, intent);
  } catch {
    // ignore
  }
}

export function consumeAuthIntent(): "sign_up" | "login" | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(AUTH_INTENT_KEY);
    window.sessionStorage.removeItem(AUTH_INTENT_KEY);
    if (value === "sign_up" || value === "login") return value;
  } catch {
    // ignore
  }
  return null;
}
