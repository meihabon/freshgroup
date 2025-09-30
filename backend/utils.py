import pandas as pd

def classify_honors(row):
    gwa = row.get('gwa')

    # Handle missing/blank GWA
    if pd.isna(gwa) or gwa == "" or gwa is None:
        return "No GWA Entered"

    try:
        gwa = float(gwa)
    except:
        return "No GWA Entered"

    # Optional dataset flags
    all_pass = row.get('all_pass', True)
    conduct_issue = row.get('conduct_issue', False)

    if not all_pass or conduct_issue:
        return "Average"

    if 98 <= gwa <= 100:
        return "With Highest Honors"
    elif 95 <= gwa < 98:
        return "With High Honors"
    elif 90 <= gwa < 95:
        return "With Honors"
    return "Average"

def classify_income(income):
    # Handle missing/blank income
    if pd.isna(income) or income == "" or income is None:
        return "No Income Entered"

    try:
        income = float(income)
    except:
        return "No Income Entered"

    if income == 0:
        return "No Income Entered"
    elif income < 12030:
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
