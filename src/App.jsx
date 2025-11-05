import React, { useMemo, useState } from "react";
import {
  Container, Card, Row, Col, Form, Table, Button, Alert, ListGroup, Badge,
} from "react-bootstrap";
import { isSafeOrder, listPermutations, computeNeed } from "./bankers";

/* ---------- digits-only input helper ---------- */
function toNonNegInt(value) {
  const clean = String(value ?? "").replace(/\D+/g, "");
  return clean === "" ? 0 : Number(clean);
}

function NumericInput({ value, onChange, ...props }) {
  const onKeyDown = (e) => {
    const k = e.key;
    const ok =
      (k >= "0" && k <= "9") ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(k);
    if (!ok) e.preventDefault();
  };
  const onPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D+/g, "");
    onChange(pasted === "" ? 0 : Number(pasted));
  };
  return (
    <Form.Control
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onChange={(e) => onChange(toNonNegInt(e.target.value))}
      {...props}
    />
  );
}

export default function App() {
  // Defaults (same as your sample)
  const [total, setTotal] = useState(10);
  const [n, setN] = useState(3);
  const [ids, setIds] = useState(["P1", "P2", "P3"]);
  const [max, setMax] = useState([8, 5, 9]);
  const [hold, setHold] = useState([1, 3, 3]);

  const [lines, setLines] = useState(null);

  // Derived
  const totalHold = useMemo(
    () => hold.slice(0, n).reduce((s, h) => s + Number(h || 0), 0),
    [hold, n]
  );
  const need = useMemo(() => computeNeed(max, hold), [max, hold]);

  // Resize rows to n (no clamping)
  const resize = (len) => {
    setIds((p) => Array.from({ length: len }, (_, i) => p[i] ?? `P${i + 1}`));
    setMax((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
    setHold((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
  };

  const onChangeN = (val) => {
    const v = Math.max(3, Math.min(10, toNonNegInt(val)));
    setN(v);
    resize(v);
  };

  // --- IMPORTANT: no auto-corrections below ---
  const onChangeTotal = (val) => setTotal(toNonNegInt(val));
  const onChangeMax   = (i, val) => { const next=[...max];  next[i]=toNonNegInt(val);  setMax(next); };
  const onChangeHold  = (i, val) => { const next=[...hold]; next[i]=toNonNegInt(val); setHold(next); };

  // Non-blocking warnings (we still allow Compute)
  const warnings = useMemo(() => {
    const w = [];
    if (total < totalHold) w.push(`Total (${total}) is less than currently held (${totalHold}).`);
    for (let i = 0; i < n; i++) {
      if (hold[i] > max[i]) w.push(`Row ${i + 1}: Hold (${hold[i]}) exceeds Max (${max[i]}).`);
    }
    if (n > 8) w.push("n > 8 will generate an extremely large list (factorial).");
    return w;
  }, [total, totalHold, hold, max, n]);

  function compute() {
    // Even if there are warnings, we compute anyway.
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
    <div className="page">
      <Container>
        <Card className="card-fixed p-3 p-md-4">
          <Card.Body>
            <div className="text-center mb-4">
              <h3 className="mb-1">Banker’s Algorithm Simulator</h3>
              <div className="text-muted">
                Machine Problem #3 — Deadlock Avoidance (React + Bootstrap)
              </div>
            </div>

            <Row className="g-3 mb-3">
              <Col sm={6}>
                <Form.Label className="fw-semibold">Total resources</Form.Label>
                <NumericInput value={total} onChange={onChangeTotal} />
                <div className="small text-muted mt-1">
                  Currently held: <Badge bg="secondary">{totalHold}</Badge>
                </div>
              </Col>
              <Col sm={6}>
                <Form.Label className="fw-semibold"># of processes (3–10)</Form.Label>
                <NumericInput value={n} onChange={onChangeN} />
              </Col>
            </Row>

            {/* Warnings (non-blocking) */}
            {warnings.length > 0 && (
              <Alert variant="warning" className="py-2">
                <ul className="mb-0 ps-3">
                  {warnings.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </Alert>
            )}

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
                      <NumericInput value={max[i] ?? 0} onChange={(v) => onChangeMax(i, v)} />
                    </td>
                    <td>
                      <NumericInput value={hold[i] ?? 0} onChange={(v) => onChangeHold(i, v)} />
                    </td>
                    <td className={`text-center ${need[i] < 0 ? "text-danger" : ""}`}>{need[i]}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="d-flex justify-content-center gap-2 mb-3">
              <Button variant="primary" onClick={compute}>Compute</Button>
              <Button variant="secondary" onClick={saveTxt} disabled={!lines?.length}>
                Save as BANKERS.txt
              </Button>
            </div>

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
