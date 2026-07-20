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


if __name__ == "__main__":
    unittest.main()
