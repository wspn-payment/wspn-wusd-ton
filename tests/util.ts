import {toNano} from "@ton/core";


const getRandom = (min:number, max:number) => {
    return Math.random() * (max - min) + min;
}

export const getRandomInt = (min: number, max: number) => {
    return Math.round(getRandom(min, max));
}

export const getRandomTon = (min:number, max:number): bigint => {
    return toNano(getRandom(min, max).toFixed(9));
}