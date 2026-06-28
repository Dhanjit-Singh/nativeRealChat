import { Drawer } from 'expo-router/drawer';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LoadingProvider, useLoading } from '@/context/LoadingContext';
import Loader from '@/components/Loader';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { SocketProvider } from '@/context/SocketContext';

// Custom header button component
function DrawerToggleButton() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={{ marginLeft: 15 }}
    >
      <FontAwesome5 name="bars" size={22} color={colorScheme === 'dark' ? '#fff' : '#075e54'} />
    </TouchableOpacity>
  );
}

function DrawerContentWrapper(props: any) {
  return <CustomDrawerContent {...props} />;
}

// Drawer configuration component - Only shows when logged in
function DrawerNavigator() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useAuth();

  // If not logged in, don't render the drawer
  if (!isLoggedIn) {
    return (
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signin" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <Drawer
      drawerContent={(props) => <DrawerContentWrapper {...props} />}
      screenOptions={{
        headerLeft: () => <DrawerToggleButton />,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0f2f5',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#075e54',
        drawerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
          width: 280,
        },
        drawerLabelStyle: {
          color: colorScheme === 'dark' ? '#fff' : '#333',
          fontSize: 16,
        },
        drawerActiveTintColor: '#075e54',
        drawerInactiveTintColor: colorScheme === 'dark' ? '#aaa' : '#666',
      }}
    >
      {/* Main Home Screen - Shows in drawer */}
      <Drawer.Screen
        name="home"
        options={{
          drawerLabel: 'Chats',
          title: 'Messages',
          gestureEnabled: false, // Disable swipe back on Home
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hide chatscreen from drawer */}
      <Drawer.Screen
        name="chatscreen"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Chat',
          gestureEnabled: true, // Allow swipe back on ChatScreen
        }}
      />

      {/* Profile Screen - Shows in drawer */}
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'Profile',
          title: 'My Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Settings Screen - Shows in drawer */}
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

// Global loader component
function GlobalLoader() {
  const { isLoading, loaderMessage } = useLoading();
  return <Loader visible={isLoading} message={loaderMessage} />;
}

// Main layout component
export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <LoadingProvider>
          <SocketProvider>
            <AnimatedSplashOverlay />
            <DrawerNavigator />
            <GlobalLoader />
          </SocketProvider>
        </LoadingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}