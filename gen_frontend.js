const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');
const dirs = [
  'components',
  'pages/Auth',
  'pages/Dashboard',
  'pages/Locations',
  'pages/Documents',
  'pages/ComplianceScore',
  'pages/AuditLinks',
  'services',
  'hooks',
  'context'
];

dirs.forEach(d => fs.mkdirSync(path.join(srcDir, d), { recursive: true }));

const files = {
  'main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
  'App.jsx': `import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Locations from './pages/Locations/Locations';
import Documents from './pages/Documents/Documents';
import ComplianceScore from './pages/ComplianceScore/ComplianceScore';
import AuditLinks from './pages/AuditLinks/AuditLinks';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="locations" element={<Locations />} />
          <Route path="documents" element={<Documents />} />
          <Route path="compliance" element={<ComplianceScore />} />
          <Route path="audit-links" element={<AuditLinks />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
`,
  'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f3f4f6;
}
`,
  'components/Layout.jsx': `import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, FileText, ShieldAlert, Link as LinkIcon, LogOut } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Locations', path: '/locations', icon: MapPin },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Compliance Score', path: '/compliance', icon: ShieldAlert },
    { name: 'Audit Links', path: '/audit-links', icon: LinkIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r shadow-sm">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-indigo-600">SCLIP</h1>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={\`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors \${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }\`}
              >
                <Icon className={\`mr-3 h-5 w-5 \${isActive ? 'text-indigo-700' : 'text-gray-400'}\`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <Link
            to="/login"
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            Logout
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b shadow-sm flex items-center px-8 justify-between shrink-0">
          <h2 className="text-lg font-medium text-gray-800">
             {navItems.find(item => location.pathname.includes(item.path))?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Welcome, Admin</span>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
`,
  'pages/Auth/Login.jsx': `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@sclip.local');
  const [password, setPassword] = useState('password123');

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to SCLIP
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Compliance Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email" name="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password" name="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me" name="remember-me" type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
`,
  'pages/Dashboard/Dashboard.jsx': `import React from 'react';
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
                <div className={\`rounded-md p-3 \${item.bg}\`}>
                  <Icon className={\`h-6 w-6 \${item.color}\`} />
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
`,
  'pages/Locations/Locations.jsx': `import React from 'react';

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
                <span className={\`px-2 inline-flex text-xs font-semibold rounded-full \${loc.score >= 90 ? 'bg-green-100 text-green-800' : loc.score >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}\`}>
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
`,
  'pages/Documents/Documents.jsx': `import React from 'react';

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
`,
  'pages/ComplianceScore/ComplianceScore.jsx': `import React from 'react';

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
`,
  'pages/AuditLinks/AuditLinks.jsx': `import React from 'react';

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
`
};

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(srcDir, file), content);
}
console.log('Frontend generated successfully.');
