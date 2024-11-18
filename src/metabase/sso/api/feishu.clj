(ns metabase.sso.api.feishu
  "/api/feishu endpoints"
  (:require
   [metabase.api.common :as api]
   [metabase.api.macros :as api.macros]
   [metabase.models.setting :as setting]
   [metabase.sso.settings :as sso.settings]
   [toucan2.core :as t2]))


(api.macros/defendpoint :put "/settings"
  "Update Feishu Sign-In related settings. You must be a superuser to do this."
  [_route-params
   _query-params
   {:keys [feishu-auth-app-id feishu-auth-app-secret feishu-auth-enabled]}
   :- [:map
       [:feishu-auth-app-id     {:optional true} [:maybe :string]]
       [:feishu-auth-app-secret {:optional true} [:maybe :string]]
       [:feishu-auth-enabled    {:optional true} [:maybe :boolean]]]]
  (api/check-superuser)
  (t2/with-transaction [_conn]
    (setting/set-many! {:feishu-auth-app-id     feishu-auth-app-id
                        :feishu-auth-app-secret  feishu-auth-app-secret})
    (sso.settings/feishu-auth-enabled! feishu-auth-enabled)))

