import { View, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Image, Modal, Alert, ScrollView, RefreshControl } from "react-native";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoading } from "@/context/LoadingContext";
import io from 'socket.io-client';
import CallScreen from "@/components/CallScreen";
import InCallManager from "react-native-incall-manager";
import { Audio } from 'expo-av';

// Create socket instance
let socket: any;

type Message = {
    _id: string;
    text?: string;
    image?: string;
    imageUrl?: string;
    sender: {
        _id: string;
        email: string;
        name: string;
    };
    createdAt: string;
    messageType: string;
    readBy?: string[];
};

type DisplayMessage = {
    id: string;
    text?: string;
    image?: string;
    sender: string;
    time: string;
    status: string;
    senderName: string;
};

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [message, setMessage] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [showMediaOptions, setShowMediaOptions] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const flatListRef = useRef<FlatList<DisplayMessage> | null>(null);
    const { showLoader, hideLoader } = useLoading();

    const [callVisible, setCallVisible] = useState(false);
    const [callType, setCallType] = useState(null);
    const [isInitiator, setIsInitiator] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callConnecting, setCallConnecting] = useState(false);

    const { chatId, userName, userAvatar, userEmail, userPhone, userStatus, isOnline, lastSeen } = params;

    // Initialize socket connection (matching React app logic)
    const initializeSocket = useCallback(() => {
        if (socket && socket.connected) {
            console.log("Socket already connected");
            return socket;
        }

        console.log("Initializing socket connection...");
        socket = io('https://real-chat-backend-c3nm.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully');
            setIsConnected(true);

            // Join chat room after connection (matching React app)
            if (chatId) {
                socket.emit('joinChat', chatId);
                console.log('Joined chat room:', chatId);
            }
        });

        socket.on('connect_error', (error: any) => {
            console.log('❌ Socket connection error:', error);
            setIsConnected(false);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        return socket;
    }, [chatId]);


    useEffect(() => {
        if (!socket) return;

        // Listen for incoming calls (matching React app)
        const handleIncomingCall = ({ from, fromName, callType: incomingType }) => {
            console.log('📞 Incoming call from:', fromName);
            setIncomingCall({
                from,
                fromName,
                callType: incomingType
            });
        };

        // Listen for call acceptance
        const handleCallAccepted = ({ from }) => {
            console.log('Call accepted by:', from);
            setCallConnecting(false);
            // Don't show alert, just update state
        };

        // Listen for call rejection
        const handleCallRejected = () => {
            console.log('Call rejected');
            setCallConnecting(false);
            Alert.alert('Call Rejected', 'The user declined your call');
        };

        // Listen for call ended by other user
        const handleCallEnded = () => {
            console.log('Call ended by other user');
            endCall(false);
            Alert.alert('Call Ended', 'The call has ended');
        };

        socket.on('incoming-call', handleIncomingCall);
        socket.on('call-accepted', handleCallAccepted);
        socket.on('call-rejected', handleCallRejected);
        socket.on('call-ended', handleCallEnded);

        return () => {
            socket.off('incoming-call', handleIncomingCall);
            socket.off('call-accepted', handleCallAccepted);
            socket.off('call-rejected', handleCallRejected);
            socket.off('call-ended', handleCallEnded);
        };
    }, [socket]);

    // Get current user from storage
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const userString = await AsyncStorage.getItem('user');
                if (userString) {
                    const user = JSON.parse(userString);
                    setCurrentUser(user);
                    if (user && user.id) {
                        setCurrentUserId(user.id);
                        console.log("Current user ID set to:", user.id);
                    }
                }
            } catch (error) {
                console.error("Error getting user:", error);
            }
        };
        getCurrentUser();
    }, []);

    // Initialize socket when user is loaded (matching React app)
    useEffect(() => {
        if (currentUserId) {
            initializeSocket();
        }

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('connect_error');
                socket.off('disconnect');
                socket.off('receiveMessage');
                socket.off('receiveImage');
            }
        };
    }, [currentUserId, initializeSocket]);

    // Socket event listeners (matching React app)
    useEffect(() => {
        if (!socket) return;

        // Listen for new messages (matching React app)
        const handleReceiveMessage = (msg: any) => {
            console.log('📨 Received message:', msg);

            // Check if message is for current chat
            if (msg.chatId !== chatId) return;

            setMessages((prev) => {
                const exists = prev.some((m) => m.id === msg._id);
                if (exists) return prev;

                const isMe = msg.senderId === currentUserId;
                const newMessage: DisplayMessage = {
                    id: msg._id || Date.now().toString(),
                    text: msg.text,
                    image: msg.imageUrl,
                    sender: isMe ? "me" : "other",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: "delivered",
                    senderName: isMe ? "Me" : (userName as string) || "User"
                };
                return [...prev, newMessage];
            });

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        };

        // Listen for image messages
        const handleReceiveImage = (imageMsg: any) => {
            console.log('📸 Received image:', imageMsg);

            if (imageMsg.chatId !== chatId) return;

            setMessages((prev) => {
                const exists = prev.some((m) => m.id === imageMsg._id);
                if (exists) return prev;

                const isMe = imageMsg.senderId === currentUserId;
                const newMessage: DisplayMessage = {
                    id: imageMsg._id || Date.now().toString(),
                    image: imageMsg.imageUrl,
                    sender: isMe ? "me" : "other",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: "delivered",
                    senderName: isMe ? "Me" : (userName as string) || "User"
                };
                return [...prev, newMessage];
            });

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('receiveImage', handleReceiveImage);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('receiveImage', handleReceiveImage);
        };
    }, [chatId, currentUserId, userName]);

    // Join chat room when chatId changes and socket is connected (matching React app)
    useEffect(() => {
        if (chatId && isConnected && socket) {
            socket.emit('joinChat', chatId);
            console.log('📢 Joined chat room:', chatId);
        }
    }, [chatId, isConnected]);

    // Fetch initial messages (matching React app)
    const fetchChat = useCallback(async (showLoadingIndicator = false) => {
        if (!chatId || !currentUserId) return;

        if (showLoadingIndicator) {
            showLoader("Loading messages...");
        }

        try {
            const response = await axios.get(`https://real-chat-backend-c3nm.onrender.com/api/messages/${chatId}`);
            console.log("📚 Fetched messages count:", response.data.length);

            const transformedMessages: DisplayMessage[] = response.data.map((msg: Message) => {
                const isMe = msg.sender._id === currentUserId;

                return {
                    id: msg._id,
                    text: msg.text,
                    image: msg.imageUrl,
                    sender: isMe ? "me" : "other",
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: msg.readBy?.includes(currentUserId) ? "read" : "delivered",
                    senderName: msg.sender.name
                };
            });

            setMessages(transformedMessages);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error: any) {
            console.error("❌ Error fetching messages:", error.response?.data?.message || error.message);
            if (showLoadingIndicator) {
                Alert.alert("Error", "Failed to load messages");
            }
        } finally {
            if (showLoadingIndicator) {
                hideLoader();
            }
        }
    }, [chatId, currentUserId, showLoader, hideLoader]);

    // Send message using ONLY socket.io (matching React app logic)
    const sendMessage = () => {
        if (!message.trim()) return;
        if (!socket || !socket.connected) {
            Alert.alert("Error", "Not connected to server");
            return;
        }

        // console.log("Sending message via socket:", {
        //     chatId: chatId,
        //     senderId: currentUserId,
        //     text: message,
        // });

        const tempId = `temp-${Date.now()}`;
        const newMessage: DisplayMessage = {
            id: tempId,
            text: message,
            sender: "me",
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
            status: "sending",
            senderName: "Me",
        };
        setMessages((prev) => [...prev, newMessage]);
        const messageText = message;
        setMessage("");
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Emit via socket exactly like React app
        socket.emit("sendMessage", {
            chatId: chatId,
            senderId: currentUserId,
            text: message,
        });

        // Clear input
        // setMessage("");

        // Auto-scroll will happen when we receive the message back via socket
    };

    // Initial load (matching React app)
    useEffect(() => {
        if (!chatId || !currentUserId) return;

        fetchChat(true);

        // No polling needed since socket provides real-time updates
        // But keep a longer interval as fallback
        const interval = setInterval(() => {
            fetchChat(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [chatId, currentUserId, fetchChat]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchChat(true);
        setRefreshing(false);
    }, [fetchChat]);

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            showLoader("Uploading image...");

            const formData = new FormData();
            formData.append('image', {
                uri: result.assets[0].uri,
                type: 'image/jpeg',
                name: 'photo.jpg',
            } as any);
            formData.append('chatId', chatId as string);
            formData.append('senderId', currentUserId);

            try {
                const response = await axios.post(`https://real-chat-backend-c3nm.onrender.com/api/messages/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                // Emit via socket for real-time
                if (socket && socket.connected) {
                    socket.emit("sendImage", {
                        chatId: chatId,
                        senderId: currentUserId,
                        imageUrl: response.data.imageUrl,
                        imageName: response.data.imageName,
                        imageSize: response.data.imageSize,
                        messageId: response.data._id
                    });
                }

                await fetchChat(false);
                Alert.alert("Success", "Image sent successfully");
            } catch (error) {
                console.error("Error uploading image:", error);
                Alert.alert("Error", "Failed to upload image");
            } finally {
                hideLoader();
                setShowMediaOptions(false);
            }
        }
    };

    const handleCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            showLoader("Uploading image...");

            const formData = new FormData();
            formData.append('image', {
                uri: result.assets[0].uri,
                type: 'image/jpeg',
                name: 'photo.jpg',
            } as any);
            formData.append('chatId', chatId as string);
            formData.append('senderId', currentUserId);

            try {
                const response = await axios.post(`https://real-chat-backend-c3nm.onrender.com/api/messages/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (socket && socket.connected) {
                    socket.emit("sendImage", {
                        chatId: chatId,
                        senderId: currentUserId,
                        imageUrl: response.data.imageUrl,
                        imageName: response.data.imageName,
                        imageSize: response.data.imageSize,
                        messageId: response.data._id
                    });
                }

                await fetchChat(false);
                Alert.alert("Success", "Image sent successfully");
            } catch (error) {
                console.error("Error uploading image:", error);
                Alert.alert("Error", "Failed to upload image");
            } finally {
                hideLoader();
                setShowMediaOptions(false);
            }
        }
    };

    const handleCall = () => {
        // Alert.alert(
        //     "Call Feature",
        //     "Video/Audio calling is coming soon!",
        //     [{ text: "OK" }]
        // );

        startCall('audio');
    };

    const handleVideoCall = () => {
        // Alert.alert(
        //     "Video Call Feature",
        //     "Video calling is coming soon!",
        //     [{ text: "OK" }]
        // );

        startCall('video');
    };

    const startCall = async (type) => {
        if (callConnecting || callVisible) {
            return;
        }

        setCallConnecting(true);

        try {
            // Request microphone permission using expo-av
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

            let cameraStatus = { status: 'granted' };
            if (type === 'video') {
                // Request camera permission only for video calls
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                cameraStatus = cameraPermission;
            }

            if (type === 'video' && cameraStatus.status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required for video calls');
                setCallConnecting(false);
                return;
            }

            if (audioStatus !== 'granted') {
                Alert.alert('Permission needed', 'Microphone permission is required for calls');
                setCallConnecting(false);
                return;
            }

            // Set audio mode for calls
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Start InCallManager
            InCallManager.start({ media: type === 'video' ? 'video' : 'audio' });

            // Emit call initiation
            socket.emit('initiate-call', {
                to: chatId,
                from: currentUserId,
                fromName: currentUser?.name,
                chatId: chatId,
                callType: type
            });

            // Show the call screen
            setCallType(type);
            setIsInitiator(true);
            setCallVisible(true);
            setCallConnecting(false);
        } catch (error) {
            console.error('Error starting call:', error);
            Alert.alert('Error', 'Failed to start call');
            setCallConnecting(false);
            InCallManager.stop();
        }
    };

    const acceptCall = () => {
        setCallType(incomingCall.callType);
        setIsInitiator(false);
        setCallVisible(true);
        setIncomingCall(null);

        // Emit call acceptance
        socket.emit('accept-call', {
            to: incomingCall.from,
            from: currentUserId,
            chatId: chatId
        });
    };

    const rejectCall = () => {
        socket.emit('reject-call', {
            to: incomingCall.from,
            from: currentUserId,
            chatId: chatId
        });
        setIncomingCall(null);
        InCallManager.stop();
    };

    const endCall = (emitToOther = true) => {
        setCallVisible(false);
        setCallType(null);
        setIsInitiator(false);
        setCallConnecting(false);
        InCallManager.stop();

        if (emitToOther && socket) {
            socket.emit('end-call', {
                to: chatId,
                from: currentUserId,
                chatId: chatId
            });
        }
    };

    // Add Incoming Call Modal component
    const IncomingCallModal = () => (
        <Modal
            visible={!!incomingCall && !callVisible}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.incomingCallOverlay}>
                <View style={styles.incomingCallCard}>
                    <View style={styles.incomingCallAvatar}>
                        <Text style={styles.incomingCallAvatarText}>
                            {incomingCall?.fromName?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.incomingCallName}>{incomingCall?.fromName}</Text>
                    <Text style={styles.incomingCallType}>
                        {incomingCall?.callType === 'video' ? 'Video Call' : 'Audio Call'}
                    </Text>

                    <View style={styles.incomingCallActions}>
                        <TouchableOpacity
                            style={[styles.incomingCallButton, styles.rejectButton]}
                            onPress={rejectCall}
                        >
                            <Ionicons name="call" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.incomingCallButton, styles.acceptButton]}
                            onPress={acceptCall}
                        >
                            <Ionicons name="call" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const additionalStyles = {
        incomingCallOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        incomingCallCard: {
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            width: '80%',
        },
        incomingCallAvatar: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#075e54',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        incomingCallAvatarText: {
            fontSize: 32,
            color: '#fff',
            fontWeight: 'bold',
        },
        incomingCallName: {
            fontSize: 20,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 8,
        },
        incomingCallType: {
            fontSize: 14,
            color: '#6b7280',
            marginBottom: 24,
        },
        incomingCallActions: {
            flexDirection: 'row',
            gap: 20,
        },
        incomingCallButton: {
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
        },
        acceptButton: {
            backgroundColor: '#22c55e',
        },
        rejectButton: {
            backgroundColor: '#ef4444',
            transform: [{ rotate: '135deg' }],
        },
    };

    const renderMessage = ({ item }: { item: DisplayMessage }) => {
        const isMe = item.sender === "me";

        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.messageImage} />
                    ) : (
                        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                            {item.text}
                        </Text>
                    )}
                    <View style={styles.messageInfo}>
                        <Text style={styles.messageTime}>{item.time}</Text>
                        {isMe && (
                            <Ionicons
                                name="checkmark-done"
                                size={14}
                                color="#34b7f1"
                                style={styles.messageStatus}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const ChatOptionsModal = () => (
        <Modal
            visible={showOptions}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowOptions(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Chat Options</Text>
                        <TouchableOpacity onPress={() => setShowOptions(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="person-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Contact Info</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="notifications-off-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Mute Notifications</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="search-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Search Messages</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="color-palette-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Wallpaper</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="star-outline" size={24} color="#075e54" />
                            <Text style={styles.modalOptionText}>Starred Messages</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="trash-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Clear Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="ban-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Block User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption}>
                            <Ionicons name="flag-outline" size={24} color="#dc2626" />
                            <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Report</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const MediaOptionsModal = () => (
        <Modal
            visible={showMediaOptions}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowMediaOptions(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMediaOptions(false)}>
                <View style={styles.mediaModalContent}>
                    <View style={styles.mediaModalHeader}>
                        <Text style={styles.modalTitle}>Add Media</Text>
                    </View>

                    <View style={styles.mediaOptions}>
                        <TouchableOpacity style={styles.mediaOption} onPress={handleCamera}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#075e54" }]}>
                                <Ionicons name="camera" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOption} onPress={handleImagePick}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#128c7e" }]}>
                                <Ionicons name="images" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOption} onPress={() => setShowMediaOptions(false)}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#dc2626" }]}>
                                <Ionicons name="document" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Document</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOption} onPress={() => setShowMediaOptions(false)}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#34b7f1" }]}>
                                <Ionicons name="location" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Location</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOption} onPress={() => setShowMediaOptions(false)}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#f39c12" }]}>
                                <Ionicons name="mic" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Audio</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOption} onPress={() => setShowMediaOptions(false)}>
                            <View style={[styles.mediaIconBg, { backgroundColor: "#e74c3c" }]}>
                                <Ionicons name="videocam" size={28} color="#fff" />
                            </View>
                            <Text style={styles.mediaOptionText}>Video</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: () => (
                        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowOptions(true)}>
                            <View style={styles.headerAvatar}>
                                <Text style={styles.headerAvatarText}>{userName?.charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={styles.headerName}>{userName}</Text>
                                <Text style={styles.headerStatus}>
                                    {isOnline === "true" ? "Online" : (userStatus || "Offline")}
                                    {!isConnected && " • Connecting..."}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ),
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                            <Ionicons name="arrow-back" size={24} color="#075e54" />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={handleCall} style={styles.headerIcon}>
                                <Ionicons name="call-outline" size={22} color="#075e54" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleVideoCall} style={styles.headerIcon}>
                                <Ionicons name="videocam-outline" size={22} color="#075e54" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.headerIcon}>
                                <Ionicons name="ellipsis-vertical" size={22} color="#075e54" />
                            </TouchableOpacity>
                        </View>
                    ),
                    headerStyle: { backgroundColor: "#f0f2f5" },
                    headerShadowVisible: false,
                }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={90}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.container}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.messagesContainer}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
                                    <Text style={styles.emptyText}>No messages yet</Text>
                                    <Text style={styles.emptySubText}>Start a conversation!</Text>
                                </View>
                            )}
                        />

                        <View style={styles.inputContainer}>
                            <TouchableOpacity style={styles.attachButton} onPress={() => setShowMediaOptions(true)}>
                                <Ionicons name="add-circle" size={28} color="#075e54" />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                placeholder="Type a message..."
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                maxLength={1000}
                            />

                            {message.trim() ? (
                                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                                    <Ionicons name="send" size={24} color="#075e54" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.micButton}>
                                    <Ionicons name="mic" size={24} color="#075e54" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            <ChatOptionsModal />
            <MediaOptionsModal />
            <IncomingCallModal />

            <CallScreen
                visible={callVisible}
                callType={callType}
                isInitiator={isInitiator}
                remoteUserId={chatId}
                remoteUserName={userName}
                socket={socket}
                currentUserId={currentUserId}
                onEndCall={() => endCall(true)}
                onCallEnded={() => {
                    setCallVisible(false);
                    setIncomingCall(null);
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f2f5",
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
    },
    headerBack: {
        marginLeft: 8,
    },
    headerRight: {
        flexDirection: "row",
        marginRight: 8,
    },
    headerIcon: {
        marginLeft: 16,
    },
    messagesContainer: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexGrow: 1,
    },
    messageWrapper: {
        marginBottom: 12,
    },
    myMessageWrapper: {
        alignItems: "flex-end",
    },
    otherMessageWrapper: {
        alignItems: "flex-start",
    },
    messageBubble: {
        maxWidth: "75%",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
    },
    myMessage: {
        backgroundColor: "#dcf8c5",
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: "#ffffff",
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: "#1f2937",
    },
    otherMessageText: {
        color: "#1f2937",
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 4,
    },
    messageInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 2,
    },
    messageTime: {
        fontSize: 10,
        color: "#8696a0",
        marginRight: 4,
    },
    messageStatus: {
        marginLeft: 2,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        marginBottom: 12,
    },
    attachButton: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f2f5",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        marginLeft: 8,
    },
    micButton: {
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    modalOptionText: {
        fontSize: 16,
        marginLeft: 12,
        color: "#374151",
    },
    mediaModalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    mediaModalHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    mediaOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
    },
    mediaOption: {
        alignItems: "center",
        width: "30%",
        marginBottom: 20,
    },
    mediaIconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    mediaOptionText: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
    },
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