import { NextRequest, NextResponse } from "next/server";

const ALADIN_API_KEY = "ttb2452smile1226001";
const ALADIN_BASE_URL = "https://www.aladin.co.kr/ttb/api";

type AladinMode = "search" | "lookup" | "bestseller";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "search") as AladinMode;
  const query = searchParams.get("query") ?? "";
  const itemId = searchParams.get("itemId") ?? "";
  const page = searchParams.get("page") ?? "1";

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

  const response = await fetch(`${ALADIN_BASE_URL}/${endpoint}?${aladinParams.toString()}`, {
    next: { revalidate: 60 * 60 }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch Aladin API" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
