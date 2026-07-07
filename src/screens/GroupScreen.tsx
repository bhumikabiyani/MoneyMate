import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DBService } from '../services/db';
import { useUser } from '../hooks/useUser';
import { Group, User, Expense, Settlement, Category, BalanceDetail, Debt, ExpenseSplit } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { AmountInput } from '../components/AmountInput';
import { DatePicker } from '../components/DatePicker';
import { CategorySelector } from '../components/CategorySelector';
import { WidgetService } from '../services/widgetService';

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'GroupDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GroupScreen: React.FC = () => {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useUser();
  const { groupId } = route.params;

  // Group Details States
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<(Expense | Settlement)[]>([]);
  const [balances, setBalances] = useState<BalanceDetail[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Expense States
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('food');
  const [paidById, setPaidById] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  
  // Custom Custom-Category creation inside selector
  const [customCatModalVisible, setCustomCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');

  // Split States
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<string[]>([]);
  const [expenseError, setExpenseError] = useState('');

  // Add Settlement States
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settlePaidBy, setSettlePaidBy] = useState('');
  const [settlePaidTo, setSettlePaidTo] = useState('');
  const [settleDate, setSettleDate] = useState(new Date());
  const [settleError, setSettleError] = useState('');

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  // Handle deep linked Quick Add Expense action
  const openExpenseModalParam = (route.params as any)?.openExpenseModal;
  useEffect(() => {
    if (openExpenseModalParam) {
      setExpenseModalVisible(true);
      navigation.setParams({ openExpenseModal: undefined } as any);
    }
  }, [openExpenseModalParam]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      // Fetch Group Name, members, categories
      const allGroups = await DBService.getGroups(user?.id || '');
      const currentGroup = allGroups.find((g) => g.id === groupId) || null;
      setGroup(currentGroup);

      if (currentGroup) {
        const groupMembers = await DBService.getGroupMembers(groupId);
        setMembers(groupMembers);

        if (user?.id) {
          setPaidById(user.id); // default payer
        }

        // Initialize split members (all members checked by default)
        setSelectedSplitMembers(groupMembers.map((m) => m.id));

        // Load Categories
        const cats = await DBService.getCategories();
        setCategories(cats);

        // Fetch Transactions (merged expenses & settlements)
        await loadTransactions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const expenses = await DBService.getGroupExpenses(groupId);
      const settlements = await DBService.getGroupSettlements(groupId);

      // Merge and sort by date descending
      const merged = [...expenses, ...settlements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(merged);

      // Compute Balances
      const calculated = await DBService.calculateBalances(groupId);
      setBalances(calculated.balances);
      setDebts(calculated.debts);

      // Update Android widgets
      if (user?.id) {
        WidgetService.updateWidgets(user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };



  // Handle Add Custom Category from selector grid
  const handleAddCustomCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const newCat = await DBService.addCustomCategory(newCatName.trim(), newCatEmoji);
      setCategories((prev) => [...prev, newCat]);
      setSelectedCategoryId(newCat.id);
      setCustomCatModalVisible(false);
      setNewCatName('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  // Add Expense Save Action
  const handleAddExpense = async () => {
    if (!amount || Number(amount) <= 0) {
      setExpenseError('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setExpenseError('Please enter a title.');
      return;
    }
    if (selectedSplitMembers.length === 0) {
      setExpenseError('Please select at least one person to split with.');
      return;
    }

    setExpenseError('');
    const totalAmount = Number(amount);
    const splitRecords: Omit<ExpenseSplit, 'id' | 'expense_id'>[] = [];

    if (splitType === 'equal') {
      const share = totalAmount / selectedSplitMembers.length;
      selectedSplitMembers.forEach((memberId) => {
        splitRecords.push({
          user_id: memberId,
          amount_owed: Number(share.toFixed(2)),
          is_paid: memberId === paidById,
        });
      });
    } else {
      // Custom splits validation
      let customSum = 0;
      selectedSplitMembers.forEach((memberId) => {
        const amt = Number(customSplits[memberId] || 0);
        customSum += amt;
        splitRecords.push({
          user_id: memberId,
          amount_owed: amt,
          is_paid: memberId === paidById,
        });
      });

      if (Math.abs(customSum - totalAmount) > 0.01) {
        setExpenseError(`Sum of splits (₹${customSum.toFixed(2)}) must equal total (₹${totalAmount.toFixed(2)})`);
        return;
      }
    }

    try {
      await DBService.addExpense(
        {
          group_id: groupId,
          title: title.trim(),
          amount: totalAmount,
          paid_by: paidById,
          category_id: selectedCategoryId,
          date: expenseDate.toISOString(),
          notes: notes.trim() || undefined,
        },
        splitRecords
      );

      // Clean up fields
      setExpenseModalVisible(false);
      setAmount('');
      setTitle('');
      setNotes('');
      setExpenseDate(new Date());
      setSplitType('equal');
      setCustomSplits({});

      // Reload
      await loadTransactions();
      Alert.alert('Success', 'Expense added successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  // Add Settlement Save Action
  const handleAddSettlement = async () => {
    if (!settleAmount || Number(settleAmount) <= 0) {
      setSettleError('Please enter a valid amount.');
      return;
    }
    if (!settlePaidBy || !settlePaidTo) {
      setSettleError('Please select both members.');
      return;
    }
    if (settlePaidBy === settlePaidTo) {
      setSettleError('Sender and recipient must be different.');
      return;
    }

    setSettleError('');
    try {
      await DBService.addSettlement({
        group_id: groupId,
        paid_by: settlePaidBy,
        paid_to: settlePaidTo,
        amount: Number(settleAmount),
        date: settleDate.toISOString(),
      });

      // Clean up fields
      setSettleModalVisible(false);
      setSettleAmount('');
      setSettlePaidBy('');
      setSettlePaidTo('');
      setSettleDate(new Date());

      // Reload
      await loadTransactions();
      Alert.alert('Success', 'Settlement recorded!');
    } catch (e) {
      Alert.alert('Error', 'Failed to record settlement');
    }
  };

  const handleTransactionPress = (tx: Expense | Settlement) => {
    Alert.alert(
      isExpense(tx) ? 'Delete Expense' : 'Delete Settlement',
      `Are you sure you want to delete "${isExpense(tx) ? tx.title : 'this settlement'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isExpense(tx)) {
                await DBService.deleteExpense(tx.id);
              } else {
                await DBService.deleteSettlement(tx.id);
              }
              await loadTransactions();
              Alert.alert('Deleted', 'Transaction has been deleted.');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete transaction.');
            }
          }
        }
      ]
    );
  };

  const getMemberName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  const getCategoryIcon = (catId: string) => {
    return categories.find((c) => c.id === catId)?.icon || '🏷️';
  };

  const isExpense = (tx: Expense | Settlement): tx is Expense => {
    return (tx as Expense).title !== undefined;
  };

  const isPersonalGroup = group?.name.toLowerCase().includes('personal');
  const totalSpent = transactions
    .filter(isExpense)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-50">
          <Text className="text-slate-700 text-lg font-black">←</Text>
        </TouchableOpacity>
        <View className="align-items-center">
          <Text className="text-slate-800 text-base font-extrabold text-center">
            {group?.name || 'Loading...'}
          </Text>
          <Text className="text-[10px] text-slate-400 font-bold text-center mt-0.5 uppercase tracking-wider">
            {group?.name.toLowerCase().includes('personal') ? 'Personal Group' : 'Shared Group'}
          </Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <View className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-5 pt-4">
            {/* Balance simplification card or Personal Spending summary */}
            <Card variant="flat" className="bg-white border border-slate-200/50 rounded-3xl p-5 mb-5">
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                {isPersonalGroup ? 'Personal Spending' : 'Balances summary'}
              </Text>
              
              {isPersonalGroup ? (
                <View className="items-center py-2 flex-row justify-center">
                  <Text className="text-3xl mr-3">💰</Text>
                  <View>
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total money spent</Text>
                    <Text className="text-slate-800 font-black text-2xl mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ) : debts.length === 0 ? (
                <View className="items-center py-2 flex-row justify-center">
                  <Text className="text-3xl mr-3">🎉</Text>
                  <Text className="text-slate-800 font-black text-base">All settled up!</Text>
                </View>
              ) : (
                debts.map((debt, index) => {
                  const isMeDebtor = debt.from === user?.id;
                  const isMeCreditor = debt.to === user?.id;

                  return (
                    <TouchableOpacity
                      key={`debt-${index}`}
                      onPress={() => {
                        setSettlePaidBy(debt.from);
                        setSettlePaidTo(debt.to);
                        setSettleAmount(debt.amount.toString());
                        setSettleModalVisible(true);
                      }}
                      activeOpacity={0.7}
                      className="flex-row justify-between items-center py-2.5 border-b border-slate-50 last:border-0"
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <Text className="text-slate-700 text-sm font-semibold">
                          <Text className={isMeDebtor ? 'text-brand-rose font-black' : 'font-semibold'}>
                            {isMeDebtor ? 'You' : debt.from_name}
                          </Text>
                          {' owes '}
                          <Text className={isMeCreditor ? 'text-brand-emerald font-black' : 'font-semibold'}>
                            {isMeCreditor ? 'You' : debt.to_name}
                          </Text>
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-slate-800 text-sm font-black mr-2">₹{debt.amount.toLocaleString('en-IN')}</Text>
                        <View className="bg-primary-50 rounded-full px-2 py-0.5">
                          <Text className="text-[10px] text-primary-600 font-bold uppercase">Settle</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>

            {/* Member list indicator */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">Group Members</Text>
              <Text className="text-slate-400 text-xs font-bold">{members.length} members</Text>
            </View>
            <View className="flex-row mb-6">
              {members.map((m) => (
                <View key={m.id} className="items-center mr-4">
                  <Avatar emoji={m.avatar} size="sm" />
                  <Text className="text-[10px] text-slate-600 font-semibold mt-1" numberOfLines={1}>
                    {m.id === user?.id ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>

            {/* Transactions Header */}
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Transactions</Text>

            {transactions.length === 0 ? (
              <Card variant="outline" className="items-center justify-center py-10 bg-white border-dashed border-slate-200">
                <Text className="text-3xl mb-2">💸</Text>
                <Text className="text-slate-700 font-bold text-sm">No expenses yet</Text>
                <Text className="text-slate-400 text-[11px] text-center mt-0.5">
                  Tap "Add Expense" below to post the first transaction.
                </Text>
              </Card>
            ) : (
              transactions.map((tx) => {
                const dateString = new Date(tx.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });

                if (isExpense(tx)) {
                  const isPayer = tx.paid_by === user?.id;
                  return (
                    <Card key={tx.id} variant="outline" onPress={() => handleTransactionPress(tx)} className="bg-white border-slate-200/50 mb-2.5 p-4">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3.5">
                          <Text className="text-lg">{getCategoryIcon(tx.category_id)}</Text>
                        </View>
                        <View className="flex-1 mr-2">
                          <Text className="text-slate-800 text-sm font-bold">{tx.title}</Text>
                          <Text className="text-slate-400 text-[11px] mt-0.5 font-medium">
                            Paid by {isPayer ? 'You' : getMemberName(tx.paid_by)} • {dateString}
                          </Text>
                          {tx.notes && (
                            <Text 
                              className="text-slate-500 text-[10px] mt-1 font-normal italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 self-start"
                              numberOfLines={1}
                            >
                              {tx.notes.length > 50 ? `${tx.notes.substring(0, 50)}...` : tx.notes}
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="text-slate-800 text-sm font-black">₹{tx.amount.toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                    </Card>
                  );
                } else {
                  // Settlement Row
                  const isPayer = tx.paid_by === user?.id;
                  const isRecipient = tx.paid_to === user?.id;
                  
                  return (
                    <Card key={tx.id} variant="outline" onPress={() => handleTransactionPress(tx)} className="bg-white border-slate-200/30 mb-2.5 p-3 px-4 border bg-emerald-50/20">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-3">
                          <Text className="text-emerald-500 text-base mr-3">✔</Text>
                          <View>
                            <Text className="text-slate-700 text-xs font-semibold">
                              {isPayer ? 'You' : getMemberName(tx.paid_by)}
                              {' paid '}
                              {isRecipient ? 'You' : getMemberName(tx.paid_to)}
                            </Text>
                            <Text className="text-slate-400 text-[10px] font-medium mt-0.5">{dateString}</Text>
                          </View>
                        </View>
                        <Text className="text-slate-700 text-xs font-black">₹{tx.amount.toLocaleString('en-IN')}</Text>
                      </View>
                    </Card>
                  );
                }
              })
            )}
            <View className="h-24" />
          </ScrollView>

          {/* Bottom Floating Action Buttons */}
          <View className="absolute bottom-6 left-5 right-5 flex-row justify-between">
            <Button
              title="Settle Balance"
              onPress={() => {
                setSettlePaidBy(members[0]?.id || '');
                setSettlePaidTo(members[1]?.id || '');
                setSettleAmount('');
                setSettleError('');
                setSettleModalVisible(true);
              }}
              variant="secondary"
              className="w-[48%] shadow-sm"
            />
            <Button
              title="Add Expense"
              onPress={() => {
                setExpenseError('');
                setAmount('');
                setTitle('');
                setNotes('');
                setExpenseModalVisible(true);
              }}
              variant="primary"
              className="w-[48%] shadow-md shadow-primary-500/25"
            />
          </View>
        </View>
      )}

      {/* ADD EXPENSE MODAL */}
      <Modal
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        title="Add Expense"
      >
        <AmountInput
          value={amount}
          onChangeText={setAmount}
          label="Amount"
          error={expenseError && !amount ? expenseError : undefined}
        />

        <Input
          label="For what description?"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Dinner, Rent, Grocery"
          className="bg-slate-50 border border-slate-200"
        />

        {/* Categories selector */}
        <CategorySelector
          label="Category"
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onAddCustomPress={() => setCustomCatModalVisible(true)}
        />

        {/* Paid By member selector */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Paid By</Text>
        <View className="flex-row flex-wrap mb-4">
          {members.map((m) => {
            const isSelected = m.id === paidById;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setPaidById(m.id)}
                className={`flex-row items-center rounded-2xl px-4 py-2.5 mr-2 mb-2 ${
                  isSelected ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100 border border-transparent'
                }`}
              >
                <Text className="text-xs font-bold text-slate-700">{m.id === user?.id ? 'You' : m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date picker */}
        <DatePicker
          label="Date"
          value={expenseDate}
          onChange={setExpenseDate}
        />

        {/* Splits Selector */}
        {!group?.name.toLowerCase().includes('personal') && (
          <View className="mb-4">
            <Text className="text-slate-600 text-xs font-semibold mb-2.5 uppercase tracking-wider">Split Options</Text>
            
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => {
                  setSplitType('equal');
                  setExpenseError('');
                }}
                className={`flex-1 items-center py-2.5 rounded-l-2xl border ${
                  splitType === 'equal' ? 'bg-primary-50 border-primary-500 z-10' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-bold ${splitType === 'equal' ? 'text-primary-600' : 'text-slate-500'}`}>Equal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setSplitType('custom');
                  // Initialize custom splits with equal distributions if empty
                  const initialSplits: Record<string, string> = {};
                  const count = selectedSplitMembers.length || 1;
                  const amtPerUser = (Number(amount) || 0) / count;
                  selectedSplitMembers.forEach((id) => {
                    initialSplits[id] = amtPerUser.toFixed(2);
                  });
                  setCustomSplits(initialSplits);
                  setExpenseError('');
                }}
                className={`flex-1 items-center py-2.5 rounded-r-2xl border-y border-r ${
                  splitType === 'custom' ? 'bg-primary-50 border-primary-500 z-10' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-bold ${splitType === 'custom' ? 'text-primary-600' : 'text-slate-500'}`}>Custom</Text>
              </TouchableOpacity>
            </View>

            {/* Split participants checklist */}
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Split amongst members:</Text>
            {members.map((m) => {
              const isChecked = selectedSplitMembers.includes(m.id);
              return (
                <View key={m.id} className="flex-row justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <TouchableOpacity
                    onPress={() => {
                      if (isChecked) {
                        setSelectedSplitMembers(prev => prev.filter(id => id !== m.id));
                      } else {
                        setSelectedSplitMembers(prev => [...prev, m.id]);
                      }
                    }}
                    activeOpacity={0.7}
                    className="flex-row items-center flex-grow"
                  >
                    <View className={`w-4 h-4 rounded border items-center justify-center mr-3 ${isChecked ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                      {isChecked && <Text className="text-white text-[8px]">✓</Text>}
                    </View>
                    <Text className="text-slate-700 text-xs font-semibold">{m.id === user?.id ? 'You' : m.name}</Text>
                  </TouchableOpacity>

                  {splitType === 'custom' && isChecked && (
                    <View className="flex-row items-center">
                      <Text className="text-slate-400 text-xs font-bold mr-1.5">₹</Text>
                      <Input
                        value={customSplits[m.id] || ''}
                        onChangeText={(text) => {
                          setCustomSplits(prev => ({ ...prev, [m.id]: text }));
                          if (expenseError) setExpenseError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        containerClassName="w-20 mb-0"
                        className="py-1 px-2.5 text-center text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Input
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add extra information"
          className="bg-slate-50 border border-slate-200"
        />

        {expenseError !== '' && (
          <Text className="text-brand-rose text-xs mb-4 font-bold text-center">
            {expenseError}
          </Text>
        )}

        <Button
          title="Save Expense"
          onPress={handleAddExpense}
          variant="primary"
        />
      </Modal>

      {/* CUSTOM CATEGORY ADD MODAL */}
      <Modal
        visible={customCatModalVisible}
        onClose={() => setCustomCatModalVisible(false)}
        title="Custom Category"
      >
        <Input
          label="Category Name"
          value={newCatName}
          onChangeText={setNewCatName}
          placeholder="e.g. Subscriptions, Pet"
          className="bg-slate-50 border border-slate-200"
        />
        <Input
          label="Emoji Icon"
          value={newCatEmoji}
          onChangeText={setNewCatEmoji}
          placeholder="e.g. 🐶, 🎮"
          maxLength={2}
          className="bg-slate-50 border border-slate-200 text-center text-2xl"
        />
        <Button
          title="Add Category"
          onPress={handleAddCustomCategory}
          disabled={!newCatName.trim()}
          variant="primary"
        />
      </Modal>

      {/* SETTLE MODAL */}
      <Modal
        visible={settleModalVisible}
        onClose={() => setSettleModalVisible(false)}
        title="Record Settlement"
      >
        {settleError !== '' && (
          <Text className="text-brand-rose text-xs mb-3 font-bold text-center">
            {settleError}
          </Text>
        )}

        <AmountInput
          value={settleAmount}
          onChangeText={setSettleAmount}
          label="Settled Amount"
          error={settleError && !settleAmount ? settleError : undefined}
        />

        {/* Sender select */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Paid By (Who sent money)</Text>
        <View className="flex-row flex-wrap mb-4">
          {members.map((m) => {
            const isSelected = m.id === settlePaidBy;
            return (
              <TouchableOpacity
                key={`sender-${m.id}`}
                onPress={() => setSettlePaidBy(m.id)}
                className={`flex-row items-center rounded-2xl px-4 py-2.5 mr-2 mb-2 ${
                  isSelected ? 'bg-rose-100 border border-brand-rose' : 'bg-slate-100 border border-transparent'
                }`}
              >
                <Text className="text-xs font-bold text-slate-700">{m.id === user?.id ? 'You' : m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recipient select */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Paid To (Who received money)</Text>
        <View className="flex-row flex-wrap mb-4">
          {members.map((m) => {
            const isSelected = m.id === settlePaidTo;
            return (
              <TouchableOpacity
                key={`recipient-${m.id}`}
                onPress={() => setSettlePaidTo(m.id)}
                className={`flex-row items-center rounded-2xl px-4 py-2.5 mr-2 mb-2 ${
                  isSelected ? 'bg-emerald-100 border border-brand-emerald' : 'bg-slate-100 border border-transparent'
                }`}
              >
                <Text className="text-xs font-bold text-slate-700">{m.id === user?.id ? 'You' : m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <DatePicker
          label="Date"
          value={settleDate}
          onChange={setSettleDate}
        />

        <Button
          title="Save Settlement"
          onPress={handleAddSettlement}
          variant="primary"
        />
      </Modal>
    </SafeAreaView>
  );
};
