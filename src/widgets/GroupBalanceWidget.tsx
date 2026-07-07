import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FlexWidget, 
  TextWidget, 
  WidgetConfigurationScreenProps, 
  WidgetTaskHandlerProps,
  requestWidgetUpdate
} from 'react-native-android-widget';
import { Group, User } from '../types';
import { DBService } from '../services/db';

// ====================================================
// 1. WIDGET UI LAYOUT
// ====================================================
export function GroupBalanceWidgetLayout({ 
  groupName, 
  balanceText, 
  balanceColor, 
  deepLink 
}: { 
  groupName: string; 
  balanceText?: string; 
  balanceColor?: any; 
  deepLink: string; 
}) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text="MoneyMate 💸"
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: '#1E293B',
          }}
        />
        
        <TextWidget
          text={groupName}
          style={{
            fontSize: 12,
            fontWeight: 'normal',
            color: '#64748B',
            marginTop: 4,
          }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: deepLink }}
        style={{
          width: 'match_parent',
          height: 36,
          backgroundColor: '#16A34A',
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="+ Add Expense"
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#FFFFFF',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ====================================================
// 2. CONFIGURATION SCREEN COMPONENT
// ====================================================
export function GroupWidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    DBService.getAllUsers().then(setUsers);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [selectedUser]);

  const loadGroups = async () => {
    if (!selectedUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await DBService.getGroups(selectedUser);
      setGroups(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: Group) => {
    if (!selectedUser) return;
    try {
      const widgetId = widgetInfo.widgetId;
      await AsyncStorage.setItem(`widget_group_${widgetId}`, group.id);
      await AsyncStorage.setItem(`widget_user_${widgetId}`, selectedUser);

      // Compute initial balances
      let balanceText = 'All settled 🎉';
      let balanceColor = '#64748B'; // gray

      if (!group.name.toLowerCase().includes('personal')) {
        const { debts } = await DBService.calculateBalances(group.id);
        const myDebts = debts.filter(d => d.from === selectedUser || d.to === selectedUser);
        let netOwe = 0;
        let netOwed = 0;
        for (const d of myDebts) {
          if (d.from === selectedUser) {
            netOwe += d.amount;
          } else {
            netOwed += d.amount;
          }
        }
        const netBalance = netOwed - netOwe;
        const members = await DBService.getGroupMembers(group.id);
        const otherMember = members.find(m => m.id !== selectedUser);
        const otherUser = otherMember ? otherMember.name : 'Partner';

        if (netBalance > 0.01) {
          balanceText = `${otherUser} owes you ₹${Math.round(netBalance).toLocaleString('en-IN')}`;
          balanceColor = '#16A34A'; // green
        } else if (netBalance < -0.01) {
          balanceText = `You owe ${otherUser} ₹${Math.round(Math.abs(netBalance)).toLocaleString('en-IN')}`;
          balanceColor = '#DC2626'; // red
        }
      }

      // Render the widget with configuration
      renderWidget(
        <GroupBalanceWidgetLayout
          groupName={group.name}
          balanceText={balanceText}
          balanceColor={balanceColor}
          deepLink={`moneymate://group/${group.id}`}
        />
      );

      setResult('ok');
    } catch (e) {
      console.error(e);
      setResult('cancel');
    }
  };

  if (!selectedUser) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 8 }}>
          Configure Widget 💸
        </Text>
        <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32 }}>
          Select which user profile is configuring this widget:
        </Text>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {users.map((u) => (
            <TouchableOpacity
              key={u.id}
              onPress={() => setSelectedUser(u.id)}
              style={{ width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, elevation: 2 }}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>{u.avatar || '👤'}</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155', textAlign: 'center' }}>{u.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 }}>
        Select a Group
      </Text>
      <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        Pick a group to track its balance on your home screen:
      </Text>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : groups.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#64748B' }}>No Groups Found</Text>
          <TouchableOpacity
            onPress={() => setResult('cancel')}
            style={{ marginTop: 16, backgroundColor: '#64748B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => handleSelectGroup(group)}
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12 }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>{group.name}</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {group.name.toLowerCase().includes('personal') ? 'Personal spending log' : 'Shared group'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ====================================================
// 3. BACKGROUND TASK HANDLER
// ====================================================
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  const widgetId = widgetInfo.widgetId;

  if (widgetAction === 'WIDGET_DELETED') {
    await AsyncStorage.removeItem(`widget_group_${widgetId}`);
    await AsyncStorage.removeItem(`widget_user_${widgetId}`);
    return;
  }

  const groupId = await AsyncStorage.getItem(`widget_group_${widgetId}`);
  const userId = await AsyncStorage.getItem(`widget_user_${widgetId}`);

  if (!groupId || !userId) {
    // Show placeholder if configuration hasn't run yet
    renderWidget(
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="Tap to Configure"
          style={{ fontSize: 14, fontWeight: 'bold', color: '#64748B' }}
        />
      </FlexWidget>
    );
    return;
  }

  try {
    const allGroups = await DBService.getGroups(userId);
    const group = allGroups.find(g => g.id === groupId);
    if (!group) return;

    let balanceText = 'All settled 🎉';
    let balanceColor = '#64748B'; // gray

    if (!group.name.toLowerCase().includes('personal')) {
      const { debts } = await DBService.calculateBalances(group.id);
      const myDebts = debts.filter(d => d.from === userId || d.to === userId);
      let netOwe = 0;
      let netOwed = 0;
      for (const d of myDebts) {
        if (d.from === userId) {
          netOwe += d.amount;
        } else {
          netOwed += d.amount;
        }
      }
      const netBalance = netOwed - netOwe;
      const members = await DBService.getGroupMembers(group.id);
      const otherMember = members.find(m => m.id !== userId);
      const otherUser = otherMember ? otherMember.name : 'Partner';

      if (netBalance > 0.01) {
        balanceText = `${otherUser} owes you ₹${Math.round(netBalance).toLocaleString('en-IN')}`;
        balanceColor = '#16A34A'; // green
      } else if (netBalance < -0.01) {
        balanceText = `You owe ${otherUser} ₹${Math.round(Math.abs(netBalance)).toLocaleString('en-IN')}`;
        balanceColor = '#DC2626'; // red
      }
    }

    renderWidget(
      <GroupBalanceWidgetLayout
        groupName={group.name}
        balanceText={balanceText}
        balanceColor={balanceColor}
        deepLink={`moneymate://group/${group.id}`}
      />
    );
  } catch (e) {
    console.error('Error in widget task handler:', e);
  }
}

// Helper to trigger updates for all widget instances of GroupBalanceWidget
export function triggerGroupBalanceWidgetUpdate() {
  try {
    requestWidgetUpdate({
      widgetName: 'GroupBalanceWidget',
      renderWidget: async (widgetInfo) => {
        const widgetId = widgetInfo.widgetId;
        const groupId = await AsyncStorage.getItem(`widget_group_${widgetId}`);
        const userId = await AsyncStorage.getItem(`widget_user_${widgetId}`);

        if (!groupId || !userId) {
          return (
            <FlexWidget
              style={{
                width: 'match_parent',
                height: 'match_parent',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text="Tap to Configure"
                style={{ fontSize: 14, fontWeight: 'bold', color: '#64748B' }}
              />
            </FlexWidget>
          );
        }

        const allGroups = await DBService.getGroups(userId);
        const group = allGroups.find(g => g.id === groupId);
        if (!group) {
          return (
            <FlexWidget
              style={{
                width: 'match_parent',
                height: 'match_parent',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text="Group not found"
                style={{ fontSize: 14, fontWeight: 'bold', color: '#64748B' }}
              />
            </FlexWidget>
          );
        }

        let balanceText = 'All settled 🎉';
        let balanceColor = '#64748B'; // gray

        if (!group.name.toLowerCase().includes('personal')) {
          const { debts } = await DBService.calculateBalances(group.id);
          const myDebts = debts.filter(d => d.from === userId || d.to === userId);
          let netOwe = 0;
          let netOwed = 0;
          for (const d of myDebts) {
            if (d.from === userId) {
              netOwe += d.amount;
            } else {
              netOwed += d.amount;
            }
          }
          const netBalance = netOwed - netOwe;
          const members = await DBService.getGroupMembers(group.id);
          const otherMember = members.find(m => m.id !== userId);
          const otherUser = otherMember ? otherMember.name : 'Partner';

          if (netBalance > 0.01) {
            balanceText = `${otherUser} owes you ₹${Math.round(netBalance).toLocaleString('en-IN')}`;
            balanceColor = '#16A34A'; // green
          } else if (netBalance < -0.01) {
            balanceText = `You owe ${otherUser} ₹${Math.round(Math.abs(netBalance)).toLocaleString('en-IN')}`;
            balanceColor = '#DC2626'; // red
          }
        }

        return (
          <GroupBalanceWidgetLayout
            groupName={group.name}
            balanceText={balanceText}
            balanceColor={balanceColor}
            deepLink={`moneymate://group/${group.id}`}
          />
        );
      }
    });
  } catch (e) {
    console.log('Error triggering group balance widget update:', e);
  }
}
