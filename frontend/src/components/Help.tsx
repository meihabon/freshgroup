import React from 'react'
import { Container, Accordion } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

const Help: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  return (
    <Container className="my-5">
      <h2 className="mb-4 fw-bold">📖 System Help & User Guide</h2>
      <p className="text-muted">
        Welcome to the <b>Student Profiling & Clustering System</b>. This platform is designed to help educational institutions efficiently manage student data, generate actionable insights, and support strategic decision-making.  
        In this guide, we’ll walk you through each section of the system, step by step, so you can fully leverage its features.
      </p>
      <p className="text-muted">
        Access and functionality vary depending on your role:
      </p>
      <ul>
        <li><b>Admins:</b> Can manage datasets, configure clustering, generate reports, and maintain system integrity.</li>
        <li><b>Viewers:</b> Can explore dashboards, analyze clusters, and download reports. Editing datasets is restricted.</li>
      </ul>

      <Accordion defaultActiveKey="0" alwaysOpen>
        {/* Dashboard */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>📊 Dashboard Walkthrough</Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Dashboard</b> is your starting point for understanding overall student performance and demographics.  
              Think of it as the system’s control panel — providing key metrics, charts, and trends at a glance.
            </p>
            <ol>
              <li>
                <b>Overview Metrics:</b> At the top, you’ll see the total number of students and a summary of key attributes.  
                Use this to quickly assess the size and composition of your student population.
              </li>
              <li>
                <b>Demographic Breakdowns:</b> Charts display distributions by sex, program, municipality, income category, and SHS background.  
                Hover over chart segments to view exact counts and percentages.
              </li>
              <li>
                <b>Most Common Values:</b> Identify the program with the highest enrollment, the municipality contributing the most students, or the most common income bracket.  
                These metrics highlight where your student population is concentrated.
              </li>
              <li>
                <b>Interactive Filters:</b> Use filters to narrow down charts by program, sex, or other attributes. The dashboard updates in real-time.
              </li>
              <li>
                <b>Clickable Cards:</b> Click on a card (e.g., “Total Students”) to view detailed lists, graphs, or historical trends without navigating away from the dashboard.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b> Start here every session to get a snapshot of your student population and identify areas that need further analysis.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* Students */}
        <Accordion.Item eventKey="1">
          <Accordion.Header>👩‍🎓 Students Walkthrough</Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Students</b> section is your detailed student database. It allows you to browse, filter, and analyze individual student profiles.
            </p>
            <ol>
              <li>
                <b>Paginated List:</b> Students are displayed 20 per page. Use the pagination controls at the bottom to navigate large datasets.
              </li>
              <li>
                <b>Search Bar:</b> Type a student’s full or partial name to quickly locate their profile.
              </li>
              <li>
                <b>Filters:</b> Apply filters for program, municipality, sex, income category, SHS type, and honors status. Multiple filters can be applied simultaneously.
              </li>
              <li>
                <b>Profile Badges:</b> Key attributes, such as “With Honors” or “Low Income,” are displayed as badges for quick recognition.
              </li>
              <li>
                <b>Profile Details:</b> Click on a student’s name to open a modal window showing complete information: contact details, grades, program, and demographics.
              </li>
              <li>
                <b>Export Data:</b> Use the CSV export function to download selected or full student data for offline analysis.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b> Use filters and badges together to identify priority groups for scholarships, interventions, or special programs.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* Clusters */}
        <Accordion.Item eventKey="2">
          <Accordion.Header>🧩 Clusters Walkthrough</Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Clusters</b> section groups students based on similar characteristics using <b>k-means clustering</b>.  
              Clustering helps you identify patterns and trends not immediately obvious from raw data.
            </p>
            <ol>
              <li>
                <b>Official Clusters:</b> Predefined clusters created and maintained by Admins. Use these as your reference for reports and standard analysis.
              </li>
              <li>
                <b>Playground Mode:</b> Experiment with different numbers of clusters (<b>k</b>) to explore “what-if” scenarios. Results are temporary and can be exported as CSV or PDF.
              </li>
              <li>
                <b>Pairwise Clusters:</b> Select two attributes (e.g., GWA vs Income) to see a focused scatter plot comparing these variables.
              </li>
              <li>
                <b>Scatter Plots:</b> Each student appears as a point. Clusters are color-coded, and centroids (C0, C1, etc.) indicate cluster centers. Hover over points for student-specific data.
              </li>
              <li>
                <b>Cluster Summaries:</b> Review aggregated metrics for each cluster: average GWA, dominant program, sex ratio, or municipality trends.
              </li>
              <li>
                <b>Export:</b> Download clusters in PDF for reporting or CSV for additional analysis.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b> Use clustering to identify groups that may need targeted interventions or to detect trends across programs and demographics.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* Reports */}
        <Accordion.Item eventKey="3">
          <Accordion.Header>📑 Reports Walkthrough</Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Reports</b> section generates structured summaries from your student data.  
              Each report includes charts, tables, and actionable insights to support planning and decision-making.
            </p>
            <ol>
              <li>
                <b>Select Report Type:</b> Choose from Dashboard Summary, Income Analysis, Honors Analysis, Municipality Breakdown, SHS Background, or Cluster Analysis.
              </li>
              <li>
                <b>Preview Data:</b> View charts and tables before exporting. Interactive elements allow filtering and sorting for better insights.
              </li>
              <li>
                <b>Export Options:</b> Download reports as PDF for meetings or CSV for detailed analysis.
              </li>
              <li>
                <b>Recommendations:</b> Certain reports provide suggested interventions or insights based on detected patterns.
              </li>
            </ol>
            <p className="text-muted">
              <b>Tip:</b> Use reports to communicate findings to stakeholders or guide strategic initiatives.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        {/* Dataset History (Admin only) */}
        {isAdmin && (
          <Accordion.Item eventKey="4">
            <Accordion.Header>🗂 Dataset History (Admin Only)</Accordion.Header>
            <Accordion.Body>
              <p>
                Admins manage dataset uploads to ensure clustering and reporting are based on accurate and up-to-date data.
              </p>
              <ol>
                <li>
                  <b>View Details:</b> Check file name, uploader, date, and number of students included.
                </li>
                <li>
                  <b>Track Outputs:</b> Monitor clusters and reports generated per dataset.
                </li>
                <li>
                  <b>Replace or Delete:</b> Update outdated datasets or remove incorrect uploads to maintain data integrity.
                </li>
              </ol>
              <p className="text-muted">
                <b>Tip:</b> Regularly review datasets to ensure all analyses reflect current student populations.
              </p>
            </Accordion.Body>
          </Accordion.Item>
        )}

        {/* Help & Support */}
        <Accordion.Item eventKey="5">
          <Accordion.Header>🆘 Additional Help & Support</Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><b>Page loading issues:</b> Refresh your browser or verify your internet connection.</li>
              <li><b>No results displayed:</b> Clear filters or ensure a dataset has been uploaded.</li>
              <li><b>Login/access problems:</b> Contact your system administrator.</li>
              <li><b>Charts or reports not visible:</b> Use a modern browser (Chrome or Edge) with JavaScript enabled.</li>
              <li><b>Technical errors:</b> Capture screenshots and report them to IT support.</li>
              <li><b>Dataset errors:</b> Ensure the CSV file follows the required format and includes all mandatory columns.</li>
            </ul>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  )
}

export default Help
