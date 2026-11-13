const noticeService = require('../services/noticeService');

class NoticeController {
  async getRecipientsDirectory(req, res) {
    try {
      const data = await noticeService.getRecipientsDirectory();
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching notice recipients directory:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to load faculty list' });
    }
  }

  async getNotices(req, res) {
    try {
      const data = await noticeService.getNotices(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching notices:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch notices' });
    }
  }

  async createNotice(req, res) {
    try {
      const created = await noticeService.createNotice(req.body);
      res.status(201).json({
        success: true,
        message: 'Notice sent successfully',
        data: created,
      });
    } catch (err) {
      console.error('Error creating notice:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to send notice' });
    }
  }

  async getAttachment(req, res) {
    try {
      const { filePath, fileName, mimeType } = await noticeService.getAttachmentFile(
        req.params.id,
        req.params.attachmentId
      );
      const isDownload = req.query.download === '1' || req.query.download === 'true';
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${fileName.replace(/"/g, '')}"`
      );
      res.sendFile(filePath);
    } catch (err) {
      res.status(404).json({ success: false, message: err.message || 'Attachment not found' });
    }
  }

  async deleteNotice(req, res) {
    try {
      await noticeService.deleteNotice(req.params.id);
      res.json({ success: true, message: 'Notice deleted successfully' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to delete notice' });
    }
  }
}

module.exports = new NoticeController();

