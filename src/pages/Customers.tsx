import React from 'react';

const Customers: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600">Manage your customer database</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Management</h3>
          <p className="text-gray-600 mb-4">
            This module will include customer registration, credit management, purchase history, and customer analytics.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900">Features Coming Soon:</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Customer registration & profiles</li>
                <li>• Credit limit management</li>
                <li>• Purchase history tracking</li>
                <li>• Customer analytics</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900">Business Value:</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Improved customer relationships</li>
                <li>• Better credit risk management</li>
                <li>• Targeted marketing insights</li>
                <li>• Increased customer retention</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customers;
