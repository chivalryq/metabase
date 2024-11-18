import { getIn } from "icepick";
import { useCallback, useEffect, useState } from "react";
import { t } from "ttag";

import ErrorBoundary from "metabase/ErrorBoundary";
import { useDispatch, useSelector } from "metabase/lib/redux";
import * as Urls from "metabase/lib/urls";
import { getSetting } from "metabase/selectors/settings";

import { loginFeishu } from "../../actions";
import { getFeishuClientId } from "../../selectors";

import {
  AuthError,
  AuthErrorRoot,
  FeishuButtonRoot,
  TextLink,
} from "./FeishuButton.styled";

interface FeishuButtonProps {
  redirectUrl?: string;
  isCard?: boolean;
}

interface CredentialResponse {
  code?: string;
}

// Mock Feishu components
const FeishuLogin = () => {
  const appId = useSelector(state => getSetting(state, "feishu-auth-app-id"));

  const handleClick = () => {
    // Construct Feishu OAuth URL
    const redirectUri = encodeURIComponent(
      window.location.origin + "/auth/login",
    );

    const state = Math.random().toString(36).substring(7); // Generate random state
    const authUrl =
      `https://open.feishu.cn/open-apis/authen/v1/index` +
      `?app_id=${appId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`;

    // Redirect to Feishu login page
    window.location.href = authUrl;
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "10px 20px",
        backgroundColor: "#4470f6", // Feishu brand color
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      {t`Sign in with Feishu`}
    </button>
  );
};

export const FeishuButton = ({ redirectUrl, isCard }: FeishuButtonProps) => {
  const clientId = useSelector(getFeishuClientId);
  const [errors, setErrors] = useState<string[]>([]);
  const dispatch = useDispatch();

  const handleLogin = useCallback(
    async ({ code = "" }: CredentialResponse) => {
      try {
        setErrors([]);
        await dispatch(loginFeishu({ code, redirectUrl })).unwrap();
      } catch (error) {
        setErrors(getErrors(error));
      }
    },
    [dispatch, redirectUrl],
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const _state = urlParams.get("state"); // Not used currently

    if (code) {
      handleLogin({ code });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleLogin]);

  const handleError = useCallback(() => {
    setErrors([
      t`There was an issue signing in with Feishu. Please contact an administrator.`,
    ]);
  }, []);

  return (
    <FeishuButtonRoot>
      {isCard && clientId ? (
        <ErrorBoundary>
          <FeishuLogin onSuccess={handleLogin} onError={handleError} />
        </ErrorBoundary>
      ) : (
        <TextLink to={Urls.login(redirectUrl)}>
          {t`Sign in with Feishu`}
        </TextLink>
      )}

      {errors.length > 0 && (
        <AuthErrorRoot>
          {errors.map((error, index) => (
            <AuthError key={index}>{error}</AuthError>
          ))}
        </AuthErrorRoot>
      )}
    </FeishuButtonRoot>
  );
};

const getErrors = (error: unknown): string[] => {
  const errors = getIn(error, ["data", "errors"]);
  return errors ? Object.values(errors) : [];
};
