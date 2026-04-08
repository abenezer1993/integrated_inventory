import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Business intelligence and reporting</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Analytics</h3>
          <p className="text-gray-600 mb-4">
            This module will provide comprehensive reports, charts, and business insights.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
