import assert from "node:assert/strict";

import {
  applyAttemptToProgress,
  buildProgressFromAttempts,
  buildAttemptPayload,
  createAnswerDraftFromAttempt,
  createEmptyAnswerDraft,
  findNextIncompleteQuestionIndex,
  getAnswerDraftGuidance,
  getAnswerFormatLabel,
  getAttemptFeedbackTitle,
  getAttemptFeedbackLines,
  getAttemptResultLabel,
  getAttemptTone,
  getAttemptsNewestFirst,
  getCompletionPercent,
  getFeedbackLineTone,
  getFillBlankCount,
  getPreviousAttemptCount,
  getPreviousAttemptLabel,
  getPreviousAttemptsNewestFirst,
  getQuestionPositionLabel,
  getQuestionProgressStatus,
  getQuestionProgressStatusLabel,
  getQuestionTypeLabel,
  isAnswerDraftDirty,
  isQuestionAnswerDraftSubmittable,
  normalizeFillBlankDrafts,
  summarizeChallengeProgress,
} from "./challenge-runner";
import type { AttemptResponse, PublicQuestion } from "./datagolf-api";

const questions: PublicQuestion[] = [
  createQuestion("Q1", 1),
  createQuestion("Q2", 2),
  createQuestion("Q3", 3),
];
const fillBlankQuestion: PublicQuestion = {
  ...createQuestion("Q4", 4),
  type: "fill_blank",
  display: {
    ...createQuestion("Q4", 4).display,
    code_snippet: "select ______ from posts where ______ > 0",
    answer_format: "blanks",
  },
};

const correctAttempt = createAttempt("attempt-1", "Q1", {
  selected_option: "B",
});
const retryAttempt = createAttempt("attempt-2", "Q2", {
  blanks: ["views", "likes"],
});
const failedAttempt: AttemptResponse = {
  ...retryAttempt,
  id: "attempt-failed",
  status: "failed",
  is_correct: null,
  error_message: "Evaluator timed out",
};
const pendingAttempt: AttemptResponse = {
  ...retryAttempt,
  id: "attempt-pending",
  status: "pending",
  is_correct: null,
};
const thirdAttempt = createAttempt("attempt-3", "Q2", {
  blanks: ["shares", "saves"],
});
const cappedProgress = Array.from({ length: 6 }, (_, index) =>
  createAttempt(`cap-${index + 1}`, "Q3", { selected_option: String(index + 1) }),
).reduce((currentProgress, attempt) => {
  return applyAttemptToProgress(currentProgress, attempt);
}, undefined as ReturnType<typeof applyAttemptToProgress> | undefined);

const progress = {
  Q1: applyAttemptToProgress(undefined, correctAttempt),
  Q2: applyAttemptToProgress(undefined, { ...retryAttempt, is_correct: false }),
};
const sessionProgress = buildProgressFromAttempts([
  correctAttempt,
  { ...retryAttempt, is_correct: false },
  thirdAttempt,
]);

assert.deepEqual(createAnswerDraftFromAttempt(correctAttempt), {
  promptText: "",
  selectedOption: "B",
  blanks: [],
  codeText: "",
});
assert.deepEqual(createAnswerDraftFromAttempt(retryAttempt), {
  promptText: "",
  selectedOption: "",
  blanks: ["views", "likes"],
  codeText: "",
});

assert.equal(findNextIncompleteQuestionIndex(questions, progress), 1);
assert.equal(getAnswerFormatLabel("single_choice", "multiple_choice"), "Single choice");
assert.equal(getAnswerFormatLabel("blanks", "fill_blank"), "Fill each blank");
assert.equal(getAnswerFormatLabel("prompt", "guided_prompt"), "Plain-language prompt");
assert.equal(getAnswerFormatLabel(null, "micro_code"), "micro code");
assert.equal(getAnswerFormatLabel("unknown", "guided_prompt"), "guided prompt");
assert.equal(getQuestionProgressStatusLabel("unattempted"), "Open");
assert.equal(getQuestionProgressStatusLabel("incorrect"), "Retry");
assert.equal(getQuestionProgressStatusLabel("pending"), "Pending");
assert.equal(getQuestionProgressStatusLabel("correct"), "Done");
assert.equal(getQuestionProgressStatus(undefined), "unattempted");
assert.equal(
  getQuestionProgressStatus(applyAttemptToProgress(undefined, pendingAttempt)),
  "pending",
);
assert.equal(
  getQuestionProgressStatus(
    applyAttemptToProgress(undefined, { ...retryAttempt, is_correct: false }),
  ),
  "incorrect",
);
assert.equal(
  getQuestionProgressStatus(applyAttemptToProgress(undefined, correctAttempt)),
  "correct",
);
assert.equal(getQuestionPositionLabel(questions[1], questions.length), "Q2 / 3");
assert.equal(getQuestionTypeLabel("guided_prompt"), "guided prompt");
assert.equal(getQuestionTypeLabel("multi_part_question"), "multi part question");
assert.equal(getFillBlankCount(fillBlankQuestion.display.code_snippet), 2);
assert.equal(getFillBlankCount(null), 1);
assert.deepEqual(normalizeFillBlankDrafts([" views "], 2), [" views ", ""]);
assert.equal(
  getAnswerDraftGuidance(fillBlankQuestion, createEmptyAnswerDraft()),
  "2 blanks left",
);
assert.equal(
  getAnswerDraftGuidance(fillBlankQuestion, {
    promptText: "",
    selectedOption: "",
    blanks: ["views", ""],
    codeText: "",
  }),
  "1 blank left",
);
assert.equal(
  getAnswerDraftGuidance(fillBlankQuestion, {
    promptText: "",
    selectedOption: "",
    blanks: ["views", "likes"],
    codeText: "",
  }),
  null,
);
assert.equal(getAnswerDraftGuidance(questions[0], createEmptyAnswerDraft()), null);
assert.equal(
  isQuestionAnswerDraftSubmittable(fillBlankQuestion, {
    promptText: "",
    selectedOption: "",
    blanks: ["views", ""],
    codeText: "",
  }),
  false,
);
assert.equal(
  isQuestionAnswerDraftSubmittable(fillBlankQuestion, {
    promptText: "",
    selectedOption: "",
    blanks: ["views", "likes"],
    codeText: "",
  }),
  true,
);
assert.deepEqual(
  buildAttemptPayload(fillBlankQuestion, "session-1", {
    promptText: "",
    selectedOption: "",
    blanks: [" views ", " likes ", "stale"],
    codeText: "",
  }),
  {
    session_id: "session-1",
    blanks: ["views", "likes"],
  },
);
assert.equal(
  isAnswerDraftDirty({
    promptText: "",
    selectedOption: "",
    blanks: [],
    codeText: "",
  }),
  false,
);
assert.equal(
  isAnswerDraftDirty({
    promptText: "",
    selectedOption: "",
    blanks: [" views "],
    codeText: "",
  }),
  true,
);
assert.deepEqual(
  getAttemptsNewestFirst([correctAttempt, retryAttempt, thirdAttempt]).map(
    (attempt) => attempt.id,
  ),
  ["attempt-3", "attempt-2", "attempt-1"],
);
assert.deepEqual(
  getPreviousAttemptsNewestFirst(
    applyAttemptToProgress(
      applyAttemptToProgress(undefined, retryAttempt),
      thirdAttempt,
    ),
  ).map((attempt) => attempt.id),
  ["attempt-2"],
);
assert.deepEqual(cappedProgress?.attempts.map((attempt) => attempt.id), [
  "cap-2",
  "cap-3",
  "cap-4",
  "cap-5",
  "cap-6",
]);
assert.equal(cappedProgress?.lastAttempt?.id, "cap-6");
assert.equal(getPreviousAttemptCount(applyAttemptToProgress(undefined, retryAttempt)), 0);
assert.equal(getPreviousAttemptLabel(0), "Prev 1");
assert.equal(sessionProgress.Q1.attemptCount, 1);
assert.equal(sessionProgress.Q2.attemptCount, 2);
assert.equal(sessionProgress.Q2.lastAttempt?.id, "attempt-3");
assert.equal(getAttemptResultLabel(correctAttempt), "Correct");
assert.equal(getAttemptResultLabel({ ...retryAttempt, is_correct: false }), "Retry");
assert.equal(getAttemptResultLabel({ ...retryAttempt, is_correct: null }), "Pending");
assert.equal(getAttemptResultLabel(failedAttempt), "Failed");
assert.equal(getAttemptFeedbackTitle(correctAttempt), "Correct");
assert.equal(
  getAttemptFeedbackTitle({ ...retryAttempt, is_correct: false }),
  "Needs another pass",
);
assert.equal(getAttemptFeedbackTitle({ ...retryAttempt, is_correct: null }), "Pending");
assert.equal(getAttemptFeedbackTitle(failedAttempt), "Attempt failed");
assert.equal(getAttemptTone(correctAttempt), "success");
assert.equal(getAttemptTone({ ...retryAttempt, is_correct: false }), "retry");
assert.equal(getAttemptTone({ ...retryAttempt, is_correct: null }), "pending");
assert.equal(getAttemptTone(failedAttempt), "retry");
assert.equal(getFeedbackLineTone({ label: "A", value: "ok", passed: true }), "success");
assert.equal(getFeedbackLineTone({ label: "A", value: "no", passed: false }), "retry");
assert.equal(getFeedbackLineTone({ label: "A", value: "n/a" }), "neutral");
assert.deepEqual(getAttemptFeedbackLines(failedAttempt), [
  {
    label: "Error",
    value: "Evaluator timed out",
    passed: false,
  },
]);
assert.deepEqual(
  getAttemptFeedbackLines({
    ...failedAttempt,
    error_message: " ",
  }),
  [],
);
assert.equal(
  getPreviousAttemptCount(
    applyAttemptToProgress(
      applyAttemptToProgress(undefined, retryAttempt),
      thirdAttempt,
    ),
  ),
  1,
);
assert.deepEqual(summarizeChallengeProgress(questions, progress), {
  totalQuestions: 3,
  attemptedQuestions: 2,
  correctQuestions: 1,
  remainingQuestions: 2,
  incorrectQuestions: 1,
  skippedQuestions: 1,
  totalAttempts: 2,
});
assert.equal(
  getCompletionPercent(summarizeChallengeProgress(questions, progress)),
  33,
);
assert.equal(
  getCompletionPercent({
    totalQuestions: 0,
    attemptedQuestions: 0,
    correctQuestions: 0,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    skippedQuestions: 0,
    totalAttempts: 0,
  }),
  0,
);

function createQuestion(id: string, order: number): PublicQuestion {
  return {
    id,
    order,
    type: "multiple_choice",
    title: `Question ${order}`,
    display: {
      setup_text: null,
      task_text: "Choose an answer.",
      hint_chips: [],
      choices: [],
      code_snippet: null,
      answer_format: null,
    },
  };
}

function createAttempt(
  id: string,
  questionId: string,
  userInputPayload: Record<string, unknown>,
): AttemptResponse {
  return {
    id,
    session_id: "session-1",
    question_id: questionId,
    question_type: "multiple_choice",
    status: "completed",
    challenge_slug: "tiktok-creator-posts",
    challenge_version: "v1",
    dataset_slug: "tiktok-posts",
    dataset_version: "v1",
    prompt_version: "v1",
    model: "rule-based",
    evaluator_version: "v1",
    user_input_payload: userInputPayload,
    generated_code: null,
    evaluation_payload: null,
    is_correct: true,
    error_message: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}
