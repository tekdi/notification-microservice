import { HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { RolePermission } from "./entities/rolePermissionMapping";
import APIResponse from "src/common/utils/response";
import { RolePermissionCreateDto } from "./dto/role-permission-create-dto";
import { Response } from "express";
import { LoggerUtil } from "src/common/logger/LoggerUtil";

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>
  ) {}

  //getPermission for middleware
  public async getPermissionForMiddleware(
    roleTitle: string,
    apiPath: string
  ): Promise<any> {
    try {
      let result = await this.rolePermissionRepository.find({
        where: { roleTitle: roleTitle, apiPath: apiPath },
      });
      LoggerUtil.log("Permission from DB: " + result);
      return result;
    } catch (error) {
      return error;
    }
  }

  public async getPermission(
    roleTitle: string,
    apiPath: string,
    response: Response
  ): Promise<any> {
    const apiId = "api.get.permission";
    try {
      let result = await this.rolePermissionRepository.find({
        where: { roleTitle: roleTitle, apiPath: apiPath },
      });
      console.log("result: ", result);
      return response
        .status(HttpStatus.OK)
        .json(APIResponse.success(apiId, result, HttpStatus.OK + ""));
    } catch (error) {
      return APIResponse.error(
        apiId,
        "Failed to fetch permission data.",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR + ""
      );
    }
  }

  //create permission
  public async createPermission(
    permissionCreateDto: RolePermissionCreateDto,
    response: Response
  ): Promise<any> {
    const apiId = "api.create.permission";
    try {
      let result = await this.rolePermissionRepository.save({
        roleTitle: permissionCreateDto.roleTitle,
        apiPath: permissionCreateDto.apiPath,
        requestType: permissionCreateDto.requestType,
        module: permissionCreateDto.module,
      });
      return response
        .status(HttpStatus.OK)
        .json(APIResponse.success(apiId, result, HttpStatus.OK + ""));
    } catch (error) {
      return APIResponse.error(
        apiId,
        "Failed to add permission data.",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR + ""
      );
    }
  }

  //update permission by permissionId
  public async updatePermission(
    rolePermissionCreateDto: RolePermissionCreateDto,
    response: Response
  ): Promise<any> {
    const apiId = "api.update.permission";
    try {
      let result = await this.rolePermissionRepository.update(
        rolePermissionCreateDto.rolePermissionId,
        {
          roleTitle: rolePermissionCreateDto.roleTitle,
          apiPath: rolePermissionCreateDto.apiPath,
          requestType: rolePermissionCreateDto.requestType,
          module: rolePermissionCreateDto.module,
        }
      );
      return response
        .status(HttpStatus.OK)
        .json(APIResponse.success(apiId, result, HttpStatus.OK + ""));
    } catch (error) {
      APIResponse.error(
        apiId,
        "Failed to update permission data.",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR + ""
      );
    }
  }

  //delete permission by permissionId
  public async deletePermission(rolePermissionId: string, res): Promise<any> {
    const apiId = "api.delete.permission";
    try {
      let result = await this.rolePermissionRepository.delete(rolePermissionId);
      return APIResponse.success(apiId, result, HttpStatus.OK + "");
    } catch (error) {
      return APIResponse.error(
        apiId,
        "Failed to delete permission data.",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR + ""
      );
    }
  }
}
