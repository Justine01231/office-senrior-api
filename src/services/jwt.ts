// src/services/jwt.ts
import type { JWTPayload } from '../types/auth';

export class JWTService {
  private static secret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

  // Simple base64 encoding/decoding for JWT (for development)
  // In production, use a proper JWT library
  static async sign(payload: JWTPayload): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = await this.createSignature(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  static async verify(token: string): Promise<JWTPayload | null> {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      if (!encodedHeader || !encodedPayload || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = await this.createSignature(`${encodedHeader}.${encodedPayload}`);
      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(atob(encodedPayload)) as JWTPayload;

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  private static async createSignature(data: string): Promise<string> {
    // Simple signature creation using Bun's crypto
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}
