from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io, csv
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
import matplotlib.pyplot as plt
from dependencies import get_current_user
from db import get_db_connection
from utils import classify_location
from utils import encode_features, describe_cluster

router = APIRouter()

# ----------------------------
# Utility: Fetch latest students
# ----------------------------
def fetch_students():
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest = cursor.fetchone()
    if not latest:
        return []

    cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (latest["id"],))
    students = cursor.fetchall()
    cursor.close()
    connection.close()
    return students


# ----------------------------
# Playground clustering endpoint
# ----------------------------
@router.get("/clusters/playground")
async def cluster_playground(
    k: int = Query(..., ge=2, le=10),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    students = fetch_students()
    if not students:
        raise HTTPException(status_code=404, detail="No students found for latest dataset")

    df = pd.DataFrame(students)
    df = encode_features(df)

    feature_cols = ["gwa", "income", "sex_code", "shs_code", "location_code"] + \
                   [c for c in df.columns if c.startswith("program_")]

    if k > len(df):
        raise HTTPException(status_code=400, detail="k cannot be greater than the number of students")

    X = df[feature_cols].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    df["Cluster"] = kmeans.fit_predict(X_scaled)

    centroids_scaled = kmeans.cluster_centers_
    centroids = scaler.inverse_transform(centroids_scaled).tolist()

    # Add human-readable cluster labels
    cluster_labels = {c: describe_cluster(df, c) for c in sorted(df["Cluster"].unique())}
    df["ClusterLabel"] = df["Cluster"].map(cluster_labels)

    return {
        "students": df.to_dict(orient="records"),
        "centroids": centroids,
        "cluster_labels": cluster_labels
    }


# ----------------------------
# Export playground clustering results
# ----------------------------
@router.get("/reports/cluster_playground")
async def export_cluster_playground(
    k: int = Query(3, ge=2, le=10),
    format: str = Query("pdf"),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    students = fetch_students()
    if not students:
        raise HTTPException(status_code=404, detail="No dataset found")

    df = pd.DataFrame(students)
    df = encode_features(df)

    feature_cols = ["gwa", "income", "sex_code", "shs_code", "location_code"] + \
                   [c for c in df.columns if c.startswith("program_")]

    X = df[feature_cols].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    df["Cluster"] = kmeans.fit_predict(X_scaled)

    # Add human-readable labels
    cluster_labels = {c: describe_cluster(df, c) for c in sorted(df["Cluster"].unique())}
    df["ClusterLabel"] = df["Cluster"].map(cluster_labels)

    cluster_counts = df["ClusterLabel"].value_counts().to_dict()

    # === CSV Export ===
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Cluster", "Count"])
        for c, v in cluster_counts.items():
            writer.writerow([c, v])
        writer.writerow([])
        writer.writerow([
            "Firstname", "Lastname", "Program", "Municipality", "Location",
            "Income", "Income Category", "SHS Type", "GWA", "Honors", "Cluster"
        ])
        for _, row in df.iterrows():
            writer.writerow([
                row["firstname"], row["lastname"], row["program"], row["municipality"], row["LocationCategory"],
                row["income"], row["IncomeCategory"], row["SHS_type"], row["GWA"], row["Honors"], row["ClusterLabel"]
            ])
        return StreamingResponse(
            io.BytesIO(buffer.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cluster_playground.csv"}
        )

    # === PDF Export ===
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()
    story = [Paragraph(f"Playground Cluster Report (k={k})", styles["Title"]), Spacer(1, 20)]

    story.append(Paragraph("<b>Cluster Summary:</b>", styles["Heading2"]))
    for c, v in cluster_counts.items():
        story.append(Paragraph(f"{c}: <b>{v}</b>", styles["Normal"]))
    story.append(Spacer(1, 20))

    fig, ax = plt.subplots()
    ax.bar(cluster_counts.keys(), cluster_counts.values())
    ax.set_title("Cluster Distribution")
    img_buf = io.BytesIO()
    fig.savefig(img_buf, format="png", bbox_inches="tight")
    plt.close(fig)
    img_buf.seek(0)
    story.append(Image(img_buf, width=5*inch, height=3*inch))
    story.append(Spacer(1, 20))

    table_data = [[
        "Firstname", "Lastname", "Program", "Municipality", "Location",
        "Income", "Income Category", "SHS Type", "GWA", "Honors", "Cluster"
    ]] + df.apply(
        lambda r: [
            r["firstname"], r["lastname"], r["program"], r["municipality"], r["LocationCategory"],
            r["income"], r["IncomeCategory"], r["SHS_type"], r["GWA"], r["Honors"], r["ClusterLabel"]
        ], axis=1
    ).tolist()

    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cluster_playground.pdf"}
    )
