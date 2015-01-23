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
    var Elevator = (function () {
        function Elevator(elevator, floors) {
            this.elevator = elevator;
        }
        Elevator.prototype.getDirection = function () {
            if (!this.moving)
                return 1 /* Resting */;

            // TODO
            return 1 /* Resting */;
        };
        return Elevator;
    })();

    var ElevatorControl = (function () {
        function ElevatorControl() {
        }
        ElevatorControl.prototype.init = function (elevators, floors) {
            var nfloors = floors.length;
            var mfloor = Math.floor(nfloors / 2);
            var elevator = elevators[0];
            elevator.on("idle", function () {
                elevator.goToFloor(mfloor);
            });

            elevator.on("floor_button_pressed", function (num) {
                if (elevator.destinationQueue.indexOf(num) === -1)
                    elevator.goToFloor(num);
            });
            floors.forEach(function (floor, i) {
                var foo = function () {
                    elevator.goToFloor(i);
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
