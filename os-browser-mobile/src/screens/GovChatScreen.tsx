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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, KENTE, type ThemeColors } from '../constants/theme';
import {
  loginWithStaffId,
  redeemInviteCode,
  publicSignup,
  fetchRooms,
  fetchMessages,
  sendMessage,
  startSync,
  stopSync,
  type MatrixCredentials,
  type MatrixRoom,
  type MatrixMessage,
} from '../services/matrix-rest';
import { useNotificationStore } from '../store/notifications';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CREDS_KEY = '@govchat_credentials';

interface GovChatScreenProps {
  isDark: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GovChatScreen({ isDark }: GovChatScreenProps) {
  const insets = useSafeAreaInsets();
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;

  // Auth state
  const [credentials, setCredentials] = useState<MatrixCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [staffIdInput, setStaffIdInput] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'public'>('staff');
  const [publicName, setPublicName] = useState('');
  const [publicEmail, setPublicEmail] = useState('');

  // Chat state
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MatrixMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const scrollRef = useRef<ScrollView>(null);
  const stopSyncRef = useRef<(() => void) | null>(null);

  // ── Restore credentials on mount ────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CREDS_KEY).then((stored) => {
      if (stored) {
        try {
          const creds = JSON.parse(stored) as MatrixCredentials;
          setCredentials(creds);
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  // ── When credentials change, fetch rooms and start sync ─────────────
  useEffect(() => {
    if (!credentials) return;

    let mounted = true;

    const init = async () => {
      setConnectionStatus('connecting');
      try {
        const roomList = await fetchRooms(credentials);
        if (mounted) {
          setRooms(roomList);
          setConnectionStatus('connected');
        }
      } catch {
        if (mounted) setConnectionStatus('error');
      }
    };

    init();

    // Start sync
    const { incrementUnread, showToast } = useNotificationStore.getState();
    const stopFn = startSync(
      credentials,
      (msg) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.eventId === msg.eventId)) return prev;
          return [...prev, msg];
        });
        // Trigger in-app notification
        incrementUnread();
        showToast({
          title: msg.senderName,
          body: msg.body.length > 80 ? msg.body.slice(0, 80) + '...' : msg.body,
          type: 'message',
          roomId: msg.roomId,
          senderId: msg.senderId,
        });
      },
      () => {
        // Refresh rooms on new activity
        fetchRooms(credentials).then((r) => {
          if (mounted) setRooms(r);
        });
      },
    );
    stopSyncRef.current = stopFn;

    return () => {
      mounted = false;
      stopFn();
    };
  }, [credentials]);

  // ── Auto-scroll on new messages ─────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Auth handlers ───────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    const trimmed = staffIdInput.trim();
    if (!trimmed) return;
    setIsAuthenticating(true);
    setAuthError('');

    // Try login-by-staffId first
    let creds = await loginWithStaffId(trimmed, trimmed);

    // If that fails and they have an invite code, try redeem
    if (!creds && inviteCode.trim()) {
      creds = await redeemInviteCode(inviteCode.trim(), trimmed, trimmed);
    }

    if (creds) {
      setCredentials(creds);
      await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
      setAuthError('');
    } else {
      setAuthError(
        inviteCode.trim()
          ? 'Invalid invite code or staff ID. Please try again.'
          : 'Staff ID not found. If you\'re new, enter an invite code.',
      );
      setShowInviteCode(true);
    }
    setIsAuthenticating(false);
  }, [staffIdInput, inviteCode]);

  const handlePublicSignup = useCallback(async () => {
    if (!publicName.trim() || !publicEmail.trim()) return;
    setIsAuthenticating(true);
    setAuthError('');

    const creds = await publicSignup(publicName.trim(), publicEmail.trim());

    if (creds) {
      setCredentials(creds);
      await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
    } else {
      setAuthError('Signup failed. Check your email and try again.');
    }
    setIsAuthenticating(false);
  }, [publicName, publicEmail]);

  const handleSignOut = useCallback(async () => {
    stopSync();
    stopSyncRef.current?.();
    await AsyncStorage.removeItem(CREDS_KEY);
    setCredentials(null);
    setRooms([]);
    setMessages([]);
    setActiveRoomId(null);
    setStaffIdInput('');
    setInviteCode('');
    setShowInviteCode(false);
  }, []);

  // ── Room selection ──────────────────────────────────────────────────

  const handleSelectRoom = useCallback(async (roomId: string) => {
    if (!credentials) return;
    setActiveRoomId(roomId);
    setMessages([]);

    const msgs = await fetchMessages(credentials, roomId, 50);
    setMessages(msgs);
  }, [credentials]);

  const handleBackToRooms = useCallback(() => {
    setActiveRoomId(null);
    setMessages([]);
  }, []);

  // ── Send message ───────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !credentials || !activeRoomId || isSending) return;

    setIsSending(true);
    setInputText('');

    // Optimistic add
    const optimisticMsg: MatrixMessage = {
      eventId: `local_${Date.now()}`,
      roomId: activeRoomId,
      senderId: credentials.userId,
      senderName: credentials.staffId,
      type: 'text',
      body: trimmed,
      timestamp: Date.now(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const eventId = await sendMessage(credentials, activeRoomId, trimmed);
    setMessages((prev) =>
      prev.map((m) =>
        m.eventId === optimisticMsg.eventId
          ? { ...m, eventId: eventId || m.eventId, status: eventId ? 'sent' : 'failed' }
          : m,
      ),
    );
    setIsSending(false);
  }, [inputText, credentials, activeRoomId, isSending]);

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // ── Login screen ───────────────────────────────────────────────────
  if (!credentials) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={[styles.center, { paddingTop: insets.top + 24, paddingHorizontal: 32, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.loginIconCircle, { backgroundColor: theme.accent + '1A' }]}>
            <Ionicons name="chatbubbles" size={48} color={theme.accent} />
          </View>
          <Text style={[styles.loginTitle, { color: theme.text }]}>GovChat</Text>
          <Text style={[styles.loginSubtitle, { color: theme.textMuted }]}>
            Secure messaging powered by{'\n'}Matrix encryption
          </Text>

          {/* Staff / Public toggle */}
          <View style={[styles.modeToggle, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.modeBtn, loginMode === 'staff' && { backgroundColor: theme.accent }]}
              onPress={() => { setLoginMode('staff'); setAuthError(''); }}
              activeOpacity={0.7}
            >
              <Ionicons name="briefcase" size={14} color={loginMode === 'staff' ? '#fff' : theme.textMuted} />
              <Text style={[styles.modeBtnText, { color: loginMode === 'staff' ? '#fff' : theme.textMuted }]}>Gov Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, loginMode === 'public' && { backgroundColor: '#006B3F' }]}
              onPress={() => { setLoginMode('public'); setAuthError(''); }}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={14} color={loginMode === 'public' ? '#fff' : theme.textMuted} />
              <Text style={[styles.modeBtnText, { color: loginMode === 'public' ? '#fff' : theme.textMuted }]}>Public</Text>
            </TouchableOpacity>
          </View>

          {loginMode === 'staff' ? (
            <>
              <TextInput
                style={[styles.loginInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter Staff ID"
                placeholderTextColor={theme.textMuted}
                value={staffIdInput}
                onChangeText={setStaffIdInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={showInviteCode ? 'next' : 'go'}
                onSubmitEditing={showInviteCode ? undefined : handleSignIn}
              />

              {showInviteCode && (
                <TextInput
                  style={[styles.loginInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                  placeholder="Invite Code (8 characters)"
                  placeholderTextColor={theme.textMuted}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                />
              )}

              {authError ? <Text style={styles.authError}>{authError}</Text> : null}

              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: theme.accent, opacity: isAuthenticating ? 0.6 : 1 }]}
                onPress={handleSignIn}
                activeOpacity={0.8}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.signInBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {!showInviteCode && (
                <TouchableOpacity onPress={() => setShowInviteCode(true)} style={{ marginTop: 16 }}>
                  <Text style={[styles.linkText, { color: theme.accent }]}>Have an invite code?</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TextInput
                style={[styles.loginInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                placeholder="Your Name"
                placeholderTextColor={theme.textMuted}
                value={publicName}
                onChangeText={setPublicName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.loginInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                placeholder="Email Address"
                placeholderTextColor={theme.textMuted}
                value={publicEmail}
                onChangeText={setPublicEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={handlePublicSignup}
              />

              {authError ? <Text style={styles.authError}>{authError}</Text> : null}

              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: '#006B3F', opacity: isAuthenticating ? 0.6 : 1 }]}
                onPress={handlePublicSignup}
                activeOpacity={0.8}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.signInBtnText}>Join GovChat</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.publicNote, { color: theme.textMuted }]}>
                Public users can message government staff{'\n'}and join public discussion rooms.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Room list ──────────────────────────────────────────────────────
  if (!activeRoomId) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface1, borderBottomColor: theme.border, paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="chatbubbles" size={24} color={theme.accent} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>GovChat</Text>
            {/* Connection dot */}
            <View style={[styles.connectionDot, {
              backgroundColor: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'connecting' ? KENTE.gold : '#EF4444',
            }]} />
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.staffBadge, { color: theme.textMuted }]}>{credentials.staffId}</Text>
            <TouchableOpacity onPress={handleSignOut} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Room list */}
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            {connectionStatus === 'connecting' ? (
              <>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 16 }]}>
                  Connecting to GovChat...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="chatbubbles-outline" size={56} color={theme.textMuted + '55'} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No conversations yet.{'\n'}Ask an admin to invite you to a room.
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.roomId}
            contentContainerStyle={{ paddingVertical: 4 }}
            renderItem={({ item: room }) => (
              <TouchableOpacity
                style={[styles.roomRow, { borderBottomColor: theme.border }]}
                onPress={() => handleSelectRoom(room.roomId)}
                activeOpacity={0.6}
              >
                <View style={[styles.roomAvatar, { backgroundColor: room.isDirect ? '#006B3F22' : KENTE.gold + '22' }]}>
                  <Ionicons
                    name={room.isDirect ? 'person' : 'people'}
                    size={20}
                    color={room.isDirect ? '#006B3F' : KENTE.gold}
                  />
                </View>
                <View style={styles.roomInfo}>
                  <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>{room.name}</Text>
                  {room.lastMessage ? (
                    <Text style={[styles.roomLastMsg, { color: theme.textMuted }]} numberOfLines={1}>
                      {room.lastMessage}
                    </Text>
                  ) : null}
                </View>
                {room.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: KENTE.gold }]}>
                    <Text style={styles.unreadText}>{room.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────
  const activeRoom = rooms.find((r) => r.roomId === activeRoomId);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Chat header */}
      <View style={[styles.header, { backgroundColor: theme.surface1, borderBottomColor: theme.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBackToRooms} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {activeRoom?.name || 'Chat'}
          </Text>
          <Text style={[styles.headerSubtext, { color: theme.textMuted }]}>
            {activeRoom?.members.length || 0} members
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No messages yet</Text>
          </View>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === credentials.userId;
          return (
            <View key={msg.eventId} style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
              {!isMe && (
                <View style={[styles.senderAvatar, { backgroundColor: KENTE.gold + '1A' }]}>
                  <Text style={[styles.senderInitial, { color: KENTE.gold }]}>
                    {msg.senderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                {!isMe && (
                  <Text style={[styles.senderLabel, { color: theme.textMuted }]}>{msg.senderName}</Text>
                )}
                <View style={[
                  styles.bubble,
                  isMe
                    ? [styles.bubbleUser, { backgroundColor: theme.accent }]
                    : [styles.bubbleOther, { backgroundColor: theme.surface2 }],
                ]}>
                  <Text style={[styles.bubbleText, { color: isMe ? '#fff' : theme.text }]}>{msg.body}</Text>
                </View>
                {msg.status === 'failed' && (
                  <Text style={styles.failedLabel}>Failed to send</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.surface1, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={[styles.chatInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: isSending ? theme.textMuted : theme.accent }]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Login */
  loginIconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  loginTitle: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
  loginSubtitle: { fontSize: 18, textAlign: 'center', marginBottom: 32, lineHeight: 25 },
  loginInput: { width: '100%', height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 19, marginBottom: 12 },
  signInBtn: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  signInBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  authError: { color: '#EF4444', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  linkText: { fontSize: 17, fontWeight: '600' },
  publicNote: { fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 21 },
  modeToggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, marginBottom: 20, width: '100%' },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  modeBtnText: { fontSize: 16, fontWeight: '600' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 21, fontWeight: '700' },
  headerSubtext: { fontSize: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffBadge: { fontSize: 16, fontWeight: '500' },
  signOutBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },

  /* Room list */
  roomRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  roomAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  roomInfo: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 18, fontWeight: '600', marginBottom: 2 },
  roomLastMsg: { fontSize: 15 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Empty */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, marginTop: 12, textAlign: 'center', lineHeight: 25 },

  /* Messages */
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  senderInitial: { fontSize: 15, fontWeight: '700' },
  senderLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 18, lineHeight: 24 },
  failedLabel: { fontSize: 13, color: '#EF4444', marginTop: 2, marginLeft: 4 },

  /* Input bar */
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 18 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
