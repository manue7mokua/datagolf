from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.challenge_registry import ChallengeRegistry
from app.dataset_loader import DatasetLoader
from app.evaluator import Evaluator
from app.schemas import MicroCodeEvaluation, RequiredCodeCheck


class EvaluatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        registry = ChallengeRegistry(REPO_ROOT / "packages" / "challenges")
        cls.challenge = registry.get_challenge("tiktok-creator-posts")
        cls.questions = {question.id: question for question in cls.challenge.questions}
        cls.dataframe = DatasetLoader(REPO_ROOT).load(cls.challenge.dataset.path)
        cls.evaluator = Evaluator()

    def test_guided_prompt_matches_reference_and_required_code_checks(self) -> None:
        generated_code = """
        df %>%
          mutate(engagement_rate = (likes + comments + shares) / views) %>%
          filter(video_length_sec < 30) %>%
          arrange(desc(engagement_rate)) %>%
          slice_head(n = 5)
        """

        result = self.evaluator.evaluate_guided_prompt(
            self.questions["Q1"],
            generated_code,
            self.dataframe,
        )

        self.assertTrue(result["passed"])
        self.assertTrue(result["reference_matches_dataset"])
        self.assertEqual(len(result["authoritative_result"]), 5)
        self.assertTrue(
            all(check["passed"] for check in result["required_code_checks"])
        )

    def test_required_regex_checks_are_case_insensitive_and_dotall(self) -> None:
        check = RequiredCodeCheck(
            name="filter_then_slice",
            mode="regex_any",
            patterns=[r"filter\(.+slice_head"],
        )

        result = self.evaluator._run_required_check(
            check,
            "DF %>%\n  FILTER(video_length_sec < 30) %>%\n  slice_head(n = 5)",
        )

        self.assertTrue(result["passed"])

    def test_multiple_choice_accepts_correct_option_and_rejects_wrong_option(self) -> None:
        correct = self.evaluator.evaluate_multiple_choice(self.questions["Q8"], "B")
        wrong = self.evaluator.evaluate_multiple_choice(self.questions["Q8"], "A")

        self.assertTrue(correct["passed"])
        self.assertFalse(wrong["passed"])

    def test_fill_blank_scores_each_blank(self) -> None:
        correct = self.evaluator.evaluate_fill_blank(
            self.questions["Q9"],
            ["filter", "mean"],
        )
        wrong = self.evaluator.evaluate_fill_blank(
            self.questions["Q9"],
            ["select", "sum"],
        )

        self.assertTrue(correct["passed"])
        self.assertFalse(wrong["passed"])
        self.assertEqual(len(correct["per_blank_results"]), 2)

    def test_micro_code_uses_normalized_exact_patterns(self) -> None:
        correct = self.evaluator.evaluate_micro_code(
            self.questions["Q10"],
            "engagement_rate=(likes+comments+shares)/views",
        )
        wrong = self.evaluator.evaluate_micro_code(
            self.questions["Q10"],
            "engagement_rate = likes + comments + shares",
        )

        self.assertTrue(correct["passed"])
        self.assertFalse(wrong["passed"])

    def test_micro_code_accepts_fenced_r_snippets(self) -> None:
        result = self.evaluator.evaluate_micro_code(
            self.questions["Q10"],
            "```R\nengagement_rate = (likes + comments + shares) / views\n```",
        )

        self.assertTrue(result["passed"])

    def test_micro_code_regex_matches_normalized_submission(self) -> None:
        question = self.questions["Q10"].model_copy(
            update={
                "evaluation": MicroCodeEvaluation(
                    kind="micro_code",
                    accepted_patterns=[],
                    accepted_regex=[r"engagement_rate=\(.+\)/views"],
                )
            }
        )

        result = self.evaluator.evaluate_micro_code(
            question,
            "```R\nengagement_rate = (likes + comments + shares) / views\n```",
        )

        self.assertTrue(result["passed"])


if __name__ == "__main__":
    unittest.main()
