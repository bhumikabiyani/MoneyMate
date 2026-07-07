import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, Linking } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';
import { useUser, UserProvider } from '../hooks/useUser';
import { DBService } from '../services/db';

// Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SavedInsteadScreen } from '../screens/SavedInsteadScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { SettleScreen } from '../screens/SettleScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let emoji = '❓';
          if (route.name === 'Dashboard') emoji = '🏠';
          else if (route.name === 'Analytics') emoji = '📊';
          else if (route.name === 'SavedInsteadTab') emoji = '💰';
          else if (route.name === 'Budgets') emoji = '🎯';
          else if (route.name === 'History') emoji = '🕒';

          return (
            <Text className={`text-xl ${focused ? 'opacity-100 scale-110' : 'opacity-60'}`} style={{ includeFontPadding: false }}>
              {emoji}
            </Text>
          );
        },
        tabBarActiveTintColor: '#22c55e', // primary-500
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 68,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="SavedInsteadTab" 
        component={SavedInsteadScreen} 
        options={{ title: 'Saved' }}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsScreen} 
        options={{ title: 'Budgets' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'History' }}
      />
    </Tab.Navigator>
  );
};

const NavigationContent = () => {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!user) return;

    const handleDeepLink = (event: { url: string }) => {
      navigateWithUrl(event.url);
    };

    Linking.getInitialURL().then((url) => {
      if (url) navigateWithUrl(url);
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, [user]);

  const navigateWithUrl = async (url: string) => {
    if (!user) return;

    const routeUrl = url.replace('moneymate://', '');
    const [path] = routeUrl.split('?');

    if (path === 'add-expense') {
      const groups = await DBService.getGroups(user.id);
      if (groups.length > 0) {
        navigationRef.navigate('GroupDetails', {
          groupId: groups[0].id,
          openExpenseModal: true
        } as any);
      } else {
        navigationRef.navigate('MainTabs', { screen: 'Dashboard' } as any);
      }
    } else if (path.startsWith('group/')) {
      const parts = path.split('/');
      const groupId = parts[1];
      navigationRef.navigate('GroupDetails', {
        groupId: groupId,
        openExpenseModal: true
      } as any);
    } else if (path === 'saved') {
      navigationRef.navigate('MainTabs', {
        screen: 'SavedInsteadTab',
        params: { openSavedModal: true }
      } as any);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="text-slate-500 mt-4 font-semibold text-sm">Loading MoneyMate...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user === null ? (
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={TabNavigator} />
            <RootStack.Screen 
              name="GroupDetails" 
              component={GroupScreen} 
              options={{ headerShown: false }} 
            />
            <RootStack.Screen 
              name="Settle" 
              component={SettleScreen} 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export const AppNavigator = () => {
  return (
    <UserProvider>
      <NavigationContent />
    </UserProvider>
  );
};
