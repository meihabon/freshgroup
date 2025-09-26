# reports.py
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from db import get_db_connection
import io, csv
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
import matplotlib.pyplot as plt

router = APIRouter()


# === Utility: Fetch latest dataset of students (with clusters if available) ===
async def get_all_students_from_db():
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest = cursor.fetchone()
    if not latest:
        cursor.close()
        connection.close()
        return []

    cursor.execute("SELECT id FROM clusters WHERE dataset_id = %s ORDER BY id DESC LIMIT 1", (latest["id"],))
    cluster = cursor.fetchone()

    if cluster:
        cursor.execute("""
            SELECT s.*, sc.cluster_number
            FROM students s
            LEFT JOIN student_cluster sc 
                ON s.id = sc.student_id AND sc.cluster_id = %s
            WHERE s.dataset_id = %s
        """, (cluster["id"], latest["id"]))
    else:
        cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (latest["id"],))

    students = cursor.fetchall()
    cursor.close()
    connection.close()
    return students


# === Reports Endpoint ===
@router.get("/api/reports/{report_type}")
async def export_report(report_type: str, format: str = Query("pdf")):
    students = await get_all_students_from_db()
    if not students:
        raise HTTPException(status_code=404, detail="No student data found")

    # ===== Define report types =====
    summary_data, student_headers, student_rows, show_charts, recommendations = {}, [], [], False, ""

    if report_type == "dashboard_summary":
        title = "Dashboard Summary Report"
        total_students = len(students)

        # Count categories
        sex_counts, program_counts, municipality_counts, income_counts, shs_counts, honors_counts = {}, {}, {}, {}, {}, {}
        for s in students:
            sex_counts[s["sex"]] = sex_counts.get(s["sex"], 0) + 1
            program_counts[s["program"]] = program_counts.get(s["program"], 0) + 1
            municipality_counts[s["municipality"]] = municipality_counts.get(s["municipality"], 0) + 1
            income_counts[s["IncomeCategory"]] = income_counts.get(s["IncomeCategory"], 0) + 1
            shs_counts[s["SHS_type"]] = shs_counts.get(s["SHS_type"], 0) + 1
            honors_counts[s["Honors"]] = honors_counts.get(s["Honors"], 0) + 1

        # Most common values
        most_common = lambda d: max(d, key=d.get) if d else "N/A"
        summary_data = {
            "Total Students": total_students,
            "Most Common Sex": most_common(sex_counts),
            "Most Common Program": most_common(program_counts),
            "Most Common Municipality": most_common(municipality_counts),
            "Most Common Income Category": most_common(income_counts),
            "Most Common SHS Type": most_common(shs_counts),
            "Most Common Honors": most_common(honors_counts),
        }

        student_headers = ["Name", "Sex", "Program", "Municipality", "Income", "SHS Type", "GWA", "Honors", "IncomeCategory"]
        student_rows = [
            [s["name"], s["sex"], s["program"], s["municipality"], str(s["income"]), s["SHS_type"], str(s["GWA"]), s["Honors"], s["IncomeCategory"]]
            for s in students
        ]
        show_charts = {
            "Sex Distribution": sex_counts,
            "Program Distribution": program_counts,
            "Municipality Distribution": municipality_counts,
            "Income Distribution": income_counts,
            "SHS Type Distribution": shs_counts,
            "Honors Distribution": honors_counts,
        }
        recommendations = "These insights help guide scholarship allocation (income), curriculum planning (programs), and student support initiatives (sex, SHS type, municipality)."

    elif report_type == "income_analysis":
        title = "Income Analysis Report"
        summary_data = {}
        for s in students:
            summary_data[s["IncomeCategory"]] = summary_data.get(s["IncomeCategory"], 0) + 1
        student_headers = ["Name", "Income", "IncomeCategory"]
        student_rows = [[s["name"], str(s["income"]), s["IncomeCategory"]] for s in students]
        recommendations = "Income analysis helps OSAS and the institution identify which income groups need financial assistance or scholarships most."

    elif report_type == "honors_report":
        title = "Honors Report"
        summary_data = {}
        for s in students:
            summary_data[s["Honors"]] = summary_data.get(s["Honors"], 0) + 1
        student_headers = ["Name", "GWA", "Honors"]
        student_rows = [[s["name"], str(s["GWA"]), s["Honors"]] for s in students]
        recommendations = "This report helps in recognizing high-performing students and designing honors-based incentives."

    elif report_type == "municipality_report":
        title = "Municipality Report"
        summary_data = {}
        for s in students:
            summary_data[s["municipality"]] = summary_data.get(s["municipality"], 0) + 1
        student_headers = ["Name", "Municipality"]
        student_rows = [[s["name"], s["municipality"]] for s in students]
        recommendations = "This helps the institution understand which municipalities contribute the most students, aiding outreach and partnerships."

    elif report_type == "shs_report":
        title = "Senior High School Background Report"
        summary_data = {}
        for s in students:
            summary_data[s["SHS_type"]] = summary_data.get(s["SHS_type"], 0) + 1
        student_headers = ["Name", "SHS Type"]
        student_rows = [[s["name"], s["SHS_type"]] for s in students]
        recommendations = "SHS background analysis helps identify preparation gaps among students and adjust bridging programs."

    elif report_type == "cluster_analysis":
        title = "Cluster Analysis Report"
        summary_data = {}
        for s in students:
            cluster_num = s.get("cluster_number")
            if cluster_num is not None:
                summary_data[f"Cluster {cluster_num}"] = summary_data.get(f"Cluster {cluster_num}", 0) + 1
        if not summary_data:
            summary_data = {"No clusters found": 0}

        student_headers = ["Cluster", "Name", "GWA", "Income"]
        sorted_students = sorted(students, key=lambda s: (s.get("cluster_number") if s.get("cluster_number") is not None else 999, s["GWA"]))
        student_rows = [
            [s["cluster_number"] if s.get("cluster_number") is not None else "N/A", s["name"], str(s["GWA"]), str(s["income"])]
            for s in sorted_students
        ]
        recommendations = "Cluster analysis groups students by performance and financial background (GWA & income). This helps design targeted academic support and financial aid strategies."

    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    # ===== CSV Export =====
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Summary", "Count"])
        for k, v in summary_data.items():
            writer.writerow([k, v])
        writer.writerow([])
        writer.writerow(student_headers)
        for row in student_rows:
            writer.writerow(row)
        return StreamingResponse(io.BytesIO(buffer.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={report_type}.csv"})

    # ===== PDF Export =====
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1, 20)]

    # Summary
    story.append(Paragraph("<b>Summary Statistics:</b>", styles["Heading2"]))
    for k, v in summary_data.items():
        story.append(Paragraph(f"{k}: <b>{v}</b>", styles["Normal"]))
    story.append(Spacer(1, 20))

    # Charts (if applicable)
    if isinstance(show_charts, dict):
        def add_chart(data_dict, title):
            fig, ax = plt.subplots()
            if len(data_dict) <= 6:
                ax.pie(data_dict.values(), labels=data_dict.keys(), autopct="%1.1f%%")
            else:
                ax.bar(data_dict.keys(), data_dict.values())
                ax.tick_params(axis="x", rotation=45)
            ax.set_title(title)
            img_buf = io.BytesIO()
            fig.savefig(img_buf, format="png", bbox_inches="tight")
            plt.close(fig)
            img_buf.seek(0)
            story.append(Image(img_buf, width=5*inch, height=3*inch))
            story.append(Spacer(1, 20))

        for chart_title, data in show_charts.items():
            add_chart(data, chart_title)

    # Recommendations
    if recommendations:
        story.append(Paragraph("<b>Insights & Recommendations:</b>", styles["Heading2"]))
        story.append(Paragraph(recommendations, styles["Normal"]))
        story.append(Spacer(1, 20))

    # Student Table
    story.append(Paragraph("<b>Student List:</b>", styles["Heading2"]))
    table_data = [student_headers] + student_rows
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
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={report_type}.pdf"})
