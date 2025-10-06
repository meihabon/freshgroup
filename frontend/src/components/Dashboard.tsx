import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Modal,
  Table,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  Users,
  GraduationCap,
  MapPin,
  DollarSign,
  School,
  Award,
  User,
} from "lucide-react";
import Plot from "react-plotly.js";
import { useAuth } from "../context/AuthContext";

interface DashboardStats {
  total_students: number;
  most_common_program: string;
  most_common_municipality: string;
  most_common_sex: string;
  most_common_income: string;
  most_common_shs: string;
  most_common_honors: string;
  sex_distribution: Record<string, number>;
  program_distribution: Record<string, number>;
  municipality_distribution: Record<string, number>;
  income_distribution: Record<string, number>;
  shs_distribution: Record<string, number>;
  honors_distribution: Record<string, number>;
}

const Dashboard: React.FC = () => {
  const { API } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalData, setModalData] = useState<{
    title: string;
    data: Record<string, number>;
  } | null>(null);

  // --- Constants ---
  const CHART_LAYOUT = {
    height: 320,
    margin: { t: 20, b: 20, l: 20, r: 20 },
    showlegend: false,
    font: { size: 12 },
  };

  const CHART_CONFIG = {
    responsive: true,
    displayModeBar: false,
  };

  // --- Fetch stats ---
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await API.get<DashboardStats>("/dashboard/stats");
        setStats(response.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || "Failed to fetch dashboard statistics"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [API]);

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const openModal = (title: string, data: Record<string, number>) => {
    setModalData({ title, data });
  };

  const closeModal = () => setModalData(null);

  const getInterpretation = (title: string, data?: Record<string, number>) => {
    if (!data || Object.keys(data).length === 0)
      return "No data available for interpretation.";

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const maxCategory = Object.keys(data).reduce((a, b) =>
      data[a] > data[b] ? a : b
    );
    const maxValue = data[maxCategory] ?? 0;
    const percentage =
      total > 0 ? ((maxValue / total) * 100).toFixed(1) : "0.0";

    const messages: Record<string, string> = {
      "Sex Distribution": `Most students identify as ${maxCategory} (${percentage}%). This helps target gender-sensitive programs and ensure equitable student services.`,
      "Program Distribution": `The largest share of students are in ${maxCategory} (${percentage}%), informing resource allocation and curriculum planning.`,
      "Municipality Distribution": `${maxCategory} contributes the most students (${percentage}%), aiding regional outreach and scholarship planning.`,
      "Income Distribution": `The ${maxCategory} income tier makes up ${percentage}% of students, important for financial aid and support planning.`,
      "SHS Type Distribution": `${maxCategory} is the predominant SHS background (${percentage}%), showing academic preparation trends.`,
      "Honors Distribution": `${maxCategory} accounts for ${percentage}% of students, reflecting academic achievement distribution.`,
    };

    return messages[title] || "This chart summarizes key student statistics.";
  };

  if (loading)
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <Spinner animation="border" variant="primary" />
      </div>
    );

  if (error) return <Alert variant="danger">{error}</Alert>;

  if (!stats)
    return (
      <Alert variant="warning">No data available. Please upload a dataset.</Alert>
    );

  const distributionCharts = [
    { title: "Sex Distribution", data: stats.sex_distribution },
    { title: "Program Distribution", data: stats.program_distribution },
    { title: "Municipality Distribution", data: stats.municipality_distribution },
    { title: "Income Distribution", data: stats.income_distribution },
    { title: "SHS Type Distribution", data: stats.shs_distribution },
    { title: "Honors Distribution", data: stats.honors_distribution },
  ];

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h2 className="fw-bold">DASHBOARD</h2>
        <p className="text-muted">
          A comprehensive overview of student demographics and performance
          indicators.
        </p>
      </div>

      <Tabs defaultActiveKey="summary" id="dashboard-tabs" className="mb-4">
        {/* --- SUMMARY TAB --- */}
        <Tab eventKey="summary" title="Summary">
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <h5 className="fw-bold mb-3">
                Why These Data Are Critical for the Institution
              </h5>
              <p className="text-muted">
                These indicators support academic planning, policy-making, and
                institutional improvement.
              </p>
              <Row>
                <Col md={6}>
                  <ul>
                    <li>
                      <b>Income:</b> Helps target scholarships and equity
                      programs.
                    </li>
                    <li>
                      <b>Sex:</b> Enables gender-sensitive student programs.
                    </li>
                    <li>
                      <b>Program:</b> Identifies in-demand courses for resource
                      allocation.
                    </li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul>
                    <li>
                      <b>Municipality:</b> Supports regional outreach and
                      inclusivity.
                    </li>
                    <li>
                      <b>SHS Type:</b> Reveals academic preparation differences.
                    </li>
                    <li>
                      <b>Honors:</b> Recognizes achievers for scholarships.
                    </li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <h4 className="fw-bold mb-3">SUMMARY</h4>
          <Row className="mb-4">
            {[
              {
                icon: <User size={40} className="text-success me-3" />,
                title: stats.most_common_sex,
                subtitle: "Most Common Sex",
                action: () =>
                  openModal("Sex Breakdown", stats.sex_distribution),
              },
              {
                icon: <GraduationCap size={40} className="text-success me-3" />,
                title: stats.most_common_program,
                subtitle: "Most Common Program",
                action: () =>
                  openModal("Program Breakdown", stats.program_distribution),
              },
              {
                icon: <MapPin size={40} className="text-warning me-3" />,
                title: stats.most_common_municipality,
                subtitle: "Most Common Municipality",
                action: () =>
                  openModal(
                    "Municipality Breakdown",
                    stats.municipality_distribution
                  ),
              },
              {
                icon: <DollarSign size={40} className="text-danger me-3" />,
                title: stats.most_common_income,
                subtitle: "Most Common Income",
                action: () =>
                  openModal("Income Breakdown", stats.income_distribution),
              },
            ].map((card, idx) => (
              <Col md={3} key={idx} className="mb-3">
                <Card
                  className="h-100 clickable-card shadow-sm"
                  onClick={card.action}
                >
                  <Card.Body className="d-flex align-items-center">
                    {card.icon}
                    <div>
                      <h6 className="fw-bold mb-1">{card.title}</h6>
                      <p className="text-muted mb-0">{card.subtitle}</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Card
                className="h-100 clickable-card shadow-sm"
                onClick={() => openModal("SHS Breakdown", stats.shs_distribution)}
              >
                <Card.Body className="d-flex align-items-center">
                  <School size={40} className="text-info me-3" />
                  <div>
                    <h6 className="fw-bold mb-1">{stats.most_common_shs}</h6>
                    <p className="text-muted mb-0">Most Common SHS Type</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} className="mb-3">
              <Card
                className="h-100 clickable-card shadow-sm"
                onClick={() =>
                  openModal("Honors Breakdown", stats.honors_distribution)
                }
              >
                <Card.Body className="d-flex align-items-center">
                  <Award size={40} className="text-success me-3" />
                  <div>
                    <h6 className="fw-bold mb-1">{stats.most_common_honors}</h6>
                    <p className="text-muted mb-0">Most Common Honors</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex align-items-center">
                  <Users size={40} className="text-primary me-3" />
                  <div>
                    <h3 className="fw-bold mb-1">
                      {formatNumber(stats.total_students)}
                    </h3>
                    <p className="text-muted mb-0">Total Students</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Card
                className="h-100 clickable-card shadow-sm"
                onClick={() => (window.location.href = "/clusters")}
              >
                <Card.Body className="d-flex align-items-center">
                  <Users size={40} className="text-primary me-3" />
                  <div>
                    <h5 className="fw-bold mb-1">View Clusters</h5>
                    <p className="text-muted mb-0">
                      Explore student groupings from the latest dataset
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* --- DISTRIBUTIONS TAB --- */}
        <Tab eventKey="distributions" title="Distributions">
          <h4 className="fw-bold mb-3">Distribution Charts</h4>
          <Row>
            {distributionCharts.map((chart, idx) => (
              <Col lg={4} md={6} key={idx} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Header className="fw-bold">{chart.title}</Card.Header>
                  <Card.Body>
                    <div style={{ width: "100%", height: "100%" }}>
                      <Plot
                        data={[
                          {
                            type: "pie",
                            labels: Object.keys(chart.data || {}),
                            values: Object.values(chart.data || {}),
                            hole: 0.4,
                            textinfo: "label+percent",
                            textposition: "outside",
                          },
                        ]}
                        layout={CHART_LAYOUT}
                        config={CHART_CONFIG}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                    <p
                      className="mt-3 text-muted"
                      style={{ fontSize: "0.95rem", lineHeight: 1.4 }}
                    >
                      {getInterpretation(chart.title, chart.data)}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>
      </Tabs>

      {/* --- Modal --- */}
      <Modal show={!!modalData} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modalData?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {modalData &&
                Object.entries(modalData.data).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Dashboard;
