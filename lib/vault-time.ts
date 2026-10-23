export function daysToRelativeBlocks(
    days: number,
    averageBlockSeconds: number,
): bigint {
    if (!Number.isInteger(days) || days < 1 || days >7) {
        throw new Error("Lock days must be between 1 and 7 days.")
    } 

    if (!Number.isFinite(averageBlockSeconds) || averageBlockSeconds <= 0){
        throw new Error("Average block time must be greater than zero.",);
     }

   const secondsperDay = 86_400;

   const durationSeconds = days * secondsperDay;

   const requiredBlocks = Math.ceil(durationSeconds / averageBlockSeconds,);

   return BigInt(requiredBlocks);

}