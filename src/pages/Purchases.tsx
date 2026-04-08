import React from 'react';

const Purchases: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-gray-600">Manage supplier purchases and stock receiving</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Management</h3>
          <p className="text-gray-600 mb-4">
            This module will handle supplier orders, purchase tracking, and automatic inventory updates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
