type EventManifest<L> = {
    [E in keyof L]: (...args: any[]) => void;
};

export interface EventEmitter<Events extends EventManifest<Events>> {
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
