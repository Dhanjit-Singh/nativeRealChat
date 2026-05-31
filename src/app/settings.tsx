import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function SettingsScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Settings' }} />
            <View style={styles.container}>
                <Text style={styles.title}>Settings Screen</Text>
                <Text>App settings will appear here</Text>
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