import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface AmountInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  currencySymbol?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  label,
  error,
  currencySymbol = '₹',
  className = '',
  ...props
}) => {
  const handleChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return; // Prevent multiple decimals
    if (parts[1] && parts[1].length > 2) return; // Prevent more than 2 decimal places
    onChangeText(cleaned);
  };

  return (
    <View className="w-full mb-6 items-center">
      {label && (
        <Text className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider text-center">
          {label}
        </Text>
      )}
      <View className="flex-row items-center justify-center">
        <Text className="text-slate-800 text-4xl font-semibold mr-1.5">{currencySymbol}</Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#cbd5e1" // slate-300
          className={`text-slate-800 text-5xl font-bold min-w-[120px] text-center p-0 ${className}`}
          style={{ includeFontPadding: false }}
          {...props}
        />
      </View>
      {error && (
        <Text className="text-brand-rose text-xs mt-2 font-medium">
          {error}
        </Text>
      )}
    </View>
  );
};
