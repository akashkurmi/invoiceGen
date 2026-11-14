import { useState } from "react";
import "./App.css";
import GayatriCollection from "./comp/Template/gayatriCollection.js";
import AnjalMakeoverInvoice from "./comp/templateNewClaud.js";
import CollectionData from "./comp/CollectionData.js";
import MakeupData from "./comp/MakeupData.js";

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState("Gayatri");

  return (
    <div className="app-container">
      {/* 2. Create the Dropdown Selection */}
      <div className="template-selector-bar">
        <label htmlFor="template-select">Select Invoice Template: </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="Gayatri">Gayatri Collection</option>
          <option value="Anjali">Anjali Makeover</option>
          <option value="CollectionData">Collection Data</option>
          <option value="MakeupData">Makeup Bookings Data</option>
        </select>
      </div>

      <hr className="template-selector-divider" />

      {/* 3. Conditionally render the selected component */}
      <div className="display-area">
        {selectedTemplate === "Gayatri" && <GayatriCollection />}
        {selectedTemplate === "Anjali" && <AnjalMakeoverInvoice />}
        {selectedTemplate === "CollectionData" && <CollectionData />}
        {selectedTemplate === "MakeupData" && <MakeupData />}
      </div>
    </div>
  );
}

export default App;
