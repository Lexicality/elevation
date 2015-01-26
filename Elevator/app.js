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
            // This assumes floor[0] = 0 and floor[n] = n
            var nfloors = floors.length;
            this.restingFloor = Math.floor(nfloors / 2);

            elevator.on("idle", this.onIdle.bind(this));
            elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
            elevator.on("passing_floor", this.onPassFloor.bind(this));
            elevator.on("stopped_at_floor", this.onArrive.bind(this));
        }
        Elevator.prototype.goToFloor = function (floor, override) {
            if (typeof override === "undefined") { override = false; }
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
        };

        Elevator.prototype.setDestination = function (floor) {
            var e = this.elevator;
            e.goingDownIndicator(floor < this.floor);
            e.goingUpIndicator(floor > this.floor);
        };

        Elevator.prototype.onIdle = function () {
            console.info("Idle!");
            if (!this.idle) {
                this.goToFloor(this.restingFloor);
                this.idle = true;
            }
        };
        Elevator.prototype.onFloorRequest = function (floor) {
            console.log("Floor req for %d", floor);

            // TODO
            this.goToFloor(floor);
        };
        Elevator.prototype.onPassFloor = function (floor, _direction) {
            console.log("Passing floor %d going %s", floor, _direction);
            var direction = todir(_direction);
            this.floor = floor;
            // TODO
        };
        Elevator.prototype.onArrive = function (floor) {
            console.log("Arrived at floor %s", floor);
            this.floor = floor;
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
                var foo = function () {
                    return _this.elevators.forEach(function (elevator) {
                        return elevator.goToFloor(i);
                    });
                };
                floor.on("up_button_pressed", foo);
                floor.on("down_button_pressed", foo);
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
