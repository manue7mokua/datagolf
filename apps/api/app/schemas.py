from __future__ import annotations

from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


QuestionType = Literal["guided_prompt", "multiple_choice", "fill_blank", "micro_code"]
AttemptStatus = Literal["pending", "completed", "failed"]


class ColumnSpec(BaseModel):
    name: str
    type: str
    description: str


class DatasetSpec(BaseModel):
    slug: str
    version: str
    path: str
    row_count: int
    column_count: int
    creators_count: int
    date_range: dict[str, str]
    columns: list[ColumnSpec]


class ChoiceSpec(BaseModel):
    id: str
    text: str


class QuestionDisplay(BaseModel):
    setup_text: Optional[str] = None
    task_text: str
    hint_chips: list[str] = Field(default_factory=list)
    choices: list[ChoiceSpec] = Field(default_factory=list)
    code_snippet: Optional[str] = None
    answer_format: Optional[str] = None


class RequiredCodeCheck(BaseModel):
    name: str
    mode: Literal["contains_all", "contains_any", "regex_all", "regex_any"]
    patterns: list[str]
    description: Optional[str] = None


class GuidedPromptEvaluation(BaseModel):
    kind: Literal["guided_prompt"]
    operation: str
    result_limit: Optional[int] = None
    round_decimals: int = 6
    expected_columns: list[str]
    expected_rows: list[dict[str, Any]]
    expected_metrics: dict[str, Any] = Field(default_factory=dict)
    required_checks: list[RequiredCodeCheck] = Field(default_factory=list)


class MultipleChoiceEvaluation(BaseModel):
    kind: Literal["multiple_choice"]
    correct_option: str


class FillBlankEvaluation(BaseModel):
    kind: Literal["fill_blank"]
    accepted_answers: list[list[str]]


class MicroCodeEvaluation(BaseModel):
    kind: Literal["micro_code"]
    accepted_patterns: list[str]
    accepted_regex: list[str] = Field(default_factory=list)


EvaluationSpec = Annotated[
    Union[
        GuidedPromptEvaluation,
        MultipleChoiceEvaluation,
        FillBlankEvaluation,
        MicroCodeEvaluation,
    ],
    Field(discriminator="kind"),
]


class QuestionSpec(BaseModel):
    id: str
    order: int
    type: QuestionType
    title: str
    display: QuestionDisplay
    strong_prompt_implications: list[str] = Field(default_factory=list)
    evaluation: EvaluationSpec


class ChallengeSpec(BaseModel):
    challenge_slug: str
    challenge_version: str
    title: str
    description: str
    source_markdown: str
    prompt_version: str
    evaluator_version: str
    dataset: DatasetSpec
    questions: list[QuestionSpec]


class HealthResponse(BaseModel):
    status: str
    challenge_count: int
    database_path: str


class DatasetSummaryResponse(BaseModel):
    slug: str
    version: str
    path: str
    row_count: int
    column_count: int
    creators_count: int
    date_range: dict[str, str]
    columns: list[ColumnSpec]


class DatasetPreviewResponse(BaseModel):
    dataset: DatasetSummaryResponse
    rows: list[dict[str, Any]]


class PublicQuestionResponse(BaseModel):
    id: str
    order: int
    type: QuestionType
    title: str
    display: QuestionDisplay


class ChallengeListItemResponse(BaseModel):
    challenge_slug: str
    challenge_version: str
    title: str
    description: str
    dataset_slug: str
    dataset_version: str
    question_count: int


class ChallengeDetailResponse(BaseModel):
    challenge_slug: str
    challenge_version: str
    title: str
    description: str
    prompt_version: str
    evaluator_version: str
    dataset: DatasetSummaryResponse
    question_count: int


class AttemptCreateRequest(BaseModel):
    session_id: str
    prompt_text: Optional[str] = None
    selected_option: Optional[str] = None
    blanks: Optional[list[str]] = None
    code_text: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def normalize_session_id(cls, value: str) -> str:
        session_id = value.strip()
        if not session_id:
            raise ValueError("session_id is required")
        return session_id


class AttemptResponse(BaseModel):
    id: str
    session_id: str
    question_id: str
    question_type: QuestionType
    status: AttemptStatus
    challenge_slug: str
    challenge_version: str
    dataset_slug: str
    dataset_version: str
    prompt_version: str
    model: str
    evaluator_version: str
    user_input_payload: dict[str, Any]
    generated_code: Optional[str] = None
    evaluation_payload: Optional[dict[str, Any]] = None
    is_correct: Optional[bool] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class SessionChallengeSummaryResponse(BaseModel):
    session_id: str
    challenge_slug: str
    challenge_version: str
    total_questions: int
    attempted_questions: int
    correct_questions: int
    remaining_questions: int
    incorrect_questions: int
    pending_questions: int
    skipped_questions: int
    retry_questions: int
    total_attempts: int
    accuracy_percent: int
    completion_percent: int
