// =============================
// File: Help.tsx
// =============================
import React from 'react'
import { Container, Accordion, Badge } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { 
  BarChart, 
  Users, 
  Database, 
  FileText, 
  HelpCircle, 
  Layers 
} from 'lucide-react'

const Help: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  return (
    <Container className="my-5">
      {/* PAGE TITLE */}
      <h2 className="mb-4 fw-bold">System Help & User Guide</h2>

      {/* INTRODUCTION */}
      <p className="text-muted">
        Welcome to the <b>Student Profiling & Clustering System</b>. 
        This platform was built to help ISPSC efficiently manage student data, 
        create meaningful clusters, and generate actionable insights.
      </p>
      <p className="text-muted">
        In this guide, we will walk you through each feature of the system, 
        step by step, so you can maximize its potential in your work.
      </p>

      {/* ROLE ACCESS */}
      <p className="text-muted">
        Access and functionality depend on your assigned role:
      </p>
      <ul>
        <li>
          <b>Admins</b> <Badge bg="danger">Full Access</Badge>  
          – Manage datasets, configure clustering, generate reports, 
          and ensure data integrity across the system.
        </li>
        <li>
          <b>Viewers</b> <Badge bg="secondary">Limited Access</Badge>  
          – Explore dashboards, analyze clusters, and download reports.  
          Viewers <i>cannot</i> modify or upload datasets.
        </li>
      </ul>

      {/* ACCORDION START */}
      <Accordion defaultActiveKey="0" alwaysOpen>

        {/* DASHBOARD */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <BarChart size={18} className="me-2 text-primary" />
            Dashboard Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Dashboard</b> acts as your <i>command center</i>.  
              It summarizes student performance, demographics, 
              and overall trends in one glance.
            </p>
            <ol>
              <li>
                <b>Overview Metrics:</b>  
                At the very top, quick stats show the total number of students 
                and summaries of key attributes like GWA, sex ratio, 
                and program distribution.
              </li>
              <li>
                <b>Demographic Breakdowns:</b>  
                Interactive charts illustrate distributions across sex, program, 
                municipality, income category, and SHS background.
              </li>
              <li>
                <b>Most Common Values:</b>  
                Quickly identify which program has the largest enrollment, 
                which municipality contributes the most students, 
                or the most common income category.
              </li>
              <li>
                <b>Interactive Filters:</b>  
                Narrow down results instantly using filters 
                (e.g., filter by program or sex).  
                Charts and numbers update live as you adjust filters.
              </li>
              <li>
                <b>Clickable Cards:</b>  
                Each summary card (e.g., "Total Students") 
                is clickable.  
                Click to explore detailed lists, graphs, or historical trends.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b>  
              Use the Dashboard as your starting point each session.  
              It gives you a quick health check of the entire student population.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* STUDENTS */}
        <Accordion.Item eventKey="1">
          <Accordion.Header>
            <Users size={18} className="me-2 text-success" />
            Students Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Students</b> section is a searchable, filterable student database.  
              Here you can browse profiles in detail and export records if needed.
            </p>
            <ol>
              <li>
                <b>Paginated List:</b>  
                Students are displayed 20 per page.  
                Use pagination controls at the bottom to navigate large cohorts.
              </li>
              <li>
                <b>Search Bar:</b>  
                Search students by typing full or partial names.  
                Results appear instantly.
              </li>
              <li>
                <b>Filters:</b>  
                Filter students by program, municipality, sex, income category, 
                SHS background, or honors status.  
                You can combine multiple filters for precision.
              </li>
              <li>
                <b>Profile Badges:</b>  
                Students have badges like “With Honors” or “Low Income” 
                for quick identification of important attributes.
              </li>
              <li>
                <b>Profile Details:</b>  
                Clicking a student’s name opens a modal window 
                with detailed information including demographics, GWA, 
                and other profile fields.
              </li>
              <li>
                <b>Export Data:</b>  
                Download student data as CSV for offline analysis or reporting.  
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b>  
              Use a combination of filters and badges to find priority groups 
              (e.g., low-income honors students) for scholarships or interventions.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* CLUSTERS */}
        <Accordion.Item eventKey="2">
          <Accordion.Header>
            <Layers size={18} className="me-2 text-warning" />
            Clusters Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Clusters</b> section groups students using 
              <b> k-means clustering </b>.  
              This technique detects patterns not immediately obvious 
              from raw data.
            </p>
            <ol>
              <li>
                <b>Official Clusters:</b>  
                Managed by Admins, these clusters are the reference sets 
                for official reports and decision-making.
              </li>
              <li>
                <b>Playground Mode:</b>  
                Experiment with different numbers of clusters (<b>k</b>).  
                Test “what-if” scenarios without affecting official clusters.
              </li>
              <li>
                <b>Pairwise Clusters:</b>  
                Compare two attributes (e.g., GWA vs Income).  
                Scatter plots highlight correlations and groupings.
              </li>
              <li>
                <b>Scatter Plots:</b>  
                Each student is a point.  
                Clusters are color-coded, and centroids are marked (C0, C1, etc.).  
                Hover to see student-specific data.
              </li>
              <li>
                <b>Cluster Summaries:</b>  
                Each cluster has aggregated insights like average GWA, 
                dominant program, or municipality trends.
              </li>
              <li>
                <b>Export:</b>  
                Clusters can be exported as PDF reports for presentations 
                or CSVs for deeper offline analysis.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b>  
              Clusters help identify at-risk groups, 
              strong-performing cohorts, and hidden patterns across demographics.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* REPORTS */}
        <Accordion.Item eventKey="3">
          <Accordion.Header>
            <FileText size={18} className="me-2 text-info" />
            Reports Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Reports</b> section converts raw student data 
              into polished summaries.  
              These are ideal for board meetings, accreditation, 
              or funding proposals.
            </p>
            <ol>
              <li>
                <b>Select Report Type:</b>  
                Options include Dashboard Summary, Income Analysis, 
                Honors Analysis, Municipality Breakdown, 
                SHS Background, or Cluster Analysis.
              </li>
              <li>
                <b>Preview Data:</b>  
                Before exporting, preview charts and tables.  
                Apply filters for focused analysis.
              </li>
              <li>
                <b>Export Options:</b>  
                Download polished reports as PDF (for stakeholders) 
                or CSV (for technical analysis).
              </li>
              <li>
                <b>Recommendations:</b>  
                Some reports include auto-generated recommendations 
                to guide decision-making.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b>  
              Use reports to back up proposals with hard evidence.  
              They translate raw data into simple, persuasive visuals.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* DATASET HISTORY (ADMIN ONLY) */}
        {isAdmin && (
          <Accordion.Item eventKey="4">
            <Accordion.Header>
              <Database size={18} className="me-2 text-danger" />
              Dataset History (Admin Only)
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <b>Dataset History</b> is only available for Admins.  
                This section ensures data accuracy and version control.
              </p>
              <ol>
                <li>
                  <b>View Details:</b>  
                  Review file name, uploader identity, upload date, 
                  and the number of records included.
                </li>
                <li>
                  <b>Track Outputs:</b>  
                  See which clusters and reports were generated 
                  from each dataset.
                </li>
                <li>
                  <b>Replace or Delete:</b>  
                  Update outdated datasets or remove invalid uploads.  
                  This maintains system integrity.
                </li>
              </ol>
              <p className="text-muted">
                <b>Tip:</b>  
                Keep datasets up-to-date to avoid basing analysis 
                on outdated information.
              </p>
            </Accordion.Body>
          </Accordion.Item>
        )}

        {/* HELP & SUPPORT */}
        <Accordion.Item eventKey="5">
          <Accordion.Header>
            <HelpCircle size={18} className="me-2 text-secondary" />
            Additional Help & Support
          </Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><b>Page not loading:</b> Refresh the browser or check your internet.</li>
              <li><b>No results showing:</b> Clear filters or confirm a dataset is uploaded.</li>
              <li><b>Login/access issues:</b> Contact your administrator.</li>
              <li><b>Charts not visible:</b> Use Chrome/Edge with JavaScript enabled.</li>
              <li><b>Technical errors:</b> Take a screenshot and report to IT.</li>
              <li><b>Dataset problems:</b> Ensure CSV format follows the required template.</li>
            </ul>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  )
}

export default Help
