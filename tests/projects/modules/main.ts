import { Greeter } from "./GreeterModule"
import * as t from "./hello"

export class Main
{
    public Hello()
    { 
        let greeter = new Greeter();
        console.log( greeter.SayHello() );

        let anotherGreeter = new t.Hello();
        console.log( anotherGreeter.sayHi() );
    }
}

