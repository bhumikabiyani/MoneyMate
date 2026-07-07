import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
}) => {
  const getContainerStyle = () => {
    let base = 'flex-row items-center justify-center rounded-2xl ';
    
    if (disabled || loading) {
      base += 'opacity-50 ';
    }

    switch (variant) {
      case 'primary':
        base += 'bg-primary-500 active:bg-primary-600';
        break;
      case 'secondary':
        base += 'bg-slate-200 active:bg-slate-300';
        break;
      case 'outline':
        base += 'bg-transparent border border-slate-300 active:bg-slate-100';
        break;
      case 'danger':
        base += 'bg-brand-rose active:bg-rose-600';
        break;
      case 'ghost':
        base += 'bg-transparent active:bg-slate-100';
        break;
    }

    switch (size) {
      case 'sm':
        base += ' px-4 py-2';
        break;
      case 'md':
        base += ' px-6 py-3.5';
        break;
      case 'lg':
        base += ' px-8 py-4.5';
        break;
    }

    return base;
  };

  const getTextStyle = () => {
    let base = 'font-semibold text-center ';

    switch (variant) {
      case 'primary':
      case 'danger':
        base += 'text-white';
        break;
      case 'secondary':
        base += 'text-slate-800';
        break;
      case 'outline':
        base += 'text-slate-700';
        break;
      case 'ghost':
        base += 'text-slate-600';
        break;
    }

    switch (size) {
      case 'sm':
        base += ' text-xs';
        break;
      case 'md':
        base += ' text-sm';
        break;
      case 'lg':
        base += ' text-base';
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      className={`${getContainerStyle()} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#64748b'} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
