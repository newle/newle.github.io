---
sr-due: 2023-07-27-04-50
sr-interval: 12.3
sr-ease: 130
---

#review 

Phase 1
- oral-english | 英语口语：每天开口20分钟 
	- 材料内容：
- spaced-repetition | 完成每日 spaced repetition. 
- listen-english | 英语听力 20 分钟
	- 材料内容： [Andrew Huberman Youtube Podcast](https://www.youtube.com/@hubermanlab/videos]
	- https://www.youtube.com/results?search_query=tim+ferriss+show

Phase 2
- interpretation - 口译：新概念英语
- dictation - 听写：TED-ed·科普精选
- push-ups - 俯卧撑>30 下
- reading: 读书>5分钟

Phase 3
- journal - 写日记
- sleep-before-0 - 12 点前睡觉


```dataview
TABLE WITHOUT ID
  file.link as File,
  choice(oral-english & oral-english != "N", "✅", "❌") as oral-english,
  choice(spaced-repetition & spaced-repetition != "N", "✅", "❌") as spaced-repetition,
  choice(reading & reading != "N", "✅", "❌") as reading,
  choice(dictation & dictation != "N", "✅", "❌") as dictation,
  choice(push-ups & push-ups != "N", "✅", "❌") as push-ups,
  choice(journal & journal != "N", "✅", "❌") as journal,
  choice(sleep-before-0 & sleep-before-0 != "N", "✅", "❌") as sleep-before-0
FROM "note/z_daily"
WHERE file.day <= date(now) AND file.day >= date(now) - dur(7days)
SORT file.day DESC
```







