import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../hooks/useUser';
import { DBService } from '../services/db';
import { Budget, Category, Expense } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { AmountInput } from '../components/AmountInput';
import { CategorySelector } from '../components/CategorySelector';
import { useIsFocused } from '@react-navigation/native';

export const BudgetsScreen: React.FC = () => {
  const { user } = useUser();
  const isFocused = useIsFocused();

  // Data state
  const [budgetsList, setBudgetsList] = useState<Budget[]>([]);
  const [categorySpendMap, setCategorySpendMap] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('food');
  const [limitAmount, setLimitAmount] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user?.id && isFocused) {
      loadBudgetsData();
    }
  }, [user?.id, isFocused]);

  const loadBudgetsData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      const cats = await DBService.getCategories();
      setCategories(cats);

      // Load Budgets set by user
      const budgets = await DBService.getBudgets(user.id);
      setBudgetsList(budgets);

      // Calculate spending for each category in current month
      const userGroups = await DBService.getGroups(user.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const spendMap: Record<string, number> = {};

      for (const group of userGroups) {
        const expenses = await DBService.getGroupExpenses(group.id);
        expenses.forEach((exp) => {
          const d = new Date(exp.date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            // Count total spending for this category
            const amt = Number(exp.amount);
            spendMap[exp.category_id] = (spendMap[exp.category_id] || 0) + amt;
          }
        });
      }

      setCategorySpendMap(spendMap);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!limitAmount || Number(limitAmount) <= 0) {
      setFormError('Please enter a valid monthly limit.');
      return;
    }
    setFormError('');

    try {
      await DBService.saveBudget({
        user_id: user?.id || 'unknown_user',
        category: selectedCatId,
        monthly_limit: Number(limitAmount),
      });

      // Clear
      setModalVisible(false);
      setLimitAmount('');

      // Reload
      await loadBudgetsData();
      Alert.alert('Success', 'Category budget saved! 🎯');
    } catch (e) {
      Alert.alert('Error', 'Failed to save budget.');
    }
  };

  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'Custom Category';
  };

  const getCategoryIcon = (catId: string) => {
    return categories.find((c) => c.id === catId)?.icon || '🏷️';
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Budgets 🎯</Text>
          <Text className="text-2xl font-black text-slate-800 tracking-tight">Monthly Limits</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setFormError('');
            setLimitAmount('');
            setModalVisible(true);
          }}
          className="w-10 h-10 items-center justify-center rounded-full bg-primary-100"
        >
          <Text className="text-primary-700 text-xl font-bold">＋</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-5 pt-4">
          {budgetsList.length === 0 ? (
            <Card variant="outline" className="items-center justify-center py-12 bg-white border-slate-200 border-dashed">
              <Text className="text-4xl mb-2">🎯</Text>
              <Text className="text-slate-700 font-bold text-sm">No budgets set yet</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Set category-specific spending limits to track and limit your monthly expenses.
              </Text>
            </Card>
          ) : (
            budgetsList.map((budget) => {
              const spent = categorySpendMap[budget.category] || 0;
              const limit = budget.monthly_limit;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              
              // Styling parameters based on threshold
              let barColor = 'bg-brand-emerald';
              let textColor = 'text-brand-emerald';
              let warningMessage = '';

              if (pct >= 100) {
                barColor = 'bg-brand-rose';
                textColor = 'text-brand-rose';
                warningMessage = `🚨 Exceeded budget limit by ₹${(spent - limit).toFixed(0)}`;
              } else if (pct >= 80) {
                barColor = 'bg-brand-amber';
                textColor = 'text-brand-amber';
                warningMessage = `⚠️ You are close to your ${getCategoryName(budget.category).toLowerCase()} budget`;
              }

              return (
                <Card key={budget.id} variant="outline" className="bg-white border-slate-200/50 mb-4 p-5">
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3">
                        <Text className="text-lg">{getCategoryIcon(budget.category)}</Text>
                      </View>
                      <Text className="text-slate-800 text-sm font-bold truncate flex-1">{getCategoryName(budget.category)}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-slate-400 font-bold uppercase">Used</Text>
                      <Text className={`text-sm font-black mt-0.5 ${textColor}`}>{pct.toFixed(0)}%</Text>
                    </View>
                  </View>

                  {/* Progress Bar Container */}
                  <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <View
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </View>

                  {/* Progress Details label */}
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-400 text-[10px] font-bold">
                      Spent: ₹{spent.toLocaleString('en-IN')}
                    </Text>
                    <Text className="text-slate-400 text-[10px] font-bold">
                      Limit: ₹{limit.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {/* Warnings pill */}
                  {warningMessage !== '' && (
                    <View className="mt-3.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <Text className={`text-[10px] font-bold text-center ${textColor}`}>
                        {warningMessage}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {/* CONFIGURE BUDGET MODAL */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Configure Budget"
      >
        {formError !== '' && (
          <Text className="text-brand-rose text-xs mb-3 font-bold text-center">
            {formError}
          </Text>
        )}

        <AmountInput
          value={limitAmount}
          onChangeText={setLimitAmount}
          label="Monthly Limit"
          error={formError && !limitAmount ? formError : undefined}
        />

        <CategorySelector
          label="Category"
          categories={categories}
          selectedId={selectedCatId}
          onSelect={setSelectedCatId}
        />

        <Button
          title="Save Budget"
          onPress={handleSaveBudget}
          variant="primary"
          className="mt-4"
        />
      </Modal>
    </SafeAreaView>
  );
};
