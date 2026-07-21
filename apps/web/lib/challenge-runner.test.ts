import assert from "node:assert/strict";

import {
  applyAttemptToProgress,
  buildProgressFromAttempts,
  buildAttemptPayload,
  createAnswerDraftFromAttempt,
  createEmptyAnswerDraft,
  findNextIncompleteQuestionIndex,
  formatAttemptTimestamp,
  formatPreviewCell,
  getAnswerDraftGuidance,
  getAnswerFormatLabel,
  getAttemptFeedbackTitle,
  getAttemptFeedbackLines,
  getAttemptResultLabel,
  getAttemptTone,
  getAttemptsNewestFirst,
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
  getSummaryAccuracyPercent,
  isAnswerDraftDirty,
  isChallengeComplete,
  isQuestionAwaitingResult,
  isQuestionAnswerDraftSubmittable,
  mapSessionChallengeSummary,
  normalizeFillBlankDrafts,
  summarizeChallengeProgress,
} from "./challenge-runner";
import type { AttemptResponse, ColumnSpec, PublicQuestion } from "./datagolf-api";

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
const guidedPromptQuestion: PublicQuestion = {
  ...createQuestion("Q5", 5),
  type: "guided_prompt",
};
const microCodeQuestion: PublicQuestion = {
  ...createQuestion("Q6", 6),
  type: "micro_code",
};
const emptyChoiceQuestion: PublicQuestion = {
  ...createQuestion("Q7", 7),
  display: {
    ...createQuestion("Q7", 7).display,
    choices: [],
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
assert.equal(getInitialQuestionIndex(questions, progress), 1);
assert.equal(getInitialQuestionIndex(questions, pendingOnlyProgress), 0);
assert.equal(getInitialQuestionIndex([], {}), 0);
assert.equal(getAnswerFormatLabel("single_choice", "multiple_choice"), "Single choice");
assert.equal(getAnswerFormatLabel("blanks", "fill_blank"), "Fill each blank");
assert.equal(getAnswerFormatLabel("prompt", "guided_prompt"), "Plain-language prompt");
assert.equal(getAnswerFormatLabel(null, "micro_code"), "micro code");
assert.equal(getAnswerFormatLabel("unknown", "guided_prompt"), "guided prompt");
assert.equal(getQuestionProgressStatusLabel("unattempted"), "Open");
assert.equal(getQuestionProgressStatusLabel("incorrect"), "Retry");
assert.equal(getQuestionProgressStatusLabel("pending"), "Pending");
assert.equal(getQuestionProgressStatusLabel("correct"), "Done");
assert.deepEqual(
  getDatasetPreviewRows(
    Array.from({ length: 7 }, (_, index) => ({ id: index + 1 })),
  ),
  [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
);
assert.deepEqual(
  getDatasetPreviewRows(
    Array.from({ length: 7 }, (_, index) => ({ id: index + 1 })),
    2,
  ),
  [{ id: 1 }, { id: 2 }],
);
assert.deepEqual(
  getDatasetPreviewRows(
    Array.from({ length: 7 }, (_, index) => ({ id: index + 1 })),
    2.8,
  ),
  [{ id: 1 }, { id: 2 }],
);
assert.deepEqual(getDatasetPreviewRows([{ id: 1 }], -1), []);
assert.deepEqual(getDatasetPreviewRows([{ id: 1 }], 0), []);
assert.equal(
  getHiddenDatasetPreviewRowCount(
    Array.from({ length: 7 }, (_, index) => ({ id: index + 1 })),
  ),
  2,
);
assert.equal(
  getHiddenDatasetPreviewRowCount(
    Array.from({ length: 5 }, (_, index) => ({ id: index + 1 })),
  ),
  0,
);
assert.equal(getHiddenDatasetPreviewRowCount([{ id: 1 }], -1), 1);
assert.equal(getHiddenDatasetPreviewRowLabel(1), "+1 more row in preview");
assert.equal(getHiddenDatasetPreviewRowLabel(2), "+2 more rows in preview");
assert.deepEqual(
  getDatasetPreviewColumns(
    Array.from({ length: 5 }, (_, index) => createColumn(`col_${index + 1}`)),
    3,
  ).map((column) => column.name),
  ["col_1", "col_2", "col_3"],
);
assert.deepEqual(
  getDatasetPreviewColumns(
    Array.from({ length: 5 }, (_, index) => createColumn(`col_${index + 1}`)),
    3.9,
  ).map((column) => column.name),
  ["col_1", "col_2", "col_3"],
);
assert.deepEqual(getDatasetPreviewColumns([createColumn("col_1")], -1), []);
assert.deepEqual(getDatasetPreviewColumns([createColumn("col_1")], 0), []);
assert.equal(
  getHiddenDatasetPreviewColumnCount(
    Array.from({ length: 5 }, (_, index) => createColumn(`col_${index + 1}`)),
    3,
  ),
  2,
);
assert.equal(
  getHiddenDatasetPreviewColumnCount(
    Array.from({ length: 3 }, (_, index) => createColumn(`col_${index + 1}`)),
    3,
  ),
  0,
);
assert.equal(getHiddenDatasetPreviewColumnCount([createColumn("col_1")], -1), 1);
assert.equal(getHiddenDatasetPreviewColumnLabel(1), "+1 more column");
assert.equal(getHiddenDatasetPreviewColumnLabel(2), "+2 more columns");
assert.equal(
  getDatasetPreviewWindowLabel({
    dataset: {
      slug: "tiktok-posts",
      version: "v1",
      path: "datasets/tiktok-posts.csv",
      row_count: 500,
      column_count: 25,
      creators_count: 20,
      date_range: {
        start: "2026-01-01",
        end: "2026-01-31",
      },
      columns: Array.from({ length: 8 }, (_, index) =>
        createColumn(`col_${index + 1}`),
      ),
    },
    rows: Array.from({ length: 8 }, (_, index) => ({ id: index + 1 })),
  }),
  "Showing 5 of 500 rows / 4 of 25 columns",
);
assert.equal(
  getDatasetPreviewWindowLabel(
    {
      dataset: {
        slug: "tiny-dataset",
        version: "v1",
        path: "datasets/tiny.csv",
        row_count: 1,
        column_count: 1,
        creators_count: 1,
        date_range: {
          start: "2026-01-01",
          end: "2026-01-01",
        },
        columns: [createColumn("col_1"), createColumn("col_2")],
      },
      rows: [{ id: 1 }, { id: 2 }],
    },
    1,
    1,
  ),
  "Showing 1 of 2 rows / 1 of 2 columns",
);
assert.equal(formatPreviewCell(null), "");
assert.equal(formatPreviewCell(undefined), "");
assert.equal(formatPreviewCell(Number.NaN), "");
assert.equal(formatPreviewCell(Number.POSITIVE_INFINITY), "");
assert.equal(formatPreviewCell(Number.NEGATIVE_INFINITY), "");
assert.equal(formatPreviewCell(12), "12");
assert.equal(formatPreviewCell(12.345), "12.35");
assert.equal(formatPreviewCell("creator_1"), "creator_1");
assert.equal(formatPreviewCell(["reels", "tutorial"]), "[\"reels\",\"tutorial\"]");
assert.equal(
  formatPreviewCell({ post_type: "reel", saves: 42 }),
  "{\"post_type\":\"reel\",\"saves\":42}",
);
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
assert.equal(
  getAnswerDraftGuidance(questions[0], createEmptyAnswerDraft()),
  "Choose an option",
);
assert.equal(
  getAnswerDraftGuidance(questions[0], {
    promptText: "",
    selectedOption: "B",
    blanks: [],
    codeText: "",
  }),
  null,
);
assert.equal(
  getAnswerDraftGuidance(questions[0], {
    promptText: "",
    selectedOption: "Z",
    blanks: [],
    codeText: "",
  }),
  "Choose a listed option",
);
assert.equal(
  getAnswerDraftGuidance(emptyChoiceQuestion, createEmptyAnswerDraft()),
  "No options available",
);
assert.equal(
  getAnswerDraftGuidance(guidedPromptQuestion, createEmptyAnswerDraft()),
  "Enter a prompt",
);
assert.equal(
  getAnswerDraftGuidance(microCodeQuestion, createEmptyAnswerDraft()),
  "Enter code",
);
assert.equal(
  getSubmitAnswerLabel({
    question: questions[0],
    draft: {
      promptText: "",
      selectedOption: "B",
      blanks: [],
      codeText: "",
    },
    isAwaitingResult: false,
    isSubmitting: false,
  }),
  "Check Answer",
);
assert.equal(
  getSubmitAnswerLabel({
    question: questions[0],
    draft: createEmptyAnswerDraft(),
    isAwaitingResult: false,
    isSubmitting: false,
  }),
  "Choose an option",
);
assert.equal(
  getSubmitAnswerLabel({
    question: fillBlankQuestion,
    draft: {
      promptText: "",
      selectedOption: "",
      blanks: ["views", ""],
      codeText: "",
    },
    isAwaitingResult: false,
    isSubmitting: false,
  }),
  "1 blank left",
);
assert.equal(
  getSubmitAnswerLabel({
    question: fillBlankQuestion,
    draft: createEmptyAnswerDraft(),
    isAwaitingResult: true,
    isSubmitting: false,
  }),
  "Pending",
);
assert.equal(
  getSubmitAnswerLabel({
    question: fillBlankQuestion,
    draft: createEmptyAnswerDraft(),
    isAwaitingResult: false,
    isSubmitting: true,
  }),
  "Checking",
);
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
assert.equal(
  isQuestionAnswerDraftSubmittable(questions[0], {
    promptText: "",
    selectedOption: "B",
    blanks: [],
    codeText: "",
  }),
  true,
);
assert.equal(
  isQuestionAnswerDraftSubmittable(questions[0], {
    promptText: "",
    selectedOption: "Z",
    blanks: [],
    codeText: "",
  }),
  false,
);
assert.equal(
  isQuestionAnswerDraftSubmittable(emptyChoiceQuestion, {
    promptText: "",
    selectedOption: "A",
    blanks: [],
    codeText: "",
  }),
  false,
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
  buildAttemptPayload(questions[0], " session-1 ", {
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
assert.equal(cappedProgress?.attemptCount, 6);
assert.equal(cappedProgress ? getPreviousAttemptCount(cappedProgress) : null, 5);
assert.equal(getPreviousAttemptCount(applyAttemptToProgress(undefined, retryAttempt)), 0);
assert.equal(getPreviousAttemptsTitle(1), "Previous attempt (1)");
assert.equal(getPreviousAttemptsTitle(2), "Previous attempts (2)");
assert.equal(getPreviousAttemptLabel(0), "Prev 1");
assert.equal(
  formatAttemptTimestamp("2026-01-01T14:05:00.000Z", "en-US", "UTC"),
  "Jan 1, 2:05 PM",
);
assert.equal(formatAttemptTimestamp("not-a-date", "en-US"), "not-a-date");
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
  [
    {
      label: "Error",
      value: "Attempt failed before evaluation completed",
      passed: false,
    },
  ],
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
  retryQuestions: 0,
  totalAttempts: 3,
  accuracyPercent: 33,
  completionPercent: 33,
});
assert.equal(
  getChallengeProgressDetailText(summarizeChallengeProgress(questions, progress)),
  "1 of 3 correct / 2 remaining / 1 incorrect / 0 skipped / 1 pending / 33% accuracy / 3 attempts",
);
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
    retry_questions: 2,
    total_attempts: 6,
    accuracy_percent: 50,
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
    retryQuestions: 2,
    totalAttempts: 6,
    accuracyPercent: 50,
    completionPercent: 13,
  },
);
assert.deepEqual(
  mapSessionChallengeSummary({
    session_id: "session-1",
    challenge_slug: "tiktok-creator-posts",
    challenge_version: "v1",
    total_questions: -15,
    attempted_questions: -4,
    correct_questions: -2,
    remaining_questions: -13,
    incorrect_questions: -1,
    pending_questions: -1,
    skipped_questions: -11,
    retry_questions: -2,
    total_attempts: -6,
    accuracy_percent: 150,
    completion_percent: -13,
  }),
  {
    totalQuestions: 0,
    attemptedQuestions: 0,
    correctQuestions: 0,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: 100,
    completionPercent: 0,
  },
);
assert.deepEqual(
  mapSessionChallengeSummary({
    session_id: "session-1",
    challenge_slug: "tiktok-creator-posts",
    challenge_version: "v1",
    total_questions: Number.NaN,
    attempted_questions: Number.POSITIVE_INFINITY,
    correct_questions: Number.NEGATIVE_INFINITY,
    remaining_questions: Number.NaN,
    incorrect_questions: Number.POSITIVE_INFINITY,
    pending_questions: Number.NEGATIVE_INFINITY,
    skipped_questions: Number.NaN,
    retry_questions: Number.POSITIVE_INFINITY,
    total_attempts: Number.NEGATIVE_INFINITY,
    accuracy_percent: Number.NaN,
    completion_percent: Number.POSITIVE_INFINITY,
  }),
  {
    totalQuestions: 0,
    attemptedQuestions: 0,
    correctQuestions: 0,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: 0,
    completionPercent: 0,
  },
);
assert.deepEqual(
  mapSessionChallengeSummary({
    session_id: "session-1",
    challenge_slug: "tiktok-creator-posts",
    challenge_version: "v1",
    total_questions: 15.9,
    attempted_questions: 4.7,
    correct_questions: 2.1,
    remaining_questions: 13.8,
    incorrect_questions: 1.9,
    pending_questions: 1.2,
    skipped_questions: 11.6,
    retry_questions: 2.8,
    total_attempts: 6.4,
    accuracy_percent: 50.5,
    completion_percent: 13.7,
  }),
  {
    totalQuestions: 15,
    attemptedQuestions: 4,
    correctQuestions: 2,
    remainingQuestions: 13,
    incorrectQuestions: 1,
    pendingQuestions: 1,
    skippedQuestions: 11,
    retryQuestions: 2,
    totalAttempts: 6,
    accuracyPercent: 50.5,
    completionPercent: 13.7,
  },
);
assert.equal(
  getCompletionPercent(
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
      retry_questions: 2,
      total_attempts: 6,
      accuracy_percent: 50,
      completion_percent: 13,
    }),
  ),
  13,
);
assert.equal(
  getChallengeProgressDetailText({
    totalQuestions: 15,
    attemptedQuestions: 4,
    correctQuestions: 2,
    remainingQuestions: 13,
    incorrectQuestions: 1,
    pendingQuestions: 1,
    skippedQuestions: 11,
    retryQuestions: 2,
    totalAttempts: 6,
    accuracyPercent: 50,
    completionPercent: 13,
  }),
  "2 of 15 correct / 13 remaining / 1 incorrect / 11 skipped / 1 pending / 2 retried / 50% accuracy / 6 attempts",
);
assert.equal(
  getChallengeProgressDetailText({
    totalQuestions: 1,
    attemptedQuestions: 1,
    correctQuestions: 1,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 0,
    totalAttempts: 1,
    accuracyPercent: 100,
    completionPercent: 100,
  }),
  "1 of 1 correct / 0 remaining / 0 incorrect / 0 skipped / 100% accuracy / 1 attempt",
);
assert.equal(
  getSummaryAccuracyPercent({
    totalQuestions: 3,
    attemptedQuestions: 3,
    correctQuestions: 3,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 0,
    totalAttempts: 3,
    accuracyPercent: 150,
    completionPercent: 100,
  }),
  100,
);
assert.equal(
  getChallengeProgressDetailText({
    totalQuestions: 3,
    attemptedQuestions: 0,
    correctQuestions: 0,
    remainingQuestions: 3,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 3,
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: -20,
    completionPercent: 0,
  }),
  "0 of 3 correct / 3 remaining / 0 incorrect / 3 skipped / 0% accuracy / 0 attempts",
);
assert.equal(
  getChallengeProgressDetailText({
    totalQuestions: -1,
    attemptedQuestions: 0,
    correctQuestions: -2,
    remainingQuestions: -3,
    incorrectQuestions: -4,
    pendingQuestions: 0,
    skippedQuestions: -5,
    retryQuestions: 0,
    totalAttempts: -6,
    accuracyPercent: -20,
    completionPercent: 0,
  }),
  "0 of 0 correct / 0 remaining / 0 incorrect / 0 skipped / 0% accuracy / 0 attempts",
);
assert.equal(
  getCompletionPercent(summarizeChallengeProgress(questions, progress)),
  33,
);
assert.equal(
  isChallengeComplete({
    totalQuestions: 3,
    attemptedQuestions: 3,
    correctQuestions: 3,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 1,
    totalAttempts: 5,
    accuracyPercent: 100,
    completionPercent: 100,
  }),
  true,
);
assert.equal(
  isChallengeComplete({
    totalQuestions: 3,
    attemptedQuestions: 2,
    correctQuestions: 2,
    remainingQuestions: 1,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 1,
    retryQuestions: 0,
    totalAttempts: 2,
    accuracyPercent: 100,
    completionPercent: 67,
  }),
  false,
);
assert.equal(
  isChallengeComplete({
    totalQuestions: 0,
    attemptedQuestions: 0,
    correctQuestions: 0,
    remainingQuestions: 0,
    incorrectQuestions: 0,
    pendingQuestions: 0,
    skippedQuestions: 0,
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: 0,
    completionPercent: 0,
  }),
  false,
);
assert.equal(
  getNextOpenQuestionActionLabel(
    {
      totalQuestions: 3,
      attemptedQuestions: 2,
      correctQuestions: 1,
      remainingQuestions: 2,
      incorrectQuestions: 1,
      pendingQuestions: 0,
      skippedQuestions: 1,
      retryQuestions: 0,
      totalAttempts: 2,
      accuracyPercent: 50,
      completionPercent: 33,
    },
    true,
  ),
  "Next open",
);
assert.equal(
  getNextOpenQuestionActionLabel(
    {
      totalQuestions: 3,
      attemptedQuestions: 3,
      correctQuestions: 1,
      remainingQuestions: 2,
      incorrectQuestions: 0,
      pendingQuestions: 2,
      skippedQuestions: 0,
      retryQuestions: 0,
      totalAttempts: 3,
      accuracyPercent: 33,
      completionPercent: 33,
    },
    false,
  ),
  "Waiting",
);
assert.equal(
  getNextOpenQuestionActionLabel(
    {
      totalQuestions: 3,
      attemptedQuestions: 3,
      correctQuestions: 1,
      remainingQuestions: 2,
      incorrectQuestions: 2,
      pendingQuestions: 0,
      skippedQuestions: 0,
      retryQuestions: 0,
      totalAttempts: 3,
      accuracyPercent: 33,
      completionPercent: 33,
    },
    false,
  ),
  "Next open",
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
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: 0,
    completionPercent: 0,
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
    retryQuestions: 1,
    totalAttempts: 5,
    accuracyPercent: 100,
    completionPercent: 100,
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
    retryQuestions: 0,
    totalAttempts: 0,
    accuracyPercent: 0,
    completionPercent: 0,
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
      choices: [
        { id: "A", text: "First answer" },
        { id: "B", text: "Second answer" },
      ],
      code_snippet: null,
      answer_format: null,
    },
  };
}

function createColumn(name: string): ColumnSpec {
  return {
    name,
    type: "string",
    description: `Column ${name}`,
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
