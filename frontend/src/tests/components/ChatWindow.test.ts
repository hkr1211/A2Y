import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import ChatWindow from '@/components/ChatWindow.vue';
import { ChatService } from '@/services/chatService';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/stores/auth';
import type { ChatMessage } from '@/types/chat';

// Mock dependencies
vi.mock('@/services/chatService');
vi.mock('@/services/socketService');
vi.mock('@/stores/auth');
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

const mockMessage: ChatMessage = {
  id: '1',
  relatedId: 'inquiry-1',
  relatedType: 'inquiry',
  senderId: 'user1',
  senderUsername: 'Test User',
  content: 'Hello, this is a test message',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  isRead: false,
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
};

describe('ChatWindow.vue', () => {
  let mockAuthStore: any;
  let mockSocketService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthStore = {
      user: { id: 'user1', username: 'Test User', language: 'en' },
      token: 'mock-token',
    };

    mockSocketService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      joinChatRoom: vi.fn(),
      leaveChatRoom: vi.fn(),
      sendMessage: vi.fn(),
      sendTypingStatus: vi.fn(),
      markAsRead: vi.fn(),
      onMessage: vi.fn(),
      onTyping: vi.fn(),
      onUserStatus: vi.fn(),
      onMessageRead: vi.fn(),
      off: vi.fn(),
      isConnected: true,
    };

    (useAuthStore as any).mockReturnValue(mockAuthStore);
    (socketService as any) = mockSocketService;

    (ChatService.getChatMessages as any).mockResolvedValue({
      data: [mockMessage],
      total: 1,
    });
  });

  it('renders chat window correctly', () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        title: 'Test Chat',
      },
    });

    expect(wrapper.find('.chat-window').exists()).toBe(true);
    expect(wrapper.find('.chat-header').exists()).toBe(true);
    expect(wrapper.find('.chat-body').exists()).toBe(true);
  });

  it('displays chat title correctly', () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        title: 'Test Chat',
      },
    });

    expect(wrapper.vm.chatTitle).toBe('Test Chat');
  });

  it('loads messages on mount', async () => {
    shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    expect(ChatService.getChatMessages).toHaveBeenCalledWith({
      relatedId: 'inquiry-1',
      relatedType: 'inquiry',
      limit: 50,
    });
  });

  it('connects to socket and joins room on mount', () => {
    shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    expect(mockSocketService.connect).toHaveBeenCalled();
    expect(mockSocketService.joinChatRoom).toHaveBeenCalledWith('inquiry-1', 'inquiry');
  });

  it('sends message successfully', async () => {
    (ChatService.sendMessage as any).mockResolvedValue(mockMessage);

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    wrapper.vm.newMessage = 'Test message';
    await wrapper.vm.handleSendMessage();

    expect(ChatService.sendMessage).toHaveBeenCalledWith({
      relatedId: 'inquiry-1',
      relatedType: 'inquiry',
      content: 'Test message',
    });
    expect(mockSocketService.sendMessage).toHaveBeenCalledWith(mockMessage);
    expect(wrapper.vm.newMessage).toBe('');
  });

  it('handles empty message', async () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    wrapper.vm.newMessage = '   ';
    await wrapper.vm.handleSendMessage();

    expect(ChatService.sendMessage).not.toHaveBeenCalled();
  });

  it('translates message successfully', async () => {
    const mockTranslation = {
      messageId: '1',
      originalContent: 'Hello',
      translatedContent: 'こんにちは',
      targetLanguage: 'ja' as const,
    };

    (ChatService.translateMessage as any).mockResolvedValue(mockTranslation);

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    // Directly modify the messages array
    wrapper.vm.messages.push(mockMessage);
    await wrapper.vm.translateMessage(mockMessage);

    expect(ChatService.translateMessage).toHaveBeenCalledWith({
      messageId: '1',
      targetLanguage: 'ja',
    });
  });

  it('batch translates messages successfully', async () => {
    const mockResult = {
      translatedCount: 5,
      totalMessages: 10,
    };

    (ChatService.batchTranslateMessages as any).mockResolvedValue(mockResult);

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    await wrapper.vm.handleBatchTranslate();

    expect(ChatService.batchTranslateMessages).toHaveBeenCalledWith('inquiry-1', 'inquiry', 'ja');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('deletes message successfully', async () => {
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    (ChatService.deleteMessage as any).mockResolvedValue(undefined);

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    // Directly modify the messages array
    wrapper.vm.messages.push(mockMessage);
    await wrapper.vm.deleteMessage(mockMessage);

    expect(ElMessageBox.confirm).toHaveBeenCalled();
    expect(ChatService.deleteMessage).toHaveBeenCalledWith('1');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('handles delete message cancellation', async () => {
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    await wrapper.vm.deleteMessage(mockMessage);

    expect(ChatService.deleteMessage).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('toggles minimize state', async () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    expect(wrapper.vm.isMinimized).toBe(false);

    await wrapper.vm.toggleMinimize();
    expect(wrapper.vm.isMinimized).toBe(true);

    await wrapper.vm.toggleMinimize();
    expect(wrapper.vm.isMinimized).toBe(false);
  });

  it('handles typing status correctly', async () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    await wrapper.vm.handleTyping();

    expect(mockSocketService.sendTypingStatus).toHaveBeenCalledWith({
      userId: 'user1',
      username: 'Test User',
      isTyping: true,
      relatedId: 'inquiry-1',
      relatedType: 'inquiry',
    });
  });

  it('stops typing after timeout', async () => {
    vi.useFakeTimers();

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    await wrapper.vm.handleTyping();
    
    // Fast-forward time
    vi.advanceTimersByTime(2000);

    expect(mockSocketService.sendTypingStatus).toHaveBeenCalledWith({
      userId: 'user1',
      username: 'Test User',
      isTyping: false,
      relatedId: 'inquiry-1',
      relatedType: 'inquiry',
    });

    vi.useRealTimers();
  });

  it('formats time correctly', () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    const formatted = wrapper.vm.formatTime('2024-01-01T12:30:00Z');
    expect(typeof formatted).toBe('string');
  });

  it('handles socket events correctly', () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    // Verify socket event listeners are set up
    expect(mockSocketService.onMessage).toHaveBeenCalled();
    expect(mockSocketService.onTyping).toHaveBeenCalled();
  });

  it('leaves room and cleans up on unmount', () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    wrapper.unmount();

    expect(mockSocketService.leaveChatRoom).toHaveBeenCalledWith('inquiry-1', 'inquiry');
    expect(mockSocketService.off).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Network error');
    (ChatService.sendMessage as any).mockRejectedValue(error);

    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    wrapper.vm.newMessage = 'Test message';
    await wrapper.vm.handleSendMessage();

    expect(ElMessage.error).toHaveBeenCalled();
    expect(wrapper.vm.newMessage).toBe('Test message'); // Message should be restored
  });

  it('computes can translate correctly', async () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    expect(wrapper.vm.canTranslate).toBe(false);

    // Directly modify the messages array
    wrapper.vm.messages.push(mockMessage);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.canTranslate).toBe(true);
  });

  it('gets typing text correctly', async () => {
    const wrapper = shallowMount(ChatWindow, {
      props: {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      },
    });

    // Single user typing
    wrapper.vm.typingUsers.push({ userId: 'user2', username: 'User 2', isTyping: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.getTypingText()).toContain('User 2');

    // Multiple users typing
    wrapper.vm.typingUsers.push({ userId: 'user3', username: 'User 3', isTyping: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.getTypingText()).toContain('User 2, User 3');
  });
});