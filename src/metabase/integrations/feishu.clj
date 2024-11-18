(ns metabase.integrations.feishu
  (:require
   [clj-http.client :as http]
   [clojure.string :as str]
   [metabase.api.common :as api]
   [metabase.models.permissions-group :as perms-group :refer [PermissionsGroup]]
   [metabase.models.permissions-group-membership :refer [PermissionsGroupMembership]]
   [metabase.models.setting :as setting :refer [defsetting]]
   [metabase.models.user :as user :refer [User]]
   [metabase.util :as u]
   [metabase.util.i18n :refer [deferred-tru tru]]
   [metabase.util.log :as log]
   [metabase.util.malli :as mu]
   [metabase.util.malli.schema :as ms]
   [toucan2.core :as t2]))

;; Settings for Feishu configuration
(defsetting feishu-auth-app-id
  (deferred-tru "App ID for Feishu Sign-In.")
  :visibility :public
  :encryption :when-encryption-key-set
  :audit      :getter)

(defsetting feishu-auth-app-secret
  (deferred-tru "App Secret for Feishu Sign-In.")
  :visibility :public
  :encryption :when-encryption-key-set
  :audit      :getter)

(defsetting feishu-auth-configured
  (deferred-tru "Is Feishu Sign-In configured?")
  :type   :boolean
  :setter :none
  :getter (fn [] (boolean (and (feishu-auth-app-id) (feishu-auth-app-secret)))))


(defsetting feishu-auth-enabled
  (deferred-tru "Is Feishu Sign-in currently enabled?")
  :visibility :public
  :type       :boolean
  :audit      :getter
  :getter     (fn []
                (if-some [value (setting/get-value-of-type :boolean :feishu-auth-enabled)]
                  value
                  (boolean (and (feishu-auth-app-id) (feishu-auth-app-secret)))))
  :setter     (fn [new-value]
                (if-let [new-value (boolean new-value)]
                  (if-not (and (feishu-auth-app-id) (feishu-auth-app-secret))
                    (throw (ex-info (tru "Feishu Sign-In is not configured. Please set the App ID and App Secret first.")
                                  {:status-code 400}))
                    (setting/set-value-of-type! :boolean :feishu-auth-enabled new-value))
                  (setting/set-value-of-type! :boolean :feishu-auth-enabled new-value))))

(def ^:private feishu-app-access-token-url "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal")
(def ^:private feishu-oidc-access-token-url "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token")
(def ^:private feishu-user-info-url "https://open.feishu.cn/open-apis/authen/v1/user_info")
(def ^:private feishu-user-v3-base-url "https://open.feishu.cn/open-apis/contact/v3/users/")

(defn- fetch-app-access-token
  "Get app_access_token for subsequent API calls"
  []
  (let [response (http/post feishu-app-access-token-url
                           {:form-params {:app_id (feishu-auth-app-id)
                                        :app_secret (feishu-auth-app-secret)}
                            :as :json})]
    (when-not (= (:status response) 200)
      (throw (ex-info (tru "Failed to get Feishu app access token.")
                     {:status-code 400})))
    (get-in response [:body :app_access_token])))

(defn- fetch-access-token
  "Exchange authorization code for access token"
  [code]
  (let [app-access-token (fetch-app-access-token)
        response (http/post feishu-oidc-access-token-url
                           {:form-params {:grant_type "authorization_code"
                                        :code code}
                            :headers {"Authorization" (str "Bearer " app-access-token)}
                            :as :json})]
    (when-not (= (:status response) 200)
      (throw (ex-info (tru "Invalid Feishu Sign-In token.")
                     {:status-code 400})))
    (get-in response [:body :data :access_token])))

(defn- get-user-info
  "Fetch user information using access token"
  [access-token]
  (let [basic-response (http/get feishu-user-info-url
                                {:headers {"Authorization" (str "Bearer " access-token)}
                                 :as :json})
        _ (when-not (= (:status basic-response) 200)
            (throw (ex-info (tru "Failed to get user info from Feishu")
                          {:status-code 400})))
        basic-info (get basic-response :body)
        user-id (get-in basic-info [:data :user_id])

        ;; Fetch additional user details including department info using user_id
        detailed-response (http/get (str feishu-user-v3-base-url user-id)
                                  {:headers {"Authorization" (str "Bearer " access-token)}
                                   :query-params {"user_id_type" "user_id"
                                                "department_id_type" "open_department_id"}
                                   :as :json})
        _ (when-not (= (:status detailed-response) 200)
            (throw (ex-info (tru "Failed to get detailed user info from Feishu")
                          {:status-code 400})))
        _ (log/infof "detailed-response.body.data.user.department_path: %s" (get-in detailed-response [:body :data :user :department_path]))
        dept-names (some->> (get-in detailed-response [:body :data :user :department_path])
                           (map (fn [dept]
                                  (log/infof "dept: %s" dept)
                                  (get-in dept [:department_name :name])))
                           (filter some?)
                           vec)]
    (log/infof "dept-names: %s" dept-names)
    (-> basic-info
        (assoc-in [:data :department_names] dept-names))))

(mu/defn- feishu-auth-fetch-or-create-user! :- (ms/InstanceOf User)
  [user-info]
  (log/infof "user-info: %s" user-info)
  (let [{:keys [name email department_names]} (:data user-info)
        last-name (subs name 0 1)
        first-name (subs name 1)
        existing-user (t2/select-one [User :id :email :last_login :first_name :last_name]
                                   :%lower.email (u/lower-case-en email))
        user (if existing-user
               existing-user
               (user/create-new-feishu-auth-user! {:first_name first-name
                                                  :last_name last-name
                                                  :email email}))]

    ;; Create department groups if they don't exist and add user to them
    (doseq [dept-name department_names]
      (let [group-name (str/join "/" ["智谱" dept-name])
            existing-group (t2/select-one PermissionsGroup :name group-name)
            group (or existing-group
                     (t2/insert-returning-instance! PermissionsGroup
                                                  :name group-name))]
        ;; Add user to group if not already a member
        (when-not (t2/exists? PermissionsGroupMembership
                             :group_id (:id group)
                             :user_id (:id user))
          (t2/insert! PermissionsGroupMembership
                     :group_id (:id group)
                     :user_id (:id user)))))
    user))

(defn do-feishu-auth
  "Perform Feishu authentication"
  [{{:keys [code]} :body, :as _request}]
  (when-not (feishu-auth-enabled)
    (throw (ex-info (tru "Feishu authentication is not enabled")
                   {:status-code 400})))
  (let [access-token (fetch-access-token code)
        user-info    (get-user-info access-token)]
    (log/infof "Successfully authenticated Feishu user: %s" (get-in user-info [:data :name]))
    (api/check-500 (feishu-auth-fetch-or-create-user! user-info))))
