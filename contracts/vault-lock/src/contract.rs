#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::{
    ckb_constants::Source,
    high_level::{load_cell_data, load_input_since},
    since::{LockValue, Since},
};

pub fn program_entry() -> i8 {
    // Read the since value from the first input in this script group.
    //
    // We use GroupInput rather than Input because the Vault Cell may not be
    // global transaction input 0.
    let raw_since = match load_input_since(0, Source::GroupInput) {
        Ok(value) => value,
        Err(_) => return 1,
    };

    // Read the Vault Cell data from the same script group.
    //
    // V1.0.1 data format:
    // first 8 bytes = required lock duration in blocks, little-endian u64.
    let data = match load_cell_data(0, Source::GroupInput) {
        Ok(value) => value,
        Err(_) => return 1,
    };

    if data.len() < 8 {
        return 1;
    }

    let mut duration_bytes = [0u8; 8];
    duration_bytes.copy_from_slice(&data[..8]);

    let required_blocks =
        u64::from_le_bytes(duration_bytes);

    // Parse the encoded CKB since value.
    let since =
        Since::new(raw_since);

    // Reject malformed or reserved since flag combinations.
    if !since.flags_is_valid() {
        return 1;
    }

    // CKB-Vault V1.0.1 uses relative timelocks.
    //
    // Example:
    //
    // Vault committed at block 200
    // required_blocks = 100
    //
    // Earliest valid spend is after the required
    // 100-block relative delay has been satisfied.
    if !since.is_relative() {
        return 1;
    }

    // Only the block-number metric is supported in V1.0.1.
    //
    // Reject epoch and timestamp based since values.
    let relative_blocks =
        match since.extract_lock_value() {
            Some(
                LockValue::BlockNumber(
                    block_number,
                ),
            ) => block_number,

            _ => return 1,
        };

    // The withdrawal transaction must request a relative delay
    // at least as large as the Vault's stored policy.
    //
    // Example:
    //
    // required_blocks = 100
    //
    // relative 99  -> reject
    // relative 100 -> accept
    // relative 101 -> accept
    if relative_blocks < required_blocks {
        return 1;
    }

    0
}