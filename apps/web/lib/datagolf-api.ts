export type QuestionType =
  | "guided_prompt"
  | "multiple_choice"
  | "fill_blank"
  | "micro_code";

export type ColumnSpec = {
  name: string;
  type: string;
  description: string;
};

export type DatasetSummary = {
  slug: string;
  version: string;
  path: string;
  row_count: number;
  column_count: number;
  creators_count: number;
  date_range: {
    start: string;
    end: string;
  };
  columns: ColumnSpec[];
};

export type DatasetPreview = {
  dataset: DatasetSummary;
  rows: Record<string, unknown>[];
};

export type ChoiceSpec = {
  id: string;
  text: string;
};

export type QuestionDisplay = {
  setup_text: string | null;
  task_text: string;
  hint_chips: string[];
  choices: ChoiceSpec[];
  code_snippet: string | null;
  answer_format: string | null;
};

export type ChallengeDetail = {
  challenge_slug: string;
  challenge_version: string;
  title: string;
  description: string;
  prompt_version: string;
  evaluator_version: string;
  dataset: DatasetSummary;
  question_count: number;
};

export type ChallengeListItem = {
  challenge_slug: string;
  challenge_version: string;
  title: string;
  description: string;
  dataset_slug: string;
  dataset_version: string;
  question_count: number;
};

export type PublicQuestion = {
  id: string;
  order: number;
  type: QuestionType;
  title: string;
  display: QuestionDisplay;
};

export type AttemptCreateRequest = {
  session_id: string;
  prompt_text?: string;
  selected_option?: string;
  blanks?: string[];
  code_text?: string;
};

export type AttemptResponse = {
  id: string;
  session_id: string;
  question_id: string;
  question_type: QuestionType;
  status: "pending" | "completed" | "failed";
  challenge_slug: string;
  challenge_version: string;
  dataset_slug: string;
  dataset_version: string;
  prompt_version: string;
  model: string;
  evaluator_version: string;
  user_input_payload: Record<string, unknown>;
  generated_code: string | null;
  evaluation_payload: Record<string, unknown> | null;
  is_correct: boolean | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionChallengeSummary = {
  session_id: string;
  challenge_slug: string;
  challenge_version: string;
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  remaining_questions: number;
  incorrect_questions: number;
  pending_questions: number;
  skipped_questions: number;
  retry_questions: number;
  total_attempts: number;
  accuracy_percent: number;
  completion_percent: number;
};

const defaultApiBaseUrl = "http://localhost:8000";

export class DatagolfApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "DatagolfApiError";
  }
}

export function getDatagolfApiErrorMessage(status: number, payload: unknown) {
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? (payload as { detail?: unknown }).detail
      : null;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map(formatValidationErrorDetail)
      .filter((message) => message.length > 0);

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return `Datagolf API request failed with ${status}`;
}

function formatValidationErrorDetail(detail: unknown) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return "";
  }

  const record = detail as { loc?: unknown; msg?: unknown };
  if (typeof record.msg !== "string" || !record.msg.trim()) {
    return "";
  }

  const location = Array.isArray(record.loc)
    ? record.loc
        .filter((part): part is string | number => (
          typeof part === "string" || typeof part === "number"
        ))
        .map(String)
        .join(".")
    : "";

  return location ? `${location}: ${record.msg.trim()}` : record.msg.trim();
}

export function getDatagolfApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_DATAGOLF_API_URL?.trim();
  return configuredUrl ? configuredUrl.replace(/\/+$/, "") : defaultApiBaseUrl;
}

export async function getChallenge(slug: string) {
  return requestJson<ChallengeDetail>(`/challenges/${encodePathSegment(slug)}`);
}

export async function listChallenges() {
  return requestJson<ChallengeListItem[]>("/challenges");
}

export async function getChallengeQuestions(slug: string) {
  return requestJson<PublicQuestion[]>(
    `/challenges/${encodePathSegment(slug)}/questions`,
  );
}

export async function createAttempt(
  questionId: string,
  payload: AttemptCreateRequest,
) {
  return requestJson<AttemptResponse>(
    `/questions/${encodePathSegment(questionId)}/attempts`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getAttempt(attemptId: string) {
  return requestJson<AttemptResponse>(`/attempts/${encodePathSegment(attemptId)}`);
}

export async function getDatasetPreview(slug: string, limit = 20) {
  return requestJson<DatasetPreview>(
    `/datasets/${encodePathSegment(slug)}/preview?limit=${encodeURIComponent(limit)}`,
  );
}

export async function listSessionAttempts(
  sessionId: string,
  challengeSlug?: string,
  limit = 100,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (challengeSlug) {
    params.set("challenge_slug", challengeSlug);
  }

  return requestJson<AttemptResponse[]>(
    `/sessions/${encodeURIComponent(sessionId)}/attempts?${params.toString()}`,
  );
}

export async function getSessionChallengeSummary(
  sessionId: string,
  challengeSlug: string,
) {
  const encodedSessionId = encodePathSegment(sessionId);
  const encodedChallengeSlug = encodePathSegment(challengeSlug);

  return requestJson<SessionChallengeSummary>(
    `/sessions/${encodedSessionId}/challenges/${encodedChallengeSlug}/summary`,
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getDatagolfApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    throw new DatagolfApiError("Could not reach Datagolf API", 0, error);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new DatagolfApiError(
      getDatagolfApiErrorMessage(response.status, payload),
      response.status,
      payload,
    );
  }

  return payload as T;
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}
