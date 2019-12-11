import {
  ActionConstraints,
  AnyMiddlewareArgs,
  App,
  ConversationStore,
  Middleware,
  SlackAction,
} from '@slack/bolt';
import { getTypeAndConversation } from '@slack/bolt/dist/helpers';
import { WebClient } from '@slack/web-api';
import shortid from 'shortid';

import {
  InteractionActionConstraints,
  InteractionController,
  InteractionFlowActionMiddlewareArgs,
  InteractionFlowSlashCommandMiddlewareArgs,
} from './types';

export class InteractionFlow<FlowState = unknown> {
  private static idSep = '_';

  private static interactionSep = ':::';

  private static flowNames: string[] = [];

  private app: App;

  private readonly name: string;

  public client: WebClient;

  private interactionIds: string[] = [];

  constructor(
    name: string,
    app: App,
    controller: InteractionController<FlowState>,
  ) {
    if (InteractionFlow.flowNames.includes(name)) {
      throw new Error(`Interaction flow ${name} declared twice`);
    }

    InteractionFlow.flowNames.push(name);

    this.name = name;
    this.app = app;
    this.client = app.client;

    controller(this);
  }

  private joinIdParts = (...parts: (string | undefined)[]) =>
    parts.filter(part => part).join(InteractionFlow.idSep);

  private getFlowId({ body }: AnyMiddlewareArgs) {
    if ('actions' in body) {
      const [flowId] = this.parseInteractionId(body.actions[0].action_id);
      return flowId;
    }
    const { conversationId } = getTypeAndConversation(body);
    return this.joinIdParts(this.name, conversationId, shortid.generate());
  }

  private parseInteractionId = (id: string) =>
    id.split(InteractionFlow.interactionSep);

  private interactionIdPattern = (id: string) =>
    new RegExp(
      this.createInteractionId(this.joinIdParts(this.name, '.*', '.*'), id),
    );

  private createInteractionId = (flowId: string, interactionId: string) =>
    [flowId, interactionId].join(InteractionFlow.interactionSep);

  private contextMiddleware: Middleware<AnyMiddlewareArgs> = args => {
    const { context, next } = args;
    const store = context.interactionFlowStore as ConversationStore;
    const flowId = this.getFlowId(args);

    args.context.setState = (state: FlowState, expiresAt?: number) =>
      store.set(flowId, state, expiresAt);

    args.context.interactionIds = this.interactionIds.reduce(
      (map, actionId) => {
        map[actionId] = this.createInteractionId(flowId, actionId);

        return map;
      },
      {} as Record<string, string>,
    );

    next();
  };

  private setStateMiddleware: Middleware<AnyMiddlewareArgs> = async args => {
    const { next, context } = args;
    const store = context.interactionFlowStore as ConversationStore;
    const flowId = this.getFlowId(args);

    args.context.state = await store.get(flowId);

    next();
  };

  private injectListeners(
    ...listeners: Middleware<any>[]
  ): Middleware<AnyMiddlewareArgs>[] {
    return [
      // Coerce InteractionFlow middleware into bolt middleware.
      // Even context deserves good typing too.
      (this.contextMiddleware as unknown) as Middleware<AnyMiddlewareArgs>,
      ...((listeners as unknown[]) as Middleware<AnyMiddlewareArgs>[]),
    ];
  }

  public command(
    commandName: string,
    ...listeners: Middleware<
      InteractionFlowSlashCommandMiddlewareArgs<FlowState>
    >[]
  ): void {
    this.app.command(commandName, ...this.injectListeners(...listeners));
  }

  statefulAction<ActionType extends SlackAction>(
    actionIdOrConstraints: string | InteractionActionConstraints,
    ...listeners: Middleware<
      InteractionFlowActionMiddlewareArgs<FlowState, ActionType>
    >[]
  ): void {
    const constraints =
      typeof actionIdOrConstraints === 'string'
        ? { action_id: actionIdOrConstraints }
        : actionIdOrConstraints;

    const flowConstraints: ActionConstraints = {
      ...constraints,
      action_id: this.interactionIdPattern(constraints.action_id),
    };

    this.interactionIds.push(constraints.action_id);

    this.app.action<ActionType>(
      flowConstraints,
      ...this.injectListeners(this.setStateMiddleware, ...listeners),
    );
  }
}

export function interactionFlow<FlowState>(
  name: string,
  controller: InteractionController<FlowState>,
) {
  return (app: App) => new InteractionFlow<FlowState>(name, app, controller);
}

export const interactionFlowContext = (
  store: ConversationStore,
): Middleware<AnyMiddlewareArgs> => ({ context, next }) => {
  context.interactionFlowStore = store;

  next();
};
