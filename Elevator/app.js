// Dummy IEFE due to reasons. Delete the first (
(function () {
})();

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
            return 0 /* Up */;
        else if (direction == "down")
            return 2 /* Down */;
        return 1 /* Resting */;
    }
    function dirto(direction) {
        if (direction == 0 /* Up */)
            return "up";
        else if (direction == 2 /* Down */)
            return "down";
        return "resting";
    }
    var Elevator = (function () {
        function Elevator(elevator, floors) {
            this.elevator = elevator;
            this.idle = false;
            this.direction = 1 /* Resting */;
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
        Object.defineProperty(Elevator.prototype, "floor", {
            // The last floor the elevator went past. If stationary, the floor we're at.
            get: function () {
                return this.elevator.currentFloor();
            },
            enumerable: true,
            configurable: true
        });

        Elevator.prototype.goToFloor = function (floor, override) {
            if (typeof override === "undefined") { override = false; }
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
                if (this.direction == 0 /* Up */)
                    this.elevator.destinationQueue.sort(this.sortUp.bind(this));
                else
                    this.elevator.destinationQueue.sort(this.sortDown.bind(this));
                this.elevator.checkDestinationQueue();
                console.info("Destination queue is now: %o", this.elevator.destinationQueue);
                this.setDestination(this.elevator.destinationQueue[0]);
            }
            this.idle = false;
        };
        Elevator.prototype.requestGoingUp = function (floor) {
            console.info("Request to go up to floor %d!", floor);
            this.goToFloor(floor);
        };
        Elevator.prototype.requestGoingDown = function (floor) {
            console.info("Request to go down to floor %d!", floor);
            this.goToFloor(floor);
        };

        Elevator.prototype.setDestination = function (floor) {
            if (floor == this.floor)
                this.direction = 1 /* Resting */;
            else if (floor > this.floor)
                this.direction = 0 /* Up */;
            else
                this.direction = 2 /* Down */;
            var e = this.elevator;

            // Indicators turned off due to passengers
            //e.goingDownIndicator(this.direction == Direction.Down);
            //e.goingUpIndicator(this.direction == Direction.Up);
            this.destination = floor;
            console.info("Destination is now %d, we are at %d. We are going %s!", floor, this.floor, dirto(this.direction));
        };

        Elevator.prototype.sortUp = function (a, b) {
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
        };
        Elevator.prototype.sortDown = function (a, b) {
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
        };

        Elevator.prototype.onIdle = function () {
            console.info("Idle!");
            if (!this.idle) {
                this.goToFloor(this.restingFloor);
                this.idle = true;
            }
        };
        Elevator.prototype.onFloorRequest = function (floor) {
            console.info("Internal floor req for %d", floor);

            // TODO
            this.goToFloor(floor);
        };
        Elevator.prototype.onPassFloor = function (floor, _direction) {
            console.log("Passing floor %d going %s", floor, _direction);
            var direction = todir(_direction);
            //this.floor = floor;
            // TODO
        };
        Elevator.prototype.onArrive = function (floor) {
            console.log("Arrived at floor %s", floor);

            //this.floor = floor;
            if (this.elevator.destinationQueue.length > 0) {
                this.destination = this.elevator.destinationQueue[0];
                this.setDestination(this.destination);
                // todo
            }
            // todo
        };
        return Elevator;
    })();

    var ElevatorControl = (function () {
        function ElevatorControl() {
            this.elevators = [];
        }
        ElevatorControl.prototype.init = function (elevators, floors) {
            var _this = this;
            elevators.forEach(function (elevator) {
                _this.elevators.push(new Elevator(elevator, floors));
            });

            // FIXME
            floors.forEach(function (floor, i) {
                floor.on("up_button_pressed", function () {
                    return _this.elevators.forEach(function (elevator) {
                        return elevator.requestGoingUp(i);
                    });
                });
                floor.on("down_button_pressed", function () {
                    return _this.elevators.forEach(function (elevator) {
                        return elevator.requestGoingDown(i);
                    });
                });
            });
        };
        ElevatorControl.prototype.update = function (dt, elevators, floors) {
            // We normally don't need to do anything heree
        };
        return ElevatorControl;
    })();
    Elevation.ElevatorControl = ElevatorControl;
})(Elevation || (Elevation = {}));

var test;
test = new Elevation.ElevatorControl();
// Delete the last )
