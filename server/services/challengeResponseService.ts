import crypto from 'crypto';
import { storage } from '../storage';
import { db } from '../db';
import { rfidCards } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

interface ChallengeData {
  challenge: string;
  timestamp: number;
  machineId: string;
  cardUid: string;
}

interface AuthResult {
  success: boolean;
  cardNumber?: string;
  businessUnitId?: string;
  errorMessage?: string;
  challengeData?: any;
  responseData?: any;
}

class ChallengeResponseService {
  private pendingChallenges: Map<string, ChallengeData> = new Map();
  private challengeTimeout = 30000; // 30 seconds

  constructor() {
    console.log('ChallengeResponseService initialized');
    
    // Clean expired challenges every minute
    setInterval(() => {
      this.cleanExpiredChallenges();
    }, 60000);
  }

  /**
   * Generate cryptographic challenge for MIFARE DESFire EV1 card
   */
  async generateChallenge(machineId: string, cardUid: string): Promise<{
    challengeId: string;
    challenge: string;
  }> {
    // Generate 16-byte random challenge for DESFire authentication
    const challenge = crypto.randomBytes(16).toString('hex').toUpperCase();
    const challengeId = crypto.randomUUID();
    
    const challengeData: ChallengeData = {
      challenge,
      timestamp: Date.now(),
      machineId,
      cardUid: cardUid.toUpperCase()
    };
    
    this.pendingChallenges.set(challengeId, challengeData);
    
    console.log(`Generated challenge ${challengeId} for card ${cardUid} on machine ${machineId}`);
    
    return {
      challengeId,
      challenge
    };
  }

  /**
   * Validate challenge response from MIFARE DESFire EV1 card
   */
  async validateChallengeResponse(
    challengeId: string, 
    response: string,
    cardUid: string
  ): Promise<AuthResult> {
    const challengeData = this.pendingChallenges.get(challengeId);
    
    if (!challengeData) {
      return {
        success: false,
        errorMessage: 'Challenge not found or expired'
      };
    }

    // Remove challenge from pending list
    this.pendingChallenges.delete(challengeId);

    try {
      // Find the RFID card by hardware UID
      const [card] = await db
        .select()
        .from(rfidCards)
        .where(eq(rfidCards.hardwareUid, cardUid.toUpperCase()));

      if (!card || !card.isActive) {
        await this.logAuthAttempt(challengeData.machineId, cardUid, 'failed', 
          challengeData.challenge, response, 'Card not found or inactive');
        
        return {
          success: false,
          errorMessage: 'Invalid card or card not active'
        };
      }

      // Validate the cryptographic response
      const isValidResponse = await this.validateDESFireResponse(
        challengeData.challenge, 
        response, 
        card.aesKeyEncrypted
      );

      if (!isValidResponse) {
        await this.logAuthAttempt(challengeData.machineId, card.cardNumber, 'failed',
          challengeData.challenge, response, 'Invalid cryptographic response');
        
        return {
          success: false,
          errorMessage: 'Authentication failed - invalid response'
        };
      }

      // Update card last used information
      await db
        .update(rfidCards)
        .set({
          lastUsed: new Date(),
          lastUsedMachineId: challengeData.machineId
        })
        .where(eq(rfidCards.id, card.id));

      // Log successful authentication
      await this.logAuthAttempt(challengeData.machineId, card.cardNumber, 'success',
        challengeData.challenge, response);

      console.log(`Authentication successful for card ${card.cardNumber} on machine ${challengeData.machineId}`);

      return {
        success: true,
        cardNumber: card.cardNumber,
        businessUnitId: card.businessUnitId,
        challengeData: {
          challenge: challengeData.challenge,
          challengeId
        },
        responseData: {
          response,
          cardUid
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      
      await this.logAuthAttempt(challengeData.machineId, cardUid, 'failed',
        challengeData.challenge, response, errorMessage);

      console.error('Challenge-response validation error:', error);
      
      return {
        success: false,
        errorMessage
      };
    }
  }

  /**
   * Validate DESFire cryptographic response using AES encryption
   */
  private async validateDESFireResponse(
    challenge: string, 
    response: string, 
    encryptedKey: string | null
  ): Promise<boolean> {
    if (!encryptedKey) {
      console.log('No AES key available for card');
      return false;
    }

    try {
      // In production, decrypt the stored AES key
      // For now, simulate the validation process
      const decryptedKey = await this.decryptAESKey(encryptedKey);
      
      // Perform AES encryption of challenge to get expected response
      const expectedResponse = await this.performAESChallenge(challenge, decryptedKey);
      
      // Compare with received response (case-insensitive)
      const isValid = expectedResponse.toUpperCase() === response.toUpperCase();
      
      console.log(`DESFire validation: challenge=${challenge}, expected=${expectedResponse}, received=${response}, valid=${isValid}`);
      
      return isValid;
      
    } catch (error) {
      console.error('DESFire response validation error:', error);
      return false;
    }
  }

  /**
   * Decrypt stored AES key (placeholder implementation)
   */
  private async decryptAESKey(encryptedKey: string): Promise<string> {
    // In production, this would use proper key management system
    // For now, simulate by returning a consistent key based on encrypted data
    const hash = crypto.createHash('sha256').update(encryptedKey).digest('hex');
    return hash.substring(0, 32); // 32-byte AES key
  }

  /**
   * Perform AES challenge encryption to generate expected response
   */
  private async performAESChallenge(challenge: string, aesKey: string): Promise<string> {
    try {
      // Convert hex challenge to buffer
      const challengeBuffer = Buffer.from(challenge, 'hex');
      const keyBuffer = Buffer.from(aesKey, 'hex');
      
      // AES-128 ECB encryption (simplified for demonstration)
      const cipher = crypto.createCipher('aes-128-ecb', keyBuffer);
      let encrypted = cipher.update(challengeBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return encrypted.toString('hex').toUpperCase();
      
    } catch (error) {
      console.error('AES challenge encryption error:', error);
      throw error;
    }
  }

  /**
   * Generate and rotate AES keys for a business unit
   */
  async rotateBusinessUnitKeys(businessUnitId: string): Promise<{
    rotatedCards: number;
    newKeyVersion: number;
  }> {
    console.log(`Starting key rotation for business unit ${businessUnitId}`);
    
    try {
      // Get all active cards for the business unit
      const allCards = await storage.getAllRfidCards();
      const activeCards = allCards.filter((card: any) => card.businessUnitId === businessUnitId && card.isActive);
      
      const newKeyVersion = Date.now(); // Use timestamp as version
      let rotatedCount = 0;
      
      for (const card of activeCards) {
        if (card.cardType === 'desfire') {
          // Generate new AES key
          const newAESKey = crypto.randomBytes(16).toString('hex');
          const encryptedKey = await this.encryptAESKey(newAESKey);
          
          // Update card with new key
          await db
            .update(rfidCards)
            .set({
              aesKeyEncrypted: encryptedKey,
              keyVersion: newKeyVersion,
              lastKeyRotation: new Date()
            })
            .where(eq(rfidCards.id, card.id));
          
          rotatedCount++;
          console.log(`Rotated key for card ${card.cardNumber}`);
        }
      }
      
      console.log(`Key rotation completed: ${rotatedCount} cards updated with version ${newKeyVersion}`);
      
      return {
        rotatedCards: rotatedCount,
        newKeyVersion
      };
      
    } catch (error) {
      console.error('Key rotation error:', error);
      throw error;
    }
  }

  /**
   * Encrypt AES key for storage (placeholder implementation)
   */
  private async encryptAESKey(aesKey: string): Promise<string> {
    // In production, use proper encryption with master key
    const cipher = crypto.createCipher('aes-256-cbc', process.env.MASTER_KEY || 'default-master-key');
    let encrypted = cipher.update(aesKey, 'hex', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Log authentication attempt to database
   */
  private async logAuthAttempt(
    machineId: string,
    cardIdentifier: string,
    status: 'success' | 'failed',
    challenge: string,
    response: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Create machine auth log entry directly in database
      await db.execute(sql`
        INSERT INTO machine_auth_logs (machine_id, rfid_card_id, auth_status, challenge_sent, response_received, error_message, created_at)
        VALUES (${machineId}, ${cardIdentifier}, ${status}, ${challenge}, ${response}, ${errorMessage || null}, NOW())
      `);
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  /**
   * Clean expired challenges from memory
   */
  private cleanExpiredChallenges(): void {
    const now = Date.now();
    const expiredChallenges: string[] = [];
    
    for (const [challengeId, challengeData] of Array.from(this.pendingChallenges.entries())) {
      if (now - challengeData.timestamp > this.challengeTimeout) {
        expiredChallenges.push(challengeId);
      }
    }
    
    expiredChallenges.forEach(challengeId => {
      this.pendingChallenges.delete(challengeId);
    });
    
    if (expiredChallenges.length > 0) {
      console.log(`Cleaned ${expiredChallenges.length} expired challenges`);
    }
  }

  /**
   * Get service status and statistics
   */
  getServiceStatus(): {
    pendingChallenges: number;
    uptime: number;
    challengeTimeout: number;
  } {
    return {
      pendingChallenges: this.pendingChallenges.size,
      uptime: process.uptime(),
      challengeTimeout: this.challengeTimeout
    };
  }
}

export const challengeResponseService = new ChallengeResponseService();