import React from 'react';
import { View, Text } from 'react-native';

interface AvatarProps {
  emoji?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  emoji,
  name,
  size = 'md',
  className = '',
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: 'w-10 h-10 rounded-full', text: 'text-lg', fallbackText: 'text-sm' };
      case 'md':
        return { container: 'w-14 h-14 rounded-full', text: 'text-2xl', fallbackText: 'text-base' };
      case 'lg':
        return { container: 'w-20 h-20 rounded-full', text: 'text-4xl', fallbackText: 'text-xl' };
      case 'xl':
        return { container: 'w-28 h-28 rounded-full', text: 'text-6xl', fallbackText: 'text-3xl' };
    }
  };

  const styles = getSizeStyles();

  // If there's an emoji, render it on a soft background
  if (emoji) {
    return (
      <View
        className={`${styles.container} bg-slate-100 items-center justify-center border border-slate-200/50 ${className}`}
      >
        <Text className={styles.text} style={{ includeFontPadding: false }}>
          {emoji}
        </Text>
      </View>
    );
  }

  // Fallback: render initials of name
  const initials = name
    ? name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  // Seeded color generation for name initials background
  const getBackgroundColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-rose-100 text-rose-700',
      'bg-amber-100 text-amber-700',
      'bg-sky-100 text-sky-700',
      'bg-violet-100 text-violet-700',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const bgStyle = getBackgroundColor(name || '?');

  return (
    <View
      className={`${styles.container} ${bgStyle.split(' ')[0]} items-center justify-center ${className}`}
    >
      <Text className={`${styles.fallbackText} ${bgStyle.split(' ')[1]} font-bold`}>
        {initials}
      </Text>
    </View>
  );
};
