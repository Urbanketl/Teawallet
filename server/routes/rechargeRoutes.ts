import { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import * as createCsvWriter from "csv-writer";
import path from "path";
import fs from "fs";

export function registerRechargeRoutes(app: Express) {
  // Get business unit recharge history with pagination and filtering
  app.get("/api/recharge/business-unit/:businessUnitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { businessUnitId } = req.params;
      const { 
        page = "1", 
        limit = "20", 
        startDate, 
        endDate 
      } = req.query;

      console.log(`=== RECHARGE HISTORY API DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      console.log(`Page: ${page}, Limit: ${limit}`);
      console.log(`Date Filter - Start: ${startDate}, End: ${endDate}`);

      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const hasAccess = userBusinessUnits.some(unit => unit.id === businessUnitId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const result = await storage.getBusinessUnitRechargeHistory(
        businessUnitId, 
        pageNum, 
        limitNum, 
        startDate, 
        endDate
      );

      console.log(`Found ${result.recharges.length} recharges (page ${pageNum}) for business unit ${businessUnitId}, total: ${result.total}`);

      res.json(result);
    } catch (error) {
      console.error("Error fetching recharge history:", error);
      res.status(500).json({ error: "Failed to fetch recharge history" });
    }
  });

  // Get user recharge history across all business units
  app.get("/api/recharge/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        page = "1", 
        limit = "20", 
        startDate, 
        endDate 
      } = req.query;

      console.log(`=== USER RECHARGE HISTORY API DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Page: ${page}, Limit: ${limit}`);
      console.log(`Date Filter - Start: ${startDate}, End: ${endDate}`);

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const result = await storage.getUserRechargeHistory(
        userId, 
        pageNum, 
        limitNum, 
        startDate, 
        endDate
      );

      console.log(`Found ${result.recharges.length} recharges (page ${pageNum}) for user ${userId}, total: ${result.total}`);

      res.json(result);
    } catch (error) {
      console.error("Error fetching user recharge history:", error);
      res.status(500).json({ error: "Failed to fetch recharge history" });
    }
  });

  // Export recharge history as CSV
  app.get("/api/recharge/export/:businessUnitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { businessUnitId } = req.params;
      const { startDate, endDate } = req.query;

      console.log(`=== RECHARGE EXPORT API DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      console.log(`Date Filter - Start: ${startDate}, End: ${endDate}`);

      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(unit => unit.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const recharges = await storage.getRechargeHistoryExport(businessUnitId, startDate, endDate);

      if (recharges.length === 0) {
        return res.status(404).json({ error: "No recharge data found for the specified criteria" });
      }

      // Prepare CSV data
      const csvData = recharges.map(recharge => ({
        date: new Date(recharge.createdAt!).toLocaleDateString('en-IN'),
        time: new Date(recharge.createdAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        rechargedBy: recharge.userName || 'Unknown User',
        email: (recharge as any).userEmail || '',
        amount: `₹${recharge.amount}`,
        type: recharge.type,
        status: recharge.status || 'completed',
        paymentId: recharge.razorpayPaymentId || '',
        description: recharge.description || 'Wallet recharge'
      }));

      // Create CSV file
      const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
      const filename = `recharge-history_${businessUnit.name.replace(/[^a-zA-Z0-9]/g, '-')}_${businessUnitId}${dateRange}_${Date.now()}.csv`;
      const filepath = path.join(process.cwd(), filename);

      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: filepath,
        header: [
          { id: 'date', title: 'Date' },
          { id: 'time', title: 'Time' },
          { id: 'rechargedBy', title: 'Recharged By' },
          { id: 'email', title: 'Email' },
          { id: 'amount', title: 'Amount' },
          { id: 'type', title: 'Type' },
          { id: 'status', title: 'Status' },
          { id: 'paymentId', title: 'Payment ID' },
          { id: 'description', title: 'Description' }
        ]
      });

      await csvWriter.writeRecords(csvData);

      console.log(`Recharge history export generated: ${filename} with ${csvData.length} records`);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file and clean up
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        // Clean up the temporary file
        fs.unlink(filepath, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      });

    } catch (error) {
      console.error("Error exporting recharge history:", error);
      res.status(500).json({ error: "Failed to export recharge history" });
    }
  });
}