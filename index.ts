import './global.css';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler, registerWidgetConfigurationScreen } from 'react-native-android-widget';
import { widgetTaskHandler, GroupWidgetConfigScreen } from './src/widgets/GroupBalanceWidget';

import App from './App';

// Register native android widget handlers
registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(GroupWidgetConfigScreen);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

