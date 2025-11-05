import React, { useMemo, useState } from "react";
import {
  Container, Card, Row, Col, Form, Table, Button, Alert, ListGroup, Badge,
} from "react-bootstrap";
import { isSafeOrder, listPermutations, computeNeed } from "./bankers";

/* ---------- Small helper: digits only → number (no negatives) ---------- */
function toNonNegInt(value) {
  const clean = String(value ?? "")
    .replace(/\D+/g, "");          // keep digits only
  return clean === "" ? 0 : Number(clean);
}

/* Reusable numeric input (digits only) */
function NumericInput({ value, onChange, min = 0, ...props }) {
  const handleKeyDown = (e) => {
    const k = e.key;
    const ok =
      (k >= "0" && k <= "9") ||
      k === "Backspace" ||
      k === "Delete" ||
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === "Tab" ||
      k === "Home" ||
      k === "End";
    if (!ok) e.preventDefault();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D+/g, "");
    const n = pasted === "" ? 0 : Number(pasted);
    onChange(n);
  };
  const handleChange = (e) => onChange(toNonNegInt(e.target.value));

  return (
    <Form.Control
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onChange={handleChange}
      {...props}
    />
  );
}

/* ---------------- UI ---------------- */
export default function App() {
  // Defaults (same as the sample)
  const [total, setTotal] = useState(10);
  const [n, setN] = useState(3);
  const [ids, setIds] = useState(["P1", "P2", "P3"]);
  const [max, setMax] = useState([8, 5, 9]);
  const [hold, setHold] = useState([1, 3, 3]);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [lines, setLines] = useState(null);

  // Derived values
  const totalHold = useMemo(
    () => hold.slice(0, n).reduce((s, h) => s + Number(h || 0), 0),
    [hold, n]
  );
  const need = useMemo(() => computeNeed(max, hold), [max, hold]);

  // Keep arrays sized to n
  const resize = (len) => {
    setIds((p) => Array.from({ length: len }, (_, i) => p[i] ?? `P${i + 1}`));
    setMax((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
    setHold((p) => Array.from({ length: len }, (_, i) => Number(p[i] ?? 0)));
  };

  /* ---- Input handlers with validation/clamping (simple single-layer ifs) ---- */
  const onChangeN = (val) => {
    const clamped = Math.max(3, Math.min(10, toNonNegInt(val)));
    setN(clamped);
    resize(clamped);
  };

  const onChangeTotal = (val) => {
    const n = toNonNegInt(val);
    if (n < totalHold) {
      setTotal(totalHold);
      setInfo(`Total cannot be less than currently held (${totalHold}). Auto-corrected.`);
      return;
    }
    setInfo("");
    setTotal(n);
  };

  const onChangeMax = (idx, val) => {
    const m = toNonNegInt(val);
    const nextMax = [...max];
    const nextHold = [...hold];

    nextMax[idx] = m;
    if (nextHold[idx] > m) {
      // clamp hold so Need never goes negative
      nextHold[idx] = m;
      setInfo(`Hold for row ${idx + 1} clamped to Max.`);
    } else {
      setInfo("");
    }
    setMax(nextMax);
    setHold(nextHold);
  };

  const onChangeHold = (idx, val) => {
    const h = toNonNegInt(val);
    const nextHold = [...hold];
    let newH = h;

    if (h > max[idx]) {
      newH = max[idx]; // clamp to Max
      setInfo(`Hold for row ${idx + 1} clamped to Max.`);
    } else {
      setInfo("");
    }
    nextHold[idx] = newH;

    // also ensure total >= totalHold after change
    const nextSum = nextHold.slice(0, n).reduce((s, v) => s + Number(v || 0), 0);
    if (total < nextSum) setTotal(nextSum);

    setHold(nextHold);
  };

  function validateBeforeCompute() {
    // everything should already be consistent, but we keep a simple guard
    if (total < totalHold) return "Total resources cannot be less than currently held.";
    for (let i = 0; i < n; i++) {
      if (hold[i] > max[i]) return `Row ${i + 1}: Hold cannot exceed Max.`;
    }
    if (n > 8) return "n > 8 creates a very large list (factorial). Reduce to 8 or below.";
    return "";
  }

  function compute() {
    setError(""); setInfo(""); setLines(null);
    const v = validateBeforeCompute();
    if (v) {
      setError(v);
      return;
    }
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

            {/* Top inputs */}
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
                      <NumericInput
                        value={max[i] ?? 0}
                        onChange={(v) => onChangeMax(i, v)}
                      />
                    </td>
                    <td>
                      <NumericInput
                        value={hold[i] ?? 0}
                        onChange={(v) => onChangeHold(i, v)}
                      />
                    </td>
                    <td className="text-center">{need[i]}</td>
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
            {error && <Alert variant="warning" className="mb-2">{error}</Alert>}
            {info && !error && <Alert variant="info" className="mb-2">{info}</Alert>}

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
