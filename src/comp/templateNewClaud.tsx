import { useState, useRef } from "react";
import jsPDF from "jspdf";
import "./Template.css";

interface Service {
  id: number;
  name: string;
  qty: string;
  price: number;
}

const defaultServices: Service[] = [
  { id: 1, name: "Bridal Makeup", qty: "1 Look", price: 10000 },
];

const serviceOptions = [
  "Bridal Makeup",
  "Bride Phere Makeup",
  "Haldi Makeup",
  "Engagement Makeup",
  "Sangeet Makeup",
  "Basic Makeup",
  "Groom Makeup",
  "Nude/Basic Makeup",
  "Matte Makeup",
  "HD Makeup",
  "Dewy Makeup",
  "Airbrush Makeup",
  "Sweat Proof Makeup",
  "3D Makeup",
  "No Makeup Look",
  "Glossy Makeup",
  "Dramatic Makeup",
  "Custom"
];

export default function InvoiceGenerator() {
  const [client, setClient] = useState<string>("M/s/Mr.");
  const [phone, setPhone] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("March 10 - 11, 2026");
  const [venue, setVenue] = useState<string>("KK Palce, Khurai, MP");
  const [advance, setAdvance] = useState<number>(5000);
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [editing, setEditing] = useState<boolean>(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Popup state
  const [showAddPopup, setShowAddPopup] = useState<boolean>(false);
  const [selectedDefaultService, setSelectedDefaultService] = useState<string>("Bridal Makeup");
  const [customServiceName, setCustomServiceName] = useState<string>("");
  const [includeHairstyle, setIncludeHairstyle] = useState<boolean>(false);

  const totalAmount: number = services.reduce((s, r) => s + Number(r.price), 0);
  const balance: number = totalAmount - Number(advance);
  const totalQty: number = services.reduce((s, r) => {
    const n = parseInt(r.qty);
    return s + (isNaN(n) ? 1 : n);
  }, 0);

  const handleServiceChange = (
    id: number,
    field: keyof Service,
    val: string | number
  ): void => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const addRow = (): void => {
    setServices([
      ...services,
      { id: Date.now(), name: "", qty: "1 Look", price: 0 },
    ]);
  };

  const handleAddServiceSubmit = () => {
    let finalName = selectedDefaultService === "Custom" ? customServiceName : selectedDefaultService;
    if (includeHairstyle && !finalName.includes("Hairstyle")) {
       finalName += " + Hairstyle";
    }

    let defaultPrice = 0;
    if (selectedDefaultService !== "Custom") {
       const found = defaultServices.find(s => s.name.includes(selectedDefaultService));
       if (found) defaultPrice = found.price;
    }

    setServices([
      ...services,
      { id: Date.now(), name: finalName, qty: "1 Look", price: defaultPrice },
    ]);
    setShowAddPopup(false);
    setSelectedDefaultService("Bridal Makeup");
    setCustomServiceName("");
    setIncludeHairstyle(false);
  };

  const removeRow = (id: number): void => {
    setServices(services.filter((s) => s.id !== id));
  };

  const generatePDF = (): void => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageW = 210;
    const pageH = 297;
    const marginL = 20;
    const marginR = 20;
    const black: [number, number, number] = [0, 0, 0];
    const pink: [number, number, number] = [224, 32, 106];
    const linkBlue: [number, number, number] = [34, 85, 204];

    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    // ── TITLE ──────────────────────────────────────────────
    // "ANJALI" — large bold italic serif in pink (like the brand image)
    // "MAKEOVER" — bold condensed helvetica in black
    const titleY = 32;

    doc.setFontSize(38);
    doc.setFont("times", "bolditalic");
    doc.setTextColor(...pink);
    const anjaliW = doc.getTextWidth("ANJALI");

    doc.setFontSize(34);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    const makeoverW = doc.getTextWidth(" MAKEOVER");

    const totalTitleW = anjaliW + makeoverW;
    const titleX = (pageW - totalTitleW) / 2;

    // Draw ANJALI
    doc.setFontSize(38);
    doc.setFont("times", "bolditalic");
    doc.setTextColor(...pink);
    doc.text("ANJALI", titleX, titleY);

    // Draw MAKEOVER — aligned right next to ANJALI
    doc.setFontSize(34);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(" MAKEOVER", titleX + anjaliW, titleY);

    // Rule below title
    doc.setDrawColor(...black);
    doc.setLineWidth(0.4);
    doc.line(marginL, titleY + 5, pageW - marginR, titleY + 5);

    // ── CLIENT INFO ────────────────────────────────────────
    let y = titleY + 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Client:", marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(`   ${client}`, marginL + doc.getTextWidth("Client:"), y);

    const yPhone = y + 6;
    doc.setFont("helvetica", "bold");
    doc.text("Phn No.:", marginL, yPhone);
    doc.setFont("helvetica", "normal");
    doc.text(`   ${phone || "—"}`, marginL + doc.getTextWidth("Phn No.:"), yPhone);

    // Date + Venue right side
    const rightX = pageW - marginR;
    const dateLabel = "Date:";
    const dateVal = `  ${dateRange}`;
    const venueLabel = "Venue:";
    const venueVal = `  ${venue}`;

    doc.setFont("helvetica", "bold");
    doc.text(dateLabel, rightX - doc.getTextWidth(dateLabel + dateVal), y);
    doc.setFont("helvetica", "normal");
    doc.text(dateVal, rightX - doc.getTextWidth(dateVal), y);

    const y2 = y + 6;
    doc.setFont("helvetica", "bold");
    doc.text(venueLabel, rightX - doc.getTextWidth(venueLabel + venueVal), y2);
    doc.setFont("helvetica", "normal");
    doc.text(venueVal, rightX - doc.getTextWidth(venueVal), y2);

    // ── SERVICES SECTION ───────────────────────────────────
    y = y2 + 14;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...black);
    doc.text("Services", marginL, y);

    // Top table rule
    y += 4;
    doc.setDrawColor(...black);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);

    // Table header
    const colService = marginL + 2;
    const colQty = pageW - marginR - 50;
    const colPrice = pageW - marginR - 2;
    const rowH = 8;

    y += rowH - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text("Service Category", colService, y);
    doc.text("Quantity", colQty, y, { align: "right" });
    doc.text("Total Price", colPrice, y, { align: "right" });

    // Header bottom rule
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);

    // Service rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    services.forEach((s: Service) => {
      y += rowH;
      doc.text(s.name, colService, y);
      doc.text(s.qty, colQty, y, { align: "right" });
      doc.text(Number(s.price).toLocaleString("en-IN"), colPrice, y, {
        align: "right",
      });
    });

    // Total row top rule
    y += 3;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);

    // TOTAL SERVICE COUNT
    y += rowH - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL SERVICE COUNT", colService, y);
    doc.text(String(totalQty), colQty, y, { align: "right" });
    doc.text(totalAmount.toLocaleString("en-IN"), colPrice, y, {
      align: "right",
    });

    // Table bottom rule
    y += 3;
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);

    // ── PAYMENT SUMMARY (right-aligned) ────────────────────
    y += 14;
    const sumLabelX = pageW - marginR - 58;
    const sumValueX = pageW - marginR;

    const drawSumRow = (label: string, value: string, bold: boolean): void => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.text(label, sumLabelX, y);
      doc.text(value, sumValueX, y, { align: "right" });
      y += 8;
    };

    drawSumRow("Total Amount:", totalAmount.toLocaleString("en-IN"), false);
    drawSumRow("Advance Paid:", Number(advance).toLocaleString("en-IN"), false);

    // Rule above Balance Due
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(sumLabelX, y - 4, sumValueX, y - 4);

    // Balance Due — large bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...black);
    doc.text("Balance Due:", sumLabelX, y + 2);
    doc.text(balance.toLocaleString("en-IN"), sumValueX, y + 2, {
      align: "right",
    });

    // ── THANK YOU ──────────────────────────────────────────
    y = 248;
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Thank you for your business!", pageW / 2, y, { align: "center" });

    // Footer rule
    y += 5;
    doc.setDrawColor(...black);
    doc.setLineWidth(0.4);
    doc.line(marginL, y, pageW - marginR, y);

    // ── FOOTER ─────────────────────────────────────────────
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    const visitLabel = "Visit our Website:";
    doc.text(visitLabel, marginL, y);
    const visitLabelW = doc.getTextWidth(visitLabel + " ");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...linkBlue);
    const websiteText = "www.anjalimakeover.co.in";
    doc.text(websiteText, marginL + visitLabelW, y);
    const websiteW = doc.getTextWidth(websiteText + "    ");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    const reviewLabel = "Leave us a Review:";
    doc.text(reviewLabel, marginL + visitLabelW + websiteW, y);
    const reviewLabelW = doc.getTextWidth(reviewLabel + " ");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...linkBlue);
    doc.text(
      "Click here to review us on Google",
      marginL + visitLabelW + websiteW + reviewLabelW,
      y
    );

    // Page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text("1", pageW / 2, pageH - 8, { align: "center" });

    const slug = client
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()
      .slice(0, 40);
    doc.save(`anjali_makeover_invoice_${slug}.pdf`);
  };

  return (
    <>
      <div className="app-wrapper">
        <p className="app-title-bar">
          <span className="app-title-main">Anjali Makeover</span>
          <span className="app-title-sub">Invoice Generator</span>
          <span className="app-title-rule" />
        </p>

        <div className="controls">
          <button className="btn btn-edit" onClick={() => setEditing(!editing)}>
            {editing ? "✓ Done Editing" : "✎ Edit Invoice"}
          </button>
          <button className="btn btn-download" onClick={generatePDF}>
            ⬇ Download PDF
          </button>
          <button 
            className="btn" 
            style={{ background: "#f0f0f0", color: "#1a1a1a", borderColor: "#ccc" }} 
            onClick={() => setShowAddPopup(true)}
          >
            + Add Service
          </button>
        </div>

        {showAddPopup && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000
          }}>
            <div style={{
              background: "#fff", padding: "24px", borderRadius: "8px",
              width: "90%", maxWidth: "400px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", gap: "16px",
              fontFamily: "'Helvetica Neue', sans-serif", color: "#1a1a1a"
            }}>
              <h3 style={{ margin: 0, color: "#1a1a1a" }}>Add New Service</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Service Name</label>
                <select 
                  value={selectedDefaultService} 
                  onChange={(e) => setSelectedDefaultService(e.target.value)}
                  style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" }}
                >
                  {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {selectedDefaultService === "Custom" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Custom Service</label>
                  <input 
                    value={customServiceName} 
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    placeholder="Enter custom service"
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input 
                  type="checkbox" 
                  id="includeHairstyle"
                  checked={includeHairstyle} 
                  onChange={(e) => setIncludeHairstyle(e.target.checked)} 
                />
                <label htmlFor="includeHairstyle" style={{ fontSize: "14px" }}>Include Hairstyle (+ Hairstyle)</label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button 
                  onClick={() => setShowAddPopup(false)}
                  style={{ padding: "8px 16px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#1a1a1a" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddServiceSubmit}
                  style={{ padding: "8px 16px", background: "#e0206a", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {editing && <p className="edit-hint">Click any field to edit it</p>}

        <div className="invoice-card" ref={invoiceRef}>
          {/* ── HEADER ── */}
          <div className="inv-header">
            <span className="inv-header-ornament">
              ✦ &nbsp; Bridal &amp; Beauty Artistry &nbsp; ✦
            </span>
            <span className="inv-brand">
              <span className="inv-brand-highlight">Anjali </span>
              <span className="inv-brand-dark">MAKEOVER</span>
            </span>
            <span className="inv-brand-tagline">
              Est. Beauty Studio · Premium Services
            </span>
            <div className="inv-header-rule-wrap">
              <div className="inv-header-rule" />
              <div className="inv-header-diamond" />
              <div className="inv-header-rule" />
            </div>
          </div>

          {/* ── META ── */}
          <div className="inv-meta">
            <div className="inv-meta-row">
              <span className="inv-meta-label">Client</span>
              {editing ? (
                <input
                  className="editable-meta"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Client name"
                />
              ) : (
                <span className="inv-meta-value">{client}</span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">Date</span>
              {editing ? (
                <input
                  className="editable-meta"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  placeholder="Date range"
                />
              ) : (
                <span className="inv-meta-value">{dateRange}</span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">Phn No.</span>
              {editing ? (
                <input
                  className="editable-meta"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 00000 00000"
                />
              ) : (
                <span className="inv-meta-value">{phone || "—"}</span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">Venue</span>
              {editing ? (
                <input
                  className="editable-meta"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Venue"
                />
              ) : (
                <span className="inv-meta-value">{venue}</span>
              )}
            </div>
          </div>

          {/* ── SERVICES ── */}
          <div className="section-title">
            Services
            <span className="section-title-rule" />
          </div>
          <div style={{ overflowX: "auto", margin: "0 -8px", padding: "0 8px" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: "70%", minWidth: "180px" }}>Service Category</th>
                  <th style={{ width: "15%", minWidth: "60px", textAlign: "right" }}>Quantity</th>
                  <th style={{ width: "15%", minWidth: "70px", textAlign: "right" }}>Total Price</th>
                </tr>
              </thead>
            <tbody>
              {services.map((row: Service) => (
                <tr key={row.id}>
                  <td>
                    {editing ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          className="btn-remove"
                          onClick={() => removeRow(row.id)}
                          title="Remove"
                        >
                          ×
                        </button>
                        <input
                          className="editable-input"
                          value={row.name}
                          onChange={(e) =>
                            handleServiceChange(row.id, "name", e.target.value)
                          }
                        />
                      </span>
                    ) : (
                      row.name
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        className="editable-input right"
                        value={row.qty}
                        onChange={(e) =>
                          handleServiceChange(row.id, "qty", e.target.value)
                        }
                        style={{ width: "60px" }}
                      />
                    ) : (
                      row.qty
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        className="editable-input right"
                        type="number"
                        value={row.price}
                        onChange={(e) =>
                          handleServiceChange(
                            row.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        style={{ width: "70px" }}
                      />
                    ) : (
                      Number(row.price).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
              ))}
              {editing && (
                <tr>
                  <td colSpan={3} style={{ paddingTop: 8 }}>
                    <button className="btn btn-add" onClick={addRow}>
                      + Add Service
                    </button>
                  </td>
                </tr>
              )}
              <tr className="total-row">
                <td>TOTAL SERVICE COUNT</td>
                <td>{totalQty}</td>
                <td>{totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
            </table>
          </div>

          {/* ── SUMMARY ── */}
          <div className="inv-summary">
            <table className="summary-table">
              <tbody>
                <tr>
                  <td className="summary-label">Total Amount:</td>
                  <td>{totalAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td className="summary-label">Advance Paid:</td>
                  <td>
                    {editing ? (
                      <input
                        className="editable-input right"
                        type="number"
                        value={advance}
                        onChange={(e) => setAdvance(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    ) : (
                      Number(advance).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <hr className="summary-divider" style={{ width: 280 }} />
            <table className="summary-table">
              <tbody>
                <tr className="summary-balance">
                  <td className="summary-label">Balance Due:</td>
                  <td>{balance.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── THANK YOU ── */}
          <div className="inv-thankyou">Thank you for your business!</div>

          {/* ── FOOTER ── */}
          <div className="inv-footer">
            <span>
              <strong>Visit our Website:</strong>{" "}
              <a
                className="link"
                href="https://www.anjalimakeover.co.in"
                target="_blank"
                rel="noreferrer"
              >
                www.anjalimakeover.co.in
              </a>
            </span>
            <span>
              <strong>Leave us a Review:</strong>{" "}
              <a
                className="link"
                href="https://g.page/r/CX9fivISCCmvEBM/review"
                target="_blank"
                rel="noreferrer"
              >
                Click here to review us on Google
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
