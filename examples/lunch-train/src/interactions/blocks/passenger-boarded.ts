import { Actions, Blocks, Button, MdSection, User } from '@slack-wrench/blocks';

import { LunchTrainState } from '../lunch-train';

const PassengerBoarded = (state: LunchTrainState, action: any) =>
  Blocks([
    MdSection(
      `You've joined ${User(state.conductor.id)}'s train ${state.text}.`,
    ),
    state.passengers.length > 0
      ? MdSection(
          `*Passengers*:\n${state.passengers
            .map(passenger => User(passenger.id))
            .join(', ')}`,
        )
      : null,
    Actions([Button('Get Off Train', action.getOffTrain)]),
  ]);

export default PassengerBoarded;
