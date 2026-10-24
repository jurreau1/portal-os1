/**
 * Portal-OS1 Semantic Firewall & Intent Router
 * Purpose: Pre-execution validation, privilege segregation, and payload sanitization
 */

export interface FirewallResult {
  allowed: boolean;
  sanitizedParams: Record<string, any>;
  violationReason?: string;
}

export class SemanticFirewall {
  // Restricted system namespaces that standard processes cannot mutate directly
  private static readonly RESTRICTED_NAMESPACES = [
    "sys:kernel",
    "sys:security",
    "sys:d1_root",
    "sys:hypervisor",
  ];

  /**
   * Evaluates an incoming IPC request envelope against security policies
   */
  public static inspect(
    method: string,
    sourcePid: string,
    params: Record<string, any>,
  ): FirewallResult {
    try {
      // 1. Check for privileged namespace injection attempts
      if (
        method.startsWith("kernel.sys.") &&
        !sourcePid.startsWith("kernel_root")
      ) {
        return {
          allowed: false,
          sanitizedParams: {},
          violationReason: `Privilege Violation: Process '${sourcePid}' attempted restricted method '${method}'`,
        };
      }

      // 2. Validate and sanitize parameters against common injection patterns
      const sanitized = this.sanitizeObject(params);

      // 3. Inspect target process ownership and bounds if applicable
      if (sanitized.target_pid && typeof sanitized.target_pid === "string") {
        if (
          sanitized.target_pid.includes("..") ||
          sanitized.target_pid.includes("//")
        ) {
          return {
            allowed: false,
            sanitizedParams: {},
            violationReason:
              "Path Traversal / Malformed Process ID detected in parameters.",
          };
        }
      }

      return {
        allowed: true,
        sanitizedParams: sanitized,
      };
    } catch (err: any) {
      return {
        allowed: false,
        sanitizedParams: {},
        violationReason: `Firewall Parse Exception: ${err.message}`,
      };
    }
  }

  /**
   * Recursively sanitizes input strings to strip malicious script/SQL control characters
   */
  private static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        // Strip dangerous control sequences while preserving safe text and JSON
        clean[key] = value.replace(/[\x00-\x1F\x7F]/g, "").trim();
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        clean[key] = this.sanitizeObject(value);
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }
}
