import { Actions, Blocks, Button, MdSection, User } from '@slack-wrench/blocks';

import { LunchTrainState } from '../lunch-train';

const StartTrain = (state: LunchTrainState, action: any) =>
  Blocks([
    MdSection(
      `Chew choo! ${User(state.conductor.id)} started a train ${state.text}.`,
    ),
    state.passengers.length > 0
      ? MdSection(
          `*Passengers*:\n${state.passengers
            .map(passenger => User(passenger.id))
            .join(', ')}`,
        )
      : null,
    Actions([Button('Board the Train', action.boardButton)]),
  ]);

export default StartTrain;
