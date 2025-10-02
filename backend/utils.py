import pandas as pd

# -------------------------------
# Academic Classification
# -------------------------------

def classify_honors(row):
    gwa = row.get('gwa')

    if pd.isna(gwa) or gwa == "" or gwa is None:
        return "No GWA Entered"

    try:
        gwa = float(gwa)
    except:
        return "No GWA Entered"

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


# -------------------------------
# Location Classification
# -------------------------------

UPLAND_MUNICIPALITIES = {
    # Ilocos Sur Upland
    "Alilem", "Banayoyo", "Sigay", "Sugpon", "Suyo", "Cervantes", "Quirino", "Salcedo",
    # La Union Upland
    "Bagulin", "Burgos", "Santol", "Sudipen"
}

LOWLAND_MUNICIPALITIES = {
    # Ilocos Sur Lowland
    "Tagudin", "Santa Cruz", "Santa Lucia", "Candon City", "Santa Maria", "San Esteban",
    "Santiago", "Narvacan", "Santa", "Santa Catalina", "San Vicente", "Vigan City",
    "Bantay", "San Ildefonso", "San Juan", "Cabugao", "Sinait", "Magsingal", "Caoayan",
    # La Union Lowland
    "Agoo", "Aringay", "Bacnotan", "Balaoan", "Bauang", "Caba", "Luna", "Naguilian",
    "Pugo", "Rosario", "San Fernando City", "San Gabriel", "San Juan", "Santo Tomas", "Tubao"
}

def classify_location(municipality: str) -> str:
    if not municipality:
        return "Unknown"

    muni = str(municipality).strip().title()
    muni = muni.replace("Sta.", "Santa").replace("Sta ", "Santa ")
    muni = muni.replace("Sto.", "Santo").replace("Sto ", "Santo ")
    muni = " ".join(muni.split())

    if muni in UPLAND_MUNICIPALITIES:
        return "Upland"
    elif muni in LOWLAND_MUNICIPALITIES:
        return "Lowland"
    return "Unknown"


# -------------------------------
# Feature Encoding for Clustering
# -------------------------------

def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare features for clustering:
    - Numeric GWA & income
    - Encode sex, SHS type, location
    - One-hot encode program
    - Handle missing values gracefully
    """
    df = df.copy()

    # ✅ Ensure required columns exist
    required_cols = ["sex", "SHS_type", "municipality", "income", "program", "GWA"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Dataset is missing required column: {col}")

    # ✅ Fill blanks in required columns with a placeholder
    df["sex"] = df["sex"].fillna("Unknown")
    df["SHS_type"] = df["SHS_type"].fillna("Unknown")
    df["municipality"] = df["municipality"].fillna("Unknown")
    df["program"] = df["program"].fillna("Unknown")

    # Sex → numeric
    df["sex_code"] = df["sex"].map({"Male": 0, "Female": 1}).fillna(-1)

    # SHS Type → numeric
    df["shs_code"] = df["SHS_type"].map({"Public": 0, "Private": 1}).fillna(-1)

    # Location (Upland/Lowland/Unknown)
    df["LocationCategory"] = df["municipality"].apply(classify_location)
    df["location_code"] = df["LocationCategory"].map({"Upland": 0, "Lowland": 1}).fillna(-1)

    # Income → numeric + category
    df["income"] = pd.to_numeric(df["income"], errors="coerce").fillna(-1)
    df["IncomeCategory"] = df["income"].apply(classify_income)

    # GWA → numeric
    df["GWA"] = pd.to_numeric(df["GWA"], errors="coerce").fillna(-1)

    # Honors → computed
    df["Honors"] = df.apply(classify_honors, axis=1)

    # One-hot encode Program
    program_dummies = pd.get_dummies(df["program"], prefix="program")
    df = pd.concat([df, program_dummies], axis=1)

    return df



# -------------------------------
# Cluster Naming
# -------------------------------

def describe_cluster(students_df: pd.DataFrame, cluster_num: int) -> str:
    """
    Generate a human-readable description of a cluster
    based on GWA, Location, Income, SHS type, and Honors.
    """
    cluster_df = students_df[students_df["Cluster"] == cluster_num]
    if cluster_df.empty:
        return f"Cluster {cluster_num}"

    # --- Location ---
    location_mode = (
        cluster_df["LocationCategory"].mode().iloc[0]
        if not cluster_df["LocationCategory"].isna().all()
        else "Mixed"
    )

    # --- GWA ---
    avg_gwa = cluster_df["GWA"].mean()
    if pd.isna(avg_gwa):
        gwa_desc = "students"
    elif avg_gwa <= 1.75:
        gwa_desc = "high-achieving"
    elif avg_gwa <= 2.25:
        gwa_desc = "moderate-achieving"
    else:
        gwa_desc = "struggling"

    # --- Income ---
    income_mode = (
        cluster_df["IncomeCategory"].mode().iloc[0]
        if not cluster_df["IncomeCategory"].isna().all()
        else "Unknown income"
    )

    # --- SHS Type ---
    shs_mode = (
        cluster_df["SHS_type"].mode().iloc[0]
        if not cluster_df["SHS_type"].isna().all()
        else "Mixed SHS"
    )
    if shs_mode not in ["Public", "Private"]:
        shs_mode = "Mixed SHS"

    # --- Honors ---
    honors_mode = (
        cluster_df["Honors"].mode().iloc[0]
        if not cluster_df["Honors"].isna().all()
        else "Varied honors"
    )

    return f"{gwa_desc.capitalize()} {location_mode} students ({honors_mode}, {income_mode}, {shs_mode})"