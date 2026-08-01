import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// Production build'de development client ekranı otomatik olarak gelmez
// Development build'de development client ekranı gelir (eas.json'daki developmentClient: true nedeniyle)
registerRootComponent(App);
