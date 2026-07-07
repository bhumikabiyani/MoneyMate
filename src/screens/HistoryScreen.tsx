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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useUser } from '../hooks/useUser';
import { DBService } from '../services/db';
import { Expense, Group, Category, User, Settlement, Saving } from '../types';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useIsFocused } from '@react-navigation/native';

export const HistoryScreen: React.FC = () => {
  const { user } = useUser();
  const isFocused = useIsFocused();

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Active filters
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedPayerId, setSelectedPayerId] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Loaded & filtered display list
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (user?.id && isFocused) {
      loadHistoryData();
    }
  }, [user?.id, isFocused]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, expenses, selectedGroupId, selectedCategoryId, selectedPayerId, minAmount, maxAmount]);

  const loadHistoryData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      const cats = await DBService.getCategories();
      setCategories(cats);

      const userGroups = await DBService.getGroups(user.id);
      setGroups(userGroups);

      // Collect all expenses, settlements, savings
      const allExpenses: Expense[] = [];
      const allSettlements: Settlement[] = [];
      const memberIds = new Set<string>();

      for (const gp of userGroups) {
        const gpExps = await DBService.getGroupExpenses(gp.id);
        allExpenses.push(...gpExps);

        const gpSets = await DBService.getGroupSettlements(gp.id);
        allSettlements.push(...gpSets);

        const gpMems = await DBService.getGroupMembers(gp.id);
        gpMems.forEach(m => memberIds.add(m.id));
      }

      setExpenses(allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setSettlements(allSettlements);

      const allSavings = await DBService.getSavings(user.id);
      setSavings(allSavings);

      // Resolve member details
      const resolvedMembers = await DBService.getUsersByIds(Array.from(memberIds));
      setMembers(resolvedMembers);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...expenses];

    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    // 2. Group Filter
    if (selectedGroupId !== 'all') {
      result = result.filter((e) => e.group_id === selectedGroupId);
    }

    // 3. Category Filter
    if (selectedCategoryId !== 'all') {
      result = result.filter((e) => e.category_id === selectedCategoryId);
    }

    // 4. Payer Filter
    if (selectedPayerId !== 'all') {
      result = result.filter((e) => e.paid_by === selectedPayerId);
    }

    // 5. Amount range Filter
    if (minAmount.trim() !== '') {
      result = result.filter((e) => e.amount >= Number(minAmount));
    }
    if (maxAmount.trim() !== '') {
      result = result.filter((e) => e.amount <= Number(maxAmount));
    }

    setFilteredExpenses(result);
  };

  const resetFilters = () => {
    setSelectedGroupId('all');
    setSelectedCategoryId('all');
    setSelectedPayerId('all');
    setMinAmount('');
    setMaxAmount('');
    setSearchQuery('');
  };

  // ==========================================
  // EXPORT TO CSV ENGINE (MILESTONE 13)
  // ==========================================
  const handleExportCSV = async () => {
    if (expenses.length === 0 && settlements.length === 0 && savings.length === 0) {
      Alert.alert('No Data', 'There is no tracking data to export.');
      return;
    }

    try {
      let csvContent = '';

      // 1. Write EXPENSES Section
      csvContent += '--- EXPENSES ---\n';
      csvContent += 'ID,Group,Title,Amount,Paid By,Category,Date,Notes\n';
      expenses.forEach((e) => {
        const gpName = groups.find((g) => g.id === e.group_id)?.name || 'Unknown';
        const payerName = members.find((m) => m.id === e.paid_by)?.name || 'Unknown';
        const catName = categories.find((c) => c.id === e.category_id)?.name || 'Unknown';
        const formattedDate = new Date(e.date).toLocaleDateString('en-IN');
        const noteText = e.notes ? e.notes.replace(/"/g, '""') : '';
        
        csvContent += `"${e.id}","${gpName.replace(/"/g, '""')}","${e.title.replace(/"/g, '""')}",${e.amount},"${payerName.replace(/"/g, '""')}","${catName.replace(/"/g, '""')}","${formattedDate}","${noteText}"\n`;
      });

      csvContent += '\n';

      // 2. Write SETTLEMENTS Section
      csvContent += '--- SETTLEMENTS ---\n';
      csvContent += 'ID,Group,Paid By,Paid To,Amount,Date\n';
      settlements.forEach((s) => {
        const gpName = groups.find((g) => g.id === s.group_id)?.name || 'Unknown';
        const fromName = members.find((m) => m.id === s.paid_by)?.name || 'Unknown';
        const toName = members.find((m) => m.id === s.paid_to)?.name || 'Unknown';
        const formattedDate = new Date(s.date).toLocaleDateString('en-IN');

        csvContent += `"${s.id}","${gpName.replace(/"/g, '""')}","${fromName.replace(/"/g, '""')}","${toName.replace(/"/g, '""')}",${s.amount},"${formattedDate}"\n`;
      });

      csvContent += '\n';

      // 3. Write SAVINGS Section
      csvContent += '--- SAVED INSTEAD (Impulse Savings) ---\n';
      csvContent += 'ID,Avoided Buying,Amount Saved,Category,Date,Note\n';
      savings.forEach((s) => {
        const catName = categories.find((c) => c.id === s.category)?.name || s.category;
        const formattedDate = new Date(s.date).toLocaleDateString('en-IN');
        const noteText = s.note ? s.note.replace(/"/g, '""') : '';

        csvContent += `"${s.id}","${s.title.replace(/"/g, '""')}",${s.amount_saved},"${catName.replace(/"/g, '""')}","${formattedDate}","${noteText}"\n`;
      });

      // Write file locally
      const fileUri = `${FileSystem.cacheDirectory}MoneyMate_Export.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export MoneyMate Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'No sharing support found on this device.');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate CSV export.');
    }
  };

  const getGroupName = (id: string) => {
    return groups.find((g) => g.id === id)?.name || 'Unknown';
  };

  const getCategoryIcon = (catId: string) => {
    return categories.find((c) => c.id === catId)?.icon || '🏷️';
  };

  const getPayerName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Transactions</Text>
          <Text className="text-2xl font-black text-slate-800 tracking-tight">Search & Export</Text>
        </View>
        <TouchableOpacity
          onPress={handleExportCSV}
          className="bg-primary-100 px-4 py-2 rounded-xl"
        >
          <Text className="text-primary-700 text-xs font-bold uppercase">Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View className="bg-white border-b border-slate-200/50 px-5 py-3 flex-row items-center">
        <Input
          placeholder="Search by description (e.g. pizza)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerClassName="mb-0 flex-1 mr-3"
          className="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-xs"
        />
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          className={`h-11 px-3.5 rounded-xl border items-center justify-center flex-row ${
            selectedGroupId !== 'all' || selectedCategoryId !== 'all' || selectedPayerId !== 'all' || minAmount || maxAmount
              ? 'bg-primary-50 border-primary-500'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <Text className="text-base mr-1">⚙️</Text>
          <Text className="text-xs text-slate-600 font-bold">Filter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-5 pt-4">
          
          {/* Active Filter Indicators Pill Box */}
          {(selectedGroupId !== 'all' || selectedCategoryId !== 'all' || selectedPayerId !== 'all' || minAmount || maxAmount) && (
            <View className="flex-row justify-between items-center bg-slate-200/50 border border-slate-200 p-3 rounded-2xl mb-4">
              <Text className="text-slate-600 text-[10px] font-bold uppercase">Active Filters</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text className="text-primary-600 text-[10px] font-bold uppercase">Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results List */}
          {filteredExpenses.length === 0 ? (
            <Card variant="outline" className="items-center justify-center py-12 bg-white border-slate-200 border-dashed">
              <Text className="text-4xl mb-2">🔍</Text>
              <Text className="text-slate-700 font-bold text-sm">No transactions found</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Try expanding your search query or removing active filters.
              </Text>
            </Card>
          ) : (
            filteredExpenses.map((exp) => {
              const dateString = new Date(exp.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const gpName = getGroupName(exp.group_id);
              const payerName = exp.paid_by === user?.id ? 'You' : getPayerName(exp.paid_by);

              return (
                <Card key={exp.id} variant="outline" className="bg-white border-slate-200/50 mb-3 p-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3.5">
                      <Text className="text-lg">{getCategoryIcon(exp.category_id)}</Text>
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="text-slate-800 text-sm font-bold">{exp.title}</Text>
                      <Text className="text-slate-400 text-[10px] mt-0.5 font-semibold">
                        Group: {gpName}
                      </Text>
                      <Text className="text-slate-400 text-[10px] mt-0.5 font-medium">
                        Paid by {payerName} • {dateString}
                      </Text>
                      {exp.notes ? (
                        <Text 
                          className="text-slate-500 text-[10px] mt-1 font-normal italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 self-start"
                          numberOfLines={1}
                        >
                          {exp.notes.length > 50 ? `${exp.notes.substring(0, 50)}...` : exp.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="text-slate-800 text-sm font-black">₹{exp.amount.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {/* FILTER BUILDER MODAL */}
      <Modal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Filter Transactions"
      >
        {/* Group Selector dropdown list */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Group</Text>
        <View className="flex-row flex-wrap mb-4">
          <TouchableOpacity
            onPress={() => setSelectedGroupId('all')}
            className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
              selectedGroupId === 'all' ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
            }`}
          >
            <Text className="text-xs font-semibold text-slate-700">All Groups</Text>
          </TouchableOpacity>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => setSelectedGroupId(g.id)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                selectedGroupId === g.id ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
              }`}
            >
              <Text className="text-xs font-semibold text-slate-700" numberOfLines={1}>
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Selector list */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Category</Text>
        <View className="flex-row flex-wrap mb-4">
          <TouchableOpacity
            onPress={() => setSelectedCategoryId('all')}
            className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
              selectedCategoryId === 'all' ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
            }`}
          >
            <Text className="text-xs font-semibold text-slate-700">All Categories</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCategoryId(c.id)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                selectedCategoryId === c.id ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
              }`}
            >
              <Text className="text-xs font-semibold text-slate-700">
                {c.icon} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Paid By selector list */}
        <Text className="text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wider">Paid By</Text>
        <View className="flex-row flex-wrap mb-4">
          <TouchableOpacity
            onPress={() => setSelectedPayerId('all')}
            className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
              selectedPayerId === 'all' ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
            }`}
          >
            <Text className="text-xs font-semibold text-slate-700">Everyone</Text>
          </TouchableOpacity>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setSelectedPayerId(m.id)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                selectedPayerId === m.id ? 'bg-primary-100 border border-primary-500' : 'bg-slate-100'
              }`}
            >
              <Text className="text-xs font-semibold text-slate-700">
                {m.id === user?.id ? 'You' : m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount range picker input */}
        <Text className="text-slate-600 text-xs font-semibold mb-2.5 uppercase tracking-wider">Amount Range (₹)</Text>
        <View className="flex-row justify-between mb-6">
          <Input
            placeholder="Min amount"
            value={minAmount}
            onChangeText={setMinAmount}
            keyboardType="numeric"
            containerClassName="w-[47%] mb-0"
            className="bg-slate-50 border border-slate-200 rounded-xl"
          />
          <Input
            placeholder="Max amount"
            value={maxAmount}
            onChangeText={setMaxAmount}
            keyboardType="numeric"
            containerClassName="w-[47%] mb-0"
            className="bg-slate-50 border border-slate-200 rounded-xl"
          />
        </View>

        <Button
          title="Apply Filters"
          onPress={() => setFilterModalVisible(false)}
          variant="primary"
        />
      </Modal>
    </SafeAreaView>
  );
};
