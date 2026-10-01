import React, { useState, useEffect } from "react";
import { Plus, MapPin, Building, ShieldCheck, Search, Filter } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ScoreGauge from "../../components/ScoreGauge";
import AddLocationModal from "../../components/Modals/AddLocationModal";

export default function Locations() {
  const { isOrgAdmin, canAccessLocation } = useAuth();
  const [locations, setLocations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const loadData = () => {
    setLocations(api.getLocations());
    setDocuments(api.getDocuments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddLocation = (newLoc) => {
    api.addLocation(newLoc);
    loadData();
  };

  const filteredLocations = locations
    .filter(l => canAccessLocation(l.id))
    .filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase()) ||
        l.state.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "ALL" || l.type === typeFilter;
      return matchSearch && matchType;
    });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Operating Facilities & Locations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Jurisdictional compliance tracking across physical branches, distribution centers, and offices
          </p>
        </div>

        {isOrgAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Operating Facility
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility name, code, state..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Facility Types</option>
            <option value="STORE">Retail Stores</option>
            <option value="WAREHOUSE">Warehouses</option>
            <option value="OFFICE">Corporate Offices</option>
            <option value="FACTORY">Factories</option>
          </select>
        </div>
      </div>

      {/* Facility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLocations.map((loc) => {
          const locDocs = documents.filter(d => d.location_id === loc.id);
          const score = loc.current_compliance_score || 100;
          const isHealthy = score >= 90;
          const isWarning = score >= 70 && score < 90;

          return (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {loc.code} &bull; {loc.type}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-2 line-clamp-1">{loc.name}</h3>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      isHealthy ? "bg-emerald-100 text-emerald-800" : isWarning ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {score}%
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>State: <strong>{loc.state}</strong></span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">{loc.address || "Address registered in corporate database."}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {locDocs.length} Active Documents
                </span>
                <button
                  onClick={() => setSelectedLocation(loc)}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View Documents &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location Details Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedLocation.name}</h3>
                <p className="text-xs text-gray-500">{selectedLocation.state} &bull; {selectedLocation.code}</p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="my-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Registered Regulatory Licenses
              </h4>
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {documents.filter(d => d.location_id === selectedLocation.id).map(doc => (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-gray-900">{doc.license_name}</div>
                      <div className="text-[11px] text-gray-400">{doc.file_name}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      doc.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLocation(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLocation}
      />
    </div>
  );
}
