import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName = '',
  icon,
  className = '',
  placeholderTextColor = '#94a3b8', // slate-400
  ...props
}) => {
  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-slate-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
      )}
      <View className="relative flex-row items-center">
        {icon && (
          <View className="absolute left-4 z-10">
            {icon}
          </View>
        )}
        <TextInput
          placeholderTextColor={placeholderTextColor}
          className={`flex-1 bg-slate-100 text-slate-800 text-sm rounded-2xl px-4 py-3.5 border ${
            error ? 'border-brand-rose' : 'border-transparent focus:border-slate-300'
          } ${icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </View>
      {error && (
        <Text className="text-brand-rose text-xs mt-1.5 font-medium ml-1">
          {error}
        </Text>
      )}
    </View>
  );
};
