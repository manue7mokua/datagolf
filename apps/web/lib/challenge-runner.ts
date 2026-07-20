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
};

export type ChallengeProgressSummary = {
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  skippedQuestions: number;
  totalAttempts: number;
};

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

export function applyAttemptToProgress(
  progress: QuestionProgress | undefined,
  attempt: AttemptResponse,
): QuestionProgress {
  return {
    questionId: attempt.question_id,
    attemptCount: (progress?.attemptCount ?? 0) + 1,
    correctCount: (progress?.correctCount ?? 0) + (attempt.is_correct ? 1 : 0),
    lastAttempt: attempt,
  };
}
