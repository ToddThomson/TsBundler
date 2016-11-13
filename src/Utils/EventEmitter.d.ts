interface IEventEmitter<T> {
    on(handler: {
        (data?: T): void;
    }): any;
    off(handler: {
        (data?: T): void;
    }): any;
}
declare class EventEmitter<T> implements IEventEmitter<T> {
    private handlers;
    on(handler: {
        (data?: T): void;
    }): void;
    off(handler: {
        (data?: T): void;
    }): void;
    trigger(data?: T): void;
}
