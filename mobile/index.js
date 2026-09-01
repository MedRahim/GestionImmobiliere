/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {registerNotifeeBackground} from './src/services/localPush';

registerNotifeeBackground();

AppRegistry.registerComponent(appName, () => App);
