async page => {
const answers = [
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

const sessionId = await getTestIdText("runner-session-id");
assert(sessionId.length > 0, "expected a runner session id");

for (const answer of answers) {
  await answerQuestion(answer);
}

await expectTestIdText("runner-progress-summary", "8 of 15 correct");
await expectTestIdText("runner-progress-summary", "8 attempts");
await expectTestIdText("runner-attempt-feedback", "Correct");

await page.reload({ waitUntil: "domcontentloaded" });
await waitForTestId("challenge-runner-page");
await expectTestIdText("runner-session-id", sessionId);
await expectTestIdText("runner-progress-summary", "8 of 15 correct");
await expectTestIdText("runner-progress-summary", "8 attempts");

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
  } else {
    throw new Error(`Unsupported answer type: ${answer.type}`);
  }

  await clickTestId("runner-submit-button");

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

function testIdLocator(testId) {
  return page.locator(`[data-testid="${testId}"]`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
}
