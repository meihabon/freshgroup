import pandas as pd
from typing import Any

_INVALID_TEXT = {"", "incomplete", "n/a", "na", "none", None}

def _text_invalid(val: Any) -> bool:
    if val is None:
        return True
    try:
        s = str(val).strip().lower()
    except Exception:
        return True
    return s in _INVALID_TEXT

def _num_invalid(val: Any) -> bool:
    # invalid if missing, non-numeric, or <= 0
    try:
        if val is None:
            return True
        if isinstance(val, str) and val.strip().lower() in _INVALID_TEXT:
            return True
        num = float(val)
        return not (num > 0)
    except Exception:
        return True

def is_row_complete(row: dict) -> bool:
    """
    Row is a mapping (dict-like) with keys possibly including:
    firstname, lastname, sex, program, municipality, income, shs_type, gwa
    Returns True only if ALL required fields are present and valid.
    """
    required_text = ["firstname", "lastname", "sex", "program", "municipality", "shs_type"]
    required_num = ["income", "gwa"]

    for t in required_text:
        if t not in row:
            return False
        if _text_invalid(row.get(t)):
            return False

    for n in required_num:
        if n not in row:
            return False
        if _num_invalid(row.get(n)):
            return False

    return True

def filter_complete_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns a df consisting only of rows that pass is_row_complete.
    Normalizes column names (lowercase) where applicable.
    """
    df = df.copy()
    # ensure lowercase canonical column names exist to match other modules
    df.columns = [c.strip() for c in df.columns]
    # Use lower-case column names for checking presence
    colmap = {c.lower(): c for c in df.columns}
    # map canonical names to actual columns if uppercase variants exist
    canonical_names = ["firstname","lastname","sex","program","municipality","income","shs_type","gwa"]
    # create a lower-cased canonical column if present under variant name
    for can in canonical_names:
        found = None
        for k in colmap:
            if k == can:
                found = colmap[k]
                break
        if not found:
            # some datasets use 'GWA' uppercase, etc. try case-insensitive:
            for k in colmap:
                if k.lower() == can:
                    found = colmap[k]
                    break
        if found and can not in df.columns:
            df[can] = df[found]
        elif can not in df.columns:
            df[can] = None

    # coerce numeric columns to numeric (so valid numeric check works)
    df["income"] = pd.to_numeric(df["income"], errors="coerce")
    df["gwa"] = pd.to_numeric(df["gwa"], errors="coerce")

    mask = df.apply(lambda r: is_row_complete(r.to_dict()), axis=1)
    return df[mask].reset_index(drop=True)
