---
sr-due: 2023-02-27-23-15
sr-interval: 2.9
sr-ease: 150
---

#review 

Phase 1
- oral-english | 英语口语：每天开口20分钟 
	- 材料内容：
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
  choice(oral-english & oral-english != "N", "✅", "❌") as oral-english,
  choice(spaced-repetition & spaced-repetition != "N", "✅", "❌") as spaced-repetition,
  choice(listen-english & listen-english != "N", "✅", "❌") as listen-english,
  choice(interpretation & interpretation != "N", "✅", "❌") as interpretation,
  choice(push-ups & push-ups != "N", "✅", "❌") as push-ups,
  choice(journal & journal != "N", "✅", "❌") as journal,
  choice(sleep-before-0 & sleep-before-0 != "N", "✅", "❌") as sleep-before-0
FROM "note/z_daily"
WHERE file.day <= date(now) AND file.day >= date(now) - dur(7days)
SORT file.day DESC
```







