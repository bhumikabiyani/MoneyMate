import { Platform } from 'react-native';

export const WidgetService = {
  async updateWidgets(userId: string) {
    if (Platform.OS !== 'android') return;

    try {
      // Trigger react-native-android-widget update
      try {
        const { triggerGroupBalanceWidgetUpdate } = require('../widgets/GroupBalanceWidget');
        triggerGroupBalanceWidgetUpdate();
      } catch (err) {
        console.log('Error triggering group balance widget:', err);
      }
    } catch (e) {
      console.log('Error updating widgets in service:', e);
    }
  }
};
