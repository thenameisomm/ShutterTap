// __tests__/Screens.test.tsx — every tab renders its designed
// unavailable/empty state with no native bridges installed (jest env has
// no BluetoothModule/CameraModule/MediaButtonModule). Guards the ST-P0-02
// crash class: property access on undefined modules must never throw.
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../src/screens/HomeScreen';
import DeviceScreen from '../src/screens/DeviceScreen';
import GestureScreen from '../src/screens/GestureScreen';
import CameraScreen from '../src/screens/CameraScreen';
import GalleryScreen from '../src/screens/GalleryScreen';
import MediaButtonScreen from '../src/screens/MediaButtonScreen';

// react-native-safe-area-context renders null children in jest (its native
// inset provider never resolves). Stub it per the library's testing docs.
jest.mock('react-native-safe-area-context', () => {
  const ReactMock = jest.requireActual('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    __esModule: true,
    SafeAreaInsetsContext: ReactMock.createContext(insets),
    SafeAreaFrameContext: ReactMock.createContext({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
      <ReactMock.Fragment>{children}</ReactMock.Fragment>
    ),
    SafeAreaConsumer: ({ children }: any) => children(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

const Tab = createBottomTabNavigator();

const renderScreen = async (name: string, component: any) => {
  let root: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    root = ReactTestRenderer.create(
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name={name} component={component} />
        </Tab.Navigator>
      </NavigationContainer>,
    );
  });
  return root!;
};

const textsOf = (root: ReactTestRenderer.ReactTestRenderer): string => {
  const flatten = (node: any): string => {
    if (node == null) {
      return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(flatten).join('');
    }
    return '';
  };
  return root.root
    .findAllByType(Text)
    .map(n => flatten(n.props.children))
    .join('\n');
};

describe('screens without native bridges', () => {
  test('Home shows idle link status + quick actions', async () => {
    const texts = textsOf(await renderScreen('Home', HomeScreen));
    expect(texts).toMatch('ShutterTap');
    expect(texts).toMatch('Not connected');
    expect(texts).toMatch('Get started');
  });

  test('Device shows discovery hero + empty state', async () => {
    const texts = textsOf(await renderScreen('Device', DeviceScreen));
    expect(texts).toMatch('Devices');
    expect(texts).toMatch('No devices yet');
    expect(texts).toMatch('Scan for devices');
  });

  test('Gesture lists the four supported gestures as Not set', async () => {
    const texts = textsOf(await renderScreen('Gesture', GestureScreen));
    expect(texts).toMatch('Single tap');
    expect(texts).toMatch('Double tap');
    expect(texts).toMatch('Triple tap');
    expect(texts).toMatch('Long press');
    expect(texts).toMatch('Not set');
  });

  test('Camera shows unavailable state, controls intact', async () => {
    const texts = textsOf(await renderScreen('Camera', CameraScreen));
    expect(texts).toMatch('Camera unavailable');
    expect(texts).toMatch('PHOTO');
    expect(texts).toMatch('VIDEO');
  });

  test('Gallery shows one unavailable state, no fake media and no dead retry', async () => {
    const texts = textsOf(await renderScreen('Gallery', GalleryScreen));
    expect(texts).toMatch('Gallery');
    expect(texts).toMatch('Media listing lives in the native module');
    expect(texts).not.toMatch('Native media module unavailable');
    expect(texts).not.toMatch('Try again');
  });

  test('Media shows empty event feed', async () => {
    const texts = textsOf(await renderScreen('Media', MediaButtonScreen));
    expect(texts).toMatch('Media buttons');
    expect(texts).toMatch('No button presses yet');
  });
});
