---
sr-due: 2023-02-07-11-56
sr-interval: 1.6
sr-ease: 170
---

#review 

Phase 1
- oral-english | 英语口语：每天开口20分钟 
- spaced-repetition | 完成每日 spaced repetition. 
- listen-english | 英语听力 20 分钟
	- 材料内容： [Andrew Huberman Youtube Podcast](https://www.youtube.com/@hubermanlab/videos]

Phase 2
- interpretation - 口译：新概念英语
- push-ups - 俯卧撑>30 下

Phase 3
- journal - 写日记
- sleep-before-0 - 12 点前睡觉


```dataview
TABLE WITHOUT ID
  file.link as File,
  choice(oral-english = "Y", "✅", "❌") as oral-english,
  choice(spaced-repetition = "Y", "✅", "❌") as spaced-repetition,
  choice(listen-english = "Y", "✅", "❌") as listen-english,
  choice(interpretation = "Y", "✅", "❌") as interpretation,
  choice(push-ups = "Y", "✅", "❌") as push-ups,
  choice(journal = "Y", "✅", "❌") as journal,
  choice(sleep-before-0 = "Y", "✅", "❌") as sleep-before-0
FROM "z_daily"
WHERE file.day <= date(now) AND file.day >= date(now) - dur(21days)
SORT file.day DESC
```





