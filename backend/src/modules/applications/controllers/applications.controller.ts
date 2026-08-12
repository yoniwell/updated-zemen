import { Request, Response } from 'express';
import { issuePortalOtp, verifyPortalOtpCode, PortalOtpError, consumePortalOtpVerificationToken } from '../../auth/services/public-otp.service';
import { logger } from '../../../common/utils/logger';
import { sendNotification } from '../../notifications/services/notification.service';

export class ApplicationsController {
  public sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, purpose } = req.body;
      
      if (!email || !purpose) {
        res.status(400).json({ error: 'Email and purpose are required' });
        return;
      }

      const result = await issuePortalOtp({ email, purpose });
      
      // Log the OTP code (useful in development)
      logger.info(`OTP generated for ${email} (purpose: ${purpose}): ${result.code}`);

      // Send the actual email asynchronously via setImmediate so API response returns instantly in 0ms
      setImmediate(() => {
        sendNotification({
          to: email,
          subject: `Your ${purpose === 'loan' ? 'Loan' : 'Membership'} Application Verification Code`,
          message: `Your verification code is: ${result.code}\nThis code will expire in ${result.expiresInSeconds / 60} minutes.`,
          channel: 'EMAIL'
        }).catch(err => {
          logger.error({ err }, 'Background email delivery failed');
        });
      });

      res.status(200).json({ 
        success: true, 
        message: 'OTP sent successfully', 
        expiresInSeconds: result.expiresInSeconds, 
        resendInSeconds: result.resendInSeconds
      });
    } catch (error: any) {
      if (error instanceof PortalOtpError) {
        res.status(error.status).json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds });
      } else {
        logger.error({ err: error }, 'Failed to send OTP');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  public verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, purpose, code } = req.body;
      
      if (!email || !purpose || !code) {
        res.status(400).json({ error: 'Email, purpose, and code are required' });
        return;
      }

      const result = await verifyPortalOtpCode({ email, purpose, code });
      
      res.status(200).json({ success: true, verificationToken: result.verificationToken, message: 'OTP verified successfully' });
    } catch (error: any) {
      if (error instanceof PortalOtpError) {
        res.status(error.status).json({ error: error.message });
      } else {
        logger.error({ err: error }, 'Failed to verify OTP');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  public getApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reference } = req.params;
      const { prisma } = require('../../../database/prisma');

      // Check membership first
      const membership = await prisma.membershipApplication.findFirst({
        where: { referenceNo: reference },
        select: { id: true, referenceNo: true, status: true, createdAt: true, updatedAt: true }
      });

      if (membership) {
        res.status(200).json({
          applicationType: 'membership',
          application: {
            id: membership.id,
            referenceNo: membership.referenceNo,
            status: membership.status,
            submittedAt: membership.createdAt,
            updatedAt: membership.updatedAt
          }
        });
        return;
      }

      // Check loans
      const loan = await prisma.loanApplication.findFirst({
        where: { referenceNo: reference },
        select: { id: true, referenceNo: true, status: true, createdAt: true, updatedAt: true }
      });

      if (loan) {
        res.status(200).json({
          applicationType: 'loan',
          application: {
            id: loan.id,
            referenceNo: loan.referenceNo,
            status: loan.status,
            submittedAt: loan.createdAt,
            updatedAt: loan.updatedAt
          }
        });
        return;
      }

      res.status(404).json({ error: { message: 'Application not found with the provided reference number' } });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch application status');
      res.status(500).json({ error: { message: 'Internal server error' } });
    }
  };

  public getReviewDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { prisma } = require('../../../database/prisma');
      
      const search = req.query.search as string;
      const status = req.query.status as string;
      const category = req.query.category as string;
      
      const where: any = {};
      if (status && status !== 'all') where.status = status;
      if (category && category !== 'all') where.type = category;

      // Mock aggregated documents from both membership and loan applications
      // In a real scenario, this would union the documents from both
      const documents = await prisma.applicationDocument.findMany({
        where,
        include: {
          loanApplication: { select: { applicantName: true, referenceNumber: true } },
          membershipApplication: { select: { applicantName: true, referenceNumber: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = documents.map((doc: any) => {
        const app = doc.loanApplication || doc.membershipApplication || {};
        return {
          id: doc.id,
          reference: doc.referenceNumber || app.referenceNumber || 'N/A',
          applicantName: app.applicantName || 'Unknown',
          type: doc.type,
          status: doc.status,
          uploadedAt: doc.createdAt.toISOString(),
          fileUrl: doc.fileUrl,
          rejectionReason: doc.rejectionReason,
          applicationType: doc.loanApplication ? 'loan' : 'membership'
        };
      });

      // Simple in-memory search
      const filtered = search ? formatted.filter((d: any) => 
        d.reference.toLowerCase().includes(search.toLowerCase()) || 
        d.applicantName.toLowerCase().includes(search.toLowerCase())
      ) : formatted;

      res.status(200).json({ success: true, documents: filtered });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch review documents');
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  public bulkUpdateDocumentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { prisma } = require('../../../database/prisma');
      const { documentIds, status, reason } = req.body;
      
      if (!Array.isArray(documentIds) || !status) {
        res.status(400).json({ error: 'documentIds and status are required' });
        return;
      }

      await prisma.applicationDocument.updateMany({
        where: { id: { in: documentIds } },
        data: { 
          status,
          rejectionReason: reason || null,
          updatedAt: new Date()
        }
      });

      res.status(200).json({ success: true, message: `Updated ${documentIds.length} documents` });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to update document status');
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
