#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std:: {
    ckb_constants::Source,
    high_level::{load_cell_data, load_input_since},
    since::{LockValue, Since},
};

pub fn program_entry() -> i8{
    //This is the place to read since from first input in THIS script group and check if it is valid.
    let raw_since = match load_input_since(0, Source::GroupInput) {
        Ok(value) => value,
        Err(_) => return 1,
    };

    //Read cell data from the same vault-lock group.
    let data = match load_cell_data(0, Source::GroupInput) {
        Ok(value) => value,
        Err(_) => return 1,
    };
    
    if data.len() < 8 {
        return 1;
    }

    let mut timelock_bytes = [0u8; 8];
    timelock_bytes.copy_from_slice(&data[..8]);

    let timelock_value = u64::from_le_bytes(timelock_bytes);

    //Parse the encoded since value.
    let since = Since::new(raw_since);

    //Reject invalid/reserved flag combinations.
    if !since.flags_is_valid() {
        return 1;
    }

    if !since.is_absolute() {
        return 1;
    }

    let unlock_block = match since.extract_lock_value() {
        Some(LockValue::BlockNumber(block_number)) => block_number,
        _ => return 1,
    };
    
    //compare the decoded block number, not the raw encoded u64.
    if unlock_block < timelock_value {
        return 1;
    }
    0
}