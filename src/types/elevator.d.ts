import type { EventEmitter } from "./event-emitter";

export const enum Direction {
    Up = "up",
    Stopped = "stopped",
    Down = "down",
}
export type MovingDirection = Direction.Up | Direction.Down;

interface ElevatorEvents {
    /**
     * Triggered when the elevator has completed all its tasks and is not doing anything.
     */
    idle: () => void;
    /**
     * Triggered when a passenger has pressed a button inside the elevator.
     */
    floor_button_pressed: (floorNum: number) => void;
    /**
     * Triggered slightly before the elevator will pass a floor. A good time to
     * decide whether to stop at that floor. Note that this event is not
     * triggered for the destination floor.
     */
    passing_floor: (floorNum: number, direction: MovingDirection) => void;
    /**
     * Triggered when the elevator has arrived at a floor.
     */
    stopped_at_floor: (floorNum: number) => void;
}

export interface IElevator extends EventEmitter<ElevatorEvents> {
    /**
     * Queue the elevator to go to specified floor number. If you specify true
     * as second argument, the elevator will go to that floor directly, and then
     * go to any other queued floors.
     */
    goToFloor(floor: number): void;
    goToFloor(floor: number, directly: boolean): void;
    /**
     * Clear the destination queue and stop the elevator if it is moving. Note
     * that you normally don't need to stop elevators - it is intended for
     * advanced solutions with in-transit rescheduling logic. Also, note that
     * the elevator will probably not stop at a floor, so passengers will not
     * get out.
     */
    stop(): void;
    /**
     * Gets the floor number that the elevator currently is on.
     */
    currentFloor(): number;
    /**
     * Gets or sets the going up indicator, which will affect passenger
     * behaviour when stopping at floors.
     */
    goingUpIndicator(): boolean;
    goingUpIndicator(enabled: boolean): void;
    /**
     * Gets or sets the going down indicator, which will affect passenger
     * behaviour when stopping at floors.
     */
    goingDownIndicator(): boolean;
    goingDownIndicator(enabled: boolean): void;
    /**
     * Gets the maximum number of passengers that can occupy the elevator at the same time.
     */
    maxPassengerCount(): number;
    /**
     * Gets the load factor of the elevator. 0 means empty, 1 means full. Varies
     * with passenger weights, which vary - not an exact measure.
     */
    loadFactor(): number;
    /**
     * Gets the direction the elevator is currently going to move toward.
     */
    destinationDirection(): Direction;
    /**
     * The current destination queue, meaning the floors the elevator is
     * scheduled to go to. Can be modified and emptied if desired. Note that you
     * need to call checkDestinationQueue() for the change to take effect
     * immediately.
     */
    destinationQueue: number[];
    /**
     * Checks the destination queue for any new destinations to go to. Note that
     * you only need to call this if you modify the destination queue
     * explicitly.
     */
    checkDestinationQueue(): void;
    /**
     * Gets the currently pressed floor numbers as an array.
     */
    getPressedFloors(): number[];
}
