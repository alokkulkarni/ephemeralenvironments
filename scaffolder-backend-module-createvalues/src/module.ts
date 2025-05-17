import { createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint  } from '@backstage/plugin-scaffolder-node/alpha';
import { createValuesAction } from "./actions/createValues";

/**
 * A backend module that registers the 'create:values' action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'createvalues-action',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint
      },
      async init({ scaffolderActions}) {
        scaffolderActions.addActions(createValuesAction());
      }
    });
  },
})
