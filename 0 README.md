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
WHERE file.day <= date(now) AND file.day >= date(now) - dur(7days)
SORT file.day DESC
```


# 家庭会议
```query
tag: #家庭会议 
```
# 家庭结论
```query
tag: #家庭结论 
```

# 每日行动
```query
tag:#everyday
```

# 一些待看内容
```query
tag:#later
```

# 一些想法
```query
tag:#idea
```

# 月度总结
```query
tag: #monthly-note 
```
