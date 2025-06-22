import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { User } from '../entities/user.entity';

export interface JWTPayload extends JwtPayload {
    userId: string;
    email: string;
    role: string;
}

// Define valid JWT expiration values
type JWTExpiration = string | number;

export class AuthUtils {
    private static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    private static accessTokenOptions: SignOptions = {
        expiresIn: '7d',
        issuer: 'colabi',
        audience: 'colabi-users'
    };
    private static refreshTokenOptions: SignOptions = {
        expiresIn: '30d',
        issuer: 'colabi',
        audience: 'colabi-users'
    };

    /**
     * Generate JWT access token
     */
    static generateAccessToken(user: User): string {
        const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        return jwt.sign(payload, this.JWT_SECRET, this.accessTokenOptions);
    }

    /**
     * Generate JWT refresh token
     */
    static generateRefreshToken(user: User): string {
        const payload = {
            userId: user.id,
            type: 'refresh'
        };

        return jwt.sign(payload, this.JWT_SECRET, this.refreshTokenOptions);
    }

    /**
     * Verify JWT token
     */
    static verifyToken(token: string): JWTPayload {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET, {
                issuer: 'colabi',
                audience: 'colabi-users'
            }) as JWTPayload;

            return decoded;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired');
            }
            if (error instanceof jwt.NotBeforeError) {
                throw new Error('Token not active');
            }
            throw new Error('Token verification failed');
        }
    }

    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader?: string): string | null {
        if (!authHeader) return null;

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }

    /**
     * Generate email verification token
     */
    static generateEmailVerificationToken(): string {
        const payload = {
            type: 'email_verification',
            timestamp: Date.now()
        };

        const options: SignOptions = {
            expiresIn: '24h'
        };

        return jwt.sign(payload, this.JWT_SECRET, options);
    }

    /**
     * Generate password reset token
     */
    static generatePasswordResetToken(): string {
        const payload = {
            type: 'password_reset',
            timestamp: Date.now()
        };

        const options: SignOptions = {
            expiresIn: '1h'
        };

        return jwt.sign(payload, this.JWT_SECRET, options);
    }

    /**
     * Verify special tokens (email verification, password reset)
     */
    static verifySpecialToken(token: string, expectedType: string): boolean {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload & { type?: string };
            return decoded.type === expectedType;
        } catch {
            return false;
        }
    }
}