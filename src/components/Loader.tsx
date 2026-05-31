import { View, ActivityIndicator, Modal, Text, StyleSheet } from "react-native";

type LoaderProps = {
    visible: boolean;
    transparent?: boolean;
    message?: string;
    size?: "small" | "large";
    color?: string;
};

export default function Loader({
    visible,
    transparent = true,
    message,
    size = "large",
    color = "#075e54"
}: LoaderProps) {
    if (!visible) return null;

    return (
        <Modal
            transparent={transparent}
            animationType="fade"
            visible={visible}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size={size} color={color} />
                    {message && <Text style={styles.message}>{message}</Text>}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    loaderContainer: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        minWidth: 120,
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        color: "#333",
        textAlign: "center",
    },
});