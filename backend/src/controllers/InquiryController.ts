import { Request, Response } from 'express';
import { pool } from '../config/database';
import { Inquiry } from '../models/Inquiry';
import { CreateInquiryRequest, UpdateInquiryRequest, InquiryResponse } from '../types/inquiry';
import { AuthenticatedRequest } from '../middleware/auth';

export class InquiryController {
  /**
   * Get all inquiries (admin) or user's own inquiries with pagination
   */
  static async getAllInquiries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;

      let inquiries: Inquiry[];
      let totalCount: number;

      if (user.role === 'admin') {
        // Admin can see all inquiries
        const result = await Inquiry.findAllWithPagination(pool, {
          page,
          limit,
          search,
          status
        });
        inquiries = result.inquiries;
        totalCount = result.total;
      } else {
        // Users can only see their own inquiries
        const result = await Inquiry.findByCreatorWithPagination(pool, user.id, {
          page,
          limit,
          search,
          status
        });
        inquiries = result.inquiries;
        totalCount = result.total;
      }

      const response: InquiryResponse[] = inquiries.map(inquiry => ({
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      }));

      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        success: true,
        data: {
          items: response,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('Get inquiries error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inquiries'
        }
      });
    }
  }

  /**
   * Get inquiry by ID
   */
  static async getInquiryById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const inquiry = await Inquiry.findById(pool, id);
      if (!inquiry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INQUIRY_NOT_FOUND',
            message: 'Inquiry not found'
          }
        });
        return;
      }

      // Check permissions: users can only view their own inquiries, admin can view all
      if (user.role !== 'admin' && inquiry.createdBy !== user.id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only view your own inquiries'
          }
        });
        return;
      }

      const response: InquiryResponse = {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Get inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inquiry'
        }
      });
    }
  }

  /**
   * Create a new inquiry
   */
  static async createInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const inquiryData: CreateInquiryRequest = req.body;

      // Only buyers can create inquiries
      if (user.role !== 'buyer' && user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only buyers can create inquiries'
          }
        });
        return;
      }

      // Validate required fields
      if (!inquiryData.productName || !inquiryData.materialType || 
          !inquiryData.specifications) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: productName, materialType, specifications, quantity'
          }
        });
        return;
      }

      if (!inquiryData.quantity || inquiryData.quantity <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quantity must be greater than 0'
          }
        });
        return;
      }

      const inquiry = new Inquiry({
        productName: inquiryData.productName.trim(),
        materialType: inquiryData.materialType.trim(),
        specifications: inquiryData.specifications.trim(),
        specialRequirements: inquiryData.specialRequirements?.trim(),
        quantity: inquiryData.quantity,
        status: 'draft',
        createdBy: user.id
      });

      const saveResult = await inquiry.save(pool);
      if (!saveResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: saveResult.error
          }
        });
        return;
      }

      const response: InquiryResponse = {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      };

      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Create inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create inquiry'
        }
      });
    }
  }

  /**
   * Update an existing inquiry
   */
  static async updateInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updateData: UpdateInquiryRequest = req.body;

      const inquiry = await Inquiry.findById(pool, id);
      if (!inquiry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INQUIRY_NOT_FOUND',
            message: 'Inquiry not found'
          }
        });
        return;
      }

      // Check permissions: users can only update their own inquiries, admin can update all
      if (user.role !== 'admin' && inquiry.createdBy !== user.id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only update your own inquiries'
          }
        });
        return;
      }

      // Check if inquiry can be modified based on status
      if (!inquiry.canBeModified()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot modify inquiry with status: ${inquiry.status}`
          }
        });
        return;
      }

      // Update fields if provided
      if (updateData.productName !== undefined) {
        inquiry.productName = updateData.productName.trim();
      }
      if (updateData.materialType !== undefined) {
        inquiry.materialType = updateData.materialType.trim();
      }
      if (updateData.specifications !== undefined) {
        inquiry.specifications = updateData.specifications.trim();
      }
      if (updateData.specialRequirements !== undefined) {
        inquiry.specialRequirements = updateData.specialRequirements?.trim();
      }
      if (updateData.quantity !== undefined) {
        if (updateData.quantity <= 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Quantity must be greater than 0'
            }
          });
          return;
        }
        inquiry.quantity = updateData.quantity;
      }

      inquiry.updatedAt = new Date();

      const saveResult = await inquiry.save(pool);
      if (!saveResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: saveResult.error
          }
        });
        return;
      }

      const response: InquiryResponse = {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Update inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update inquiry'
        }
      });
    }
  }

  /**
   * Cancel an inquiry (set status to cancelled)
   */
  static async cancelInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const inquiry = await Inquiry.findById(pool, id);
      if (!inquiry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INQUIRY_NOT_FOUND',
            message: 'Inquiry not found'
          }
        });
        return;
      }

      // Check permissions: users can only cancel their own inquiries, admin can cancel all
      if (user.role !== 'admin' && inquiry.createdBy !== user.id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only cancel your own inquiries'
          }
        });
        return;
      }

      // Check if inquiry can be cancelled
      if (!inquiry.canBeCancelled()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot cancel inquiry with status: ${inquiry.status}`
          }
        });
        return;
      }

      const statusResult = inquiry.updateStatus('cancelled');
      if (!statusResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'STATUS_TRANSITION_ERROR',
            message: statusResult.error
          }
        });
        return;
      }

      const saveResult = await inquiry.save(pool);
      if (!saveResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to save inquiry status'
          }
        });
        return;
      }

      const response: InquiryResponse = {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Cancel inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel inquiry'
        }
      });
    }
  }

  /**
   * Publish an inquiry (set status to published)
   */
  static async publishInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const inquiry = await Inquiry.findById(pool, id);
      if (!inquiry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INQUIRY_NOT_FOUND',
            message: 'Inquiry not found'
          }
        });
        return;
      }

      // Check permissions: users can only publish their own inquiries, admin can publish all
      if (user.role !== 'admin' && inquiry.createdBy !== user.id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only publish your own inquiries'
          }
        });
        return;
      }

      const statusResult = inquiry.updateStatus('published');
      if (!statusResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'STATUS_TRANSITION_ERROR',
            message: statusResult.error
          }
        });
        return;
      }

      const saveResult = await inquiry.save(pool);
      if (!saveResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to save inquiry status'
          }
        });
        return;
      }

      const response: InquiryResponse = {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        productName: inquiry.productName,
        materialType: inquiry.materialType,
        specifications: inquiry.specifications,
        specialRequirements: inquiry.specialRequirements,
        quantity: inquiry.quantity,
        status: inquiry.status,
        createdBy: inquiry.createdBy,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Publish inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to publish inquiry'
        }
      });
    }
  }

  /**
   * Delete an inquiry (admin only)
   */
  static async deleteInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Only admin can delete inquiries
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can delete inquiries'
          }
        });
        return;
      }

      const inquiry = await Inquiry.findById(pool, id);
      if (!inquiry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INQUIRY_NOT_FOUND',
            message: 'Inquiry not found'
          }
        });
        return;
      }

      const deleteResult = await Inquiry.deleteById(pool, id);
      if (!deleteResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: deleteResult.error
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Inquiry deleted successfully'
      });
    } catch (error) {
      console.error('Delete inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete inquiry'
        }
      });
    }
  }
}