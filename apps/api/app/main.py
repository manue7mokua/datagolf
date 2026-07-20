from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .attempts_repo import AttemptsRepository
from .attempts_service import AttemptsService
from .challenge_registry import ChallengeRegistry
from .config import get_settings
from .dataset_loader import DatasetLoader
from .evaluator import Evaluator
from .llm_service import LLMService
from .schemas import (
    AttemptCreateRequest,
    AttemptResponse,
    ChallengeDetailResponse,
    ChallengeListItemResponse,
    DatasetPreviewResponse,
    DatasetSummaryResponse,
    HealthResponse,
    PublicQuestionResponse,
)


class AppContainer:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.challenge_registry = ChallengeRegistry(self.settings.challenge_specs_root)
        self.dataset_loader = DatasetLoader(self.settings.repo_root)
        self.attempts_repo = AttemptsRepository(self.settings.database_path)
        self.evaluator = Evaluator()
        self.llm_service = LLMService(self.settings)
        self.attempts_service = AttemptsService(
            challenge_registry=self.challenge_registry,
            dataset_loader=self.dataset_loader,
            llm_service=self.llm_service,
            evaluator=self.evaluator,
            attempts_repo=self.attempts_repo,
        )


container = AppContainer()


@asynccontextmanager
async def lifespan(_: FastAPI):
    container.attempts_repo.initialize()
    container.challenge_registry.reload()
    yield


app = FastAPI(title="Datagolf API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        challenge_count=len(container.challenge_registry.list_challenges()),
        database_path=str(container.settings.database_path),
    )


@app.get("/challenges", response_model=list[ChallengeListItemResponse])
def list_challenges() -> list[ChallengeListItemResponse]:
    return [
        ChallengeListItemResponse(
            challenge_slug=challenge.challenge_slug,
            challenge_version=challenge.challenge_version,
            title=challenge.title,
            description=challenge.description,
            dataset_slug=challenge.dataset.slug,
            dataset_version=challenge.dataset.version,
            question_count=len(challenge.questions),
        )
        for challenge in container.challenge_registry.list_challenges()
    ]


@app.get("/datasets/{slug}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(slug: str, limit: int = 20) -> DatasetPreviewResponse:
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 100")

    try:
        challenge = container.challenge_registry.get_dataset_challenge(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    dataframe = container.dataset_loader.load(challenge.dataset.path)
    preview_rows = dataframe.head(limit).where(dataframe.notna(), None).to_dict(
        orient="records"
    )

    return DatasetPreviewResponse(
        dataset=DatasetSummaryResponse.model_validate(challenge.dataset.model_dump()),
        rows=preview_rows,
    )


@app.get("/challenges/{slug}", response_model=ChallengeDetailResponse)
def get_challenge(slug: str) -> ChallengeDetailResponse:
    try:
        challenge = container.challenge_registry.get_challenge(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ChallengeDetailResponse(
        challenge_slug=challenge.challenge_slug,
        challenge_version=challenge.challenge_version,
        title=challenge.title,
        description=challenge.description,
        prompt_version=challenge.prompt_version,
        evaluator_version=challenge.evaluator_version,
        dataset=DatasetSummaryResponse.model_validate(challenge.dataset.model_dump()),
        question_count=len(challenge.questions),
    )


@app.get("/challenges/{slug}/questions", response_model=list[PublicQuestionResponse])
def get_challenge_questions(slug: str) -> list[PublicQuestionResponse]:
    try:
        challenge = container.challenge_registry.get_challenge(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return [
        PublicQuestionResponse(
            id=question.id,
            order=question.order,
            type=question.type,
            title=question.title,
            display=question.display,
        )
        for question in challenge.questions
    ]


@app.post("/questions/{question_id}/attempts", response_model=AttemptResponse)
def create_attempt(question_id: str, payload: AttemptCreateRequest) -> AttemptResponse:
    try:
        attempt = container.attempts_service.run_attempt(question_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if attempt is None:
        raise HTTPException(status_code=500, detail="Attempt persistence failed")
    return AttemptResponse.model_validate(attempt)


@app.get("/attempts/{attempt_id}", response_model=AttemptResponse)
def get_attempt(attempt_id: str) -> AttemptResponse:
    attempt = container.attempts_service.get_attempt(attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail=f"Unknown attempt id: {attempt_id}")
    return AttemptResponse.model_validate(attempt)
