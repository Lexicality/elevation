import { Direction, IElevator, MovingDirection } from "./types/elevator";
import { IFloor } from "./types/floor";

class Elevator extends unobservable.Observable<{}> {
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
        super();
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

let test = new ElevatorControl();

// The game reads our exports
export const init = test.init.bind(test);
export const update = test.update.bind(test);
