import { useState } from "react";
import "./App.css";
import GayatriCollection from "./comp/Template/gayatriCollection.js";
import AnjalMakeoverInvoice from "./comp/templateNewClaud.js";
import CollectionData from "./comp/CollectionData.js";

function App() {
  // 1. Initialize state to keep track of the selected component
  const [selectedTemplate, setSelectedTemplate] = useState("Gayatri");

  return (
    <div style={{ padding: "20px" }}>
      {/* 2. Create the Dropdown Selection */}
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="template-select">Select Invoice Template: </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="Gayatri">Gayatri Collection</option>
          <option value="Anjal">Anjal Makeover</option>
          <option value="CollectionData">Collection Data</option>
        </select>
      </div>

      <hr />

      {/* 3. Conditionally render the selected component */}
      <div className="display-area">
        {selectedTemplate === "Gayatri" && <GayatriCollection />}
        {selectedTemplate === "Anjal" && <AnjalMakeoverInvoice />}
        {selectedTemplate === "CollectionData" && <CollectionData />}
      </div>
    </div>
  );
}

export default App;
