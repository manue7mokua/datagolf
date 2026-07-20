"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type ChallengeDetail,
  getChallenge,
  getChallengeQuestions,
  type PublicQuestion,
} from "../../../lib/datagolf-api";
import { getAnonymousSessionId } from "../../../lib/anonymous-session";
import { summarizeChallengeProgress } from "../../../lib/challenge-runner";
import { cn } from "../../../lib/utils";

type ChallengeRunnerPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      challenge: ChallengeDetail;
      questions: PublicQuestion[];
      sessionId: string;
    }
  | { status: "error"; message: string };

export default function ChallengeRunnerPage({ params }: ChallengeRunnerPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    params.then((resolvedParams) => {
      if (mounted) {
        setSlug(resolvedParams.slug);
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let mounted = true;
    const challengeSlug = slug;

    async function loadChallenge() {
      setLoadState({ status: "loading" });

      try {
        const sessionId = getAnonymousSessionId();
        if (!sessionId) {
          throw new Error("Could not create an anonymous session.");
        }

        const [challenge, questions] = await Promise.all([
          getChallenge(challengeSlug),
          getChallengeQuestions(challengeSlug),
        ]);

        if (mounted) {
          setLoadState({ status: "ready", challenge, questions, sessionId });
          setActiveQuestionIndex(0);
        }
      } catch (error) {
        if (mounted) {
          setLoadState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load this challenge.",
          });
        }
      }
    }

    loadChallenge();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const activeQuestion =
    loadState.status === "ready"
      ? loadState.questions[activeQuestionIndex] ?? null
      : null;

  const progressSummary = useMemo(() => {
    if (loadState.status !== "ready") {
      return null;
    }

    return summarizeChallengeProgress(loadState.questions, {});
  }, [loadState]);

  return (
    <main className="min-h-dvh bg-[#0A0A0A] px-4 py-4 text-[#f2f1ea] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1500px] flex-col border border-white/12 bg-black/30">
        <header className="flex flex-col gap-4 border-b border-white/12 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <Link
              href="/challenges"
              className="text-[11px] uppercase tracking-[0.22em] text-[#8f8b80] transition-colors hover:text-[#f2f1ea]"
            >
              Challenges
            </Link>
            <h1 className="mt-2 text-[1.15rem] uppercase tracking-[0.16em] text-[#ffbd2e] sm:text-[1.35rem]">
              {loadState.status === "ready"
                ? loadState.challenge.title
                : "Challenge Runner"}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.16em] text-[#8f8b80] sm:grid-cols-4">
            <Metric label="Questions" value={progressSummary?.totalQuestions ?? "--"} />
            <Metric label="Attempted" value={progressSummary?.attemptedQuestions ?? "--"} />
            <Metric label="Correct" value={progressSummary?.correctQuestions ?? "--"} />
            <Metric label="Skipped" value={progressSummary?.skippedQuestions ?? "--"} />
          </div>
        </header>

        {loadState.status === "loading" ? (
          <StatusPanel title="Loading challenge" body="Preparing questions." />
        ) : null}

        {loadState.status === "error" ? (
          <StatusPanel title="Could not load challenge" body={loadState.message} />
        ) : null}

        {loadState.status === "ready" ? (
          <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-1">
            <aside className="border-b border-white/12 lg:border-b-0 lg:border-r">
              <div className="border-b border-white/12 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f8b80]">
                  Session
                </div>
                <div className="mt-2 truncate font-mono text-[12px] text-[#c9c4b8]">
                  {loadState.sessionId}
                </div>
              </div>

              <ol className="max-h-[18rem] overflow-y-auto p-2 lg:max-h-none">
                {loadState.questions.map((question, index) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      onClick={() => setActiveQuestionIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        index === activeQuestionIndex
                          ? "bg-white/10 text-[#f2f1ea]"
                          : "text-[#a8a197] hover:bg-white/5 hover:text-[#f2f1ea]",
                      )}
                    >
                      <span className="w-[3ch] shrink-0 font-mono text-[12px] tabular-nums">
                        Q{question.order}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {question.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>

            <section className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
              {activeQuestion ? (
                <QuestionShell question={activeQuestion} />
              ) : (
                <StatusPanel title="No question selected" body="Choose a question to begin." />
              )}
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/12 px-3 py-2">
      <div>{label}</div>
      <div className="mt-1 font-mono text-[14px] text-[#f2f1ea]">{value}</div>
    </div>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <h2 className="text-[13px] uppercase tracking-[0.2em] text-[#ffbd2e]">
          {title}
        </h2>
        <p className="mt-3 text-[13px] leading-6 text-[#c9c4b8]">{body}</p>
      </div>
    </section>
  );
}

function QuestionShell({ question }: { question: PublicQuestion }) {
  return (
    <article className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-white/12 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8f8b80]">
          Q{question.order}
        </span>
        <span className="border border-white/12 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#8f8b80]">
          {question.type.replace("_", " ")}
        </span>
      </div>

      <h2 className="mt-4 text-[1.4rem] leading-tight tracking-[0.02em] text-[#f2f1ea] sm:text-[1.8rem]">
        {question.title}
      </h2>

      {question.display.setup_text ? (
        <p className="mt-4 text-[13px] leading-7 text-[#a8a197]">
          {question.display.setup_text}
        </p>
      ) : null}

      <p className="mt-4 border-l border-[#ffbd2e]/50 pl-4 text-[14px] leading-7 text-[#f2f1ea]">
        {question.display.task_text}
      </p>

      {question.display.hint_chips.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {question.display.hint_chips.map((chip) => (
            <span
              key={chip}
              className="border border-white/12 px-2 py-1 font-mono text-[11px] text-[#9be58a]"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 border border-white/12 bg-[#111111] p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#8f8b80]">
          Answer area
        </div>
        <p className="mt-3 text-[13px] leading-6 text-[#c9c4b8]">
          Draft your response here.
        </p>
      </div>
    </article>
  );
}
