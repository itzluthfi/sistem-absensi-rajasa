import { Tabs } from 'expo-router';
import { useColorScheme, Image } from 'react-native';

import { Colors } from '@/constants/theme';

const TAB_ICONS = {
  home: require('@/assets/images/tabIcons/home.png'),
  explore: require('@/assets/images/tabIcons/explore.png'),
};

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconSource = name === 'index' ? TAB_ICONS.home : TAB_ICONS.explore;
  return (
    <Image
      source={iconSource}
      style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
    />
  );
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => <TabBarIcon name="explore" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
