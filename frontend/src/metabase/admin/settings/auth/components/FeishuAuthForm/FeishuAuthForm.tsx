import { useMemo } from "react";
import { jt, t } from "ttag";
import _ from "underscore";

import { useDocsUrl } from "metabase/common/hooks";
import Breadcrumbs from "metabase/components/Breadcrumbs";
import ExternalLink from "metabase/core/components/ExternalLink";
import FormErrorMessage from "metabase/core/components/FormErrorMessage";
import FormInput from "metabase/core/components/FormInput";
import FormSubmitButton from "metabase/core/components/FormSubmitButton";
import { FormProvider } from "metabase/forms";
import type { SettingDefinition, Settings } from "metabase-types/api";

import { FEISHU_SCHEMA } from "../../constants";

import {
  FeishuForm,
  FeishuFormCaption,
  FeishuFormHeader,
} from "./FeishuAuthForm.styled";

const ENABLED_KEY = "feishu-auth-enabled";
const APP_ID_KEY = "feishu-auth-app-id";
const APP_SECRET_KEY = "feishu-auth-app-secret";

const BREADCRUMBS = [
  [t`Authentication`, "/admin/settings/authentication"],
  [t`Google Sign-In`],
];

export interface FeishuAuthFormProps {
  elements?: SettingDefinition[];
  settingValues?: Partial<Settings>;
  isEnabled: boolean;
  onSubmit: (settingValues: Partial<Settings>) => void;
}

const FeishuAuthForm = ({
  elements = [],
  settingValues = {},
  isEnabled,
  onSubmit,
}: FeishuAuthFormProps): JSX.Element => {
  const settings = useMemo(() => {
    return _.indexBy(elements, "key");
  }, [elements]);

  const initialValues = useMemo(() => {
    const values = FEISHU_SCHEMA.cast(settingValues, { stripUnknown: true });
    return { ...values, [ENABLED_KEY]: true };
  }, [settingValues]);

  // TODO: Metabase official docs are not available for Feishu yet
  const { url: docsUrl } = useDocsUrl("people-and-groups/feishu", {
    anchor: "enabling-feishu-sign-in",
  });

  return (
    <FormProvider
      initialValues={initialValues}
      enableReinitialize
      validationSchema={FEISHU_SCHEMA}
      validationContext={settings}
      onSubmit={onSubmit}
    >
      {({ dirty }) => (
        <FeishuForm disabled={!dirty}>
          <Breadcrumbs crumbs={BREADCRUMBS} />
          <FeishuFormHeader>{t`Sign in with Feishu`}</FeishuFormHeader>
          <FeishuFormCaption>
            {t`Allows users with existing Metabase accounts to login with a Feishu account that matches their email address in addition to their Metabase username and password.`}
          </FeishuFormCaption>
          <FeishuFormCaption>
            {jt`To allow users to sign in with Feishu you'll need to give Metabase a Feishu Developers console app ID and secret. It only takes a few steps and instructions on how to create a key can be found ${(
              <ExternalLink key="link" href={docsUrl}>
                {t`here`}
              </ExternalLink>
            )}.`}
          </FeishuFormCaption>
          <FormInput
            name={APP_ID_KEY}
            title={t`App ID`}
            placeholder={t`cli_xxxxxx`}
            {...getFormFieldProps(settings[APP_ID_KEY])}
          />
          <FormInput
            name={APP_SECRET_KEY}
            title={t`App Secret`}
            {...getFormFieldProps(settings[APP_SECRET_KEY])}
          />
          <FormSubmitButton
            title={isEnabled ? t`Save changes` : t`Save and enable`}
            primary
            disabled={!dirty}
          />
          <FormErrorMessage />
        </FeishuForm>
      )}
    </FormProvider>
  );
};

const getFormFieldProps = (setting?: SettingDefinition) => {
  if (setting?.is_env_setting) {
    return { placeholder: t`Using ${setting.env_name}`, readOnly: true };
  }
};

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default FeishuAuthForm;
