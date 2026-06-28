import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type DisplayMessage = {
    id: string;
    text?: string;
    image?: string;
    sender: string;
    time: string;
    status: string;
    senderName: string;
};

type Props = {
    item: DisplayMessage;
    imageSizes: {
        [key: string]: {
            width: number;
            height: number;
        };
    };
    onImageLoad: (
        id: string,
        width: number,
        height: number
    ) => void;
    onImagePress: (uri: string) => void;
};

export const MessageBubble = ({
    item,
    imageSizes,
    onImageLoad,
    onImagePress,
}: Props) => {

    const isMe = item.sender === "me";

    const preservedText = item.text
        ? item.text.replace(/ /g, "\u00A0")
        : "";

    return (
        <View
            style={[
                styles.messageWrapper,
                isMe
                    ? styles.myMessageWrapper
                    : styles.otherMessageWrapper,
            ]}
        >
            <View
                style={[
                    styles.messageBubble,
                    isMe
                        ? styles.myMessage
                        : styles.otherMessage,
                ]}
            >
                {item.image ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => onImagePress(item.image!)}
                    >
                        <Image
                            source={{ uri: item.image }}
                            style={[
                                styles.messageImage,
                                {
                                    width:
                                        imageSizes[item.id]?.width || 200,
                                    height:
                                        imageSizes[item.id]?.height || 200,
                                },
                            ]}
                            resizeMode="contain"
                            onLoad={(e) => {
                                const { width, height } =
                                    e.nativeEvent.source;

                                onImageLoad(
                                    item.id,
                                    width,
                                    height
                                );
                            }}
                        />
                    </TouchableOpacity>
                ) : (
                    <Text
                        style={[
                            styles.messageText,
                            isMe
                                ? styles.myMessageText
                                : styles.otherMessageText,
                        ]}
                    >
                        {preservedText}
                    </Text>
                )}

                <View style={styles.messageInfo}>
                    <Text style={styles.messageTime}>
                        {item.time}
                    </Text>

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

const styles = StyleSheet.create({
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
        borderRadius: 12,
        marginBottom: 4,
        backgroundColor: "#f0f2f5",
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
});