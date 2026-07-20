import type {
  AttemptCreateRequest,
  AttemptResponse,
  PublicQuestion,
  QuestionType,
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
  incorrectQuestions: number;
  skippedQuestions: number;
  totalAttempts: number;
};

export type FeedbackLine = {
  label: string;
  value: string;
  passed?: boolean;
};

export type QuestionProgressStatus = "unattempted" | "correct" | "incorrect";

export function createEmptyAnswerDraft(): RunnerAnswerDraft {
  return {
    promptText: "",
    selectedOption: "",
    blanks: [],
    codeText: "",
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
    return { ...basePayload, selected_option: draft.selectedOption };
  }

  if (question.type === "fill_blank") {
    return { ...basePayload, blanks: draft.blanks.map((blank) => blank.trim()) };
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

export function summarizeChallengeProgress(
  questions: PublicQuestion[],
  progressByQuestion: Record<string, QuestionProgress>,
): ChallengeProgressSummary {
  let attemptedQuestions = 0;
  let correctQuestions = 0;
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

    if (progress.correctCount > 0) {
      correctQuestions += 1;
    }
  }

  return {
    totalQuestions: questions.length,
    attemptedQuestions,
    correctQuestions,
    incorrectQuestions: attemptedQuestions - correctQuestions,
    skippedQuestions: questions.length - attemptedQuestions,
    totalAttempts,
  };
}

export function findNextIncompleteQuestionIndex(
  questions: PublicQuestion[],
  progressByQuestion: Record<string, QuestionProgress>,
): number | null {
  const nextIndex = questions.findIndex((question) => {
    const progress = progressByQuestion[question.id];
    return !progress || progress.correctCount === 0;
  });

  return nextIndex >= 0 ? nextIndex : null;
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

export function buildProgressFromAttempts(attempts: AttemptResponse[]) {
  return attempts.reduce<Record<string, QuestionProgress>>(
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

export function getQuestionProgressStatus(
  progress: QuestionProgress | undefined,
): QuestionProgressStatus {
  if (!progress || progress.attemptCount === 0) {
    return "unattempted";
  }

  return progress.correctCount > 0 ? "correct" : "incorrect";
}

export function getAttemptFeedbackLines(attempt: AttemptResponse): FeedbackLine[] {
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
    return [
      {
        label: "Dataset result",
        value: payload.reference_matches_dataset ? "Matched" : "Did not match",
        passed:
          typeof payload.reference_matches_dataset === "boolean"
            ? payload.reference_matches_dataset
            : undefined,
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
    return [
      {
        label: "Submitted",
        value: formatPayloadValue(payload.normalized_submission),
        passed: attempt.is_correct ?? undefined,
      },
      {
        label: "Accepted",
        value: formatPayloadValue(payload.accepted_patterns),
      },
    ];
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
