#!/usr/bin/env python3
"""
一次性 CSS 迁移脚本：将 vocab_study 目录下所有 HTML 文件的 <style> 替换为紧凑版布局。
用法：python3 update_css.py
"""
import os, re, glob

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

NEW_CSS = """
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

CSS_PATTERN    = re.compile(r'<style>.*?</style>', re.DOTALL)
CSS_REPLACEMENT = f'<style>{NEW_CSS}</style>'
# 删除 "今日单词：<strong>N</strong> 个<br>" 这一行（冗余）
WORD_COUNT_LINE = re.compile(r'\s*今日单词：<strong>\d+</strong> 个<br>\n?')

html_files = sorted(glob.glob(os.path.join(SCRIPT_DIR, '*.html')))
updated = 0
skipped = 0

for path in html_files:
    with open(path, encoding='utf-8') as f:
        content = f.read()

    new_content, n = CSS_PATTERN.subn(CSS_REPLACEMENT, content)
    if n == 0:
        print(f'  ⚠️  no <style> found: {os.path.basename(path)}')
        skipped += 1
        continue

    new_content = WORD_COUNT_LINE.sub('', new_content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    updated += 1

print(f'\n✅ 更新完成：{updated} 个文件已更新，{skipped} 个跳过')
