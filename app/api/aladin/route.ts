import { NextRequest, NextResponse } from "next/server";
import { BESTSELLER_ISBN13 } from "@/lib/bestseller-isbn13";

const ALADIN_API_KEY = "ttb2452smile1226002";
const ALADIN_BASE_URL = "https://www.aladin.co.kr/ttb/api";

type AladinMode = "search" | "lookup" | "bestseller" | "fixed-bestsellers";
type AladinItem = { isbn13?: string };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "search") as AladinMode;
  const query = searchParams.get("query") ?? "";
  const itemId = searchParams.get("itemId") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit = Number(searchParams.get("limit") ?? "24");
  const requestedIsbn13 = searchParams.get("isbn13")?.split(",").filter(Boolean) ?? [];

  if (mode === "fixed-bestsellers") {
    const source = requestedIsbn13.length > 0 ? requestedIsbn13 : [...BESTSELLER_ISBN13];
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
    const safeLimit = Math.min(Math.max(limit, 1), 40);
    const slice = source.slice(offset, offset + safeLimit);
    const items = await lookupIsbn13Batch(slice);
    return noStoreJson({ item: items.filter(Boolean) });
  }

  const endpoint = mode === "lookup" ? "ItemLookUp.aspx" : "ItemSearch.aspx";
  const aladinParams = new URLSearchParams({
    ttbkey: ALADIN_API_KEY,
    output: "js",
    Version: "20131101",
    Cover: "Big",
    OptResult: "ratingInfo,reviewList,cardReviewImgList",
    MaxResults: "24",
    start: page
  });

  if (mode === "lookup") {
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    aladinParams.set("ItemId", itemId);
    aladinParams.set("ItemIdType", itemId.length === 13 ? "ISBN13" : "ISBN");
  } else {
    aladinParams.set("Query", query || "베스트셀러");
    aladinParams.set("QueryType", mode === "bestseller" ? "Bestseller" : "Keyword");
    aladinParams.set("SearchTarget", "Book");
    aladinParams.set("Sort", "SalesPoint");
  }

  const response = await fetch(`${ALADIN_BASE_URL}/${endpoint}?${aladinParams.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch Aladin API" }, { status: response.status });
  }

  const data = await response.json();
  return noStoreJson(data);
}

async function lookupIsbn13(isbn13: string, attempt = 0): Promise<AladinItem | null> {
  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY,
    output: "js",
    Version: "20131101",
    Cover: "Big",
    OptResult: "ratingInfo,reviewList,cardReviewImgList",
    ItemId: isbn13,
    ItemIdType: "ISBN13"
  });

  try {
    const response = await fetch(`${ALADIN_BASE_URL}/ItemLookUp.aspx?${params.toString()}`, { cache: "no-store" });
    const text = await response.text();

    if (!response.ok) {
      if (attempt < 2) {
        await sleep(250 * (attempt + 1));
        return lookupIsbn13(isbn13, attempt + 1);
      }
      return null;
    }

    let data: { errorCode?: number; item?: AladinItem[] };
    try {
      data = JSON.parse(text);
    } catch {
      if (attempt < 2) {
        await sleep(300 * (attempt + 1));
        return lookupIsbn13(isbn13, attempt + 1);
      }
      return null;
    }

    if (data.errorCode || !data.item?.[0]) {
      return null;
    }

    return data.item[0];
  } catch {
    if (attempt < 2) {
      await sleep(300 * (attempt + 1));
      return lookupIsbn13(isbn13, attempt + 1);
    }
    return null;
  }
}

async function lookupIsbn13Batch(isbn13List: string[]) {
  // Aladin ItemLookUp does not support comma-separated ItemId values.
  // Look up each ISBN13 individually with low concurrency to avoid throttling.
  const results = new Map<string, AladinItem>();
  const chunks = chunk(isbn13List, 3);

  for (const isbn13Chunk of chunks) {
    const items = await Promise.all(isbn13Chunk.map((isbn13) => lookupIsbn13(isbn13)));
    items.forEach((item, index) => {
      if (!item) return;
      results.set(isbn13Chunk[index], item);
    });
    // Small gap between chunks reduces Aladin rate-limit failures.
    await sleep(120);
  }

  return isbn13List.map((isbn13) => results.get(isbn13)).filter(Boolean);
}

function chunk<T>(items: T[], size: number) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function noStoreJson(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
