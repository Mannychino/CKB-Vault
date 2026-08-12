#![cfg_attr(not(feature = "library"), no_std)]

#[cfg(feature = "library")]
extern crate alloc;

#[cfg(feature = "library")]
mod contract;

#[cfg(feature = "library")]
pub use contract::program_entry;