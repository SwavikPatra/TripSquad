import React from 'react';

const roleStyles = {
  admin: 'bg-blue-600 text-white',
  moderator: 'bg-gray-600 text-white',
  member: 'bg-cyan-600 text-white'
};

const GroupCard = ({ group, onClick }) => {
  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{group.name}</h3>
      {group.description && (
        <p className="text-gray-600 mb-3">{group.description}</p>
      )}
      <div className="flex justify-end">
        <span className={`text-xs px-2 py-1 rounded-full ${roleStyles[group.role]}`}>
          {group.role}
        </span>
      </div>
    </div>
  );
};

export default GroupCard;