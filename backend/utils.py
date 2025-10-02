import pandas as pd

# -------------------------
# Normalizer
# -------------------------
def normalize_value(value, field_name: str):
    """
    Normalizes dataset values:
    - Converts NaN, None, empty strings, or 'Incomplete' → "No ___ Entered"
    - Leaves valid values intact
    """
    if pd.isna(value) or value is None:
        return f"No {field_name} Entered"
    if isinstance(value, str) and value.strip().lower() in ["", "incomplete", "n/a", "na", "none"]:
        return f"No {field_name} Entered"
    return value


# -------------------------
# Classification: Honors
# -------------------------
def classify_honors(data):
    """
    Classify student honors.
    - Accepts: row (pd.Series or dict) OR raw float GWA.
    """

    if isinstance(data, (dict, pd.Series)):
        gwa = data.get("gwa")
        all_pass = data.get("all_pass", True)
        conduct_issue = data.get("conduct_issue", False)
    else:
        gwa = data
        all_pass = True
        conduct_issue = False

    # Handle blanks
    if gwa is None or (isinstance(gwa, str) and gwa.strip() == ""):
        return "No GWA Entered"

    try:
        gwa = float(gwa)
    except Exception:
        return "No GWA Entered"

    if pd.isna(gwa):
        return "No GWA Entered"

    # Custom rules
    if not all_pass or conduct_issue:
        return "Average"

    if 98 <= gwa <= 100:
        return "With Highest Honors"
    elif 95 <= gwa < 98:
        return "With High Honors"
    elif 90 <= gwa < 95:
        return "With Honors"
    return "Average"


# -------------------------
# Classification: Income
# -------------------------
def classify_income(data):
    """
    Classify income category.
    - Accepts: row (pd.Series or dict) OR raw float income.
    """

    if isinstance(data, (dict, pd.Series)):
        income = data.get("income")
    else:
        income = data

    # Handle blanks
    if income is None or (isinstance(income, str) and income.strip() == ""):
        return "No Income Entered"

    try:
        income = float(income)
    except Exception:
        return "No Income Entered"

    if pd.isna(income) or income == 0:
        return "No Income Entered"

    # Thresholds
    if income < 12030:
        return "Poor"
    elif income < 24060:
        return "Low-Income"
    elif income < 48120:
        return "Lower-Middle"
    elif income < 84210:
        return "Middle-Middle"
    elif income < 144360:
        return "Upper-Middle"
    elif income < 240600:
        return "Upper-Income"
    return "Rich"


# -------------------------
# Normalize student record for DB (insert/update)
# -------------------------
def normalize_student_record_db(student: dict) -> dict:
    """
    Clean a student record for database storage.
    Keeps None for text blanks and None for missing numerics.
    Auto-classifies honors and income category.
    """

    def safe_text(val):
        if val is None or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
            return None
        return str(val).strip()

    def safe_num(val):
        if val is None or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
            return None
        try:
            return float(val)
        except:
            return None

    firstname = safe_text(student.get("firstname"))
    lastname = safe_text(student.get("lastname"))
    sex = safe_text(student.get("sex"))
    program = safe_text(student.get("program"))
    municipality = safe_text(student.get("municipality"))
    shs_type = safe_text(student.get("SHS_type"))

    income = safe_num(student.get("income"))
    gwa = safe_num(student.get("GWA"))

    return {
        "firstname": firstname,
        "lastname": lastname,
        "sex": sex,
        "program": program,
        "municipality": municipality,
        "SHS_type": shs_type,
        "income": income,
        "GWA": gwa,
        "Honors": classify_honors(gwa if isinstance(gwa, float) else None),
        "IncomeCategory": classify_income(income if isinstance(income, float) else None),
    }


# -------------------------
# Normalize student record for Display/Export
# -------------------------
def normalize_student_record_display(student: dict) -> dict:
    """
    Normalize a student record for frontend/export.
    Keeps numeric fields as numbers for clustering,
    adds *_display fields for human-readable placeholders.
    """

    def safe_text(val, placeholder):
        if val is None or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none", "incomplete"]:
            return placeholder
        return str(val).strip()

    def safe_num(val):
        if val is None or (isinstance(val, str) and val.strip().lower() in ["", "n/a", "na", "none", "incomplete"]):
            return None
        try:
            return float(val)
        except:
            return None

    firstname = safe_text(student.get("firstname"), "No First Name Entered")
    lastname = safe_text(student.get("lastname"), "No Last Name Entered")
    sex = safe_text(student.get("sex"), "Not Specified")
    program = safe_text(student.get("program"), "No Program Entered")
    municipality = safe_text(student.get("municipality"), "No Municipality Entered")
    shs_type = safe_text(student.get("SHS_type"), "No SHS Type Entered")

    income = safe_num(student.get("income"))
    gwa = safe_num(student.get("GWA"))

    return {
        "firstname": firstname,
        "lastname": lastname,
        "sex": sex,
        "program": program,
        "municipality": municipality,
        "SHS_type": shs_type,
        # keep numerics for clustering
        "income": income,
        "GWA": gwa,
        # add display-friendly fields
        "income_display": f"₱{income:,.0f}" if isinstance(income, (int, float)) else "No Income Entered",
        "GWA_display": f"{gwa:.2f}" if isinstance(gwa, (int, float)) else "No GWA Entered",
        # derived classifications
        "Honors": classify_honors(gwa if isinstance(gwa, float) else None),
        "IncomeCategory": classify_income(income if isinstance(income, float) else None),
    }
