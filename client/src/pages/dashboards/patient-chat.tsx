import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Drawer, message, Input, Button, Typography, Spin, Alert } from 'antd';
import { RobotOutlined, SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Redirect } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { FIGMA_PATIENT, FIGMA_COLORS } from '../../design-tokens';

const { Content, Sider } = Layout;
const { Text } = Typography;

const DISCLAIMER =
  'Answers are based on your records in NexaCare only. For medical decisions, always confirm with your doctor or pharmacist.';

const fetchWithAuth = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const token = localStorage.getItem('auth-token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

type ChatMessage = { id?: number; role: 'user' | 'assistant'; content: string; createdAt?: string };

export default function PatientChatPage() {
  const { user, isLoading } = useAuth();
  const { isMobile } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (!user) return;
    fetchWithAuth<{ messages: { id: number; role: string; content: string; createdAt: string }[] }>(
      '/api/ai/patient-chat/history'
    )
      .then((data) => {
        setMessages(
          (data.messages || []).map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
      })
      .catch(() => message.error('Could not load chat history'))
      .finally(() => setHistoryLoaded(true));
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const data = await fetchWithAuth<{ reply: string }>('/api/ai/patient-chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      message.error(e?.message || 'Could not send message. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user && user.role?.toUpperCase() !== 'PATIENT') {
    message.warning('You do not have access to this page');
    return <Redirect to="/dashboard/patient" />;
  }

  const siderWidth = isMobile ? 0 : 80;

  return (
    <Layout style={{ minHeight: '100vh', background: FIGMA_PATIENT.pageBg }}>
      {!isMobile && (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            borderRight: `1px solid ${FIGMA_COLORS.border}`,
          }}
        >
          <PatientSidebar selectedMenuKey="chat" />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <PatientSidebar selectedMenuKey="chat" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout style={{ marginLeft: siderWidth }}>
        <TopHeader
          title="Health Assistant"
          subtitle="Ask about your appointments, prescriptions, and lab reports"
          onMenuClick={() => setMobileDrawerOpen(true)}
          showMenuButton={isMobile}
        />
        <Content
          style={{
            padding: isMobile ? 16 : 24,
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Card
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: FIGMA_PATIENT.cardRadius,
              boxShadow: FIGMA_PATIENT.cardShadow,
            }}
            bodyStyle={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <Alert
              type="info"
              message={DISCLAIMER}
              showIcon
              style={{ margin: 16, marginBottom: 0 }}
            />
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {!historyLoaded ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Spin tip="Loading conversation..." />
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: FIGMA_COLORS.textSecondary,
                    padding: 32,
                  }}
                >
                  <RobotOutlined style={{ fontSize: 48, marginBottom: 16, color: FIGMA_PATIENT.sidebarActiveBg }} />
                  <p>Ask me about your health records.</p>
                  <p style={{ fontSize: 13 }}>
                    e.g. &quot;What do my blood test results mean?&quot; or &quot;When should I take my Metformin?&quot;
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={m.id ?? i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: m.role === 'user' ? FIGMA_PATIENT.sidebarActiveBg : '#f0f4f8',
                      color: m.role === 'user' ? '#fff' : '#262626',
                    }}
                  >
                    {m.role === 'assistant' ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <Text style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}>{m.content}</Text>
                    )}
                  </div>
                ))
              )}
              {sending && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#f0f4f8', borderRadius: 12 }}>
                  <Spin size="small" /> <Text type="secondary">Thinking...</Text>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: 16, borderTop: `1px solid ${FIGMA_COLORS.border}` }}>
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your question..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={sending}
                style={{ marginBottom: 8 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                disabled={!input.trim()}
                style={{ background: FIGMA_PATIENT.sidebarActiveBg, borderColor: FIGMA_PATIENT.sidebarActiveBg }}
              >
                Send
              </Button>
            </div>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
