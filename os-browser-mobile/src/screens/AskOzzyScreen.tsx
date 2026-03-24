import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, type ThemeColors } from '../constants/theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AskOzzyScreenProps {
  isDark: boolean;
}

const API_URL = 'https://os-browser-worker.ghwmelite.workers.dev/api/ai/chat';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AskOzzyScreen({ isDark }: AskOzzyScreenProps) {
  const insets = useSafeAreaInsets();
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 || isThinking) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isThinking]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isThinking) return;

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsThinking(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText =
        data?.response ?? data?.message ?? data?.reply ?? 'I received your message but couldn\'t generate a response.';

      const assistantMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: assistantText,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        text: 'Unable to connect. Please check your internet connection and try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, isThinking, messages]);

  /* ---- Empty state ---- */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accent + '1A' }]}>
        <Ionicons name="sparkles" size={48} color={theme.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Hi! I'm Ozzy</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        Your AI assistant. Ask me anything{'\n'}and I'll do my best to help.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface1,
            borderBottomColor: theme.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Ionicons name="sparkles" size={24} color={theme.accent} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>AskOzzy</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isThinking && renderEmptyState()}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
              ]}
            >
              {!isUser && (
                <View style={[styles.avatarCircle, { backgroundColor: theme.accent + '1A' }]}>
                  <Ionicons name="sparkles" size={14} color={theme.accent} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.bubbleUser, { backgroundColor: theme.accent }]
                    : [styles.bubbleOther, { backgroundColor: theme.surface2 }],
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: isUser ? '#FFFFFF' : theme.text },
                  ]}
                  selectable
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Thinking indicator */}
        {isThinking && (
          <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.accent + '1A' }]}>
              <Ionicons name="sparkles" size={14} color={theme.accent} />
            </View>
            <View style={[styles.bubble, styles.bubbleOther, { backgroundColor: theme.surface2 }]}>
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={[styles.thinkingText, { color: theme.textMuted }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.surface1,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TextInput
          style={[
            styles.chatInput,
            {
              backgroundColor: theme.surface2,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Ask Ozzy anything..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
          editable={!isThinking}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: isThinking ? theme.textMuted : theme.accent },
          ]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!inputText.trim() || isThinking}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },

  /* Empty state */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 18, textAlign: 'center', lineHeight: 25, paddingHorizontal: 32 },

  /* Messages */
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },

  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },

  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 18, lineHeight: 24 },

  /* Thinking */
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 17 },

  /* Input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
