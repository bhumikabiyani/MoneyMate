import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Category } from '../types';

interface CategorySelectorProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddCustomPress?: () => void;
  label?: string;
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedId,
  onSelect,
  onAddCustomPress,
  label,
  error,
}) => {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-600 text-xs font-semibold mb-3 uppercase tracking-wider">
          {label}
        </Text>
      )}

      <View className="flex-row flex-wrap justify-between">
        {categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => onSelect(category.id)}
              activeOpacity={0.7}
              className={`w-[23%] aspect-square items-center justify-center rounded-2xl mb-3 ${
                isSelected
                  ? 'bg-primary-100 border-2 border-primary-500'
                  : 'bg-slate-100 border-2 border-transparent'
              }`}
            >
              <Text className="text-2xl mb-1">{category.icon}</Text>
              <Text
                className={`text-[10px] text-center px-1 font-semibold ${
                  isSelected ? 'text-primary-700' : 'text-slate-600'
                }`}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {onAddCustomPress && (
          <TouchableOpacity
            onPress={onAddCustomPress}
            activeOpacity={0.7}
            className="w-[23%] aspect-square items-center justify-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 mb-3"
          >
            <Text className="text-xl text-slate-500 mb-1">➕</Text>
            <Text className="text-[10px] text-slate-500 font-semibold">Custom</Text>
          </TouchableOpacity>
        )}

        {/* Empty placeholder items to balance grid layout */}
        {Array.from({ length: (4 - ((categories.length + (onAddCustomPress ? 1 : 0)) % 4)) % 4 }).map((_, index) => (
          <View key={`empty-${index}`} className="w-[23%] aspect-square mb-3" />
        ))}
      </View>

      {error && (
        <Text className="text-brand-rose text-xs mt-1 font-medium ml-1">
          {error}
        </Text>
      )}
    </View>
  );
};
