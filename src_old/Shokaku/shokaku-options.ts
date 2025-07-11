import { ShoukakuOptions } from "shoukaku";

export const options: ShoukakuOptions = {
    moveOnDisconnect: false,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 20000,
    reconnectInterval: 15,
    restTimeout: 100000,
};
