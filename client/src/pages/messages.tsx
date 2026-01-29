import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import {
  Layout,
  Card,
  List,
  Input,
  Button,
  Typography,
  Space,
  Avatar,
  Empty,
  Spin,
  message as antMessage,
  Modal,
} from 'antd';
import { MessageOutlined, SendOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { PatientSidebar } from '../components/layout/PatientSidebar';
import { ReceptionistSidebar } from '../components/layout/ReceptionistSidebar';
import { TopHeader } from '../components/layout/TopHeader';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Content, Sider } = Layout;
const { Text } = Typography;

const SIDER_WIDTH = 80;
const PAGE_BACKGROUND = '#F3F4F6';

interface ConversationSummary {
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string | null;
  lastMessageId: number;
  lastBody: string;
  lastCreatedAt: string;
  lastIsFromMe: boolean;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  readAt: string | null;
  createdAt: string;
  isFromMe: boolean;
}

interface ConversationData {
  otherUser: { id: number; fullName: string; role: string } | null;
  messages: ChatMessage[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return { Authorization: `Bearer ${token}` };
}

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<number | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(userSearchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/messages/conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages/conversations', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load conversations');
      return res.json() as Promise<ConversationSummary[]>;
    },
    enabled: !!user,
  });

  const { data: conversationData, isLoading: threadLoading } = useQuery({
    queryKey: ['/api/messages/conversation', selectedOtherUserId],
    queryFn: async () => {
      if (!selectedOtherUserId) return null;
      const res = await fetch(`/api/messages/conversation/${selectedOtherUserId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load conversation');
      return res.json() as Promise<ConversationData>;
    },
    enabled: !!user && selectedOtherUserId !== null,
    refetchInterval: 5000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const res = await fetch(`/api/messages/conversation/${otherUserId}/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  useEffect(() => {
    if (selectedOtherUserId) {
      markReadMutation.mutate(selectedOtherUserId);
    }
  }, [selectedOtherUserId]);

  useEffect(() => {
    if (conversationData?.messages?.length) {
      scrollToBottom();
    }
  }, [conversationData?.messages?.length]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: number; body: string }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to send');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      setInputValue('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversation', variables.recipientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
    onError: (err: Error) => {
      antMessage.error(err.message || 'Failed to send message');
    },
  });

  const { data: searchUsers = [], isLoading: searchUsersLoading, error: searchError, refetch: refetchSearch } = useQuery({
    queryKey: ['/api/messages/users', debouncedSearchQuery, newConversationOpen],
    queryFn: async () => {
      const q = debouncedSearchQuery ? `?q=${encodeURIComponent(debouncedSearchQuery)}` : '';
      const res = await fetch(`/api/messages/users${q}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to search users');
      }
      return res.json() as Promise<{ id: number; fullName: string; mobileNumber: string; role: string }[]>;
    },
    enabled: !!user && newConversationOpen,
    staleTime: 0, // Always refetch when query changes
    retry: 1,
  });

  // Refetch when modal opens
  useEffect(() => {
    if (newConversationOpen && user) {
      refetchSearch();
    }
  }, [newConversationOpen, user, refetchSearch]);

  useEffect(() => {
    if (searchError) {
      console.error('Search users error:', searchError);
      antMessage.error('Failed to search users. Please try again.');
    }
  }, [searchError]);

  if (!authLoading && !user) {
    return <Redirect to="/login" />;
  }

  const handleSend = () => {
    const body = inputValue.trim();
    if (!body || !selectedOtherUserId) return;
    sendMessageMutation.mutate({ recipientId: selectedOtherUserId, body });
  };

  const openConversationWith = (otherUserId: number) => {
    setSelectedOtherUserId(otherUserId);
    setNewConversationOpen(false);
  };

  const role = user?.role?.toUpperCase() || '';
  const showPatientSidebar = role === 'PATIENT';
  const showReceptionistSidebar = role === 'RECEPTIONIST';
  const showSidebar = showPatientSidebar || showReceptionistSidebar;

  const headerUserId = useMemo(() => {
    if (!user?.id) return '—';
    const year = new Date().getFullYear();
    const idNum = String(user.id).padStart(3, '0');
    if (role === 'PATIENT') return `PAT-${year}-${idNum}`;
    if (role === 'RECEPTIONIST') return `REC-${year}-${idNum}`;
    return `${role.slice(0, 3)}-${year}-${idNum}`;
  }, [user?.id, role]);

  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'U';
  }, [user?.fullName]);

  return (
    <Layout className="messages-page-wrapper" style={{ minHeight: '100vh', width: '100%', background: PAGE_BACKGROUND }}>
      {showSidebar && (
        <Sider
          width={SIDER_WIDTH}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: SIDER_WIDTH,
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          {showPatientSidebar && <PatientSidebar selectedMenuKey="messages" />}
          {showReceptionistSidebar && <ReceptionistSidebar selectedMenuKey="messages" />}
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: showSidebar ? SIDER_WIDTH : 0,
          minHeight: '100vh',
          background: PAGE_BACKGROUND,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: showSidebar ? `calc(100% - ${SIDER_WIDTH}px)` : '100%',
        }}
      >
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole={user?.role?.replace('_', ' ') || 'User'}
          userId={headerUserId}
          userInitials={userInitials}
        />

        <Content
          style={{
            padding: '16px 24px 24px 20px',
            overflow: 'auto',
            background: PAGE_BACKGROUND,
            flex: 1,
            margin: 0,
            minHeight: 0,
          }}
        >
          <Card
            style={{ maxWidth: 1000, margin: '0 auto', borderRadius: 16, overflow: 'hidden' }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
              {/* In-card header: title + New conversation */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff',
                }}
              >
                <Space>
                  <MessageOutlined style={{ fontSize: 20, color: '#1A8FE3' }} />
                  <Text strong style={{ fontSize: 18 }}>Messages</Text>
                </Space>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => setNewConversationOpen(true)}>
                  New conversation
                </Button>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Conversation list */}
            <div
              style={{
                width: 320,
                borderRight: '1px solid #f0f0f0',
                overflowY: 'auto',
                background: '#fafafa',
              }}
            >
              {conversationsLoading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : conversations.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No conversations yet"
                  style={{ marginTop: 48 }}
                />
              ) : (
                <List
                  dataSource={conversations}
                  renderItem={(c) => (
                    <List.Item
                      key={c.otherUserId}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        background: selectedOtherUserId === c.otherUserId ? '#E3F2FF' : 'transparent',
                      }}
                      onClick={() => setSelectedOtherUserId(c.otherUserId)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: '#1A8FE3' }}>
                            {c.otherUserName.slice(0, 2).toUpperCase()}
                          </Avatar>
                        }
                        title={
                          <Space>
                            <Text strong>{c.otherUserName}</Text>
                            {c.unreadCount > 0 && (
                              <span style={{ background: '#EF4444', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 12 }}>
                                {c.unreadCount}
                              </span>
                            )}
                          </Space>
                        }
                        description={
                          <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                            {c.lastIsFromMe ? 'You: ' : ''}{c.lastBody}
                          </Text>
                        }
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(c.lastCreatedAt).fromNow()}
                      </Text>
                    </List.Item>
                  )}
                />
              )}
            </div>

            {/* Thread */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff' }}>
              {!selectedOtherUserId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description="Select a conversation or start a new one" />
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text strong>{conversationData?.otherUser?.fullName ?? 'Loading…'}</Text>
                    {conversationData?.otherUser?.role && (
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {conversationData.otherUser.role}
                      </Text>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {threadLoading ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin />
                      </div>
                    ) : (
                      conversationData?.messages?.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: m.isFromMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            padding: '8px 12px',
                            borderRadius: 12,
                            background: m.isFromMe ? '#1A8FE3' : '#f0f0f0',
                            color: m.isFromMe ? '#fff' : '#000',
                          }}
                        >
                          <Text style={{ color: m.isFromMe ? '#fff' : undefined }}>{m.body}</Text>
                          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>
                            {dayjs(m.createdAt).format('HH:mm')}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Type a message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={sendMessageMutation.isPending}
                        onClick={handleSend}
                      >
                        Send
                      </Button>
                    </Space.Compact>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* New conversation: pick user */}
      <Modal
        title="New conversation"
        open={newConversationOpen}
        onCancel={() => {
          setNewConversationOpen(false);
          setUserSearchQuery('');
          setDebouncedSearchQuery('');
        }}
        footer={null}
        width={400}
      >
        <Input
          placeholder="Search by name or mobile..."
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          style={{ marginBottom: 16 }}
          allowClear
        />
        {searchUsersLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : searchError ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#EF4444' }}>
            Failed to load users. Please try again.
          </div>
        ) : searchUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#8C8C8C' }}>
            {debouncedSearchQuery ? 'No users found' : 'Start typing to search for users'}
          </div>
        ) : (
          <List
            dataSource={searchUsers}
            renderItem={(u) => (
              <List.Item
                key={u.id}
                style={{ cursor: 'pointer' }}
                onClick={() => openConversationWith(u.id)}
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ backgroundColor: '#1A8FE3' }}>{u.fullName.slice(0, 2).toUpperCase()}</Avatar>}
                  title={u.fullName}
                  description={`${u.mobileNumber} · ${u.role}`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
