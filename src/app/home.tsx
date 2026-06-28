import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, BackHandler } from "react-native";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from '@expo/vector-icons';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoading } from '../context/LoadingContext';

export default function ChatListScreen() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [chats, setChats] = useState([]);
    const [loggedInUserId, setLoggedInUserId] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const { showLoader, hideLoader } = useLoading();

    useFocusEffect(
        useCallback(() => {

            const backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                () => {
                    return true;
                }
            );

            return () => {
                backHandler.remove();
            };

        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [loggedInUserId])
    );

    // Get logged in user ID from storage
    useEffect(() => {
        const getUserData = async () => {
            showLoader("Loading user data...");
            try {
                const userData = await AsyncStorage.getItem("user");
                if (userData) {
                    const user = JSON.parse(userData);
                    const userId = user.id || user._id;
                    setLoggedInUserId(userId);
                }
            } catch (error) {
                console.log("Error getting user data:", error);
            } finally {
                hideLoader();
            }
        };

        getUserData();
    }, []);

    const fetchUsers = useCallback(async () => {
        if (!loggedInUserId) return;

        try {
            const res = await axios.get(`https://real-chat-backend-c3nm.onrender.com/api/chats?userId=${loggedInUserId}`);
            // console.log("res==============>>>>>", res.data);
            const transformedChats = res.data.map(chat => {
                const otherUser = chat.users.find(user => user._id !== loggedInUserId);
                const unreadCount = otherUser?.unreadMessages?.[loggedInUserId] || chat.unreadCount || 0;
                const isOnline = otherUser?.isOnline || false;
                const lastMessage = chat.lastMessage?.text || "No messages yet";
                const lastMessageTime = chat.lastMessage?.createdAt || chat.updatedAt || new Date(0).toISOString();

                return {
                    id: chat._id,
                    userId: otherUser?._id,
                    name: otherUser?.name || "Unknown User",
                    email: otherUser?.email || "",
                    avatar: otherUser?.avatar || null,
                    phone: otherUser?.phone || "",
                    status: isOnline ? "Online" : "Offline",
                    lastMessage: lastMessage,
                    lastMessageTime: lastMessageTime,
                    unreadCount: unreadCount,
                    isOnline: isOnline,
                    lastSeen: otherUser?.lastSeen,
                };
            });

            // const sortedChats = transformedChats.sort(
            //     (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
            // );

            const sortedChats = transformedChats.sort((a, b) => {
                const timeA = new Date(a.lastMessageTime).getTime();
                const timeB = new Date(b.lastMessageTime).getTime();
                return timeB - timeA; // Descending order (newest first)
            });

            setChats(sortedChats);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, [loggedInUserId]);

    // Initial fetch with loader
    useEffect(() => {
        const loadChats = async () => {
            if (loggedInUserId) {
                showLoader("Loading conversations...");
                await fetchUsers();
                hideLoader();
            }
        };

        loadChats();
    }, [loggedInUserId]);

    // Background polling without loader
    useEffect(() => {
        if (loggedInUserId) {
            const interval = setInterval(() => {
                fetchUsers(); // No loader for background updates
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [loggedInUserId, fetchUsers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    }, [fetchUsers]);

    // Rest of your component remains the same...
    const getAvatarColor = (name: string) => {
        const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#8b5cf6", "#10b981", "#d946ef"];
        const index = name?.charAt(0).toUpperCase().charCodeAt(0) || 0;
        return colors[index % colors.length];
    };

    const formatTime = (date: string) => {
        if (!date) return "";
        const messageDate = new Date(date);
        const now = new Date();
        const diffHours = (now - messageDate) / (1000 * 60 * 60);

        if (diffHours < 24) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffHours < 48) {
            return "Yesterday";
        } else {
            return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const handleChatPress = (chat: any) => {
        // console.log("selected user========>>>>>", chat);
        // console.log("Selected Chat:", JSON.stringify(chat, null, 2));
        router.push({
            pathname: "/chatscreen",
            params: {
                chatId: chat.id,
                userId: chat.userId,
                userName: chat.name,
                userAvatar: chat.avatar || "",
                userEmail: chat.email,
                userPhone: chat.phone,
                userStatus: chat.status,
                isOnline: chat.isOnline,
                lastSeen: chat.lastSeen || ""
            }
        });
    };

    const filteredChats = chats.filter(chat =>
        chat?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderChatItem = ({ item: chat }) => {
        // console.log("chat========>>>", chat);
        const hasUnread = chat.unreadCount > 0;
        const firstLetter = chat.name?.charAt(0).toUpperCase() || "?";

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleChatPress(chat)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(chat.name) }]}>
                        <Text style={styles.avatarText}>{firstLetter}</Text>
                    </View>
                    {chat.isOnline && <View style={styles.onlineBadge} />}
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.userName, hasUnread && styles.unreadName]} numberOfLines={1}>
                            {chat.name}
                        </Text>
                        <Text style={styles.timeText}>{formatTime(chat.lastMessageTime)}</Text>
                    </View>

                    <View style={styles.messagePreview}>
                        <Text style={[styles.messageText, hasUnread && styles.unreadMessageText]} numberOfLines={1}>
                            {chat.lastMessage}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={18} color="#9ca3af" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Stack.Screen options={{ title: "Messages", headerTitleStyle: styles.headerTitle, headerShadowVisible: false, gestureEnabled: false, }} />
            <View style={styles.container}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        style={styles.searchInput}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm("")}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>{filteredChats.length} chats</Text>
                </View>

                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#075e54"]}
                            tintColor="#075e54"
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No conversations yet</Text>
                            <Text style={styles.emptySubText}>Start chatting with someone!</Text>
                        </View>
                    )}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#ffffff" },
    headerTitle: { fontSize: 18, fontWeight: "600", color: "#1f2937" },
    searchContainer: {
        flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 12, marginBottom: 12,
        paddingHorizontal: 12, backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#1f2937" },
    statsContainer: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 8 },
    statsText: { fontSize: 12, color: "#9ca3af", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    chatItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    avatarContainer: { position: "relative", marginRight: 12 },
    avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ffffff" },
    avatarText: { color: "#ffffff", fontSize: 22, fontWeight: "bold" },
    onlineBadge: { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#ffffff" },
    unreadBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444", borderRadius: 12, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ffffff" },
    unreadText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
    chatInfo: { flex: 1 },
    chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    userName: { fontSize: 16, fontWeight: "600", color: "#374151", flex: 1, marginRight: 8 },
    unreadName: { color: "#111827", fontWeight: "700" },
    timeText: { fontSize: 11, color: "#9ca3af" },
    messagePreview: { flexDirection: "row", alignItems: "center" },
    messageText: { fontSize: 13, color: "#6b7280", flex: 1 },
    unreadMessageText: { color: "#111827", fontWeight: "500" },
    menuButton: { padding: 8, marginLeft: 8 },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#666",
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: "#999",
        marginTop: 8,
    },
});