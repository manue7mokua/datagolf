import assert from "node:assert/strict";

import {
  applyAttemptToProgress,
  createAnswerDraftFromAttempt,
  findNextIncompleteQuestionIndex,
  getAnswerFormatLabel,
  getAttemptFeedbackTitle,
  getAttemptResultLabel,
  getAttemptsNewestFirst,
  getCompletionPercent,
  getPreviousAttemptCount,
  getPreviousAttemptLabel,
  getPreviousAttemptsNewestFirst,
  getQuestionPositionLabel,
  getQuestionProgressStatusLabel,
  getQuestionTypeLabel,
  isAnswerDraftDirty,
  summarizeChallengeProgress,
} from "./challenge-runner";
import type { AttemptResponse, PublicQuestion } from "./datagolf-api";

const questions: PublicQuestion[] = [
  createQuestion("Q1", 1),
  createQuestion("Q2", 2),
  createQuestion("Q3", 3),
];

const correctAttempt = createAttempt("attempt-1", "Q1", {
  selected_option: "B",
});
const retryAttempt = createAttempt("attempt-2", "Q2", {
  blanks: ["views", "likes"],
});
const thirdAttempt = createAttempt("attempt-3", "Q2", {
  blanks: ["shares", "saves"],
});

const progress = {
  Q1: applyAttemptToProgress(undefined, correctAttempt),
  Q2: applyAttemptToProgress(undefined, { ...retryAttempt, is_correct: false }),
};

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
assert.equal(getQuestionProgressStatusLabel("correct"), "Done");
assert.equal(getQuestionPositionLabel(questions[1], questions.length), "Q2 / 3");
assert.equal(getQuestionTypeLabel("guided_prompt"), "guided prompt");
assert.equal(getQuestionTypeLabel("multi_part_question"), "multi part question");
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
assert.equal(getPreviousAttemptCount(applyAttemptToProgress(undefined, retryAttempt)), 0);
assert.equal(getPreviousAttemptLabel(0), "Prev 1");
assert.equal(getAttemptResultLabel(correctAttempt), "Correct");
assert.equal(getAttemptResultLabel({ ...retryAttempt, is_correct: false }), "Retry");
assert.equal(getAttemptFeedbackTitle(correctAttempt), "Correct");
assert.equal(
  getAttemptFeedbackTitle({ ...retryAttempt, is_correct: false }),
  "Needs another pass",
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
