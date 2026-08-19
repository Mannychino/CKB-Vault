#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

// use ckb_std::ckb_types::core::Source;

// use ckb_std::high_level::{load_cell_data, load_input_since};

use ckb_std::ckb_constants::Source;
use ckb_std::high_level::{load_cell_data, load_input_since};




pub fn program_entry() -> i8 {
    let since = load_input_since(0, Source::Input)
        .expect("failed to load input since");

    let data = load_cell_data(0, Source::Input)
        .expect("failed to load cell data");

    if data.len() < 8 {
        return 1;
    }

    let mut timelock_bytes = [0u8; 8];
    timelock_bytes.copy_from_slice(&data[..8]);

    let timelock = u64::from_le_bytes(timelock_bytes);

    ckb_std::debug!("Vault timelock: {}", timelock);
    ckb_std::debug!("Transaction since: {}", since);

    if since < timelock {
        return 1;
    }

    0
}
