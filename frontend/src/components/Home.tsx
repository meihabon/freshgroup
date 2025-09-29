// =============================
// File: Home.tsx
// =============================
import React from 'react'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Home.css'

const HERO_BG = 'https://www.ispsctagudin.info/library/img/campus.jpg'
const LOGO = 'https://www.ispsc.edu.ph/images/misc/logo.png'

const Home: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'Admin'

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <header className="hero" style={{ backgroundImage: `url(${HERO_BG})` }}>
        <div className="hero-overlay" />
        <Container className="text-center text-white hero-content">
          <img src={LOGO} alt="ISPSC logo" className="hero-logo mb-3" />
          <h1 className="hero-title">
            FreshGroup: <span className="accent">Student Profiling & Clustering</span>
          </h1>
          <p className="hero-lead">
            Transform raw student data into <strong>clear, actionable strategies</strong>.  
            FreshGroup empowers ISPSC Tagudin with insights for smarter decisions, 
            stronger support systems, and evidence-based governance.
          </p>
          <div className="mt-4 d-flex gap-3 justify-content-center flex-wrap">
            <Button className="btn-cta" size="lg" onClick={() => navigate('/dashboard')}>
              Explore Dashboard
            </Button>
            <Button variant="outline-light" size="lg" onClick={() => navigate('/help')}>
              Learn More
            </Button>
          </div>
        </Container>
      </header>

      {/* WHY FRESHGROUP */}
      <section className="section compact">
        <Container>
          <Row className="g-4 align-items-center">
            <Col md={7}>
              <h3 className="section-title">Why FreshGroup?</h3>
              <p className="section-text">
                Every semester, institutions like ISPSC gather massive student datasets — grades, demographics, 
                financial aid, and more. But most of this data goes unused because manual analysis is 
                <em>time-consuming and error-prone</em>.
              </p>
              <p className="section-text strong">
                FreshGroup automates clustering, explains the results in simple terms, and provides clear 
                recommendations for action. The outcome is a culture of <strong>clarity, efficiency, and evidence-based decisions</strong>.
              </p>
              <div className="feature-grid mt-3">
                <div>
                  <h6>Immediate Insights</h6>
                  <p className="small">Generate meaningful student clusters in less than 10 minutes.</p>
                </div>
                <div>
                  <h6>Actionable Guidance</h6>
                  <p className="small">Each cluster comes with suggestions — from counseling to program interventions.</p>
                </div>
                <div>
                  <h6>Institutional Benefit</h6>
                  <p className="small">Strengthen governance, compliance, and reputation through data-driven action.</p>
                </div>
              </div>
            </Col>
            <Col md={5} className="text-center">
              <Card className="glass shadow-sm">
                <Card.Body>
                  <h5 className="mb-3">At a Glance</h5>
                  <ul className="card-list">
                    <li><strong>Risk cohorts</strong> flagged with suggested interventions</li>
                    <li><strong>Custom reports</strong> prepared for boards & accreditors</li>
                    <li><strong>One-click exports</strong> for CSVs and PDF briefs</li>
                  </ul>
                  <p className="tiny-muted mt-3">
                    Minimal setup required — just upload your dataset and let FreshGroup process it.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CORE FEATURES */}
      <section className="section-alt compact">
        <Container>
          <h3 className="section-title text-center mb-4">Core Features That Matter</h3>
          <Row className="g-4 text-center">
            <Col md={4}>
              <Card className="glass h-100">
                <Card.Body>
                  <h5>Dashboard</h5>
                  <p className="muted small">
                    A central hub with KPIs, cluster counts, and quick filters. 
                    Designed so administrators don’t waste time on spreadsheets.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="glass h-100">
                <Card.Body>
                  <h5>Student Profiles</h5>
                  <p className="muted small">
                    View students by cluster with detailed attributes and recommended interventions 
                    to guide faculty actions.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="glass h-100">
                <Card.Body>
                  <h5>Advanced Clustering</h5>
                  <p className="muted small">
                    Built with K-Prototypes for mixed data. Both numerical and categorical attributes 
                    are considered for fair, accurate results.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row className="g-4 text-center mt-3">
            <Col md={6}>
              <Card className="glass h-100">
                <Card.Body>
                  <h5>Privacy & Security</h5>
                  <p className="muted small">
                    Strict access control with role-based permissions ensures sensitive data 
                    stays protected.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="glass h-100">
                <Card.Body>
                  <h5>Reporting</h5>
                  <p className="muted small">
                    Export polished charts, summaries, and reports in one click — ready for 
                    board meetings, accreditation, or funding proposals.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA FOOTER */}
      <footer className="cta compact text-center">
        <Container>
          <h4>Build a smarter, evidence-driven ISPSC.</h4>
          <p className="mb-3 muted">
            Don’t let valuable student data go to waste. FreshGroup turns complexity into clarity, 
            empowering better decisions for students, faculty, and administrators.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button className="btn-cta lg" onClick={() => navigate('/dashboard')}>
              Try FreshGroup Today
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate('/contact')}>
              Request a Walkthrough
            </Button>
          </div>
        </Container>
      </footer>
    </div>
  )
}

export default Home
