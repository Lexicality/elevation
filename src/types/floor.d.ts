import type { EventEmitter } from "unobservable";

interface FloorEvents {
    /**
     * Triggered when someone has pressed the up button at a floor. Note that
     * passengers will press the button again if they fail to enter an elevator.
     */
    up_button_pressed: () => void;
    /**
     * Triggered when someone has pressed the down button at a floor. Note that
     * passengers will press the button again if they fail to enter an elevator.
     */
    down_button_pressed: () => void;
}

export const enum ButtonState {
    Active = "activated",
    Inactive = "",
}

export interface IFloor extends EventEmitter<FloorEvents> {
    /**
     * Gets the floor number of the floor object.
     */
    floorNum(): number;

    /**
     * Secret interface
     */
    readonly buttonStates: {
        up: ButtonState;
        down: ButtonState;
    };
}
