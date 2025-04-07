import { HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import APIResponse from "src/common/utils/response";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { RolePermissionService } from "src/modules/permissionRbac/rolePermissionMapping/role-permission-mapping.service";

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    LoggerUtil.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    let role = "";
    if (req.headers.authorization) {
      role = this.getRole(req.headers.authorization);
    } else {
      role = "public";
    }
    const isPermissionValid = await this.checkPermissions(
      role,
      req.baseUrl,
      req.method
    );
    if (isPermissionValid) return next();
    else {
      return res
        .status(403)
        .json(
          APIResponse.error(
            "",
            "You do not have permission to access this resource",
            "You do not have permission to access this resource",
            HttpStatus.FORBIDDEN.toString()
          )
        );
    }
  }
  async checkPermissions(
    roleTitle: string,
    requestPath: string,
    requestMethod: string
  ) {
    const parts = requestPath.match(/[^/]+/g);
    let apiPath = "";
    if (roleTitle === "public") {
      apiPath = requestPath;
    } else {
      apiPath = this.getApiPaths(parts);
    }
    const allowedPermissions = await this.fetchPermissions(roleTitle, apiPath);
    return allowedPermissions.some((permission) =>
      permission.requestType.includes(requestMethod)
    );
  }
  getApiPaths(parts: string[]) {
    let apiPath = "";
    if (parts.length == 3) apiPath = `/${parts[0]}/${parts[1]}/*`;
    if (parts.length > 3) apiPath = `/${parts[0]}/${parts[1]}/${parts[2]}/*`;

    LoggerUtil.log("apiPath: ", apiPath);
    return apiPath;
  }
  async fetchPermissions(roleTitle: string, apiPath: string) {
    return await this.rolePermissionService.getPermissionForMiddleware(
      roleTitle,
      apiPath
    );
  }
  getRole(token: string) {
    const payloadBase64 = token.split(".")[1]; // Get the payload part
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8"); // Decode Base64
    const payload = JSON.parse(payloadJson); // Convert to JSON
    return payload.user_roles;
  }
}
