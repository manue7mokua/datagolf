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

export function getDatagolfApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_DATAGOLF_API_URL?.replace(/\/$/, "") ??
    defaultApiBaseUrl
  );
}

export async function getChallenge(slug: string) {
  return requestJson<ChallengeDetail>(`/challenges/${slug}`);
}

export async function listChallenges() {
  return requestJson<ChallengeListItem[]>("/challenges");
}

export async function getChallengeQuestions(slug: string) {
  return requestJson<PublicQuestion[]>(`/challenges/${slug}/questions`);
}

export async function createAttempt(
  questionId: string,
  payload: AttemptCreateRequest,
) {
  return requestJson<AttemptResponse>(`/questions/${questionId}/attempts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAttempt(attemptId: string) {
  return requestJson<AttemptResponse>(`/attempts/${attemptId}`);
}

export async function getDatasetPreview(slug: string, limit = 20) {
  return requestJson<DatasetPreview>(
    `/datasets/${slug}/preview?limit=${encodeURIComponent(limit)}`,
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${getDatagolfApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new DatagolfApiError(
      `Datagolf API request failed with ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as T;
}
