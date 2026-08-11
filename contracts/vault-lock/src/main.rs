#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::high_level::load_script;

pub fn program_entry() -> i8 {
    let script = load_script().expect("failed to load script");

    let args = script.args().raw_data();

    ckb_std::debug!("Vault lock args:");
    ckb_std::debug!("{:?}", args);

    0
}