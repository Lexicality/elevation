const enum Direction {
    Up = "up",
    Stopped = "stopped",
    Down = "down",
}
type MovingDirection = Direction.Up | Direction.Down;

type EventManifest<L> = {
    [E in keyof L]: (...args: any[]) => void;
};

interface EventEmitter<Events extends EventManifest<Events>> {
    /**
     * Listen to the given event and execute the callback each time an event is triggered.
     */
    on<E extends keyof Events>(event: E, cback: Events[E]): this;
    /**
     * Listen to the given event and execute the callback at most once
     */
    one<E extends keyof Events>(event: E, cback: Events[E]): this;
    /**
     * Removes the given callback listening to the event
     */
    off<E extends keyof Events>(event: E, cback: Events[E]): this;
    /**
     * Removes the given event listeners.
     */
    off<E extends keyof Events>(event: E): this;
    /**
     * Removes all listeners from all event types.
     */
    off(event: "*"): this;
    /**
     * Removes the specific callback function called on all the events
     */
    off(event: "*", cback: (...args: any[]) => void): this;
    /**
     * Execute all callback functions that listen to the given event.
     */
    trigger<E extends keyof Events>(
        event: E,
        ...args: Parameters<Events[E]>
    ): this;
}

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

interface IElevator extends EventEmitter<ElevatorEvents> {
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

interface IFloor extends EventEmitter<FloorEvents> {
    /**
     * Gets the floor number of the floor object.
     */
    floorNum(): number;
}

class Elevator {
    private restingFloor: number;
    private idle = false;

    public direction: Direction = Direction.Stopped;
    // The last floor the elevator went past. If stationary, the floor we're at.
    get floor(): number {
        return this.elevator.currentFloor();
    }
    // Where we're going to next
    public destination = -1;

    constructor(private elevator: IElevator, floors: IFloor[]) {
        // This assumes floor[0] = 0 and floor[n] = n
        let nfloors = floors.length;
        this.restingFloor = Math.floor(nfloors / 2);

        elevator.on("idle", this.onIdle.bind(this));
        elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
        elevator.on("passing_floor", this.onPassFloor.bind(this));
        elevator.on("stopped_at_floor", this.onArrive.bind(this));
    }
    goToFloor(floor: number, override = false): void {
        if (this.idle) override = true;
        if (!override && this.elevator.destinationQueue.indexOf(floor) !== -1)
            return;
        if (override || this.elevator.destinationQueue.length == 0) {
            this.setDestination(floor);
            console.warn("Going to %d directly", floor);
            this.elevator.goToFloor(floor, true);
        } else {
            console.info("Inserting %d into the queue", floor);
            this.elevator.destinationQueue.push(floor);
            if (this.direction == Direction.Up)
                this.elevator.destinationQueue.sort(this.sortUp.bind(this));
            else this.elevator.destinationQueue.sort(this.sortDown.bind(this));
            this.elevator.checkDestinationQueue();
            console.info(
                "Destination queue is now: %o",
                this.elevator.destinationQueue,
            );
            this.setDestination(this.elevator.destinationQueue[0]);
        }
        this.idle = false;
    }
    requestGoingUp(floor: number) {
        console.info("Request to go up to floor %d!", floor);
        this.goToFloor(floor);
    }
    requestGoingDown(floor: number) {
        console.info("Request to go down to floor %d!", floor);
        this.goToFloor(floor);
    }

    private setDestination(floor: number): void {
        if (floor == this.floor) this.direction = Direction.Stopped;
        else if (floor > this.floor) this.direction = Direction.Up;
        else this.direction = Direction.Down;
        let e = this.elevator;
        // Indicators turned off due to passengers
        //e.goingDownIndicator(this.direction == Direction.Down);
        //e.goingUpIndicator(this.direction == Direction.Up);
        this.destination = floor;
        console.info(
            "Destination is now %d, we are at %d. We are going %s!",
            floor,
            this.floor,
            this.direction,
        );
    }

    private sortUp(a: number, b: number): number {
        let f = this.floor;
        if (a < f) {
            if (b > f) return 1;
            if (b > a) return 1;
            return -1;
        } else if (a < b) {
            return -1;
        }
        return 1;
    }
    private sortDown(a: number, b: number): number {
        let f = this.floor;
        if (b > f) {
            if (a < f) return -1;
            if (a < b) return -1;
        } else if (a > b) {
            return -1;
        }
        return 1;
    }

    private onIdle() {
        console.info("Idle!");
        if (!this.idle) {
            this.goToFloor(this.restingFloor);
            this.idle = true;
        }
    }
    private onFloorRequest(floor: number) {
        console.info("Internal floor req for %d", floor);
        // TODO
        this.goToFloor(floor);
    }
    private onPassFloor(floor: number, _direction: MovingDirection) {
        console.log("Passing floor %d going %s", floor, _direction);
        //this.floor = floor;
        // TODO
    }
    private onArrive(floor: number) {
        console.log("Arrived at floor %s", floor);
        //this.floor = floor;
        if (this.elevator.destinationQueue.length > 0) {
            this.destination = this.elevator.destinationQueue[0];
            this.setDestination(this.destination);
            // todo
        }
        // todo
    }
}

class ElevatorControl {
    private elevators: Elevator[] = [];
    init(elevators: IElevator[], floors: IFloor[]) {
        elevators.forEach((elevator: IElevator) => {
            this.elevators.push(new Elevator(elevator, floors));
        });
        // FIXME
        floors.forEach((floor, i) => {
            floor.on("up_button_pressed", () =>
                this.elevators.forEach((elevator) =>
                    elevator.requestGoingUp(i),
                ),
            );
            floor.on("down_button_pressed", () =>
                this.elevators.forEach((elevator) =>
                    elevator.requestGoingDown(i),
                ),
            );
        });
    }
    update(dt: number, elevators: IElevator[], floors: IFloor[]) {
        // We normally don't need to do anything heree
    }
}

let test: ElevatorControl;
test = new ElevatorControl();
