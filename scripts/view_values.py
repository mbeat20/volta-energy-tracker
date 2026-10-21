"""Open any table from eda.py in the browser.

Run:  python scripts/view_values.py                      # values (default)
      python scripts/view_values.py readings_installed   # any DataFrame in eda.py
"""

import sys
import webbrowser
from pathlib import Path

import pandas as pd

import eda

name = sys.argv[1] if len(sys.argv) > 1 else "values"
df = getattr(eda, name, None)
if not isinstance(df, pd.DataFrame):
    tables = [k for k, v in vars(eda).items() if isinstance(v, pd.DataFrame)]
    sys.exit(f"No table called {name!r}. Available: {', '.join(tables)}")

OUT = Path(__file__).resolve().parent / f"{name}.html"

style = """
<style>
  body { background: #0a0a0a; color: #e5e5e5; font-family: Inter, system-ui, sans-serif; padding: 24px; }
  table { border-collapse: collapse; font-size: 14px; }
  th, td { padding: 6px 12px; border-bottom: 1px solid #262626; text-align: left; }
  th { position: sticky; top: 0; background: #171717; }
  tr:hover td { background: #1f1f1f; }
</style>
"""
html = df.fillna("").to_html(border=0)
OUT.write_text(
    f"<!doctype html><meta charset='utf-8'><title>{name}</title>{style}"
    f"<h2>{name} ({len(df)} rows)</h2>{html}",
    encoding="utf-8",
)
print(f"Wrote {OUT}")
webbrowser.open(OUT.as_uri())
