"""Load the raw seed data into pandas DataFrames for exploration.

Nothing is cleaned, coerced, deduplicated or dropped. Every CSV value comes in
as the exact string from the file, so whitespace, mixed date formats, "N/A",
blank values and the various boolean spellings all stay visible.

Run interactively:  python -i scripts/eda.py
"""

import json
from pathlib import Path

import pandas as pd

SEED = Path(__file__).resolve().parent.parent / "seed"


def load_json(name: str) -> pd.DataFrame:
    # json.load + DataFrame rather than pd.read_json, which would infer dates.
    with open(SEED / name, encoding="utf-8") as f:
        return pd.DataFrame(json.load(f))


members = load_json("members.json")
meters = load_json("meters.json")

# utf-8-sig only removes the file's byte-order mark so the first column is
# "reading_id" rather than "﻿reading_id"; cell values are untouched.
readings = pd.read_csv(
    SEED / "readings.csv",
    encoding="utf-8-sig",
    dtype=str,
    keep_default_na=False,  # keep "" and "N/A" as literal strings, not NaN
    skipinitialspace=False,
)

# Trimmed copy: strip surrounding whitespace from every cell and upper-case
# meter_id so " MTR-1012" and "mtr-1010 " match their meters. Nothing else is
# changed; `readings` stays exactly as loaded.
readings_trimmed = readings.apply(lambda col: col.str.strip())
readings_trimmed["meter_id"] = readings_trimmed["meter_id"].str.upper()

# One row per reading, with its meter and member alongside. Outer joins keep
# every record from all three tables, with the columns from the missing side
# left as NaN.
combined = readings_trimmed.merge(meters, on="meter_id", how="outer").merge(
    members, on="member_id", how="outer"
)

# The value column with just enough context to judge it. value is still the
# raw string, so "", "N/A" and "2512,40" are visible as-is.
values = combined[
    ["reading_id", "meter_id", "member_id", "name", "fuel", "unit", "taken_at", "value"]
]

# Every reading column plus the meter's install date. Left join so readings for
# unknown meters (MTR-9999, MTR-1013) are kept with installed_on blank.
readings_installed = readings_trimmed.merge(
    meters[["meter_id", "installed_on"]], on="meter_id", how="left"
)

# How often each distinct value appears in source and verified, as written
# (so "true" and "TRUE" are counted separately).
value_counts = pd.concat(
    [
        readings_trimmed[col].value_counts().rename_axis("value").reset_index().assign(column=col)
        for col in ["source", "verified"]
    ],
    ignore_index=True,
)[["column", "value", "count"]]

if __name__ == "__main__":
    pd.set_option("display.width", 200)
    pd.set_option("display.max_columns", None)
    for name, df in [
        ("members", members),
        ("meters", meters),
        ("readings", readings),
        ("combined", combined),
        ("values", values),
        ("readings_installed", readings_installed),
        ("value_counts", value_counts),
    ]:
        print(f"\n=== {name}: {df.shape[0]} rows x {df.shape[1]} cols")
        print(df.dtypes.to_string())
        print(df.head().to_string())
