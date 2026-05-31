import { useState } from 'react';
import { useRouter } from "expo-router";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Stack } from "expo-router";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoading } from '@/context/LoadingContext';
import { useAuth } from '@/context/AuthContext';

const Login = () => {

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showLoader, hideLoader } = useLoading();
  const { login } = useAuth();

  const handleLogin = async () => {
    console.log("login button Clicked");

    // Validation
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    console.log("email", email, "password", password);

    setIsLoading(true);
    showLoader("Logging in...");

    try {
      console.log("here");

      // const response = await axios.get(
      //   "https://jsonplaceholder.typicode.com/posts/1"
      // );

      // console.log(response.data);

      const response = await axios.post(
        `https://real-chat-backend-c3nm.onrender.com/api/users/login`,
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        }
      );

      console.log("Login response:", response.data);

      if (response.data.status === true) {
        // Store user data/token if needed
        // await AsyncStorage.setItem('userToken', response.data.token);
        console.log("login successfull");
        await login(response.data.user);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        router.replace("/home");
      } else {
        console.log("Error", response.data.message || "Login failed");
      }
    } catch (err: any) {
      // console.error("Login error:", err);

      if (err.response?.status === 401) {
        console.log("Error", "Invalid email or password");
      } else if (err.response?.data?.message) {
        console.log("Error", err.response.data.message);
      } else if (err.request) {
        console.log("Network Error", "Cannot connect to server", err.request);
      } else {
        console.log("Error", "Something went wrong");
      }
    } finally {
      hideLoader();
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Login" }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>

            <Text style={styles.welcome}>👋 Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue chatting
            </Text>

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#e8f5e9",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#007bff",
    justifyContent: "center",
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#555",
  },
  welcome: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#075e54",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#075e54",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 25,
  },

  logoText: {
    fontSize: 40,
  },
});

export default Login;