from __future__ import annotations

import csv
import json
from pathlib import Path
import re
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.challenge_registry import ChallengeRegistry

SPEC_PATH = REPO_ROOT / "packages" / "challenges" / "tiktok" / "v1" / "spec.json"
DATASET_PATH = (
    REPO_ROOT
    / "data"
    / "challenge-datasets"
    / "tiktok-posts"
    / "v1"
    / "datagolf_tiktok_posts_500.csv"
)


class ChallengeAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with SPEC_PATH.open("r", encoding="utf-8") as handle:
            cls.spec = json.load(handle)
        cls.registry = ChallengeRegistry(REPO_ROOT / "packages" / "challenges")

    def test_dataset_shape_matches_runtime_asset(self) -> None:
        with DATASET_PATH.open("r", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            rows = list(reader)

        self.assertEqual(len(rows) - 1, 500)
        self.assertEqual(len(rows[0]), 15)
        self.assertEqual(self.spec["dataset"]["row_count"], 500)
        self.assertEqual(self.spec["dataset"]["column_count"], 15)

    def test_all_fifteen_questions_are_present(self) -> None:
        questions = self.spec["questions"]
        self.assertEqual(len(questions), 15)
        self.assertEqual([question["id"] for question in questions], [f"Q{i}" for i in range(1, 16)])

    def test_question_type_distribution_matches_source_doc(self) -> None:
        counts: dict[str, int] = {}
        for question in self.spec["questions"]:
            counts[question["type"]] = counts.get(question["type"], 0) + 1

        self.assertEqual(
            counts,
            {
                "guided_prompt": 7,
                "multiple_choice": 2,
                "fill_blank": 3,
                "micro_code": 3,
            },
        )

    def test_guided_prompt_reference_rows_are_structured(self) -> None:
        guided_questions = [
            question for question in self.spec["questions"] if question["type"] == "guided_prompt"
        ]

        for question in guided_questions:
            evaluation = question["evaluation"]
            self.assertIsInstance(evaluation["expected_rows"], list)
            self.assertGreater(len(evaluation["expected_rows"]), 0)
            self.assertIsInstance(evaluation["required_checks"], list)
            self.assertGreater(len(evaluation["required_checks"]), 0)

    def test_micro_code_questions_define_accepted_answers(self) -> None:
        micro_code_questions = [
            question for question in self.spec["questions"] if question["type"] == "micro_code"
        ]

        for question in micro_code_questions:
            evaluation = question["evaluation"]
            accepted_patterns = evaluation.get("accepted_patterns", [])
            accepted_regex = evaluation.get("accepted_regex", [])
            accepted_answers = [*accepted_patterns, *accepted_regex]

            self.assertTrue(
                any(answer.strip() for answer in accepted_answers),
                f"{question['id']} must define an accepted micro-code answer",
            )

    def test_micro_code_regex_answers_compile(self) -> None:
        micro_code_questions = [
            question for question in self.spec["questions"] if question["type"] == "micro_code"
        ]

        for question in micro_code_questions:
            accepted_regex = question["evaluation"].get("accepted_regex", [])
            for pattern in accepted_regex:
                if not pattern.strip():
                    continue
                with self.subTest(question_id=question["id"], pattern=pattern):
                    re.compile(pattern)

    def test_fill_blank_questions_define_accepted_answers(self) -> None:
        fill_blank_questions = [
            question for question in self.spec["questions"] if question["type"] == "fill_blank"
        ]

        for question in fill_blank_questions:
            accepted_answers = question["evaluation"]["accepted_answers"]
            self.assertGreater(
                len(accepted_answers),
                0,
                f"{question['id']} must define accepted blank answers",
            )

            for index, answer_group in enumerate(accepted_answers, start=1):
                self.assertGreater(
                    len(answer_group),
                    0,
                    f"{question['id']} blank {index} must define accepted answers",
                )
                self.assertTrue(
                    any(answer.strip() for answer in answer_group),
                    f"{question['id']} blank {index} must define a non-empty accepted answer",
                )

    def test_multiple_choice_questions_define_valid_choices(self) -> None:
        multiple_choice_questions = [
            question for question in self.spec["questions"] if question["type"] == "multiple_choice"
        ]

        for question in multiple_choice_questions:
            choices = question["display"].get("choices", [])
            choice_ids = {choice["id"] for choice in choices}
            correct_option = question["evaluation"]["correct_option"]

            self.assertGreater(len(choice_ids), 0, f"{question['id']} must define choices")
            self.assertIn(
                correct_option,
                choice_ids,
                f"{question['id']} correct option must match a defined choice",
            )

    def test_dataset_slug_resolves_to_challenge(self) -> None:
        challenge = self.registry.get_dataset_challenge("tiktok-posts")

        self.assertEqual(challenge.challenge_slug, "tiktok-creator-posts")
        self.assertEqual(challenge.dataset.slug, "tiktok-posts")

    def test_unknown_dataset_slug_raises_key_error(self) -> None:
        with self.assertRaises(KeyError):
            self.registry.get_dataset_challenge("missing-dataset")


if __name__ == "__main__":
    unittest.main()
