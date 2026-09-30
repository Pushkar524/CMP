import React from 'react';

const Locations = () => {
  const locations = [
    { id: 1, name: 'Store #042 - Bangalore', type: 'STORE', score: 95, state: 'Karnataka' },
    { id: 2, name: 'Warehouse A - Mumbai', type: 'WAREHOUSE', score: 72, state: 'Maharashtra' },
    { id: 3, name: 'HQ - Delhi', type: 'OFFICE', score: 100, state: 'Delhi' },
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Locations</h3>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          Add Location
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compliance Score</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {locations.map((loc) => (
            <tr key={loc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loc.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loc.state}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${loc.score >= 90 ? 'bg-green-100 text-green-800' : loc.score >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {loc.score}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" className="text-indigo-600 hover:text-indigo-900">View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Locations;
