(ns metabase.api.feishu
  "/api/feishu endpoints"
  (:require
   [compojure.core :refer [PUT]]
   [metabase.api.common :as api]
   [metabase.integrations.feishu :as feishu]
   [metabase.models.setting :as setting]
   [toucan2.core :as t2]))

(api/defendpoint PUT "/settings"
  "Update Feishu Sign-In related settings. You must be a superuser to do this."
  [:as {{:keys [feishu-auth-app-id feishu-auth-app-secret feishu-auth-enabled]} :body}]
  {feishu-auth-app-id     [:maybe :string]
   feishu-auth-app-secret [:maybe :string]
   feishu-auth-enabled    [:maybe :boolean]}
  (api/check-superuser)
  (t2/with-transaction [_conn]
    (setting/set-many! {:feishu-auth-app-id     feishu-auth-app-id
                        :feishu-auth-app-secret  feishu-auth-app-secret})
    (feishu/feishu-auth-enabled! feishu-auth-enabled)))

(api/define-routes)
