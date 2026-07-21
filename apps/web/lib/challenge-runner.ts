import type {
  AttemptCreateRequest,
  AttemptResponse,
  ColumnSpec,
  DatasetPreview,
  PublicQuestion,
  QuestionType,
  SessionChallengeSummary,
} from "./datagolf-api";

export type RunnerAnswerDraft = {
  promptText: string;
  selectedOption: string;
  blanks: string[];
  codeText: string;
};

export type QuestionProgress = {
  questionId: string;
  attemptCount: number;
  correctCount: number;
  lastAttempt: AttemptResponse | null;
  attempts: AttemptResponse[];
};

export type ChallengeProgressSummary = {
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  remainingQuestions: number;
  incorrectQuestions: number;
  pendingQuestions: number;
  skippedQuestions: number;
  retryQuestions: number;
  totalAttempts: number;
  accuracyPercent: number;
  completionPercent: number;
};

export type FeedbackLine = {
  label: string;
  value: string;
  passed?: boolean;
};

export type QuestionProgressStatus =
  | "unattempted"
  | "pending"
  | "correct"
  | "incorrect";

export function createEmptyAnswerDraft(): RunnerAnswerDraft {
  return {
    promptText: "",
    selectedOption: "",
    blanks: [],
    codeText: "",
  };
}

export function createAnswerDraftFromAttempt(
  attempt: AttemptResponse,
): RunnerAnswerDraft {
  const payload = attempt.user_input_payload;

  return {
    promptText: getPayloadString(payload.prompt_text),
    selectedOption: getPayloadString(payload.selected_option),
    blanks: getPayloadStringArray(payload.blanks),
    codeText: getPayloadString(payload.code_text),
  };
}

export function buildAttemptPayload(
  question: PublicQuestion,
  sessionId: string,
  draft: RunnerAnswerDraft,
): AttemptCreateRequest {
  const basePayload = { session_id: sessionId };

  if (question.type === "guided_prompt") {
    return { ...basePayload, prompt_text: draft.promptText.trim() };
  }

  if (question.type === "multiple_choice") {
    return { ...basePayload, selected_option: draft.selectedOption.trim() };
  }

  if (question.type === "fill_blank") {
    const blankCount = getFillBlankCount(question.display.code_snippet);
    return {
      ...basePayload,
      blanks: normalizeFillBlankDrafts(draft.blanks, blankCount).map((blank) =>
        blank.trim(),
      ),
    };
  }

  return { ...basePayload, code_text: draft.codeText.trim() };
}

export function isAnswerDraftSubmittable(
  questionType: QuestionType,
  draft: RunnerAnswerDraft,
) {
  if (questionType === "guided_prompt") {
    return draft.promptText.trim().length > 0;
  }

  if (questionType === "multiple_choice") {
    return draft.selectedOption.trim().length > 0;
  }

  if (questionType === "fill_blank") {
    return draft.blanks.some((blank) => blank.trim().length > 0);
  }

  return draft.codeText.trim().length > 0;
}

export function isQuestionAnswerDraftSubmittable(
  question: PublicQuestion,
  draft: RunnerAnswerDraft,
) {
  if (question.type === "fill_blank") {
    return normalizeFillBlankDrafts(
      draft.blanks,
      getFillBlankCount(question.display.code_snippet),
    ).every((blank) => blank.trim().length > 0);
  }

  if (question.type === "multiple_choice") {
    return isMultipleChoiceSelectionValid(question, draft.selectedOption);
  }

  return isAnswerDraftSubmittable(question.type, draft);
}

export function isQuestionAwaitingResult(
  progress: QuestionProgress | undefined,
) {
  if (!progress) {
    return false;
  }

  return (
    progress.correctCount === 0 &&
    progress.lastAttempt?.status === "pending"
  );
}

export function getAnswerDraftGuidance(
  question: PublicQuestion,
  draft: RunnerAnswerDraft,
) {
  if (question.type === "guided_prompt") {
    return draft.promptText.trim().length > 0 ? null : "Enter a prompt";
  }

  if (question.type === "multiple_choice") {
    if (question.display.choices.length === 0) {
      return "No options available";
    }

    if (draft.selectedOption.trim().length === 0) {
      return "Choose an option";
    }

    return isMultipleChoiceSelectionValid(question, draft.selectedOption)
      ? null
      : "Choose a listed option";
  }

  if (question.type === "micro_code") {
    return draft.codeText.trim().length > 0 ? null : "Enter code";
  }

  const missingCount = normalizeFillBlankDrafts(
    draft.blanks,
    getFillBlankCount(question.display.code_snippet),
  ).filter((blank) => blank.trim().length === 0).length;

  if (missingCount === 0) {
    return null;
  }

  return missingCount === 1 ? "1 blank left" : `${missingCount} blanks left`;
}

export function getSubmitAnswerLabel({
  question,
  draft,
  isAwaitingResult,
  isSubmitting,
}: {
  question: PublicQuestion;
  draft: RunnerAnswerDraft;
  isAwaitingResult: boolean;
  isSubmitting: boolean;
}) {
  if (isSubmitting) {
    return "Checking";
  }

  if (isAwaitingResult) {
    return "Pending";
  }

  return getAnswerDraftGuidance(question, draft) ?? "Check Answer";
}

export function isAnswerDraftDirty(draft: RunnerAnswerDraft) {
  return (
    draft.promptText.trim().length > 0 ||
    draft.selectedOption.trim().length > 0 ||
    draft.blanks.some((blank) => blank.trim().length > 0) ||
    draft.codeText.trim().length > 0
  );
}

export function getAnswerFormatLabel(
  answerFormat: string | null,
  questionType: QuestionType,
) {
  if (answerFormat === "single_choice") {
    return "Single choice";
  }

  if (answerFormat === "blanks") {
    return "Fill each blank";
  }

  if (answerFormat === "code") {
    return "Code expression";
  }

  if (answerFormat === "prompt") {
    return "Plain-language prompt";
  }

  return getQuestionTypeLabel(questionType);
}

function isMultipleChoiceSelectionValid(
  question: PublicQuestion,
  selectedOption: string,
) {
  const normalizedSelection = selectedOption.trim();

  return question.display.choices.some(
    (choice) => choice.id === normalizedSelection,
  );
}

export function getDatasetPreviewRows(
  rows: Record<string, unknown>[],
  limit = 5,
) {
  return rows.slice(0, normalizePreviewLimit(limit));
}

export function getDatasetPreviewColumns(columns: ColumnSpec[], limit: number) {
  return columns.slice(0, normalizePreviewLimit(limit));
}

export function getHiddenDatasetPreviewColumnCount(
  columns: ColumnSpec[],
  limit: number,
) {
  return Math.max(columns.length - normalizePreviewLimit(limit), 0);
}

export function getHiddenDatasetPreviewColumnLabel(count: number) {
  return `+${count} more ${count === 1 ? "column" : "columns"}`;
}

export function getHiddenDatasetPreviewRowCount(
  rows: Record<string, unknown>[],
  limit = 5,
) {
  return Math.max(rows.length - normalizePreviewLimit(limit), 0);
}

export function getHiddenDatasetPreviewRowLabel(count: number) {
  return `+${count} more ${count === 1 ? "row" : "rows"} in preview`;
}

export function getDatasetPreviewWindowLabel(
  preview: DatasetPreview,
  rowLimit = 5,
  columnLimit = 4,
) {
  const visibleRowCount = getDatasetPreviewRows(preview.rows, rowLimit).length;
  const visibleColumnCount = getDatasetPreviewColumns(
    preview.dataset.columns,
    columnLimit,
  ).length;
  const totalRows = Math.max(preview.dataset.row_count, preview.rows.length, 0);
  const totalColumns = Math.max(
    preview.dataset.column_count,
    preview.dataset.columns.length,
    0,
  );

  return `Showing ${visibleRowCount} of ${totalRows} rows / ${visibleColumnCount} of ${totalColumns} columns`;
}

export function formatPreviewCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizePreviewLimit(limit: number) {
  return Math.max(Math.floor(limit), 0);
}

export function summarizeChallengeProgress(
  questions: PublicQuestion[],
  progressByQuestion: Record<string, QuestionProgress>,
): ChallengeProgressSummary {
  let attemptedQuestions = 0;
  let correctQuestions = 0;
  let pendingQuestions = 0;
  let retryQuestions = 0;
  let totalAttempts = 0;

  for (const question of questions) {
    const progress = progressByQuestion[question.id];
    if (!progress) {
      continue;
    }

    totalAttempts += progress.attemptCount;

    if (progress.attemptCount > 0) {
      attemptedQuestions += 1;
    }

    if (progress.attemptCount > 1) {
      retryQuestions += 1;
    }

    if (progress.correctCount > 0) {
      correctQuestions += 1;
      continue;
    }

    if (progress.lastAttempt?.status === "pending") {
      pendingQuestions += 1;
    }
  }

  return {
    totalQuestions: questions.length,
    attemptedQuestions,
    correctQuestions,
    remainingQuestions: questions.length - correctQuestions,
    incorrectQuestions: attemptedQuestions - correctQuestions - pendingQuestions,
    pendingQuestions,
    skippedQuestions: questions.length - attemptedQuestions,
    retryQuestions,
    totalAttempts,
    accuracyPercent: getAccuracyPercent(correctQuestions, attemptedQuestions),
    completionPercent: getCompletionPercentFromCounts(
      correctQuestions,
      questions.length,
    ),
  };
}

export function mapSessionChallengeSummary(
  summary: SessionChallengeSummary,
): ChallengeProgressSummary {
  return {
    totalQuestions: getDisplayCount(summary.total_questions),
    attemptedQuestions: getDisplayCount(summary.attempted_questions),
    correctQuestions: getDisplayCount(summary.correct_questions),
    remainingQuestions: getDisplayCount(summary.remaining_questions),
    incorrectQuestions: getDisplayCount(summary.incorrect_questions),
    pendingQuestions: getDisplayCount(summary.pending_questions),
    skippedQuestions: getDisplayCount(summary.skipped_questions),
    retryQuestions: getDisplayCount(summary.retry_questions),
    totalAttempts: getDisplayCount(summary.total_attempts),
    accuracyPercent: getDisplayPercent(summary.accuracy_percent),
    completionPercent: getDisplayPercent(summary.completion_percent),
  };
}

function getAccuracyPercent(correctQuestions: number, attemptedQuestions: number) {
  if (attemptedQuestions === 0) {
    return 0;
  }

  const percent = Math.round((correctQuestions / attemptedQuestions) * 100);
  return Math.min(Math.max(percent, 0), 100);
}

export function getCompletionPercent(summary: ChallengeProgressSummary) {
  return getDisplayPercent(summary.completionPercent);
}

export function getSummaryAccuracyPercent(summary: ChallengeProgressSummary) {
  return getDisplayPercent(summary.accuracyPercent);
}

export function isChallengeComplete(summary: ChallengeProgressSummary) {
  return (
    summary.totalQuestions > 0 &&
    summary.correctQuestions >= summary.totalQuestions
  );
}

export function getNextOpenQuestionActionLabel(
  summary: ChallengeProgressSummary,
  canGoNextOpen: boolean,
) {
  if (canGoNextOpen) {
    return "Next open";
  }

  return summary.pendingQuestions > 0 ? "Waiting" : "Next open";
}

function getCompletionPercentFromCounts(
  correctQuestions: number,
  totalQuestions: number,
) {
  if (totalQuestions === 0) {
    return 0;
  }

  const percent = Math.round((correctQuestions / totalQuestions) * 100);
  return Math.min(Math.max(percent, 0), 100);
}

export function getChallengeProgressDetailText(
  summary: ChallengeProgressSummary,
) {
  const parts = [
    `${getDisplayCount(summary.correctQuestions)} of ${getDisplayCount(
      summary.totalQuestions,
    )} correct`,
    getCountLabel(summary.remainingQuestions, "remaining", "remaining"),
    getCountLabel(summary.incorrectQuestions, "incorrect", "incorrect"),
    getCountLabel(summary.skippedQuestions, "skipped", "skipped"),
  ];

  if (summary.pendingQuestions > 0) {
    parts.push(getCountLabel(summary.pendingQuestions, "pending", "pending"));
  }

  if (summary.retryQuestions > 0) {
    parts.push(getCountLabel(summary.retryQuestions, "retried", "retried"));
  }

  parts.push(`${getSummaryAccuracyPercent(summary)}% accuracy`);
  parts.push(getCountLabel(summary.totalAttempts, "attempt", "attempts"));

  return parts.join(" / ");
}

function getCountLabel(count: number, singularLabel: string, pluralLabel: string) {
  const displayCount = getDisplayCount(count);
  return `${displayCount} ${
    displayCount === 1 ? singularLabel : pluralLabel
  }`;
}

function getDisplayCount(count: number) {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(count, 0);
}

function getDisplayPercent(percent: number) {
  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.min(Math.max(percent, 0), 100);
}

export function findNextIncompleteQuestionIndex(
  questions: PublicQuestion[],
  progressByQuestion: Record<string, QuestionProgress>,
): number | null {
  const nextIndex = questions.findIndex((question) => {
    const progress = progressByQuestion[question.id];
    return (
      (!progress || progress.correctCount === 0) &&
      !isQuestionAwaitingResult(progress)
    );
  });

  return nextIndex >= 0 ? nextIndex : null;
}

export function getInitialQuestionIndex(
  questions: PublicQuestion[],
  progressByQuestion: Record<string, QuestionProgress>,
) {
  return findNextIncompleteQuestionIndex(questions, progressByQuestion) ?? 0;
}

export function applyAttemptToProgress(
  progress: QuestionProgress | undefined,
  attempt: AttemptResponse,
): QuestionProgress {
  const attempts = [...(progress?.attempts ?? []), attempt].slice(-5);

  return {
    questionId: attempt.question_id,
    attemptCount: (progress?.attemptCount ?? 0) + 1,
    correctCount: (progress?.correctCount ?? 0) + (attempt.is_correct ? 1 : 0),
    lastAttempt: attempt,
    attempts,
  };
}

export function getAttemptsNewestFirst(attempts: AttemptResponse[]) {
  return [...attempts].sort(compareAttemptsDescending);
}

export function getPreviousAttemptsNewestFirst(progress: QuestionProgress) {
  return getAttemptsNewestFirst(progress.attempts.slice(0, -1));
}

export function getPreviousAttemptCount(progress: QuestionProgress) {
  return Math.max(progress.attemptCount - 1, 0);
}

export function getPreviousAttemptsTitle(attemptCount: number) {
  return attemptCount === 1
    ? "Previous attempt (1)"
    : `Previous attempts (${attemptCount})`;
}

export function getPreviousAttemptLabel(index: number) {
  return `Prev ${index + 1}`;
}

export function formatAttemptTimestamp(
  value: string,
  locale?: string,
  timeZone?: string,
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function getAttemptResultLabel(attempt: AttemptResponse) {
  if (attempt.status === "failed") {
    return "Failed";
  }

  if (attempt.is_correct === true) {
    return "Correct";
  }

  return attempt.is_correct === false ? "Retry" : "Pending";
}

export function getAttemptFeedbackTitle(attempt: AttemptResponse) {
  if (attempt.status === "failed") {
    return "Attempt failed";
  }

  if (attempt.is_correct === true) {
    return "Correct";
  }

  return attempt.is_correct === false ? "Needs another pass" : "Pending";
}

export function getAttemptTone(attempt: AttemptResponse) {
  if (attempt.status === "failed") {
    return "retry";
  }

  if (attempt.is_correct === true) {
    return "success";
  }

  return attempt.is_correct === false ? "retry" : "pending";
}

export function getFeedbackLineTone(line: FeedbackLine) {
  if (line.passed === true) {
    return "success";
  }

  return line.passed === false ? "retry" : "neutral";
}

export function buildProgressFromAttempts(attempts: AttemptResponse[]) {
  return [...attempts]
    .sort(compareAttemptsAscending)
    .reduce<Record<string, QuestionProgress>>(
      (progressByQuestion, attempt) => ({
        ...progressByQuestion,
        [attempt.question_id]: applyAttemptToProgress(
          progressByQuestion[attempt.question_id],
          attempt,
        ),
      }),
      {},
    );
}

function compareAttemptsAscending(left: AttemptResponse, right: AttemptResponse) {
  const createdAtComparison = left.created_at.localeCompare(right.created_at);
  return createdAtComparison === 0
    ? left.id.localeCompare(right.id)
    : createdAtComparison;
}

function compareAttemptsDescending(left: AttemptResponse, right: AttemptResponse) {
  return compareAttemptsAscending(right, left);
}

export function getQuestionProgressStatus(
  progress: QuestionProgress | undefined,
): QuestionProgressStatus {
  if (!progress || progress.attemptCount === 0) {
    return "unattempted";
  }

  if (progress.correctCount > 0) {
    return "correct";
  }

  return progress.lastAttempt?.status === "pending" ? "pending" : "incorrect";
}

export function getQuestionProgressStatusLabel(
  status: QuestionProgressStatus,
) {
  if (status === "correct") {
    return "Done";
  }

  if (status === "incorrect") {
    return "Retry";
  }

  if (status === "pending") {
    return "Pending";
  }

  return "Open";
}

export function getQuestionPositionLabel(question: PublicQuestion, totalQuestions: number) {
  return `Q${question.order} / ${totalQuestions}`;
}

export function getQuestionTypeLabel(questionType: string) {
  return questionType.replace(/_/g, " ");
}

export function getFillBlankCount(codeSnippet: string | null) {
  return Math.max(codeSnippet?.match(/______+/g)?.length ?? 0, 1);
}

export function normalizeFillBlankDrafts(blanks: string[], blankCount: number) {
  return Array.from({ length: blankCount }, (_, index) => blanks[index] ?? "");
}

export function getAttemptFeedbackLines(attempt: AttemptResponse): FeedbackLine[] {
  if (attempt.status === "failed" && attempt.error_message?.trim()) {
    return [
      {
        label: "Error",
        value: attempt.error_message.trim(),
        passed: false,
      },
    ];
  }

  const payload = attempt.evaluation_payload;
  if (!payload) {
    return [];
  }

  if (attempt.question_type === "multiple_choice") {
    return [
      {
        label: "Selected",
        value: formatPayloadValue(payload.received_option),
        passed: attempt.is_correct ?? undefined,
      },
      {
        label: "Expected",
        value: formatPayloadValue(payload.expected_option),
      },
    ];
  }

  if (attempt.question_type === "fill_blank") {
    const blankResults = getPayloadArray(payload.per_blank_results);
    return blankResults.map((result, index) => {
      const resultRecord = getPayloadRecord(result);
      return {
        label: `Blank ${index + 1}`,
        value: `${formatPayloadValue(resultRecord.received)} -> ${formatPayloadValue(
          resultRecord.accepted,
        )}`,
        passed:
          typeof resultRecord.passed === "boolean"
            ? resultRecord.passed
            : undefined,
      };
    });
  }

  if (attempt.question_type === "guided_prompt") {
    const codeChecks = getPayloadArray(payload.required_code_checks);
    const referenceMatchesDataset =
      typeof payload.reference_matches_dataset === "boolean"
        ? payload.reference_matches_dataset
        : null;
    return [
      {
        label: "Dataset result",
        value:
          referenceMatchesDataset === null
            ? "Unknown"
            : referenceMatchesDataset
              ? "Matched"
              : "Did not match",
        passed: referenceMatchesDataset ?? undefined,
      },
      ...codeChecks.map((check) => {
        const checkRecord = getPayloadRecord(check);
        return {
          label: formatPayloadValue(checkRecord.name),
          value: formatPayloadValue(checkRecord.description),
          passed:
            typeof checkRecord.passed === "boolean"
              ? checkRecord.passed
              : undefined,
        };
      }),
    ];
  }

  if (attempt.question_type === "micro_code") {
    const acceptedPatterns = getPayloadArray(payload.accepted_patterns);
    const regexMatches = getPayloadArray(payload.regex_matches);
    const feedbackLines: FeedbackLine[] = [
      {
        label: "Submitted",
        value: formatPayloadValue(payload.normalized_submission),
        passed: attempt.is_correct ?? undefined,
      },
    ];

    if (acceptedPatterns.length > 0) {
      feedbackLines.push({
        label: "Accepted",
        value: formatPayloadValue(acceptedPatterns),
      });
    }

    feedbackLines.push(
      ...regexMatches.map((match, index) => {
        const matchRecord = getPayloadRecord(match);
        return {
          label: `Regex ${index + 1}`,
          value: formatPayloadValue(matchRecord.pattern),
          passed:
            typeof matchRecord.passed === "boolean"
              ? matchRecord.passed
              : undefined,
        };
      }),
    );

    return feedbackLines;
  }

  return [];
}

function getPayloadArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getPayloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getPayloadString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getPayloadStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : ""))
    : [];
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (Array.isArray(value)) {
    return value.map(formatPayloadValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
