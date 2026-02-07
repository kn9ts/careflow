# CareFlow Analytics Catalog - Comprehensive Specification

## Document Overview

This document provides a complete, structured catalog of all analytics and metrics for the CareFlow platform dashboard. Each metric includes:

- Data points to capture
- Calculation formulas
- Time intervals
- Visualization methods
- Drill-down capabilities
- Alert thresholds

---

## Table of Contents

1. [Call Analytics](#1-call-analytics)
2. [User Engagement Metrics](#2-user-engagement-metrics)
3. [System Health Indicators](#3-system-health-indicators)
4. [Financial and Billing Analytics](#4-financial-and-billing-analytics)
5. [Security and Compliance Metrics](#5-security-and-compliance-metrics)
6. [Administrative Insights](#6-administrative-insights)

---

## 1. Call Analytics

### 1.1 Call Volume Metrics

#### 1.1.1 Total Call Count

| Attribute          | Specification                                                      |
| ------------------ | ------------------------------------------------------------------ |
| **Data Points**    | Unique call IDs, timestamps, direction, status                     |
| **Calculation**    | COUNT(DISTINCT call_id) WHERE timestamp BETWEEN start AND end      |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly, Quarterly, Yearly                  |
| **Visualization**  | Line chart (trend), Counter widget, Area chart (stacked)           |
| **Drill-down**     | Click → Filter by date range → Breakdown by direction/status       |
| **Thresholds**     | Warning: < 10% of weekly average; Critical: < 5% of weekly average |

#### 1.1.2 Inbound Call Volume

| Attribute          | Specification                                               |
| ------------------ | ----------------------------------------------------------- |
| **Data Points**    | Source number, destination CareFlow ID, timestamp, duration |
| **Calculation**    | COUNT(\*) WHERE direction = 'INBOUND'                       |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly                              |
| **Visualization**  | Stacked bar chart (by source type: PSTN/Mobile/CareFlow)    |
| **Drill-down**     | Click → View specific calls from that period                |
| **Thresholds**     | Warning: > 200% of average; Critical: > 300% of average     |

#### 1.1.3 Outbound Call Volume

| Attribute          | Specification                                               |
| ------------------ | ----------------------------------------------------------- |
| **Data Points**    | Source CareFlow ID, destination number, timestamp, duration |
| **Calculation**    | COUNT(\*) WHERE direction = 'OUTBOUND'                      |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly                              |
| **Visualization**  | Line chart with target line, Heatmap (by hour)              |
| **Drill-down**     | Click → Filter by caller → View call history                |
| **Thresholds**     | Warning: > 200% of average; Critical: > 300% of average     |

#### 1.1.4 Peak Call Hour Analysis

| Attribute          | Specification                                                |
| ------------------ | ------------------------------------------------------------ |
| **Data Points**    | Hour of day (0-23), call count, average duration             |
| **Calculation**    | GROUP BY HOUR(timestamp), COUNT(\*)                          |
| **Time Intervals** | Daily, Weekly (aggregate), Monthly (aggregate)               |
| **Visualization**  | 24-hour heatmap, Bar chart sorted by volume                  |
| **Drill-down**     | Click hour → View calls from that hour                       |
| **Thresholds**     | Alert: Hour with > 50% of daily volume sustained for 3+ days |

#### 1.1.5 Peak Call Day Analysis

| Attribute          | Specification                                    |
| ------------------ | ------------------------------------------------ |
| **Data Points**    | Day of week, date, call count, total duration    |
| **Calculation**    | GROUP BY DAYNAME(timestamp), COUNT(\*)           |
| **Time Intervals** | Weekly, Monthly, Quarterly                       |
| **Visualization**  | Day-of-week bar chart, Calendar heatmap          |
| **Drill-down**     | Click day → View calls from that day             |
| **Thresholds**     | Warning: Day deviation > 30% from weekly average |

---

### 1.2 Call Duration Metrics

#### 1.2.1 Average Call Duration (ACD)

| Attribute          | Specification                                          |
| ------------------ | ------------------------------------------------------ |
| **Data Points**    | Call start time, answer time, end time, total duration |
| **Calculation**    | AVG(end_time - answer_time) IN SECONDS                 |
| **Time Intervals** | Real-time (5-min), Hourly, Daily, Weekly, Monthly      |
| **Visualization**  | Line chart with moving average, Gauge chart            |
| **Drill-down**     | Click → View distribution histogram, outliers          |
| **Thresholds**     | Warning: < 60 seconds; Critical: < 30 seconds          |
| **Benchmark**      | Industry average: 3-5 minutes for business calls       |

#### 1.2.2 Median Call Duration

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Duration of all calls in period                       |
| **Calculation**    | PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) |
| **Time Intervals** | Daily, Weekly, Monthly                                |
| **Visualization**  | Box plot comparison, Line chart                       |
| **Drill-down**     | Click → View call samples at median                   |
| **Thresholds**     | Significant deviation from mode (> 2x)                |

#### 1.2.3 Total Talk Time

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | Sum of all connected call durations                 |
| **Calculation**    | SUM(end_time - answer_time)                         |
| **Time Intervals** | Daily, Weekly, Monthly, Yearly                      |
| **Visualization**  | Area chart (cumulative), Big number counter         |
| **Drill-down**     | Click → Breakdown by user/team                      |
| **Thresholds**     | Warning: < 50% of target; Critical: < 25% of target |

#### 1.2.4 Call Duration Distribution

| Attribute          | Specification                                                 |
| ------------------ | ------------------------------------------------------------- |
| **Data Points**    | Buckets: < 1min, 1-5min, 5-15min, 15-30min, 30-60min, > 60min |
| **Calculation**    | COUNT(\*) GROUP BY duration_bucket                            |
| **Time Intervals** | Daily, Weekly, Monthly                                        |
| **Visualization**  | Stacked bar chart, Pie chart, Histogram                       |
| **Drill-down**     | Click bucket → View calls in that range                       |
| **Thresholds**     | Alert: > 40% calls < 1min (potential quality issue)           |

#### 1.2.5 Longest Call Duration

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Maximum duration, caller/callee, timestamp     |
| **Calculation**    | MAX(duration)                                  |
| **Time Intervals** | Daily, Weekly, Monthly                         |
| **Visualization**  | Leaderboard table, Timeline marker             |
| **Drill-down**     | Click → View call details, recording if exists |
| **Thresholds**     | Alert: > 4 hours (potential anomaly)           |

---

### 1.3 Call Type Analytics

#### 1.3.1 Call Type Breakdown

| Attribute          | Specification                                             |
| ------------------ | --------------------------------------------------------- |
| **Data Points**    | Categories: Voice, Video, Conference, Callback, Voicemail |
| **Calculation**    | COUNT(\*) GROUP BY call_type                              |
| **Time Intervals** | Real-time, Daily, Weekly, Monthly                         |
| **Visualization**  | Stacked bar (trend), Donut chart (distribution)           |
| **Drill-down**     | Click type → Filter all metrics by type                   |
| **Thresholds**     | Alert: Any type > 90% of total (usage concentration)      |

#### 1.3.2 CareFlow-to-CareFlow vs PSTN Ratio

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | Internal calls (CareFlow-CareFlow), External (PSTN) |
| **Calculation**    | COUNT(internal) / COUNT(external) ratio             |
| **Time Intervals** | Daily, Weekly, Monthly                              |
| **Visualization**  | Ratio line chart, Split bar chart                   |
| **Drill-down**     | Click → View internal vs external call lists        |
| **Thresholds**     | Warning: Ratio < 0.1 (too many external calls)      |

#### 1.3.3 Conference Call Metrics

| Attribute          | Specification                                           |
| ------------------ | ------------------------------------------------------- |
| **Data Points**    | Conference ID, participants, duration, max participants |
| **Calculation**    | AVG(participants), COUNT(conferences)                   |
| **Time Intervals** | Daily, Weekly, Monthly                                  |
| **Visualization**  | Multi-line chart (participants over time), Table        |
| **Drill-down**     | Click conference → View participants, recording         |
| **Thresholds**     | Warning: < 2 participants avg; Critical: No conferences |

#### 1.3.4 Voicemail Analytics

| Attribute          | Specification                                                        |
| ------------------ | -------------------------------------------------------------------- |
| **Data Points**    | Voicemail count, duration, listened status, response rate            |
| **Calculation**    | COUNT(voicemail), AVG(listen_time), COUNT(response)/COUNT(voicemail) |
| **Time Intervals** | Daily, Weekly, Monthly                                               |
| **Visualization**  | Funnel chart (sent → listened → responded), Trend line               |
| **Drill-down**     | Click → View voicemail recordings                                    |
| **Thresholds**     | Warning: Listen rate < 50%; Critical: Listen rate < 25%              |

---

### 1.4 Call Success Rates

#### 1.4.1 Overall Success Rate

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Completed calls / Total attempts                      |
| **Calculation**    | (COUNT(status='COMPLETED') / COUNT(_)) _ 100          |
| **Time Intervals** | Real-time (5-min), Hourly, Daily, Weekly, Monthly     |
| **Visualization**  | Gauge chart (0-100%), Trend line with threshold bands |
| **Drill-down**     | Click → Breakdown by failure reason                   |
| **Thresholds**     | Target: > 95%; Warning: < 90%; Critical: < 80%        |

#### 1.4.2 Failure Reason Breakdown

| Attribute          | Specification                                                     |
| ------------------ | ----------------------------------------------------------------- |
| **Data Points**    | Categories: Busy, No Answer, Network Error, Server Error, Blocked |
| **Calculation**    | COUNT(\*) GROUP BY failure_reason                                 |
| **Time Intervals** | Real-time, Daily, Weekly                                          |
| **Visualization**  | Pareto chart, Stacked bar (trend)                                 |
| **Drill-down**     | Click reason → View specific failed calls                         |
| **Thresholds**     | Alert: Any single reason > 15% of failures                        |

#### 1.4.3 Dropped Call Rate

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Calls disconnected before completion (not by user) |
| **Calculation**    | COUNT(status='DROPPED') / COUNT(_) _ 100           |
| **Time Intervals** | Real-time, Hourly, Daily                           |
| **Visualization**  | Line chart (red), Control chart                    |
| **Drill-down**     | Click → View dropped call timestamps, durations    |
| **Thresholds**     | Target: < 1%; Warning: > 2%; Critical: > 5%        |

#### 1.4.4 Connection Success Rate

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Calls that connected (answered) / Total attempted |
| **Calculation**    | COUNT(status='ANSWERED') / COUNT(_) _ 100         |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly                    |
| **Visualization**  | Area chart (trend), Funnel                        |
| **Drill-down**     | Click → Compare by user, time, direction          |
| **Thresholds**     | Target: > 85%; Warning: < 70%; Critical: < 50%    |

---

### 1.5 Call Quality Metrics

#### 1.5.1 Mean Opinion Score (MOS)

| Attribute          | Specification                                    |
| ------------------ | ------------------------------------------------ |
| **Data Points**    | User ratings (1-5), automatic quality assessment |
| **Calculation**    | AVG(rating), AVG(auto_score)                     |
| **Time Intervals** | Real-time (per-call), Hourly, Daily, Weekly      |
| **Visualization**  | Line chart, Distribution histogram, Heatmap      |
| **Drill-down**     | Click → View calls with low scores               |
| **Thresholds**     | Target: > 4.0; Warning: < 3.5; Critical: < 3.0   |

#### 1.5.2 Network Latency

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Round-trip time (ms), jitter, packet loss %                |
| **Calculation**    | AVG(latency_ms), AVG(jitter_ms), AVG(packet_loss%)         |
| **Time Intervals** | Real-time (1-min), Hourly, Daily                           |
| **Visualization**  | Line chart (multi-axis), Control chart                     |
| **Drill-down**     | Click → View calls with high latency                       |
| **Thresholds**     | Latency: < 150ms (good), > 300ms (poor); Packet loss: > 1% |

#### 1.5.3 Call Clarity Score

| Attribute          | Specification                                                      |
| ------------------ | ------------------------------------------------------------------ |
| **Data Points**    | Composite score: latency + jitter + packet loss + user rating      |
| **Calculation**    | Weighted average: 0.3*latency + 0.2*jitter + 0.2*loss + 0.3*rating |
| **Time Intervals** | Per-call, Hourly, Daily                                            |
| **Visualization**  | Gauge chart, Trend line                                            |
| **Drill-down**     | Click → Breakdown by component                                     |
| **Thresholds**     | Target: > 80; Warning: < 60; Critical: < 40                        |

#### 1.5.4 Audio Quality Distribution

| Attribute          | Specification                             |
| ------------------ | ----------------------------------------- |
| **Data Points**    | Buckets: Excellent, Good, Fair, Poor, Bad |
| **Calculation**    | COUNT(\*) GROUP BY quality_bucket         |
| **Time Intervals** | Daily, Weekly, Monthly                    |
| **Visualization**  | Horizontal bar chart, Waterfall chart     |
| **Drill-down**     | Click bucket → View affected calls        |
| **Thresholds**     | Warning: > 20% Poor/Bad combined          |

---

### 1.6 Geographic Distribution

#### 1.6.1 Calls by Country

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Country code, call count, duration, direction              |
| **Calculation**    | COUNT(\*) GROUP BY country_code                            |
| **Time Intervals** | Daily, Weekly, Monthly                                     |
| **Visualization**  | Choropleth map, Table with flags                           |
| **Drill-down**     | Click country → View city breakdown, specific calls        |
| **Thresholds**     | Alert: > 50% calls from single country (outlier detection) |

#### 1.6.2 Calls by Time Zone

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Time zone offset, call count, user locations |
| **Calculation**    | COUNT(\*) GROUP BY timezone                  |
| **Time Intervals** | Daily, Weekly                                |
| **Visualization**  | World clock view, Bar chart                  |
| **Drill-down**     | Click timezone → View users in that zone     |
| **Thresholds**     | Alert: > 3-hour offset peak activity         |

#### 1.6.3 International vs Domestic Ratio

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Domestic calls, International calls             |
| **Calculation**    | COUNT(domestic) / COUNT(international)          |
| **Time Intervals** | Weekly, Monthly                                 |
| **Visualization**  | Ratio chart, Pie chart                          |
| **Drill-down**     | Click → Breakdown by country                    |
| **Thresholds**     | Warning: > 80% international (cost implication) |

---

## 2. User Engagement Metrics

### 2.1 Active Users

#### 2.1.1 Daily Active Users (DAU)

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Unique user IDs with at least one action per day  |
| **Calculation**    | COUNT(DISTINCT user_id) WHERE date = current_date |
| **Time Intervals** | Daily (primary), Hourly (for patterns)            |
| **Visualization**  | Line chart (trend), Counter widget                |
| **Drill-down**     | Click → View active user list, session details    |
| **Thresholds**     | Warning: < 50% of DAU/MAU ratio; Critical: < 30%  |

#### 2.1.2 Weekly Active Users (WAU)

| Attribute          | Specification                                           |
| ------------------ | ------------------------------------------------------- |
| **Data Points**    | Unique users active in last 7 days                      |
| **Calculation**    | COUNT(DISTINCT user_id) WHERE last_active >= 7 days ago |
| **Time Intervals** | Weekly (primary), Daily (trend)                         |
| **Visualization**  | Line chart (compared to DAU), Stacked area              |
| **Drill-down**     | Click → View weekly cohort analysis                     |
| **Thresholds**     | Warning: < 20% weekly growth decline                    |

#### 2.1.3 Monthly Active Users (MAU)

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Unique users active in last 30 days                        |
| **Calculation**    | COUNT(DISTINCT user_id) WHERE last_active >= 30 days ago   |
| **Time Intervals** | Monthly (primary), Weekly (trend)                          |
| **Visualization**  | Line chart, Funnel (registration → activation → retention) |
| **Drill-down**     | Click → View monthly cohort retention                      |
| **Thresholds**     | Warning: < 10% monthly growth; Critical: Negative growth   |

#### 2.1.4 DAU/MAU Ratio (Stickiness)

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | DAU divided by MAU                             |
| **Calculation**    | DAU / MAU \* 100                               |
| **Time Intervals** | Daily, Weekly rolling                          |
| **Visualization**  | Line chart with target, Gauge                  |
| **Drill-down**     | Click → Breakdown by user segment              |
| **Thresholds**     | Target: > 20%; Warning: < 15%; Critical: < 10% |
| **Benchmark**      | Consumer apps: 20-30%; Enterprise: 40-60%      |

---

### 2.2 Session Metrics

#### 2.2.1 Average Session Duration

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | Session start time, session end time, activities    |
| **Calculation**    | AVG(session_end - session_start) IN MINUTES         |
| **Time Intervals** | Hourly, Daily, Weekly                               |
| **Visualization**  | Line chart, Histogram (session length distribution) |
| **Drill-down**     | Click → View session samples                        |
| **Thresholds**     | Warning: < 2 minutes; Critical: < 1 minute          |

#### 2.2.2 Sessions per User

| Attribute          | Specification                                          |
| ------------------ | ------------------------------------------------------ |
| **Data Points**    | Total sessions, unique users                           |
| **Calculation**    | COUNT(session_id) / COUNT(DISTINCT user_id)            |
| **Time Intervals** | Daily, Weekly, Monthly                                 |
| **Visualization**  | Bar chart, Box plot                                    |
| **Drill-down**     | Click → View user session history                      |
| **Thresholds**     | Warning: < 1 session/day; Critical: < 0.5 sessions/day |

#### 2.2.3 Session Frequency Distribution

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Buckets: 1x, 2-5x, 6-10x, 10-20x, 20+x per week |
| **Calculation**    | COUNT(\*) GROUP BY frequency_bucket             |
| **Time Intervals** | Weekly, Monthly                                 |
| **Visualization**  | Stacked bar chart, Cohort analysis heatmap      |
| **Drill-down**     | Click bucket → View users in cohort             |
| **Thresholds**     | Warning: > 50% in 1x bucket                     |

#### 2.2.4 Time to First Action

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Login time, first action time, action type    |
| **Calculation**    | AVG(first_action_time - login_time)           |
| **Time Intervals** | Real-time, Daily                              |
| **Visualization**  | Histogram, Trend line                         |
| **Drill-down**     | Click → View first actions breakdown          |
| **Thresholds**     | Warning: > 30 seconds; Critical: > 60 seconds |

---

### 2.3 Feature Usage

#### 2.3.1 Dial Pad Usage

| Attribute          | Specification                                             |
| ------------------ | --------------------------------------------------------- |
| **Data Points**    | Number pad interactions, numbers entered, calls initiated |
| **Calculation**    | COUNT(dial_events), COUNT(placed_calls)                   |
| **Time Intervals** | Hourly, Daily, Weekly                                     |
| **Visualization**  | Line chart, Funnel (open → enter → call)                  |
| **Drill-down**     | Click → View dial pad sessions                            |
| **Thresholds**     | Warning: Usage decline > 20% week-over-week               |

#### 2.3.2 Contact List Usage

| Attribute          | Specification                                            |
| ------------------ | -------------------------------------------------------- |
| **Data Points**    | Contact list opens, searches, selections                 |
| **Calculation**    | COUNT(contact_opens), COUNT(searches), COUNT(selections) |
| **Time Intervals** | Daily, Weekly                                            |
| **Visualization**  | Stacked bar (feature breakdown), Trend                   |
| **Drill-down**     | Click → View popular contacts                            |
| **Thresholds**     | Warning: > 80% direct dial (contact list underutilized)  |

#### 2.3.3 Call History Usage

| Attribute          | Specification                                           |
| ------------------ | ------------------------------------------------------- |
| **Data Points**    | History page views, call backs, exports                 |
| **Calculation**    | COUNT(history_views), COUNT(call_backs), COUNT(exports) |
| **Time Intervals** | Daily, Weekly                                           |
| **Visualization**  | Bar chart, Line trend                                   |
| **Drill-down**     | Click → View history access patterns                    |
| **Thresholds**     | Warning: History view decline > 30%                     |

#### 2.3.4 Recording Playback

| Attribute          | Specification                                                          |
| ------------------ | ---------------------------------------------------------------------- |
| **Data Points**    | Recordings available, played, completion rate                          |
| **Calculation**    | COUNT(recordings), COUNT(plays), AVG(play_duration/recording_duration) |
| **Time Intervals** | Daily, Weekly, Monthly                                                 |
| **Visualization**  | Funnel chart, Line chart                                               |
| **Drill-down**     | Click → View playback analytics                                        |
| **Thresholds**     | Warning: Completion rate < 70%                                         |

#### 2.3.5 Feature Adoption Matrix

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Feature list, unique users per feature          |
| **Calculation**    | COUNT(DISTINCT user_id) GROUP BY feature        |
| **Time Intervals** | Monthly                                         |
| **Visualization**  | Heatmap matrix, Adoption curve                  |
| **Drill-down**     | Click feature → View non-adopters               |
| **Thresholds**     | Alert: Any feature adoption < 10% after 30 days |

---

### 2.4 Login Frequency

#### 2.4.1 Login Count

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Login events, unique users                   |
| **Calculation**    | COUNT(login_events), COUNT(DISTINCT user_id) |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly               |
| **Visualization**  | Line chart, Area chart                       |
| **Drill-down**     | Click → View login details                   |
| **Thresholds**     | Warning: > 50% of logins from top 10% users  |

#### 2.4.2 Login Time Distribution

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Login timestamp, user timezone                             |
| **Calculation**    | COUNT(\*) GROUP BY HOUR(login_time)                        |
| **Time Intervals** | Daily, Weekly                                              |
| **Visualization**  | 24-hour heatmap, Polar chart                               |
| **Drill-down**     | Click hour → View logins from that time                    |
| **Thresholds**     | Alert: > 50% logins outside business hours (if applicable) |

#### 2.4.3 Login Failure Rate

| Attribute          | Specification                                           |
| ------------------ | ------------------------------------------------------- |
| **Data Points**    | Failed login attempts, success login                    |
| **Calculation**    | COUNT(failed) / (COUNT(success) + COUNT(failed)) \* 100 |
| **Time Intervals** | Real-time, Hourly, Daily                                |
| **Visualization**  | Line chart, Gauge                                       |
| **Drill-down**     | Click → View failed login details                       |
| **Thresholds**     | Warning: > 10%; Critical: > 30%                         |

---

### 2.5 Response Times

#### 2.5.1 Call Answer Time

| Attribute          | Specification                                                       |
| ------------------ | ------------------------------------------------------------------- |
| **Data Points**    | Ring start time, answer time, caller ID                             |
| **Calculation**    | AVG(answer_time - ring_start_time) IN SECONDS                       |
| **Time Intervals** | Real-time, Hourly, Daily                                            |
| **Visualization**  | Line chart, Histogram                                               |
| **Drill-down**     | Click → View slow answer cases                                      |
| **Thresholds**     | Target: < 10 seconds; Warning: > 20 seconds; Critical: > 30 seconds |

#### 2.5.2 Callback Response Time

| Attribute          | Specification                                                  |
| ------------------ | -------------------------------------------------------------- |
| **Data Points**    | Missed call time, callback time, caller ID                     |
| **Calculation**    | AVG(callback_time - missed_call_time)                          |
| **Time Intervals** | Daily, Weekly                                                  |
| **Visualization**  | Distribution chart, Trend line                                 |
| **Drill-down**     | Click → View callback details                                  |
| **Thresholds**     | Target: < 30 minutes; Warning: > 2 hours; Critical: > 24 hours |

#### 2.5.3 Voicemail Response Rate

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Voicemails received, voicemails responded to  |
| **Calculation**    | COUNT(response) / COUNT(voicemail) \* 100     |
| **Time Intervals** | Daily, Weekly, Monthly                        |
| **Visualization**  | Funnel chart, Trend line                      |
| **Drill-down**     | Click → View voicemail response details       |
| **Thresholds**     | Target: > 50% within 24 hours; Warning: < 25% |

---

### 2.6 Abandonment Rates

#### 2.6.1 Call Abandonment Rate

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | Calls hung up before answer, total inbound calls    |
| **Calculation**    | COUNT(hangup_before_answer) / COUNT(inbound) \* 100 |
| **Time Intervals** | Hourly, Daily, Weekly                               |
| **Visualization**  | Line chart with threshold bands, Control chart      |
| **Drill-down**     | Click → View abandoned call timestamps              |
| **Thresholds**     | Target: < 5%; Warning: > 10%; Critical: > 20%       |

#### 2.6.2 Call Abandonment by Duration

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Hangup time, ring duration before hangup              |
| **Calculation**    | AVG(ring_duration) GROUP BY hangup_bucket             |
| **Time Intervals** | Daily, Weekly                                         |
| **Visualization**  | Histogram, Bar chart                                  |
| **Drill-down**     | Click bucket → View specific cases                    |
| **Thresholds**     | Alert: > 50% abandon within 5 seconds (quick abandon) |

#### 2.6.3 Queue Abandonment (if applicable)

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Queue position, wait time, hangup               |
| **Calculation**    | COUNT(queue_hangup) / COUNT(queue_enter) \* 100 |
| **Time Intervals** | Hourly, Daily                                   |
| **Visualization**  | Funnel, Line chart                              |
| **Drill-down**     | Click → View queue details                      |
| **Thresholds**     | Target: < 10%; Warning: > 20%; Critical: > 30%  |

---

## 3. System Health Indicators

### 3.1 Server Metrics

#### 3.1.1 CPU Utilization

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | CPU usage percentage per core, process breakdown    |
| **Calculation**    | AVG(cpu_percent) OVER time window                   |
| **Time Intervals** | Real-time (10-sec), 1-min average, Hourly, Daily    |
| **Visualization**  | Line chart (multi-core), Area chart, Gauge          |
| **Drill-down**     | Click → View process breakdown, historical patterns |
| **Thresholds**     | Target: < 60%; Warning: > 75%; Critical: > 90%      |
| **Benchmark**      | Sustained > 80% for 10+ minutes needs investigation |

#### 3.1.2 Memory Utilization

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Used memory, free memory, swap usage, cache    |
| **Calculation**    | (used / total) \* 100, swap_usage_percent      |
| **Time Intervals** | Real-time (10-sec), 1-min average, Hourly      |
| **Visualization**  | Stacked area (memory types), Line chart        |
| **Drill-down**     | Click → View memory by process                 |
| **Thresholds**     | Target: < 70%; Warning: > 80%; Critical: > 95% |
| **Benchmark**      | Swap usage > 10% indicates memory pressure     |

#### 3.1.3 Disk Usage

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Total disk, used disk, available disk, I/O ops  |
| **Calculation**    | (used / total) \* 100, read_io, write_io        |
| **Time Intervals** | 5-min, Hourly, Daily                            |
| **Visualization**  | Gauge chart (per partition), Line chart (trend) |
| **Drill-down**     | Click → View directory/file breakdown           |
| **Thresholds**     | Target: < 70%; Warning: > 80%; Critical: > 90%  |

#### 3.1.4 Load Average

| Attribute          | Specification                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Data Points**    | 1-min, 5-min, 15-min load averages                                                  |
| **Calculation**    | System load / number of CPUs                                                        |
| **Time Intervals** | Real-time, 5-min average                                                            |
| **Visualization**  | Multi-line chart (three metrics), Control chart                                     |
| **Drill-down**     | Click → View process load breakdown                                                 |
| **Thresholds**     | Target: < 0.7 _ CPU count; Warning: > 1.0 _ CPU count; Critical: > 2.0 \* CPU count |

---

### 3.2 Uptime Metrics

#### 3.2.1 Overall Uptime

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Total time, downtime duration, incident count         |
| **Calculation**    | (uptime / total_time) \* 100                          |
| **Time Intervals** | Real-time status, Daily, Weekly, Monthly, Yearly      |
| **Visualization**  | Uptime percentage widget, Timeline (incidents), Gauge |
| **Drill-down**     | Click → View incident details, root cause             |
| **Thresholds**     | Target: > 99.9%; SLA: 99.5% minimum                   |
| **SLA**            | 99.9% = max 43.2 min downtime/month                   |

#### 3.2.2 Service-Specific Uptime

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Each service: API, Auth, Database, SIP, Storage |
| **Calculation**    | Service uptime percentage                       |
| **Time Intervals** | Daily, Weekly                                   |
| **Visualization**  | Service status grid, Availability timeline      |
| **Drill-down**     | Click service → View service-specific metrics   |
| **Thresholds**     | Target: > 99.9% per service; Critical: < 99%    |

#### 3.2.3 Mean Time Between Failures (MTBF)

| Attribute          | Specification                                               |
| ------------------ | ----------------------------------------------------------- |
| **Data Points**    | Time between consecutive failures                           |
| **Calculation**    | AVG(time_between_failures)                                  |
| **Time Intervals** | Weekly, Monthly                                             |
| **Visualization**  | Trend line, Control chart                                   |
| **Drill-down**     | Click → View failure patterns                               |
| **Thresholds**     | Target: > 24 hours; Warning: < 12 hours; Critical: < 1 hour |

#### 3.2.4 Mean Time to Recovery (MTTR)

| Attribute          | Specification                                                  |
| ------------------ | -------------------------------------------------------------- |
| **Data Points**    | Failure detection time, recovery start time, recovery end time |
| **Calculation**    | AVG(recovery_end - failure_start)                              |
| **Time Intervals** | Per incident, Weekly average                                   |
| **Visualization**  | Bar chart (by severity), Trend line                            |
| **Drill-down**     | Click → View incident timeline                                 |
| **Thresholds**     | Target: < 15 min; Warning: > 30 min; Critical: > 1 hour        |

---

### 3.3 Error Rates

#### 3.3.1 HTTP Error Rate

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Total requests, 4xx errors, 5xx errors         |
| **Calculation**    | (4xx + 5xx) / total_requests \* 100            |
| **Time Intervals** | Real-time (1-min), Hourly, Daily               |
| **Visualization**  | Line chart (error rate), Stacked bar (by code) |
| **Drill-down**     | Click → View error details, stack traces       |
| **Thresholds**     | Target: < 0.1%; Warning: > 1%; Critical: > 5%  |

#### 3.3.2 Error Distribution by Code

| Attribute          | Specification                                             |
| ------------------ | --------------------------------------------------------- |
| **Data Points**    | HTTP status codes: 400, 401, 403, 404, 500, 502, 503, 504 |
| **Calculation**    | COUNT(\*) GROUP BY status_code                            |
| **Time Intervals** | Real-time, Hourly                                         |
| **Visualization**  | Pareto chart, Stacked bar                                 |
| **Drill-down**     | Click code → View affected requests                       |
| **Thresholds**     | Alert: Any single code spike > 50% of normal              |

#### 3.3.3 SIP Error Rate

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Total SIP transactions, failed transactions  |
| **Calculation**    | COUNT(sip_error) / COUNT(sip_total) \* 100   |
| **Time Intervals** | Real-time (10-sec), Hourly                   |
| **Visualization**  | Line chart, Gauge                            |
| **Drill-down**     | Click → View SIP error details               |
| **Thresholds**     | Target: < 1%; Warning: > 3%; Critical: > 10% |

#### 3.3.4 Database Error Rate

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Total queries, failed queries, deadlocks, timeouts |
| **Calculation**    | COUNT(error) / COUNT(total) \* 100                 |
| **Time Intervals** | Real-time, Hourly                                  |
| **Visualization**  | Line chart, Heatmap (by query type)                |
| **Drill-down**     | Click → View slow/failed queries                   |
| **Thresholds**     | Target: < 0.5%; Warning: > 1%; Critical: > 5%      |

---

### 3.4 Latency Metrics

#### 3.4.1 API Response Time (P50)

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Response times, percentiles                       |
| **Calculation**    | PERCENTILE_CONT(0.5) OF response_time             |
| **Time Intervals** | Real-time (1-min), Hourly                         |
| **Visualization**  | Line chart, Control chart                         |
| **Drill-down**     | Click → View slow requests                        |
| **Thresholds**     | Target: < 200ms; Warning: > 500ms; Critical: > 1s |

#### 3.4.2 API Response Time (P95)

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Response times at 95th percentile              |
| **Calculation**    | PERCENTILE_CONT(0.95) OF response_time         |
| **Time Intervals** | Real-time (5-min), Hourly                      |
| **Visualization**  | Line chart with P50 comparison                 |
| **Drill-down**     | Click → View P95 request samples               |
| **Thresholds**     | Target: < 500ms; Warning: > 1s; Critical: > 2s |

#### 3.4.3 API Response Time (P99)

| Attribute          | Specification                               |
| ------------------ | ------------------------------------------- |
| **Data Points**    | Response times at 99th percentile           |
| **Calculation**    | PERCENTILE_CONT(0.99) OF response_time      |
| **Time Intervals** | Real-time (5-min), Hourly                   |
| **Visualization**  | Line chart, Outlier detection               |
| **Drill-down**     | Click → View outlier requests               |
| **Thresholds**     | Target: < 1s; Warning: > 2s; Critical: > 5s |

#### 3.4.4 Database Query Latency

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Query execution time, query type                  |
| **Calculation**    | AVG(query_time) GROUP BY query_type               |
| **Time Intervals** | Real-time, Hourly                                 |
| **Visualization**  | Multi-line chart (by query type), Heatmap         |
| **Drill-down**     | Click → View slow queries                         |
| **Thresholds**     | Target: < 100ms; Warning: > 500ms; Critical: > 1s |

#### 3.4.5 SIP Call Setup Time

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | INVITE to 200 OK time                          |
| **Calculation**    | AVG(200ok_time - invite_time)                  |
| **Time Intervals** | Real-time, Hourly                              |
| **Visualization**  | Line chart, Histogram                          |
| **Drill-down**     | Click → View slow call setups                  |
| **Thresholds**     | Target: < 500ms; Warning: > 1s; Critical: > 2s |

---

### 3.5 Resource Utilization

#### 3.5.1 Connection Pool Usage

| Attribute          | Specification                                            |
| ------------------ | -------------------------------------------------------- |
| **Data Points**    | Active connections, max connections, waiting connections |
| **Calculation**    | active / max \* 100, waiting_count                       |
| **Time Intervals** | Real-time (10-sec), Hourly                               |
| **Visualization**  | Area chart (pool usage), Line chart                      |
| **Drill-down**     | Click → View connection details                          |
| **Thresholds**     | Target: < 70%; Warning: > 85%; Critical: > 95%           |

#### 3.5.2 Bandwidth Utilization

| Attribute          | Specification                         |
| ------------------ | ------------------------------------- |
| **Data Points**    | Bytes in, bytes out, total bandwidth  |
| **Calculation**    | SUM(bytes_in), SUM(bytes_out)         |
| **Time Intervals** | Real-time (1-min), Hourly, Daily      |
| **Visualization**  | Dual line chart, Area chart           |
| **Drill-down**     | Click → View bandwidth by endpoint    |
| **Thresholds**     | Warning: > 80% of allocated bandwidth |

#### 3.5.3 Cache Hit Rate

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Cache hits, cache misses                       |
| **Calculation**    | hits / (hits + misses) \* 100                  |
| **Time Intervals** | Hourly, Daily                                  |
| **Visualization**  | Line chart, Gauge                              |
| **Drill-down**     | Click → View cache miss details                |
| **Thresholds**     | Target: > 90%; Warning: < 80%; Critical: < 70% |

#### 3.5.4 Thread Pool Usage

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Active threads, queued tasks, completed tasks  |
| **Calculation**    | active_threads / max_threads \* 100            |
| **Time Intervals** | Real-time (10-sec), Hourly                     |
| **Visualization**  | Line chart, Queue depth chart                  |
| **Drill-down**     | Click → View thread details                    |
| **Thresholds**     | Target: < 70%; Warning: > 85%; Critical: > 95% |

---

### 3.6 Network Performance

#### 3.6.1 Network Throughput

| Attribute          | Specification                        |
| ------------------ | ------------------------------------ |
| **Data Points**    | Packets per second, bytes per second |
| **Calculation**    | SUM(packets), SUM(bytes)             |
| **Time Intervals** | Real-time (1-sec), 1-min average     |
| **Visualization**  | Line chart (throughput), Area chart  |
| **Drill-down**     | Click → View network by connection   |
| **Thresholds**     | Warning: > 80% of link capacity      |

#### 3.6.2 Packet Loss Rate

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Packets sent, packets lost                    |
| **Calculation**    | lost / sent \* 100                            |
| **Time Intervals** | Real-time (10-sec), Hourly                    |
| **Visualization**  | Line chart, Control chart                     |
| **Drill-down**     | Click → View affected connections             |
| **Thresholds**     | Target: < 0.1%; Warning: > 1%; Critical: > 5% |

#### 3.6.3 Jitter

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Jitter measurements per stream                     |
| **Calculation**    | AVG(jitter_ms)                                     |
| **Time Intervals** | Real-time, Hourly                                  |
| **Visualization**  | Line chart, Heatmap                                |
| **Drill-down**     | Click → View affected calls                        |
| **Thresholds**     | Target: < 30ms; Warning: > 50ms; Critical: > 100ms |

#### 3.6.4 DNS Resolution Time

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | DNS query time, resolution success/failure          |
| **Calculation**    | AVG(resolution_time_ms), failure_rate               |
| **Time Intervals** | Real-time, Hourly                                   |
| **Visualization**  | Line chart, Bar chart (by domain)                   |
| **Drill-down**     | Click → View failed resolutions                     |
| **Thresholds**     | Target: < 50ms; Warning: > 200ms; Critical: > 500ms |

---

## 4. Financial and Billing Analytics

### 4.1 Cost Tracking

#### 4.1.1 Total Cost

| Attribute          | Specification                                             |
| ------------------ | --------------------------------------------------------- |
| **Data Points**    | All expenses: PSTN, SMS, storage, API, bandwidth          |
| **Calculation**    | SUM(cost)                                                 |
| **Time Intervals** | Real-time (hourly total), Daily, Weekly, Monthly          |
| **Visualization**  | Line chart (trend), Stacked area (breakdown), Big counter |
| **Drill-down**     | Click → View cost breakdown by category                   |
| **Thresholds**     | Warning: > 120% of budget; Critical: > 150% of budget     |

#### 4.1.2 PSTN Cost

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Inbound/outbound minutes, rates by destination |
| **Calculation**    | SUM(minutes \* rate_per_minute)                |
| **Time Intervals** | Hourly, Daily, Weekly, Monthly                 |
| **Visualization**  | Line chart, Stacked bar (by country)           |
| **Drill-down**     | Click → View calls by destination              |
| **Thresholds**     | Warning: > 10% increase week-over-week         |

#### 4.1.3 Cost per Call

| Attribute          | Specification                                       |
| ------------------ | --------------------------------------------------- |
| **Data Points**    | Total cost, total calls                             |
| **Calculation**    | total_cost / total_calls                            |
| **Time Intervals** | Daily, Weekly, Monthly                              |
| **Visualization**  | Line chart, Comparison bar chart                    |
| **Drill-down**     | Click → View high-cost calls                        |
| **Thresholds**     | Warning: > 20% above average; Critical: > 50% above |

#### 4.1.4 Cost Forecast

| Attribute          | Specification                                    |
| ------------------ | ------------------------------------------------ |
| **Data Points**    | Historical cost, trend, seasonal patterns        |
| **Calculation**    | Linear regression + seasonal adjustment          |
| **Time Intervals** | Monthly projection                               |
| **Visualization**  | Line chart (actual + forecast), Confidence bands |
| **Drill-down**     | Click → View forecast assumptions                |
| **Thresholds**     | Alert: Forecast > budget                         |

---

### 4.2 Carrier Expenses

#### 4.2.1 Carrier Comparison

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Cost, quality, volume per carrier             |
| **Calculation**    | carrier_cost, carrier_volume, carrier_quality |
| **Time Intervals** | Monthly, Quarterly                            |
| **Visualization**  | Bar chart (comparison), Radar chart           |
| **Drill-down**     | Click carrier → View carrier details          |
| **Thresholds**     | Alert: Cost > 30% above competitor            |

#### 4.2.2 Termination Quality by Carrier

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Call quality, success rate by carrier        |
| **Calculation**    | AVG(quality_score) GROUP BY carrier          |
| **Time Intervals** | Weekly, Monthly                              |
| **Visualization**  | Bar chart, Comparative table                 |
| **Drill-down**     | Click → View carrier-specific calls          |
| **Thresholds**     | Warning: Quality score < 3.5 for any carrier |

#### 4.2.3 Carrier Traffic Distribution

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Call volume, minutes by carrier                            |
| **Calculation**    | COUNT(\*) GROUP BY carrier, SUM(duration) GROUP BY carrier |
| **Time Intervals** | Daily, Weekly, Monthly                                     |
| **Visualization**  | Donut chart, Treemap                                       |
| **Drill-down**     | Click → View carrier routing rules                         |
| **Thresholds**     | Alert: Single carrier > 80% traffic                        |

---

### 4.3 Revenue Tracking

#### 4.3.1 Total Revenue

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Subscription revenue, one-time charges, usage fees |
| **Calculation**    | SUM(revenue)                                       |
| **Time Intervals** | Daily, Weekly, Monthly, Quarterly, Yearly          |
| **Visualization**  | Line chart (trend), Area chart (cumulative)        |
| **Drill-down**     | Click → View revenue breakdown                     |
| **Thresholds**     | Warning: < 90% of projection; Critical: < 75%      |

#### 4.3.2 Average Revenue Per User (ARPU)

| Attribute          | Specification                              |
| ------------------ | ------------------------------------------ |
| **Data Points**    | Total revenue, active users                |
| **Calculation**    | revenue / active_users                     |
| **Time Intervals** | Monthly, Quarterly                         |
| **Visualization**  | Line chart (trend), Bar chart (comparison) |
| **Drill-down**     | Click → View ARPU by segment               |
| **Thresholds**     | Warning: > 10% decline month-over-month    |

#### 4.3.3 Revenue by Tier

| Attribute          | Specification                                            |
| ------------------ | -------------------------------------------------------- |
| **Data Points**    | Subscription tier, revenue, users                        |
| **Calculation**    | SUM(revenue) GROUP BY tier, COUNT(user_id) GROUP BY tier |
| **Time Intervals** | Monthly                                                  |
| **Visualization**  | Stacked bar chart, Donut chart                           |
| **Drill-down**     | Click tier → View tier details                           |
| **Thresholds**     | Alert: Tier imbalance (one tier > 70%)                   |

#### 4.3.4 Lifetime Value (LTV)

| Attribute          | Specification                                                |
| ------------------ | ------------------------------------------------------------ |
| **Data Points**    | Average revenue per user, average lifespan, acquisition cost |
| **Calculation**    | ARPU \* avg_lifespan - acquisition_cost                      |
| **Time Intervals** | Quarterly, Yearly                                            |
| **Visualization**  | Trend line, Cohort analysis                                  |
| **Drill-down**     | Click → View LTV calculation                                 |
| **Thresholds**     | Warning: LTV/CAC ratio < 3                                   |

---

### 4.4 Subscription Metrics

#### 4.4.1 Subscription Count

| Attribute          | Specification                                                |
| ------------------ | ------------------------------------------------------------ |
| **Data Points**    | Active subscriptions by tier                                 |
| **Calculation**    | COUNT(subscription_id) WHERE status = 'active' GROUP BY tier |
| **Time Intervals** | Daily, Weekly, Monthly                                       |
| **Visualization**  | Line chart (trend), Stacked area                             |
| **Drill-down**     | Click → View subscription list                               |
| **Thresholds**     | Warning: < growth target                                     |

#### 4.4.2 Churn Rate

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Cancelled subscriptions, total subscriptions          |
| **Calculation**    | cancelled / total \* 100                              |
| **Time Intervals** | Monthly, Quarterly                                    |
| **Visualization**  | Line chart, Cohort retention curves                   |
| **Drill-down**     | Click → View churned users                            |
| **Thresholds**     | Target: < 5% monthly; Warning: > 10%; Critical: > 20% |

#### 4.4.3 Expansion Revenue

| Attribute          | Specification                       |
| ------------------ | ----------------------------------- |
| **Data Points**    | Upgrades, add-ons, additional seats |
| **Calculation**    | SUM(expansion_revenue)              |
| **Time Intervals** | Monthly, Quarterly                  |
| **Visualization**  | Bar chart, Trend line               |
| **Drill-down**     | Click → View expansion details      |
| **Thresholds**     | Target: > 5% expansion MRR          |

#### 4.4.4 Net Revenue Retention (NRR)

| Attribute          | Specification                         |
| ------------------ | ------------------------------------- |
| **Data Points**    | Revenue from cohort, starting revenue |
| **Calculation**    | (revenue_end / revenue_start) \* 100  |
| **Time Intervals** | Monthly, Quarterly                    |
| **Visualization**  | Line chart, Cohort heatmap            |
| **Drill-down**     | Click cohort → View details           |
| **Thresholds**     | Target: > 100%; Warning: < 90%        |

---

### 4.5 Transaction Volumes

#### 4.5.1 Billing Transactions

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Transaction count, amount, success rate      |
| **Calculation**    | COUNT(\*) WHERE status = 'success'           |
| **Time Intervals** | Daily, Weekly, Monthly                       |
| **Visualization**  | Line chart, Funnel (attempt → success)       |
| **Drill-down**     | Click → View transaction details             |
| **Thresholds**     | Warning: Success rate < 95%; Critical: < 90% |

#### 4.5.2 Payment Method Distribution

| Attribute          | Specification                              |
| ------------------ | ------------------------------------------ |
| **Data Points**    | Credit card, PayPal, bank transfer, crypto |
| **Calculation**    | COUNT(\*) GROUP BY payment_method          |
| **Time Intervals** | Monthly                                    |
| **Visualization**  | Donut chart, Bar chart                     |
| **Drill-down**     | Click → View method details                |
| **Thresholds**     | Alert: Method concentration > 80%          |

#### 4.5.3 Failed Payment Analysis

| Attribute          | Specification                                   |
| ------------------ | ----------------------------------------------- |
| **Data Points**    | Failed attempts, failure reasons, retry success |
| **Calculation**    | COUNT(failed), COUNT(successful_retry)          |
| **Time Intervals** | Daily, Weekly                                   |
| **Visualization**  | Pareto chart (reasons), Trend line              |
| **Drill-down**     | Click → View failed payments                    |
| **Thresholds**     | Warning: Failure rate > 5%; Critical: > 10%     |

---

### 4.6 Cost Optimization

#### 4.6.1 Cost per Minute Trend

| Attribute          | Specification                                |
| ------------------ | -------------------------------------------- |
| **Data Points**    | Monthly cost, total minutes, cost per minute |
| **Calculation**    | total_cost / total_minutes                   |
| **Time Intervals** | Monthly, Quarterly                           |
| **Visualization**  | Line chart, Control chart                    |
| **Drill-down**     | Click → View optimization opportunities      |
| **Thresholds**     | Warning: > 10% increase quarter-over-quarter |

#### 4.6.2 Unused Resource Cost

| Attribute          | Specification                               |
| ------------------ | ------------------------------------------- |
| **Data Points**    | Allocated vs used resources                 |
| **Calculation**    | SUM(allocated_cost) - SUM(used_cost)        |
| **Time Intervals** | Monthly                                     |
| **Visualization**  | Bar chart, Treemap                          |
| **Drill-down**     | Click → View unused resources               |
| **Thresholds**     | Warning: > 20% waste; Critical: > 30% waste |

#### 4.6.3 Carrier Rate Optimization

| Attribute          | Specification                                           |
| ------------------ | ------------------------------------------------------- |
| **Data Points**    | Current rates, market rates, optimization opportunities |
| **Calculation**    | (current_rate - market_rate) / current_rate \* 100      |
| **Time Intervals** | Quarterly                                               |
| **Visualization**  | Table with recommendations                              |
| **Drill-down**     | Click route → View rate details                         |
| **Thresholds**     | Alert: Potential savings > $100/month                   |

---

## 5. Security and Compliance Metrics

### 5.1 Authentication Metrics

#### 5.1.1 Login Attempts

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Attempt count, success/failure, method used    |
| **Calculation**    | COUNT(\*), COUNT(success), COUNT(failed)       |
| **Time Intervals** | Real-time (5-min), Hourly, Daily, Weekly       |
| **Visualization**  | Line chart (trend), Stacked bar (success/fail) |
| **Drill-down**     | Click → View login details, failed attempts    |
| **Thresholds**     | Warning: Failure rate > 20%; Critical: > 50%   |

#### 5.1.2 Authentication Methods Used

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Password, 2FA, SSO, biometric                 |
| **Calculation**    | COUNT(\*) GROUP BY method                     |
| **Time Intervals** | Daily, Weekly, Monthly                        |
| **Visualization**  | Donut chart, Stacked bar (trend)              |
| **Drill-down**     | Click → View method breakdown                 |
| **Thresholds**     | Alert: Password-only > 50% (security concern) |

#### 5.1.3 2FA Adoption Rate

| Attribute          | Specification                                  |
| ------------------ | ---------------------------------------------- |
| **Data Points**    | Users with 2FA enabled, total users            |
| **Calculation**    | COUNT(2fa_enabled) / COUNT(total) \* 100       |
| **Time Intervals** | Weekly, Monthly                                |
| **Visualization**  | Line chart (adoption trend), Gauge             |
| **Drill-down**     | Click → View non-2FA users                     |
| **Thresholds**     | Target: > 80%; Warning: < 50%; Critical: < 25% |

#### 5.1.4 Password Reset Requests

| Attribute          | Specification                                    |
| ------------------ | ------------------------------------------------ |
| **Data Points**    | Request count, successful resets, abuse attempts |
| **Calculation**    | COUNT(request), COUNT(success), COUNT(abuse)     |
| **Time Intervals** | Daily, Weekly                                    |
| **Visualization**  | Line chart, Pareto chart (reasons)               |
| **Drill-down**     | Click → View reset details                       |
| **Thresholds**     | Warning: > 10% abuse rate                        |

---

### 5.2 Suspicious Activity

#### 5.2.1 Brute Force Attempts

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Rapid login attempts, IP addresses, accounts targeted |
| **Calculation**    | COUNT(\*) WHERE attempts > threshold_per_ip           |
| **Time Intervals** | Real-time, Hourly, Daily                              |
| **Visualization**  | Line chart, Table (top attacking IPs)                 |
| **Drill-down**     | Click IP → View IP details, blocked attempts          |
| **Thresholds**     | Warning: > 100 attempts/hour; Critical: > 1000/hour   |

#### 5.2.2 Account Takeover (ATO) Attempts

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Suspicious logins, location anomalies, device changes |
| **Calculation**    | COUNT(\*) WHERE risk_score > threshold                |
| **Time Intervals** | Real-time, Daily                                      |
| **Visualization**  | Trend line, Risk distribution chart                   |
| **Drill-down**     | Click → View suspicious accounts                      |
| **Thresholds**     | Alert: Any ATO attempt; Warning: > 5 attempts/week    |

#### 5.2.3 Unusual Activity Patterns

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Time anomalies, location changes, behavior deviations |
| **Calculation**    | COUNT(\*) WHERE anomaly_score > threshold             |
| **Time Intervals** | Daily, Weekly                                         |
| **Visualization**  | Heatmap (activity patterns), Timeline                 |
| **Drill-down**     | Click → View flagged activities                       |
| **Thresholds**     | Warning: > 5% of users flagged                        |

#### 5.2.4 Geographic Anomalies

| Attribute          | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Data Points**    | Logins from unusual countries, impossible travel           |
| **Calculation**    | COUNT(\*) WHERE country not in usual_set                   |
| **Time Intervals** | Real-time, Daily                                           |
| **Visualization**  | Map with login locations, Timeline                         |
| **Drill-down**     | Click location → View logins                               |
| **Thresholds**     | Alert: Login from new country; Critical: Impossible travel |

---

### 5.3 Policy Violations

#### 5.3.1 Violation Count

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Policy type, severity, user                        |
| **Calculation**    | COUNT(\*) GROUP BY policy_type, severity           |
| **Time Intervals** | Real-time, Daily, Weekly, Monthly                  |
| **Visualization**  | Stacked bar (by type), Pareto chart                |
| **Drill-down**     | Click → View violation details                     |
| **Thresholds**     | Warning: > 10 violations/week; Critical: > 50/week |

#### 5.3.2 Violation by Category

| Attribute          | Specification                                                |
| ------------------ | ------------------------------------------------------------ |
| **Data Points**    | Categories: spam, harassment, policy breach, illegal content |
| **Calculation**    | COUNT(\*) GROUP BY category                                  |
| **Time Intervals** | Weekly, Monthly                                              |
| **Visualization**  | Horizontal bar chart, Treemap                                |
| **Drill-down**     | Click category → View incidents                              |
| **Thresholds**     | Alert: Any illegal content; Warning: > 5 harassment/week     |

#### 5.3.3 Violation Resolution Time

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Violation detected, resolved, resolution time |
| **Calculation**    | AVG(resolution_time)                          |
| **Time Intervals** | Weekly, Monthly                               |
| **Visualization**  | Line chart, Distribution chart                |
| **Drill-down**     | Click → View resolution details               |
| **Thresholds**     | Target: < 24 hours; Warning: > 72 hours       |

#### 5.3.4 Repeat Violators

| Attribute          | Specification                                        |
| ------------------ | ---------------------------------------------------- |
| **Data Points**    | Users with multiple violations, violation count      |
| **Calculation**    | COUNT(DISTINCT user_id) HAVING COUNT(\*) > threshold |
| **Time Intervals** | Monthly                                              |
| **Visualization**  | Table (repeat offenders), Trend line                 |
| **Drill-down**     | Click user → View user history                       |
| **Thresholds**     | Warning: > 5 users with 3+ violations                |

---

### 5.4 Encryption Status

#### 5.4.1 Encryption Coverage

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Total connections, encrypted connections      |
| **Calculation**    | encrypted / total \* 100                      |
| **Time Intervals** | Real-time, Daily                              |
| **Visualization**  | Gauge, Trend line                             |
| **Drill-down**     | Click → View unencrypted connections          |
| **Thresholds**     | Target: 100%; Warning: < 99%; Critical: < 95% |

#### 5.4.2 TLS Certificate Status

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Certificates, expiration dates, validity          |
| **Calculation**    | COUNT(valid), COUNT(expiring_30d), COUNT(expired) |
| **Time Intervals** | Daily check                                       |
| **Visualization**  | Status grid, Timeline (expirations)               |
| **Drill-down**     | Click cert → View details                         |
| **Thresholds**     | Alert: Any expired; Warning: Expiring < 30 days   |

#### 5.4.3 Protocol Distribution

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | TLS versions: 1.1, 1.2, 1.3, older            |
| **Calculation**    | COUNT(\*) GROUP BY tls_version                |
| **Time Intervals** | Weekly                                        |
| **Visualization**  | Stacked bar chart, Table                      |
| **Drill-down**     | Click → View connections by version           |
| **Thresholds**     | Warning: TLS 1.1 > 1%; Critical: SSL detected |

#### 5.4.4 Encryption Algorithm Usage

| Attribute          | Specification                                               |
| ------------------ | ----------------------------------------------------------- |
| **Data Points**    | Cipher suites used, strength                                |
| **Calculation**    | COUNT(\*) GROUP BY cipher_suite                             |
| **Time Intervals** | Monthly                                                     |
| **Visualization**  | Table with strength rating                                  |
| **Drill-down**     | Click → View connections                                    |
| **Thresholds**     | Warning: Any weak cipher (RC4, 3DES); Critical: NULL cipher |

---

### 5.5 Access Logs

#### 5.5.1 Access Log Volume

| Attribute          | Specification                      |
| ------------------ | ---------------------------------- |
| **Data Points**    | Total log entries, storage used    |
| **Calculation**    | COUNT(\*), storage_size            |
| **Time Intervals** | Real-time, Hourly, Daily           |
| **Visualization**  | Line chart (volume), Storage gauge |
| **Drill-down**     | Click → View sample logs           |
| **Thresholds**     | Warning: > 10x normal volume       |

#### 5.5.2 Access by User

| Attribute          | Specification                      |
| ------------------ | ---------------------------------- |
| **Data Points**    | User access count, access patterns |
| **Calculation**    | COUNT(\*) GROUP BY user_id         |
| **Time Intervals** | Daily, Weekly                      |
| **Visualization**  | Bar chart (top users), Heatmap     |
| **Drill-down**     | Click user → View access history   |
| **Thresholds**     | Warning: Access spike > 5x normal  |

#### 5.5.3 Access by Endpoint

| Attribute          | Specification                          |
| ------------------ | -------------------------------------- |
| **Data Points**    | Endpoint, access count, method         |
| **Calculation**    | COUNT(\*) GROUP BY endpoint            |
| **Time Intervals** | Real-time, Hourly                      |
| **Visualization**  | Horizontal bar chart, API call graph   |
| **Drill-down**     | Click endpoint → View access details   |
| **Thresholds**     | Warning: Access to sensitive endpoints |

#### 5.5.4 Failed Access Attempts

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | 403/401 errors, reason, user/IP                   |
| **Calculation**    | COUNT(\*) WHERE status IN (401, 403)              |
| **Time Intervals** | Real-time, Hourly, Daily                          |
| **Visualization**  | Line chart, Pareto chart (reasons)                |
| **Drill-down**     | Click → View failed attempts                      |
| **Thresholds**     | Warning: > 100 failed/hour; Critical: > 1000/hour |

---

## 6. Administrative Insights

### 6.1 User Management

#### 6.1.1 User Growth

| Attribute          | Specification                                        |
| ------------------ | ---------------------------------------------------- |
| **Data Points**    | New users, total users, growth rate                  |
| **Calculation**    | COUNT(new_users), (new - previous) / previous \* 100 |
| **Time Intervals** | Daily, Weekly, Monthly, Quarterly                    |
| **Visualization**  | Line chart (cumulative), Growth rate chart           |
| **Drill-down**     | Click → View new user details                        |
| **Thresholds**     | Target: > 5% monthly growth; Warning: < 0%           |

#### 6.1.2 User Status Distribution

| Attribute          | Specification                                     |
| ------------------ | ------------------------------------------------- |
| **Data Points**    | Active, inactive, suspended, deleted              |
| **Calculation**    | COUNT(\*) GROUP BY status                         |
| **Time Intervals** | Daily, Weekly                                     |
| **Visualization**  | Donut chart, Stacked bar (trend)                  |
| **Drill-down**     | Click status → View users                         |
| **Thresholds**     | Warning: > 20% inactive; Critical: > 50% inactive |

#### 6.1.3 User Activity Levels

| Attribute          | Specification                                         |
| ------------------ | ----------------------------------------------------- |
| **Data Points**    | Power users, regular users, occasional users, dormant |
| **Calculation**    | COUNT(\*) GROUP BY activity_level                     |
| **Time Intervals** | Weekly, Monthly                                       |
| **Visualization**  | Pyramidal chart, Stacked bar                          |
| **Drill-down**     | Click segment → View users                            |
| **Thresholds**     | Warning: > 50% dormant                                |

#### 6.1.4 User Demographics

| Attribute          | Specification                               |
| ------------------ | ------------------------------------------- |
| **Data Points**    | Country, timezone, organization, department |
| **Calculation**    | COUNT(\*) GROUP BY demographic              |
| **Time Intervals** | Monthly                                     |
| **Visualization**  | Choropleth map, Bar charts                  |
| **Drill-down**     | Click demographic → View users              |
| **Thresholds**     | Alert: Unexpected demographic shifts        |

---

### 6.2 Role Assignments

#### 6.2.1 Role Distribution

| Attribute          | Specification                       |
| ------------------ | ----------------------------------- |
| **Data Points**    | Roles: admin, manager, user, viewer |
| **Calculation**    | COUNT(\*) GROUP BY role             |
| **Time Intervals** | Weekly, Monthly                     |
| **Visualization**  | Donut chart, Hierarchy diagram      |
| **Drill-down**     | Click role → View users with role   |
| **Thresholds**     | Warning: Admin > 10% of users       |

#### 6.2.2 Role Changes

| Attribute          | Specification                           |
| ------------------ | --------------------------------------- |
| **Data Points**    | Promotions, demotions, new assignments  |
| **Calculation**    | COUNT(\*) WHERE role_changed = true     |
| **Time Intervals** | Weekly, Monthly                         |
| **Visualization**  | Timeline, Table (changes)               |
| **Drill-down**     | Click → View change details             |
| **Thresholds**     | Alert: Role escalation without approval |

#### 6.2.3 Permission Coverage

| Attribute          | Specification                            |
| ------------------ | ---------------------------------------- |
| **Data Points**    | Users per permission, unused permissions |
| **Calculation**    | COUNT(user_id) GROUP BY permission       |
| **Time Intervals** | Monthly                                  |
| **Visualization**  | Heatmap (user × permission)              |
| **Drill-down**     | Click → View permission assignments      |
| **Thresholds**     | Warning: Unused permissions > 20%        |

---

### 6.3 Permission Changes

#### 6.3.1 Permission Change Log

| Attribute          | Specification                            |
| ------------------ | ---------------------------------------- |
| **Data Points**    | Permission, change type, user, timestamp |
| **Calculation**    | COUNT(\*), audit_trail_entries           |
| **Time Intervals** | Real-time, Daily, Weekly                 |
| **Visualization**  | Timeline, Table (recent changes)         |
| **Drill-down**     | Click → View change details              |
| **Thresholds**     | Alert: Bulk permission changes           |

#### 6.3.2 High-Risk Permission Changes

| Attribute          | Specification                                    |
| ------------------ | ------------------------------------------------ |
| **Data Points**    | Admin rights, data export, system config changes |
| **Calculation**    | COUNT(\*) WHERE permission IN high_risk_set      |
| **Time Intervals** | Real-time, Daily                                 |
| **Visualization**  | Alert dashboard, Timeline                        |
| **Drill-down**     | Click → View change details, approver            |
| **Thresholds**     | Alert: Any high-risk change requires review      |

#### 6.3.3 Permission Change Approval Rate

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Requests, approvals, rejections               |
| **Calculation**    | approved / requested \* 100                   |
| **Time Intervals** | Monthly                                       |
| **Visualization**  | Funnel chart, Trend line                      |
| **Drill-down**     | Click → View pending requests                 |
| **Thresholds**     | Warning: Approval rate < 80%; Critical: < 50% |

---

### 6.4 Audit Trails

#### 6.4.1 Audit Log Volume

| Attribute          | Specification                       |
| ------------------ | ----------------------------------- |
| **Data Points**    | Total entries, entry types, storage |
| **Calculation**    | COUNT(\*), storage_size             |
| **Time Intervals** | Real-time, Hourly, Daily            |
| **Visualization**  | Line chart, Storage gauge           |
| **Drill-down**     | Click → View sample entries         |
| **Thresholds**     | Warning: > 10x normal volume        |

#### 6.4.2 Compliance Audit Status

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | Audit requirements, compliance status         |
| **Calculation**    | COUNT(compliant) / COUNT(required) \* 100     |
| **Time Intervals** | Monthly, Quarterly                            |
| **Visualization**  | Compliance score gauge, Gap analysis          |
| **Drill-down**     | Click → View gaps                             |
| **Thresholds**     | Target: 100%; Warning: < 95%; Critical: < 90% |

#### 6.4.3 Audit Report Generation

| Attribute          | Specification                           |
| ------------------ | --------------------------------------- |
| **Data Points**    | Reports generated, report types, access |
| **Calculation**    | COUNT(report_generations)               |
| **Time Intervals** | Weekly, Monthly                         |
| **Visualization**  | Table (recent reports), Trend           |
| **Drill-down**     | Click → View report contents            |
| **Thresholds**     | Alert: Sensitive report access          |

#### 6.4.4 Data Access Requests

| Attribute          | Specification                                 |
| ------------------ | --------------------------------------------- |
| **Data Points**    | GDPR/CCPA requests, status, resolution time   |
| **Calculation**    | COUNT(\*), AVG(resolution_time)               |
| **Time Intervals** | Weekly, Monthly                               |
| **Visualization**  | Funnel, Timeline                              |
| **Drill-down**     | Click → View request details                  |
| **Thresholds**     | Target: 100% within SLA; Warning: > 1 overdue |

---

### 6.5 Configuration Modifications

#### 6.5.1 Configuration Change Log

| Attribute          | Specification                                      |
| ------------------ | -------------------------------------------------- |
| **Data Points**    | Config item, old value, new value, user, timestamp |
| **Calculation**    | COUNT(\*)                                          |
| **Time Intervals** | Real-time, Daily                                   |
| **Visualization**  | Timeline, Diff view                                |
| **Drill-down**     | Click → View change impact                         |
| **Thresholds**     | Alert: Critical config change                      |

#### 6.5.2 Environment Changes

| Attribute          | Specification                                        |
| ------------------ | ---------------------------------------------------- |
| **Data Points**    | Environment (dev/staging/prod), change type          |
| **Calculation**    | COUNT(\*) GROUP BY environment, change_type          |
| **Time Intervals** | Weekly                                               |
| **Visualization**  | Heatmap (environment × change)                       |
| **Drill-down**     | Click → View change details                          |
| **Thresholds**     | Alert: Production changes outside maintenance window |

#### 6.5.3 Configuration Drift

| Attribute          | Specification                               |
| ------------------ | ------------------------------------------- |
| **Data Points**    | Expected config, actual config, drift count |
| **Calculation**    | COUNT(\*) WHERE actual != expected          |
| **Time Intervals** | Hourly, Daily                               |
| **Visualization**  | Drift timeline, Comparison chart            |
| **Drill-down**     | Click → View drift details                  |
| **Thresholds**     | Warning: Any drift; Critical: Drift in prod |

#### 6.5.4 Rollback Frequency

| Attribute          | Specification                               |
| ------------------ | ------------------------------------------- |
| **Data Points**    | Config changes, rollbacks, rollback reasons |
| **Calculation**    | COUNT(rollbacks) / COUNT(changes) \* 100    |
| **Time Intervals** | Monthly                                     |
| **Visualization**  | Trend line, Pareto chart (reasons)          |
| **Drill-down**     | Click → View rollback details               |
| **Thresholds**     | Warning: > 10% rollback rate                |

---

## Dashboard Implementation Summary

### Widget Priority Matrix

| Priority | Widget          | Visualization | Update Frequency |
| -------- | --------------- | ------------- | ---------------- |
| P0       | Total Calls     | Line chart    | Real-time        |
| P0       | Active Users    | Counter       | Real-time        |
| P0       | System Uptime   | Gauge         | Real-time        |
| P0       | Error Rate      | Line chart    | Real-time        |
| P1       | Call Duration   | Histogram     | 5-min            |
| P1       | Success Rate    | Gauge         | 5-min            |
| P1       | Server Load     | Multi-line    | 1-min            |
| P1       | Costs Today     | Counter       | Hourly           |
| P2       | User Growth     | Line chart    | Daily            |
| P2       | Feature Usage   | Heatmap       | Daily            |
| P2       | Security Alerts | Table         | Real-time        |

### Data Collection Intervals

| Metric Category | Collection Interval |
| --------------- | ------------------- |
| Call Analytics  | Real-time (10-sec)  |
| User Metrics    | 1-minute            |
| Server Metrics  | 10-second           |
| Financial       | Hourly              |
| Security        | Real-time           |
| Administrative  | Real-time           |

### Alert Configuration

| Severity | Response                          | Escalation        |
| -------- | --------------------------------- | ----------------- |
| Critical | Immediate alert, auto-remediation | 15-min escalation |
| Warning  | Dashboard highlight, notify team  | 1-hour escalation |
| Info     | Log only, dashboard indicator     | None              |

---

## Related Documentation

- [`plans/CAREFLOW_ANALYTICS.md`](plans/CAREFLOW_ANALYTICS.md) - Overview
- [`plans/ASTERISK_IMPLEMENTATION.md`](plans/ASTERISK_IMPLEMENTATION.md) - SIP server
- [`plans/PSTN_INTEGRATION_DETAILED.md`](plans/PSTN_INTEGRATION_DETAILED.md) - Phone integration
