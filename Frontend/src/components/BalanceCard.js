import React from 'react';

const BalanceCard = ({ balance }) => {
  const isOwed = balance.direction === 'owes_you';
  
  return (
    <div className={`rounded-lg p-4 text-white ${isOwed ? 'bg-green-600' : 'bg-red-600'}`}>
      <h4 className="font-semibold text-lg mb-1">{balance.group_name}</h4>
      <p className="mb-2">
        {isOwed 
          ? `${balance.other_user_name} owes you` 
          : `You owe ${balance.other_user_name}`}
      </p>
      <div className="text-xl font-bold">
        ₹{balance.net_amount.toFixed(2)}
      </div>
    </div>
  );
};

export default BalanceCard;