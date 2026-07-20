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
  isQuestionAwaitingResult,
  isQuestionAnswerDraftSubmittable,
  mapSessionChallengeSummary,
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
  Q3: applyAttemptToProgress(undefined, pendingAttempt),
};
const pendingThenOpenProgress = {
  Q1: applyAttemptToProgress(undefined, correctAttempt),
  Q2: applyAttemptToProgress(undefined, pendingAttempt),
};
const pendingOnlyProgress = {
  Q1: applyAttemptToProgress(undefined, correctAttempt),
  Q2: applyAttemptToProgress(undefined, pendingAttempt),
  Q3: applyAttemptToProgress(undefined, {
    ...pendingAttempt,
    id: "attempt-pending-2",
    question_id: "Q3",
  }),
};
const sessionProgress = buildProgressFromAttempts([
  correctAttempt,
  { ...retryAttempt, is_correct: false },
  thirdAttempt,
]);
const shuffledSessionProgress = buildProgressFromAttempts([
  {
    ...thirdAttempt,
    created_at: "2026-01-01T00:00:03.000Z",
  },
  {
    ...retryAttempt,
    created_at: "2026-01-01T00:00:02.000Z",
    is_correct: false,
  },
  {
    ...correctAttempt,
    created_at: "2026-01-01T00:00:01.000Z",
  },
]);
const sameTimestampProgress = buildProgressFromAttempts([
  {
    ...retryAttempt,
    id: "attempt-b",
    question_id: "Q2",
    created_at: "2026-01-01T00:00:02.000Z",
    is_correct: false,
  },
  {
    ...thirdAttempt,
    id: "attempt-c",
    question_id: "Q2",
    created_at: "2026-01-01T00:00:02.000Z",
  },
  {
    ...retryAttempt,
    id: "attempt-a",
    question_id: "Q2",
    created_at: "2026-01-01T00:00:02.000Z",
    is_correct: false,
  },
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
assert.equal(findNextIncompleteQuestionIndex(questions, pendingThenOpenProgress), 2);
assert.equal(findNextIncompleteQuestionIndex(questions, pendingOnlyProgress), null);
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
  isQuestionAwaitingResult(applyAttemptToProgress(undefined, pendingAttempt)),
  true,
);
assert.equal(
  getQuestionProgressStatus(
    applyAttemptToProgress(undefined, { ...retryAttempt, is_correct: false }),
  ),
  "incorrect",
);
assert.equal(
  isQuestionAwaitingResult(
    applyAttemptToProgress(undefined, { ...retryAttempt, is_correct: false }),
  ),
  false,
);
assert.equal(
  getQuestionProgressStatus(applyAttemptToProgress(undefined, correctAttempt)),
  "correct",
);
assert.equal(
  isQuestionAwaitingResult(
    applyAttemptToProgress(
      applyAttemptToProgress(undefined, correctAttempt),
      pendingAttempt,
    ),
  ),
  false,
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
assert.deepEqual(
  buildAttemptPayload(questions[0], "session-1", {
    promptText: "",
    selectedOption: " B ",
    blanks: [],
    codeText: "",
  }),
  {
    session_id: "session-1",
    selected_option: "B",
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
  getAttemptsNewestFirst([
    {
      ...retryAttempt,
      created_at: "2026-01-01T00:00:02.000Z",
    },
    {
      ...thirdAttempt,
      created_at: "2026-01-01T00:00:03.000Z",
    },
    {
      ...correctAttempt,
      created_at: "2026-01-01T00:00:01.000Z",
    },
  ]).map((attempt) => attempt.id),
  ["attempt-3", "attempt-2", "attempt-1"],
);
assert.deepEqual(
  getAttemptsNewestFirst([
    {
      ...retryAttempt,
      id: "attempt-b",
      created_at: "2026-01-01T00:00:02.000Z",
    },
    {
      ...thirdAttempt,
      id: "attempt-c",
      created_at: "2026-01-01T00:00:02.000Z",
    },
    {
      ...correctAttempt,
      id: "attempt-a",
      created_at: "2026-01-01T00:00:02.000Z",
    },
  ]).map((attempt) => attempt.id),
  ["attempt-c", "attempt-b", "attempt-a"],
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
assert.equal(shuffledSessionProgress.Q2.lastAttempt?.id, "attempt-3");
assert.deepEqual(sameTimestampProgress.Q2.attempts.map((attempt) => attempt.id), [
  "attempt-a",
  "attempt-b",
  "attempt-c",
]);
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
assert.deepEqual(
  getAttemptFeedbackLines({
    ...retryAttempt,
    question_type: "fill_blank",
    evaluation_payload: {
      per_blank_results: [
        {
          blank_index: 0,
          accepted: ["filter"],
          received: "filter",
          passed: true,
        },
        {
          blank_index: 1,
          accepted: ["mean", "avg"],
          received: "sum",
          passed: false,
        },
      ],
    },
    is_correct: false,
  }),
  [
    {
      label: "Blank 1",
      value: "filter -> filter",
      passed: true,
    },
    {
      label: "Blank 2",
      value: "sum -> mean, avg",
      passed: false,
    },
  ],
);
assert.deepEqual(
  getAttemptFeedbackLines({
    ...retryAttempt,
    question_type: "micro_code",
    evaluation_payload: {
      normalized_submission: "engagement_rate=(likes+comments+shares)/views",
      accepted_patterns: [],
      accepted_regex: ["engagement_rate=\\(.+\\)/views", "mutate\\("],
      regex_matches: [
        {
          pattern: "engagement_rate=\\(.+\\)/views",
          passed: true,
        },
        {
          pattern: "mutate\\(",
          passed: false,
        },
      ],
    },
    is_correct: true,
  }),
  [
    {
      label: "Submitted",
      value: "engagement_rate=(likes+comments+shares)/views",
      passed: true,
    },
    {
      label: "Regex 1",
      value: "engagement_rate=\\(.+\\)/views",
      passed: true,
    },
    {
      label: "Regex 2",
      value: "mutate\\(",
      passed: false,
    },
  ],
);
assert.deepEqual(
  getAttemptFeedbackLines({
    ...retryAttempt,
    question_type: "micro_code",
    evaluation_payload: {
      normalized_submission: "select(post_id)",
      accepted_patterns: ["select(post_id)"],
      accepted_regex: [],
    },
    is_correct: true,
  }),
  [
    {
      label: "Submitted",
      value: "select(post_id)",
      passed: true,
    },
    {
      label: "Accepted",
      value: "select(post_id)",
    },
  ],
);
assert.deepEqual(
  getAttemptFeedbackLines({
    ...retryAttempt,
    question_type: "guided_prompt",
    evaluation_payload: {
      required_code_checks: [
        {
          name: "uses_filter",
          description: "Filter the dataset",
          passed: true,
        },
      ],
    },
    is_correct: null,
  }),
  [
    {
      label: "Dataset result",
      value: "Unknown",
      passed: undefined,
    },
    {
      label: "uses_filter",
      value: "Filter the dataset",
      passed: true,
    },
  ],
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
  attemptedQuestions: 3,
  correctQuestions: 1,
  remainingQuestions: 2,
  incorrectQuestions: 1,
  pendingQuestions: 1,
  skippedQuestions: 0,
  totalAttempts: 3,
});
assert.deepEqual(
  mapSessionChallengeSummary({
    session_id: "session-1",
    challenge_slug: "tiktok-creator-posts",
    challenge_version: "v1",
    total_questions: 15,
    attempted_questions: 4,
    correct_questions: 2,
    remaining_questions: 13,
    incorrect_questions: 1,
    pending_questions: 1,
    skipped_questions: 11,
    total_attempts: 6,
    completion_percent: 13,
  }),
  {
    totalQuestions: 15,
    attemptedQuestions: 4,
    correctQuestions: 2,
    remainingQuestions: 13,
    incorrectQuestions: 1,
    pendingQuestions: 1,
    skippedQuestions: 11,
    totalAttempts: 6,
  },
);
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
    pendingQuestions: 0,
    skippedQuestions: 0,
    totalAttempts: 0,
  }),
  0,
);
assert.equal(
  getCompletionPercent({
    totalQuestions: 3,
    attemptedQuestions: 3,
    correctQuestions: 5,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    totalAttempts: 5,
  }),
  100,
);
assert.equal(
  getCompletionPercent({
    totalQuestions: 3,
    attemptedQuestions: 0,
    correctQuestions: -1,
    remainingQuestions: 3,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 3,
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
