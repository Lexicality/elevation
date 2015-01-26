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

// Dummy IEFE due to reasons. Delete the first (
(() => { })();

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
        private idle: boolean;

        public direction: Direction;
        // The last floor the elevator went past. If stationary, the floor we're at.
        public floor: number;
        // Where we're going to next
        public destination: number;


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
            // TODO
            console.log("Going to %d%s", floor, override ? ' directly' : '');
            if (override || this.elevator.destinationQueue.length == 0) {
                this.setDestination(floor);
            }
            this.elevator.goToFloor(floor, override);
            this.idle = false;
        }

        private setDestination(floor: number) {
            var e = this.elevator
            e.goingDownIndicator(floor < this.floor);
            e.goingUpIndicator(floor > this.floor);
        }

        private onIdle() {
            console.info("Idle!");
            if (!this.idle) {
                this.goToFloor(this.restingFloor);
                this.idle = true;
            }
        }
        private onFloorRequest(floor: number) {
            console.log("Floor req for %d", floor);
            // TODO
            this.goToFloor(floor);
        }
        private onPassFloor(floor: number, _direction: string) {
            console.log("Passing floor %d going %s", floor, _direction);
            var direction = todir(_direction);
            this.floor = floor;
            // TODO
        }
        private onArrive(floor: number) {
            console.log("Arrived at floor %s", floor);
            this.floor = floor;
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
                var foo = () => this.elevators.forEach((elevator) => elevator.goToFloor(i));
                floor.on("up_button_pressed", foo);
                floor.on("down_button_pressed", foo);
            });
        }
        update(dt: number, elevators: IElevator[], floors: IFloor[]) {
            // We normally don't need to do anything heree
        }
    }
}

var test: Elevation.ElevatorControl;
test = new Elevation.ElevatorControl();
// Delete the last )
