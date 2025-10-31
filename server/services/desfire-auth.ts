import crypto from 'crypto';
import {
  aesEncrypt,
  aesDecrypt,
  rotateLeft,
  deriveSessionKey,
  generateRandom16,
  hexToBuffer,
  bufferToHex,
} from './desfire-crypto';
import { sessionManager, AuthSession } from './desfire-session-manager';

/**
 * DESFire EV2/EV3 AES Mutual Authentication Service
 * 
 * Implements the complete 3-round-trip authentication protocol:
 * 1. Start Authentication - Backend prepares and returns APDU command
 * 2. Process Step 2 - Backend processes Enc(RndB), generates challenge
 * 3. Verify Final - Backend verifies Enc(Rot(RndA)) and completes auth
 */

export interface AuthStartRequest {
  cardId: string; // Card UID in hex format
  keyNumber?: number; // DESFire key number (default 0)
  machineId?: number; // Optional machine ID
}

export interface AuthStartResponse {
  sessionId: string;
  apduCommand: string; // Hex string of APDU to send to card
  success: boolean;
  error?: string;
}

export interface AuthStep2Request {
  sessionId: string;
  cardResponse: string; // Hex string of Enc(RndB) from card
}

export interface AuthStep2Response {
  apduCommand: string; // Hex string of Continue Authenticate APDU
  success: boolean;
  error?: string;
}

export interface AuthVerifyRequest {
  sessionId: string;
  cardResponse: string; // Hex string of Enc(Rot(RndA)) from card
}

export interface AuthVerifyResponse {
  success: boolean;
  authenticated: boolean;
  sessionKey?: string; // Hex string of derived session key
  cardId?: string;
  error?: string;
}

/**
 * Step 1: Start Authentication
 * 
 * Creates a new auth session and returns the initial APDU command
 * for the Pi to send to the card.
 * 
 * APDU format: 90 AA 00 00 01 <KeyNumber>
 */
export async function startAuthentication(
  request: AuthStartRequest,
  aesKey: Buffer
): Promise<AuthStartResponse> {
  try {
    const { cardId, keyNumber = 0, machineId } = request;
    
    // Generate unique session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Create session
    sessionManager.createSession(sessionId, cardId, aesKey, keyNumber, machineId);
    
    // Build APDU command: Authenticate AES
    // CLA=90, INS=AA, P1=00, P2=00, Lc=01, Data=KeyNumber
    const apdu = Buffer.from([0x90, 0xAA, 0x00, 0x00, 0x01, keyNumber]);
    
    return {
      sessionId,
      apduCommand: bufferToHex(apdu),
      success: true,
    };
  } catch (error) {
    return {
      sessionId: '',
      apduCommand: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Step 2: Process Card Response (Enc(RndB))
 * 
 * Decrypts RndB from the card, generates RndA,
 * and returns the challenge APDU.
 * 
 * Process:
 * 1. Decrypt Enc(RndB) to get RndB
 * 2. Generate RndA (16 random bytes)
 * 3. Rotate RndB left by 1 byte → Rot(RndB)
 * 4. Concatenate: RndA || Rot(RndB) (32 bytes)
 * 5. Encrypt the 32-byte block
 * 6. Build Continue Authenticate APDU: 90 AF 00 00 20 <32 bytes>
 */
export async function processStep2(
  request: AuthStep2Request
): Promise<AuthStep2Response> {
  try {
    const { sessionId, cardResponse } = request;
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        apduCommand: '',
        success: false,
        error: 'Session not found or expired',
      };
    }
    
    // Parse card response (should be Enc(RndB), 16 bytes)
    const encRndB = hexToBuffer(cardResponse);
    if (encRndB.length !== 16) {
      return {
        apduCommand: '',
        success: false,
        error: `Invalid card response length: expected 16 bytes, got ${encRndB.length}`,
      };
    }
    
    // Decrypt RndB
    const rndB = aesDecrypt(encRndB, session.aesKey);
    
    // Generate RndA
    const rndA = generateRandom16();
    
    // Rotate RndB left by 1 byte
    const rotRndB = rotateLeft(rndB);
    
    // Concatenate: RndA || Rot(RndB)
    const challenge = Buffer.concat([rndA, rotRndB]);
    
    // Encrypt the 32-byte challenge
    const encChallenge = aesEncrypt(challenge, session.aesKey);
    
    // Update session with RndA and RndB
    sessionManager.updateSession(sessionId, {
      rndA,
      rndB,
      step: 'challenge_sent',
    });
    
    // Build APDU: Continue Authenticate
    // CLA=90, INS=AF, P1=00, P2=00, Lc=20 (32 bytes), Data=encChallenge
    const apdu = Buffer.concat([
      Buffer.from([0x90, 0xAF, 0x00, 0x00, 0x20]),
      encChallenge,
    ]);
    
    return {
      apduCommand: bufferToHex(apdu),
      success: true,
    };
  } catch (error) {
    return {
      apduCommand: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Step 3: Verify Final Response
 * 
 * Verifies the card's final response (Enc(Rot(RndA))).
 * If valid, derives the session key and completes authentication.
 * 
 * Process:
 * 1. Decrypt Enc(Rot(RndA)) to get Rot(RndA)
 * 2. Rotate our stored RndA left by 1 byte
 * 3. Compare: decrypted Rot(RndA) === our Rot(RndA)
 * 4. If match: Derive session key and return success
 */
export async function verifyFinal(
  request: AuthVerifyRequest
): Promise<AuthVerifyResponse> {
  try {
    const { sessionId, cardResponse } = request;
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        authenticated: false,
        error: 'Session not found or expired',
      };
    }
    
    if (session.step !== 'challenge_sent') {
      return {
        success: false,
        authenticated: false,
        error: `Invalid session state: ${session.step}`,
      };
    }
    
    // Parse card response (should be Enc(Rot(RndA)), 16 bytes)
    const encRotRndA = hexToBuffer(cardResponse);
    if (encRotRndA.length !== 16) {
      sessionManager.updateSession(sessionId, { step: 'failed' });
      return {
        success: false,
        authenticated: false,
        error: `Invalid card response length: expected 16 bytes, got ${encRotRndA.length}`,
      };
    }
    
    // Decrypt Rot(RndA) from card
    const cardRotRndA = aesDecrypt(encRotRndA, session.aesKey);
    
    // Compute our own Rot(RndA)
    const expectedRotRndA = rotateLeft(session.rndA);
    
    // Compare
    if (!cardRotRndA.equals(expectedRotRndA)) {
      sessionManager.updateSession(sessionId, { step: 'failed' });
      return {
        success: true,
        authenticated: false,
        error: 'Authentication failed: RndA mismatch',
      };
    }
    
    // Authentication successful! Derive session key
    const sessionKey = deriveSessionKey(session.rndA, session.rndB);
    
    // Update session
    sessionManager.updateSession(sessionId, { step: 'verified' });
    
    // Clean up session after successful auth
    // (In production, you might want to keep it for a short time for logging)
    setTimeout(() => {
      sessionManager.deleteSession(sessionId);
    }, 5000);
    
    return {
      success: true,
      authenticated: true,
      sessionKey: bufferToHex(sessionKey),
      cardId: session.cardId,
    };
  } catch (error) {
    return {
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Get session statistics (for monitoring)
 */
export function getAuthStats() {
  return sessionManager.getStats();
}
