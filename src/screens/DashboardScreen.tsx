import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../hooks/useUser';
import { DBService } from '../services/db';
import { Group, BalanceDetail } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { WidgetService } from '../services/widgetService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const { user } = useUser();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, { owed: number; owe: number; net: number }>>({});
  const [totalMonthSpend, setTotalMonthSpend] = useState(0);
  const [netOwed, setNetOwed] = useState(0);
  const [netOwe, setNetOwe] = useState(0);
  const [totalSavedMonth, setTotalSavedMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerName, setPartnerName] = useState('Partner');

  // Group creation state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);

  // Load dashboard data
  useEffect(() => {
    if (user?.id && isFocused) {
      loadDashboardData();
    }
  }, [user?.id, isFocused]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const userGroups = await DBService.getGroups(user.id);
      setGroups(userGroups);

      // Load partner name dynamically
      const allUsers = await DBService.getAllUsers();
      const otherUser = allUsers.find(u => u.id !== user.id);
      if (otherUser) {
        setPartnerName(otherUser.name);
      }

      // Compute group balances and total month spending
      const balancesMap: Record<string, { owed: number; owe: number; net: number }> = {};
      let totalSpend = 0;
      let totalOwed = 0;
      let totalOwe = 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (const group of userGroups) {
        // Calculate balance details
        const { balances, debts } = await DBService.calculateBalances(group.id);
        const myBal = balances.find((b) => b.user_id === user.id);
        const net = myBal ? myBal.net_balance : 0;
        
        let owed = 0;
        let owe = 0;

        debts.forEach((debt) => {
          if (debt.to === user.id) owed += debt.amount;
          if (debt.from === user.id) owe += debt.amount;
        });

        balancesMap[group.id] = { owed, owe, net };
        totalOwed += owed;
        totalOwe += owe;

        // Fetch expenses to compute total month spend
        const expenses = await DBService.getGroupExpenses(group.id);
        expenses.forEach((exp) => {
          const expDate = new Date(exp.date);
          if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            // If it's a personal group or you paid, count your share
            if (group.name.toLowerCase().includes('personal') || exp.paid_by === user.id) {
              totalSpend += Number(exp.amount);
            } else {
              // shared expense: count your split amount
              const userSplit = exp.paid_by !== user.id; // placeholder logic
            }
          }
        });
      }

      // Compute savings
      const savings = await DBService.getSavings(user.id);
      let totalSaved = 0;
      savings.forEach((s) => {
        const d = new Date(s.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          totalSaved += Number(s.amount_saved);
        }
      });

      setGroupBalances(balancesMap);
      setTotalMonthSpend(totalSpend);
      setNetOwed(totalOwed);
      setNetOwe(totalOwe);
      setTotalSavedMonth(totalSaved);
      
      // Update Android home screen widgets
      WidgetService.updateWidgets(user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Create Group Action
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user?.id) return;
    try {
      const groupName = isPersonal ? `${newGroupName.trim()} (Personal)` : newGroupName.trim();
      await DBService.createGroup(groupName, user.id, isPersonal);
      setCreateModalVisible(false);
      setNewGroupName('');
      setIsPersonal(false);
      loadDashboardData();
    } catch (e) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{getMonthName()}</Text>
          <Text className="text-2xl font-black text-slate-800 tracking-tight">MoneyMate</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Profile', `Name: ${user?.name}\nDevice ID: ${user?.device_id}`)}>
          <Avatar emoji={user?.avatar} size="sm" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-grow px-5 pt-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#22c55e']} />
          }
        >
          <View className="bg-emerald-600 mb-4 rounded-3xl p-6 shadow-md shadow-emerald-600/20">
            <Text className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Month Spending</Text>
            <Text className="text-white text-4xl font-black mt-1">₹{totalMonthSpend.toLocaleString('en-IN')}</Text>
          </View>

          {/* Saved Instead Self-Control Insight Card */}
          {totalSavedMonth > 0 && (
            <Card variant="flat" className="bg-emerald-950 mb-4 rounded-3xl p-5 border border-emerald-900/20">
              <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Saved Instead 💰</Text>
              <Text className="text-white text-base font-extrabold mt-1">
                You saved ₹{totalSavedMonth.toLocaleString('en-IN')} this month!
              </Text>
              <Text className="text-emerald-200 text-[11px] mt-1 font-semibold leading-relaxed">
                Your self-control saved you ₹{totalSavedMonth.toLocaleString('en-IN')}. Keep it up! 🌟
              </Text>
            </Card>
          )}

          {/* Balances Card */}
          <View className="flex-row justify-between mb-6">
            <Card variant="outline" className="w-[48%] bg-white rounded-3xl p-4 border-slate-100">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">You are owed</Text>
              <Text className="text-brand-emerald text-lg font-black mt-0.5">₹{netOwed.toLocaleString('en-IN')}</Text>
            </Card>
            <Card variant="outline" className="w-[48%] bg-white rounded-3xl p-4 border-slate-100">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">You owe</Text>
              <Text className="text-brand-rose text-lg font-black mt-0.5">₹{netOwe.toLocaleString('en-IN')}</Text>
            </Card>
          </View>

          {/* Quick Actions Grid */}
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            <TouchableOpacity
              onPress={() => {
                if (groups.length === 0) {
                  Alert.alert('No Groups', 'Please create a group first before adding expenses!');
                } else {
                  navigation.navigate('GroupDetails', { groupId: groups[0].id });
                }
              }}
              className="w-full bg-white border border-slate-200/50 rounded-2xl p-4 items-center justify-center mb-3 shadow-sm shadow-slate-100 flex-row"
            >
              <Text className="text-xl mr-2">➕</Text>
              <Text className="text-sm text-slate-700 font-bold">Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (navigation as any).navigate('MainTabs', { screen: 'SavedInsteadTab' })}
              className="w-[48%] bg-white border border-slate-200/50 rounded-2xl p-4 items-center justify-center mb-3 shadow-sm shadow-slate-100"
            >
              <Text className="text-2xl mb-1">💰</Text>
              <Text className="text-xs text-slate-700 font-semibold">Saved Instead</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setNewGroupName('');
                setIsPersonal(false);
                setCreateModalVisible(true);
              }}
              className="w-[48%] bg-white border border-slate-200/50 rounded-2xl p-4 items-center justify-center mb-3 shadow-sm shadow-slate-100"
            >
              <Text className="text-2xl mb-1">👥</Text>
              <Text className="text-xs text-slate-700 font-semibold">Create Group</Text>
            </TouchableOpacity>
          </View>

          {/* Groups List */}
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">My Groups</Text>
          {groups.length === 0 ? (
            <Card variant="outline" className="items-center justify-center py-10 bg-white border-dashed border-slate-300">
              <Text className="text-3xl mb-2">👥</Text>
              <Text className="text-slate-700 font-bold text-base">No Groups Yet</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Create a Personal group for yourself or a Shared group to split expenses with friends.
              </Text>
            </Card>
          ) : (
            groups.map((group) => {
              const balanceInfo = groupBalances[group.id] || { net: 0 };
              const isPersonalGroup = group.name.toLowerCase().includes('personal');

              return (
                <Card
                  key={group.id}
                  variant="outline"
                  onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
                  className="bg-white border-slate-200/50 mb-3"
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                      <View className="flex-row items-center">
                        <Text className="text-slate-800 text-base font-bold">{group.name}</Text>
                        {isPersonalGroup && (
                          <View className="bg-primary-100 rounded-md px-1.5 py-0.5 ml-2">
                            <Text className="text-[9px] text-primary-700 font-bold uppercase">Personal</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-slate-400 text-xs mt-1">
                        {isPersonalGroup ? 'Personal spending log' : `Shared with ${partnerName}`}
                      </Text>
                    </View>

                    {/* Group Balance Info */}
                    <View className="items-end">
                      {isPersonalGroup ? (
                        <Text className="text-slate-400 text-xs font-semibold">Active</Text>
                      ) : balanceInfo.net > 0.01 ? (
                        <View>
                          <Text className="text-[10px] text-brand-emerald font-bold uppercase text-right">You get</Text>
                          <Text className="text-brand-emerald text-sm font-bold mt-0.5">₹{balanceInfo.net.toFixed(2)}</Text>
                        </View>
                      ) : balanceInfo.net < -0.01 ? (
                        <View>
                          <Text className="text-[10px] text-brand-rose font-bold uppercase text-right">You owe</Text>
                          <Text className="text-brand-rose text-sm font-bold mt-0.5">₹{Math.abs(balanceInfo.net).toFixed(2)}</Text>
                        </View>
                      ) : (
                        <Text className="text-slate-400 text-xs font-semibold">Settled</Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {/* CREATE GROUP MODAL */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Create a Group"
      >
        <View>
          <Input
            label="Group Name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="e.g. Home Expenses, Goa Trip"
            className="bg-slate-50 border border-slate-200"
          />

          <TouchableOpacity
            onPress={() => setIsPersonal(!isPersonal)}
            activeOpacity={0.7}
            className="flex-row items-center mb-6 mt-1"
          >
            <View className={`w-5 h-5 rounded-md border mr-3 items-center justify-center ${isPersonal ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
              {isPersonal && <Text className="text-white text-[10px]">✓</Text>}
            </View>
            <Text className="text-slate-700 text-sm font-semibold">Make this a Personal Group</Text>
          </TouchableOpacity>

          <Button
            title="Create Group"
            onPress={handleCreateGroup}
            disabled={!newGroupName.trim()}
            variant="primary"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};
