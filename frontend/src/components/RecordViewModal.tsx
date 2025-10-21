import React from 'react'
import { Modal, Button } from 'react-bootstrap'

interface Props {
  show: boolean
  onHide: () => void
  title?: string
  fields: { label: string; value: React.ReactNode }[]
}

export default function RecordViewModal({ show, onHide, title = 'Record Details', fields }: Props) {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="table-responsive">
          <table className="table table-borderless mb-0">
            <tbody>
              {fields.map((f, i) => (
                <tr key={i}>
                  <th style={{ width: '30%', verticalAlign: 'middle' }}>{f.label}</th>
                  <td>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}
