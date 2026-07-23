"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type ChallengeDetail,
  createAttempt,
  type DatasetPreview,
  getChallenge,
  getChallengeQuestions,
  getDatasetPreview,
  getSessionChallengeSummary,
  listSessionAttempts,
  type PublicQuestion,
} from "../../../lib/datagolf-api";
import {
  getAnonymousSessionId,
  resetAnonymousSessionId,
} from "../../../lib/anonymous-session";
import {
  applyAttemptToProgress,
  buildProgressFromAttempts,
  buildAttemptPayload,
  type ChallengeProgressSummary,
  createAnswerDraftFromAttempt,
  createEmptyAnswerDraft,
  findNextIncompleteQuestionIndex,
  formatAttemptTimestamp,
  formatPreviewCell,
  getAnswerDraftGuidance,
  getAnswerFormatLabel,
  getAttemptFeedbackTitle,
  getAttemptResultLabel,
  getAttemptFeedbackLines,
  getAttemptTone,
  getChallengeProgressDetailText,
  getCompletionPercent,
  getDatasetPreviewColumns,
  getDatasetPreviewRows,
  getDatasetPreviewWindowLabel,
  getFeedbackLineTone,
  getFillBlankCount,
  getHiddenDatasetPreviewColumnCount,
  getHiddenDatasetPreviewColumnLabel,
  getHiddenDatasetPreviewRowCount,
  getHiddenDatasetPreviewRowLabel,
  getInitialQuestionIndex,
  getNextOpenQuestionActionLabel,
  getPreviousAttemptCount,
  getPreviousAttemptLabel,
  getPreviousAttemptsTitle,
  getPreviousAttemptsNewestFirst,
  getQuestionPositionLabel,
  getQuestionProgressStatus,
  getQuestionProgressStatusLabel,
  getQuestionTypeLabel,
  getSubmitAnswerLabel,
  isAnswerDraftDirty,
  isChallengeComplete,
  isQuestionAwaitingResult,
  isQuestionAnswerDraftSubmittable,
  mapSessionChallengeSummary,
  normalizeFillBlankDrafts,
  type QuestionProgress,
  type RunnerAnswerDraft,
  summarizeChallengeProgress,
} from "../../../lib/challenge-runner";
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
      datasetPreview: DatasetPreview;
      questions: PublicQuestion[];
      sessionId: string;
    }
  | { status: "error"; message: string };

export default function ChallengeRunnerPage({ params }: ChallengeRunnerPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [draftsByQuestion, setDraftsByQuestion] = useState<
    Record<string, RunnerAnswerDraft>
  >({});
  const [progressByQuestion, setProgressByQuestion] = useState<
    Record<string, QuestionProgress>
  >({});
  const [progressSummaryOverride, setProgressSummaryOverride] =
    useState<ChallengeProgressSummary | null>(null);
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

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
        const [datasetPreview, sessionAttempts, sessionSummary] = await Promise.all([
          getDatasetPreview(challenge.dataset.slug, 8),
          listSessionAttempts(sessionId, challenge.challenge_slug, 100),
          getSessionChallengeSummary(sessionId, challenge.challenge_slug),
        ]);

        if (mounted) {
          const progress = buildProgressFromAttempts(sessionAttempts);

          setLoadState({
            status: "ready",
            challenge,
            datasetPreview,
            questions,
            sessionId,
          });
          setProgressByQuestion(progress);
          setProgressSummaryOverride(mapSessionChallengeSummary(sessionSummary));
          setActiveQuestionIndex(getInitialQuestionIndex(questions, progress));
          setSubmitError(null);
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
  }, [slug, reloadNonce]);

  const activeQuestion =
    loadState.status === "ready"
      ? loadState.questions[activeQuestionIndex] ?? null
      : null;
  const activeDraft = activeQuestion
    ? draftsByQuestion[activeQuestion.id] ?? createEmptyAnswerDraft()
    : createEmptyAnswerDraft();
  const activeProgress = activeQuestion
    ? progressByQuestion[activeQuestion.id]
    : undefined;

  function updateActiveDraft(nextDraft: RunnerAnswerDraft) {
    if (!activeQuestion) {
      return;
    }

    setDraftsByQuestion((currentDrafts) => ({
      ...currentDrafts,
      [activeQuestion.id]: nextDraft,
    }));
  }

  function clearActiveDraft() {
    if (!activeQuestion) {
      return;
    }

    setDraftsByQuestion((currentDrafts) => ({
      ...currentDrafts,
      [activeQuestion.id]: createEmptyAnswerDraft(),
    }));
    setSubmitError(null);
  }

  function restoreActiveDraftFromLastAttempt() {
    if (!activeQuestion) {
      return;
    }

    const lastAttempt = progressByQuestion[activeQuestion.id]?.lastAttempt;
    if (!lastAttempt) {
      return;
    }

    setDraftsByQuestion((currentDrafts) => ({
      ...currentDrafts,
      [activeQuestion.id]: createAnswerDraftFromAttempt(lastAttempt),
    }));
    setSubmitError(null);
  }

  function selectQuestion(index: number) {
    if (loadState.status !== "ready") {
      return;
    }

    const boundedIndex = Math.min(
      Math.max(index, 0),
      loadState.questions.length - 1,
    );
    setActiveQuestionIndex(boundedIndex);
    setSubmitError(null);
  }

  function goToPreviousQuestion() {
    selectQuestion(activeQuestionIndex - 1);
  }

  function goToNextQuestion() {
    selectQuestion(activeQuestionIndex + 1);
  }

  function goToNextOpenQuestion() {
    if (nextIncompleteQuestionIndex === null) {
      return;
    }

    selectQuestion(nextIncompleteQuestionIndex);
  }

  function resetRunnerSession() {
    const sessionId = resetAnonymousSessionId();
    if (!sessionId) {
      setSubmitError("Could not reset this session.");
      return;
    }

    setDraftsByQuestion({});
    setProgressByQuestion({});
    setProgressSummaryOverride(null);
    setSubmitError(null);
    setActiveQuestionIndex(0);
    setReloadNonce((current) => current + 1);
  }

  async function submitActiveAnswer() {
    if (loadState.status !== "ready" || !activeQuestion) {
      return;
    }

    if (
      !isQuestionAnswerDraftSubmittable(activeQuestion, activeDraft) ||
      isQuestionAwaitingResult(activeProgress)
    ) {
      return;
    }

    setSubmittingQuestionId(activeQuestion.id);
    setSubmitError(null);

    try {
      const attempt = await createAttempt(
        activeQuestion.id,
        buildAttemptPayload(activeQuestion, loadState.sessionId, activeDraft),
      );

      setProgressByQuestion((currentProgress) => {
        const nextProgress = {
          ...currentProgress,
          [activeQuestion.id]: applyAttemptToProgress(
            currentProgress[activeQuestion.id],
            attempt,
          ),
        };
        setProgressSummaryOverride(
          summarizeChallengeProgress(loadState.questions, nextProgress),
        );
        return nextProgress;
      });

      getSessionChallengeSummary(
        loadState.sessionId,
        loadState.challenge.challenge_slug,
      )
        .then((summary) => {
          setProgressSummaryOverride(mapSessionChallengeSummary(summary));
        })
        .catch(() => undefined);

      if (attempt.is_correct) {
        goToNextQuestion();
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not check this answer.",
      );
    } finally {
      setSubmittingQuestionId(null);
    }
  }

  const progressSummary = useMemo(() => {
    if (loadState.status !== "ready") {
      return null;
    }

    return (
      progressSummaryOverride ??
      summarizeChallengeProgress(loadState.questions, progressByQuestion)
    );
  }, [loadState, progressByQuestion, progressSummaryOverride]);

  const nextIncompleteQuestionIndex = useMemo(() => {
    if (loadState.status !== "ready") {
      return null;
    }

    return findNextIncompleteQuestionIndex(loadState.questions, progressByQuestion);
  }, [loadState, progressByQuestion]);

  return (
    <main
      data-testid="challenge-runner-page"
      className="min-h-dvh bg-[#0A0A0A] px-4 py-4 text-[#f2f1ea] sm:px-6 lg:px-8"
    >
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
            <Metric label="Remaining" value={progressSummary?.remainingQuestions ?? "--"} />
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
                <div
                  data-testid="runner-session-id"
                  className="mt-2 truncate font-mono text-[12px] text-[#c9c4b8]"
                >
                  {loadState.sessionId}
                </div>
                <button
                  type="button"
                  data-testid="runner-new-session-button"
                  onClick={resetRunnerSession}
                  className="mt-3 h-8 border border-white/12 px-3 text-[10px] uppercase tracking-[0.18em] text-[#8f8b80] transition-colors hover:border-[#ffbd2e] hover:text-[#f2f1ea]"
                >
                  New session
                </button>
              </div>

              <DatasetPreviewPanel preview={loadState.datasetPreview} />

              <ol className="max-h-[18rem] overflow-y-auto p-2 lg:max-h-none">
                {loadState.questions.map((question, index) => {
                  const progress = progressByQuestion[question.id];
                  const status = getQuestionProgressStatus(progress);
                  const statusLabel = getQuestionProgressStatusLabel(status);

                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        data-testid={`runner-question-nav-${question.id}`}
                        onClick={() => selectQuestion(index)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                          index === activeQuestionIndex
                            ? "bg-white/10 text-[#f2f1ea]"
                            : "text-[#a8a197] hover:bg-white/5 hover:text-[#f2f1ea]",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 border",
                            status === "correct"
                              ? "border-[#9be58a] bg-[#9be58a]"
                              : status === "incorrect"
                                ? "border-[#ffbd2e] bg-[#ffbd2e]"
                                : status === "pending"
                                  ? "border-[#8f8b80] bg-[#8f8b80]"
                                  : "border-white/20",
                          )}
                        />
                        <span className="w-[3ch] shrink-0 font-mono text-[12px] tabular-nums">
                          Q{question.order}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {question.title}
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#8f8b80]">
                          {statusLabel}
                        </span>
                        <span className="w-[2ch] shrink-0 text-right font-mono text-[11px] text-[#8f8b80]">
                          {progress?.attemptCount ?? ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <section
              data-testid="runner-workspace"
              className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6"
            >
              {progressSummary ? (
                <ChallengeSummaryPanel
                  summary={progressSummary}
                  canGoNextOpen={nextIncompleteQuestionIndex !== null}
                  onNextOpen={goToNextOpenQuestion}
                />
              ) : null}

              {activeQuestion ? (
                <QuestionShell
                  question={activeQuestion}
                  totalQuestions={loadState.questions.length}
                  draft={activeDraft}
                  onDraftChange={updateActiveDraft}
                  progress={activeProgress}
                  submitError={submitError}
                  isSubmitting={submittingQuestionId === activeQuestion.id}
                  onSubmit={submitActiveAnswer}
                  onClearDraft={clearActiveDraft}
                  onRestoreDraft={restoreActiveDraftFromLastAttempt}
                  canGoPrevious={activeQuestionIndex > 0}
                  canGoNext={activeQuestionIndex < loadState.questions.length - 1}
                  onPrevious={goToPreviousQuestion}
                  onNext={goToNextQuestion}
                />
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

function ChallengeSummaryPanel({
  summary,
  canGoNextOpen,
  onNextOpen,
}: {
  summary: ChallengeProgressSummary;
  canGoNextOpen: boolean;
  onNextOpen: () => void;
}) {
  const isComplete = isChallengeComplete(summary);
  const completionPercent = getCompletionPercent(summary);
  const nextOpenActionLabel = getNextOpenQuestionActionLabel(
    summary,
    canGoNextOpen,
  );

  return (
    <section
      data-testid="runner-progress-summary"
      className="mx-auto mb-5 grid max-w-4xl gap-3 border border-white/12 bg-[#111111] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f8b80]">
          Progress
        </div>
        <div className="mt-2 text-[14px] leading-6 text-[#f2f1ea]">
          {getChallengeProgressDetailText(summary)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <div className="font-mono text-[24px] text-[#ffbd2e]">
          {completionPercent}%
        </div>
        <div
          className={cn(
            "border px-3 py-2 text-[11px] uppercase tracking-[0.18em]",
            isComplete
              ? "border-[#9be58a] text-[#9be58a]"
              : "border-white/12 text-[#8f8b80]",
          )}
        >
          {isComplete ? "Complete" : "In progress"}
        </div>
        {!isComplete ? (
          <button
            type="button"
            data-testid="runner-next-open-button"
            disabled={!canGoNextOpen}
            onClick={onNextOpen}
            className={cn(
              "h-9 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors",
              canGoNextOpen
                ? "border-[#ffbd2e] text-[#ffbd2e] hover:bg-[#ffbd2e] hover:text-black"
                : "cursor-not-allowed border-white/10 text-[#686257]",
            )}
          >
            {nextOpenActionLabel}
          </button>
        ) : null}
      </div>
    </section>
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

function DatasetPreviewPanel({ preview }: { preview: DatasetPreview }) {
  const columnChipLimit = 6;
  const visibleColumns = getDatasetPreviewColumns(
    preview.dataset.columns,
    columnChipLimit,
  );
  const tableColumns = getDatasetPreviewColumns(preview.dataset.columns, 4);
  const visibleRows = getDatasetPreviewRows(preview.rows);
  const previewWindowLabel = getDatasetPreviewWindowLabel(preview);
  const hiddenRowCount = getHiddenDatasetPreviewRowCount(preview.rows);
  const hiddenColumnCount = getHiddenDatasetPreviewColumnCount(
    preview.dataset.columns,
    columnChipLimit,
  );

  return (
    <section
      data-testid="runner-dataset-preview"
      className="border-b border-white/12 px-4 py-4"
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f8b80]">
        Dataset
      </div>
      <div className="mt-2 text-[13px] text-[#f2f1ea]">
        {preview.dataset.slug} / {preview.dataset.row_count} rows /{" "}
        {preview.dataset.column_count} columns
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8b80]">
        {previewWindowLabel}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {visibleColumns.map((column) => (
          <span
            key={column.name}
            className="border border-white/12 px-2 py-1 font-mono text-[10px] text-[#9be58a]"
          >
            {column.name}
          </span>
        ))}
        {hiddenColumnCount > 0 ? (
          <span className="border border-white/12 px-2 py-1 font-mono text-[10px] text-[#8f8b80]">
            {getHiddenDatasetPreviewColumnLabel(hiddenColumnCount)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 max-h-48 overflow-auto border border-white/12">
        <table className="w-full border-collapse text-left font-mono text-[10px]">
          <thead className="sticky top-0 bg-[#111111] text-[#8f8b80]">
            <tr>
              {tableColumns.map((column) => (
                <th
                  key={column.name}
                  className="border-b border-white/12 px-2 py-2 font-normal"
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="text-[#c9c4b8]">
                {tableColumns.map((column) => (
                  <td
                    key={column.name}
                    className="max-w-28 truncate border-b border-white/8 px-2 py-2"
                  >
                    {formatPreviewCell(row[column.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenRowCount > 0 ? (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8b80]">
          {getHiddenDatasetPreviewRowLabel(hiddenRowCount)}
        </div>
      ) : null}
    </section>
  );
}

function QuestionShell({
  question,
  totalQuestions,
  draft,
  onDraftChange,
  progress,
  submitError,
  isSubmitting,
  onSubmit,
  onClearDraft,
  onRestoreDraft,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  question: PublicQuestion;
  totalQuestions: number;
  draft: RunnerAnswerDraft;
  onDraftChange: (draft: RunnerAnswerDraft) => void;
  progress: QuestionProgress | undefined;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClearDraft: () => void;
  onRestoreDraft: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const isAwaitingResult = isQuestionAwaitingResult(progress);
  const canSubmit =
    isQuestionAnswerDraftSubmittable(question, draft) && !isAwaitingResult;
  const canClearDraft = isAnswerDraftDirty(draft);
  const canRestoreDraft = Boolean(progress?.lastAttempt);
  const status = getQuestionProgressStatus(progress);
  const statusLabel = getQuestionProgressStatusLabel(status);
  const answerGuidance = getAnswerDraftGuidance(question, draft);
  const submitAnswerLabel = getSubmitAnswerLabel({
    question,
    draft,
    isAwaitingResult,
    isSubmitting,
  });
  const positionLabel = getQuestionPositionLabel(question, totalQuestions);
  const questionTypeLabel = getQuestionTypeLabel(question.type);

  return (
    <article className="mx-auto max-w-4xl" data-testid="runner-question-shell">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-white/12 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8f8b80]">
          {positionLabel}
        </span>
        <span className="border border-white/12 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#8f8b80]">
          {questionTypeLabel}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#8f8b80]">
            Answer area
          </div>
          <div className="border border-white/12 px-2 py-1 font-mono text-[11px] text-[#9be58a]">
            {getAnswerFormatLabel(question.display.answer_format, question.type)}
          </div>
        </div>
        <AnswerInput
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-white/12 pt-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8f8b80]">
            <span>Status: {statusLabel}</span>
            <span className="text-white/20">/</span>
            <span>Attempts: {progress?.attemptCount ?? 0}</span>
            {answerGuidance ? (
              <>
                <span className="text-white/20">/</span>
                <span className="text-[#ffbd2e]">{answerGuidance}</span>
              </>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              data-testid="runner-clear-button"
              disabled={!canClearDraft}
              onClick={onClearDraft}
              className={cn(
                "h-10 border px-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                canClearDraft
                  ? "border-white/20 text-[#f2f1ea] hover:bg-white/5"
                  : "cursor-not-allowed border-white/10 text-[#686257]",
              )}
            >
              Clear
            </button>
            <button
              type="button"
              data-testid="runner-use-last-button"
              disabled={!canRestoreDraft}
              onClick={onRestoreDraft}
              className={cn(
                "h-10 border px-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                canRestoreDraft
                  ? "border-white/20 text-[#f2f1ea] hover:bg-white/5"
                  : "cursor-not-allowed border-white/10 text-[#686257]",
              )}
            >
              Use last
            </button>
            <button
              type="button"
              data-testid="runner-previous-button"
              disabled={!canGoPrevious}
              onClick={onPrevious}
              className={cn(
                "h-10 border px-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                canGoPrevious
                  ? "border-white/20 text-[#f2f1ea] hover:bg-white/5"
                  : "cursor-not-allowed border-white/10 text-[#686257]",
              )}
            >
              Previous
            </button>
            <button
              type="button"
              data-testid="runner-next-button"
              disabled={!canGoNext}
              onClick={onNext}
              className={cn(
                "h-10 border px-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                canGoNext
                  ? "border-white/20 text-[#f2f1ea] hover:bg-white/5"
                  : "cursor-not-allowed border-white/10 text-[#686257]",
              )}
            >
              Next
            </button>
            <button
              type="button"
              data-testid="runner-submit-button"
              disabled={!canSubmit || isSubmitting}
              onClick={onSubmit}
              className={cn(
                "h-10 border px-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                canSubmit && !isSubmitting
                  ? "border-[#ffbd2e] bg-[#ffbd2e] text-black hover:bg-[#ffd166]"
                  : "cursor-not-allowed border-white/12 text-[#686257]",
              )}
            >
              {submitAnswerLabel}
            </button>
          </div>
        </div>

        {submitError ? (
          <div
            data-testid="runner-submit-error"
            className="mt-4 border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-3 py-3 text-[13px] leading-6 text-[#ffd1d1]"
          >
            {submitError}
          </div>
        ) : null}

        {progress?.lastAttempt ? (
          <AttemptFeedback progress={progress} />
        ) : null}

        {progress && getPreviousAttemptCount(progress) > 0 ? (
          <AttemptHistory progress={progress} />
        ) : null}
      </div>
    </article>
  );
}

function AttemptHistory({ progress }: { progress: QuestionProgress }) {
  const attempts = getPreviousAttemptsNewestFirst(progress);
  const attemptCount = getPreviousAttemptCount(progress);

  return (
    <section
      data-testid="runner-attempt-history"
      className="mt-4 border border-white/12 bg-black/20"
    >
      <div className="border-b border-white/12 px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-[#8f8b80]">
        {getPreviousAttemptsTitle(attemptCount)}
      </div>
      <ol className="divide-y divide-white/10">
        {attempts.map((attempt, index) => {
          const attemptTone = getAttemptTone(attempt);

          return (
            <li
              key={attempt.id}
              className="grid gap-2 px-3 py-2 text-[12px] text-[#c9c4b8] sm:grid-cols-[5rem_7rem_minmax(0,1fr)]"
            >
              <span className="font-mono text-[#8f8b80]">
                {getPreviousAttemptLabel(index)}
              </span>
              <span
                className={cn(
                  "uppercase tracking-[0.14em]",
                  attemptTone === "success"
                    ? "text-[#9be58a]"
                    : attemptTone === "retry"
                      ? "text-[#ffbd2e]"
                      : "text-[#8f8b80]",
                )}
              >
                {getAttemptResultLabel(attempt)}
              </span>
              <span className="truncate font-mono text-[#8f8b80]">
                {formatAttemptTimestamp(attempt.created_at)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AttemptFeedback({ progress }: { progress: QuestionProgress }) {
  const attempt = progress.lastAttempt;

  if (!attempt) {
    return null;
  }

  const feedbackLines = getAttemptFeedbackLines(attempt);
  const feedbackTitle = getAttemptFeedbackTitle(attempt);
  const attemptTone = getAttemptTone(attempt);

  return (
    <section
      data-testid="runner-attempt-feedback"
      className="mt-4 border border-white/12 bg-black/30"
    >
      <div
        className={cn(
          "border-b border-white/12 px-3 py-3 text-[12px] uppercase tracking-[0.18em]",
          attemptTone === "success"
            ? "text-[#9be58a]"
            : attemptTone === "retry"
              ? "text-[#ffbd2e]"
              : "text-[#8f8b80]",
        )}
      >
        {feedbackTitle}
      </div>

      {feedbackLines.length > 0 ? (
        <div className="grid gap-2 border-b border-white/12 p-3">
          {feedbackLines.map((line, index) => {
            const lineTone = getFeedbackLineTone(line);

            return (
              <div
                key={`${line.label}-${index}`}
                className="grid gap-1 border border-white/10 px-3 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]"
              >
                <div
                  className={cn(
                    "text-[11px] uppercase tracking-[0.16em]",
                    lineTone === "success"
                      ? "text-[#9be58a]"
                      : lineTone === "retry"
                        ? "text-[#ffbd2e]"
                        : "text-[#8f8b80]",
                  )}
                >
                  {line.label}
                </div>
                <div className="min-w-0 break-words font-mono text-[12px] leading-5 text-[#c9c4b8]">
                  {line.value}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {attempt.generated_code ? (
        <pre className="max-h-72 overflow-auto border-b border-white/12 p-3 font-mono text-[12px] leading-6 text-[#c9c4b8]">
          {attempt.generated_code}
        </pre>
      ) : null}

      {attempt.evaluation_payload ? (
        <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-5 text-[#a8a197]">
          {JSON.stringify(attempt.evaluation_payload, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}

function AnswerInput({
  question,
  draft,
  onDraftChange,
}: {
  question: PublicQuestion;
  draft: RunnerAnswerDraft;
  onDraftChange: (draft: RunnerAnswerDraft) => void;
}) {
  if (question.type === "multiple_choice") {
    return (
      <div className="mt-4 grid gap-2">
        {question.display.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            data-testid={`runner-choice-${choice.id}`}
            onClick={() =>
              onDraftChange({ ...draft, selectedOption: choice.id })
            }
            className={cn(
              "flex items-start gap-3 border px-3 py-3 text-left transition-colors",
              draft.selectedOption === choice.id
                ? "border-[#ffbd2e] bg-[#ffbd2e]/10 text-[#f2f1ea]"
                : "border-white/12 text-[#c9c4b8] hover:bg-white/5",
            )}
          >
            <span className="font-mono text-[12px] text-[#ffbd2e]">
              {choice.id}
            </span>
            <span className="text-[13px] leading-6">{choice.text}</span>
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "fill_blank") {
    const blankCount = getFillBlankCount(question.display.code_snippet);
    const blanks = normalizeFillBlankDrafts(draft.blanks, blankCount);

    return (
      <div className="mt-4 space-y-4">
        {question.display.code_snippet ? (
          <pre className="overflow-x-auto border border-white/12 bg-black/40 p-3 font-mono text-[12px] leading-6 text-[#c9c4b8]">
            {question.display.code_snippet}
          </pre>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {blanks.map((blank, index) => (
            <label key={index} className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8f8b80]">
                Blank {index + 1}
              </span>
              <input
                data-testid={`runner-blank-input-${index + 1}`}
                value={blank}
                onChange={(event) => {
                  const nextBlanks = [...blanks];
                  nextBlanks[index] = event.target.value;
                  onDraftChange({ ...draft, blanks: nextBlanks });
                }}
                className="mt-2 h-10 w-full border border-white/12 bg-black/35 px-3 font-mono text-[13px] text-[#f2f1ea] outline-none transition-colors placeholder:text-[#686257] focus:border-[#ffbd2e]"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "micro_code") {
    return (
      <textarea
        data-testid="runner-code-input"
        value={draft.codeText}
        onChange={(event) =>
          onDraftChange({ ...draft, codeText: event.target.value })
        }
        spellCheck={false}
        className="mt-4 min-h-32 w-full resize-y border border-white/12 bg-black/35 p-3 font-mono text-[13px] leading-6 text-[#f2f1ea] outline-none transition-colors placeholder:text-[#686257] focus:border-[#ffbd2e]"
        placeholder="select(post_id, creator_handle, views)"
      />
    );
  }

  return (
    <textarea
      data-testid="runner-prompt-input"
      value={draft.promptText}
      onChange={(event) =>
        onDraftChange({ ...draft, promptText: event.target.value })
      }
      className="mt-4 min-h-40 w-full resize-y border border-white/12 bg-black/35 p-3 text-[13px] leading-6 text-[#f2f1ea] outline-none transition-colors placeholder:text-[#686257] focus:border-[#ffbd2e]"
      placeholder="Find the top posts by engagement rate..."
    />
  );
}
