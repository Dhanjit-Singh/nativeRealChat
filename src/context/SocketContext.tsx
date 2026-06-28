// socketContext.tsx - Optimized version
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
} from "react";
import io, { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SocketContext = createContext<any>(null);

export const SocketProvider = ({ children }: any) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        initializeSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const initializeSocket = async () => {
        try {
            const userData = await AsyncStorage.getItem("user");
            if (!userData) return;

            const user = JSON.parse(userData);
            const userId = user.id || user._id;
            setCurrentUserId(userId);

            // CRITICAL: Use ONLY WebSocket transport for instant messaging
            const socketInstance = io(
                "https://real-chat-backend-c3nm.onrender.com",
                {
                    transports: ["websocket"], // ONLY WebSocket, no polling
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    timeout: 10000,
                    // Add these for better performance
                    forceNew: true,
                    upgrade: false, // Don't upgrade from polling
                    rememberUpgrade: true,
                }
            );

            socketInstance.on("connect", () => {
                console.log("✅ Socket Connected (WebSocket only)");
                setIsConnected(true);
                socketInstance.emit("userOnline", userId);

                // Re-join previous chat rooms if any
                // You might want to store active chat IDs
            });

            socketInstance.on("connect_error", (error) => {
                console.log("❌ Socket connection error:", error);
                setIsConnected(false);
            });

            socketInstance.on("onlineUsers", (users: string[]) => {
                console.log("📱 Online Users:", users);
                setOnlineUsers(users);
            });

            socketInstance.on("disconnect", (reason) => {
                console.log("❌ Socket Disconnected:", reason);
                setIsConnected(false);
            });

            // Add ping/pong for latency monitoring
            socketInstance.on("pong", (latency: number) => {
                // Optional: track latency
                // console.log(`🏓 Socket latency: ${latency}ms`);
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);
        } catch (err) {
            console.log("Socket Error:", err);
        }
    };

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                onlineUsers,
                currentUserId,
                isConnected,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within SocketProvider");
    }
    return context;
};