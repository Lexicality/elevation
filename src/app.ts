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
    // private restingFloor: number;

    public direction: Direction = Direction.Stopped;

    // The last floor the elevator went past. If stationary, the floor we're at.
    get floor(): number {
        return this.elevator.currentFloor();
    }

    get realDirection(): Direction {
        return this.elevator.destinationDirection();
    }

    private upQueue = new Set<number>();
    private downQueue = new Set<number>();
    private activeQueue = new Set<number>();

    constructor(private elevator: IElevator, _floors: IFloor[]) {
        // This assumes floor[0] = 0 and floor[n] = n
        // let nfloors = floors.length;
        // this.restingFloor = Math.floor(nfloors / 2);

        elevator.on("idle", this.onIdle.bind(this));
        elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
        elevator.on("passing_floor", this.onPassFloor.bind(this));
        elevator.on("stopped_at_floor", this.onArrive.bind(this));
    }

    private lights() {
        this.elevator.goingDownIndicator(this.direction == Direction.Down);
        this.elevator.goingUpIndicator(this.direction == Direction.Up);
    }

    private updateQueue() {
        if (this.direction == Direction.Up) {
            this.elevator.destinationQueue.sort((a, b) => a - b);
        } else {
            this.elevator.destinationQueue.sort((a, b) => b - a);
        }
        this.elevator.checkDestinationQueue();
    }

    goToFloor(floor: number) {
        console.info("GOTO (%s %d): %d", this.direction, this.floor, floor);
        if (this.direction != Direction.Stopped) {
            throw new Error("You should be stopped when calling this!!");
        }
        if (floor == this.floor) {
            // ??
            console.error("asked to go to the floor we're currently on?");
        }
        this.elevator.goToFloor(floor);
    }

    requestGoingUp(floor: number) {
        console.info("REQ UP (%s %d): %d", this.direction, this.floor, floor);
        let dir = this.direction;
        if (dir == Direction.Stopped) {
            console.log("not moving, serving directly");
            this.goToFloor(floor);
            this.direction = Direction.Up;
            this.lights();
        } else if (dir == Direction.Down) {
            console.log("we're going in the other direction, ignoring");
            this.upQueue.add(floor);
        } else if (floor <= this.floor) {
            console.log("that's a request for below us, ignoring for now");
            this.upQueue.add(floor);
        } else if (this.activeQueue.has(floor)) {
            console.log("already going there!");
        } else {
            console.log("adding to queue");
            this.elevator.destinationQueue.push(floor);
            this.updateQueue();
        }
    }

    requestGoingDown(floor: number) {
        console.info("REQ DOWN (%s %d): %d", this.direction, this.floor, floor);
        let dir = this.direction;
        if (dir == Direction.Stopped) {
            console.log("not moving, serving directly");
            this.goToFloor(floor);
            this.direction = Direction.Down;
            this.lights();
        } else if (dir == Direction.Up) {
            console.log("we're going in the other direction, ignoring");
            this.downQueue.add(floor);
        } else if (floor >= this.floor) {
            console.log("that's a request for above us, ignoring for now");
            this.downQueue.add(floor);
        } else if (this.activeQueue.has(floor)) {
            console.log("already going there!");
        } else {
            console.log("adding to queue");
            this.elevator.destinationQueue.push(floor);
            this.updateQueue();
        }
    }

    private onIdle() {
        console.info("IDLE (%s %d)", this.direction, this.floor);
        let dir = this.direction;
        if (dir == Direction.Up && this.downQueue.size > 0) {
            this.activeQueue = new Set(this.downQueue);
            this.elevator.destinationQueue = Array.from(this.downQueue);
            this.downQueue = new Set();
            this.direction = Direction.Down;
            this.updateQueue();
        } else if (dir == Direction.Down && this.upQueue.size > 0) {
            this.activeQueue = new Set(this.upQueue);
            this.elevator.destinationQueue = Array.from(this.upQueue);
            this.upQueue = new Set();
            this.direction = Direction.Up;
            this.updateQueue();
        } else if (this.downQueue.size > 0) {
            this.activeQueue = new Set(this.downQueue);
            this.elevator.destinationQueue = Array.from(this.downQueue);
            this.downQueue = new Set();
            this.direction = Direction.Down;
            this.updateQueue();
        } else if (this.upQueue.size > 0) {
            this.activeQueue = new Set(this.upQueue);
            this.elevator.destinationQueue = Array.from(this.upQueue);
            this.upQueue = new Set();
            this.direction = Direction.Up;
            this.updateQueue();
        } else {
            this.direction = Direction.Stopped;
        }
        this.lights();
        console.log("Was going %s, going to go %s now", dir, this.direction);
        console.dir(this.elevator.destinationQueue);
    }

    private onFloorRequest(floor: number) {
        console.info("INT REQ (%s %d): %d", this.direction, this.floor, floor);
        let curFloor = this.floor;
        if (floor < curFloor) {
            console.log("request for below, treating as a down req");
            this.requestGoingDown(floor);
            return;
        } else if (floor > curFloor) {
            console.log("request for above, treating as an up req");
            this.requestGoingUp(floor);
            return;
        }
        console.warn("request for current floor");
        // Not entirely sure about this one
        let dir = this.direction;
        if (dir == Direction.Stopped) {
            console.warn("?? not moving");
            this.goToFloor(floor);
        } else if (dir == Direction.Up) {
            console.log(
                "?? can't stop at this floor any more, treating as down",
            );
            this.requestGoingDown(floor);
        } else {
            console.log("?? can't stop at this floor any more, treating as up");
            this.requestGoingUp(floor);
        }
    }

    private onPassFloor(floor: number, direction: MovingDirection) {
        console.info(
            "PASS (%s %d): %d %s",
            this.direction,
            this.floor,
            floor,
            direction,
        );
    }

    private onArrive(floor: number) {
        console.log("ARRIVE (%s %d): %d", this.direction, this.floor, floor);
        this.activeQueue.delete(floor);
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

    update(_dt: number, _elevators: IElevator[], _floors: IFloor[]) {
        // We normally don't need to do anything here
    }
}

// I don't entirely understand why it works, but in order to function correctly
// when eval'd the we need to define this on two lines
let test: ElevatorControl;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
test = new ElevatorControl();
