cmake_minimum_required(VERSION 3.22.1)
project("oiko_audio_engine")

# Habilita suporte a Prefab (Android Game SDK / Oboe)
find_package(oboe REQUIRED CONFIG)

# Adiciona nossa biblioteca JNI
add_library(oiko_audio_engine SHARED oiko_audio_engine.cpp)

# Links
target_link_libraries(oiko_audio_engine
        oboe::oboe
        log
        android
)
