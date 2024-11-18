import { connect } from "react-redux";

import { getSetting } from "metabase/selectors/settings";
import type { State } from "metabase-types/store";

import { updateFeishuSettings } from "../../../settings";
import FeishuAuthForm from "../../components/FeishuAuthForm";

const mapStateToProps = (state: State) => ({
  isEnabled: getSetting(state, "feishu-auth-enabled"),
  isSsoEnabled: getSetting(state, "token-features").sso_feishu,
});

const mapDispatchToProps = {
  onSubmit: updateFeishuSettings,
};

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default connect(mapStateToProps, mapDispatchToProps)(FeishuAuthForm);
