import { useState, useEffect } from "react"
import {
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Tabs,
  Tab,
  Button,
  Form,
  Modal,
  Pagination,
} from "react-bootstrap"
import { useAuth } from "../context/AuthContext"
import Plot from "react-plotly.js"
import RecordViewModal from './RecordViewModal'

/**
 * Types
 */
interface Student {
  id: number
  firstname: string
  lastname: string
  sex?: string
  program?: string
  municipality?: string
  income?: number
  SHS_type?: string
  GWA?: number
  Honors?: string
  IncomeCategory?: string
  Cluster?: number
  pair_x?: number
  pair_y?: number
  pair_x_label?: string | null
  pair_y_label?: string | null
}


interface ClusterData {
  clusters: Record<number, Student[]>
  plot_data?: {
    x: number[]
    y: number[]
    colors: number[]
    text: string[]
  }
  centroids: number[][]
  x_name?: string
  y_name?: string
  x_categories?: string[] | null
  y_categories?: string[] | null
  k?: number
}



/**
 * Component
 */
function Clusters() {
  const { API } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("official")
  const [showScatterInfo, setShowScatterInfo] = useState(false)

  const [clusterData, setClusterData] = useState<ClusterData | null>(null)
  const [playgroundData, setPlaygroundData] = useState<ClusterData | null>(null)
  const [pairwiseData, setPairwiseData] = useState<ClusterData | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)

  const [k, setK] = useState<number>(3)
  const [runningPlayground, setRunningPlayground] = useState<boolean>(false)

  const [pairX, setPairX] = useState<string>("GWA")
  const [pairY, setPairY] = useState<string>("income")
  const [runningPairwise, setRunningPairwise] = useState<boolean>(false)

  const [currentPage, setCurrentPage] = useState<number>(1)
  const studentsPerPage = 20

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null)

  const pairableFeatures = ["GWA", "income", "sex", "program", "municipality", "shs_type"]

  useEffect(() => {
    fetchOfficialClusters()
  }, [])

  useEffect(() => {
    if (activeTab === "pairwise") {
      runPairwise()
    }
  }, [activeTab, pairX, pairY, k])


  // ---------- Helpers ----------
  const getClusterColor = (clusterId: number) => {
    const palette = [
      "#E6194B",
      "#3CB44B",
      "#FFE119",
      "#4363D8",
      "#F58231",
      "#911EB4",
      "#46F0F0",
      "#F032E6",
      "#BCF60C",
      "#FABEBE",
    ]
    return palette[clusterId % palette.length]
  }
  // 🏔️ Determine Area Type based on Municipality
const getAreaType = (municipality?: string) => {
  if (!municipality || municipality.trim() === "") return "No Municipality Entered";

  const uplandMunicipalities = [
    // 📍 Ilocos Sur — 14 official upland
    "Alilem", "Banayoyo", "Burgos", "Cervantes", "Galimuyod",
    "Gregorio del Pilar", "Lidlidda", "Nagbukel", "Quirino",
    "Salcedo", "San Emilio", "Sigay", "Sugpon", "Suyo",

    // 📍 La Union — known upland
    "Bagulin", "Burgos", "Naguilian", "San Gabriel", "Santol", "Sudipen", "Tubao"
  ];

  const normalized = municipality
    .replace(/^sta\.?\s*/i, "santa ")
    .replace(/^sto\.?\s*/i, "santo ")
    .trim()
    .toLowerCase();

  const isUpland = uplandMunicipalities.some(
    (m) => m.toLowerCase() === normalized
  );

  return isUpland ? "Upland" : "Lowland";
};

const getClusterLabel = (students: Student[], clusterId?: number) => {
  if (!students || students.length === 0) return "Unclassified Cluster";

  // Average stats
  const avgGWA = students.reduce((a, s) => a + (s.GWA ?? 0), 0) / students.length;
  const avgIncome = students.reduce((a, s) => a + (s.income ?? 0), 0) / students.length;

  // --- Match backend classify_honors() ---
  let perf = "Average";
  if (avgGWA >= 98) perf = "With Highest Honors";
  else if (avgGWA >= 95) perf = "With High Honors";
  else if (avgGWA >= 90) perf = "With Honors";

  // --- Match backend classify_income() ---
  let econ = "No Income Entered";
  if (avgIncome < 12030) econ = "Poor";
  else if (avgIncome < 24060) econ = "Low-Income";
  else if (avgIncome < 48120) econ = "Lower-Middle";
  else if (avgIncome < 84210) econ = "Middle-Middle";
  else if (avgIncome < 144360) econ = "Upper-Middle";
  else if (avgIncome < 240600) econ = "Upper-Income";
  else econ = "Rich";

  // --- Municipality type detection ---
  const uplandMunicipalities = [
    // 📍 Ilocos Sur — 14 official upland municipalities
    "Alilem", "Banayoyo", "Burgos", "Cervantes", "Galimuyod",
    "Gregorio del Pilar", "Lidlidda", "Nagbukel", "Quirino",
    "Salcedo", "San Emilio", "Sigay", "Sugpon", "Suyo",

    // 📍 La Union — known upland / hilly municipalities
    "Bagulin", "Burgos", "Naguilian", "San Gabriel", "Santol", "Sudipen", "Tubao"
  ];

  // Count how many are upland vs lowland
  let uplandCount = 0;
  let lowlandCount = 0;
  const muniCounts: Record<string, number> = {};

  for (const s of students) {
    const muni = (s.municipality || "").trim();
    const muniLower = muni.toLowerCase();

    const isStaPrefix =
      muniLower.startsWith("sta") ||
      muniLower.startsWith("santa") ||
      muniLower.startsWith("santo");

    const isUpland =
      uplandMunicipalities.some((m) => m.toLowerCase() === muniLower) || isStaPrefix;

    if (isUpland) uplandCount++;
    else lowlandCount++;

    if (muni) muniCounts[muni] = (muniCounts[muni] || 0) + 1;
  }

  const total = uplandCount + lowlandCount;
  const uplandRatio = total > 0 ? uplandCount / total : 0;

  const areaType =
    uplandRatio > 0.6
      ? "mostly upland"
      : uplandRatio < 0.4
      ? "mostly lowland"
      : "mixed upland and lowland";

  const commonMuni = Object.entries(muniCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  // --- Construct descriptive label ---
  const countText = `${students.length} student${students.length !== 1 ? "s" : ""}`;
  const clusterText = clusterId !== undefined ? ` (Cluster ${clusterId})` : "";

  return `${perf} ${econ} students from ${areaType} areas (e.g., ${commonMuni}) — ${countText}${clusterText}`;
};



  const getClusterDescription = (
    students: Student[],
    xName?: string | null,
    yName?: string | null,
    isPairwise = false
  ) => {
    if (!students || students.length === 0)
      return { summary: "No students in this cluster.", recommendation: "" }

    // --- Pairwise interpretation ---
    if (isPairwise && xName && yName) {
      const xCounts: Record<string, number> = {}
      const yCounts: Record<string, number> = {}
      let sumX = 0
      let sumY = 0

      students.forEach((s: any) => {
        const xLabel = (s.pair_x_label ?? (s as any)[xName as string] ?? "N/A")
        const yLabel = (s.pair_y_label ?? (s as any)[yName as string] ?? "N/A")
        xCounts[String(xLabel)] = (xCounts[String(xLabel)] || 0) + 1
        yCounts[String(yLabel)] = (yCounts[String(yLabel)] || 0) + 1
        sumX += Number(s.pair_x ?? 0)
        sumY += Number(s.pair_y ?? 0)
      })

      const mostCommon = (counts: Record<string, number>) => {
        const entries = Object.entries(counts)
        if (!entries.length) return "N/A"
        entries.sort((a, b) => b[1] - a[1])
        return entries[0][0]
      }

      const commonX = mostCommon(xCounts)
      const commonY = mostCommon(yCounts)
      const avgX = (sumX / students.length) || 0
      const avgY = (sumY / students.length) || 0

      const summary = `
        This cluster has ${students.length} students. 
        On average, their ${xName} is ${avgX.toFixed(2)} and 
        their ${yName} is ${avgY.toFixed(2)}. 
        The most common ${xName} value is "${commonX}", 
        while for ${yName} the most frequent is "${commonY}".
      `.trim()

      const recommendation = `
        💡 Policy Recommendation: Insights are based on the selected pair 
        of ${xName} and ${yName}. Consider experimenting with other 
        feature pairs to discover alternative groupings. Support strategies 
        can then be adapted depending on which traits cluster together most strongly.
      `.trim()

      return { summary, recommendation }
    }

    // --- Default (non-pairwise) interpretation ---
    const honorsCount: Record<string, number> = {}
    const incomeCount: Record<string, number> = {}
    const programCount: Record<string, number> = {}
    const muniCount: Record<string, number> = {}
    const sexCount: Record<string, number> = {}
    let sumGWA = 0
    let sumIncome = 0

    students.forEach((s: any) => {
      const honors = s.Honors ?? "N/A"
      const income = s.IncomeCategory ?? "N/A"
      const program = s.program ?? "N/A"
      const muni = s.municipality ?? "N/A"
      const sex = s.sex ?? "N/A"

      honorsCount[honors] = (honorsCount[honors] || 0) + 1
      incomeCount[income] = (incomeCount[income] || 0) + 1
      programCount[program] = (programCount[program] || 0) + 1
      muniCount[muni] = (muniCount[muni] || 0) + 1
      sexCount[sex] = (sexCount[sex] || 0) + 1

      sumGWA += Number(s.GWA ?? 0)
      sumIncome += Number(s.income ?? 0)
    })

    const mostCommonKey = (counts: Record<string, number>) => {
      const entries = Object.entries(counts)
      if (!entries.length) return "N/A"
      entries.sort((a, b) => b[1] - a[1])
      return entries[0][0]
    }

    const commonProgram = mostCommonKey(programCount)
    const commonMuni = mostCommonKey(muniCount)
    const commonHonor = mostCommonKey(honorsCount)
    const commonSex = mostCommonKey(sexCount)
    const avgGWA = (sumGWA / students.length) || 0
    const avgIncome = (sumIncome / students.length) || 0

    const summary = `
      This cluster is composed of ${students.length} students. 
      On average, their General Weighted Average (GWA) is ${avgGWA.toFixed(2)}, 
      while the typical household income is around ₱${avgIncome.toLocaleString()}. 
      A large proportion of the group are enrolled in ${commonProgram || "Unknown"}, 
      most of whom come from ${commonMuni || "Unknown"}. 
      The distribution of sex indicates that ${commonSex || "Unknown"} is the majority, 
      and honors standing is generally at the level of "${commonHonor || "Unknown"}".
    `.trim()

    const recommendation = `
      💡 Policy Recommendation: Students in this group may benefit from 
      targeted support tailored to ${commonProgram || "Unknown"} enrollees in ${commonMuni || "Unknown"}. 
      Since their income levels are about ₱${avgIncome.toLocaleString()} and 
      their average GWA is ${avgGWA.toFixed(2)}, 
      interventions should combine both academic reinforcement and 
      moderate financial assistance. Further, consider community-specific 
      outreach for ${commonSex || "Unknown"} students to ensure equitable opportunities.
    `.trim()

    return { summary, recommendation }
  }

  // ---------- Fetch official clusters ----------
const fetchOfficialClusters = async () => {
  try {
    setLoading(true)
    const res = await API.get("/clusters")
    setClusterData(res.data)

    // ✅ If official k is available, update the state
    if (res.data.k && k === 3) {
      setK(res.data.k)
    }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to fetch clusters")
      } finally {
        setLoading(false)
      }
    }

  // ---------- Playground runner ----------
  const runPlayground = async () => {
    try {
      setRunningPlayground(true)
      setError("")
      const res = await API.get(`/clusters/playground?k=${k}`)
      const { students, centroids } = res.data

      const clusters: Record<number, Student[]> = {}
      const plot_data = { x: [] as number[], y: [] as number[], colors: [] as number[], text: [] as string[] }

      students.forEach((s: any) => {
        const cid = s.Cluster ?? 0
        if (!clusters[cid]) clusters[cid] = []
        clusters[cid].push({
          id: s.id ?? 0,
          firstname: s.firstname,
          lastname: s.lastname,
          sex: s.sex,
          program: s.program,
          municipality: s.municipality,
          income: s.income,
          SHS_type: s.SHS_type,
          GWA: s.GWA,
          Honors: s.Honors,
          IncomeCategory: s.IncomeCategory,
        })

        plot_data.x.push(s.GWA ?? 0)
        plot_data.y.push(s.income ?? 0)
        plot_data.colors.push(cid)
        plot_data.text.push(`${s.firstname} ${s.lastname}<br>GWA: ${s.GWA}<br>Income: ₱${s.income}`)
      })

      setPlaygroundData({ clusters, plot_data, centroids })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to run playground clustering")
    } finally {
      setRunningPlayground(false)
    }
  }

  // ---------- Pairwise runner ----------
  const runPairwise = async () => {
    try {
      setRunningPairwise(true)
      setError("")
      setPairwiseData(null)
      const res = await API.get(
        `/clusters/pairwise?x=${encodeURIComponent(pairX)}&y=${encodeURIComponent(pairY)}&k=${k}`
      )
      const { students, centroids, x_name, y_name, x_categories, y_categories, k: serverK } = res.data

      const clusters: Record<number, Student[]> = {}
      const plot_data = { x: [] as number[], y: [] as number[], colors: [] as number[], text: [] as string[] }

      students.forEach((s: any) => {
        const cid = s.Cluster ?? 0
        if (!clusters[cid]) clusters[cid] = []
        clusters[cid].push({
          id: s.id ?? 0,
          firstname: s.firstname,
          lastname: s.lastname,
          sex: s.sex,
          program: s.program,
          municipality: s.municipality,
          income: s.income,
          SHS_type: s.SHS_type,
          GWA: s.GWA,
          Honors: s.Honors,
          IncomeCategory: s.IncomeCategory,
          Cluster: s.Cluster,
          pair_x: s.pair_x,
          pair_y: s.pair_y,
          pair_x_label: s.pair_x_label ?? null,
          pair_y_label: s.pair_y_label ?? null,
        })

        plot_data.x.push(s.pair_x ?? 0)
        plot_data.y.push(s.pair_y ?? 0)
        plot_data.colors.push(cid)
        plot_data.text.push(`${s.firstname} ${s.lastname}<br>${x_name}: ${s.pair_x_label ?? s.pair_x}<br>${y_name}: ${s.pair_y_label ?? s.pair_y}`)
      })

      setPairwiseData({ clusters, plot_data, centroids, x_name, y_name, x_categories, y_categories, k: serverK})
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to run pairwise clustering")
    } finally {
      setRunningPairwise(false)
    }
  }

const renderClusterSection = (
  data: ClusterData | null,
  isPlayground = false,
  isPairwise = false,
  mode: "pca" | "raw" = "raw"
) => {
  if (loading && !isPlayground && !isPairwise) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 400 }}>
        <Spinner animation="border" />
      </div>
      
    )
  }

  if (error) return <Alert variant="danger">{error}</Alert>
  if (!data || Object.keys(data.clusters).length === 0) {
    return <Alert variant="warning">No cluster data available.</Alert>
  }

  const clusterIds = Object.keys(data.clusters).map(Number).sort((a, b) => a - b)
  const xTitle = isPairwise
    ? (data.x_name ?? pairX)
    : (mode === "pca" ? "PC1" : "GWA")
  const yTitle = isPairwise
    ? (data.y_name ?? pairY)
    : (mode === "pca" ? "PC2" : "Income")

    const xCategories = isPairwise ? data.x_categories ?? null : null
    const yCategories = isPairwise ? data.y_categories ?? null : null

    return (
    <>
      <Row>
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            {/* ✅ Header with scatterplot info button */}
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-0 fw-bold">
                  {isPlayground
                    ? `Playground Clusters (k=${k})`
                    : isPairwise
                    ? `Pairwise Clusters (k=${data.k ?? k})`
                    : "Official Clusters"}
                </h6>
                <small className="text-muted">
                  {isPairwise ? `${xTitle} (x) vs ${yTitle} (y)` : "GWA (x) vs Income (y)"}
                </small>
              </div>

              <Button
                variant="outline-info"
                size="sm"
                onClick={() => setShowScatterInfo(true)}
              >
                About Scatterplot
              </Button>
            </Card.Header>
              <Card.Body>
                <Plot
                  data={[
                    ...clusterIds.map((clusterId) => {
                      const students = data.clusters[clusterId]
                      return {
                        x: students.map((s: any) => (isPairwise ? s.pair_x : s.GWA)),
                        y: students.map((s: any) => (isPairwise ? s.pair_y : s.income)),
                        mode: "markers" as const,
                        type: "scatter" as const,
                        name: getClusterLabel(data.clusters[clusterId]),
                        text: students.map(
                          (s: any) =>
                            `${s.firstname} ${s.lastname}<br>${isPairwise ? xTitle : "GWA"}: ${
                              isPairwise ? s.pair_x_label ?? s.pair_x : s.GWA
                            }<br>${isPairwise ? yTitle : "Income"}: ${
                              isPairwise ? s.pair_y_label ?? s.pair_y : s.income
                            }<br>Program: ${s.program ?? "-"}<br>Municipality: ${s.municipality ?? "-"}`
                        ),
                        hovertemplate: "%{text}<extra></extra>",
                        marker: {
                          size: 9,
                          color: getClusterColor(clusterId),
                          line: { width: 1, color: "#000" },
                        },
                      } as Partial<Plotly.PlotData>
                    }),
                    ...(data.centroids && data.centroids.length > 0
                      ? [
                          {
                            x: data.centroids.map((c) => c[0]),
                            y: data.centroids.map((c) => c[1]),
                            mode: "markers+text",
                            type: "scatter",
                            name: "Centroids",
                            marker: { size: 18, color: "black", symbol: "x" },
                            text: data.centroids.map((_, i) => `C${i}`),
                            textposition: "top center",
                          } as any as Partial<Plotly.PlotData>,
                        ]
                      : []),
                  ]}
                  layout={{
                    title: {
                      text: isPlayground ? `Playground Clusters (k=${k})` : isPairwise ? `Pairwise Clusters (k=${k})` : "Official Clusters",
                    },
                    xaxis: {
                      title: { text: xTitle },
                      tickmode: isPairwise && xCategories ? "array" : undefined,
                      tickvals: isPairwise && xCategories ? xCategories.map((_: any, i: number) => i) : undefined,
                      ticktext: isPairwise && xCategories ? xCategories : undefined,
                      
                    },
                    yaxis: {
                      title: { text: yTitle },
                      tickmode: isPairwise && yCategories ? "array" : undefined,
                      tickvals: isPairwise && yCategories ? yCategories.map((_: any, i: number) => i) : undefined,
                      ticktext: isPairwise && yCategories ? yCategories : undefined,
                      tickformat: isPairwise && !yCategories ? ",.0f" : undefined,
                    },
                    height: 520,
                    margin: { t: 60, b: 60, l: 80, r: 40 },
                    hovermode: "closest",
                    legend: { orientation: "h", y: -0.2 },
                  }}
                  style={{ width: "100%" }}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0 fw-bold">Cluster Summaries</h6>
              </Card.Header>
              <Card.Body>
                {clusterIds.map((cid) => (
                  <div
                    key={cid}
                    className="p-3 border rounded mb-2"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedCluster(cid)
                      setCurrentPage(1)
                    }}
                  >
                    <h6>{getClusterLabel(data.clusters[cid], cid)}</h6>
                    <small className="text-muted">{getClusterDescription(data.clusters[cid], data.x_name, data.y_name, isPairwise).summary}</small>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {selectedCluster !== null && data.clusters[selectedCluster] && (
          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0 fw-bold">Cluster {selectedCluster} — {data.clusters[selectedCluster].length} Students</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3 p-3 bg-light border rounded">
                <h6 className="fw-bold">Interpretation</h6>
                <p className="mb-2">{getClusterDescription(data.clusters[selectedCluster], data.x_name, data.y_name, isPairwise).summary}</p>
                <p className="text-primary">{getClusterDescription(data.clusters[selectedCluster], data.x_name, data.y_name, isPairwise).recommendation}</p>
              </div>

              <div className="table-responsive">
                <Table striped hover responsive className="mb-0 clusters-table table-sm">
                  <thead>
                    <tr>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Program</th>
                      <th>Municipality</th>
                      <th>Area Type</th>
                      <th>GWA</th>
                      <th>Honors</th>
                      <th>Income</th>
                      <th>Income Category</th>
                      <th>SHS Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clusters[selectedCluster]
                      .slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage)
                      .map((s) => (
                        <tr key={s.id} onClick={() => { setViewedStudent(s); setShowViewModal(true); }} style={{ cursor: 'pointer' }}>
                          <td data-label="First Name">{s.firstname}</td>
                          <td data-label="Last Name">{s.lastname}</td>
                          <td data-label="Program">{s.program}</td>
                          <td data-label="Municipality">{s.municipality}</td>
                          <td data-label="Area Type">
                            <span
                              className={
                                getAreaType(s.municipality) === "Upland"
                                  ? "badge bg-success"
                                  : getAreaType(s.municipality) === "Lowland"
                                  ? "badge bg-info text-dark"
                                  : "badge bg-secondary"
                              }
                            >
                              {getAreaType(s.municipality)}
                            </span>
                          </td>
                          <td data-label="GWA">{s.GWA}</td>
                          <td data-label="Honors">{s.Honors}</td>
                          <td data-label="Income">₱{(s.income ?? 0).toLocaleString?.() ?? s.income}</td>
                          <td data-label="Income Category">{s.IncomeCategory}</td>
                          <td data-label="SHS Type">{s.SHS_type}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>

              <Pagination className="mt-3">
                {Array.from({ length: Math.max(1, Math.ceil(data.clusters[selectedCluster].length / studentsPerPage)) }, (_, i) => (
                  <Pagination.Item key={i + 1} active={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>
                ))}
              </Pagination>
            </Card.Body>
          </Card>
        )}
        {/* Read-only modal for viewing student details */}
        <RecordViewModal
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          title={viewedStudent ? `${viewedStudent.firstname} ${viewedStudent.lastname}` : 'Student Details'}
          fields={viewedStudent ? [
            { label: 'First Name', value: viewedStudent.firstname || '—' },
            { label: 'Last Name', value: viewedStudent.lastname || '—' },
            { label: 'Program', value: viewedStudent.program || '—' },
            { label: 'Municipality', value: viewedStudent.municipality || '—' },
            { label: 'Area Type', value: getAreaType(viewedStudent.municipality) },
            { label: 'Income', value: viewedStudent.income === undefined || viewedStudent.income === null ? '—' : `₱${viewedStudent.income.toLocaleString()}` },
            { label: 'SHS Type', value: viewedStudent.SHS_type || '—' },
            { label: 'GWA', value: viewedStudent.GWA === undefined || viewedStudent.GWA === null ? '—' : viewedStudent.GWA },
            { label: 'Honors', value: viewedStudent.Honors || '—' },
            { label: 'Income Category', value: viewedStudent.IncomeCategory || '—' },
          ] : []}
        />
      </>
    )
  }

  // ---------- Main return ----------
  return (
    <div className="fade-in">
      <h2 className="fw-bold mb-4">Student Clusters</h2>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "official")} className="mb-3">
        <Tab eventKey="official" title="Official Clusters">
          
          <div className="mb-3 p-3 bg-light border rounded">
            <h6 className="fw-bold">Why GWA and Income?</h6>
            <p className="mb-0 text-muted">
              The official clusters use <strong>General Weighted Average (GWA)</strong> and 
              <strong> household income</strong> as the main features because they provide the clearest picture 
              of both <em>academic performance</em> and <em>socioeconomic background</em>. 
              These two factors strongly influence student outcomes: GWA reflects learning achievement, 
              while income often affects access to resources, opportunities, and support systems. 
              By pairing them, clusters highlight not only who is excelling academically, but also whether 
              financial constraints may play a role in their educational journey. 
              This makes the analysis more actionable for policy and support interventions.
            </p>
          </div>

        {renderClusterSection(clusterData, false)}

      {/* Radar chart removed per request. */}



        </Tab>

        <Tab eventKey="pairwise" title="Pairwise Clusters">
          <Card className="mb-3">
            <Card.Header><h6 className="mb-0 fw-bold">Pairwise Mode</h6></Card.Header>
            <Card.Body>
              <p className="mb-0 text-muted">
                Pairwise Mode is built for <strong>custom comparisons</strong>. 
                While the official clusters always use <em>GWA</em> and <em>Income</em>, 
                this mode lets you explore how students group together when clustering 
                is based on any two features of your choice, such as <em>Program</em>, 
                <em> Municipality</em>, or <em>SHS Type</em>. 
                This is valuable for discovering patterns that the official clusters might not highlight — 
                for instance, whether students in the same municipality tend to cluster regardless of income, 
                or how GWA varies within specific strands. 
                It gives more flexibility to uncover <strong>alternative groupings </strong> 
                and generate deeper policy insights.
              </p>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <Form.Label className="mb-0">X:</Form.Label>
                <Form.Select value={pairX} onChange={(e) => setPairX(e.target.value)} style={{ width: 160 }}>
                  {pairableFeatures.map((f) => <option key={f} value={f}>{f}</option>)}
                </Form.Select>
                <Form.Label className="mb-0">Y:</Form.Label>
                <Form.Select value={pairY} onChange={(e) => setPairY(e.target.value)} style={{ width: 160 }}>
                  {pairableFeatures.map((f) => <option key={f} value={f}>{f}</option>)}
                </Form.Select>
                <Form.Label className="mb-0">k:</Form.Label>
                <Form.Control type="number" min={2} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} style={{ width: 80 }} />
                <Button onClick={runPairwise} disabled={runningPairwise}>
                  {runningPairwise ? <Spinner size="sm" animation="border" /> : "Run"}
                </Button>
                <Button variant="outline-success" onClick={() =>
                  window.open(`/reports/pairwise_clusters?x=${encodeURIComponent(pairX)}&y=${encodeURIComponent(pairY)}&k=${k}&format=pdf`, "_blank")
                }>
                  Download PDF
                </Button>
                <Button variant="outline-primary" onClick={() =>
                  window.open(`/reports/pairwise_clusters?x=${encodeURIComponent(pairX)}&y=${encodeURIComponent(pairY)}&k=${k}&format=csv`, "_blank")
                }>
                  Download CSV
                </Button>
              </div>
            </Card.Body>
          </Card>
          {renderClusterSection(pairwiseData, false, true)}
        </Tab>
        
        <Tab eventKey="playground" title="Playground Mode">
          <Card className="mb-3">
            <Card.Header><h6 className="mb-0 fw-bold">Playground Mode</h6></Card.Header>
            <Card.Body>
              <p className="mb-0 text-muted">
                Playground Mode is designed for <strong>exploration</strong>. 
                While the official clusters use the most statistically appropriate number of groups, 
                in this mode you can freely adjust <em>k</em> (the number of clusters). 
                This helps you see how student groupings change when you force fewer or more clusters. 
                For example, a smaller k may reveal broader trends across many students, 
                while a larger k may uncover niche sub-groups with very specific traits. 
                It’s a hands-on way to understand the flexibility and sensitivity of clustering on the dataset.
              </p>
              <div className="d-flex align-items-center gap-3">
                <Form.Label className="mb-0">Clusters (k):</Form.Label>
                <Form.Control type="number" min={2} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} style={{ width: 100 }} />
                <Button onClick={runPlayground} disabled={runningPlayground}>
                  {runningPlayground ? <Spinner size="sm" animation="border" /> : "Run"}
                </Button>
                <Button variant="outline-success" onClick={() => window.open(`reports/cluster_playground?k=${k}&format=pdf`, "_blank")}>Download PDF</Button>
                <Button variant="outline-primary" onClick={() => window.open(`reports/cluster_playground?k=${k}&format=csv`, "_blank")}>Download CSV</Button>
              </div>
            </Card.Body>
          </Card>
          {renderClusterSection(playgroundData, true)}
        </Tab>
      </Tabs>

      {/* Scatterplot Info Modal */}
      <Modal show={showScatterInfo} onHide={() => setShowScatterInfo(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Understanding the Scatterplot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Each <b>dot</b> in the scatterplot represents a student. The dot’s position depends on the 
            two chosen features:
          </p>
          <ul>
            {activeTab === "official" && (
              <li>
                In <b>Official Clusters</b>, the features are always <b>GWA</b> (academic performance) on the X-axis 
                and <b>Household Income</b> (socioeconomic background) on the Y-axis.
              </li>
            )}
            {activeTab === "pairwise" && (
              <li>
                In <b>Pairwise Mode</b>, you choose the features (currently <b>{pairX}</b> on X and <b>{pairY}</b> on Y).  
                This lets you see how students group together when compared on these two traits.
              </li>
            )}
            {activeTab === "playground" && (
              <li>
                In <b>Playground Mode</b>, the system still uses <b>GWA</b> vs <b>Income</b>, 
                but you control the number of clusters (<i>k</i>) to test how groups change.
              </li>
            )}
          </ul>

          <p className="mt-3"><b>Colors:</b> Each cluster is shown in a unique color. Students in the same cluster are closer to each other in terms of the chosen features.</p>

          <p>
            <b>Centroids (C0, C1, ...):</b> These are the <u>black “X” marks</u> you see in the scatterplot.  
            A centroid is the <i>mathematical center</i> of a cluster:
          </p>
          <ul>
            <li>
              Think of it like the "average student" of that group based on the chosen features.
            </li>
            <li>
              For example, if a centroid is at (GWA=2.5, Income=20,000), that means students in that cluster 
              usually have an average GWA of 2.5 and an income of about ₱20,000.
            </li>
            <li>
              The centroid is not always an actual student — it’s a calculated point that represents the 
              <b>center of gravity</b> of the cluster.
            </li>
          </ul>

          <p className="text-muted">
            In short: clusters show groups of similar students, and centroids summarize what the "typical student" 
            in each group looks like. The closer two students are to the same centroid, the more similar they are 
            in the chosen dimensions.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScatterInfo(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  )
}

export default Clusters
