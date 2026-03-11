import { Request, Response, NextFunction } from 'express';
import exportService from '../services/export.service';

export class ExportController {

  /**
   * GET /api/weddings/:weddingId/export/ics
   * Exporta tareas con due_date y eventos como archivo .ics (Google Calendar / Apple Calendar)
   */
  async exportICS(req: Request, res: Response, next: NextFunction) {
    try {
      const icsContent = await exportService.exportICS(
        req.params.weddingId,
        req.user!.userId,
      );

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="weddly-calendario.ics"`,
      );
      res.status(200).send(icsContent);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/weddings/:weddingId/export/pdf-data
   * Devuelve los datos estructurados para que el frontend genere el PDF.
   * Requiere plan one_time o subscription.
   */
  async exportPDFData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.exportPDFData(
        req.params.weddingId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new ExportController();