import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  error,
}) => {
  const [showAndroid, setShowAndroid] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroid(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
      )}

      {Platform.OS === 'ios' ? (
        <View className="flex-row items-center justify-between bg-slate-100 rounded-2xl px-4 py-3 border border-transparent">
          <Text className="text-slate-700 text-sm font-medium">Select Date</Text>
          <DateTimePicker
            value={value}
            mode="date"
            display="default"
            onChange={handleDateChange}
            themeVariant="light"
          />
        </View>
      ) : (
        <View>
          <TouchableOpacity
            onPress={() => setShowAndroid(true)}
            activeOpacity={0.7}
            className={`bg-slate-100 rounded-2xl px-4 py-4 border ${
              error ? 'border-brand-rose' : 'border-transparent'
            }`}
          >
            <Text className="text-slate-800 text-sm font-medium">
              {formatDate(value)}
            </Text>
          </TouchableOpacity>

          {showAndroid && (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
      )}

      {error && (
        <Text className="text-brand-rose text-xs mt-1.5 font-medium ml-1">
          {error}
        </Text>
      )}
    </View>
  );
};
