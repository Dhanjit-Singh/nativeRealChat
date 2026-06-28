// components/ChatHeader.tsx
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface ChatHeaderProps {
    userName: string | string[];
    isChatUserOnline: boolean;
    lastSeen: string | string[];
    onBack: () => void;
    onCall: () => void;
    onVideoCall: () => void;
    onOptions: () => void;
    formatLastSeen: (dateString: string) => string;
}

export function ChatHeader({
    userName,
    isChatUserOnline,
    lastSeen,
    onBack,
    onCall,
    onVideoCall,
    onOptions,
    formatLastSeen
}: ChatHeaderProps) {
    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onBack} style={styles.headerBack}>
                <Ionicons name="arrow-back" size={24} color="#075e54" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerInfo} onPress={onOptions}>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>{userName?.charAt(0)}</Text>
                </View>
                <View>
                    <Text style={styles.headerName}>{userName}</Text>

                    {isChatUserOnline && <Text style={styles.headerStatus}>Online</Text>}
                    {!isChatUserOnline && (
                        <Text style={styles.headerStatus}>
                            Last seen {formatLastSeen(lastSeen)}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
                <TouchableOpacity onPress={onCall} style={styles.headerIcon}>
                    <Ionicons name="call-outline" size={22} color="#075e54" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onVideoCall} style={styles.headerIcon}>
                    <Ionicons name="videocam-outline" size={22} color="#075e54" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOptions} style={styles.headerIcon}>
                    <Ionicons name="ellipsis-vertical" size={22} color="#075e54" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        marginTop:2,
        paddingTop: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        backgroundColor: "#f0f2f5",
        height: 100,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 20,
        overflow: 'visible',
    },
    headerBack: {
        marginLeft: 0,
        padding: 0,
    },
    headerInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#075e54",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    headerAvatarText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    headerName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1f2937",
    },
    headerStatus: {
        fontSize: 12,
        color: "#6b7280",
        width: 250,
    },
    headerRight: {
        flexDirection: "row",
        marginRight: 8,
    },
    headerIcon: {
        marginLeft: 16,
    },
});