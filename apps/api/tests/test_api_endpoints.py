from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile
import unittest

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))


class ApiEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if TestClient is None:
            raise unittest.SkipTest("FastAPI test dependencies are not installed")

        cls.tempdir = tempfile.TemporaryDirectory()
        os.environ["DATAGOLF_DATABASE_PATH"] = str(
            Path(cls.tempdir.name) / "datagolf-test.sqlite3"
        )

        from app.main import app

        cls.client_context = TestClient(app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client_context.__exit__(None, None, None)
        cls.tempdir.cleanup()
        os.environ.pop("DATAGOLF_DATABASE_PATH", None)

    def test_health_reports_loaded_challenges(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertGreaterEqual(payload["challenge_count"], 1)

    def test_challenge_list_returns_catalog_safe_fields(self) -> None:
        response = self.client.get("/challenges")

        self.assertEqual(response.status_code, 200)
        challenges = response.json()
        self.assertGreaterEqual(len(challenges), 1)
        first_challenge = challenges[0]
        self.assertEqual(first_challenge["challenge_slug"], "tiktok-creator-posts")
        self.assertEqual(first_challenge["question_count"], 15)
        self.assertIn("dataset_slug", first_challenge)
        self.assertNotIn("questions", first_challenge)

    def test_challenge_detail_returns_dataset_summary(self) -> None:
        response = self.client.get("/challenges/tiktok-creator-posts")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["challenge_slug"], "tiktok-creator-posts")
        self.assertEqual(payload["question_count"], 15)
        self.assertEqual(payload["dataset"]["row_count"], 500)

    def test_challenge_questions_are_public_safe(self) -> None:
        response = self.client.get("/challenges/tiktok-creator-posts/questions")

        self.assertEqual(response.status_code, 200)
        questions = response.json()
        self.assertEqual(len(questions), 15)
        self.assertEqual(questions[0]["id"], "Q1")
        self.assertNotIn("evaluation", questions[0])

    def test_dataset_preview_returns_limited_rows(self) -> None:
        response = self.client.get("/datasets/tiktok-posts/preview?limit=3")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["dataset"]["slug"], "tiktok-posts")
        self.assertEqual(len(payload["rows"]), 3)
        self.assertIn("post_id", payload["rows"][0])

    def test_dataset_preview_rejects_oversized_limits(self) -> None:
        response = self.client.get("/datasets/tiktok-posts/preview?limit=101")

        self.assertEqual(response.status_code, 422)

    def test_multiple_choice_attempt_can_be_created_and_retrieved(self) -> None:
        create_response = self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": "endpoint-test-session", "selected_option": "B"},
        )

        self.assertEqual(create_response.status_code, 200)
        created = create_response.json()
        self.assertEqual(created["question_id"], "Q8")
        self.assertEqual(created["status"], "completed")
        self.assertTrue(created["is_correct"])

        get_response = self.client.get(f"/attempts/{created['id']}")

        self.assertEqual(get_response.status_code, 200)
        fetched = get_response.json()
        self.assertEqual(fetched["id"], created["id"])
        self.assertEqual(fetched["evaluation_payload"]["expected_option"], "B")

    def test_multiple_choice_attempt_rejects_unknown_option(self) -> None:
        response = self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": "endpoint-test-session", "selected_option": "Z"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn("selected_option must be one of", response.json()["detail"])

    def test_fill_blank_attempt_can_be_created(self) -> None:
        response = self.client.post(
            "/questions/Q9/attempts",
            json={
                "session_id": "endpoint-test-session",
                "blanks": ["filter", "mean"],
            },
        )

        self.assertEqual(response.status_code, 200)
        created = response.json()
        self.assertEqual(created["question_id"], "Q9")
        self.assertEqual(created["status"], "completed")
        self.assertTrue(created["is_correct"])
        self.assertEqual(len(created["evaluation_payload"]["per_blank_results"]), 2)

    def test_fill_blank_attempt_rejects_wrong_blank_count(self) -> None:
        response = self.client.post(
            "/questions/Q9/attempts",
            json={"session_id": "endpoint-test-session", "blanks": ["filter"]},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "expected 2 blanks for fill-in-the-blank attempts",
        )

    def test_session_attempts_returns_attempt_history(self) -> None:
        session_id = "endpoint-history-session"
        self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": session_id, "selected_option": "B"},
        )
        self.client.post(
            "/questions/Q11/attempts",
            json={"session_id": session_id, "selected_option": "C"},
        )

        response = self.client.get(
            f"/sessions/{session_id}/attempts?challenge_slug=tiktok-creator-posts&limit=10"
        )

        self.assertEqual(response.status_code, 200)
        attempts = response.json()
        self.assertEqual([attempt["question_id"] for attempt in attempts], ["Q8", "Q11"])
        self.assertTrue(all(attempt["is_correct"] for attempt in attempts))

    def test_session_challenge_summary_returns_progress_counts(self) -> None:
        session_id = "endpoint-summary-session"
        incorrect_response = self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": session_id, "selected_option": "A"},
        )
        correct_response = self.client.post(
            "/questions/Q11/attempts",
            json={"session_id": session_id, "selected_option": "C"},
        )

        self.assertEqual(incorrect_response.status_code, 200)
        self.assertEqual(correct_response.status_code, 200)

        response = self.client.get(
            f"/sessions/{session_id}/challenges/tiktok-creator-posts/summary"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["session_id"], session_id)
        self.assertEqual(payload["challenge_slug"], "tiktok-creator-posts")
        self.assertEqual(payload["total_questions"], 15)
        self.assertEqual(payload["attempted_questions"], 2)
        self.assertEqual(payload["correct_questions"], 1)
        self.assertEqual(payload["remaining_questions"], 14)
        self.assertEqual(payload["incorrect_questions"], 1)
        self.assertEqual(payload["pending_questions"], 0)
        self.assertEqual(payload["skipped_questions"], 13)
        self.assertEqual(payload["retry_questions"], 0)
        self.assertEqual(payload["total_attempts"], 2)
        self.assertEqual(payload["completion_percent"], 7)

    def test_session_challenge_summary_counts_retried_question_once(self) -> None:
        session_id = "endpoint-summary-retry-session"
        incorrect_response = self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": session_id, "selected_option": "A"},
        )
        correct_response = self.client.post(
            "/questions/Q8/attempts",
            json={"session_id": session_id, "selected_option": "B"},
        )

        self.assertEqual(incorrect_response.status_code, 200)
        self.assertEqual(correct_response.status_code, 200)

        response = self.client.get(
            f"/sessions/{session_id}/challenges/tiktok-creator-posts/summary"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["attempted_questions"], 1)
        self.assertEqual(payload["correct_questions"], 1)
        self.assertEqual(payload["remaining_questions"], 14)
        self.assertEqual(payload["incorrect_questions"], 0)
        self.assertEqual(payload["skipped_questions"], 14)
        self.assertEqual(payload["retry_questions"], 1)
        self.assertEqual(payload["total_attempts"], 2)
        self.assertEqual(payload["completion_percent"], 7)

    def test_session_challenge_summary_rejects_unknown_challenge(self) -> None:
        response = self.client.get(
            "/sessions/endpoint-summary-session/challenges/unknown/summary"
        )

        self.assertEqual(response.status_code, 404)

    def test_session_attempts_rejects_oversized_limits(self) -> None:
        response = self.client.get("/sessions/any-session/attempts?limit=501")

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
