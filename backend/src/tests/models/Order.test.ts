import { Pool } from 'pg';
import { OrderModel } from '../../models/Order';
import { CreateOrderData, UpdateOrderData, OrderStatus } from '../../types/order';

// Mock the database pool
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

describe('OrderModel', () => {
  let orderModel: OrderModel;

  beforeEach(() => {
    orderModel = new OrderModel(mockDb);
    jest.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', async () => {
      const mockDate = new Date('2024-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ count: '5' }]
      });

      const orderNumber = await orderModel.generateOrderNumber();
      
      expect(orderNumber).toBe('ORD-20240115-0006');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['ORD-20240115-%']
      );
    });

    it('should pad sequence number with zeros', async () => {
      const mockDate = new Date('2024-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ count: '0' }]
      });

      const orderNumber = await orderModel.generateOrderNumber();
      
      expect(orderNumber).toBe('ORD-20240115-0001');
    });
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      const mockOrderData: CreateOrderData = {
        inquiryId: 'inquiry-123',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'Test specs',
        specialRequirements: 'Special req',
        unitPrice: 100.50,
        quantity: 10,
        totalPrice: 1005.00,
        createdBy: 'user-123'
      };

      const mockDbRow = {
        id: 'order-123',
        order_number: 'ORD-20240115-0001',
        inquiry_id: 'inquiry-123',
        product_name: 'Test Product',
        material_type: 'Steel',
        specifications: 'Test specs',
        special_requirements: 'Special req',
        unit_price: '100.50',
        quantity: 10,
        total_price: '1005.00',
        status: 'pending',
        created_by: 'user-123',
        confirmed_by: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock generateOrderNumber
      jest.spyOn(orderModel, 'generateOrderNumber').mockResolvedValue('ORD-20240115-0001');
      
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [mockDbRow]
      });

      const result = await orderModel.create(mockOrderData);

      expect(result.id).toBe('order-123');
      expect(result.orderNumber).toBe('ORD-20240115-0001');
      expect(result.productName).toBe('Test Product');
      expect(result.unitPrice).toBe(100.50);
      expect(result.totalPrice).toBe(1005.00);
      expect(result.status).toBe('pending');
    });

    it('should create order without inquiry ID', async () => {
      const mockOrderData: CreateOrderData = {
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'Test specs',
        unitPrice: 100.50,
        quantity: 10,
        totalPrice: 1005.00,
        createdBy: 'user-123'
      };

      jest.spyOn(orderModel, 'generateOrderNumber').mockResolvedValue('ORD-20240115-0001');
      
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'order-123',
          order_number: 'ORD-20240115-0001',
          inquiry_id: null,
          product_name: 'Test Product',
          material_type: 'Steel',
          specifications: 'Test specs',
          special_requirements: null,
          unit_price: '100.50',
          quantity: 10,
          total_price: '1005.00',
          status: 'pending',
          created_by: 'user-123',
          confirmed_by: null,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const result = await orderModel.create(mockOrderData);

      expect(result.inquiryId).toBeUndefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orders'),
        expect.arrayContaining([null]) // inquiry_id should be null
      );
    });
  });

  describe('findById', () => {
    it('should find order by ID with user names', async () => {
      const mockDbRow = {
        id: 'order-123',
        order_number: 'ORD-20240115-0001',
        inquiry_id: 'inquiry-123',
        product_name: 'Test Product',
        material_type: 'Steel',
        specifications: 'Test specs',
        special_requirements: 'Special req',
        unit_price: '100.50',
        quantity: 10,
        total_price: '1005.00',
        status: 'confirmed',
        created_by: 'user-123',
        confirmed_by: 'supplier-123',
        created_at: new Date(),
        updated_at: new Date(),
        creator_name: 'buyer_user',
        confirmer_name: 'supplier_user'
      };

      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [mockDbRow]
      });

      const result = await orderModel.findById('order-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('order-123');
      expect(result!.creatorName).toBe('buyer_user');
      expect(result!.confirmerName).toBe('supplier_user');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users creator'),
        ['order-123']
      );
    });

    it('should return null when order not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await orderModel.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByOrderNumber', () => {
    it('should find order by order number', async () => {
      const mockDbRow = {
        id: 'order-123',
        order_number: 'ORD-20240115-0001',
        product_name: 'Test Product',
        material_type: 'Steel',
        specifications: 'Test specs',
        unit_price: '100.50',
        quantity: 10,
        total_price: '1005.00',
        status: 'pending',
        created_by: 'user-123',
        confirmed_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        creator_name: 'buyer_user',
        confirmer_name: null
      };

      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [mockDbRow]
      });

      const result = await orderModel.findByOrderNumber('ORD-20240115-0001');

      expect(result).not.toBeNull();
      expect(result!.orderNumber).toBe('ORD-20240115-0001');
    });
  });

  describe('findAll', () => {
    it('should return paginated orders with total count', async () => {
      const mockCountResult = { rows: [{ total: '25' }] };
      const mockOrdersResult = {
        rows: [
          {
            id: 'order-1',
            order_number: 'ORD-20240115-0001',
            product_name: 'Product 1',
            material_type: 'Steel',
            specifications: 'Specs 1',
            unit_price: '100.00',
            quantity: 5,
            total_price: '500.00',
            status: 'pending',
            created_by: 'user-1',
            confirmed_by: null,
            created_at: new Date(),
            updated_at: new Date(),
            creator_name: 'buyer1',
            confirmer_name: null
          }
        ]
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockOrdersResult);

      const result = await orderModel.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(25);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe('order-1');
    });

    it('should filter orders by status', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await orderModel.findAll({ status: 'confirmed' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE o.status = $1'),
        ['confirmed', 10, 0]
      );
    });

    it('should filter orders by created_by', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await orderModel.findAll({ createdBy: 'user-123' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE o.created_by = $1'),
        ['user-123', 10, 0]
      );
    });
  });

  describe('update', () => {
    it('should update order fields', async () => {
      const updateData: UpdateOrderData = {
        productName: 'Updated Product',
        unitPrice: 150.00,
        status: 'confirmed',
        confirmedBy: 'supplier-123'
      };

      const mockUpdatedRow = {
        id: 'order-123',
        order_number: 'ORD-20240115-0001',
        product_name: 'Updated Product',
        material_type: 'Steel',
        specifications: 'Test specs',
        unit_price: '150.00',
        quantity: 10,
        total_price: '1500.00',
        status: 'confirmed',
        created_by: 'user-123',
        confirmed_by: 'supplier-123',
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [mockUpdatedRow]
      });

      const result = await orderModel.update('order-123', updateData);

      expect(result).not.toBeNull();
      expect(result!.productName).toBe('Updated Product');
      expect(result!.unitPrice).toBe(150.00);
      expect(result!.status).toBe('confirmed');
      expect(result!.confirmedBy).toBe('supplier-123');
    });

    it('should throw error when no fields to update', async () => {
      await expect(orderModel.update('order-123', {})).rejects.toThrow('No fields to update');
    });

    it('should return null when order not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await orderModel.update('nonexistent', { productName: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete order successfully', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rowCount: 1
      });

      const result = await orderModel.delete('order-123');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM orders WHERE id = $1',
        ['order-123']
      );
    });

    it('should return false when order not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rowCount: 0
      });

      const result = await orderModel.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('canUpdateStatus', () => {
    it('should allow valid status transitions', () => {
      expect(orderModel.canUpdateStatus('pending', 'confirmed')).toBe(true);
      expect(orderModel.canUpdateStatus('pending', 'cancelled')).toBe(true);
      expect(orderModel.canUpdateStatus('confirmed', 'production')).toBe(true);
      expect(orderModel.canUpdateStatus('production', 'shipped')).toBe(true);
      expect(orderModel.canUpdateStatus('shipped', 'completed')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(orderModel.canUpdateStatus('pending', 'shipped')).toBe(false);
      expect(orderModel.canUpdateStatus('completed', 'production')).toBe(false);
      expect(orderModel.canUpdateStatus('cancelled', 'confirmed')).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('should allow cancellation for pending and confirmed orders', () => {
      const pendingOrder = { status: 'pending' as OrderStatus } as any;
      const confirmedOrder = { status: 'confirmed' as OrderStatus } as any;
      
      expect(orderModel.canCancel(pendingOrder)).toBe(true);
      expect(orderModel.canCancel(confirmedOrder)).toBe(true);
    });

    it('should not allow cancellation for other statuses', () => {
      const productionOrder = { status: 'production' as OrderStatus } as any;
      const completedOrder = { status: 'completed' as OrderStatus } as any;
      
      expect(orderModel.canCancel(productionOrder)).toBe(false);
      expect(orderModel.canCancel(completedOrder)).toBe(false);
    });
  });

  describe('canModify', () => {
    it('should allow modification only for pending orders', () => {
      const pendingOrder = { status: 'pending' as OrderStatus } as any;
      const confirmedOrder = { status: 'confirmed' as OrderStatus } as any;
      
      expect(orderModel.canModify(pendingOrder)).toBe(true);
      expect(orderModel.canModify(confirmedOrder)).toBe(false);
    });
  });
});