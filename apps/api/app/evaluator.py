from __future__ import annotations

import re
from typing import Any

from .guided_operations import dataframe_to_records, run_guided_operation
from .normalizers import normalize_code, normalize_token
from .schemas import (
    FillBlankEvaluation,
    GuidedPromptEvaluation,
    MicroCodeEvaluation,
    MultipleChoiceEvaluation,
    QuestionSpec,
    RequiredCodeCheck,
)


class Evaluator:
    def evaluate_guided_prompt(
        self,
        question: QuestionSpec,
        generated_code: str,
        dataframe,
    ) -> dict[str, Any]:
        evaluation = self._expect_guided(question)
        authoritative = run_guided_operation(evaluation.operation, dataframe)
        authoritative_rows = dataframe_to_records(authoritative.frame, evaluation.round_decimals)
        preview_rows = authoritative_rows[: len(evaluation.expected_rows)]
        reference_rows = self._normalize_rows(evaluation.expected_rows, evaluation.round_decimals)
        code_checks = [
            self._run_required_check(check, generated_code) for check in evaluation.required_checks
        ]

        passed = preview_rows == reference_rows and all(
            check["passed"] for check in code_checks
        )

        return {
            "passed": passed,
            "mode": "heuristic_intent_plus_authoritative_result",
            "executed_code": False,
            "message": (
                "Generated R-style code was not executed. Datagolf compared the pandas-derived "
                "authoritative result to the encoded reference preview and ran heuristic checks "
                "against the generated code."
            ),
            "reference_matches_dataset": preview_rows == reference_rows,
            "reference_result_preview": reference_rows,
            "authoritative_result": authoritative_rows,
            "authoritative_metrics": self._normalize_metrics(
                authoritative.metrics, evaluation.round_decimals
            ),
            "expected_metrics": self._normalize_metrics(
                evaluation.expected_metrics, evaluation.round_decimals
            ),
            "required_code_checks": code_checks,
        }

    def evaluate_multiple_choice(
        self, question: QuestionSpec, selected_option: str
    ) -> dict[str, Any]:
        evaluation = self._expect_multiple_choice(question)
        normalized = normalize_token(selected_option)
        correct = normalize_token(evaluation.correct_option)
        passed = normalized == correct
        return {
            "passed": passed,
            "expected_option": evaluation.correct_option,
            "received_option": selected_option,
        }

    def evaluate_fill_blank(
        self, question: QuestionSpec, blanks: list[str]
    ) -> dict[str, Any]:
        evaluation = self._expect_fill_blank(question)
        normalized_blanks = [normalize_token(blank) for blank in blanks]
        per_blank_results = []

        for index, accepted_group in enumerate(evaluation.accepted_answers):
            accepted_normalized = [normalize_token(value) for value in accepted_group]
            actual_value = normalized_blanks[index] if index < len(normalized_blanks) else None
            per_blank_results.append(
                {
                    "blank_index": index,
                    "accepted": accepted_group,
                    "received": blanks[index] if index < len(blanks) else None,
                    "passed": actual_value in accepted_normalized,
                }
            )

        passed = len(blanks) == len(evaluation.accepted_answers) and all(
            result["passed"] for result in per_blank_results
        )
        return {"passed": passed, "per_blank_results": per_blank_results}

    def evaluate_micro_code(self, question: QuestionSpec, code_text: str) -> dict[str, Any]:
        evaluation = self._expect_micro_code(question)
        normalized = normalize_code(code_text)
        accepted_patterns = [normalize_code(pattern) for pattern in evaluation.accepted_patterns]
        regex_matches = [bool(re.search(pattern, code_text, flags=re.IGNORECASE)) for pattern in evaluation.accepted_regex]
        passed = normalized in accepted_patterns or any(regex_matches)
        return {
            "passed": passed,
            "normalized_submission": normalized,
            "accepted_patterns": evaluation.accepted_patterns,
            "accepted_regex": evaluation.accepted_regex,
        }

    def _run_required_check(
        self, check: RequiredCodeCheck, generated_code: str
    ) -> dict[str, Any]:
        lowered = generated_code.lower()
        if check.mode == "contains_all":
            passed = all(pattern.lower() in lowered for pattern in check.patterns)
        elif check.mode == "contains_any":
            passed = any(pattern.lower() in lowered for pattern in check.patterns)
        elif check.mode == "regex_all":
            passed = all(
                re.search(pattern, generated_code, flags=re.IGNORECASE | re.DOTALL)
                for pattern in check.patterns
            )
        elif check.mode == "regex_any":
            passed = any(
                re.search(pattern, generated_code, flags=re.IGNORECASE | re.DOTALL)
                for pattern in check.patterns
            )
        else:
            raise ValueError(f"Unsupported required check mode: {check.mode}")

        return {
            "name": check.name,
            "description": check.description,
            "passed": bool(passed),
            "mode": check.mode,
            "patterns": check.patterns,
        }

    def _normalize_rows(
        self, rows: list[dict[str, Any]], round_decimals: int
    ) -> list[dict[str, Any]]:
        normalized_rows: list[dict[str, Any]] = []
        for row in rows:
            normalized_row: dict[str, Any] = {}
            for key, value in row.items():
                if isinstance(value, float):
                    normalized_row[key] = round(value, round_decimals)
                else:
                    normalized_row[key] = value
            normalized_rows.append(normalized_row)
        return normalized_rows

    def _normalize_metrics(
        self, metrics: dict[str, Any], round_decimals: int
    ) -> dict[str, Any]:
        normalized: dict[str, Any] = {}
        for key, value in metrics.items():
            if isinstance(value, float):
                normalized[key] = round(value, round_decimals)
            else:
                normalized[key] = value
        return normalized

    def _expect_guided(self, question: QuestionSpec) -> GuidedPromptEvaluation:
        evaluation = question.evaluation
        if not isinstance(evaluation, GuidedPromptEvaluation):
            raise ValueError(f"Question {question.id} is not a guided prompt")
        return evaluation

    def _expect_multiple_choice(self, question: QuestionSpec) -> MultipleChoiceEvaluation:
        evaluation = question.evaluation
        if not isinstance(evaluation, MultipleChoiceEvaluation):
            raise ValueError(f"Question {question.id} is not multiple choice")
        return evaluation

    def _expect_fill_blank(self, question: QuestionSpec) -> FillBlankEvaluation:
        evaluation = question.evaluation
        if not isinstance(evaluation, FillBlankEvaluation):
            raise ValueError(f"Question {question.id} is not fill-in-the-blank")
        return evaluation

    def _expect_micro_code(self, question: QuestionSpec) -> MicroCodeEvaluation:
        evaluation = question.evaluation
        if not isinstance(evaluation, MicroCodeEvaluation):
            raise ValueError(f"Question {question.id} is not micro-code")
        return evaluation
