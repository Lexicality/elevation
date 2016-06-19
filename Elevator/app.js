var Elevation;
(function (Elevation) {
    (function (Direction) {
        Direction[Direction["Up"] = 0] = "Up";
        Direction[Direction["Resting"] = 1] = "Resting";
        Direction[Direction["Down"] = 2] = "Down";
    })(Elevation.Direction || (Elevation.Direction = {}));
    var Direction = Elevation.Direction;
    function todir(direction) {
        if (direction == "up")
            return Direction.Up;
        else if (direction == "down")
            return Direction.Down;
        return Direction.Resting;
    }
    function dirto(direction) {
        if (direction == Direction.Up)
            return "up";
        else if (direction == Direction.Down)
            return "down";
        return "resting";
    }
    class Elevator {
        constructor(elevator, floors) {
            this.elevator = elevator;
            this.idle = false;
            this.direction = Direction.Resting;
            // Where we're going to next
            this.destination = -1;
            // This assumes floor[0] = 0 and floor[n] = n
            var nfloors = floors.length;
            this.restingFloor = Math.floor(nfloors / 2);
            elevator.on("idle", this.onIdle.bind(this));
            elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
            elevator.on("passing_floor", this.onPassFloor.bind(this));
            elevator.on("stopped_at_floor", this.onArrive.bind(this));
        }
        // The last floor the elevator went past. If stationary, the floor we're at.
        get floor() {
            return this.elevator.currentFloor();
        }
        goToFloor(floor, override = false) {
            if (this.idle)
                override = true;
            if (!override && this.elevator.destinationQueue.indexOf(floor) !== -1)
                return;
            if (override || this.elevator.destinationQueue.length == 0) {
                this.setDestination(floor);
                console.warn("Going to %d directly", floor);
                this.elevator.goToFloor(floor, true);
            }
            else {
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
        requestGoingUp(floor) {
            console.info("Request to go up to floor %d!", floor);
            this.goToFloor(floor);
        }
        requestGoingDown(floor) {
            console.info("Request to go down to floor %d!", floor);
            this.goToFloor(floor);
        }
        setDestination(floor) {
            if (floor == this.floor)
                this.direction = Direction.Resting;
            else if (floor > this.floor)
                this.direction = Direction.Up;
            else
                this.direction = Direction.Down;
            var e = this.elevator;
            // Indicators turned off due to passengers
            //e.goingDownIndicator(this.direction == Direction.Down);
            //e.goingUpIndicator(this.direction == Direction.Up);
            this.destination = floor;
            console.info("Destination is now %d, we are at %d. We are going %s!", floor, this.floor, dirto(this.direction));
        }
        sortUp(a, b) {
            var f = this.floor;
            if (a < f) {
                if (b > f)
                    return 1;
                if (b > a)
                    return 1;
                return -1;
            }
            else if (a < b) {
                return -1;
            }
            return 1;
        }
        sortDown(a, b) {
            var f = this.floor;
            if (b > f) {
                if (a < f)
                    return -1;
                if (a < b)
                    return -1;
            }
            else if (a > b) {
                return -1;
            }
            return 1;
        }
        onIdle() {
            console.info("Idle!");
            if (!this.idle) {
                this.goToFloor(this.restingFloor);
                this.idle = true;
            }
        }
        onFloorRequest(floor) {
            console.info("Internal floor req for %d", floor);
            // TODO
            this.goToFloor(floor);
        }
        onPassFloor(floor, _direction) {
            console.log("Passing floor %d going %s", floor, _direction);
            var direction = todir(_direction);
            //this.floor = floor;
            // TODO
        }
        onArrive(floor) {
            console.log("Arrived at floor %s", floor);
            //this.floor = floor;
            if (this.elevator.destinationQueue.length > 0) {
                this.destination = this.elevator.destinationQueue[0];
                this.setDestination(this.destination);
            }
            // todo
        }
    }
    class ElevatorControl {
        constructor() {
            this.elevators = [];
        }
        init(elevators, floors) {
            elevators.forEach((elevator) => {
                this.elevators.push(new Elevator(elevator, floors));
            });
            // FIXME
            floors.forEach((floor, i) => {
                floor.on("up_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingUp(i)));
                floor.on("down_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingDown(i)));
            });
        }
        update(dt, elevators, floors) {
            // We normally don't need to do anything heree
        }
    }
    Elevation.ElevatorControl = ElevatorControl;
})(Elevation || (Elevation = {}));
var test;
test = new Elevation.ElevatorControl();
