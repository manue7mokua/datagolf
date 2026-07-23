async page => {
const answers = [
  {
    id: "Q1",
    title: "Short videos with unusually high engagement",
    type: "prompt",
    prompt:
      "Create engagement_rate as likes plus comments plus shares divided by views, filter video_length_sec < 30, arrange descending by engagement_rate, and return the top 5 posts.",
    nextTitle: "Which format wins with bigger creators?",
  },
  {
    id: "Q2",
    title: "Which format wins with bigger creators?",
    type: "prompt",
    prompt:
      "Filter followers_at_post >= 100000, group by content_format, calculate mean views as avg_views, and arrange descending by avg_views.",
    nextTitle: "Longer videos: who keeps attention best?",
  },
  {
    id: "Q3",
    title: "Longer videos: who keeps attention best?",
    type: "prompt",
    prompt:
      "Filter video_length_sec > 35, group by creator_category, summarize mean completion_rate_pct, then arrange descending.",
    nextTitle: "Creators beating the dataset average",
  },
  {
    id: "Q4",
    title: "Creators beating the dataset average",
    type: "prompt",
    prompt:
      "Create engagement_rate from likes, comments, shares, and views; compute the dataset mean engagement_rate; group by creator_handle; calculate average engagement_rate; filter creators above the dataset average; arrange descending and keep the top 5.",
    nextTitle: "Posts that overperformed relative to the creator's norm",
  },
  {
    id: "Q5",
    title: "Posts that overperformed relative to the creator's norm",
    type: "prompt",
    prompt:
      "Group by creator_handle, compute mean views for each creator, create views_above_creator_avg as views minus the creator average, arrange descending, and return the top 10 posts.",
    nextTitle: "Best time bucket for shares",
  },
  {
    id: "Q6",
    title: "Best time bucket for shares",
    type: "prompt",
    prompt:
      "Use case_when to create hour_bucket with morning for post_hour 5 to 11, afternoon 12 to 16, evening 17 to 21, and late_night otherwise; group by hour_bucket, compute mean shares, and arrange descending.",
    nextTitle: "Did the latest post improve on the previous one?",
  },
  {
    id: "Q7",
    title: "Did the latest post improve on the previous one?",
    type: "prompt",
    prompt:
      "Arrange by creator_handle and post_date, group by creator_handle, use lag(completion_rate_pct) for prev_completion_rate_pct, keep the latest row per creator, filter completion_rate_pct > prev_completion_rate_pct, compute completion_lift, and arrange descending.",
    nextTitle: "Sort highest views first",
  },
  {
    id: "Q8",
    title: "Sort highest views first",
    type: "choice",
    choice: "B",
    nextTitle: "Fill in the gaps: filter + mean",
  },
  {
    id: "Q9",
    title: "Fill in the gaps: filter + mean",
    type: "blanks",
    blanks: ["filter", "mean"],
    nextTitle: "Micro-code: build engagement rate",
  },
  {
    id: "Q10",
    title: "Micro-code: build engagement rate",
    type: "code",
    code: "engagement_rate = (likes + comments + shares) / views",
    nextTitle: "The pipe operator",
  },
  {
    id: "Q11",
    title: "The pipe operator",
    type: "choice",
    choice: "C",
    nextTitle: "Fill in the gaps: grouped summary",
  },
  {
    id: "Q12",
    title: "Fill in the gaps: grouped summary",
    type: "blanks",
    blanks: ["mean", "desc(avg_completion)"],
    nextTitle: "Micro-code: evening posts only",
  },
  {
    id: "Q13",
    title: "Micro-code: evening posts only",
    type: "code",
    code: "post_hour >= 18",
    nextTitle: "Fill in the gap: previous views",
  },
  {
    id: "Q14",
    title: "Fill in the gap: previous views",
    type: "blanks",
    blanks: ["views"],
    nextTitle: "Micro-code: keep only 3 columns",
  },
  {
    id: "Q15",
    title: "Micro-code: keep only 3 columns",
    type: "code",
    code: "select(post_id, creator_handle, views)",
  },
];

await waitForTestId("challenge-runner-page");
await waitForTestId("runner-dataset-preview");
await expectTestIdText("runner-progress-summary", "0 of 15 correct");
await expectQuestionTitle("Short videos with unusually high engagement");

const sessionId = await getTestIdText("runner-session-id");
assert(sessionId.length > 0, "expected a runner session id");

for (const answer of answers) {
  await answerQuestion(answer);
}

await expectTestIdText("runner-progress-summary", "15 of 15 correct");
await expectTestIdText("runner-progress-summary", "15 attempts");
await expectTestIdText("runner-attempt-feedback", "Correct");

await page.reload({ waitUntil: "domcontentloaded" });
await waitForTestId("challenge-runner-page");
await expectTestIdText("runner-session-id", sessionId);
await expectTestIdText("runner-progress-summary", "15 of 15 correct");
await expectTestIdText("runner-progress-summary", "15 attempts");

await clickTestId("runner-question-nav-Q8");
await expectQuestionTitle("Sort highest views first");
await expectTestIdText("runner-attempt-feedback", "Correct");

async function answerQuestion(answer) {
  await clickTestId(`runner-question-nav-${answer.id}`);
  await expectQuestionTitle(answer.title);

  if (answer.type === "choice") {
    await clickTestId(`runner-choice-${answer.choice}`);
  } else if (answer.type === "blanks") {
    for (const [index, blank] of answer.blanks.entries()) {
      await fillTestId(`runner-blank-input-${index + 1}`, blank);
    }
  } else if (answer.type === "code") {
    await fillTestId("runner-code-input", answer.code);
  } else if (answer.type === "prompt") {
    await fillTestId("runner-prompt-input", answer.prompt);
  } else {
    throw new Error(`Unsupported answer type: ${answer.type}`);
  }

  await clickTestId("runner-submit-button");
  await expectNoSubmitError();

  if (answer.nextTitle) {
    await expectQuestionTitle(answer.nextTitle);
  } else {
    await expectTestIdText("runner-attempt-feedback", "Correct");
  }
}

async function clickTestId(testId) {
  await testIdLocator(testId).click();
}

async function fillTestId(testId, value) {
  await testIdLocator(testId).fill(value);
}

async function waitForTestId(testId) {
  await testIdLocator(testId).waitFor({
    state: "visible",
    timeout: 30000,
  });
}

async function getTestIdText(testId) {
  await waitForTestId(testId);
  return (await testIdLocator(testId).innerText()).trim();
}

async function expectTestIdText(testId, expectedText) {
  await page.waitForFunction(
    ({ testId, expectedText }) => {
      const element = document.querySelector(`[data-testid="${testId}"]`);
      return element?.textContent?.includes(expectedText) ?? false;
    },
    { testId, expectedText },
    { timeout: 30000 },
  );
}

async function expectQuestionTitle(expectedTitle) {
  await expectTestIdText("runner-question-shell", expectedTitle);
}

async function expectNoSubmitError() {
  const errorCount = await testIdLocator("runner-submit-error").count();
  assert(errorCount === 0, "expected no visible submit error");
}

function testIdLocator(testId) {
  return page.locator(`[data-testid="${testId}"]`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
}
