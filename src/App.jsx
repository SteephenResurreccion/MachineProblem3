import React, { useMemo, useState } from "react";
import {
  Container, Card, Row, Col, Form, Table, Button, Alert, ListGroup, Badge,
} from "react-bootstrap";
import { isSafeOrder, listPermutations, computeNeed } from "./bankers";

/* ---------------- UI ---------------- */
export default function App() {
  // Defaults (same as your sample)
  const [total, setTotal] = useState(10);
  const [n, setN] = useState(3);
  const [ids, setIds] = useState(["P1", "P2", "P3"]);
  const [max, setMax] = useState([8, 5, 9]);
  const [hold, setHold] = useState([1, 3, 3]);

  const [error, setError] = useState("");
  const [lines, setLines] = useState(null);

  // Derived values
  const need = useMemo(() => computeNeed(max, hold), [max, hold]);
  const totalHold = useMemo(
    () => hold.slice(0, n).reduce((s, h) => s + Number(h || 0), 0),
    [hold, n]
  );

  // Keep arrays sized to n
  const resize = (len) => {
    setIds((p) => Array.from({ length: len }, (_, i) => p[i] ?? `P${i + 1}`));
    setMax((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
    setHold((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
  };

  const onChangeN = (v) => {
    const val = Math.max(3, Math.min(10, Number(v) || 3));
    setN(val);
    resize(val);
  };

  // Validation kept simple and linear
  function validate() {
    if (!Number.isFinite(Number(total)) || Number(total) < 0) {
      return "Total resources must be a non-negative number.";
    }
    for (let i = 0; i < n; i++) {
      const m = Number(max[i] ?? 0);
      const h = Number(hold[i] ?? 0);
      if (!Number.isFinite(m) || !Number.isFinite(h) || m < 0 || h < 0) {
        return "Max and Hold must be non-negative numbers.";
      }
      if (h > m) return `Row ${i + 1}: Hold cannot exceed Max.`;
    }
    if (n > 8) return "n > 8 creates a very large list (factorial). Reduce to 8 or below.";
    return "";
  }

  function compute() {
    const v = validate();
    if (v) {
      setError(v);
      setLines(null);
      return;
    }
    setError("");

    const perms = listPermutations(n);
    const out = perms.map((order) => {
      const tag = isSafeOrder(order, total, max, hold) ? "SAFE" : "UNSAFE";
      const label = order.map((i) => ids[i] || `P${i + 1}`).join(" ");
      return `${label} - ${tag}`;
    });
    setLines(out);
  }

  function saveTxt() {
    if (!lines?.length) return;
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "BANKERS.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page bg-body-tertiary">
      <Container>
        <Card className="card-fixed p-3 p-md-4">
          <Card.Body>
            <div className="text-center mb-4">
              <h3 className="mb-1">Banker’s Algorithm Simulator</h3>
              <div className="text-muted">
                Machine Problem #3 — Deadlock Avoidance (React + Bootstrap)
              </div>
            </div>

            {/* Top inputs */}
            <Row className="g-3 mb-3">
              <Col sm={6}>
                <Form.Label className="fw-semibold">Total resources</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
                <div className="small text-muted mt-1">
                  Currently held: <Badge bg="secondary">{totalHold}</Badge>
                </div>
              </Col>
              <Col sm={6}>
                <Form.Label className="fw-semibold"># of processes (3–10)</Form.Label>
                <Form.Control
                  type="number"
                  min={3}
                  max={10}
                  value={n}
                  onChange={(e) => onChangeN(e.target.value)}
                />
              </Col>
            </Row>

            {/* Process table */}
            <Table bordered responsive size="sm" className="mb-3">
              <thead className="table-light">
                <tr className="text-center">
                  <th style={{ width: 56 }}>#</th>
                  <th>Process ID</th>
                  <th style={{ width: 160 }}>Maximum Need</th>
                  <th style={{ width: 170 }}>Currently Holding</th>
                  <th style={{ width: 110 }}>Need (Auto)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: n }, (_, i) => (
                  <tr key={i}>
                    <td className="text-center">{i + 1}</td>
                    <td>
                      <Form.Control
                        value={ids[i] ?? ""}
                        onChange={(e) => {
                          const next = [...ids];
                          next[i] = e.target.value;
                          setIds(next);
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        value={max[i] ?? 0}
                        onChange={(e) => {
                          const next = [...max];
                          next[i] = Number(e.target.value);
                          setMax(next);
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        value={hold[i] ?? 0}
                        onChange={(e) => {
                          const next = [...hold];
                          next[i] = Number(e.target.value);
                          setHold(next);
                        }}
                      />
                    </td>
                    <td className={`text-center ${need[i] < 0 ? "text-danger" : ""}`}>
                      {need[i]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Actions */}
            <div className="d-flex justify-content-center gap-2 mb-3">
              <Button variant="primary" onClick={compute}>Compute</Button>
              <Button variant="secondary" onClick={saveTxt} disabled={!lines?.length}>
                Save as BANKERS.txt
              </Button>
            </div>

            {/* Feedback */}
            {error && <Alert variant="warning" className="mb-3">{error}</Alert>}

            {/* Results */}
            <div className="results border rounded-3 p-3 bg-light">
              {lines ? (
                <ListGroup variant="flush" className="font-monospace">
                  {lines.map((line, i) => (
                    <ListGroup.Item key={i} className="py-1">{line}</ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-muted text-center">
                  Click <strong>Compute</strong> to list all permutations and their SAFE/UNSAFE status.
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
