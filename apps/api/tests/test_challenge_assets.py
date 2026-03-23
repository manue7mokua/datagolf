from __future__ import annotations

import csv
import json
from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
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


if __name__ == "__main__":
    unittest.main()
