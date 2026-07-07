import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useUser } from '../hooks/useUser';
import { DBService } from '../services/db';
import { Expense, Group, Category } from '../types';
import { Card } from '../components/Card';
import { DatePicker } from '../components/DatePicker';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useIsFocused } from '@react-navigation/native';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',           // Amber
  online_grocery: '#6366F1', // Indigo
  offline_grocery: '#06B6D4',// Cyan
  shopping: '#EC4899',      // Pink
  travel: '#10B981',        // Emerald
  entertainment: '#8B5CF6', // Violet
  bills: '#EF4444',         // Red
  health: '#14B8A6',        // Teal
  home: '#3B82F6',          // Blue
  other: '#64748B',         // Slate
};

const HASHED_COLORS = [
  '#F43F5E', '#10B981', '#6366F1', '#D946EF', '#F59E0B',
  '#06B6D4', '#8B5CF6', '#84CC16', '#EC4899', '#3B82F6'
];

export const AnalyticsScreen: React.FC = () => {
  const { user } = useUser();
  const isFocused = useIsFocused();

  // Filters state
  const [filterType, setFilterType] = useState<'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customEnd, setCustomEnd] = useState(new Date());
  const [customFilterModalVisible, setCustomFilterModalVisible] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [totalSpend, setTotalSpend] = useState(0);
  const [prevMonthSpend, setPrevMonthSpend] = useState(0);
  const [highestCategory, setHighestCategory] = useState<{ name: string; amount: number; icon: string } | null>(null);
  const [chartData, setChartData] = useState<{ id: string; name: string; icon: string; amount: number; percentage: number; color: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (user?.id && isFocused) {
      loadAnalyticsData();
    }
  }, [user?.id, filterType, customStart, customEnd, isFocused]);

  const getCategoryColor = (id: string, index: number) => {
    if (CATEGORY_COLORS[id]) return CATEGORY_COLORS[id];
    return HASHED_COLORS[index % HASHED_COLORS.length];
  };

  const loadAnalyticsData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      const cats = await DBService.getCategories();
      setCategories(cats);

      const userGroups = await DBService.getGroups(user.id);
      
      // Determine date ranges
      let startDate = new Date();
      let endDate = new Date();

      const today = new Date();
      if (filterType === 'this_month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      } else if (filterType === 'last_month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      } else {
        startDate = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0);
        endDate = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
      }

      // 1. Gather all expenses in active groups
      let allExpenses: Expense[] = [];
      for (const group of userGroups) {
        const groupExps = await DBService.getGroupExpenses(group.id);
        allExpenses.push(...groupExps);
      }

      // Filter by active date range
      const filteredExpenses = allExpenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= startDate && expDate <= endDate;
      });

      // 2. Sum up totals by category
      const categorySum: Record<string, number> = {};
      let total = 0;

      filteredExpenses.forEach((exp) => {
        // Count full expense amount if personal, or count full split amount
        const amt = Number(exp.amount);
        categorySum[exp.category_id] = (categorySum[exp.category_id] || 0) + amt;
        total += amt;
      });

      setTotalSpend(total);

      // Compute percentages and details
      const structuredChartData = Object.keys(categorySum).map((catId, index) => {
        const catInfo = cats.find((c) => c.id === catId);
        const amt = categorySum[catId];
        const percentage = total > 0 ? (amt / total) * 100 : 0;
        
        return {
          id: catId,
          name: catInfo?.name || 'Custom Category',
          icon: catInfo?.icon || '🏷️',
          amount: amt,
          percentage: Number(percentage.toFixed(1)),
          color: getCategoryColor(catId, index),
        };
      }).sort((a, b) => b.amount - a.amount);

      setChartData(structuredChartData);

      // 3. Highest spending category
      if (structuredChartData.length > 0) {
        setHighestCategory({
          name: structuredChartData[0].name,
          amount: structuredChartData[0].amount,
          icon: structuredChartData[0].icon,
        });
      } else {
        setHighestCategory(null);
      }

      // 4. Compute previous month spending for comparison
      let prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      let prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

      if (filterType === 'last_month') {
        // If filtering last month, compare against month before last
        prevStartDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        prevEndDate = new Date(today.getFullYear(), today.getMonth() - 1, 0, 23, 59, 59);
      }

      const prevFilteredExpenses = allExpenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= prevStartDate && expDate <= prevEndDate;
      });

      let prevTotal = 0;
      prevFilteredExpenses.forEach((exp) => {
        prevTotal += Number(exp.amount);
      });
      setPrevMonthSpend(prevTotal);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyComparisonText = () => {
    if (totalSpend === 0 && prevMonthSpend === 0) return 'No spending data available';
    if (prevMonthSpend === 0) return 'First month of transactions tracked';

    const diff = totalSpend - prevMonthSpend;
    const pct = Math.abs((diff / prevMonthSpend) * 100).toFixed(0);
    const direction = diff > 0 ? 'more' : 'less';
    const arrow = diff > 0 ? '▲' : '▼';
    const colorClass = diff > 0 ? 'text-brand-rose' : 'text-brand-emerald';

    return {
      arrow,
      pct,
      direction,
      colorClass,
    };
  };

  const compData = getMonthlyComparisonText();

  // Donut SVG parameters
  const size = 180;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute segments coordinates
  let cumulativePercentage = 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 bg-white border-b border-slate-100">
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Analytics</Text>
        <Text className="text-2xl font-black text-slate-800 tracking-tight">Category Spending</Text>
      </View>

      {/* Date Filter selector tabs */}
      <View className="flex-row bg-white border-b border-slate-200/50 px-5 py-3">
        <TouchableOpacity
          onPress={() => setFilterType('this_month')}
          className={`flex-1 items-center py-2 rounded-xl ${
            filterType === 'this_month' ? 'bg-primary-100 border border-primary-300' : 'bg-transparent'
          }`}
        >
          <Text className={`text-xs font-bold ${filterType === 'this_month' ? 'text-primary-700' : 'text-slate-500'}`}>
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('last_month')}
          className={`flex-1 items-center py-2 rounded-xl mx-2 ${
            filterType === 'last_month' ? 'bg-primary-100 border border-primary-300' : 'bg-transparent'
          }`}
        >
          <Text className={`text-xs font-bold ${filterType === 'last_month' ? 'text-primary-700' : 'text-slate-500'}`}>
            Last Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setFilterType('custom');
            setCustomFilterModalVisible(true);
          }}
          className={`flex-1 items-center py-2 rounded-xl ${
            filterType === 'custom' ? 'bg-primary-100 border border-primary-300' : 'bg-transparent'
          }`}
        >
          <Text className={`text-xs font-bold ${filterType === 'custom' ? 'text-primary-700' : 'text-slate-500'}`}>
            Custom Range
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-5 pt-4">
          
          {/* SVG Donut Chart */}
          {chartData.length === 0 ? (
            <Card variant="outline" className="items-center justify-center py-12 bg-white border-slate-200/50 mb-4">
              <Text className="text-4xl mb-2">📊</Text>
              <Text className="text-slate-700 font-bold text-sm">No spendings in this period</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Change your filter or log new expenses inside groups to see analytics.
              </Text>
            </Card>
          ) : (
            <Card variant="outline" className="bg-white border-slate-200/50 mb-4 items-center p-6">
              <View className="relative w-[180px] h-[180px] justify-center items-center">
                {/* SVG Drawing circles */}
                <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#f1f5f9" // background circle
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {chartData.map((item, index) => {
                    const strokeDashoffset = circumference - (circumference * item.percentage) / 100;
                    const rotateAngle = (cumulativePercentage / 100) * 360;
                    cumulativePercentage += item.percentage;

                    return (
                      <Circle
                        key={`segment-${index}`}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={item.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        fill="transparent"
                        transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
                      />
                    );
                  })}
                </Svg>

                {/* Inner Text summary (Total spend) */}
                <View className="absolute items-center">
                  <Text className="text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">Total Spent</Text>
                  <Text className="text-slate-900 text-2xl font-black mt-0.5">₹{totalSpend.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Highest spend and MoM analytics cards */}
          {chartData.length > 0 && (
            <View className="flex-row justify-between mb-4">
              {highestCategory && (
                <Card variant="outline" className="w-[48%] bg-white border-slate-100 p-4">
                  <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Highest Spend</Text>
                  <View className="flex-row items-center mt-1.5">
                    <Text className="text-base mr-1">{highestCategory.icon}</Text>
                    <Text className="text-slate-800 text-xs font-black truncate flex-1" numberOfLines={1}>
                      {highestCategory.name}
                    </Text>
                  </View>
                  <Text className="text-slate-800 text-sm font-black mt-1">₹{highestCategory.amount.toLocaleString('en-IN')}</Text>
                </Card>
              )}

              {typeof compData === 'object' && (
                <Card variant="outline" className="w-[48%] bg-white border-slate-100 p-4">
                  <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">MoM Comparison</Text>
                  <View className="flex-row items-center mt-2">
                    <Text className={`${compData.colorClass} text-xs font-black mr-1`}>
                      {compData.arrow} {compData.pct}%
                    </Text>
                    <Text className="text-slate-500 text-[10px] font-medium">{compData.direction}</Text>
                  </View>
                  <Text className="text-slate-400 text-[9px] mt-2 font-semibold">
                    Prev: ₹{prevMonthSpend.toLocaleString('en-IN')}
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* Categories details list */}
          {chartData.length > 0 && (
            <Card variant="outline" className="bg-white border-slate-200/50 mb-6 p-4">
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Categories Share</Text>
              
              {chartData.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <View className="flex-row items-center flex-1 mr-3">
                    {/* Circle Color Dot */}
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <Text className="text-slate-500 text-sm mr-2">{item.icon}</Text>
                    <Text className="text-slate-700 text-sm font-semibold truncate flex-1" numberOfLines={1}>{item.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-800 text-xs font-bold">₹{item.amount.toLocaleString('en-IN')}</Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">{item.percentage}%</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
          
          <View className="h-10" />
        </ScrollView>
      )}

      {/* CUSTOM RANGE PICKER MODAL */}
      <Modal
        visible={customFilterModalVisible}
        onClose={() => setCustomFilterModalVisible(false)}
        title="Custom Date Range"
      >
        <DatePicker
          label="Start Date"
          value={customStart}
          onChange={setCustomStart}
        />
        <DatePicker
          label="End Date"
          value={customEnd}
          onChange={setCustomEnd}
        />
        <Button
          title="Apply Range"
          onPress={() => setCustomFilterModalVisible(false)}
          variant="primary"
          className="mt-4"
        />
      </Modal>
    </SafeAreaView>
  );
};
