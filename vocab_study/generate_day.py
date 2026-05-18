#!/usr/bin/env python3
"""
考研词汇每日打印生成器
用法：python3 generate_day.py [day_number] [--mia-only | --amy-only]
示例：python3 generate_day.py 2
      python3 generate_day.py 5 --mia-only
      python3 generate_day.py 1 10   # 生成第1到第10天

依赖：pip install anthropic
设置：export ANTHROPIC_API_KEY=your_key_here

输出目录：当前目录下 Mia_DayXXX_YYYYMMDD.html 和 Amy_DayXXX_YYYYMMDD.html
"""

import sys, os, json, random, html, time, argparse
from datetime import date, timedelta

try:
    import anthropic
except ImportError:
    print("❌ 请先安装 Anthropic SDK: pip install anthropic")
    sys.exit(1)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
WORD_LIST   = os.path.join(SCRIPT_DIR, "word_list.json")
START_DATE  = date(2026, 5, 18)

MIA_DAILY   = 30
MIA_TEST    = 20
MIA_PASS    = 16

AMY_DAILY   = 25
AMY_TEST    = 18
AMY_PASS    = 15

# ─── Word content generation via Claude ───────────────────────────────────────

SYSTEM_PROMPT = """你是专业的英语翻译小能手，能够准确翻译单词并提供学习辅助内容。请严格按JSON格式输出，字段含义如下：
- pron: IPA音标
- cn: 词性+中文释义（含多义）
- en_def: 英文解释（一句话）
- example: 英文例句（含该词，面向考研语境）
- usage: 考研用法与搭配（中文，含★标注重点，2-4条，换行分隔）
- mnemonic: 助记方法（中文，含谐音/词根/故事任一方法）
- fmt_example: 一个简洁英文例句（仅用于格式行）
"""

def generate_word_content(client, word: str, cn_hint: str) -> dict:
    """Call Claude to generate rich content for a single word."""
    prompt = f"""请为考研英语词汇 "{word}"（参考中文释义：{cn_hint}）生成学习内容。
严格以JSON格式返回，包含字段：pron, cn, en_def, example, usage, mnemonic, fmt_example。
不要输出JSON以外的任何内容。"""

    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=800,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            text = msg.content[0].text.strip()
            # Strip markdown code blocks if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text)
            data["word"] = word
            return data
        except Exception as e:
            print(f"  ⚠️  {word} attempt {attempt+1} failed: {e}")
            time.sleep(2)

    # Fallback: minimal entry
    return {
        "word": word,
        "pron": f"/{word}/",
        "cn": cn_hint,
        "en_def": f"See dictionary for '{word}'.",
        "example": f"The word '{word}' is commonly used in academic English.",
        "usage": f"请查阅词典了解 {word} 的详细用法。",
        "mnemonic": f"联想记忆：{word}",
        "fmt_example": f"This is an example using {word}."
    }

# ─── HTML builders (same CSS as Day 1) ────────────────────────────────────────

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 9px; color: #111; background: #fff; }
.page { width: 210mm; padding: 5mm 10mm 5mm; }
.page:has(.word-card) {
  display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px; align-items: start;
}
.page:has(.word-card) > .sheet-header { grid-column: 1 / -1; }
.sheet-header { border: 1px solid #888; border-radius: 2px; padding: 2px 8px; margin-bottom: 5px;
                display: flex; justify-content: space-between; align-items: center; }
.sheet-header .title { font-size: 11px; font-weight: bold; }
.sheet-header .meta  { text-align: right; font-size: 8px; line-height: 1.35; }
.pass-bar { background: none; border: none; font-size: 8px; padding: 0; display: inline; }
.word-card { border: 1px solid #ccc; border-radius: 2px; margin-bottom: 4px; padding: 3px 6px;
             page-break-inside: avoid; }
.word-header { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.word-en   { font-size: 11px; font-weight: bold; color: #000; }
.word-pron { font-size: 7.5px; color: #555; font-family: monospace; }
.word-cn   { font-size: 8.5px; color: #333; font-style: italic; }
.label   { font-weight: bold; font-size: 8px; color: #444; margin-top: 2px; }
.content { font-size: 8px; line-height: 1.3; color: #333; margin-left: 3px; white-space: pre-line; }
.divider-line { display: none; }
.fmt-line     { display: none; }
.word-card > :nth-child(2), .word-card > :nth-child(3), .word-card > :nth-child(4),
.word-card > :nth-child(5), .word-card > :nth-child(7),
.word-card > :nth-child(9),
.word-card > :nth-child(11) { display: none; }
.word-card > :nth-child(6) { font-style: italic; color: #555; margin-left: 0;
                              font-size: 8px; line-height: 1.3; max-height: 1.4em; overflow: hidden; }
.word-card > :nth-child(8) { font-size: 8px; line-height: 1.3; max-height: 2.7em; overflow: hidden; }
.word-card > :nth-child(10) { font-size: 7.5px; line-height: 1.3; color: #777; margin-left: 0;
                               max-height: 2.6em; overflow: hidden;
                               border-left: 2px solid #e0e0e0; padding-left: 3px; margin-top: 1px; }
.test-intro { display: none; }
.test-word-pool { font-size: 8.5px; background: #f3f3f3; padding: 4px 8px; border-radius: 3px;
                  margin-bottom: 8px; line-height: 1.8; }
.test-word-pool span { display: inline-block; min-width: 95px; }
.part-title { font-size: 10px; font-weight: bold; margin: 6px 0 3px 0;
              border-bottom: 1px solid #888; padding-bottom: 2px; }
.q-row { display: flex; align-items: flex-start; gap: 5px; margin-bottom: 4px;
         font-size: 9.5px; min-height: 18px; }
.q-num  { min-width: 18px; font-weight: bold; color: #555; }
.q-text { flex: 1; line-height: 1.4; }
.answer-blank { display: inline-block; border-bottom: 1px solid #333;
                min-width: 90px; margin: 0 3px; vertical-align: bottom; }
.key-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 5px; }
.key-item { font-size: 9px; background: #f5f5f5; border: 1px solid #ddd;
            padding: 3px 5px; border-radius: 2px; }
.key-item strong { color: #000; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page:first-child  { page-break-after: always; }
  .page:nth-child(2) { page-break-after: avoid; }
}
"""

def esc(s):
    return html.escape(str(s) if s else "")

def study_card(i, w):
    return f"""
<div class="word-card">
  <div class="word-header">
    <span style="color:#888;font-size:11px;min-width:22px">{i}.</span>
    <span class="word-en">{esc(w.get('word',''))}</span>
    <span class="word-pron">{esc(w.get('pron',''))}</span>
    <span class="word-cn">{esc(w.get('cn',''))}</span>
  </div>
  <hr class="divider-line">
  <div class="label">📖 英文解释</div>
  <div class="content">{esc(w.get('en_def',''))}</div>
  <div class="label">✏️ 例句</div>
  <div class="content">{esc(w.get('example',''))}</div>
  <div class="label">🌍 考研用法 &amp; 搭配</div>
  <div class="content">{esc(w.get('usage',''))}</div>
  <div class="label">🧠 助记</div>
  <div class="content">{esc(w.get('mnemonic',''))}</div>
  <div class="fmt-line">{esc(w.get('word',''))}::{esc(w.get('pron',''))}:{esc(w.get('cn','').split('；')[0][:20])}:{esc(w.get('fmt_example',''))}</div>
</div>"""

def build_study_page(name, date_str, day_num, words, total_test, pass_count):
    cards = "".join(study_card(i+1, w) for i, w in enumerate(words))
    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">📚 {esc(name)} · 考研词汇 · Day {day_num} · 学习卷</div>
    <div class="meta">日期：{esc(date_str)}<br>
      <span class="pass-bar">考试 {total_test} 题 · 过关线 {pass_count} 题</span>
    </div>
  </div>
  {cards}
</div>"""

def build_test_page(name, date_str, day_num, all_words, test_words, pass_count):
    pool_html = "".join(
        f'<span>{i+1}. <b>{esc(w["word"])}</b></span>'
        for i, w in enumerate(all_words)
    )
    half = len(test_words) // 2
    part_a = test_words[:half]
    part_b = test_words[half:]

    rows_a = "".join(
        f'<div class="q-row"><span class="q-num">{i+1}.</span>'
        f'<span class="q-text"><b>{esc(w["word"])}</b> &nbsp;&nbsp; 意思是：<span class="answer-blank"></span></span></div>'
        for i, w in enumerate(part_a)
    )
    rows_b = "".join(
        f'<div class="q-row"><span class="q-num">{i+1+len(part_a)}.</span>'
        f'<span class="q-text">{esc(w.get("cn","").split("；")[0].lstrip("n. v. adj. adv. prep. ").strip()[:20])} &nbsp;→&nbsp; 英文单词：<span class="answer-blank"></span></span></div>'
        for i, w in enumerate(part_b)
    )

    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">📝 {esc(name)} · 考研词汇 · Day {day_num} · 测试卷</div>
    <div class="meta">
      日期：{esc(date_str)}<br>
      共 <strong>{len(test_words)}</strong> 题 · 过关线 <strong>{pass_count}</strong> 题<br>
      姓名签字：___________
    </div>
  </div>
  <div class="test-intro">📌 词汇库（本日共学 {len(all_words)} 个单词，答案均来自此列表）</div>
  <div class="test-word-pool">{pool_html}</div>
  <div class="part-title">Part A · 看单词写中文（共 {len(part_a)} 题）</div>
  {rows_a}
  <div class="part-title">Part B · 看中文写单词（共 {len(part_b)} 题）</div>
  {rows_b}
  <div style="margin-top:18px;font-size:12px;color:#555">
    得分：________ / {len(test_words)} &nbsp;&nbsp;&nbsp; 是否过关：□ 是 &nbsp; □ 否
    &nbsp;&nbsp;&nbsp;&nbsp; 家长签字：___________
  </div>
</div>"""

def build_answer_page(name, date_str, day_num, all_words, test_words):
    half = len(test_words) // 2
    part_a = test_words[:half]
    part_b = test_words[half:]

    keys_a = "".join(
        f'<div class="key-item">A{i+1}. <strong>{esc(w["word"])}</strong><br><small>{esc(w.get("cn","")[:18])}</small></div>'
        for i, w in enumerate(part_a)
    )
    keys_b = "".join(
        f'<div class="key-item">B{i+1}. {esc(w.get("cn","").split("；")[0].lstrip("n. v. adj. adv. prep. ").strip()[:12])}<br>→ <strong>{esc(w["word"])}</strong></div>'
        for i, w in enumerate(part_b)
    )

    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">🔑 {esc(name)} · Day {day_num} · 答案（家长保管）</div>
    <div class="meta">日期：{esc(date_str)}</div>
  </div>
  <div class="part-title">Part A 答案</div>
  <div class="key-grid">{keys_a}</div>
  <div class="part-title" style="margin-top:14px">Part B 答案</div>
  <div class="key-grid">{keys_b}</div>
  <div style="margin-top:20px;font-size:11px;color:#777;border-top:1px dashed #ccc;padding-top:8px">
    本页为答案页，请家长批改后告知孩子得分。过关后方可开始下一天学习。
  </div>
</div>"""

def build_html(pages_html):
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>考研词汇练习</title>
<style>{CSS}</style>
</head>
<body>{''.join(pages_html)}</body>
</html>"""

# ─── Main ──────────────────────────────────────────────────────────────────────

def day_to_date_str(day_num: int) -> tuple[str, str]:
    """Return (YYYYMMDD string, 中文日期) for the given day number."""
    d = START_DATE + timedelta(days=day_num - 1)
    weekday_cn = ["周一","周二","周三","周四","周五","周六","周日"][d.weekday()]
    return d.strftime("%Y%m%d"), f"{d.year}年{d.month}月{d.day}日（{weekday_cn}）"

def load_words():
    with open(WORD_LIST, encoding="utf-8") as f:
        return json.load(f)

def get_day_slice(word_list, day_num, daily_count):
    start = (day_num - 1) * daily_count
    return word_list[start: start + daily_count]

def cached_content_path(day_num, name):
    return os.path.join(SCRIPT_DIR, f".cache_{name}_day{day_num:03d}.json")

def load_or_generate(client, day_num, name, words):
    cache_path = cached_content_path(day_num, name)
    if os.path.exists(cache_path):
        print(f"  📂 Using cached content for {name} Day {day_num}")
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)

    print(f"  🤖 Generating AI content for {name} Day {day_num} ({len(words)} words)...")
    results = []
    for i, w in enumerate(words):
        print(f"    [{i+1}/{len(words)}] {w['word']} ...", end="", flush=True)
        entry = generate_word_content(client, w["word"], w.get("cn_meaning", ""))
        results.append(entry)
        print(f" ✓")
        time.sleep(0.3)  # gentle rate limit

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return results

def generate_day_html(client, day_num, generate_mia=True, generate_amy=True):
    word_list = load_words()
    date_key, date_str = day_to_date_str(day_num)
    total_days_mia = (len(word_list) // MIA_DAILY) + 1
    total_days_amy = (len(word_list) // AMY_DAILY) + 1

    print(f"\n📅 Day {day_num} — {date_str}")

    if generate_mia:
        mia_slice = get_day_slice(word_list, day_num, MIA_DAILY)
        if not mia_slice:
            print(f"  ⚠️  Mia: no more words for Day {day_num} (total days: {total_days_mia})")
        else:
            mia_entries = load_or_generate(client, day_num, "Mia", mia_slice)
            rng = random.Random(20260518 + day_num)
            test_words = rng.sample(mia_entries, min(MIA_TEST, len(mia_entries)))
            pages = [
                build_study_page("Mia", date_str, day_num, mia_entries, MIA_TEST, MIA_PASS),
                build_test_page ("Mia", date_str, day_num, mia_entries, test_words, MIA_PASS),
                build_answer_page("Mia", date_str, day_num, mia_entries, test_words),
            ]
            out = os.path.join(SCRIPT_DIR, f"Mia_Day{day_num:03d}_{date_key}.html")
            with open(out, "w", encoding="utf-8") as f:
                f.write(build_html(pages))
            print(f"  ✅ Mia Day {day_num} → {os.path.basename(out)}")

    if generate_amy:
        amy_slice = get_day_slice(word_list, day_num, AMY_DAILY)
        if not amy_slice:
            print(f"  ⚠️  Amy: no more words for Day {day_num} (total days: {total_days_amy})")
        else:
            amy_entries = load_or_generate(client, day_num, "Amy", amy_slice)
            rng = random.Random(20260518 + day_num + 100)
            test_words = rng.sample(amy_entries, min(AMY_TEST, len(amy_entries)))
            pages = [
                build_study_page("Amy", date_str, day_num, amy_entries, AMY_TEST, AMY_PASS),
                build_test_page ("Amy", date_str, day_num, amy_entries, test_words, AMY_PASS),
                build_answer_page("Amy", date_str, day_num, amy_entries, test_words),
            ]
            out = os.path.join(SCRIPT_DIR, f"Amy_Day{day_num:03d}_{date_key}.html")
            with open(out, "w", encoding="utf-8") as f:
                f.write(build_html(pages))
            print(f"  ✅ Amy Day {day_num} → {os.path.basename(out)}")


def main():
    parser = argparse.ArgumentParser(description="考研词汇每日打印生成器")
    parser.add_argument("days", nargs="+", type=int,
                        help="要生成的天数（如：2  或  2 3 4 5）")
    parser.add_argument("--mia-only", action="store_true")
    parser.add_argument("--amy-only", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ 请设置环境变量 ANTHROPIC_API_KEY")
        print("   export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    gen_mia = not args.amy_only
    gen_amy = not args.mia_only

    # Support range: if two ints given, treat as start..end
    if len(args.days) == 2 and args.days[0] < args.days[1]:
        day_range = range(args.days[0], args.days[1] + 1)
    else:
        day_range = args.days

    for day in day_range:
        generate_day_html(client, day, generate_mia=gen_mia, generate_amy=gen_amy)

    print("\n🎉 完成！用浏览器打开 HTML 文件，Ctrl+P 打印（推荐 A4 / 页边距：默认）")
    print("📁 文件位置：", SCRIPT_DIR)

if __name__ == "__main__":
    main()
