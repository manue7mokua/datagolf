from __future__ import annotations

import json
from pathlib import Path

from .schemas import ChallengeSpec, QuestionSpec


class ChallengeRegistry:
    def __init__(self, specs_root: Path) -> None:
        self.specs_root = specs_root
        self._challenges: dict[str, ChallengeSpec] = {}
        self._questions: dict[str, tuple[ChallengeSpec, QuestionSpec]] = {}
        self.reload()

    def reload(self) -> None:
        challenges: dict[str, ChallengeSpec] = {}
        questions: dict[str, tuple[ChallengeSpec, QuestionSpec]] = {}

        for spec_path in sorted(self.specs_root.glob("*/*/spec.json")):
            with spec_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            challenge = ChallengeSpec.model_validate(payload)
            challenges[challenge.challenge_slug] = challenge

            for question in challenge.questions:
                if question.id in questions:
                    raise ValueError(f"Duplicate question id detected: {question.id}")
                questions[question.id] = (challenge, question)

        self._challenges = challenges
        self._questions = questions

    def list_challenges(self) -> list[ChallengeSpec]:
        return list(self._challenges.values())

    def get_challenge(self, slug: str) -> ChallengeSpec:
        try:
            return self._challenges[slug]
        except KeyError as exc:
            raise KeyError(f"Unknown challenge slug: {slug}") from exc

    def get_question(self, question_id: str) -> tuple[ChallengeSpec, QuestionSpec]:
        try:
            return self._questions[question_id]
        except KeyError as exc:
            raise KeyError(f"Unknown question id: {question_id}") from exc
