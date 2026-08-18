import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface IngestSiteContext {
  siteId: string;
  operatorId: string;
  operatorExternalId: string;
  credentialId: string;
  apiKeyPrefix: string;
}

export const IngestSite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IngestSiteContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.ingestSite as IngestSiteContext;
  },
);
