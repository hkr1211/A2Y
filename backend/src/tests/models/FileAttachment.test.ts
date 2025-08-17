import { Pool } from 'pg';
import { FileAttachmentModel } from '../../models/FileAttachment';
import { CreateFileAttachmentData } from '../../types/fileAttachment';

// Mock the database
const mockQuery = jest.fn();
const mockDb = {
  query: mockQuery
} as unknown as Pool;

describe('FileAttachmentModel', () => {
  let fileAttachmentModel: FileAttachmentModel;

  beforeEach(() => {
    fileAttachmentModel = new FileAttachmentModel(mockDb);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new file attachment', async () => {
      const createData: CreateFileAttachmentData = {
        filename: 'test-file-123.pdf',
        originalName: 'test document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file-123.pdf',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        uploadedBy: 'user-123'
      };

      const mockRow = {
        id: 'file-123',
        filename: 'test-file-123.pdf',
        original_name: 'test document.pdf',
        mime_type: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file-123.pdf',
        related_id: 'inquiry-123',
        related_type: 'inquiry',
        uploaded_by: 'user-123',
        uploaded_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] });

      const result = await fileAttachmentModel.create(createData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO file_attachments'),
        [
          'test-file-123.pdf',
          'test document.pdf',
          'application/pdf',
          1024,
          '/uploads/test-file-123.pdf',
          'inquiry-123',
          'inquiry',
          'user-123'
        ]
      );

      expect(result).toEqual({
        id: 'file-123',
        filename: 'test-file-123.pdf',
        originalName: 'test document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file-123.pdf',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        uploadedBy: 'user-123',
        uploadedAt: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });
    });
  });

  describe('findById', () => {
    it('should find file attachment by id', async () => {
      const mockRow = {
        id: 'file-123',
        filename: 'test-file-123.pdf',
        original_name: 'test document.pdf',
        mime_type: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file-123.pdf',
        related_id: 'inquiry-123',
        related_type: 'inquiry',
        uploaded_by: 'user-123',
        uploaded_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] });

      const result = await fileAttachmentModel.findById('file-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM file_attachments WHERE id = $1',
        ['file-123']
      );

      expect(result).toEqual({
        id: 'file-123',
        filename: 'test-file-123.pdf',
        originalName: 'test document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file-123.pdf',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        uploadedBy: 'user-123',
        uploadedAt: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });
    });

    it('should return null when file attachment not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await fileAttachmentModel.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByRelated', () => {
    it('should find file attachments by related inquiry', async () => {
      const mockRows = [
        {
          id: 'file-123',
          filename: 'test-file-123.pdf',
          original_name: 'test document.pdf',
          mime_type: 'application/pdf',
          size: 1024,
          path: '/uploads/test-file-123.pdf',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          uploaded_by: 'user-123',
          uploaded_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockRows });

      const result = await fileAttachmentModel.findByRelated('inquiry-123', 'inquiry');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE related_id = $1 AND related_type = $2'),
        ['inquiry-123', 'inquiry']
      );

      expect(result).toHaveLength(1);
      expect(result[0].relatedId).toBe('inquiry-123');
      expect(result[0].relatedType).toBe('inquiry');
    });

    it('should find file attachments by related order', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await fileAttachmentModel.findByRelated('order-123', 'order');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE related_id = $1 AND related_type = $2'),
        ['order-123', 'order']
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete file attachment successfully', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await fileAttachmentModel.delete('file-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM file_attachments WHERE id = $1',
        ['file-123']
      );

      expect(result).toBe(true);
    });

    it('should return false when file attachment not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await fileAttachmentModel.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('findByUploader', () => {
    it('should find file attachments by uploader', async () => {
      const mockRows = [
        {
          id: 'file-123',
          filename: 'test-file-123.pdf',
          original_name: 'test document.pdf',
          mime_type: 'application/pdf',
          size: 1024,
          path: '/uploads/test-file-123.pdf',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          uploaded_by: 'user-123',
          uploaded_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockRows });

      const result = await fileAttachmentModel.findByUploader('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE uploaded_by = $1'),
        ['user-123']
      );

      expect(result).toHaveLength(1);
      expect(result[0].uploadedBy).toBe('user-123');
    });
  });
});