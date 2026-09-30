import React from 'react';

const ComplianceScore = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Score Breakdown</h3>
      <div className="p-4 border rounded bg-gray-50 text-sm text-gray-600">
        <p>This module displays charts and historical trends of the organization's compliance score, breaking down risk by location and document type.</p>
      </div>
    </div>
  );
};

export default ComplianceScore;
