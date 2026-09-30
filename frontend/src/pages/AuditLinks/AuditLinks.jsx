import React from 'react';

const AuditLinks = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center h-64">
      <h3 className="text-lg font-medium text-gray-900 mb-2">External Audit Links</h3>
      <p className="text-gray-500 mb-4">Generate secure, time-bound links to share documents with inspectors.</p>
      <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
        Generate New Link
      </button>
    </div>
  );
};

export default AuditLinks;
