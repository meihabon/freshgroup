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
  LocationCategory?: string
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
  // Manual recluster handler (must be before JSX return)
  const handleManualRecluster = async () => {
    if (!manualK || manualK < 2) return;
    setReclustering(true);
    setError("");
    try {
      await API.post(`/clusters/recluster?k=${manualK}`);
      setK(manualK);
      await fetchOfficialClusters();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to recluster with manual k");
    } finally {
      setReclustering(false);
    }
  };
  // Manual override for official clusters k
  const [manualK, setManualK] = useState<number | null>(null)
  const [reclustering, setReclustering] = useState(false)
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

  const pairableFeatures = ["GWA", "income", "sex", "program", "municipality", "shs_type", "LocationCategory"]

  useEffect(() => {
    fetchOfficialClusters()
  }, [])

  useEffect(() => {
    if (activeTab === "pairwise") {
      runPairwise()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const mostCommonKey = (counts: Record<string, number>) => {
    const entries = Object.entries(counts)
    if (!entries.length) return "N/A"
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  }

  const getClusterDescription = (students: Student[]) => {
    if (!students || students.length === 0)
      return { title: "Empty Cluster", summary: "No students.", recommendation: "" }

    const honorsCount: Record<string, number> = {}
    const incomeCount: Record<string, number> = {}
    const programCount: Record<string, number> = {}
    const muniCount: Record<string, number> = {}
    const sexCount: Record<string, number> = {}
    const shsCount: Record<string, number> = {}
    const locCount: Record<string, number> = {}

    let sumGWA = 0
    let sumIncome = 0

    students.forEach((s: any) => {
      honorsCount[s.Honors ?? "N/A"] = (honorsCount[s.Honors ?? "N/A"] || 0) + 1
      incomeCount[s.IncomeCategory ?? "N/A"] = (incomeCount[s.IncomeCategory ?? "N/A"] || 0) + 1
      programCount[s.program ?? "N/A"] = (programCount[s.program ?? "N/A"] || 0) + 1
      muniCount[s.municipality ?? "N/A"] = (muniCount[s.municipality ?? "N/A"] || 0) + 1
      sexCount[s.sex ?? "N/A"] = (sexCount[s.sex ?? "N/A"] || 0) + 1
      shsCount[s.SHS_type ?? "N/A"] = (shsCount[s.SHS_type ?? "N/A"] || 0) + 1
      locCount[s.LocationCategory ?? "N/A"] = (locCount[s.LocationCategory ?? "N/A"] || 0) + 1
      sumGWA += Number(s.GWA ?? 0)
      sumIncome += Number(s.income ?? 0)
    })

    const commonProgram = mostCommonKey(programCount)
    const commonMuni = mostCommonKey(muniCount)
    const commonHonor = mostCommonKey(honorsCount)
    const commonSex = mostCommonKey(sexCount)
    const commonSHS = mostCommonKey(shsCount)
    const commonLoc = mostCommonKey(locCount)

    const avgGWA = (sumGWA / students.length) || 0
    const avgIncome = (sumIncome / students.length) || 0

    // Build a human-friendly title using the most distinguishing traits
    const titleParts: string[] = []
    if (commonHonor && commonHonor !== "N/A") titleParts.push(commonHonor)
    if (commonProgram && commonProgram !== "N/A") titleParts.push(commonProgram)
    if (commonLoc && commonLoc !== "N/A") titleParts.push(commonLoc)
    if (commonSex && commonSex !== "N/A") titleParts.push(commonSex)
    const title = titleParts.join(" • ") || `Cluster ${students[0].Cluster ?? ""}`

    const summary = `This cluster has ${students.length} students. On average their GWA is ${avgGWA.toFixed(2)} and typical household income is ₱${avgIncome.toLocaleString()}. Most are ${commonSex} students enrolled in ${commonProgram} coming from ${commonMuni} (predominantly ${commonLoc}). SHS background is typically ${commonSHS} and honors standing tends to be "${commonHonor}".`

    const recommendation = `Policy interpretation: This cluster indicates ${commonProgram} students (mostly ${commonSex}) with average GWA ${avgGWA.toFixed(2)} and income around ₱${avgIncome.toLocaleString()}. Consider targeted academic mentoring and financial aid programs, community outreach for ${commonLoc} municipalities, and SHS-bridging modules for ${commonSHS} backgrounds.`

    return { title, summary, recommendation }
  }

  // Radar helpers: compute normalized values between 0 and 1 for comparability
  const computeRadarSeries = (clusters: Record<number, Student[]>) => {
    // gather raw values to compute global min/max for normalization
    const raws: { gawa: number[]; income: number[]; male: number[]; honors: number[]; privateSHS: number[]; upland: number[] } = {
      gawa: [],
      income: [],
      male: [],
      honors: [],
      privateSHS: [],
      upland: [],
    }

    Object.keys(clusters).forEach((cid) => {
      const arr = clusters[Number(cid)]
      if (!arr.length) return
      const avgGWA = arr.reduce((a, s) => a + (s.GWA || 0), 0) / arr.length
      const avgIncome = arr.reduce((a, s) => a + (s.income || 0), 0) / arr.length
      const malePct = arr.filter((s) => s.sex === "Male").length / arr.length
      const honorsPct = arr.filter((s) => !!s.Honors && s.Honors !== "N/A").length / arr.length
      const privatePct = arr.filter((s) => s.SHS_type && s.SHS_type.toLowerCase() === "private").length / arr.length
      const uplandPct = arr.filter((s) => s.LocationCategory === "Upland").length / arr.length

      raws.gawa.push(avgGWA)
      raws.income.push(avgIncome)
      raws.male.push(malePct)
      raws.honors.push(honorsPct)
      raws.privateSHS.push(privatePct)
      raws.upland.push(uplandPct)
    })

    // compute min/max (fallbacks to sensible ranges)
    const minMax = (arr: number[], fallbackMin = 0, fallbackMax = 1) => {
      if (!arr.length) return { min: fallbackMin, max: fallbackMax }
      const min = Math.min(...arr)
      const max = Math.max(...arr)
      if (min === max) return { min: min, max: min + 1 } // avoid division by zero
      return { min, max }
    }

    const gRange = minMax(raws.gawa, 1.0, 3.0) // GWA typical range roughly 1.0 - 5.0 depending on system; adjust
    const iRange = minMax(raws.income, 0, Math.max(1, ...raws.income))
    const maleRange = { min: 0, max: 1 }
    const honorsRange = { min: 0, max: 1 }
    const privateRange = { min: 0, max: 1 }
    const uplandRange = { min: 0, max: 1 }

    const series: any[] = []
    Object.keys(clusters).forEach((cid) => {
      const arr = clusters[Number(cid)]
      if (!arr.length) return
      const avgGWA = arr.reduce((a, s) => a + (s.GWA || 0), 0) / arr.length
      const avgIncome = arr.reduce((a, s) => a + (s.income || 0), 0) / arr.length
      const malePct = arr.filter((s) => s.sex === "Male").length / arr.length
      const honorsPct = arr.filter((s) => !!s.Honors && s.Honors !== "N/A").length / arr.length
      const privatePct = arr.filter((s) => s.SHS_type && s.SHS_type.toLowerCase() === "private").length / arr.length
      const uplandPct = arr.filter((s) => s.LocationCategory === "Upland").length / arr.length

      const norm = (v: number, r: { min: number; max: number }) => (v - r.min) / (r.max - r.min)

      series.push({
        type: "scatterpolar",
        r: [
          norm(avgGWA, gRange),
          norm(avgIncome, iRange),
          norm(malePct, maleRange),
          norm(honorsPct, honorsRange),
          norm(privatePct, privateRange),
          norm(uplandPct, uplandRange),
        ],
        theta: ["GWA", "Income", "% Male", "% Honors", "% Private SHS", "% Upland"],
        fill: "toself",
        name: `Cluster ${cid}`,
      })
    })

    return series
  }

  // ---------- Fetch official clusters ----------
  const fetchOfficialClusters = async () => {
    try {
      setLoading(true)
      const res = await API.get("/clusters")
      setClusterData(res.data)

      // if server returned k and local k still default, update it
      if (res.data.k && k === 3) setK(res.data.k)
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
          LocationCategory: s.LocationCategory,
          Cluster: s.Cluster,
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
          LocationCategory: s.location ?? s.LocationCategory,
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

      setPairwiseData({ clusters, plot_data, centroids, x_name, y_name, x_categories, y_categories, k: serverK })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to run pairwise clustering")
    } finally {
      setRunningPairwise(false)
    }
  }

  // ---------- Render helpers / UI ----------
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

    // Build scatter traces (preserve original hover info + include location)
    // Use descriptive cluster labels if available from backend
    const clusterLabels = (data as any).cluster_labels || {};
    const scatterTraces: Partial<Plotly.PlotData>[] = clusterIds.map((clusterId) => {
      const students = data.clusters[clusterId]
      const label = clusterLabels[clusterId] || `Cluster ${clusterId}`;
      return {
        x: students.map((s: any) => (isPairwise ? s.pair_x : s.GWA)),
        y: students.map((s: any) => (isPairwise ? s.pair_y : s.income)),
        mode: "markers",
        type: "scatter",
        name: label,
        text: students.map(
          (s: any) =>
            `${s.firstname} ${s.lastname}<br>${isPairwise ? xTitle : "GWA"}: ${isPairwise ? s.pair_x_label ?? s.pair_x : s.GWA}<br>${isPairwise ? yTitle : "Income"}: ${isPairwise ? s.pair_y_label ?? s.pair_y : s.income}<br>Program: ${s.program ?? "-"}<br>Municipality: ${s.municipality ?? "-"}<br>Location: ${s.LocationCategory ?? "-"}<br>Cluster: ${label}`
        ),
        hovertemplate: "%{text}<extra></extra>",
        marker: {
          size: 9,
          color: clusterId >= 0 ? getClusterColor(clusterId) : "#888",
          line: { width: 1, color: "#000" },
        },
      } as Partial<Plotly.PlotData>
    })

    // centroid trace
    const centroidTrace = data.centroids && data.centroids.length > 0
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
      : []

    return (
      <>
        <Row>
          <Col lg={8} className="mb-4">
            <Card className="h-100">
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

                <Button variant="outline-info" size="sm" onClick={() => setShowScatterInfo(true)}>
                  ℹ️ About Scatterplot
                </Button>
              </Card.Header>
              <Card.Body>
                <Plot
                  data={[...scatterTraces, ...centroidTrace]}
                  layout={{
                    title: {
                      text: isPlayground
                        ? `Playground Clusters (k=${k})`
                        : isPairwise
                        ? `Pairwise Clusters (k=${data.k ?? k})`
                        : "Official Clusters",
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

                <p className="mt-2 text-muted">
                  Interpretation: The scatterplot displays students as points positioned by the two selected features. Clusters reflect groupings computed using multiple features on the backend; this plot provides a two-dimensional lens (GWA vs Income by default) for interpretability. Use the radar chart below to see a multi-feature profile per cluster.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0 fw-bold">Cluster Summaries</h6>
              </Card.Header>
              <Card.Body>
                {clusterIds.map((cid) => {
                  const label = clusterLabels[cid] || getClusterDescription(data.clusters[cid]).title;
                  return (
                    <div
                      key={cid}
                      className="p-3 border rounded mb-2"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedCluster(cid)
                        setCurrentPage(1)
                      }}
                    >
                      <h6>
                        {label}
                      </h6>
                      <small className="text-muted">
                        {getClusterDescription(data.clusters[cid]).summary}
                      </small>
                    </div>
                  )
                })}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Radar comparison + per-cluster radars + details */}
        <Card className="mb-3">
          <Card.Header>
            <h6 className="mb-0 fw-bold">Radar Comparison — Multi-feature cluster profiles</h6>
          </Card.Header>
          <Card.Body>
            <Plot data={computeRadarSeries(data.clusters)} layout={{ polar: { radialaxis: { visible: true, range: [0, 1] } }, showlegend: true }} style={{ width: "100%", height: "500px" }} />
            <p className="mt-2 text-muted">Interpretation: Each polygon represents a cluster's normalized average across multiple features (GWA, Income, % Male, % Honors, % Private SHS, % Upland). This view shows multi-dimensional differences that the 2D scatterplot cannot capture.</p>
          </Card.Body>
        </Card>

        {selectedCluster !== null && data.clusters[selectedCluster] && (
          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0 fw-bold">Cluster {selectedCluster} — Details</h6>
            </Card.Header>
            <Card.Body>
              {/* per-cluster radar */}
              <Plot data={computeRadarSeries({ [selectedCluster]: data.clusters[selectedCluster] })} layout={{ polar: { radialaxis: { visible: true, range: [0, 1] } }, showlegend: false }} style={{ width: "100%", height: 400 }} />
              <p className="mt-2"><b>Summary:</b> {getClusterDescription(data.clusters[selectedCluster]).summary}</p>
              <p className="text-primary"><b>Interpretation & Recommendation:</b> {getClusterDescription(data.clusters[selectedCluster]).recommendation}</p>

              <div className="table-responsive">
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Program</th>
                      <th>Municipality</th>
                      <th>Location</th>
                      <th>GWA</th>
                      <th>Honors</th>
                      <th>Income</th>
                      <th>Income Category</th>
                      <th>SHS Type</th>
                      <th>Location Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clusters[selectedCluster]
                      .slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage)
                      .map((s) => (
                        <tr key={s.id}>
                          <td>{s.firstname}</td>
                          <td>{s.lastname}</td>
                          <td>{s.program}</td>
                          <td>{s.municipality}</td>
                          <td>{s.LocationCategory}</td>
                          <td>{s.GWA}</td>
                          <td>{s.Honors}</td>
                          <td>₱{(s.income ?? 0).toLocaleString?.() ?? s.income}</td>
                          <td>{s.IncomeCategory}</td>
                          <td>{s.SHS_type}</td>
                          <td>{s.LocationCategory}</td>   
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>

              <Pagination className="mt-3">
                {Array.from({ length: Math.max(1, Math.ceil(data.clusters[selectedCluster].length / studentsPerPage)) }, (_, i) => (
                  <Pagination.Item key={i + 1} active={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Pagination.Item>
                ))}
              </Pagination>
            </Card.Body>
          </Card>
        )}

        {/* If no selected cluster, show per-cluster cards summarized */}
        {selectedCluster === null && (
          <>
            {clusterIds.map((cid) => {
              const desc = getClusterDescription(data.clusters[cid])
              return (
                <Card className="mb-3" key={`card-${cid}`}>
                  <Card.Header>
                    <h6 className="mb-0 fw-bold">Cluster {cid} — {desc.title}</h6>
                  </Card.Header>
                  <Card.Body>
                    <Plot data={computeRadarSeries({ [cid]: data.clusters[cid] })} layout={{ polar: { radialaxis: { visible: true, range: [0, 1] } }, showlegend: false }} style={{ width: "100%", height: 300 }} />
                    <p><b>Summary:</b> {desc.summary}</p>
                    <p className="text-primary"><b>Interpretation & Recommendation:</b> {desc.recommendation}</p>

                    <div className="table-responsive">
                      <Table striped hover responsive>
                        <thead>
                          <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Program</th>
                            <th>Municipality</th>
                            <th>GWA</th>
                            <th>Honors</th>
                            <th>Income</th>
                            <th>Income Category</th>
                            <th>SHS Type</th>
                            <th>Location Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.clusters[cid].slice(0, studentsPerPage).map((s) => (
                            <tr key={`r-${cid}-${s.id}`}>
                              <td>{s.firstname}</td>
                              <td>{s.lastname}</td>
                              <td>{s.program}</td>
                              <td>{s.municipality}</td>
                              <td>{s.GWA}</td>
                              <td>{s.Honors}</td>
                              <td>₱{(s.income ?? 0).toLocaleString?.() ?? s.income}</td>
                              <td>{s.IncomeCategory}</td>
                              <td>{s.SHS_type}</td>
                              <td>{s.LocationCategory}</td>   
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </>
        )}
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
            <h6 className="fw-bold">ℹ️ Why GWA and Income?</h6>
            <p className="mb-0 text-muted">
              The official clusters use <strong>General Weighted Average (GWA)</strong> and
              <strong> household income</strong> as the main features because they provide the clearest picture
              of both <em>academic performance</em> and <em>socioeconomic background</em>. These two factors strongly influence student outcomes: GWA reflects learning achievement,
              while income often affects access to resources, opportunities, and support systems. By pairing them, clusters highlight not only who is excelling academically, but also whether
              financial constraints may play a role in their educational journey. This makes the analysis more actionable for policy and support interventions.
            </p>
            <Form className="mt-3 d-flex align-items-center" onSubmit={e => { e.preventDefault(); handleManualRecluster(); }}>
              <Form.Label className="me-2 mb-0">Manual cluster count (k):</Form.Label>
              <Form.Control
                type="number"
                min={2}
                value={manualK ?? ""}
                onChange={e => setManualK(Number(e.target.value))}
                style={{ width: 80 }}
                className="me-2"
                disabled={reclustering}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={reclustering || !manualK || manualK < 2}
              >
                {reclustering ? "Reclustering..." : "Apply"}
              </Button>
              {manualK && manualK < 2 && (
                <span className="text-danger ms-2">k must be at least 2</span>
              )}
            </Form>
          </div>


          {renderClusterSection(clusterData, false)}
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
              </p>
              <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
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
              </p>
              <div className="d-flex align-items-center gap-3 mt-3">
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