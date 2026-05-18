# 考研英语词汇每日打印计划

## 词汇来源
- **NETEMVocabulary**（考研词汇词频排序，GitHub: exam-data/NETEMVocabulary）
- 共 **5186 个**适合考研学习的词汇，按真实考试出题频率排序

## 学习规则

| 姓名 | 每日单词 | 测试题数 | 过关线 | 预计完成天数 |
|------|---------|---------|-------|-----------|
| Mia  | 30      | 20      | 16 题  | 约 173 天  |
| Amy  | 25      | 18      | 15 题  | 约 208 天  |

## 文件说明

每份 HTML 文件包含 **3 页**（浏览器打开 → Ctrl+P 打印）：
1. **学习卷**：所有单词含音标、中英释义、例句、考研用法搭配、助记方法、格式行
2. **测试卷**：随机抽取指定数量题目（Part A 看单词写中文 / Part B 看中文写单词）
3. **答案页**：家长保管，批改后告知得分，过关方可进入下一天

## Day 1 已生成（2026年5月18日）

```
Mia_Day001_20260518.html  — Mia 第1天（30词）
Amy_Day001_20260518.html  — Amy 第1天（25词）
```

## 生成后续天数

### 1. 安装依赖
```bash
pip install anthropic
```

### 2. 设置 API Key
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. 生成指定天数
```bash
# 生成第2天
python3 generate_day.py 2

# 生成第2到第7天（一次性打印一周）
python3 generate_day.py 2 7

# 只生成 Mia 的
python3 generate_day.py 3 --mia-only

# 只生成 Amy 的
python3 generate_day.py 3 --amy-only
```

生成的文件自动缓存（`.cache_*` 文件），重复运行不重复调用 API。

## 打印建议
- 纸张：A4
- 页边距：默认（约 14mm）
- 打印范围：全部页面
- 建议每天打印当天的学习卷 + 测试卷（答案页家长留存）

## 目录结构
```
vocab_study/
├── README.md                    本说明
├── word_list.json               5186词词频顺序列表
├── generate_day.py              后续天数生成脚本
├── Mia_Day001_20260518.html     Mia 第1天
├── Amy_Day001_20260518.html     Amy 第1天
└── .cache_*/                    API 调用缓存（自动生成）
```
