import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SettleScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
      <Text className="text-2xl font-bold text-slate-800">Settle Balance</Text>
      <Text className="text-slate-500 mt-2 text-center px-6">
        Log a payment to settle debts between users.
      </Text>
    </SafeAreaView>
  );
};
