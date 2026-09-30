import React from 'react';

const Documents = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center h-64">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Documents Registry</h3>
      <p className="text-gray-500 mb-4">View and manage all uploaded compliance documents.</p>
      <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
        Upload Document
      </button>
    </div>
  );
};

export default Documents;
