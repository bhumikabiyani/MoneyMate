import React from 'react';
import { View, TouchableOpacity, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'flat' | 'elevated' | 'outline';
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  onPress,
  variant = 'flat',
  className = '',
  children,
  ...props
}) => {
  const getCardStyle = () => {
    let base = 'rounded-3xl p-5 ';

    switch (variant) {
      case 'flat':
        base += 'bg-slate-100/80';
        break;
      case 'elevated':
        base += 'bg-white shadow-sm shadow-slate-200';
        break;
      case 'outline':
        base += 'bg-white border border-slate-200';
        break;
    }

    return base;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`${getCardStyle()} ${className}`}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={`${getCardStyle()} ${className}`} {...props}>
      {children}
    </View>
  );
};
