import Image from "next/image";
import Link from "next/link";

const navItems = [
  { label: "Home", href: "#" },
  { label: "Challenges", href: "#challenges" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "Profile", href: "#profile" },
];

export default function Page() {
  return (
    <main className="relative h-dvh overflow-hidden bg-[#0A0A0A] text-[#f2f1ea]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,183,77,0.14),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(77,193,255,0.1),_transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex h-full w-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:w-[70vw] xl:max-w-[1320px] xl:px-0">
        <header className="flex shrink-0 flex-wrap items-center gap-2">
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
            <span className="flex items-center border-l border-white/15 px-4">
              datagolf
            </span>
          </Link>

          <nav className="flex flex-wrap border border-white/15 bg-white/5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="border-r border-white/15 px-3 py-2 text-[13px] tracking-[0.08em] text-[#eae7db] transition last:border-r-0 hover:bg-white/8"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 py-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6 lg:py-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-[#ffbd2e]">
              Data analysis for people who like short answers
            </p>
            <h1 className="font-sans text-[clamp(2.2rem,4.7vw,4.2rem)] leading-[0.92] tracking-[0.02em] text-[#f7f4eb]">
              datagolf
            </h1>
            <p className="mt-3 max-w-2xl text-[clamp(0.82rem,1.05vw,1rem)] leading-6 tracking-[0.02em] text-[#d9d4c7]">
              Datagolf turns data analysis into a game. You prompt your way
              through real datasets, competing to find the shortest path to the
              answer.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="#challenges"
                className="border border-[#f7f4eb] bg-[#f7f4eb] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#090909] transition hover:translate-y-[-1px] hover:bg-white"
              >
                Start challenge
              </Link>
              <Link
                href="#leaderboard"
                className="border border-white/20 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f7f4eb] transition hover:bg-white/10"
              >
                View leaderboard
              </Link>
            </div>
          </div>

          <div className="grid min-h-0 gap-3">
            <div
              id="challenges"
              className="border border-white/12 bg-black/40 p-2.5 shadow-2xl shadow-black/40 sm:p-3"
            >
              <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                <span>Prompt</span>
                <span>Challenge 01</span>
              </div>
              <div className="border border-white/10 bg-[#111111] p-3 text-[13px] leading-6 text-[#f2f1ea]">
                Analyze a TikTok account for a high school club and identify
                which video format drives the most saves, shares, and follows.
                Return the top 5 posts ranked by engagement lift.
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="border border-white/12 bg-black/40 p-2.5 shadow-2xl shadow-black/40 sm:p-3">
                <div className="mb-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#bdb8aa]">
                  <span>Code</span>
                  <span>Python</span>
                </div>
                <pre className="overflow-hidden border border-white/10 bg-[#111111] p-3 text-[12px] leading-6 text-[#f2f1ea]">
                  <code>{`df.groupby("player")
  .tail(12)
  .groupby("player")["sg"]
  .mean()
  .sort_values(ascending=False)
  .head(5)`}</code>
                </pre>
              </div>

            </div>
          </div>
        </section>

        <footer className="flex shrink-0 items-center gap-3 border-t border-white/10 pt-2 text-[11px] text-[#bdb8aa]">
          <Image
            src="/datagolf_logo.jpg"
            alt="datagolf logo"
            width={24}
            height={24}
            className="h-5 w-5"
          />
          <span>Built by Iman</span>
          <span className="uppercase tracking-[0.22em] text-[#ffbd2e]">
            v0.1
          </span>
        </footer>
      </div>
    </main>
  );
}
