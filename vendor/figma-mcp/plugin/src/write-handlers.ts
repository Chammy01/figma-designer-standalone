import { handleWriteCreateRequest } from "./write-create";
import { handleWriteModifyRequest } from "./write-modify";
import { handleWriteStyleRequest } from "./write-styles";
import { handleWriteVariableRequest } from "./write-variables";
import { handleWriteComponentRequest } from "./write-components";
import { handleWritePrototypeRequest } from "./write-prototype";
import { handleWritePageRequest } from "./write-page";
import { handleWriteHtmlRequest } from "./write-html";
// Sub-Project 2: agent toolkit overhaul (Categories A–H)
import { handleEditRequest } from "./edit";
import { handleValidationRequest } from "./validation";
import { handleLayoutRequest } from "./layout";
import { handleComponentV2Request } from "./components-v2";
import { handleStyleEcosystemRequest } from "./style-ecosystem";
import { handleExportV2Request } from "./export-v2";
import { handleSlideRequest } from "./slides";
import { handleDiagnosticsRequest, recordError } from "./diagnostics";

export { recordError };

export const handleWriteRequest = async (request: any) =>
  (await handleWriteCreateRequest(request)) ??
  (await handleWriteModifyRequest(request)) ??
  (await handleWriteStyleRequest(request)) ??
  (await handleWriteVariableRequest(request)) ??
  (await handleWriteComponentRequest(request)) ??
  (await handleWritePrototypeRequest(request)) ??
  (await handleWritePageRequest(request)) ??
  (await handleWriteHtmlRequest(request)) ??
  (await handleEditRequest(request)) ??
  (await handleValidationRequest(request)) ??
  (await handleLayoutRequest(request)) ??
  (await handleComponentV2Request(request)) ??
  (await handleStyleEcosystemRequest(request)) ??
  (await handleExportV2Request(request)) ??
  (await handleSlideRequest(request)) ??
  (await handleDiagnosticsRequest(request));
