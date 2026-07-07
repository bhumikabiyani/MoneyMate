import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../hooks/useUser';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AVAILABLE_AVATARS } from '../utils/constants';

export const WelcomeScreen: React.FC = () => {
  const { createUserProfile } = useUser();
  const [name, setName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0].emoji);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetStarted = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createUserProfile(name.trim(), selectedAvatar, secondName.trim());
    } catch (e) {
      setError('Failed to setup profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Header branding */}
          <View className="items-center mb-10 mt-6">
            <Text className="text-6xl mb-3">🤝</Text>
            <Text className="text-4xl font-black text-slate-800 tracking-tight">MoneyMate</Text>
            <Text className="text-slate-400 text-sm mt-2 text-center font-semibold px-4">
              Private finance tracking & expense splitting.
            </Text>
          </View>

          {/* Onboarding Form */}
          <View className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-lg shadow-slate-100 mb-8">
            <Text className="text-slate-700 text-lg font-black mb-4 text-center">
              Set Up Your Profile
            </Text>

            {error !== '' && (
              <Text className="text-brand-rose text-xs mb-4 font-bold text-center">
                {error}
              </Text>
            )}

            <Input
              label="Your Name"
              value={name}
              onChangeText={(txt) => {
                setName(txt);
                if (error) setError('');
              }}
              placeholder="e.g. User 1"
              autoCapitalize="words"
            />

            <Input
              label="Second Person Name (Optional)"
              value={secondName}
              onChangeText={setSecondName}
              placeholder="e.g. User 2"
              autoCapitalize="words"
            />

            {/* Avatar Selection */}
            <Text className="text-slate-600 text-xs font-semibold mb-2.5 uppercase tracking-wider">
              Choose your avatar
            </Text>
            <View className="flex-row flex-wrap justify-between mb-6">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.emoji;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    onPress={() => setSelectedAvatar(avatar.emoji)}
                    className={`w-[18%] aspect-square rounded-full items-center justify-center mb-2 border-2 ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-slate-50'
                    }`}
                  >
                    <Text className="text-xl">{avatar.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Get Started"
              onPress={handleGetStarted}
              loading={loading}
              disabled={!name.trim()}
              variant="primary"
              className="mt-2"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
