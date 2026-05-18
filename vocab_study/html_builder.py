#!/usr/bin/env python3
"""
html_builder.py  —  共用 HTML 生成器
用法: python3 html_builder.py <day_num> <word_data.json>
word_data.json 格式:
  {
    "mia": [{word,pron,cn,en_def,example,usage,mnemonic,fmt_example}, ...],
    "amy": [{...}, ...]   (可为空列表)
  }
"""
import sys, json, random, html as html_mod, os
from datetime import date, timedelta

OUTPUT_DIR  = os.path.dirname(os.path.abspath(__file__))
START_DATE  = date(2026, 5, 18)
MIA_TEST, MIA_PASS = 20, 16
AMY_TEST, AMY_PASS = 18, 15

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Serif SC', 'STSong', serif; font-size: 9px; color: #111; background: #fff; }
/* 学习卷：双栏网格；测试卷 & 答案页：普通流 */
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
/* ── 单词卡（精简版：只保留例句 + 考研用法） ── */
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
/* 隐藏：hr(2) · 英文解释 label+content(3,4) · 例句 label(5) · 考研用法 label(7) · 助记 label(9) · fmt-line(11) */
.word-card > :nth-child(2), .word-card > :nth-child(3), .word-card > :nth-child(4),
.word-card > :nth-child(5), .word-card > :nth-child(7),
.word-card > :nth-child(9),
.word-card > :nth-child(11) { display: none; }
/* 例句 content(6)：斜体灰色，限 1 行 */
.word-card > :nth-child(6) { font-style: italic; color: #555; margin-left: 0;
                              font-size: 8px; line-height: 1.3; max-height: 1.4em; overflow: hidden; }
/* 考研用法 content(8)：限 2 行 */
.word-card > :nth-child(8) { font-size: 8px; line-height: 1.3; max-height: 2.7em; overflow: hidden; }
/* 助记 content(10)：小字灰色带左边框，限 2 行 */
.word-card > :nth-child(10) { font-size: 7.5px; line-height: 1.3; color: #777; margin-left: 0;
                               max-height: 2.6em; overflow: hidden;
                               border-left: 2px solid #e0e0e0; padding-left: 3px; margin-top: 1px; }
/* ── 测试卷 ── */
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
/* ── 答案页 ── */
.key-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 5px; }
.key-item { font-size: 9px; background: #f5f5f5; border: 1px solid #ddd;
            padding: 3px 5px; border-radius: 2px; }
.key-item strong { color: #000; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* 学习卷后强制换页；测试卷与答案页同页（avoid 避免在测试卷后换页） */
  .page:first-child  { page-break-after: always; }
  .page:nth-child(2) { page-break-after: avoid; }
}
"""

def e(s):
    return html_mod.escape(str(s) if s else "")

def short_cn(cn):
    s = cn.split("；")[0]
    for pfx in ("n.","v.","adj.","adv.","prep.","pron.","conj.","int."):
        s = s.replace(pfx, "").strip()
    return s.strip()[:22]

def study_card(i, w):
    return f"""
<div class="word-card">
  <div class="word-header">
    <span style="color:#888;font-size:11px;min-width:22px">{i}.</span>
    <span class="word-en">{e(w.get('word',''))}</span>
    <span class="word-pron">{e(w.get('pron',''))}</span>
    <span class="word-cn">{e(w.get('cn',''))}</span>
  </div>
  <hr class="divider-line">
  <div class="label">📖 英文解释</div>
  <div class="content">{e(w.get('en_def',''))}</div>
  <div class="label">✏️ 例句</div>
  <div class="content">{e(w.get('example',''))}</div>
  <div class="label">🌍 考研用法 &amp; 搭配</div>
  <div class="content">{e(w.get('usage',''))}</div>
  <div class="label">🧠 助记</div>
  <div class="content">{e(w.get('mnemonic',''))}</div>
  <div class="fmt-line">{e(w.get('word',''))}::{e(w.get('pron',''))}:{e(w.get('cn','').split('；')[0][:20])}:{e(w.get('fmt_example',''))}</div>
</div>"""

def study_page(name, date_str, day, words, n_test, n_pass):
    cards = "".join(study_card(i+1, w) for i, w in enumerate(words))
    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">📚 {e(name)} · 考研词汇 · Day {day} · 学习卷</div>
    <div class="meta">日期：{e(date_str)}<br>
      <span class="pass-bar">考试 {n_test} 题 · 过关线 {n_pass} 题</span></div>
  </div>
  {cards}
</div>"""

def test_page(name, date_str, day, all_w, test_w, n_pass):
    pool = "".join(f'<span>{i+1}. <b>{e(w["word"])}</b></span>' for i, w in enumerate(all_w))
    half = len(test_w) // 2
    pa, pb = test_w[:half], test_w[half:]
    rows_a = "".join(
        f'<div class="q-row"><span class="q-num">{i+1}.</span>'
        f'<span class="q-text"><b>{e(w["word"])}</b> 意思是：<span class="answer-blank"></span></span></div>'
        for i, w in enumerate(pa))
    rows_b = "".join(
        f'<div class="q-row"><span class="q-num">{i+1+len(pa)}.</span>'
        f'<span class="q-text">{e(short_cn(w.get("cn","")))} → 英文：<span class="answer-blank"></span></span></div>'
        for i, w in enumerate(pb))
    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">📝 {e(name)} · 考研词汇 · Day {day} · 测试卷</div>
    <div class="meta">日期：{e(date_str)}<br>共 <strong>{len(test_w)}</strong> 题 · 过关线 <strong>{n_pass}</strong> 题<br>
      姓名签字：___________</div>
  </div>
  <div class="test-intro">📌 词汇库（本日共学 {len(all_w)} 个单词）</div>
  <div class="test-word-pool">{pool}</div>
  <div class="part-title">Part A · 看单词写中文（共 {len(pa)} 题）</div>{rows_a}
  <div class="part-title">Part B · 看中文写单词（共 {len(pb)} 题）</div>{rows_b}
  <div style="margin-top:18px;font-size:12px;color:#555">
    得分：________ / {len(test_w)} &nbsp;&nbsp; 是否过关：□ 是 &nbsp; □ 否 &nbsp;&nbsp;&nbsp; 家长签字：___________
  </div>
</div>"""

def answer_page(name, date_str, day, all_w, test_w):
    half = len(test_w) // 2
    pa, pb = test_w[:half], test_w[half:]
    ka = "".join(f'<div class="key-item">A{i+1}. <strong>{e(w["word"])}</strong><br><small>{e(w.get("cn","")[:18])}</small></div>' for i, w in enumerate(pa))
    kb = "".join(f'<div class="key-item">B{i+1}. {e(short_cn(w.get("cn",""))[:12])}<br>→ <strong>{e(w["word"])}</strong></div>' for i, w in enumerate(pb))
    return f"""
<div class="page">
  <div class="sheet-header">
    <div class="title">🔑 {e(name)} · Day {day} · 答案（家长保管）</div>
    <div class="meta">日期：{e(date_str)}</div>
  </div>
  <div class="part-title">Part A 答案</div><div class="key-grid">{ka}</div>
  <div class="part-title" style="margin-top:14px">Part B 答案</div><div class="key-grid">{kb}</div>
  <div style="margin-top:20px;font-size:11px;color:#777;border-top:1px dashed #ccc;padding-top:8px">
    本页为答案页，请家长批改后告知孩子得分。过关后方可开始下一天学习。</div>
</div>"""

def wrap_html(pages):
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>考研词汇</title>
<style>{CSS}</style></head><body>{"".join(pages)}</body></html>"""

def build(day_num, data):
    d = START_DATE + timedelta(days=day_num - 1)
    wdn = ["周一","周二","周三","周四","周五","周六","周日"][d.weekday()]
    date_key = d.strftime("%Y%m%d")
    date_str = f"{d.year}年{d.month}月{d.day}日（{wdn}）"

    for name, words, n_test, n_pass in [
        ("Mia", data.get("mia", []), MIA_TEST, MIA_PASS),
        ("Amy", data.get("amy", []), AMY_TEST, AMY_PASS),
    ]:
        if not words:
            continue
        rng = random.Random(20260518 + day_num + (0 if name=="Mia" else 100))
        test_w = rng.sample(words, min(n_test, len(words)))
        pages = [
            study_page(name, date_str, day_num, words, n_test, n_pass),
            test_page (name, date_str, day_num, words, test_w, n_pass),
            answer_page(name, date_str, day_num, words, test_w),
        ]
        out = os.path.join(OUTPUT_DIR, f"{name}_Day{day_num:03d}_{date_key}.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(wrap_html(pages))
        print(f"✓ {name} Day {day_num} → {os.path.basename(out)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 html_builder.py <day_num> <word_data.json>")
        sys.exit(1)
    day_num = int(sys.argv[1])
    with open(sys.argv[2], encoding="utf-8") as f:
        data = json.load(f)
    build(day_num, data)
