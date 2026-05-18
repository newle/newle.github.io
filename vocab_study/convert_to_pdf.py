#!/usr/bin/env python3
import os
import subprocess
import glob
import tempfile
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(DIR, "pdf")
os.makedirs(PDF_DIR, exist_ok=True)

html_files = sorted(glob.glob(os.path.join(DIR, "*.html")))
print(f"Found {len(html_files)} HTML files")

def convert(html_path):
    name = os.path.splitext(os.path.basename(html_path))[0]
    out = os.path.join(PDF_DIR, name + ".pdf")
    if os.path.exists(out):
        return f"SKIP {name}"
    tmpdir = tempfile.mkdtemp(prefix="chrome_")
    try:
        result = subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--no-sandbox",
             f"--user-data-dir={tmpdir}",
             f"--print-to-pdf={out}", f"file://{html_path}"],
            capture_output=True, timeout=60
        )
        if os.path.exists(out):
            return f"OK   {name}"
        return f"FAIL {name}: {result.stderr.decode()[:80]}"
    except subprocess.TimeoutExpired:
        return f"TIMEOUT {name}"
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

done = 0
total = len(html_files)
with ThreadPoolExecutor(max_workers=25) as ex:
    futures = {ex.submit(convert, f): f for f in html_files}
    for fut in as_completed(futures):
        msg = fut.result()
        done += 1
        print(f"[{done:3d}/{total}] {msg}", flush=True)

pdf_count = len(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
print(f"\nDone. {pdf_count} PDFs in {PDF_DIR}")
