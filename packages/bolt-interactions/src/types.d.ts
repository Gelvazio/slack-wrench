import {
  SlackAction,
  SlackActionMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';

import { InteractionFlow } from './interaction-flow';

type InteractionController<FlowState> = (
  flow: InteractionFlow<FlowState>,
) => void;

type InteractionFlowMiddlewareArgs<FlowState> = {
  context: Record<string, string> & {
    setState: (state: any, expiresAt?: number) => Promise<unknown>;
    state: FlowState;
  };
};

type InteractionFlowSlashCommandMiddlewareArgs<
  FlowState
> = InteractionFlowMiddlewareArgs<FlowState> & SlackCommandMiddlewareArgs;

type InteractionFlowActionMiddlewareArgs<
  FlowState,
  ActionType extends SlackAction = SlackAction
> = InteractionFlowMiddlewareArgs<FlowState> &
  SlackActionMiddlewareArgs<ActionType>;

type InteractionActionConstraints = {
  action_id: string;
  block_id?: string | RegExp;
  callback_id?: string | RegExp;
};
