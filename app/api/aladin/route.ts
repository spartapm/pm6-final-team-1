import { NextRequest, NextResponse } from "next/server";
import { BESTSELLER_ISBN13 } from "@/lib/bestseller-isbn13";

const ALADIN_API_KEY = "ttb2452smile1226002";
const ALADIN_BASE_URL = "https://www.aladin.co.kr/ttb/api";

type AladinMode = "search" | "lookup" | "bestseller" | "fixed-bestsellers";

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
    const safeLimit = Math.min(Math.max(limit, 1), source.length);
    const items = await lookupIsbn13Batch(source.slice(0, safeLimit));
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

async function lookupIsbn13(isbn13: string) {
  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY,
    output: "js",
    Version: "20131101",
    Cover: "Big",
    OptResult: "ratingInfo,reviewList,cardReviewImgList",
    ItemId: isbn13,
    ItemIdType: "ISBN13"
  });

  const response = await fetch(`${ALADIN_BASE_URL}/ItemLookUp.aspx?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.item?.[0] ?? null;
}

async function lookupIsbn13Batch(isbn13List: string[]) {
  const chunks = chunk(isbn13List, 10);
  const results = [];

  for (const isbn13Chunk of chunks) {
    const params = new URLSearchParams({
      ttbkey: ALADIN_API_KEY,
      output: "js",
      Version: "20131101",
      Cover: "Big",
      OptResult: "ratingInfo,reviewList,cardReviewImgList",
      ItemId: isbn13Chunk.join(","),
      ItemIdType: "ISBN13"
    });

    const response = await fetch(`${ALADIN_BASE_URL}/ItemLookUp.aspx?${params.toString()}`, { cache: "no-store" });

    if (!response.ok) {
      const fallbackItems = await Promise.all(isbn13Chunk.map((isbn13) => lookupIsbn13(isbn13)));
      results.push(...fallbackItems.filter(Boolean));
      continue;
    }

    const data = await response.json();
    if (!data.item?.length) {
      const fallbackItems = await Promise.all(isbn13Chunk.map((isbn13) => lookupIsbn13(isbn13)));
      results.push(...fallbackItems.filter(Boolean));
      continue;
    }

    results.push(...data.item);
  }

  return results;
}

function chunk<T>(items: T[], size: number) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function noStoreJson(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
