import { ModifierBucketEditor } from "gurps/module/modifier-bucket/tooltip-window"

// eslint-disable-next-line quotes
declare module "gurps/module/modifier-bucket/bucket-app" {
  export class ModifierBucket extends Application {
    isTooltip: boolean
    editor: ModifierBucketEditor

    _onenter(event?: JQuery.MouseEnterEvent): void
  }
}
