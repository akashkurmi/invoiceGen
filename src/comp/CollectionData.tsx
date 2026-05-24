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

interface NewRentalItem {
  id: string;
  outfit: string;
  rentDate: string;
  returnDate: string;
  price: number;
  advance: number;
  status: 'Rented' | 'Returned' | 'Overdue';
}

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
  const [newItems, setNewItems] = useState<NewRentalItem[]>([
    { id: Date.now().toString(), outfit: "", rentDate: "", returnDate: "", price: 0, advance: 0, status: "Rented" }
  ]);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'edit' | 'delete', recordId: number, record?: RentalRecord } | null>(null);
  const [viewingRecord, setViewingRecord] = useState<RentalRecord | null>(null);

  const handleAddRentalSubmit = async () => {
    if (!newMemberName || newItems.some(i => !i.outfit)) return;
    
    if (editingId) {
      const item = newItems[0];
      const payload = {
        memberName: newMemberName,
        phone: newPhone,
        outfit: item.outfit,
        rentDate: item.rentDate,
        returnDate: item.returnDate,
        status: item.status,
        price: item.price,
        advance: item.advance
      };
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
          setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
        }
      } catch (e) {
        setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
      }
    } else {
      const payloads = newItems.map(item => ({
        memberName: newMemberName,
        phone: newPhone,
        outfit: item.outfit,
        rentDate: item.rentDate,
        returnDate: item.returnDate,
        status: item.status,
        price: item.price,
        advance: item.advance
      }));
      
      const newRecords = [];
      let currentId = Date.now();
      for (const payload of payloads) {
        try {
          const res = await fetch('/api/rentals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            newRecords.push(await res.json());
          } else {
            newRecords.push({ id: currentId++, ...payload } as RentalRecord);
          }
        } catch (e) {
          newRecords.push({ id: currentId++, ...payload } as RentalRecord);
        }
      }
      setData([...newRecords, ...data]);
    }
    
    setShowAddPopup(false);
    setEditingId(null);
    setNewMemberName("");
    setNewPhone("");
    setNewItems([{ id: Date.now().toString(), outfit: "", rentDate: "", returnDate: "", price: 0, advance: 0, status: "Rented" }]);
  };

  const handleEditClick = (record: RentalRecord) => {
    setConfirmAction({ type: 'edit', recordId: record.id, record });
    setActiveMenuId(null);
  };

  const handleDeleteClick = (record: RentalRecord) => {
    setConfirmAction({ type: 'delete', recordId: record.id });
    setActiveMenuId(null);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === 'edit') {
      const record = confirmAction.record!;
      setEditingId(record.id);
      setNewMemberName(record.memberName);
      setNewPhone(record.phone);
      setNewItems([{
        id: '1',
        outfit: record.outfit,
        rentDate: record.rentDate,
        returnDate: record.returnDate,
        price: record.price,
        advance: record.advance,
        status: record.status
      }]);
      setShowAddPopup(true);
    } else if (confirmAction.type === 'delete') {
      const id = confirmAction.recordId;
      try {
        await fetch(`/api/rentals?id=${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
      setData(data.filter(r => r.id !== id));
    }
    setConfirmAction(null);
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
        .cd-form-row { display: flex; gap: 12px; }
        @media (max-width: 600px) {
          .cd-form-row { flex-direction: column; gap: 12px; }
        }
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
        
        /* Mobile styling */
        @media (max-width: 768px) {
          .cd-container { padding: 12px 4px; }
          .cd-controls { flex-direction: column; align-items: stretch; padding: 0 8px; }
          .cd-header { padding: 0 8px; }
          .cd-search { max-width: 100%; }
          .cd-btn-add { width: 100%; text-align: center; }
          /* Revert to list-style table for mobile */
          .cd-table-wrap, .cd-outfit-wrap { border-radius: 8px; border: 1px solid #eee; overflow-x: auto; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .cd-table { min-width: 600px; font-size: 14px; }
          .cd-table th, .cd-table td { padding: 10px 8px; }
          .cd-form-row { flex-direction: column; gap: 12px; }
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
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px", width: "50px" }}>S.No.</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Outfit Name</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Purchase Value</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px", textAlign: "center" }}>Times Rented</th>
                <th style={{ padding: "12px 8px", fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px", textAlign: "right" }}>Total Gross</th>
              </tr>
            </thead>
            <tbody>
              {outfitStats.map((stats, index) => (
                <tr key={stats.name} style={{ borderBottom: "1px solid #eee" }}>
                  <td data-label="S.No." style={{ padding: "12px 8px", color: "#666", fontWeight: "bold" }}>{index + 1}</td>
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
            setNewItems([{ id: Date.now().toString(), outfit: "", rentDate: "", returnDate: "", price: 0, advance: 0, status: "Rented" }]);
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
              <th style={{ width: "50px" }}>S.No.</th>
              <th>Member Name</th>
              <th>Outfit</th>
              <th>Rent Date</th>
              <th>Price</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => {
                const rowBg = record.status === 'Overdue' ? '#feecec' : record.status === 'Rented' ? '#eaf4ea' : 'transparent';
                const textColor = record.status === 'Returned' ? '#888' : '#1a1a1a';
                return (
                <tr 
                  key={record.id} 
                  style={{ background: rowBg, cursor: "pointer", borderBottom: "1px solid #eee", transition: "background 0.2s" }} 
                  onClick={() => setViewingRecord(record)}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"} 
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <td style={{ fontWeight: "bold", color: "#666" }}>{index + 1}</td>
                  <td style={{ fontWeight: 600, color: textColor }}>{record.memberName}</td>
                  <td style={{ color: textColor }}>{record.outfit}</td>
                  <td style={{ color: textColor }}>{record.rentDate}</td>
                  <td style={{ fontWeight: 600, color: textColor }}>₹{record.price}</td>
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
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(record); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#1a1a1a", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>✎ Edit Item</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(record); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "#cc5555", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>× Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );})
            ) : (
              <tr>
                <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
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
            width: "90%", maxWidth: "500px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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

            <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {newItems.map((item, index) => (
                <div key={item.id} style={{ border: "1px solid #e0d5c1", padding: "16px", borderRadius: "8px", background: "#fcf9f2", position: "relative", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#a27022", fontSize: "16px" }}>Outfit Item {index + 1}</h4>
                    {newItems.length > 1 && !editingId && (
                      <button onClick={() => setNewItems(newItems.filter(i => i.id !== item.id))} style={{ background: "transparent", border: "none", color: "#cc5555", cursor: "pointer", fontSize: "20px", padding: "0 4px" }}>&times;</button>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Outfit Selection</label>
                    <select 
                      value={item.outfit} 
                      onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, outfit: e.target.value } : i))} 
                      style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }}
                    >
                      <option value="">-- Select Outfit --</option>
                      {outfits.filter(o => o.name === item.outfit || !newItems.some(i => i.id !== item.id && i.outfit === o.name)).map(o => (
                        <option key={o.id} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cd-form-row">
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Rent Date</label>
                      <input type="date" value={item.rentDate} onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, rentDate: e.target.value } : i))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Return Date</label>
                      <input type="date" value={item.returnDate} onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, returnDate: e.target.value } : i))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
                    </div>
                  </div>

                  <div className="cd-form-row">
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Price (₹)</label>
                      <input type="number" value={item.price} onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) } : i))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Advance (₹)</label>
                      <input type="number" value={item.advance} onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, advance: Number(e.target.value) } : i))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>Status</label>
                    <select value={item.status} onChange={e => setNewItems(newItems.map(i => i.id === item.id ? { ...i, status: e.target.value as 'Rented'|'Returned'|'Overdue' } : i))} style={{ padding: "8px", border: "1px solid #c4a060", borderRadius: "4px", fontSize: "16px", fontFamily: "'EB Garamond', serif" }}>
                      <option value="Rented">Rented</option>
                      <option value="Returned">Returned</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              ))}
              
              {!editingId && (
                <button 
                  onClick={() => setNewItems([...newItems, { id: Date.now().toString(), outfit: "", rentDate: "", returnDate: "", price: 0, advance: 0, status: "Rented" }])}
                  style={{ padding: "10px", background: "#fff", border: "1px dashed #c4a060", borderRadius: "8px", color: "#a27022", cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600 }}
                >
                  + Add Another Outfit for this Person
                </button>
              )}
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
                ? "Are you sure you want to delete this record? This action cannot be undone." 
                : "Are you sure you want to proceed with editing this record?"}
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
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000,
          padding: "20px"
        }} onClick={() => setViewingRecord(null)}>
          <div style={{
            background: "#fff", padding: "32px", borderRadius: "12px",
            width: "90%", maxWidth: "500px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", gap: "24px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a",
            maxHeight: "90vh", overflowY: "auto", position: "relative"
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingRecord(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", color: "#999", padding: "4px" }}>&times;</button>
            
            <div style={{ textAlign: "center", borderBottom: "1px solid #eee", paddingBottom: "16px" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#a27022", fontFamily: "'Cinzel', serif", fontSize: "24px" }}>{viewingRecord.memberName}</h3>
              {viewingRecord.phone && <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>{viewingRecord.phone}</p>}
              <span style={{
                display: "inline-block", marginTop: "12px", padding: "4px 16px", borderRadius: "16px", fontSize: "14px", fontWeight: "bold",
                backgroundColor: viewingRecord.status === 'Rented' ? '#eaf4ea' : viewingRecord.status === 'Returned' ? '#f0f0f0' : '#feecec',
                color: viewingRecord.status === 'Rented' ? '#3a7a3a' : viewingRecord.status === 'Returned' ? '#666' : '#cc5555'
              }}>
                {viewingRecord.status}
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1", background: "#fcf9f2", padding: "16px", borderRadius: "8px", border: "1px solid #e0d5c1" }}>
                <strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Outfit Rented</strong>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>{viewingRecord.outfit}</span>
              </div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Rent Date</strong><span style={{ fontSize: "16px" }}>{viewingRecord.rentDate}</span></div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Return Date</strong><span style={{ fontSize: "16px" }}>{viewingRecord.returnDate}</span></div>
              
              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "16px", display: "flex", justifyContent: "space-between" }}>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Price</strong><span style={{ fontSize: "18px", fontWeight: "bold" }}>₹{viewingRecord.price}</span></div>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Advance Paid</strong><span style={{ fontSize: "18px" }}>₹{viewingRecord.advance}</span></div>
              </div>
              <div style={{ gridColumn: "1 / -1", background: "#fcf9f2", padding: "16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e0d5c1" }}>
                <strong style={{ color: "#a27022", fontSize: "16px", fontFamily: "'Cinzel', serif" }}>Balance Due:</strong>
                <span style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a" }}>₹{viewingRecord.price - viewingRecord.advance}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button onClick={() => { handleEditClick(viewingRecord); setViewingRecord(null); }} style={{ flex: 1, padding: "12px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "6px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>Edit Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
