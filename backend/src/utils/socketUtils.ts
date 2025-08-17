import { SocketService } from '../services/SocketService';

export function getSocketService(): SocketService | null {
  return (global as any).socketService || null;
}

export function notifyNewMessage(relatedId: string, relatedType: 'inquiry' | 'order', message: any): void {
  const socketService = getSocketService();
  if (socketService) {
    socketService.notifyNewMessage(relatedId, relatedType, message);
  }
}

export function notifyStatusUpdate(relatedId: string, relatedType: 'inquiry' | 'order', status: string, updatedBy: string): void {
  const socketService = getSocketService();
  if (socketService) {
    socketService.notifyStatusUpdate(relatedId, relatedType, status, updatedBy);
  }
}

export function notifyNewQuotation(inquiryId: string, quotation: any): void {
  const socketService = getSocketService();
  if (socketService) {
    socketService.notifyNewQuotation(inquiryId, quotation);
  }
}

export function notifyOrderConfirmed(orderId: string, order: any): void {
  const socketService = getSocketService();
  if (socketService) {
    socketService.notifyOrderConfirmed(orderId, order);
  }
}

export function sendToUser(userId: string, event: string, data: any): void {
  const socketService = getSocketService();
  if (socketService) {
    socketService.sendToUser(userId, event, data);
  }
}

export function isUserOnline(userId: string): boolean {
  const socketService = getSocketService();
  return socketService ? socketService.isUserOnline(userId) : false;
}

export function getOnlineUsers(): any[] {
  const socketService = getSocketService();
  return socketService ? socketService.getOnlineUsers() : [];
}