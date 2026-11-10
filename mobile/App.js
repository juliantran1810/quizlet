import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import FlashcardScreen from './src/screens/FlashcardScreen';
import LearnModeScreen from './src/screens/LearnModeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateEditDeckScreen from './src/screens/CreateEditDeckScreen';
import QuizModeScreen from './src/screens/QuizModeScreen';
import MatchGameScreen from './src/screens/MatchGameScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1E293B',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Quay lại',
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: 'Đăng Ký',
              headerBackTitle: 'Đăng nhập',
            }}
          />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DeckDetail"
            component={DeckDetailScreen}
            options={({ route }) => ({
              title: route.params?.title || 'Chi tiết bộ thẻ',
            })}
          />
          <Stack.Screen
            name="Flashcard"
            component={FlashcardScreen}
            options={{ title: 'Lật Thẻ Flashcard' }}
          />
          <Stack.Screen
            name="LearnMode"
            component={LearnModeScreen}
            options={{ title: 'Học Gõ Từ (Learn)' }}
          />
          <Stack.Screen
            name="QuizMode"
            component={QuizModeScreen}
            options={{ title: 'Trắc Nghiệm (Quiz)' }}
          />
          <Stack.Screen
            name="MatchGame"
            component={MatchGameScreen}
            options={{ title: 'Ghép Từ (Match Game)' }}
          />
          <Stack.Screen
            name="CreateEditDeck"
            component={CreateEditDeckScreen}
            options={({ route }) => ({
              title: route.params?.deckId ? 'Chỉnh Sửa Bộ Thẻ' : 'Tạo Bộ Thẻ Mới',
            })}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Hồ Sơ Cá Nhân' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});

