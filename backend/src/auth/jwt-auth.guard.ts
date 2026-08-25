import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    // Must be "Bearer <token>"
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }

    const token = auth.slice("Bearer ".length);

    try {
      const payload = await this.jwt.verifyAsync(token);
      // Attach decoded payload to request so RolesGuard (and controllers) can read it
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}