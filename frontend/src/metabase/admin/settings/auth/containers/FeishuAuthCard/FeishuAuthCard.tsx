import { connect } from "react-redux";
import { t } from "ttag";

import { updateSettings } from "metabase/admin/settings/settings";
import { getSetting } from "metabase/selectors/settings";
import type { Dispatch, State } from "metabase-types/store";

import type { AuthCardProps } from "../../components/AuthCard";
import AuthCard from "../../components/AuthCard";
import { FEISHU_SCHEMA } from "../../constants";

type StateProps = Omit<AuthCardProps, "setting" | "onChange" | "onDeactivate">;
type DispatchProps = Pick<AuthCardProps, "onDeactivate">;

const mapStateToProps = (state: State): StateProps => ({
  type: "feishu",
  name: t`Feishu Sign-in`,
  title: t`Sign in with Feishu`,
  description: t`Allows users with existing Metabase accounts to login with a Feishu account that matches their email address in addition to their Metabase username and password.`,
  isConfigured: getSetting(state, "feishu-auth-enabled"),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  onDeactivate: () => dispatch(updateSettings(FEISHU_SCHEMA.getDefault())),
});

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default connect(mapStateToProps, mapDispatchToProps)(AuthCard);
