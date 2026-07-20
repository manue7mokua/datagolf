import assert from "node:assert/strict";

import {
  applyAttemptToProgress,
  createAnswerDraftFromAttempt,
  findNextIncompleteQuestionIndex,
  getAnswerFormatLabel,
  getQuestionProgressStatusLabel,
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
assert.equal(getQuestionProgressStatusLabel("unattempted"), "Open");
assert.equal(getQuestionProgressStatusLabel("incorrect"), "Retry");
assert.equal(getQuestionProgressStatusLabel("correct"), "Done");
assert.deepEqual(summarizeChallengeProgress(questions, progress), {
  totalQuestions: 3,
  attemptedQuestions: 2,
  correctQuestions: 1,
  incorrectQuestions: 1,
  skippedQuestions: 1,
  totalAttempts: 2,
});

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
