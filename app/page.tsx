import Image from "next/image";
import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";

const navItems = [
  { label: "Home", href: "#", active: true },
  { label: "Challenges", href: "#challenges", active: false },
  { label: "Leaderboard", href: "#leaderboard", active: false },
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
  "border-x border-b border-white/12 bg-transparent px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-[#9be58a]";

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

export default function Page() {
  return (
    <main className="relative h-dvh overflow-hidden bg-[#0A0A0A] text-[#f2f1ea]">
      <div className="relative mx-auto flex h-full w-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:w-[70vw] xl:max-w-[1320px] xl:px-0">
        <header className="flex shrink-0 flex-wrap items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="flex h-10 items-stretch border border-white/15 bg-white/5 text-[10px] uppercase tracking-[0.24em] text-[#f2f1ea] transition hover:bg-white/8"
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

        <section className="grid min-h-0 flex-1 gap-4 py-5 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-8 lg:py-6">
          <div className="flex min-w-0 min-h-0 flex-col">
            <div className="max-w-2xl">
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
                  href="#challenges"
                  className="border border-[#f7f4eb] bg-[#f7f4eb] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#090909] transition hover:translate-y-[-1px] hover:bg-white"
                >
                  Start challenge
                </Link>
              </div>
            </div>

            <div className="mt-4 grid min-h-0 gap-8">
              <div
                id="challenges"
                className="relative w-full min-w-0 overflow-visible border border-white/12 bg-black/40 shadow-2xl shadow-black/40"
              >
                <div className="p-2.5 sm:p-3">
                  <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                    <span>Prompt</span>
                  </div>
                  <div className="break-words border border-white/10 bg-[#111111] px-3 py-3 text-[13px] leading-6 text-[#f2f1ea]">
                    {challengePrompt}
                  </div>
                </div>
                <div className="pointer-events-none absolute right-[-1px] top-full">
                  <div className={tokenCountStyle}>{promptTokenCount} tokens</div>
                </div>
              </div>

              <div className="relative w-full min-w-0 overflow-visible border border-white/12 bg-black/40 shadow-2xl shadow-black/40">
                <div className="p-2.5 sm:p-3">
                  <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                    <span>Code (R)</span>
                  </div>
                  <pre className="hide-scrollbar max-h-56 overflow-auto border border-white/10 bg-[#111111] p-3 text-[12px] leading-6 text-[#f2f1ea]">
                    <code className="block w-max min-w-full whitespace-pre">
                      <HighlightedRCode />
                    </code>
                  </pre>
                </div>
                <div className="pointer-events-none absolute right-[-1px] top-full">
                  <div className={tokenCountStyle}>{codeTokenCount} tokens</div>
                </div>
              </div>
            </div>
          </div>

          <div
            id="leaderboard"
            className="flex min-w-0 min-h-0 flex-col overflow-hidden border border-white/12 bg-black/40 p-3 shadow-2xl shadow-black/40 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
              <span>Dataset</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-white/10 bg-[#111111]">
              <div className="border-b border-white/10 px-4 py-4">
                <div className="text-[15px] uppercase tracking-[0.22em] text-[#f2f1ea]">
                  TikTok Posts
                </div>
              </div>
              <div className="border-b border-white/10 px-4 py-3">
                <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.2em] text-[#9bb0c7]">
                  <span>Columns (10)</span>
                  <span>Scrollable preview</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
                <table className="min-w-max border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 z-10 bg-[#12151b] text-[#9bb0c7]">
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 font-normal">post_id</th>
                      <th className="px-4 py-3 font-normal">post_date</th>
                      <th className="px-4 py-3 font-normal">format</th>
                      <th className="px-4 py-3 font-normal">views</th>
                      <th className="px-4 py-3 font-normal">likes</th>
                      <th className="px-4 py-3 font-normal">shares</th>
                      <th className="px-4 py-3 font-normal">saves</th>
                      <th className="px-4 py-3 font-normal">follows</th>
                      <th className="px-4 py-3 font-normal">avg_watch_sec</th>
                      <th className="px-4 py-3 font-normal">engagement_lift</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#e8ecf2]">
                    {tiktokRows.map((row) => (
                      <tr key={row.post_id} className="border-b border-white/8">
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.post_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.post_date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.format}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.views}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.likes}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.shares}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.saves}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.follows}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.avg_watch_sec}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.engagement_lift}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative flex w-full shrink-0 items-center justify-between border-t border-white/10 pt-2 text-[11px] text-[#bdb8aa]">
          <div className="flex items-center gap-3">
            <Image
              src="/datagolf_logo.jpg"
              alt="datagolf logo"
              width={24}
              height={24}
              className="h-5 w-5"
            />
            <span>
              Built by <span className="underline underline-offset-2">Iman</span>
            </span>
          </div>
          <span className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center">
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
          <span className="uppercase tracking-[0.22em] text-[#ffbd2e]">
            v0.1
          </span>
        </footer>
      </div>
    </main>
  );
}
