import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function ProfileScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Profile' }} />
            <View style={styles.container}>
                <Text style={styles.title}>Profile Screen</Text>
                <Text>Your profile information will appear here</Text>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});