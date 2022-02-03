class Elevator {
    constructor(elevator, _floors) {
        this.elevator = elevator;
        this.direction = "stopped";
        this.upQueue = new Set();
        this.downQueue = new Set();
        this.activeQueue = new Set();
        elevator.on("idle", this.onIdle.bind(this));
        elevator.on("floor_button_pressed", this.onFloorRequest.bind(this));
        elevator.on("passing_floor", this.onPassFloor.bind(this));
        elevator.on("stopped_at_floor", this.onArrive.bind(this));
    }
    get floor() {
        return this.elevator.currentFloor();
    }
    get realDirection() {
        return this.elevator.destinationDirection();
    }
    lights() {
        this.elevator.goingDownIndicator(this.direction == "down");
        this.elevator.goingUpIndicator(this.direction == "up");
    }
    updateQueue() {
        if (this.direction == "up") {
            this.elevator.destinationQueue.sort((a, b) => a - b);
        }
        else {
            this.elevator.destinationQueue.sort((a, b) => b - a);
        }
        this.elevator.checkDestinationQueue();
    }
    goToFloor(floor) {
        console.info("GOTO (%s %d): %d", this.direction, this.floor, floor);
        if (this.direction != "stopped") {
            throw new Error("You should be stopped when calling this!!");
        }
        if (floor == this.floor) {
            console.error("asked to go to the floor we're currently on?");
        }
        this.elevator.goToFloor(floor);
    }
    requestGoingUp(floor) {
        console.info("REQ UP (%s %d): %d", this.direction, this.floor, floor);
        let dir = this.direction;
        if (dir == "stopped") {
            console.log("not moving, serving directly");
            this.goToFloor(floor);
            this.direction = "up";
            this.lights();
        }
        else if (dir == "down") {
            console.log("we're going in the other direction, ignoring");
            this.upQueue.add(floor);
        }
        else if (floor <= this.floor) {
            console.log("that's a request for below us, ignoring for now");
            this.upQueue.add(floor);
        }
        else if (this.activeQueue.has(floor)) {
            console.log("already going there!");
        }
        else {
            console.log("adding to queue");
            this.elevator.destinationQueue.push(floor);
            this.updateQueue();
        }
    }
    requestGoingDown(floor) {
        console.info("REQ DOWN (%s %d): %d", this.direction, this.floor, floor);
        let dir = this.direction;
        if (dir == "stopped") {
            console.log("not moving, serving directly");
            this.goToFloor(floor);
            this.direction = "down";
            this.lights();
        }
        else if (dir == "up") {
            console.log("we're going in the other direction, ignoring");
            this.downQueue.add(floor);
        }
        else if (floor >= this.floor) {
            console.log("that's a request for above us, ignoring for now");
            this.downQueue.add(floor);
        }
        else if (this.activeQueue.has(floor)) {
            console.log("already going there!");
        }
        else {
            console.log("adding to queue");
            this.elevator.destinationQueue.push(floor);
            this.updateQueue();
        }
    }
    onIdle() {
        console.info("IDLE (%s %d)", this.direction, this.floor);
        let dir = this.direction;
        if (dir == "up" && this.downQueue.size > 0) {
            this.activeQueue = new Set(this.downQueue);
            this.elevator.destinationQueue = Array.from(this.downQueue);
            this.downQueue = new Set();
            this.direction = "down";
            this.updateQueue();
        }
        else if (dir == "down" && this.upQueue.size > 0) {
            this.activeQueue = new Set(this.upQueue);
            this.elevator.destinationQueue = Array.from(this.upQueue);
            this.upQueue = new Set();
            this.direction = "up";
            this.updateQueue();
        }
        else if (this.downQueue.size > 0) {
            this.activeQueue = new Set(this.downQueue);
            this.elevator.destinationQueue = Array.from(this.downQueue);
            this.downQueue = new Set();
            this.direction = "down";
            this.updateQueue();
        }
        else if (this.upQueue.size > 0) {
            this.activeQueue = new Set(this.upQueue);
            this.elevator.destinationQueue = Array.from(this.upQueue);
            this.upQueue = new Set();
            this.direction = "up";
            this.updateQueue();
        }
        else {
            this.direction = "stopped";
        }
        this.lights();
        console.log("Was going %s, going to go %s now", dir, this.direction);
        console.dir(this.elevator.destinationQueue);
    }
    onFloorRequest(floor) {
        console.info("INT REQ (%s %d): %d", this.direction, this.floor, floor);
        let curFloor = this.floor;
        if (floor < curFloor) {
            console.log("request for below, treating as a down req");
            this.requestGoingDown(floor);
            return;
        }
        else if (floor > curFloor) {
            console.log("request for above, treating as an up req");
            this.requestGoingUp(floor);
            return;
        }
        console.warn("request for current floor");
        let dir = this.direction;
        if (dir == "stopped") {
            console.warn("?? not moving");
            this.goToFloor(floor);
        }
        else if (dir == "up") {
            console.log("?? can't stop at this floor any more, treating as down");
            this.requestGoingDown(floor);
        }
        else {
            console.log("?? can't stop at this floor any more, treating as up");
            this.requestGoingUp(floor);
        }
    }
    onPassFloor(floor, direction) {
        console.info("PASS (%s %d): %d %s", this.direction, this.floor, floor, direction);
    }
    onArrive(floor) {
        console.log("ARRIVE (%s %d): %d", this.direction, this.floor, floor);
        this.activeQueue.delete(floor);
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
        floors.forEach((floor, i) => {
            floor.on("up_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingUp(i)));
            floor.on("down_button_pressed", () => this.elevators.forEach((elevator) => elevator.requestGoingDown(i)));
        });
    }
    update(_dt, _elevators, _floors) {
    }
}
let test;
test = new ElevatorControl();
