import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-slate-900/40">
          <TouchableWithoutFeedback>
            <View 
              className="bg-white rounded-t-[40px] px-6 pt-5 w-full max-h-[90%] flex-col"
              style={{ 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: -10 }, 
                shadowOpacity: 0.05, 
                shadowRadius: 20,
                elevation: 5,
                marginBottom: Platform.OS === 'ios' ? -35 : 0,
                paddingBottom: Platform.OS === 'ios' ? 55 : 24,
              }}
            >
              {/* Drag Indicator */}
              <View className="w-12 h-1.5 bg-slate-200 rounded-full mb-4 self-center" />

              {/* Header */}
              {title && (
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-slate-800 text-lg font-extrabold">{title}</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <Text className="text-slate-600 font-semibold text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* KeyboardAvoidingView inside modal container */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-shrink flex-grow"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
              >
                {/* Content */}
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  className="flex-shrink"
                >
                  <View className="pb-4">{children}</View>
                </ScrollView>
              </KeyboardAvoidingView>

              {/* Footer */}
              {footer && <View className="pt-4 border-t border-slate-100">{footer}</View>}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};
