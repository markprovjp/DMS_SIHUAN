import { Module, Global } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { AiProviderService } from "./ai-provider.service";

@Global()
@Module({
  imports: [SettingsModule],
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiModule {}
