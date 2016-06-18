interface IElevator {
    // Queue the elevator to go to specified floor number. If you specify true as second argument, the elevator will go to that floor directly, and then go to any other queued floors.
    goToFloor(floor: number): void;
    goToFloor(floor: number, directly: boolean): void;
    // Clear the destination queue and stop the elevator if it is moving. Note that you normally don't need to stop elevators - it is intended for advanced solutions with in-transit rescheduling logic.
    stop(): void;
    // Gets the floor number that the elevator currently is on.
    currentFloor(): number;
    // Gets or sets the going up indicator, which will affect passenger behaviour when stopping at floors.
    goingUpIndicator(): boolean;
    goingUpIndicator(enabled: boolean): void;
    // Gets or sets the going down indicator, which will affect passenger behaviour when stopping at floors.
    goingDownIndicator(): boolean;
    goingDownIndicator(enabled: boolean): void;
    // Gets the load factor of the elevator. 0 means empty, 1 means full. Varies with passenger weights, which vary - not an exact measure.
    loadFactor(): number;
    // The current destination queue, meaning the floors the elevator is scheduled to go to. Can be modified and emptied if desired. Note that you need to call checkDestinationQueue() for the change to take effect immediately.
    destinationQueue: number[];
    // Checks the destination queue for any new destinations to go to. Note that you only need to call this if you modify the destination queue explicitly.
    checkDestinationQueue(): void;
    // Event Handler
    on(event: string, cback: Function): void;
}
interface IFloor {
    // Gets the floor number of the floor object.
    floorNum(): number;
    // Event Handler
    on(event: string, cback: Function): void;
}

module Elevation {
    export enum Direction {
        Up,
        Resting,
        Down,
    }
    function todir(direction: string): Direction {
        if (direction == "up")
            return Direction.Up;
        else if (direction == "down")
            return Direction.Down;
        return Direction.Resting;
    }
    function dirto(direction: Direction): string {
        if (direction == Direction.Up)
            return "up";
        else if (direction == Direction.Down)
            return "down";
        return "resting";
    }
    class Elevator {
        private restingFloor: number;
        private idle: boolean = false;

        public direction: Direction = Direction.Resting;
        // The last floor the elevator went past. If stationary, the floor we're at.
        get floor(): number {
            return this.elevator.currentFloor();
        }
        // Where we're going to next
        public destination: number = -1;

        constructor(private elevator: IElevator, floors: IFloor[]) {
            // This assumes floor[0] = 0 and floor[n] = n
            var nfloors = floors.length;
            this.restingFloor = Math.floor(nfloors / 2);

            elevator.on("idle", this.onIdle.bind(this));
            elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
            elevator.on("passing_floor", this.onPassFloor.bind(this));
            elevator.on("stopped_at_floor", this.onArrive.bind(this));
        }
        goToFloor(floor: number, override: boolean = false): void {
            if (this.idle)
                override = true;
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
                else
                    this.elevator.destinationQueue.sort(this.sortDown.bind(this));
                this.elevator.checkDestinationQueue();
                console.info("Destination queue is now: %o", this.elevator.destinationQueue);
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
            if (floor == this.floor)
                this.direction = Direction.Resting;
            else if (floor > this.floor)
                this.direction = Direction.Up;
            else
                this.direction = Direction.Down;
            var e = this.elevator
            // Indicators turned off due to passengers
            //e.goingDownIndicator(this.direction == Direction.Down);
            //e.goingUpIndicator(this.direction == Direction.Up);
            this.destination = floor;
            console.info("Destination is now %d, we are at %d. We are going %s!", floor, this.floor, dirto(this.direction));
        }

        private sortUp(a: number, b: number): number {
            var f = this.floor;
            if (a < f) {
                if (b > f)
                    return 1;
                if (b > a)
                    return 1;
                return -1;
            } else if (a < b) {
                return -1;
            }
            return 1;
        }
        private sortDown(a: number, b: number): number {
            var f = this.floor;
            if (b > f) {
                if (a < f)
                    return -1;
                if (a < b)
                    return -1;
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
        private onPassFloor(floor: number, _direction: string) {
            console.log("Passing floor %d going %s", floor, _direction);
            var direction = todir(_direction);
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

    export class ElevatorControl {
        private elevators: Elevator[] = [];
        init(elevators: IElevator[], floors: IFloor[]) {
            elevators.forEach((elevator: IElevator) => {
                this.elevators.push(new Elevator(elevator, floors));
            });
            // FIXME
            floors.forEach((floor, i) => {
                floor.on("up_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingUp(i)));
                floor.on("down_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingDown(i)));
            });
        }
        update(dt: number, elevators: IElevator[], floors: IFloor[]) {
            // We normally don't need to do anything heree
        }
    }
}

var test: Elevation.ElevatorControl;
test = new Elevation.ElevatorControl();
