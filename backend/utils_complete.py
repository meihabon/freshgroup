import pandas as pd
from typing import Iterable

PLACEHOLDER_STRINGS = {"incomplete", "n/a", "na", "none", "-1", ""}

def is_value_missing(val) -> bool:
    if val is None:
        return True
    try:
        s = str(val).strip().lower()
        if s == "":
            return True
        if s in PLACEHOLDER_STRINGS:
            return True
    except Exception:
        return True
    return False


def is_record_complete_row(row: dict) -> bool:
    """Check completeness for a single student row (dict from DB or row).

    Required fields: firstname, lastname, sex, program, municipality, income, shs_type, GWA
    income and GWA must be numeric > 0 and not placeholder values.
    """
    required = ["firstname", "lastname", "sex", "program", "municipality", "shs_type", "GWA", "income"]
    for key in required:
        if key not in row:
            return False
        val = row.get(key)
        if is_value_missing(val):
            return False

    # numeric checks
    try:
        gwa = float(row.get("GWA"))
        income = float(row.get("income"))
        if gwa <= 0 or income <= 0:
            return False
    except Exception:
        return False

    return True


def filter_complete_students_df(df: pd.DataFrame) -> pd.DataFrame:
    """Return a DataFrame containing only rows considered complete by the same rules.

    Accepts a DataFrame with columns possibly named case-insensitively (GWA/gwa etc.).
    Normalizes column names to lower-case keys and then applies the completeness filter.
    """
    if df is None or df.empty:
        return df.copy()

    # work on a copy and lowercase columns
    df2 = df.copy()
    df2.columns = [c.lower() for c in df2.columns]

    # ensure keys exist
    for col in ["firstname", "lastname", "sex", "program", "municipality", "shs_type", "gwa", "income"]:
        if col not in df2.columns:
            df2[col] = None

    def row_complete(r):
        # check placeholders and missing
        for key in ["firstname", "lastname", "sex", "program", "municipality", "shs_type"]:
            v = r.get(key)
            if is_value_missing(v):
                return False

        # numeric
        try:
            gwa = float(r.get("gwa"))
            income = float(r.get("income"))
            if gwa <= 0 or income <= 0:
                return False
        except Exception:
            return False

        return True

    mask = df2.apply(lambda r: row_complete(r.to_dict()), axis=1)
    return df.loc[mask.values].copy()
