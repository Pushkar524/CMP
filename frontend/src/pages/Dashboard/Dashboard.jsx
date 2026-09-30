import React from 'react';
import { Activity, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { name: 'Overall Compliance', value: '87%', icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Active Documents', value: '142', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Expiring Soon (30d)', value: '12', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Lapsed Licenses', value: '3', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const recentActivity = [
    { id: 1, action: 'Trade License Renewed', location: 'Store #042 - Bangalore', time: '2 hours ago' },
    { id: 2, action: 'Fire NOC Expired', location: 'Warehouse A - Mumbai', time: '5 hours ago' },
    { id: 3, action: 'Audit Link Generated', location: 'HQ - Delhi', time: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5 flex items-center">
                <div className={`rounded-md p-3 ${item.bg}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 truncate">{item.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="flow-root">
          <ul className="-mb-8">
            {recentActivity.map((activity, idx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {idx !== recentActivity.length - 1 && (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  <div className="relative flex space-x-3">
                    <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white z-10">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </span>
                    <div className="flex-1 flex justify-between space-x-4 pt-1.5">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{activity.action}</span> at{' '}
                        <span className="font-medium text-gray-900">{activity.location}</span>
                      </p>
                      <time className="text-right text-sm text-gray-500">{activity.time}</time>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
