import Image from "next/image";
import Link from "next/link";
import { DatasetPreview, type DatasetColumn } from "@/components/dataset-preview";
import { SiteNavbar } from "@/components/site-navbar";

const navItems = [
  { label: "Home", href: "/", active: true },
  { label: "Challenges", href: "/challenges", active: true },
  { label: "Leaderboard", href: "#leaderboard", active: true },
  { label: "Profile", href: "#profile", active: false },
];

type CodeToken = {
  text: string;
  className?: string;
};

const challengePrompt =
  "Analyze a TikTok account for a high school club and identify which video format drives the most saves, shares, and follows. Return the top 5 posts ranked by engagement lift.";

const rCodeLines: CodeToken[][] = [
  [
    { text: "library", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "dplyr", className: "text-[#8ce99a]" },
    { text: ")", className: "text-[#f2f1ea]" },
  ],
  [],
  [
    { text: "posts", className: "text-[#f2f1ea]" },
    { text: " ", className: "text-[#f2f1ea]" },
    { text: "%>%", className: "text-[#b8a1ff]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "mutate", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
  ],
  [
    { text: "    ", className: "text-[#f2f1ea]" },
    { text: "engagement_lift", className: "text-[#f2f1ea]" },
    { text: " = ", className: "text-[#f2f1ea]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "likes", className: "text-[#f2f1ea]" },
    { text: " + ", className: "text-[#f2f1ea]" },
    { text: "shares", className: "text-[#f2f1ea]" },
    { text: " + ", className: "text-[#f2f1ea]" },
    { text: "saves", className: "text-[#f2f1ea]" },
    { text: " + ", className: "text-[#f2f1ea]" },
    { text: "follows", className: "text-[#f2f1ea]" },
    { text: ") / ", className: "text-[#f2f1ea]" },
    { text: "views", className: "text-[#f2f1ea]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: ")", className: "text-[#f2f1ea]" },
    { text: " ", className: "text-[#f2f1ea]" },
    { text: "%>%", className: "text-[#b8a1ff]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "group_by", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "format", className: "text-[#f2f1ea]" },
    { text: ")", className: "text-[#f2f1ea]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "%>%", className: "text-[#b8a1ff]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "summarize", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "avg_lift", className: "text-[#f2f1ea]" },
    { text: " = ", className: "text-[#f2f1ea]" },
    { text: "mean", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "engagement_lift", className: "text-[#f2f1ea]" },
    { text: ")", className: "text-[#f2f1ea]" },
    { text: ", ", className: "text-[#f2f1ea]" },
    { text: ".groups", className: "text-[#f2f1ea]" },
    { text: " = ", className: "text-[#f2f1ea]" },
    { text: "\"drop\"", className: "text-[#86efac]" },
    { text: ")", className: "text-[#f2f1ea]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "%>%", className: "text-[#b8a1ff]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "arrange", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "desc", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "avg_lift", className: "text-[#f2f1ea]" },
    { text: ")", className: "text-[#f2f1ea]" },
    { text: ")", className: "text-[#f2f1ea]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "%>%", className: "text-[#b8a1ff]" },
  ],
  [
    { text: "  ", className: "text-[#f2f1ea]" },
    { text: "slice_head", className: "text-[#8bd5ff]" },
    { text: "(", className: "text-[#f2f1ea]" },
    { text: "n", className: "text-[#f2f1ea]" },
    { text: " = ", className: "text-[#f2f1ea]" },
    { text: "5", className: "text-[#ffd479]" },
    { text: ")", className: "text-[#f2f1ea]" },
  ],
];

const tokenCountStyle =
  "inline-flex items-center justify-center whitespace-nowrap rounded-none border-x border-b border-white/12 bg-[#111111] px-3 py-2 text-[10px] uppercase leading-none tracking-[0.24em] text-[#9be58a] md:bg-transparent md:px-2 md:py-1 md:tracking-[0.22em]";
const tokenCountDockStyle = "pointer-events-none flex justify-end";

function countDisplayTokens(text: string) {
  return text.match(/\w+|[^\s\w]/g)?.length ?? 0;
}

const rCodeText = rCodeLines.map((line) => line.map((token) => token.text).join("")).join("\n");

const promptTokenCount = countDisplayTokens(challengePrompt);
const codeTokenCount = countDisplayTokens(rCodeText);

function HighlightedRCode() {
  return (
    <>
      {rCodeLines.map((line, lineIndex) => (
        <span key={lineIndex} className="block">
          {line.length === 0 ? (
            <span>&nbsp;</span>
          ) : (
            line.map((token, tokenIndex) => (
              <span
                key={`${lineIndex}-${tokenIndex}`}
                className={token.className}
              >
                {token.text}
              </span>
            ))
          )}
        </span>
      ))}
    </>
  );
}

const tiktokRows = [
  {
    post_id: "tk_1001",
    post_date: "2026-03-01",
    format: "get ready with me",
    views: 18420,
    likes: 2310,
    shares: 412,
    saves: 298,
    follows: 184,
    avg_watch_sec: 41,
    engagement_lift: 18.4,
  },
  {
    post_id: "tk_1002",
    post_date: "2026-03-02",
    format: "study vlog",
    views: 15670,
    likes: 1985,
    shares: 355,
    saves: 241,
    follows: 133,
    avg_watch_sec: 38,
    engagement_lift: 16.7,
  },
  {
    post_id: "tk_1003",
    post_date: "2026-03-03",
    format: "dance trend",
    views: 26890,
    likes: 4210,
    shares: 980,
    saves: 612,
    follows: 421,
    avg_watch_sec: 54,
    engagement_lift: 25.1,
  },
  {
    post_id: "tk_1004",
    post_date: "2026-03-04",
    format: "day in life",
    views: 20450,
    likes: 2774,
    shares: 507,
    saves: 330,
    follows: 198,
    avg_watch_sec: 47,
    engagement_lift: 20.6,
  },
  {
    post_id: "tk_1005",
    post_date: "2026-03-05",
    format: "grwm",
    views: 22310,
    likes: 3055,
    shares: 612,
    saves: 401,
    follows: 244,
    avg_watch_sec: 49,
    engagement_lift: 22.8,
  },
  {
    post_id: "tk_1006",
    post_date: "2026-03-06",
    format: "pov skit",
    views: 17780,
    likes: 2144,
    shares: 399,
    saves: 273,
    follows: 167,
    avg_watch_sec: 39,
    engagement_lift: 17.9,
  },
  {
    post_id: "tk_1007",
    post_date: "2026-03-07",
    format: "campus tour",
    views: 19240,
    likes: 2411,
    shares: 444,
    saves: 295,
    follows: 176,
    avg_watch_sec: 42,
    engagement_lift: 19.2,
  },
  {
    post_id: "tk_1008",
    post_date: "2026-03-08",
    format: "hackathon recap",
    views: 24860,
    likes: 3520,
    shares: 710,
    saves: 455,
    follows: 288,
    avg_watch_sec: 51,
    engagement_lift: 23.6,
  },
  {
    post_id: "tk_1009",
    post_date: "2026-03-09",
    format: "exam tips",
    views: 23140,
    likes: 2870,
    shares: 533,
    saves: 367,
    follows: 219,
    avg_watch_sec: 46,
    engagement_lift: 21.0,
  },
  {
    post_id: "tk_1010",
    post_date: "2026-03-10",
    format: "friends montage",
    views: 21910,
    likes: 2695,
    shares: 498,
    saves: 341,
    follows: 207,
    avg_watch_sec: 44,
    engagement_lift: 20.1,
  },
  {
    post_id: "tk_1011",
    post_date: "2026-03-11",
    format: "morning routine",
    views: 16780,
    likes: 2040,
    shares: 366,
    saves: 228,
    follows: 129,
    avg_watch_sec: 37,
    engagement_lift: 15.8,
  },
  {
    post_id: "tk_1012",
    post_date: "2026-03-12",
    format: "after-school fit check",
    views: 28910,
    likes: 4380,
    shares: 1012,
    saves: 658,
    follows: 472,
    avg_watch_sec: 56,
    engagement_lift: 26.4,
  },
  {
    post_id: "tk_1013",
    post_date: "2026-03-13",
    format: "club promo",
    views: 14560,
    likes: 1762,
    shares: 311,
    saves: 208,
    follows: 121,
    avg_watch_sec: 35,
    engagement_lift: 14.9,
  },
  {
    post_id: "tk_1014",
    post_date: "2026-03-14",
    format: "storytime",
    views: 26220,
    likes: 3590,
    shares: 754,
    saves: 482,
    follows: 316,
    avg_watch_sec: 53,
    engagement_lift: 24.0,
  },
  {
    post_id: "tk_1015",
    post_date: "2026-03-15",
    format: "trend mashup",
    views: 30150,
    likes: 4720,
    shares: 1120,
    saves: 703,
    follows: 501,
    avg_watch_sec: 58,
    engagement_lift: 27.8,
  },
  {
    post_id: "tk_1016",
    post_date: "2026-03-16",
    format: "teacher reaction",
    views: 21100,
    likes: 2565,
    shares: 460,
    saves: 302,
    follows: 188,
    avg_watch_sec: 43,
    engagement_lift: 19.7,
  },
  {
    post_id: "tk_1017",
    post_date: "2026-03-17",
    format: "glow up edit",
    views: 27540,
    likes: 4010,
    shares: 890,
    saves: 566,
    follows: 389,
    avg_watch_sec: 55,
    engagement_lift: 25.9,
  },
  {
    post_id: "tk_1018",
    post_date: "2026-03-18",
    format: "lunch table talk",
    views: 13240,
    likes: 1480,
    shares: 250,
    saves: 171,
    follows: 97,
    avg_watch_sec: 31,
    engagement_lift: 13.4,
  },
  {
    post_id: "tk_1019",
    post_date: "2026-03-19",
    format: "weekend recap",
    views: 24100,
    likes: 3211,
    shares: 628,
    saves: 412,
    follows: 255,
    avg_watch_sec: 48,
    engagement_lift: 22.5,
  },
  {
    post_id: "tk_1020",
    post_date: "2026-03-20",
    format: "trend sound clip",
    views: 31280,
    likes: 4985,
    shares: 1186,
    saves: 744,
    follows: 534,
    avg_watch_sec: 61,
    engagement_lift: 28.9,
  },
];

const homepageDatasetColumns: DatasetColumn<(typeof tiktokRows)[number]>[] = [
  { key: "post_id", cellClassName: "font-mono" },
  { key: "post_date", cellClassName: "font-mono" },
  { key: "format" },
  { key: "views", cellClassName: "font-mono" },
  { key: "likes", cellClassName: "font-mono" },
  { key: "shares", cellClassName: "font-mono" },
  { key: "saves", cellClassName: "font-mono" },
  { key: "follows", cellClassName: "font-mono" },
  { key: "avg_watch_sec", cellClassName: "font-mono" },
  { key: "engagement_lift", cellClassName: "font-mono" },
];

export default function Page() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#0A0A0A] text-[#f2f1ea] xl:h-dvh xl:overflow-hidden">
      <div className="relative mx-auto flex min-h-dvh w-full min-w-0 flex-col px-4 py-4 sm:px-6 sm:py-5 md:px-14 lg:px-20 xl:h-full xl:w-[70vw] xl:max-w-[1320px] xl:overflow-hidden xl:px-0 xl:py-0">
        <header className="flex w-full min-w-0 shrink-0 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:fixed md:inset-x-0 md:top-4 md:z-30 md:flex-nowrap md:items-center md:gap-8 md:bg-[#0A0A0A]/95 md:px-14 md:py-3 md:backdrop-blur lg:px-20 xl:absolute xl:left-0 xl:right-0 xl:top-6 xl:bg-transparent xl:px-0 xl:py-0">
          <Link
            href="/"
            className="hidden h-10 items-stretch border border-white/15 bg-white/5 text-[10px] uppercase tracking-[0.24em] text-[#f2f1ea] transition hover:bg-white/8 md:flex"
          >
            <Image
              src="/datagolf.jpg"
              alt="datagolf favicon"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-cover"
            />
          </Link>

          <SiteNavbar items={navItems} />
        </header>

        <section className="flex min-h-0 min-w-0 flex-col gap-5 py-4 pt-24 sm:gap-6 md:gap-10 md:pt-24 xl:grid xl:flex-1 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:gap-6 xl:overflow-hidden xl:py-4 xl:pt-24">
          <div className="flex min-h-0 min-w-0 flex-col xl:overflow-hidden">
            <div className="max-w-2xl shrink-0">
              <h1 className="font-sans text-[clamp(2rem,4vw,4rem)] leading-[0.92] tracking-[0.02em] text-[#ffbd2e]">
                datagolf
              </h1>
              <p className="mt-3 max-w-2xl text-[clamp(0.8rem,0.95vw,0.98rem)] leading-6 tracking-[0.02em] text-[#d9d4c7]">
                Datagolf turns data analysis into a game. You prompt your way
                through real datasets, competing to find the shortest path to
                the answer.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/challenges"
                  className="border border-[#f7f4eb] bg-[#f7f4eb] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#090909] transition hover:translate-y-[-1px] hover:bg-white"
                >
                  Start challenge
                </Link>
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-col gap-4 sm:gap-5 md:gap-8 xl:mt-5 xl:flex-1 xl:gap-4 xl:overflow-hidden">
              <div className="relative w-full min-w-0 shrink-0">
                <div
                  id="challenges"
                  className="relative w-full min-w-0 overflow-visible border border-white/12 bg-black/40 shadow-2xl shadow-black/40"
                >
                  <div className="p-2.5 sm:p-3 md:p-4">
                    <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                      <span>Prompt</span>
                    </div>
                    <div className="break-words border border-white/10 bg-[#111111] px-3 py-3 text-[13px] leading-6 text-[#f2f1ea]">
                      {challengePrompt}
                    </div>
                  </div>
                </div>
                <div className={tokenCountDockStyle}>
                  <div className={tokenCountStyle}>{promptTokenCount} tokens</div>
                </div>
              </div>

              <div className="relative flex min-h-0 w-full min-w-0 flex-col xl:flex-1 xl:overflow-hidden">
                <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-visible border border-white/12 bg-black/40 shadow-2xl shadow-black/40">
                  <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3 md:p-4">
                    <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                      <span>Code (R)</span>
                    </div>
                    <pre className="hide-scrollbar max-h-56 overflow-auto border border-white/10 bg-[#111111] p-3 text-[12px] leading-6 text-[#f2f1ea] md:max-h-64 xl:min-h-0 xl:flex-1 xl:max-h-none">
                      <code className="block w-max min-w-full whitespace-pre">
                        <HighlightedRCode />
                      </code>
                    </pre>
                  </div>
                </div>
                <div className={tokenCountDockStyle}>
                  <div className={tokenCountStyle}>{codeTokenCount} tokens</div>
                </div>
              </div>
            </div>
          </div>

          <DatasetPreview
            id="leaderboard"
            eyebrow="Dataset"
            title="TikTok Posts"
            columns={homepageDatasetColumns}
            rows={tiktokRows}
            rowKey="post_id"
            className="h-[26rem] p-3 sm:h-[30rem] sm:p-4 md:h-[38rem] lg:h-[40rem] xl:h-full"
          />
        </section>

        <footer className="relative flex w-full min-w-0 shrink-0 items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px] text-[#bdb8aa] sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:gap-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <span>
              built by{" "}
              <span className="underline underline-offset-2 transition hover:text-[#ffbd2e]">
                Iman
              </span>
            </span>
          </div>
          <span className="pointer-events-auto hidden max-w-full whitespace-normal text-left leading-5 sm:justify-self-center sm:block sm:text-center sm:whitespace-nowrap xl:absolute xl:left-1/2 xl:top-1/2 xl:-translate-x-1/2 xl:-translate-y-1/2">
            inspired by{" "}
            <a
              href="https://colf.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition hover:text-[#ffbd2e]"
            >
              colf.dev
            </a>
          </span>
          <span className="shrink-0 uppercase tracking-[0.22em] text-[#ffbd2e] sm:justify-self-end">
            v0.1
          </span>
        </footer>
      </div>
    </main>
  );
}
