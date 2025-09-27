from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io, csv, json
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
import matplotlib.pyplot as plt
from dependencies import get_current_user

from db import get_db_connection

router = APIRouter()

# Fetch all students from latest dataset
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


# Playground clustering endpoint
@router.get("/clusters/playground")
async def cluster_playground(
    k: int = Query(..., ge=2, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Runs clustering on the latest dataset with user-specified k (Playground mode).
    Returns students + centroids so frontend can display them.
    Available to both Admins and Viewers.
    """
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    # Get latest dataset
    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    dataset = cursor.fetchone()
    if not dataset:
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="No dataset found")
    dataset_id = dataset["id"]

    # Get students for this dataset
    cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    students = cursor.fetchall()
    cursor.close()
    connection.close()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for latest dataset")

    if k > len(students):
        raise HTTPException(status_code=400, detail="k cannot be greater than the number of students")

    # Run clustering
    df = pd.DataFrame(students)
    features = ["GWA", "income"]
    X = df[features].fillna(0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)

    # convert centroids back to original scale
    centroids_scaled = kmeans.cluster_centers_
    centroids = scaler.inverse_transform(centroids_scaled).tolist()

    df["Cluster"] = clusters

    return {
        "students": df.to_dict(orient="records"),
        "centroids": centroids
    }


# Export playground clustering results
@router.get("/reports/cluster_playground")
async def export_cluster_playground(
    k: int = Query(3, ge=2, le=10),
    format: str = Query("pdf"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export playground clustering results (PDF or CSV).
    Available to both Admins and Viewers.
    """
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    students = fetch_students()
    if not students:
        raise HTTPException(status_code=404, detail="No dataset found")

    df = pd.DataFrame(students)
    features = ["GWA", "income"]
    X = df[features].fillna(0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    df["Cluster"] = kmeans.fit_predict(X_scaled)

    cluster_counts = df["Cluster"].value_counts().to_dict()

    # === CSV Export ===
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Cluster", "Count"])
        for c, v in cluster_counts.items():
            writer.writerow([f"Cluster {c}", v])
        writer.writerow([])
        writer.writerow(["Name", "GWA", "Income", "Cluster"])
        for _, row in df.iterrows():
            writer.writerow([row["name"], row["GWA"], row["income"], row["Cluster"]])
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
        story.append(Paragraph(f"Cluster {c}: <b>{v}</b>", styles["Normal"]))
    story.append(Spacer(1, 20))

    # Chart
    fig, ax = plt.subplots()
    ax.bar(cluster_counts.keys(), cluster_counts.values())
    ax.set_title("Cluster Distribution")
    img_buf = io.BytesIO()
    fig.savefig(img_buf, format="png", bbox_inches="tight")
    plt.close(fig)
    img_buf.seek(0)
    from reportlab.platypus import Image
    story.append(Image(img_buf, width=5*inch, height=3*inch))
    story.append(Spacer(1, 20))

    # Students table
    table_data = [["Name", "Program", "Municipality", "Income", "Income Category", "SHS Type", "GWA", "Honors", "Cluster"]] + \
        df[["name", "program", "municipality", "income", "IncomeCategory", "SHS_type", "GWA", "Honors", "Cluster"]].values.tolist()
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
