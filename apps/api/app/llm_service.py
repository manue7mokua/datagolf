from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any
from urllib import error, request

from .config import Settings
from .schemas import ChallengeSpec, GuidedPromptEvaluation, QuestionSpec


@dataclass
class GeneratedCode:
    code: str
    model: str
    provider: str


class LLMService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def generate_guided_prompt_code(
        self,
        challenge: ChallengeSpec,
        question: QuestionSpec,
        user_prompt: str,
    ) -> GeneratedCode:
        evaluation = question.evaluation
        if not isinstance(evaluation, GuidedPromptEvaluation):
            raise ValueError(f"Question {question.id} is not a guided prompt")

        prompt = self._build_prompt(challenge, question, user_prompt)

        if self.settings.openai_api_key:
            try:
                return GeneratedCode(
                    code=self._call_openai(prompt),
                    model=self.settings.openai_model,
                    provider="openai",
                )
            except Exception:
                if not self.settings.allow_template_fallback:
                    raise

        if not self.settings.allow_template_fallback:
            raise RuntimeError(
                "No OPENAI_API_KEY configured and template fallback is disabled."
            )

        return GeneratedCode(
            code=self._build_template_code(evaluation.operation),
            model="local-template-fallback",
            provider="template",
        )

    def _build_prompt(
        self,
        challenge: ChallengeSpec,
        question: QuestionSpec,
        user_prompt: str,
    ) -> str:
        hints = ", ".join(question.display.hint_chips)
        return (
            "Write concise R code using dplyr only. Return code only, with no prose.\n\n"
            f"Challenge: {challenge.title}\n"
            f"Question: {question.title}\n"
            f"Setup: {question.display.setup_text or 'N/A'}\n"
            f"Task: {question.display.task_text}\n"
            f"Hint chips: {hints}\n"
            f"Student prompt: {user_prompt}\n"
            "Use the dataset columns exactly as named in the challenge."
        )

    def _call_openai(self, prompt: str) -> str:
        payload = json.dumps(
            {
                "model": self.settings.openai_model,
                "input": prompt,
            }
        ).encode("utf-8")
        req = request.Request(
            "https://api.openai.com/v1/responses",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                body = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"OpenAI request failed: {detail}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"OpenAI request failed: {exc.reason}") from exc

        output_text = body.get("output_text", "").strip()
        if not output_text:
            raise RuntimeError("OpenAI response did not contain output_text")
        return output_text

    def _build_template_code(self, operation: str) -> str:
        templates: dict[str, str] = {
            "q1_short_video_engagement": """library(dplyr)

posts %>%
  mutate(engagement_rate = (likes + comments + shares) / views) %>%
  filter(video_length_sec < 30) %>%
  arrange(desc(engagement_rate)) %>%
  select(post_id, creator_handle, engagement_rate) %>%
  slice_head(n = 5)""",
            "q2_large_creator_format_views": """library(dplyr)

posts %>%
  filter(followers_at_post >= 100000) %>%
  group_by(content_format) %>%
  summarise(avg_views = mean(views), .groups = "drop") %>%
  arrange(desc(avg_views))""",
            "q3_long_video_completion_by_category": """library(dplyr)

posts %>%
  filter(video_length_sec > 35) %>%
  group_by(creator_category) %>%
  summarise(avg_completion_rate_pct = mean(completion_rate_pct), .groups = "drop") %>%
  arrange(desc(avg_completion_rate_pct))""",
            "q4_creators_above_dataset_engagement": """library(dplyr)

posts %>%
  mutate(engagement_rate = (likes + comments + shares) / views) %>%
  {
    dataset_avg_engagement <- mean(.$engagement_rate)

    group_by(., creator_handle) %>%
      summarise(avg_engagement_rate = mean(engagement_rate), .groups = "drop") %>%
      filter(avg_engagement_rate > dataset_avg_engagement) %>%
      arrange(desc(avg_engagement_rate)) %>%
      slice_head(n = 5)
  }""",
            "q5_overperforming_posts_vs_creator_average": """library(dplyr)

posts %>%
  group_by(creator_handle) %>%
  mutate(
    creator_avg_views = mean(views),
    views_above_creator_avg = views - creator_avg_views
  ) %>%
  ungroup() %>%
  arrange(desc(views_above_creator_avg)) %>%
  select(post_id, creator_handle, views_above_creator_avg) %>%
  slice_head(n = 10)""",
            "q6_hour_bucket_average_shares": """library(dplyr)

posts %>%
  mutate(
    hour_bucket = case_when(
      post_hour >= 5 & post_hour <= 11 ~ "morning",
      post_hour >= 12 & post_hour <= 16 ~ "afternoon",
      post_hour >= 17 & post_hour <= 21 ~ "evening",
      TRUE ~ "late_night"
    )
  ) %>%
  group_by(hour_bucket) %>%
  summarise(avg_shares = mean(shares), .groups = "drop") %>%
  arrange(desc(avg_shares))""",
            "q7_latest_post_completion_lift": """library(dplyr)

posts %>%
  arrange(creator_handle, post_date) %>%
  group_by(creator_handle) %>%
  mutate(prev_completion_rate_pct = lag(completion_rate_pct)) %>%
  slice_tail(n = 1) %>%
  filter(completion_rate_pct > prev_completion_rate_pct) %>%
  mutate(completion_lift = completion_rate_pct - prev_completion_rate_pct) %>%
  arrange(desc(completion_lift)) %>%
  select(
    creator_handle,
    latest_completion_rate_pct = completion_rate_pct,
    prev_completion_rate_pct,
    completion_lift
  )""",
        }
        try:
            return templates[operation]
        except KeyError as exc:
            raise ValueError(f"No template code found for operation: {operation}") from exc
