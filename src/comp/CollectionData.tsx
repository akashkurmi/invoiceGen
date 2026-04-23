import { useState, useEffect } from 'react';
import './Template.css';
interface Outfit {
  id: number;
  name: string;
  purchaseValue: number;
}
// collection
const mockOutfits: Outfit[] = [
  { id: 1, name: "Bridal Lehenga - Crimson Red", purchaseValue: 45000 },
  { id: 2, name: "Saree - Gold Zari", purchaseValue: 12000 },
  { id: 3, name: "Indo-Western Gown - Midnight Blue", purchaseValue: 25000 }
];

interface RentalRecord {
  id: number;
  memberName: string;
  phone: string;
  outfit: string;
  rentDate: string;
  returnDate: string;
  status: 'Rented' | 'Returned' | 'Overdue';
  price: number;
  advance: number;
}

const mockData: RentalRecord[] = [
  {
    id: 1,
    memberName: "Ayesha Khan",
    phone: "+91 98765 43210",
    outfit: "Bridal Lehenga - Crimson Red",
    rentDate: "2026-04-10",
    returnDate: "2026-04-15",
    status: 'Returned',
    price: 4500,
    advance: 2000
  },
  {
    id: 2,
    memberName: "Priya Sharma",
    phone: "+91 87654 32109",
    outfit: "Saree - Gold Zari",
    rentDate: "2026-04-18",
    returnDate: "2026-04-22",
    status: 'Overdue',
    price: 1500,
    advance: 500
  },
  {
    id: 3,
    memberName: "Neha Gupta",
    phone: "+91 76543 21098",
    outfit: "Indo-Western Gown - Midnight Blue",
    rentDate: "2026-04-22",
    returnDate: "2026-04-26",
    status: 'Rented',
    price: 2500,
    advance: 1000
  },
  {
    id: 4,
    memberName: "Sara Ali",
    phone: "+91 65432 10987",
    outfit: "Bridal Lehenga - Crimson Red",
    rentDate: "2026-04-20",
    returnDate: "2026-04-25",
    status: 'Rented',
    price: 4500,
    advance: 2000
  }
];

export default function CollectionData() {
  const [data, setData] = useState<RentalRecord[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [outfitsRes, rentalsRes] = await Promise.all([
        fetch('/api/outfits').catch(() => null),
        fetch('/api/rentals').catch(() => null)
      ]);
      
      const outfitsData = outfitsRes?.ok ? await outfitsRes.json() : null;
      const rentalsData = rentalsRes?.ok ? await rentalsRes.json() : null;
      
      if (Array.isArray(outfitsData)) setOutfits(outfitsData);
      else setOutfits(mockOutfits);
      
      if (Array.isArray(rentalsData)) setData(rentalsData);
      else setData(mockData);
    } catch (error) {
      console.error("Failed to fetch data, using mock data", error);
      setOutfits(mockOutfits);
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const [showAddOutfitPopup, setShowAddOutfitPopup] = useState(false);
  const [newOutfitName, setNewOutfitName] = useState("");
  const [newOutfitValue, setNewOutfitValue] = useState<number>(0);

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newOutfit, setNewOutfit] = useState("");
  const [newRentDate, setNewRentDate] = useState("");
  const [newReturnDate, setNewReturnDate] = useState("");
  const [newStatus, setNewStatus] = useState<'Rented' | 'Returned' | 'Overdue'>("Rented");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newAdvance, setNewAdvance] = useState<number>(0);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAddRentalSubmit = async () => {
    if (!newMemberName || !newOutfit) return;
    
    const payload = {
      memberName: newMemberName,
      phone: newPhone,
      outfit: newOutfit,
      rentDate: newRentDate,
      returnDate: newReturnDate,
      status: newStatus,
      price: newPrice,
      advance: newAdvance
    };

    if (editingId) {
      try {
        const res = await fetch('/api/rentals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });
        if (res.ok) {
          const updatedRecord = await res.json();
          setData(data.map(record => record.id === editingId ? updatedRecord : record));
        } else {
          // Fallback if API fails
          setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
        }
      } catch (e) {
        setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
      }
    } else {
      try {
        const res = await fetch('/api/rentals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const newRecord = await res.json();
          setData([newRecord, ...data]);
        } else {
          // Fallback if API fails
          setData([{ id: Date.now(), ...payload } as RentalRecord, ...data]);
        }
      } catch (e) {
        setData([{ id: Date.now(), ...payload } as RentalRecord, ...data]);
      }
    }
    
    setShowAddPopup(false);
    setEditingId(null);
    setNewMemberName("");
    setNewPhone("");
    setNewOutfit("");
    setNewRentDate("");
    setNewReturnDate("");
    setNewStatus("Rented");
    setNewPrice(0);
    setNewAdvance(0);
  };

  const handleEdit = (record: RentalRecord) => {
    setEditingId(record.id);
    setNewMemberName(record.memberName);
    setNewPhone(record.phone);
    setNewOutfit(record.outfit);
    setNewRentDate(record.rentDate);
    setNewReturnDate(record.returnDate);
    setNewStatus(record.status);
    setNewPrice(record.price);
    setNewAdvance(record.advance);
    setActiveMenuId(null);
    setShowAddPopup(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/rentals?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    setData(data.filter(r => r.id !== id));
    setActiveMenuId(null);
  };

  const handleAddOutfitSubmit = async () => {
    if (!newOutfitName) return;
    
    try {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOutfitName, purchaseValue: newOutfitValue })
      });
      if (res.ok) {
        const newOutfit = await res.json();
        setOutfits([...outfits, newOutfit]);
      } else {
        setOutfits([...outfits, { id: Date.now(), name: newOutfitName, purchaseValue: newOutfitValue }]);
      }
    } catch (e) {
      setOutfits([...outfits, { id: Date.now(), name: newOutfitName, purchaseValue: newOutfitValue }]);
    }
    setShowAddOutfitPopup(false);
    setNewOutfitName("");
    setNewOutfitValue(0);
  };

  const filteredData = data.filter(record => 
    record.memberName.toLowerCase().includes(search.toLowerCase()) ||
    record.outfit.toLowerCase().includes(search.toLowerCase()) ||
    record.phone.includes(search)
  );

  const totalGrossOverall = data.reduce((sum, r) => sum + r.price, 0);
  const totalInvested = outfits.reduce((sum, o) => sum + (o.purchaseValue || 0), 0);

  const outfitStats = outfits.map(outfit => {
    const rentals = data.filter(r => r.outfit === outfit.name);
    return {
      name: outfit.name,
      purchaseValue: outfit.purchaseValue,
      count: rentals.length,
      gross: rentals.reduce((sum, r) => sum + r.price, 0)
    };
  });

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Cinzel', serif", color: "#a27022" }}>Loading Collection Data...</div>;
  }

  return (
    <div className="cd-container">
      <style>{`
        .cd-container { padding: 24px; max-width: 1000px; margin: 0 auto; font-family: 'EB Garamond', serif; }
        .cd-header { text-align: center; margin-bottom: 32px; }
        .cd-title { font-family: 'Cinzel', serif; color: #a27022; font-size: 32px; margin: 0; }
        .cd-subtitle { color: #666; font-style: italic; margin-top: 8px; }
        
        .cd-controls { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; flex-wrap: wrap; gap: 12px; }
        .cd-search { padding: 10px 16px; width: 100%; max-width: 350px; border-radius: 4px; border: 1px solid #c4a060; font-family: 'EB Garamond', serif; font-size: 16px; }
        .cd-btn-add { padding: 10px 20px; background: #a27022; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: 600; white-space: nowrap; }
        
        .cd-table-wrap { overflow-x: auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .cd-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .cd-table th { padding: 16px; text-align: left; font-family: 'Cinzel', serif; color: #1a1a1a; }
        .cd-table td { padding: 16px; color: #555; }
        .cd-table tr { border-bottom: 1px solid #eee; }
        
        /* Mobile styling */
        @media (max-width: 768px) {
          .cd-container { padding: 12px 4px; }
          .cd-controls { flex-direction: column; align-items: stretch; padding: 0 8px; }
          .cd-header { padding: 0 8px; }
          .cd-search { max-width: 100%; }
          .cd-btn-add { width: 100%; text-align: center; }
          .cd-table-wrap, .cd-outfit-wrap { border-radius: 0; border-left: none; border-right: none; }
        }
      `}</style>
      <div className="cd-header">
        <h2 className="cd-title">Collection Data</h2>
        <p className="cd-subtitle">List of members who rented outfits</p>
      </div>

      <div style={{ marginBottom: "32px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "8px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#a27022", fontSize: "20px" }}>Revenue Dashboard</h3>
          <button onClick={() => setShowAddOutfitPopup(true)} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #a27022", borderRadius: "4px", color: "#a27022", cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "14px" }}>+ Add Outfit</button>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "48px", marginBottom: "32px", flexWrap: "wrap", textAlign: "center" }}>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Gross Overall</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalGrossOverall}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Invested</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalInvested}</p>
          </div>
        </div>

        <div className="cd-outfit-wrap" style={{ overflowX: "auto" }}>
          <table className="cd-outfit-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e0d5c1", textAlign: "left" }}>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Outfit Name</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Purchase Value</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px", textAlign: "center" }}>Times Rented</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px", textAlign: "right" }}>Total Gross</th>
              </tr>
            </thead>
            <tbody>
              {outfitStats.map(stats => (
                <tr key={stats.name} style={{ borderBottom: "1px solid #eee" }}>
                  <td data-label="Outfit Name" style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", fontWeight: 600, color: "#1a1a1a" }}>{stats.name}</td>
                  <td data-label="Purchase Value" style={{ padding: "12px 8px", color: "#666" }}>{stats.purchaseValue > 0 ? `₹${stats.purchaseValue}` : '-'}</td>
                  <td data-label="Times Rented" style={{ padding: "12px 8px", color: "#1a1a1a", textAlign: "center", fontWeight: "bold" }}>{stats.count}</td>
                  <td data-label="Total Gross" style={{ padding: "12px 8px", color: "#333", textAlign: "right", fontWeight: "bold" }}>₹{stats.gross}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cd-controls">
        <input 
          type="text" 
          placeholder="Search members or outfits..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cd-search"
        />
        <button 
          onClick={() => {
            setEditingId(null);
            setNewMemberName("");
            setNewPhone("");
            setNewOutfit("");
            setNewRentDate("");
            setNewReturnDate("");
            setNewStatus("Rented");
            setNewPrice(0);
            setNewAdvance(0);
            setShowAddPopup(true);
          }}
          className="cd-btn-add"
        >
          + Add New Rental
        </button>
      </div>

      <div className="cd-table-wrap">
        <table className="cd-table">
          <thead>
            <tr style={{ background: "#fcf9f2", borderBottom: "2px solid #a27022" }}>
              <th>Member Name</th>
              <th>Phone No.</th>
              <th>Outfit</th>
              <th>Rent Date</th>
              <th>Return Date</th>
              <th>Price</th>
              <th>Advance</th>
              <th>Status</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map(record => (
                <tr key={record.id}>
                  <td data-label="Member Name" style={{ fontWeight: 600 }}>{record.memberName}</td>
                  <td data-label="Phone No.">{record.phone}</td>
                  <td data-label="Outfit">{record.outfit}</td>
                  <td data-label="Rent Date">{record.rentDate}</td>
                  <td data-label="Return Date">{record.returnDate}</td>
                  <td data-label="Price" style={{ fontWeight: 600, color: "#1a1a1a" }}>₹{record.price}</td>
                  <td data-label="Advance">₹{record.advance}</td>
                  <td data-label="Status">
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      backgroundColor: record.status === 'Rented' ? '#eaf4ea' : record.status === 'Returned' ? '#f0f0f0' : '#feecec',
                      color: record.status === 'Rented' ? '#3a7a3a' : record.status === 'Returned' ? '#666' : '#cc5555'
                    }}>
                      {record.status}
                    </span>
                  </td>
                  <td className="actions-cell" style={{ position: "relative", textAlign: "center" }}>
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
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
                        <button onClick={() => handleEdit(record)} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>✎ Edit Item</button>
                        <button onClick={() => handleDelete(record.id)} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "#cc5555", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>× Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  No records found.
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
            width: "90%", maxWidth: "400px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: "16px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a"
          }}>
            <h3 style={{ margin: 0, color: "#a27022", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600 }}>
              {editingId ? "Edit Rental" : "Add New Rental"}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Member Name</label>
              <input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Phone</label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Outfit</label>
              <select value={newOutfit} onChange={e => setNewOutfit(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }}>
                <option value="">-- Select Outfit --</option>
                {outfits.map(o => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Rent Date</label>
                <input type="date" value={newRentDate} onChange={e => setNewRentDate(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Return Date</label>
                <input type="date" value={newReturnDate} onChange={e => setNewReturnDate(e.target.value)} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Price (₹)</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Advance (₹)</label>
                <input type="number" value={newAdvance} onChange={e => setNewAdvance(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as 'Rented'|'Returned'|'Overdue')} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }}>
                <option value="Rented">Rented</option>
                <option value="Returned">Returned</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => setShowAddPopup(false)} style={{ padding: "8px 16px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "2px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleAddRentalSubmit} style={{ padding: "8px 16px", background: "#a27022", color: "#fff", border: "none", borderRadius: "2px", cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                {editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddOutfitPopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "8px",
            width: "90%", maxWidth: "400px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: "16px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a"
          }}>
            <h3 style={{ margin: 0, color: "#a27022", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600 }}>Add New Outfit</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Outfit Name</label>
              <input value={newOutfitName} onChange={e => setNewOutfitName(e.target.value)} placeholder="e.g. Bridal Lehenga - Pink" style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Purchase Value (₹)</label>
              <input type="number" value={newOutfitValue} onChange={e => setNewOutfitValue(Number(e.target.value))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => setShowAddOutfitPopup(false)} style={{ padding: "8px 16px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "2px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleAddOutfitSubmit} style={{ padding: "8px 16px", background: "#a27022", color: "#fff", border: "none", borderRadius: "2px", cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>Add Outfit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
