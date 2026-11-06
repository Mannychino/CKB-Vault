import type { ccc } from "@ckb-ccc/connector-react";

export async function estimateAverageBlockSeconds(
  client: ccc.Client,
  sampleSize = 100n,
): Promise<number> {
  const tip = await client.getTip();

  if (tip <= sampleSize) {
    throw new Error(
      "Not enough blocks to estimate average block time.",
    );
  }

  const olderBlockNumber =
    tip - sampleSize;


 const tipHeader =
  await client.getHeaderByNumber(tip);

const olderHeader =
  await client.getHeaderByNumber(
    olderBlockNumber,
  );

if (!tipHeader || !olderHeader) {
  throw new Error(
    "Unable to load block headers for block-time estimation.",
  );
}

const tipTimestamp =
  Number(tipHeader.timestamp);

const olderTimestamp =
  Number(olderHeader.timestamp);


  const elapsedMilliseconds = tipTimestamp - olderTimestamp;

  if (elapsedMilliseconds <= 0) {
    throw new Error(
      "Invalid block timestamps returned by the client.",
    );
  }

  const averageMilliseconds =
    elapsedMilliseconds /
    Number(sampleSize);

  return averageMilliseconds / 1000;
}