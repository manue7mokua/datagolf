# datagolf.dev MVP — TikTok Creator Posts Challenge

This file contains the full question set for **Challenge 1** using the synthetic dataset `datagolf_tiktok_posts_500.csv`.

## Dataset summary

- **Rows:** 500 posts
- **Columns:** 15
- **Creators:** 25
- **Date range:** 2025-09-01 to 2025-11-09

## Column dictionary

| Column | Type | Description |
|---|---|---|
| `post_id` | character | Unique post ID |
| `creator_handle` | character | TikTok creator username |
| `creator_category` | character | Main creator niche (`beauty`, `gaming`, `food`, `fitness`, `studytok`, `comedy`, `fashion`) |
| `followers_at_post` | integer | Followers at the time of posting |
| `post_date` | date | Post date |
| `post_hour` | integer | Hour of day posted (0–23) |
| `content_format` | character | Post style (`tutorial`, `challenge`, `vlog`, `review`, etc.) |
| `video_length_sec` | integer | Video length in seconds |
| `hashtag_count` | integer | Number of hashtags used in caption |
| `views` | integer | Total views |
| `likes` | integer | Total likes |
| `comments` | integer | Total comments |
| `shares` | integer | Total shares |
| `avg_watch_time_sec` | numeric | Average watch time in seconds |
| `completion_rate_pct` | numeric | Percent of viewers who watched to the end |

---

# Part A — Guided prompt challenges (7)

These are the main **prompt-writing** questions.  
The student should write a prompt that nudges the model toward the right R pipeline without fully spelling out the solution.

Each card can show:
- a short setup line
- the task
- **hint chips**
- token count after generation
- result after running code

---

## Q1. Short videos with unusually high engagement

**Type:** Guided prompt

**Student sees**

Some short TikToks punch above their weight.

Find the **top 5 posts** with the highest **engagement rate** among videos shorter than **30 seconds**.

**Hint chips to display**
- `mutate`
- `filter`
- `arrange`
- `desc`
- `head`

**What a strong prompt should imply**
- Create engagement rate as `(likes + comments + shares) / views`
- Keep only rows where `video_length_sec < 30`
- Sort from highest to lowest engagement rate
- Return the top 5 posts

**Reference answer (for backend/demo checks)**

| post_id | creator_handle | engagement_rate |
|---|---|---:|
| TT0423 | vibewithvic | 0.122899 |
| TT0414 | urbanuma | 0.121625 |
| TT0406 | urbanuma | 0.116608 |
| TT0428 | vibewithvic | 0.115949 |
| TT0407 | urbanuma | 0.111015 |

---

## Q2. Which format wins with bigger creators?

**Type:** Guided prompt

**Student sees**

For creators with a bigger audience, not every format performs the same.

Compare **average views by `content_format`** for posts where `followers_at_post` is at least **100000**.  
Return the formats ranked from highest to lowest average views.

**Hint chips to display**
- `filter`
- `group_by`
- `summarise`
- `mean`
- `arrange`

**What a strong prompt should imply**
- Filter to larger creators
- Group by `content_format`
- Compute average views
- Sort descending

**Reference answer (top results)**

| content_format | avg_views |
|---|---:|
| duet | 133871.7 |
| listicle | 124562.0 |
| skit | 123510.8 |
| storytime | 122757.3 |
| tutorial | 121126.3 |

---

## Q3. Longer videos: who keeps attention best?

**Type:** Guided prompt

**Student sees**

Longer videos are harder to finish.

For videos longer than **35 seconds**, find the `creator_category` with the highest **average completion rate**.

**Hint chips to display**
- `filter`
- `group_by`
- `summarise`
- `mean`
- `arrange`

**What a strong prompt should imply**
- Filter to long videos
- Group by `creator_category`
- Average `completion_rate_pct`
- Sort descending

**Reference answer (top results)**

| creator_category | avg_completion_rate_pct |
|---|---:|
| comedy | 63.61 |
| fitness | 63.56 |
| beauty | 62.29 |

---

## Q4. Creators beating the dataset average

**Type:** Guided prompt

**Student sees**

Some creators are consistently stronger than the dataset as a whole.

Find creators whose **average engagement rate** is **above the dataset-wide average engagement rate**.  
Return the **top 5 creators** by average engagement rate.

**Hint chips to display**
- `mutate`
- `group_by`
- `summarise`
- `mean`
- `filter`

**What a strong prompt should imply**
- Create engagement rate per post
- Compute the dataset-wide mean engagement rate
- Compute creator-level average engagement rate
- Keep only creators above the dataset average
- Sort descending and return top 5

**Reference answer**

- Dataset-wide average engagement rate: **0.073854**
- Number of creators above that average: **11**

| creator_handle | avg_engagement_rate |
|---|---:|
| urbanuma | 0.097570 |
| vibewithvic | 0.095137 |
| hypewithhari | 0.089652 |
| rayreviews | 0.078723 |
| yara.yaps | 0.078311 |

---

## Q5. Posts that overperformed relative to the creator's norm

**Type:** Guided prompt

**Student sees**

A post can look good overall, but the real signal is whether it beat that creator’s usual baseline.

For each post, calculate how far its `views` are above that creator’s **average views**.  
Return the **top 10 overperforming posts**.

**Hint chips to display**
- `group_by`
- `mutate`
- `mean`
- `arrange`
- `desc`

**What a strong prompt should imply**
- Group by `creator_handle`
- Compute each creator's average views
- Create a new difference column
- Sort descending
- Return the top 10

**Reference answer (top 5)**

| post_id | creator_handle | views_above_creator_avg |
|---|---|---:|
| TT0166 | islasnaps | 274881.3 |
| TT0226 | learnwithlena | 211158.1 |
| TT0230 | learnwithlena | 202715.1 |
| TT0155 | hypewithhari | 148939.8 |
| TT0031 | bytewithben | 138465.4 |

---

## Q6. Best time bucket for shares

**Type:** Guided prompt

**Student sees**

Posting time matters, but “time” is easier to interpret in buckets than raw hours.

Create an `hour_bucket` using:
- `morning` = 5 to 11
- `afternoon` = 12 to 16
- `evening` = 17 to 21
- `late_night` = everything else

Then find which bucket has the **highest average shares per post**.

**Hint chips to display**
- `mutate`
- `case_when`
- `group_by`
- `summarise`
- `mean`

**What a strong prompt should imply**
- Build a bucketed time column
- Group by the new bucket
- Compute average shares
- Sort descending

**Reference answer**

| hour_bucket | avg_shares |
|---|---:|
| evening | 419.5 |
| late_night | 376.5 |
| afternoon | 347.5 |
| morning | 249.7 |

---

## Q7. Did the latest post improve on the previous one?

**Type:** Guided prompt

**Student sees**

One useful creator question is whether their latest post actually improved.

Within each creator, sort posts by `post_date`.  
Compare the **latest post's** `completion_rate_pct` to the **previous post**.  
Return creators whose latest post has a **higher** completion rate than the previous one, ranked by the size of the improvement.

**Hint chips to display**
- `arrange`
- `group_by`
- `lag`
- `filter`
- `slice_tail`

**What a strong prompt should imply**
- Sort posts by creator and date
- Use `lag()` to get the previous completion rate
- Keep only the most recent row per creator
- Compare latest vs previous
- Sort by improvement descending

**Reference answer (top 5)**

| creator_handle | latest_completion_rate_pct | prev_completion_rate_pct | completion_lift |
|---|---:|---:|---:|
| quinnfitness | 91.5 | 57.4 | 34.1 |
| islasnaps | 74.0 | 44.6 | 29.4 |
| jamieplays | 81.2 | 60.3 | 20.9 |
| pixelwithpaz | 79.2 | 59.1 | 20.1 |
| anaedits | 72.6 | 55.2 | 17.4 |

---

# Part B — Syntax sprint (8)

These are quick questions for confidence, recall, and precise R habits.

You can show these as:
- multiple choice
- fill in the blank
- micro-code

---

## Q8. Sort highest views first

**Type:** Multiple choice

**Student sees**

Which dplyr line correctly sorts the dataset from highest to lowest `views`?

A. `sort(views)`  
B. `arrange(desc(views))`  
C. `filter(desc(views))`  
D. `select(views, desc)`

**Answer:** **B**

---

## Q9. Fill in the gaps: filter + mean

**Type:** Fill in the blank

**Student sees**

Fill in the missing pieces:

```r
df %>%
  ______(views > 100000) %>%
  summarise(avg_likes = ______(likes))
```

**Answer**
- Blank 1: `filter`
- Blank 2: `mean`

---

## Q10. Micro-code: build engagement rate

**Type:** Micro-code

**Student sees**

Inside a `mutate()` call, write the shortest clear expression to create a new column called `engagement_rate` using likes, comments, shares, and views.

**Accepted answer**
```r
engagement_rate = (likes + comments + shares) / views
```

---

## Q11. The pipe operator

**Type:** Multiple choice

**Student sees**

Which operator passes the result of one step into the next step in a dplyr pipeline?

A. `<-`  
B. `::`  
C. `%>%`  
D. `==`

**Answer:** **C**

---

## Q12. Fill in the gaps: grouped summary

**Type:** Fill in the blank

**Student sees**

Complete the grouped summary:

```r
df %>%
  group_by(content_format) %>%
  summarise(
    posts = n(),
    avg_completion = ______(completion_rate_pct)
  ) %>%
  arrange(______)
```

**Answer**
- Blank 1: `mean`
- Blank 2: `desc(avg_completion)`

---

## Q13. Micro-code: evening posts only

**Type:** Micro-code

**Student sees**

Write only the condition you would place inside `filter()` to keep posts made at **6 PM or later**.

**Accepted answer**
```r
post_hour >= 18
```

---

## Q14. Fill in the gap: previous views

**Type:** Fill in the blank

**Student sees**

Complete the missing column reference:

```r
df %>%
  arrange(creator_handle, post_date) %>%
  group_by(creator_handle) %>%
  mutate(prev_views = lag(______ ))
```

**Answer:** `views`

---

## Q15. Micro-code: keep only 3 columns

**Type:** Micro-code

**Student sees**

Write the dplyr step that keeps only these columns:

- `post_id`
- `creator_handle`
- `views`

**Accepted answer**
```r
select(post_id, creator_handle, views)
```

---

# Suggested MVP scoring rules

## Guided prompt questions
- Correct result: pass/fail
- Token count of user prompt: lower is better
- Optional: small bonus if generated code contains the hinted idea cleanly

## Syntax sprint questions
- Multiple choice: exact match
- Fill in the blank: exact match or accepted alias
- Micro-code: regex or normalized string match

---

# Notes for implementation

- The dataset is synthetic but shaped to look like realistic TikTok post analytics.
- The fields were chosen to support beginner-friendly R analysis patterns:
  - `filter()`
  - `group_by()`
  - `summarise()`
  - `mutate()`
  - `arrange()`
  - `lag()`
  - `case_when()`
- A simple MVP backend can store:
  - question ID
  - question type
  - hint chips
  - reference answer
  - token count
  - output match status
