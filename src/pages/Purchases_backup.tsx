import React from 'react';

const Purchases: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials Purchase</h1>
          <p className="text-gray-600">Manage raw materials, supplies, and consumables for manufacturing</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-3xl">🏗️</div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-yellow-800">Purchase Materials System</h3>
            <p className="mt-2 text-yellow-700">
              This module is currently under development. The Purchase Materials Registration system will allow you to:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-yellow-600">
              <li>Manage raw materials and suppliers</li>
              <li>Create and track purchase orders</li>
              <li>Monitor material inventory levels</li>
              <li>Integrate with manufacturing and expenses</li>
            </ul>
            <p className="mt-3 font-medium text-yellow-800">
              Coming soon! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
