import { updateIn } from "icepick";

import FeishuAuthCard from "metabase/admin/settings/auth/containers/FeishuAuthCard";
import FeishuSettingsForm from "metabase/admin/settings/auth/containers/FeishuAuthForm";
import MetabaseSettings from "metabase/lib/settings";
import {
  PLUGIN_ADMIN_SETTINGS_UPDATES,
  PLUGIN_AUTH_PROVIDERS,
  PLUGIN_IS_PASSWORD_USER,
} from "metabase/plugins";

PLUGIN_AUTH_PROVIDERS.push(providers => {
  const feishuProvider = {
    name: "feishu",
    Button: require("metabase/auth/components/FeishuButton").FeishuButton,
  };

  const isEnabled = MetabaseSettings.isFeishuAuthEnabled();
  return isEnabled ? [feishuProvider, ...providers] : providers;
});

PLUGIN_ADMIN_SETTINGS_UPDATES.push(sections => {
  return updateIn(sections, ["authentication", "settings"], settings => [
    ...settings,
    {
      key: "feishu-auth-enabled",
      description: null,
      noHeader: true,
      widget: FeishuAuthCard,
    },
  ]);
});

PLUGIN_ADMIN_SETTINGS_UPDATES.push(sections => ({
  ...sections,
  "authentication/feishu": {
    component: FeishuSettingsForm,
    settings: [
      { key: "feishu-auth-app-id" },
      { key: "feishu-auth-app-secret" },
    ],
  },
}));

PLUGIN_IS_PASSWORD_USER.push(user => !user.feishu_auth);
