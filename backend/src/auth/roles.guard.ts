// Import the tools we need from Nest.
// CanActivate     → the "contract" every guard must follow (must have a canActivate method)
// ExecutionContext → an object Nest gives us describing the incoming request
// Injectable      → marks this class so Nest can create and inject it where needed
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

// Reflector is a helper from Nest that lets us READ metadata that decorators attached.
// Our @Roles("superadmin") decorator ATTACHED metadata; Reflector READS it back.
import { Reflector } from "@nestjs/core";

// Import the key ("roles") we used in roles.decorator.ts.
// Using the same constant on both sides avoids typo bugs like "role" vs "roles".
import { ROLES_KEY } from "./roles.decorator";

// @Injectable() tells Nest: "this class can be injected into other classes."
// Without it, Nest wouldn't know how to construct RolesGuard.
@Injectable()
// The class name. `implements CanActivate` means we PROMISE to have a canActivate method.
// If we forget, TypeScript will yell at us — this is the contract for a guard.
export class RolesGuard implements CanActivate {

  // Constructor. Nest sees `private reflector: Reflector` and automatically
  // creates a Reflector for us and hands it in. This is "dependency injection."
  // The `private` keyword also auto-creates `this.reflector` — shorthand.
  constructor(private reflector: Reflector) {}

  // canActivate is THE method Nest calls before letting the request into the endpoint.
  // Return true → request continues. Return false → Nest throws 403 Forbidden.
  canActivate(context: ExecutionContext): boolean {

    // Ask the Reflector: "what roles did @Roles(...) put on this endpoint?"
    // We pass TWO places to look:
    //   context.getHandler() → the specific method being called (e.g. `create`)
    //   context.getClass()   → the whole controller class
    // getAllAndOverride checks the method first, then falls back to the class.
    // This way @Roles() works whether you put it on the method or the controller.
    // The <string[]> tells TS "the value stored under this key is an array of strings."
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the endpoint didn't use @Roles(...) at all, requiredRoles is undefined.
    // In that case, this guard has nothing to enforce → let the request through.
    // (JwtAuthGuard has already checked that the user is logged in.)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // context.switchToHttp() → "treat this like an HTTP request" (vs. WebSocket, etc.)
    // .getRequest() → gives us the raw request object (like Express's `req`).
    const request = context.switchToHttp().getRequest();

    // JwtAuthGuard (which ran BEFORE this guard) decoded the JWT and put the payload
    // on request.user. So request.user looks like:
    //   { sub: "uuid...", email: "...", role: "superadmin" }
    const user = request.user;

    // Defensive check. If there's no user or no role on the user, something is wrong
    // (maybe JwtAuthGuard didn't run, or the token had no role in it).
    // Rejecting here is safer than assuming things.
    if (!user || !user.role) {
      return false;
    }

    // The real check.
    // requiredRoles = ["superadmin"]  (from @Roles("superadmin"))
    // user.role     = "superadmin"    (from the JWT payload)
    // .includes() returns true if the user's role is one of the allowed roles.
    // Return true → endpoint runs. Return false → 403 Forbidden.
    return requiredRoles.includes(user.role);
  }
}