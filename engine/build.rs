fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut prost_build = prost_build::Config::new();
    prost_build.compile_protos(
        &[
            "../protobuf/message_to_engine.proto",
            "../protobuf/message_from_orderbook.proto",
            "../protobuf/common.proto",
        ],
        &["../protobuf"],
    )?;

    Ok(())
}
