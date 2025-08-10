import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string;
    type: 'increase' | 'decrease';
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorVariants = {
  blue: {
    icon: 'text-blue-600 bg-blue-100',
    change: 'text-blue-600'
  },
  green: {
    icon: 'text-green-600 bg-green-100',
    change: 'text-green-600'
  },
  yellow: {
    icon: 'text-yellow-600 bg-yellow-100',
    change: 'text-yellow-600'
  },
  red: {
    icon: 'text-red-600 bg-red-100',
    change: 'text-red-600'
  },
  purple: {
    icon: 'text-purple-600 bg-purple-100',
    change: 'text-purple-600'
  }
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change, color = 'blue' }) => {
  const colors = colorVariants[color];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm font-medium mt-2 ${colors.change}`}>
              {change.type === 'increase' ? '+' : '-'}{change.value}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;