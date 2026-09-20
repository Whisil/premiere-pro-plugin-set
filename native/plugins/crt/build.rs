use std::path::PathBuf;

fn main() {
    println!("cargo:rustc-cfg=with_premiere");
    println!("cargo:rustc-cfg=catch_panics");
    prgpu_build::effect()
        .slang_include(find_prgpu_vekl())
        .build();
}

fn find_prgpu_vekl() -> PathBuf {
    if let Some(path) = std::env::var_os("PRGPU_VEKL_ROOT").map(PathBuf::from) {
        if path.join("vekl.slang").is_file() {
            return path;
        }
        panic!(
            "PRGPU_VEKL_ROOT does not contain vekl.slang: {}",
            path.display()
        );
    }
    let cargo_home = std::env::var_os("CARGO_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".cargo")))
        .expect("CARGO_HOME or HOME is required to locate prgpu's bundled vekl shaders");
    let registry_sources = cargo_home.join("registry/src");
    for registry in std::fs::read_dir(&registry_sources)
        .unwrap_or_else(|error| {
            panic!(
                "cannot read Cargo registry sources at {}: {error}",
                registry_sources.display()
            )
        })
        .flatten()
    {
        let candidate = registry.path().join("prgpu-0.2.0/vekl");
        if candidate.join("vekl.slang").is_file() {
            return candidate;
        }
    }
    panic!("could not locate prgpu 0.2.0's vekl shaders; set PRGPU_VEKL_ROOT explicitly");
}
