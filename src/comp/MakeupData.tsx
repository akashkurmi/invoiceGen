import { useState, useEffect } from 'react';
import './Template.css';

interface MakeupRecord {
  id: number;
  clientName: string;
  bookingDate: string;
  advance: number;
  totalPrice: number;
  venue: string;
  phone?: string;
  email?: string;
  services: string;
  noOfServices: number;
  travelAmount: number;
}

const serviceOptions = [
  "Bridal Makeup", "Bride Phere Makeup", "Haldi Makeup", "Engagement Makeup",
  "Sangeet Makeup", "Basic Makeup", "Groom Makeup", "Nude/Basic Makeup",
  "Matte Makeup", "HD Makeup", "Dewy Makeup", "Airbrush Makeup",
  "Sweat Proof Makeup", "3D Makeup", "No Makeup Look", "Glossy Makeup",
  "Dramatic Makeup", "Custom"
];

export default function MakeupData() {
  const [data, setData] = useState<MakeupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/makeup').catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // Mock data fallback if DB fails
        setData([
          { id: 1, clientName: "Priya Sharma", bookingDate: "2026-06-15", advance: 2000, totalPrice: 15000, venue: "Grand Hyatt", services: "Bridal Makeup", noOfServices: 1, travelAmount: 500 },
          { id: 2, clientName: "Neha Gupta", bookingDate: "2026-06-18", advance: 1500, totalPrice: 12000, venue: "Taj Palace", services: "Engagement Makeup, Sider Makeup", noOfServices: 2, travelAmount: 0 }
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newAdvance, setNewAdvance] = useState<number>(0);
  const [newTotalPrice, setNewTotalPrice] = useState<number>(0);
  const [newVenue, setNewVenue] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newNoOfServices, setNewNoOfServices] = useState<number>(1);
  const [newTravelAmount, setNewTravelAmount] = useState<number>(0);
  
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'edit' | 'delete', recordId: number, record?: MakeupRecord } | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MakeupRecord | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setNewClientName("");
    setNewBookingDate("");
    setNewAdvance(0);
    setNewTotalPrice(0);
    setNewVenue("");
    setNewPhone("");
    setNewEmail("");
    setNewServices([]);
    setNewNoOfServices(0);
    setNewTravelAmount(0);
  };

  const handleSubmit = async () => {
    if (!newClientName || !newBookingDate) return;
    
    const payload = {
      clientName: newClientName,
      phone: newPhone,
      email: newEmail,
      bookingDate: newBookingDate,
      advance: newAdvance,
      totalPrice: newTotalPrice,
      venue: newVenue,
      services: newServices.join(', '),
      noOfServices: newNoOfServices,
      travelAmount: newTravelAmount
    };

    if (editingId) {
      try {
        const res = await fetch('/api/makeup', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });
        if (res.ok) {
          const updatedRecord = await res.json();
          setData(data.map(record => record.id === editingId ? updatedRecord : record));
        } else {
          setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
        }
      } catch (e) {
        setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
      }
    } else {
      try {
        const res = await fetch('/api/makeup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const newRecord = await res.json();
          setData([newRecord, ...data]);
        } else {
          setData([{ id: Date.now(), ...payload } as MakeupRecord, ...data]);
        }
      } catch (e) {
        setData([{ id: Date.now(), ...payload } as MakeupRecord, ...data]);
      }
    }
    
    setShowAddPopup(false);
    resetForm();
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === 'edit') {
      const record = confirmAction.record!;
      setEditingId(record.id);
      setNewClientName(record.clientName);
      setNewBookingDate(record.bookingDate);
      setNewAdvance(record.advance);
      setNewTotalPrice(record.totalPrice);
      setNewVenue(record.venue || "");
      setNewPhone(record.phone || "");
      setNewEmail(record.email || "");
      const existingServices = record.services ? record.services.split(',').map(s => s.trim()).filter(Boolean) : [];
      setNewServices(existingServices);
      setNewNoOfServices(record.noOfServices || existingServices.length);
      setNewTravelAmount(record.travelAmount || 0);
      setShowAddPopup(true);
    } else if (confirmAction.type === 'delete') {
      const id = confirmAction.recordId;
      try {
        await fetch(`/api/makeup?id=${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
      setData(data.filter(r => r.id !== id));
    }
    setConfirmAction(null);
  };

  const handlePaymentSettled = async (record: MakeupRecord) => {
    const fullAmount = record.totalPrice + (record.travelAmount || 0);
    const payload = {
      ...record,
      advance: fullAmount
    };

    try {
      const res = await fetch('/api/makeup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setData(data.map(r => r.id === record.id ? updatedRecord : r));
        setViewingRecord(updatedRecord);
      } else {
        setData(data.map(r => r.id === record.id ? payload : r));
        setViewingRecord(payload);
      }
    } catch (e) {
      setData(data.map(r => r.id === record.id ? payload : r));
      setViewingRecord(payload);
    }
  };

  const filteredData = data.filter(record => 
    record.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (record.venue && record.venue.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  const totalBookings = data.length;
  const totalAmount = data.reduce((sum, r) => sum + r.totalPrice + (r.travelAmount || 0), 0);
  const totalPending = data.reduce((sum, r) => sum + Math.max(0, (r.totalPrice + (r.travelAmount || 0)) - r.advance), 0);
  const totalMoney = totalAmount - totalPending;

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Cinzel', serif", color: "#a27022" }}>Loading Makeup Data...</div>;
  }

  return (
    <div className="cd-container">
      <style>{`
        .cd-container { padding: 24px; max-width: 1000px; margin: 0 auto; font-family: 'EB Garamond', serif; }
        .cd-header { text-align: center; margin-bottom: 32px; }
        .cd-title { font-family: 'Cinzel', serif; color: #a27022; font-size: 32px; margin: 0; }
        .cd-subtitle { color: #666; font-style: italic; margin-top: 8px; }
        
        .cd-controls { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; flex-wrap: wrap; gap: 12px; }
        .cd-search { padding: 10px 16px; width: 100%; max-width: 350px; border-radius: 4px; border: 1px solid #c4a060; font-family: 'EB Garamond', serif; font-size: 16px; background: #fff; color: #1a1a1a; }
        .cd-btn-add { padding: 10px 20px; background: #a27022; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: 600; white-space: nowrap; }
        
        .cd-table-wrap { overflow-x: auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .cd-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .cd-table th { padding: 16px; text-align: left; font-family: 'Cinzel', serif; color: #1a1a1a; }
        .cd-table td { padding: 16px; color: #555; }
        .cd-table tr { border-bottom: 1px solid #eee; }
        .cd-form-row { display: flex; gap: 12px; }
        
        @media (max-width: 768px) {
          .cd-container { padding: 12px 4px; }
          .cd-controls { flex-direction: column; align-items: stretch; padding: 0 8px; }
          .cd-header { padding: 0 8px; }
          .cd-search { max-width: 100%; }
          .cd-btn-add { width: 100%; text-align: center; }
          /* Revert to list-style table for mobile */
          .cd-table-wrap { border-radius: 8px; border: 1px solid #eee; overflow-x: auto; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .cd-table { min-width: 600px; font-size: 14px; }
          .cd-table th, .cd-table td { padding: 10px 8px; }
          
          .cd-form-row { flex-direction: column; gap: 12px; }
        }
      `}</style>
      
      <div className="cd-header">
        <h2 className="cd-title">Makeup Bookings Data</h2>
        <p className="cd-subtitle">Record of clients booking makeup services</p>
      </div>

      <div style={{ marginBottom: "32px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 24px 0", fontFamily: "'Cinzel', serif", color: "#a27022", fontSize: "20px" }}>Revenue Dashboard</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap" }}>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Bookings</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>{totalBookings}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Amount</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalAmount}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Pending</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#cc5555" }}>₹{totalPending}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Received Money</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalMoney}</p>
          </div>
        </div>
      </div>

      <div className="cd-controls">
        <input 
          type="text" 
          placeholder="Search by client or venue..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cd-search"
        />
        <button 
          onClick={() => {
            resetForm();
            setShowAddPopup(true);
          }}
          className="cd-btn-add"
        >
          + Add New Booking
        </button>
      </div>

      <div className="cd-table-wrap">
        <table className="cd-table">
          <thead>
            <tr style={{ background: "#fcf9f2", borderBottom: "2px solid #a27022" }}>
              <th style={{ width: "50px" }}>S.No.</th>
              <th>Client Name</th>
              <th>Booking Date</th>
              <th style={{ textAlign: "center" }}>Count</th>
              <th>Total Price</th>
              <th>Pending Amount</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => {
                const pendingAmount = (record.totalPrice + (record.travelAmount || 0)) - record.advance;
                const isPending = pendingAmount > 0;
                const rowBg = isPending ? "#feecec" : "transparent";
                const hoverBg = isPending ? "#fcdcdc" : "#fafafa";
                return (
                  <tr 
                    key={record.id} 
                    onClick={() => setViewingRecord(record)} 
                    style={{ cursor: "pointer", transition: "background 0.2s", background: rowBg }} 
                    onMouseEnter={e => e.currentTarget.style.background = hoverBg} 
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td data-label="S.No." style={{ fontWeight: "bold", color: "#666" }}>{index + 1}</td>
                    <td data-label="Client Name" style={{ fontWeight: 600 }}>{record.clientName}</td>
                    <td data-label="Booking Date">{record.bookingDate}</td>
                    <td data-label="Count" style={{ textAlign: "center" }}>{record.noOfServices}</td>
                    <td data-label="Total Price" style={{ fontWeight: 600, color: "#1a1a1a" }}>₹{record.totalPrice}</td>
                    <td data-label="Pending Amount" style={{ fontWeight: 600, color: isPending ? "#cc5555" : "#666" }}>₹{pendingAmount}</td>
                    <td className="actions-cell" style={{ position: "relative", textAlign: "center" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === record.id ? null : record.id); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px", color: "#a27022" }}
                      >
                        ⋮
                      </button>
                      {activeMenuId === record.id && (
                        <div style={{
                          position: "absolute", right: "24px", top: "40px", background: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "4px", zIndex: 10,
                          display: "flex", flexDirection: "column", minWidth: "120px", border: "1px solid #eee"
                        }}>
                          <button onClick={(e) => { e.stopPropagation(); setViewingRecord(record); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#1a1a1a", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>👁 View Details</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'edit', recordId: record.id, record }); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#1a1a1a", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>✎ Edit Item</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', recordId: record.id }); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "#cc5555", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>× Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddPopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "8px",
            width: "90%", maxWidth: "450px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: "16px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a"
          }}>
            <h3 style={{ margin: 0, color: "#a27022", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600 }}>
              {editingId ? "Edit Booking" : "Add New Booking"}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Client Name</label>
              <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="e.g. Seeta patel" style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div className="cd-form-row">
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Phone (Optional)</label>
                <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 00000 00000" style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Email (Optional)</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="example@email.com" style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Booking Date</label>
              <input type="date" value={newBookingDate} onChange={e => setNewBookingDate(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Services Taken</label>
              
              {newServices.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                  {newServices.map((s, idx) => (
                    <span key={idx} style={{ background: "#fcf9f2", color: "#a27022", border: "1px solid #c4a060", padding: "4px 8px", borderRadius: "4px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'EB Garamond', serif" }}>
                      {s}
                      <button onClick={() => {
                        const updated = newServices.filter((_, i) => i !== idx);
                        setNewServices(updated);
                        setNewNoOfServices(updated.length);
                      }} style={{ background: "transparent", border: "none", color: "#cc5555", cursor: "pointer", padding: 0, fontSize: "18px", lineHeight: 1, display: "flex", alignItems: "center" }}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              
              <select 
                value="" 
                onChange={e => {
                  if (e.target.value) {
                    const updated = [...newServices, e.target.value];
                    setNewServices(updated);
                    setNewNoOfServices(updated.length);
                  }
                }} 
                style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }}
              >
                <option value="">-- Add a Service --</option>
                {serviceOptions.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="cd-form-row">
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>No. of Services Count</label>
                <input type="number" value={newNoOfServices} onChange={e => setNewNoOfServices(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Travel Amount (₹)</label>
                <input type="number" value={newTravelAmount} onChange={e => setNewTravelAmount(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
            </div>

            <div className="cd-form-row">
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Total Price (₹)</label>
                <input type="number" value={newTotalPrice} onChange={e => setNewTotalPrice(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Received Money (₹)</label>
                <input type="number" value={newAdvance} onChange={e => setNewAdvance(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Venue (Optional)</label>
              <input value={newVenue} onChange={e => setNewVenue(e.target.value)} placeholder="e.g. Grand Hyatt" style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => setShowAddPopup(false)} style={{ padding: "8px 16px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "2px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: "8px 16px", background: "#a27022", color: "#fff", border: "none", borderRadius: "2px", cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                {editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1100,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#fff", padding: "32px", borderRadius: "12px",
            width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", alignItems: "center",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a", textAlign: "center"
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: confirmAction.type === 'delete' ? "#feecec" : "#fcf9f2",
              color: confirmAction.type === 'delete' ? "#cc5555" : "#a27022",
              display: "flex", justifyContent: "center", alignItems: "center",
              fontSize: "28px", marginBottom: "16px"
            }}>
              {confirmAction.type === 'delete' ? "!" : "?"}
            </div>
            
            <h3 style={{ margin: "0 0 12px 0", color: "#1a1a1a", fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 600 }}>
              {confirmAction.type === 'delete' ? "Confirm Deletion" : "Confirm Edit"}
            </h3>
            
            <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
              {confirmAction.type === 'delete' 
                ? "Are you sure you want to delete this booking? This action cannot be undone." 
                : "Are you sure you want to proceed with editing this booking?"}
            </p>
            
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button 
                onClick={() => setConfirmAction(null)} 
                style={{ 
                  flex: 1, padding: "12px", background: "#f5f5f5", border: "none", 
                  borderRadius: "6px", cursor: "pointer", color: "#555", 
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmAction} 
                style={{ 
                  flex: 1, padding: "12px", 
                  background: confirmAction.type === 'delete' ? "#cc5555" : "#a27022", 
                  color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", 
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" 
                }}
              >
                {confirmAction.type === 'delete' ? "Delete" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1200,
          backdropFilter: "blur(4px)"
        }} onClick={() => setViewingRecord(null)}>
          <div style={{
            background: "#fff", padding: "32px", borderRadius: "12px",
            width: "90%", maxWidth: "500px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", gap: "20px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #eee", paddingBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#a27022", fontFamily: "'Cinzel', serif", fontSize: "24px", fontWeight: 600 }}>Booking Details</h3>
                <span style={{ fontSize: "14px", color: "#666" }}>ID: #{viewingRecord.id} • {viewingRecord.bookingDate}</span>
              </div>
              <button onClick={() => setViewingRecord(null)} style={{ background: "none", border: "none", fontSize: "28px", cursor: "pointer", color: "#999", lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "16px" }}>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Client Name</strong>{viewingRecord.clientName}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Venue</strong>{viewingRecord.venue || '-'}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Phone No.</strong>{viewingRecord.phone || '-'}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Email</strong>{viewingRecord.email || '-'}</div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "16px" }}>
                <strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Services Taken ({viewingRecord.noOfServices})</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {viewingRecord.services ? viewingRecord.services.split(',').map((s, i) => (
                    <span key={i} style={{ background: "#fcf9f2", border: "1px solid #e0d5c1", padding: "4px 10px", borderRadius: "16px", fontSize: "14px", color: "#666" }}>{s.trim()}</span>
                  )) : '-'}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "16px", display: "flex", justifyContent: "space-between" }}>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Price</strong><span style={{ fontSize: "18px", fontWeight: "bold" }}>₹{viewingRecord.totalPrice}</span></div>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Received Money</strong><span style={{ fontSize: "18px" }}>₹{viewingRecord.advance}</span></div>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Travel Fee</strong><span style={{ fontSize: "18px" }}>₹{viewingRecord.travelAmount}</span></div>
              </div>
              <div style={{ gridColumn: "1 / -1", background: "#fcf9f2", padding: "16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e0d5c1" }}>
                <strong style={{ color: "#a27022", fontSize: "16px", fontFamily: "'Cinzel', serif" }}>Balance Due:</strong>
                <span style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a" }}>₹{(viewingRecord.totalPrice + (viewingRecord.travelAmount || 0)) - viewingRecord.advance}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button onClick={() => { setConfirmAction({ type: 'edit', recordId: viewingRecord.id, record: viewingRecord }); setViewingRecord(null); }} style={{ flex: 1, padding: "12px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "6px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>Edit Booking</button>
              {((viewingRecord.totalPrice + (viewingRecord.travelAmount || 0)) - viewingRecord.advance) > 0 && (
                <button onClick={() => handlePaymentSettled(viewingRecord)} style={{ flex: 1, padding: "12px", background: "#3a7a3a", border: "none", borderRadius: "6px", cursor: "pointer", color: "#fff", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>Payment Settled</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
