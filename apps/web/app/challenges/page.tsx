"use client"

import { UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { DatasetPreview, type DatasetColumn } from "@/components/dataset-preview"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const creatorDatasetRows = [
  {
    post_id: "TT0001",
    creator_handle: "urbanuma",
    creator_category: "fashion",
    followers_at_post: 109400,
    post_date: "2025-09-01",
    post_hour: 20,
    content_format: "fit check",
    video_length_sec: 18,
    hashtag_count: 4,
    views: 132440,
    likes: 14210,
    comments: 682,
    shares: 913,
    avg_watch_time_sec: 14.8,
    completion_rate_pct: 78.4,
  },
  {
    post_id: "TT0002",
    creator_handle: "vibewithvic",
    creator_category: "beauty",
    followers_at_post: 154200,
    post_date: "2025-09-03",
    post_hour: 18,
    content_format: "tutorial",
    video_length_sec: 29,
    hashtag_count: 6,
    views: 168920,
    likes: 19310,
    comments: 905,
    shares: 1221,
    avg_watch_time_sec: 21.3,
    completion_rate_pct: 72.6,
  },
  {
    post_id: "TT0003",
    creator_handle: "bytewithben",
    creator_category: "studytok",
    followers_at_post: 84210,
    post_date: "2025-09-05",
    post_hour: 9,
    content_format: "study vlog",
    video_length_sec: 41,
    hashtag_count: 5,
    views: 96440,
    likes: 8812,
    comments: 544,
    shares: 412,
    avg_watch_time_sec: 28.9,
    completion_rate_pct: 61.7,
  },
  {
    post_id: "TT0004",
    creator_handle: "rayreviews",
    creator_category: "gaming",
    followers_at_post: 126800,
    post_date: "2025-09-07",
    post_hour: 22,
    content_format: "review",
    video_length_sec: 37,
    hashtag_count: 3,
    views: 143520,
    likes: 13411,
    comments: 603,
    shares: 774,
    avg_watch_time_sec: 24.7,
    completion_rate_pct: 67.9,
  },
  {
    post_id: "TT0005",
    creator_handle: "islasnaps",
    creator_category: "food",
    followers_at_post: 91880,
    post_date: "2025-09-10",
    post_hour: 12,
    content_format: "recipe",
    video_length_sec: 24,
    hashtag_count: 7,
    views: 121880,
    likes: 11220,
    comments: 488,
    shares: 690,
    avg_watch_time_sec: 17.1,
    completion_rate_pct: 74.2,
  },
  {
    post_id: "TT0006",
    creator_handle: "hypewithhari",
    creator_category: "comedy",
    followers_at_post: 171500,
    post_date: "2025-09-14",
    post_hour: 19,
    content_format: "skit",
    video_length_sec: 33,
    hashtag_count: 4,
    views: 208600,
    likes: 25610,
    comments: 1110,
    shares: 1684,
    avg_watch_time_sec: 25.6,
    completion_rate_pct: 69.8,
  },
  {
    post_id: "TT0007",
    creator_handle: "learnwithlena",
    creator_category: "studytok",
    followers_at_post: 135900,
    post_date: "2025-09-18",
    post_hour: 8,
    content_format: "listicle",
    video_length_sec: 26,
    hashtag_count: 5,
    views: 158440,
    likes: 17480,
    comments: 733,
    shares: 905,
    avg_watch_time_sec: 19.8,
    completion_rate_pct: 76.1,
  },
  {
    post_id: "TT0008",
    creator_handle: "pixelwithpaz",
    creator_category: "gaming",
    followers_at_post: 112300,
    post_date: "2025-09-24",
    post_hour: 17,
    content_format: "duet",
    video_length_sec: 21,
    hashtag_count: 4,
    views: 179760,
    likes: 18944,
    comments: 814,
    shares: 1290,
    avg_watch_time_sec: 16.4,
    completion_rate_pct: 81.3,
  },
  {
    post_id: "TT0009",
    creator_handle: "quinnfitness",
    creator_category: "fitness",
    followers_at_post: 146100,
    post_date: "2025-10-01",
    post_hour: 6,
    content_format: "challenge",
    video_length_sec: 34,
    hashtag_count: 6,
    views: 162880,
    likes: 17122,
    comments: 692,
    shares: 880,
    avg_watch_time_sec: 23.4,
    completion_rate_pct: 66.5,
  },
  {
    post_id: "TT0010",
    creator_handle: "anaedits",
    creator_category: "fashion",
    followers_at_post: 101400,
    post_date: "2025-10-04",
    post_hour: 21,
    content_format: "transformation",
    video_length_sec: 27,
    hashtag_count: 5,
    views: 138920,
    likes: 14980,
    comments: 642,
    shares: 998,
    avg_watch_time_sec: 20.5,
    completion_rate_pct: 79.8,
  },
  {
    post_id: "TT0011",
    creator_handle: "jamieplays",
    creator_category: "gaming",
    followers_at_post: 187600,
    post_date: "2025-10-09",
    post_hour: 16,
    content_format: "storytime",
    video_length_sec: 43,
    hashtag_count: 3,
    views: 224710,
    likes: 24160,
    comments: 1260,
    shares: 1541,
    avg_watch_time_sec: 29.6,
    completion_rate_pct: 64.1,
  },
  {
    post_id: "TT0012",
    creator_handle: "nourishesia",
    creator_category: "food",
    followers_at_post: 96820,
    post_date: "2025-10-13",
    post_hour: 11,
    content_format: "tutorial",
    video_length_sec: 31,
    hashtag_count: 8,
    views: 117530,
    likes: 12442,
    comments: 575,
    shares: 731,
    avg_watch_time_sec: 22.7,
    completion_rate_pct: 68.6,
  },
  {
    post_id: "TT0013",
    creator_handle: "yara.yaps",
    creator_category: "comedy",
    followers_at_post: 79440,
    post_date: "2025-10-18",
    post_hour: 23,
    content_format: "reaction",
    video_length_sec: 19,
    hashtag_count: 4,
    views: 109860,
    likes: 10322,
    comments: 481,
    shares: 667,
    avg_watch_time_sec: 13.9,
    completion_rate_pct: 77.2,
  },
  {
    post_id: "TT0014",
    creator_handle: "coachmaya",
    creator_category: "fitness",
    followers_at_post: 132780,
    post_date: "2025-10-23",
    post_hour: 7,
    content_format: "routine",
    video_length_sec: 39,
    hashtag_count: 5,
    views: 151430,
    likes: 16274,
    comments: 712,
    shares: 884,
    avg_watch_time_sec: 27.1,
    completion_rate_pct: 65.4,
  },
  {
    post_id: "TT0015",
    creator_handle: "marcosmixes",
    creator_category: "food",
    followers_at_post: 118200,
    post_date: "2025-10-29",
    post_hour: 13,
    content_format: "review",
    video_length_sec: 22,
    hashtag_count: 6,
    views: 147880,
    likes: 15092,
    comments: 605,
    shares: 819,
    avg_watch_time_sec: 15.6,
    completion_rate_pct: 73.8,
  },
  {
    post_id: "TT0016",
    creator_handle: "editwithemi",
    creator_category: "beauty",
    followers_at_post: 163900,
    post_date: "2025-11-02",
    post_hour: 18,
    content_format: "grwm",
    video_length_sec: 25,
    hashtag_count: 7,
    views: 214920,
    likes: 23810,
    comments: 1044,
    shares: 1416,
    avg_watch_time_sec: 18.7,
    completion_rate_pct: 80.6,
  },
  {
    post_id: "TT0017",
    creator_handle: "solotravis",
    creator_category: "fashion",
    followers_at_post: 88730,
    post_date: "2025-11-05",
    post_hour: 15,
    content_format: "vlog",
    video_length_sec: 44,
    hashtag_count: 4,
    views: 119870,
    likes: 11148,
    comments: 532,
    shares: 628,
    avg_watch_time_sec: 26.8,
    completion_rate_pct: 62.8,
  },
  {
    post_id: "TT0018",
    creator_handle: "snapbysofia",
    creator_category: "beauty",
    followers_at_post: 143500,
    post_date: "2025-11-09",
    post_hour: 20,
    content_format: "challenge",
    video_length_sec: 28,
    hashtag_count: 5,
    views: 186440,
    likes: 20590,
    comments: 962,
    shares: 1338,
    avg_watch_time_sec: 19.9,
    completion_rate_pct: 79.1,
  },
]

const creatorDatasetColumns: DatasetColumn<
  (typeof creatorDatasetRows)[number]
>[] = [
  { key: "post_id", cellClassName: "font-mono" },
  { key: "creator_handle", cellClassName: "font-mono" },
  { key: "creator_category" },
  { key: "followers_at_post", cellClassName: "font-mono" },
  { key: "post_date", cellClassName: "font-mono" },
  { key: "post_hour", cellClassName: "font-mono" },
  { key: "content_format" },
  { key: "video_length_sec", cellClassName: "font-mono" },
  { key: "hashtag_count", cellClassName: "font-mono" },
  { key: "views", cellClassName: "font-mono" },
  { key: "likes", cellClassName: "font-mono" },
  { key: "comments", cellClassName: "font-mono" },
  { key: "shares", cellClassName: "font-mono" },
  { key: "avg_watch_time_sec", cellClassName: "font-mono" },
  { key: "completion_rate_pct", cellClassName: "font-mono" },
]

const challengeCatalog = [
  { label: "TikTok Creators", available: true, active: true },
  { label: "Spotify Songs", available: false, active: false },
  { label: "NBA Player Stats", available: false, active: false },
  { label: "Netflix Titles", available: false, active: false },
  { label: "Airbnb Listings", available: false, active: false },
  { label: "YouTube Comments", available: false, active: false },
]

export default function ChallengesPage() {
  const [isLightTheme, setIsLightTheme] = useState(false)
  const [isChallengesOpen, setIsChallengesOpen] = useState(true)

  const railBorderClass = isLightTheme ? "border-black/10" : "border-white/10"
  const sidebarClass = isLightTheme
    ? "border-black/10 bg-[#f4efe4] text-[#171411] shadow-2xl shadow-[#d8cfbf]/35"
    : "border-white/12 bg-[#0b0b0b] text-[#f2f1ea] shadow-2xl shadow-black/40"
  const rowTextClass = isLightTheme ? "text-[#171411]" : "text-[#f2f1ea]"
  const mutedTextClass = isLightTheme ? "text-[#73695d]" : "text-[#8f8b80]"
  const bodyTextClass = isLightTheme ? "text-[#5e554a]" : "text-[#c9c4b8]"
  const accentTextClass = isLightTheme ? "text-[#c16508]" : "text-[#ffbd2e]"
  const rowHoverClass = isLightTheme ? "hover:bg-black/[0.04]" : "hover:bg-white/5"
  const summaryCardClass = isLightTheme
    ? "border-black/10 bg-[#f7f2e8] shadow-2xl shadow-[#d8cfbf]/20"
    : "border-white/12 bg-black/40 shadow-2xl shadow-black/40"

  return (
    <main
      className={cn(
        "h-dvh overflow-hidden transition-colors",
        isLightTheme ? "bg-[#ebe6da] text-[#171411]" : "bg-[#0A0A0A] text-[#f2f1ea]"
      )}
    >
      <SidebarProvider className="mx-auto grid h-full min-h-0 w-full max-w-[1500px] grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[19.75rem_minmax(0,1fr)] lg:grid-rows-1 lg:px-6 xl:px-8">
        <Sidebar className={cn("h-full", sidebarClass)}>
          <SidebarHeader className={cn("border-b", railBorderClass)}>
            <Link
              href="/"
              className={cn(
                "flex items-center gap-4 border-b px-4 py-4 transition-colors",
                railBorderClass,
                rowHoverClass
              )}
            >
              <Image
                src="/datagolf.jpg"
                alt="datagolf logo"
                width={40}
                height={40}
                priority
                className="h-10 w-10 object-cover"
              />
              <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                datagolf
              </span>
            </Link>

            <div className="flex items-center gap-3 px-4 py-4">
              <HugeiconsIcon
                icon={UserIcon}
                strokeWidth={2}
                className={cn("size-4 shrink-0", mutedTextClass)}
              />
              <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                imanmokua
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-0">
            <button
              type="button"
              aria-pressed={isLightTheme}
              onClick={() => setIsLightTheme((current) => !current)}
              className={cn(
                "flex w-full items-center justify-between border-b px-4 py-5 text-left transition-colors",
                railBorderClass,
                rowHoverClass
              )}
            >
              <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                Theme
              </span>
              <span
                className={cn(
                  "flex h-6 w-11 items-center border p-[2px] transition-colors",
                  isLightTheme ? "justify-end" : "justify-start",
                  isLightTheme
                    ? "border-black/15 bg-[#e5dbc9]"
                    : "border-white/20 bg-[#121212]"
                )}
              >
                <span
                  className={cn(
                    "h-4 w-4",
                    isLightTheme
                      ? "bg-[#171411]"
                      : "bg-[#f2f1ea]"
                  )}
                />
              </span>
            </button>

            <div className={cn("border-b px-4 py-5", railBorderClass)}>
              <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                Leaderboard
              </span>
            </div>

            <div className={cn("border-b px-4 py-5", railBorderClass)}>
              <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                How to Play
              </span>
            </div>

            <div className={cn("min-h-0 flex-1 border-b", railBorderClass)}>
              <button
                type="button"
                onClick={() => setIsChallengesOpen((current) => !current)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-5 text-left transition-colors",
                  rowHoverClass
                )}
              >
                <span className={cn("text-[15px] tracking-[0.06em]", rowTextClass)}>
                  Challenges
                </span>
                <span
                  className={cn(
                    "text-[13px] transition-transform",
                    mutedTextClass,
                    isChallengesOpen ? "rotate-0" : "-rotate-90"
                  )}
                >
                  ▾
                </span>
              </button>

              {isChallengesOpen ? (
                <div className="hide-scrollbar max-h-full overflow-y-auto px-4 pb-6">
                  <ol className="space-y-3 pt-2">
                    {challengeCatalog.map((challenge, index) => (
                      <li key={challenge.label} className="flex items-baseline gap-3">
                        <span
                          className={cn(
                            "w-[2ch] shrink-0 text-right text-[11px] leading-8 tabular-nums",
                            mutedTextClass
                          )}
                        >
                          {index + 1}.
                        </span>
                        <span
                          aria-disabled={!challenge.available}
                          className={cn(
                            "min-w-0 flex-1 truncate text-[14px] leading-8 tracking-[0.04em]",
                            challenge.active ? rowTextClass : mutedTextClass,
                            !challenge.available && "cursor-not-allowed opacity-75"
                          )}
                        >
                          {challenge.label}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </SidebarContent>

          <SidebarFooter className={cn("mt-auto border-t", railBorderClass)}>
            <p className={cn("px-4 py-4 text-[12px] leading-7", bodyTextClass)}>
              Send feedback and any ideas to{" "}
              <a
                href="https://x.com/imanmokua"
                target="_blank"
                rel="noopener noreferrer"
                className={cn("underline underline-offset-3", rowTextClass)}
              >
                @imanmokua
              </a>
              .
            </p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-h-0 overflow-hidden">
          <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div className={cn("shrink-0 border px-4 py-4 shadow-2xl sm:px-5", summaryCardClass)}>
              <div className="max-w-3xl">
                  <div className={cn("text-[11px] uppercase tracking-[0.24em]", mutedTextClass)}>
                    Dataset
                  </div>
                  <h1 className={cn("mt-2 text-[1.15rem] uppercase tracking-[0.18em] sm:text-[1.35rem]", accentTextClass)}>
                    TikTok creator posts
                  </h1>
                  <p className={cn("mt-3 text-[12px] leading-6", bodyTextClass)}>
                    A synthetic creator-post dataset with 500 rows, 25
                    creators, and 15 columns covering posting time, format,
                    views, likes, comments, shares, watch time, and completion.
                  </p>
              </div>
            </div>

            <DatasetPreview
              eyebrow="Dataset Preview"
              title="TikTok Creator Posts"
              metaLabel={`Columns (${creatorDatasetColumns.length})`}
              tone={isLightTheme ? "light" : "dark"}
              columns={creatorDatasetColumns}
              rows={creatorDatasetRows}
              rowKey="post_id"
              className="min-h-0 flex-1 p-3 sm:p-4"
            />
          </section>
        </SidebarInset>
      </SidebarProvider>
    </main>
  )
}
