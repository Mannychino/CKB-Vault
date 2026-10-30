export function encodeVaultData(
  requiredBlocks: bigint,
): `0x${string}` {
  if (requiredBlocks < 0n) {
    throw new Error(
      "Required blocks cannot be negative.",
    );
  }

  const maxU64 =
    0xffff_ffff_ffff_ffffn;

  if (requiredBlocks > maxU64) {
    throw new Error(
      "Required blocks exceed u64.",
    );
  }

  const bytes =
    new Uint8Array(8);

  let value =
    requiredBlocks;

  for (
    let index = 0;
    index < 8;
    index++
  ) {
    bytes[index] =
      Number(value & 0xffn);

    value >>= 8n;
  }

  const hex =
    Array.from(bytes)
      .map((byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");

  return `0x${hex}`;
}