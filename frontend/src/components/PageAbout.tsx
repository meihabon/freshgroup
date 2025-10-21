import { Card } from 'react-bootstrap'

interface PageAboutProps {
  title?: string
  text: string
  icon?: any
  accentColor?: string
}

export default function PageAbout({ title = 'About this page', text, icon: IconComp, accentColor = '#27ae60' }: PageAboutProps) {
  return (
    <Card className="mb-3 page-about-card">
      <Card.Body className="d-flex align-items-start gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 8, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          {IconComp ? <IconComp size={20} /> : null}
        </div>
        <div>
          <h6 className="mb-1">{title}</h6>
          <p className="mb-0 text-muted small">{text}</p>
        </div>
      </Card.Body>
    </Card>
  )
}
