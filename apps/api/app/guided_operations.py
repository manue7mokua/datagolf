from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class GuidedOperationResult:
    frame: object
    metrics: dict[str, Any] = field(default_factory=dict)


def run_guided_operation(operation: str, dataframe) -> GuidedOperationResult:
    handlers = {
        "q1_short_video_engagement": _q1_short_video_engagement,
        "q2_large_creator_format_views": _q2_large_creator_format_views,
        "q3_long_video_completion_by_category": _q3_long_video_completion_by_category,
        "q4_creators_above_dataset_engagement": _q4_creators_above_dataset_engagement,
        "q5_overperforming_posts_vs_creator_average": _q5_overperforming_posts_vs_creator_average,
        "q6_hour_bucket_average_shares": _q6_hour_bucket_average_shares,
        "q7_latest_post_completion_lift": _q7_latest_post_completion_lift,
    }
    try:
        return handlers[operation](dataframe.copy())
    except KeyError as exc:
        raise ValueError(f"Unsupported guided prompt operation: {operation}") from exc


def dataframe_to_records(dataframe, round_decimals: int) -> list[dict[str, Any]]:
    numeric_columns = list(dataframe.select_dtypes(include="number").columns)
    export_frame = dataframe.copy()
    if numeric_columns:
        export_frame[numeric_columns] = export_frame[numeric_columns].round(round_decimals)

    records: list[dict[str, Any]] = []
    for record in export_frame.to_dict(orient="records"):
        normalized: dict[str, Any] = {}
        for key, value in record.items():
            if hasattr(value, "item"):
                value = value.item()
            if isinstance(value, float):
                value = round(value, round_decimals)
            normalized[key] = value
        records.append(normalized)
    return records


def _q1_short_video_engagement(dataframe) -> GuidedOperationResult:
    result = (
        dataframe.assign(
            engagement_rate=(
                (dataframe["likes"] + dataframe["comments"] + dataframe["shares"])
                / dataframe["views"]
            )
        )
        .loc[lambda df: df["video_length_sec"] < 30, ["post_id", "creator_handle", "engagement_rate"]]
        .sort_values("engagement_rate", ascending=False)
        .head(5)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=result)


def _q2_large_creator_format_views(dataframe) -> GuidedOperationResult:
    result = (
        dataframe.loc[dataframe["followers_at_post"] >= 100000]
        .groupby("content_format", as_index=False)["views"]
        .mean()
        .rename(columns={"views": "avg_views"})
        .sort_values("avg_views", ascending=False)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=result)


def _q3_long_video_completion_by_category(dataframe) -> GuidedOperationResult:
    result = (
        dataframe.loc[dataframe["video_length_sec"] > 35]
        .groupby("creator_category", as_index=False)["completion_rate_pct"]
        .mean()
        .rename(columns={"completion_rate_pct": "avg_completion_rate_pct"})
        .sort_values("avg_completion_rate_pct", ascending=False)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=result)


def _q4_creators_above_dataset_engagement(dataframe) -> GuidedOperationResult:
    enriched = dataframe.assign(
        engagement_rate=(
            (dataframe["likes"] + dataframe["comments"] + dataframe["shares"])
            / dataframe["views"]
        )
    )
    dataset_average = enriched["engagement_rate"].mean()
    creator_averages = (
        enriched.groupby("creator_handle", as_index=False)["engagement_rate"]
        .mean()
        .rename(columns={"engagement_rate": "avg_engagement_rate"})
    )
    filtered = (
        creator_averages.loc[creator_averages["avg_engagement_rate"] > dataset_average]
        .sort_values("avg_engagement_rate", ascending=False)
        .head(5)
        .reset_index(drop=True)
    )
    metrics = {
        "dataset_average_engagement_rate": float(dataset_average),
        "creators_above_average_count": int(
            (creator_averages["avg_engagement_rate"] > dataset_average).sum()
        ),
    }
    return GuidedOperationResult(frame=filtered, metrics=metrics)


def _q5_overperforming_posts_vs_creator_average(dataframe) -> GuidedOperationResult:
    result = (
        dataframe.assign(
            creator_avg_views=dataframe.groupby("creator_handle")["views"].transform("mean")
        )
        .assign(
            views_above_creator_avg=lambda df: df["views"] - df["creator_avg_views"]
        )
        .loc[:, ["post_id", "creator_handle", "views_above_creator_avg"]]
        .sort_values("views_above_creator_avg", ascending=False)
        .head(10)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=result)


def _q6_hour_bucket_average_shares(dataframe) -> GuidedOperationResult:
    result = dataframe.copy()
    result["hour_bucket"] = "late_night"
    result.loc[(result["post_hour"] >= 5) & (result["post_hour"] <= 11), "hour_bucket"] = "morning"
    result.loc[(result["post_hour"] >= 12) & (result["post_hour"] <= 16), "hour_bucket"] = "afternoon"
    result.loc[(result["post_hour"] >= 17) & (result["post_hour"] <= 21), "hour_bucket"] = "evening"

    grouped = (
        result.groupby("hour_bucket", as_index=False)["shares"]
        .mean()
        .rename(columns={"shares": "avg_shares"})
        .sort_values("avg_shares", ascending=False)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=grouped)


def _q7_latest_post_completion_lift(dataframe) -> GuidedOperationResult:
    ordered = dataframe.sort_values(["creator_handle", "post_date"]).copy()
    ordered["prev_completion_rate_pct"] = ordered.groupby("creator_handle")[
        "completion_rate_pct"
    ].shift(1)

    latest = ordered.groupby("creator_handle").tail(1).copy()
    latest = latest.dropna(subset=["prev_completion_rate_pct"])
    latest = latest.loc[
        latest["completion_rate_pct"] > latest["prev_completion_rate_pct"]
    ].copy()
    latest["completion_lift"] = (
        latest["completion_rate_pct"] - latest["prev_completion_rate_pct"]
    )

    result = (
        latest.loc[
            :,
            ["creator_handle", "completion_rate_pct", "prev_completion_rate_pct", "completion_lift"],
        ]
        .rename(columns={"completion_rate_pct": "latest_completion_rate_pct"})
        .sort_values("completion_lift", ascending=False)
        .reset_index(drop=True)
    )
    return GuidedOperationResult(frame=result)
