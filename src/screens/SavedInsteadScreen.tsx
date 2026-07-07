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
import { Saving, Category } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { AmountInput } from '../components/AmountInput';
import { CategorySelector } from '../components/CategorySelector';
import { DatePicker } from '../components/DatePicker';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import { WidgetService } from '../services/widgetService';

export const SavedInsteadScreen: React.FC = () => {
  const { user } = useUser();
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Data state
  const [savingsList, setSavingsList] = useState<Saving[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [avoidedItem, setAvoidedItem] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('shopping');
  const [savedDate, setSavedDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user?.id && isFocused) {
      loadSavingsData();
    }
  }, [user?.id, isFocused]);

  // Handle deep linked Quick Add Saving action
  const openSavedModalParam = route.params?.openSavedModal;
  useEffect(() => {
    if (openSavedModalParam) {
      setModalVisible(true);
      navigation.setParams({ openSavedModal: undefined });
    }
  }, [openSavedModalParam]);

  const loadSavingsData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      const cats = await DBService.getCategories();
      setCategories(cats);

      const items = await DBService.getSavings(user.id);
      setSavingsList(items);

      // Calculate this month's savings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let total = 0;

      items.forEach((s) => {
        const d = new Date(s.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          total += Number(s.amount_saved);
        }
      });
      setMonthTotal(total);

      // Update Android widgets
      WidgetService.updateWidgets(user.id);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!avoidedItem.trim()) {
      setFormError('Please enter what you avoided buying.');
      return;
    }
    if (!savedAmount || Number(savedAmount) <= 0) {
      setFormError('Please enter a valid amount saved.');
      return;
    }
    setFormError('');

    try {
      await DBService.addSaving({
        user_id: user?.id || 'unknown_user',
        title: avoidedItem.trim(),
        amount_saved: Number(savedAmount),
        category: selectedCatId,
        date: savedDate.toISOString(),
        note: note.trim() || undefined,
      });

      // Clear
      setModalVisible(false);
      setAvoidedItem('');
      setSavedAmount('');
      setNote('');
      setSavedDate(new Date());

      // Reload
      await loadSavingsData();
      Alert.alert('Success', 'Saved Instead entry logged! 💰');
    } catch (e) {
      Alert.alert('Error', 'Failed to save entry.');
    }
  };

  const getCategoryIcon = (catId: string) => {
    return categories.find((c) => c.id === catId)?.icon || '🛍️';
  };

  const getMotivationalMessage = (total: number) => {
    if (total === 0) return "You haven't logged any avoided impulse purchases yet. Start exercising your self-control! 💪";
    if (total < 1000) return 'Nice start! Small savings compound into massive assets. Keep it up! 🌱';
    if (total < 5000) return 'Amazing self-control! You are actively building a wealthier future! 🚀';
    return 'Absolute MoneyMaster! Your self-control has saved you a fortune this month! 👑';
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Saved Instead 💰</Text>
          <Text className="text-2xl font-black text-slate-800 tracking-tight">Self-Control Log</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setFormError('');
            setAvoidedItem('');
            setSavedAmount('');
            setNote('');
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
          
          <View className="bg-emerald-600 mb-6 rounded-3xl p-6 shadow-md shadow-emerald-600/20">
            <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Saved This Month</Text>
            <Text className="text-white text-3xl font-black mt-0.5">₹{monthTotal.toLocaleString('en-IN')}</Text>
            
            <View className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-3.5 mt-4">
              <Text className="text-emerald-50 text-xs font-bold leading-relaxed">
                {getMotivationalMessage(monthTotal)}
              </Text>
            </View>
          </View>

          {/* History header */}
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Savings History</Text>

          {savingsList.length === 0 ? (
            <Card variant="outline" className="items-center justify-center py-12 bg-white border-slate-200 border-dashed">
              <Text className="text-4xl mb-2">🎯</Text>
              <Text className="text-slate-700 font-bold text-sm">No impulse purchases avoided yet</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Whenever you feel like buying something unnecessary but decide against it, log it here to see how much money you save!
              </Text>
            </Card>
          ) : (
            savingsList.map((item) => {
              const dateString = new Date(item.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <Card key={item.id} variant="outline" className="bg-white border-slate-200/50 mb-3 p-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3.5">
                      <Text className="text-lg">{getCategoryIcon(item.category)}</Text>
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="text-slate-800 text-sm font-bold">Avoided: {item.title}</Text>
                      {item.note ? (
                        <Text className="text-slate-500 text-[11px] font-semibold mt-0.5 italic">
                          "{item.note}"
                        </Text>
                      ) : null}
                      <Text className="text-slate-400 text-[10px] mt-1 font-medium">{dateString}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-brand-emerald text-sm font-black">₹{item.amount_saved.toLocaleString('en-IN')}</Text>
                      <Text className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Saved</Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {/* LOG SAVED INSTEAD ENTRY MODAL */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Log Avoided Purchase"
      >
        {formError !== '' && (
          <Text className="text-brand-rose text-xs mb-3 font-bold text-center">
            {formError}
          </Text>
        )}

        <AmountInput
          value={savedAmount}
          onChangeText={setSavedAmount}
          label="Amount Saved"
          error={formError && !savedAmount ? formError : undefined}
        />

        <Input
          label="What did you avoid buying?"
          value={avoidedItem}
          onChangeText={setAvoidedItem}
          placeholder="e.g. Shoes, Fancy Coffee, Subscription"
          error={formError && !avoidedItem ? formError : undefined}
          className="bg-slate-50 border border-slate-200"
        />

        <CategorySelector
          label="Category"
          categories={categories}
          selectedId={selectedCatId}
          onSelect={setSelectedCatId}
        />

        <DatePicker
          label="Date Avoided"
          value={savedDate}
          onChange={setSavedDate}
        />

        <Input
          label="Self-control Note"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Already had similar shoes"
          className="bg-slate-50 border border-slate-200"
        />

        <Button
          title="Log Savings"
          onPress={handleSave}
          variant="primary"
          className="mt-4"
        />
      </Modal>
    </SafeAreaView>
  );
};
